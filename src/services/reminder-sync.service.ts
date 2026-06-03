import { Types } from 'mongoose';
import { Lead } from '../models/lead.model.js';
import { Project } from '../models/project.model.js';
import { UpcomingPayment } from '../models/upcoming_payment.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Salary } from '../models/salary.model.js';
import { Reimbursement } from '../models/reimbursement.model.js';
import { Communication } from '../models/communication.model.js';
import { Report } from '../models/report.model.js';
import { Employee } from '../models/employee.model.js';
import { findRoleByName } from '../repositories/role.repository.js';
import { findUsersByRoleId } from '../repositories/user.repository.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { startOfDay, addDays, endOfMonth, monthKey } from '../utils/dateRanges.js';
import { toObjectId } from '../utils/recordScope.js';
import {
  upsertAutoReminder,
  escalateOverdueReminders,
  wakeSnoozedReminders,
  closePendingRemindersForRecord,
} from './reminder.service.js';
import type { ReminderPriority } from '../constants/enums.js';

const PROJECT_MILESTONES = [
  { key: '7d', days: 7, priority: 'high' as ReminderPriority },
  { key: '3d', days: 3, priority: 'high' as ReminderPriority },
  { key: '1d', days: 1, priority: 'high' as ReminderPriority },
  { key: '0d', days: 0, priority: 'critical' as ReminderPriority },
] as const;

const SUBSCRIPTION_MILESTONES = [
  { key: '30d', days: 30, priority: 'medium' as ReminderPriority },
  { key: '7d', days: 7, priority: 'medium' as ReminderPriority },
  { key: '1d', days: 1, priority: 'high' as ReminderPriority },
] as const;

async function financeAndAdminUserIds(): Promise<Types.ObjectId[]> {
  const ids: Types.ObjectId[] = [];
  for (const roleName of [SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.SUPER_ADMIN]) {
    const role = await findRoleByName(roleName);
    if (!role) continue;
    const users = await findUsersByRoleId(role._id);
    for (const u of users) {
      ids.push(u._id as Types.ObjectId);
    }
  }
  return [...new Map(ids.map((id) => [id.toString(), id])).values()];
}

async function superAdminUserIds(): Promise<Types.ObjectId[]> {
  const role = await findRoleByName(SYSTEM_ROLES.SUPER_ADMIN);
  if (!role) return [];
  const users = await findUsersByRoleId(role._id);
  return users.map((u) => u._id as Types.ObjectId);
}

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;

/** Milestone is due when its trigger day (UTC) is today or in the past. */
function isMilestoneDue(triggerDate: Date, today: Date): boolean {
  return startOfDay(triggerDate).getTime() <= today.getTime();
}

/**
 * Project reminder assignee — schema has no project_manager field.
 * Fallback: created_by (project owner) → first assigned_employee.user_id.
 */
async function resolveProjectReminderAssignee(project: {
  created_by?: Types.ObjectId;
  assigned_employees?: Types.ObjectId[];
}): Promise<Types.ObjectId | null> {
  if (project.created_by) return project.created_by as Types.ObjectId;
  const firstEmployeeId = project.assigned_employees?.[0];
  if (firstEmployeeId) {
    const emp = await Employee.findById(firstEmployeeId).select('user_id').lean();
    if (emp?.user_id) return emp.user_id as Types.ObjectId;
  }
  return null;
}

function resolveSubscriptionAssignee(
  assignedTo: string | undefined,
  createdBy: Types.ObjectId
): Types.ObjectId | null {
  if (assignedTo && OBJECT_ID_HEX.test(assignedTo)) {
    try {
      return toObjectId(assignedTo);
    } catch {
      return createdBy;
    }
  }
  return createdBy;
}

