import { Types } from 'mongoose';
import {
  findReminders,
  findReminderById,
  findReminderByDedupKey,
  upsertReminderByDedupKey,
  createReminderDoc,
  updateReminderById,
  softDeleteReminder,
  aggregateReminderStats,
  fetchDashboardReminders,
  aggregateRemindersByType,
  cancelPendingRemindersForRecord,
  cancelActiveLeadFollowUpReminders,
} from '../repositories/reminder.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import { reminderListScope, reminderMyScope, canViewReminderAudit } from '../utils/reminderScope.js';
import { startOfDay } from '../utils/dateRanges.js';
import * as notificationService from './notification.service.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import type {
  IReminder,
  ReminderListFilters,
  ReminderStats,
} from '../types/reminder.js';
import type {
  ReminderModule,
  ReminderPriority,
  ReminderType,
} from '../constants/enums.js';
import { Reminder } from '../models/reminder.model.js';

export interface AutoReminderInput {
  dedup_key: string;
  type: ReminderType;
  title: string;
  description?: string;
  priority: ReminderPriority;
  related_module: ReminderModule;
  related_record_id?: Types.ObjectId;
  assigned_user_id: Types.ObjectId;
  reminder_date: Date;
  reminder_time?: string;
  created_by: Types.ObjectId;
}

function auditEntry(
  action: string,
  userId: Types.ObjectId,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): IReminder['audit_history'][0] {
  return {
    action,
    user_id: userId,
    timestamp: new Date(),
    ...(oldValue ? { old_value: oldValue } : {}),
    ...(newValue ? { new_value: newValue } : {}),
  };
}

/** All auto-generated reminders must go through this function. */
export async function upsertAutoReminder(input: AutoReminderInput): Promise<IReminder> {
  const existing = await findReminderByDedupKey(input.dedup_key);
  const baseFields: Partial<IReminder> = {
    type: input.type,
    title: input.title,
    priority: input.priority,
    related_module: input.related_module,
    assigned_user_id: input.assigned_user_id,
    reminder_date: input.reminder_date,
    dedup_key: input.dedup_key,
    ...(input.description ? { description: input.description } : {}),
    ...(input.related_record_id ? { related_record_id: input.related_record_id } : {}),
    ...(input.reminder_time ? { reminder_time: input.reminder_time } : {}),
  };

  if (!existing) {
    const created = await upsertReminderByDedupKey(input.dedup_key, {
      ...baseFields,
      created_by: input.created_by,
      status: 'pending',
      is_read: false,
      audit_history: [
        auditEntry('created', input.created_by, undefined, { source: 'auto', dedup_key: input.dedup_key }),
      ],
    } as Partial<IReminder>);

    await notificationService.send({
      userId: input.assigned_user_id,
      title: input.title,
      body: input.description ?? input.title,
      reminderId: created._id,
      type: input.type,
    });
    return created;
  }

  if (existing.status === 'done' || existing.status === 'cancelled') {
    return existing;
  }

  const updated = await upsertReminderByDedupKey(
    input.dedup_key,
    baseFields,
    auditEntry('updated', input.created_by, { priority: existing.priority }, { priority: input.priority })
  );

  if (existing.priority !== input.priority && ['high', 'critical'].includes(input.priority)) {
    await notificationService.send({
      userId: input.assigned_user_id,
      title: `Priority escalated: ${input.title}`,
      body: input.description ?? input.title,
      reminderId: updated._id,
      type: input.type,
    });
  }

  return updated;
}

export async function wakeSnoozedReminders(): Promise<void> {
  const now = new Date();
  await Reminder.updateMany(
    {
      status: 'snoozed',
      snoozed_until: { $lte: now },
      deleted_at: { $exists: false },
    },
    { $set: { status: 'pending' }, $unset: { snoozed_until: '' } }
  );
}

export async function escalateOverdueReminders(): Promise<void> {
  const today = startOfDay();
  await Reminder.updateMany(
    {
      deleted_at: { $exists: false },
      status: { $in: ['pending', 'rescheduled'] },
      reminder_date: { $lt: today },
      priority: { $in: ['low', 'medium', 'high'] },
    },
    { $set: { priority: 'critical' } }
  );
}

function managerModulesForRole(roleName: string): ReminderModule[] | null {
  const map: Partial<Record<string, ReminderModule[]>> = {
    sales_manager: ['leads', 'clients', 'communications', 'upcoming-payments'],
    project_manager: ['projects', 'reports', 'worklogs'],
    hr: ['salary', 'reimbursements', 'employees'],
    finance: ['salary', 'upcoming-payments', 'subscriptions', 'reimbursements', 'revenue'],
  };
  return map[roleName] ?? null;
}

function canAccessReminder(reminder: IReminder, user: JwtPayload): boolean {
  if (reminder.assigned_user_id.toString() === user.userId) return true;
  if (['super_admin', 'admin'].includes(user.roleName)) return true;
  const modules = managerModulesForRole(user.roleName);
  return modules?.includes(reminder.related_module) ?? false;
}