async function cancelStaleSourceReminders(): Promise<void> {
  const [closedLeads, closedPayments, closedProjects, closedSubs] = await Promise.all([
    Lead.find({ stage: { $in: ['won', 'lost'] } }).select('_id').lean(),
    UpcomingPayment.find({ payment_status: { $in: ['received', 'cancelled'] } }).select('_id').lean(),
    Project.find({ status: { $in: ['completed', 'cancelled'] } }).select('_id').lean(),
    Subscription.find({ status: { $in: ['expired', 'cancelled'] } }).select('_id').lean(),
  ]);

  await Promise.all([
    ...closedLeads.map((l) => closePendingRemindersForRecord('leads', l._id as Types.ObjectId)),
    ...closedPayments.map((p) =>
      closePendingRemindersForRecord('upcoming-payments', p._id as Types.ObjectId)
    ),
    ...closedProjects.map((p) => closePendingRemindersForRecord('projects', p._id as Types.ObjectId)),
    ...closedSubs.map((s) => closePendingRemindersForRecord('subscriptions', s._id as Types.ObjectId)),
  ]);
}

export async function syncLeadReminders(): Promise<void> {
  const leads = await Lead.find({
    follow_up_date: { $exists: true, $ne: null },
    status: 'active',
    stage: { $nin: ['won', 'lost'] },
  })
    .select('lead_name follow_up_date assigned_user_id created_by')
    .lean();

  const today = startOfDay();

  for (const lead of leads) {
    if (!lead.follow_up_date || !lead.assigned_user_id) continue;
    const dateKey = startOfDay(lead.follow_up_date).toISOString().slice(0, 10);
    const overdue = lead.follow_up_date < today;
    await upsertAutoReminder({
      dedup_key: `lead_followup|leads|${lead._id}|${dateKey}`,
      type: 'lead_followup',
      title: 'Lead Follow Up Required',
      description: `Follow up with ${lead.lead_name}`,
      priority: overdue ? 'high' : 'medium',
      related_module: 'leads',
      related_record_id: lead._id as Types.ObjectId,
      assigned_user_id: lead.assigned_user_id as Types.ObjectId,
      reminder_date: lead.follow_up_date,
      created_by: (lead.created_by ?? lead.assigned_user_id) as Types.ObjectId,
    });
  }
}

export async function syncProjectReminders(): Promise<void> {
  const projects = await Project.find({
    end_date: { $exists: true, $ne: null },
    status: { $in: ['not_started', 'in_progress', 'on_hold'] },
  })
    .select('project_name end_date created_by assigned_employees status')
    .lean();

  const today = startOfDay();

  for (const project of projects) {
    if (!project.end_date) continue;
    const assignee = await resolveProjectReminderAssignee(project);
    if (!assignee) continue;

    const end = startOfDay(project.end_date);

    if (end.getTime() < today.getTime()) {
      await upsertAutoReminder({
        dedup_key: `project_deadline|projects|${project._id}|overdue`,
        type: 'project_deadline',
        title: 'Project deadline missed',
        description: `${project.project_name} is overdue`,
        priority: 'critical',
        related_module: 'projects',
        related_record_id: project._id as Types.ObjectId,
        assigned_user_id: assignee,
        reminder_date: end,
        created_by: assignee,
      });
      continue;
    }

    for (const m of PROJECT_MILESTONES) {
      const triggerDate = addDays(end, -m.days);
      if (!isMilestoneDue(triggerDate, today)) continue;
      await upsertAutoReminder({
        dedup_key: `project_deadline|projects|${project._id}|${m.key}`,
        type: 'project_deadline',
        title: `Project deadline in ${m.key === '0d' ? 'today' : m.key.replace('d', ' days')}`,
        description: `${project.project_name} ends on ${end.toISOString().slice(0, 10)}`,
        priority: m.priority,
        related_module: 'projects',
        related_record_id: project._id as Types.ObjectId,
        assigned_user_id: assignee,
        reminder_date: triggerDate,
        created_by: assignee,
      });
    }
  }
}

export async function syncPaymentReminders(): Promise<void> {
  const payments = await UpcomingPayment.find({
    payment_status: { $in: ['pending', 'overdue'] },
  })
    .select('amount due_date reminder_date assigned_follow_up_user created_by client_id')
    .lean();

  const today = startOfDay();

  for (const p of payments) {
    const assignee = (p.assigned_follow_up_user ?? p.created_by) as Types.ObjectId | undefined;
    if (!assignee) continue;

    const reminderDate = p.reminder_date ?? p.due_date;
    const overdue = p.due_date < today || p.payment_status === 'overdue';

    await upsertAutoReminder({
      dedup_key: `client_payment|upcoming-payments|${p._id}|main`,
      type: 'client_payment',
      title: overdue ? 'Client payment overdue' : 'Client payment follow-up',
      description: `Outstanding payment of ${p.amount}`,
      priority: overdue ? 'critical' : 'high',
      related_module: 'upcoming-payments',
      related_record_id: p._id as Types.ObjectId,
      assigned_user_id: assignee,
      reminder_date: reminderDate,
      created_by: (p.created_by ?? assignee) as Types.ObjectId,
    });
  }
}

export async function syncSubscriptionReminders(): Promise<void> {
  const subs = await Subscription.find({
    status: { $in: ['active', 'expiring_soon'] },
    renewal_date: { $exists: true },
  })
    .select('plan_name renewal_date assigned_to status created_by')
    .lean();

  const today = startOfDay();

  for (const sub of subs) {
    if (!sub.renewal_date) continue;
    const assignee = resolveSubscriptionAssignee(
      sub.assigned_to,
      sub.created_by as Types.ObjectId
    );
    if (!assignee) continue;

    const renewal = startOfDay(sub.renewal_date);

    if (renewal.getTime() < today.getTime()) {
      await upsertAutoReminder({
        dedup_key: `subscription_renewal|subscriptions|${sub._id}|expired`,
        type: 'subscription_renewal',
        title: 'Subscription expired',
        description: `${sub.plan_name} requires renewal`,
        priority: 'critical',
        related_module: 'subscriptions',
        related_record_id: sub._id as Types.ObjectId,
        assigned_user_id: assignee,
        reminder_date: renewal,
        created_by: assignee,
      });
      continue;
    }

    for (const m of SUBSCRIPTION_MILESTONES) {
      const triggerDate = addDays(renewal, -m.days);
      if (!isMilestoneDue(triggerDate, today)) continue;
      await upsertAutoReminder({
        dedup_key: `subscription_renewal|subscriptions|${sub._id}|${m.key}`,
        type: 'subscription_renewal',
        title: `Subscription renewing in ${m.key.replace('d', ' days')}`,
        description: `${sub.plan_name} renews on ${renewal.toISOString().slice(0, 10)}`,
        priority: m.priority,
        related_module: 'subscriptions',
        related_record_id: sub._id as Types.ObjectId,
        assigned_user_id: assignee,
        reminder_date: triggerDate,
        created_by: assignee,
      });
    }
  }
}

export async function syncSalaryReminders(): Promise<void> {
  const now = new Date();
  const prevMonthAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const deadline = endOfMonth(prevMonthAnchor);

  if (now.getTime() <= deadline.getTime()) return;

  const pending = await Salary.find({ status: 'pending' }).select('month year net_salary').lean();
  if (pending.length === 0) return;

  const assignees = await financeAndAdminUserIds();
  for (const userId of assignees) {
    await upsertAutoReminder({
      dedup_key: `salary_due|salary|${monthKey(now)}|${userId}`,
      type: 'salary_due',
      title: 'Salary payments pending',
      description: `${pending.length} salary record(s) awaiting payment`,
      priority: 'critical',
      related_module: 'salary',
      assigned_user_id: userId,
      reminder_date: startOfDay(now),
      created_by: userId,
    });
  }
}