function assertReminderAccess(reminder: IReminder, user: JwtPayload, forWrite = false): void {
  if (!canAccessReminder(reminder, user)) {
    throw new AppError('Access denied to this reminder', 403);
  }
  if (forWrite && reminder.assigned_user_id.toString() !== user.userId) {
    if (!['super_admin', 'admin'].includes(user.roleName)) {
      throw new AppError('Only the assignee can modify this reminder', 403);
    }
  }
}

export async function listReminders(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: Omit<ReminderListFilters, 'scope'>
): Promise<PaginatedResult<IReminder>> {
  return findReminders(page, limit, {
    ...filters,
    scope: reminderListScope(user),
  });
}

export async function listMyReminders(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: Omit<ReminderListFilters, 'scope'>
): Promise<PaginatedResult<IReminder>> {
  return findReminders(page, limit, {
    ...filters,
    scope: reminderMyScope(user),
  });
}

export async function getReminderStats(user: JwtPayload): Promise<ReminderStats> {
  return aggregateReminderStats(reminderListScope(user));
}

export async function getMyReminderStats(user: JwtPayload): Promise<ReminderStats> {
  return aggregateReminderStats(reminderMyScope(user));
}

export async function getReminderById(id: string, user: JwtPayload): Promise<IReminder> {
  const reminder = await findReminderById(id);
  if (!reminder) throw new AppError('Reminder not found', 404);
  assertReminderAccess(reminder, user);
  if (!canViewReminderAudit(user)) {
    return { ...reminder, audit_history: [] };
  }
  return reminder;
}

export async function createManualReminder(
  data: {
    title: string;
    description?: string;
    priority: ReminderPriority;
    reminder_date: Date;
    reminder_time?: string;
    assigned_user_id: string;
  },
  user: JwtPayload
): Promise<IReminder> {
  const assignee = await findUserById(data.assigned_user_id);
  if (!assignee) throw new AppError('Assigned user not found', 404);

  const userId = toObjectId(user.userId);
  const assignedId = toObjectId(data.assigned_user_id);

  const reminder = await createReminderDoc({
    type: 'custom',
    title: data.title,
    description: data.description,
    priority: data.priority,
    related_module: 'dashboard',
    assigned_user_id: assignedId,
    reminder_date: data.reminder_date,
    reminder_time: data.reminder_time,
    status: 'pending',
    is_read: false,
    created_by: userId,
    audit_history: [auditEntry('created', userId, undefined, { source: 'manual' })],
  } as Partial<IReminder>);

  await notificationService.send({
    userId: assignedId,
    title: data.title,
    body: data.description ?? data.title,
    reminderId: reminder._id,
    type: 'custom',
  });

  return reminder;
}

async function patchReminder(
  id: string,
  user: JwtPayload,
  patch: Partial<IReminder>,
  action: string
): Promise<IReminder> {
  const existing = await findReminderById(id);
  if (!existing) throw new AppError('Reminder not found', 404);
  assertReminderAccess(existing, user, true);

  const updated = await updateReminderById(
    id,
    patch,
    auditEntry(action, toObjectId(user.userId), { status: existing.status, is_read: existing.is_read }, patch as Record<string, unknown>)
  );
  if (!updated) throw new AppError('Reminder not found', 404);
  return updated;
}

export async function markReminderRead(id: string, user: JwtPayload): Promise<IReminder> {
  const r = await patchReminder(id, user, { is_read: true }, 'read');
  await notificationService.syncReadStateForReminder(r._id, toObjectId(user.userId));
  return r;
}

export async function markReminderUnread(id: string, user: JwtPayload): Promise<IReminder> {
  return patchReminder(id, user, { is_read: false }, 'unread');
}

export async function markReminderDone(id: string, user: JwtPayload): Promise<IReminder> {
  return patchReminder(id, user, {
    status: 'done',
    is_read: true,
    completed_at: new Date(),
    completed_by: toObjectId(user.userId),
  }, 'done');
}

export async function snoozeReminder(
  id: string,
  snoozed_until: Date,
  user: JwtPayload
): Promise<IReminder> {
  return patchReminder(id, user, { status: 'snoozed', snoozed_until, is_read: true }, 'snoozed');
}

export async function rescheduleReminder(
  id: string,
  reminder_date: Date,
  reminder_time: string | undefined,
  user: JwtPayload
): Promise<IReminder> {
  const patch: Partial<IReminder> = { status: 'rescheduled', reminder_date };
  if (reminder_time) patch.reminder_time = reminder_time;

  return patchReminder(id, user, patch, 'rescheduled');
}

export async function removeReminder(id: string, user: JwtPayload): Promise<void> {
  const existing = await findReminderById(id);
  if (!existing) throw new AppError('Reminder not found', 404);
  assertReminderAccess(existing, user, true);

  const deleted = await softDeleteReminder(
    id,
    auditEntry('deleted', toObjectId(user.userId), { status: existing.status })
  );
  if (!deleted) throw new AppError('Reminder not found', 404);
}