export async function syncReimbursementReminders(): Promise<void> {
  const pending = await Reimbursement.find({
    status: { $in: ['submitted', 'under_review'] },
  })
    .select('expense_title amount employee_id')
    .lean();

  const hrRole = await findRoleByName(SYSTEM_ROLES.HR);
  const financeRole = await findRoleByName(SYSTEM_ROLES.FINANCE);
  const approverIds: Types.ObjectId[] = [];
  if (hrRole) {
    for (const u of await findUsersByRoleId(hrRole._id)) {
      approverIds.push(u._id as Types.ObjectId);
    }
  }
  if (financeRole) {
    for (const u of await findUsersByRoleId(financeRole._id)) {
      approverIds.push(u._id as Types.ObjectId);
    }
  }

  const threshold = Number(process.env['REIMBURSEMENT_APPROVAL_THRESHOLD'] ?? 10000);
  const superAdmins = await superAdminUserIds();

  for (const r of pending) {
    for (const approverId of approverIds) {
      await upsertAutoReminder({
        dedup_key: `reimbursement_review|reimbursements|${r._id}|${approverId}`,
        type: 'reimbursement_review',
        title: 'Reimbursement pending approval',
        description: `${r.expense_title} — ${r.amount}`,
        priority: 'high',
        related_module: 'reimbursements',
        related_record_id: r._id as Types.ObjectId,
        assigned_user_id: approverId,
        reminder_date: startOfDay(new Date()),
        created_by: approverId,
      });
    }

    if (r.amount >= threshold) {
      for (const adminId of superAdmins) {
        await upsertAutoReminder({
          dedup_key: `reimbursement_review|reimbursements|${r._id}|sa|${adminId}`,
          type: 'reimbursement_review',
          title: 'Large reimbursement needs Super Admin approval',
          description: `${r.expense_title} — ${r.amount}`,
          priority: 'critical',
          related_module: 'reimbursements',
          related_record_id: r._id as Types.ObjectId,
          assigned_user_id: adminId,
          reminder_date: startOfDay(new Date()),
          created_by: adminId,
        });
      }
    }
  }
}

export async function syncCommunicationReminders(): Promise<void> {
  const comms = await Communication.find({
    next_follow_up_date: { $exists: true, $ne: null },
  })
    .select('user_id entity_type entity_id next_follow_up_date')
    .lean();

  for (const c of comms) {
    if (!c.next_follow_up_date || !c.user_id) continue;
    const dateKey = startOfDay(c.next_follow_up_date).toISOString().slice(0, 10);
    await upsertAutoReminder({
      dedup_key: `communication_followup|communications|${c._id}|${dateKey}`,
      type: 'communication_followup',
      title: 'Communication follow-up due',
      description: `Follow up on ${c.entity_type} communication`,
      priority: 'medium',
      related_module: 'communications',
      related_record_id: c._id as Types.ObjectId,
      assigned_user_id: c.user_id as Types.ObjectId,
      reminder_date: c.next_follow_up_date,
      created_by: c.user_id as Types.ObjectId,
    });
  }
}

export async function syncReportUploadReminders(): Promise<void> {
  const now = new Date();
  if (now.getUTCDate() !== 1) return;

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const label = monthKey(monthStart);

  const projects = await Project.find({
    status: { $in: ['in_progress', 'completed'] },
  })
    .select('project_name created_by')
    .lean();

  for (const project of projects) {
    if (!project.created_by) continue;
    const hasReport = await Report.exists({
      project_id: project._id,
      month: { $gte: monthStart, $lte: monthEnd },
    });
    if (hasReport) continue;

    await upsertAutoReminder({
      dedup_key: `report_upload|reports|${project._id}|${label}`,
      type: 'report_upload',
      title: 'Monthly report upload due',
      description: `Upload report for ${project.project_name} (${label})`,
      priority: 'medium',
      related_module: 'reports',
      related_record_id: project._id as Types.ObjectId,
      assigned_user_id: project.created_by as Types.ObjectId,
      reminder_date: startOfDay(now),
      created_by: project.created_by as Types.ObjectId,
    });
  }
}

export async function runScheduledReminderSync(): Promise<void> {
  await Promise.all([
    syncLeadReminders(),
    syncProjectReminders(),
    syncPaymentReminders(),
    syncSubscriptionReminders(),
    syncSalaryReminders(),
    syncReimbursementReminders(),
    syncCommunicationReminders(),
    syncReportUploadReminders(),
  ]);
  await cancelStaleSourceReminders();
  await wakeSnoozedReminders();
  await escalateOverdueReminders();
}