// ——— Inline triggers (called from other modules) ———

/** Cancel open auto-reminders when source record reaches a terminal state. */
export async function closePendingRemindersForRecord(
  relatedModule: ReminderModule,
  relatedRecordId: Types.ObjectId
): Promise<void> {
  await cancelPendingRemindersForRecord(relatedModule, relatedRecordId);
}

export async function onLeadFollowUpChanged(
  leadId: Types.ObjectId,
  leadName: string,
  followUpDate: Date,
  assignedUserId: Types.ObjectId,
  createdBy: Types.ObjectId
): Promise<void> {
  await cancelActiveLeadFollowUpReminders(leadId);

  const dateKey = startOfDay(followUpDate).toISOString().slice(0, 10);
  const overdue = followUpDate < startOfDay();
  await upsertAutoReminder({
    dedup_key: `lead_followup|leads|${leadId}|${dateKey}`,
    type: 'lead_followup',
    title: 'Lead Follow Up Required',
    description: `Follow up with ${leadName}`,
    priority: overdue ? 'high' : 'medium',
    related_module: 'leads',
    related_record_id: leadId,
    assigned_user_id: assignedUserId,
    reminder_date: followUpDate,
    created_by: createdBy,
  });
}

export async function onUpcomingPaymentCreated(
  paymentId: Types.ObjectId,
  amount: number,
  reminderDate: Date,
  dueDate: Date,
  assigneeId: Types.ObjectId,
  createdBy: Types.ObjectId
): Promise<void> {
  const overdue = dueDate < startOfDay();
  await upsertAutoReminder({
    dedup_key: `client_payment|upcoming-payments|${paymentId}|main`,
    type: 'client_payment',
    title: overdue ? 'Client payment overdue' : 'Client payment follow-up',
    description: `Outstanding payment of ${amount}`,
    priority: overdue ? 'critical' : 'high',
    related_module: 'upcoming-payments',
    related_record_id: paymentId,
    assigned_user_id: assigneeId,
    reminder_date: reminderDate,
    created_by: createdBy,
  });
}

export async function onReimbursementSubmitted(
  reimbursementId: Types.ObjectId,
  title: string,
  amount: number,
  approverIds: Types.ObjectId[],
  superAdminIds: Types.ObjectId[]
): Promise<void> {
  const threshold = Number(process.env['REIMBURSEMENT_APPROVAL_THRESHOLD'] ?? 10000);
  for (const approverId of approverIds) {
    await upsertAutoReminder({
      dedup_key: `reimbursement_review|reimbursements|${reimbursementId}|${approverId}`,
      type: 'reimbursement_review',
      title: 'Reimbursement pending approval',
      description: `${title} — ${amount}`,
      priority: 'high',
      related_module: 'reimbursements',
      related_record_id: reimbursementId,
      assigned_user_id: approverId,
      reminder_date: startOfDay(new Date()),
      created_by: approverId,
    });
  }
  if (amount >= threshold) {
    for (const adminId of superAdminIds) {
      await upsertAutoReminder({
        dedup_key: `reimbursement_review|reimbursements|${reimbursementId}|sa|${adminId}`,
        type: 'reimbursement_review',
        title: 'Large reimbursement needs Super Admin approval',
        description: `${title} — ${amount}`,
        priority: 'critical',
        related_module: 'reimbursements',
        related_record_id: reimbursementId,
        assigned_user_id: adminId,
        reminder_date: startOfDay(new Date()),
        created_by: adminId,
      });
    }
  }
}

export async function onCommunicationFollowUp(
  commId: Types.ObjectId,
  followUpDate: Date,
  userId: Types.ObjectId
): Promise<void> {
  const dateKey = startOfDay(followUpDate).toISOString().slice(0, 10);
  await upsertAutoReminder({
    dedup_key: `communication_followup|communications|${commId}|${dateKey}`,
    type: 'communication_followup',
    title: 'Communication follow-up due',
    description: 'Follow up on communication',
    priority: 'medium',
    related_module: 'communications',
    related_record_id: commId,
    assigned_user_id: userId,
    reminder_date: followUpDate,
    created_by: userId,
  });
}

export async function getDashboardReminderData(
  user: JwtPayload
): Promise<{
  today: IReminder[];
  overdue: IReminder[];
  critical: IReminder[];
  byType: Record<string, number>;
  unreadCount: number;
}> {
  const scope = reminderMyScope(user);
  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const [all, stats, byType] = await Promise.all([
    fetchDashboardReminders(scope, 20),
    getMyReminderStats(user),
    aggregateRemindersByType(scope),
  ]);

  const today = all.filter(
    (r) => r.reminder_date >= todayStart && r.reminder_date <= todayEnd
  );
  const overdue = all.filter((r) => r.reminder_date < todayStart);
  const critical = all.filter((r) => r.priority === 'critical');

  return {
    today,
    overdue,
    critical,
    byType,
    unreadCount: stats.unreadCount,
  };
}
