import { Reminder } from '../models/reminder.model.js';
import type { IReminder, ReminderListFilters, ReminderStats } from '../types/reminder.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';
import { startOfDay, endOfDay } from '../utils/dateRanges.js';
import type { ReminderModule, ReminderPriority, ReminderStatus } from '../constants/enums.js';

function buildQuery(filters: ReminderListFilters): Record<string, unknown> {
  const andParts: Record<string, unknown>[] = [];

  if (filters.scope && Object.keys(filters.scope).length > 0) {
    andParts.push(filters.scope);
  }

  const fieldMatch: Record<string, unknown> = {};
  if (filters.status) {
    fieldMatch['status'] = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
  }
  if (filters.priority) fieldMatch['priority'] = filters.priority;
  if (filters.type) fieldMatch['type'] = filters.type;
  if (filters.assigned_user_id) fieldMatch['assigned_user_id'] = filters.assigned_user_id;
  if (filters.is_read !== undefined) fieldMatch['is_read'] = filters.is_read;

  if (filters.date_from || filters.date_to) {
    const dateQ: Record<string, Date> = {};
    if (filters.date_from) dateQ['$gte'] = filters.date_from;
    if (filters.date_to) dateQ['$lte'] = filters.date_to;
    fieldMatch['reminder_date'] = dateQ;
  }

  if (Object.keys(fieldMatch).length > 0) {
    andParts.push(fieldMatch);
  }

  if (filters.search) {
    andParts.push({
      $or: [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ],
    });
  }

  if (andParts.length === 0) return {};
  if (andParts.length === 1) return andParts[0]!;
  return { $and: andParts };
}

function parseSort(sort?: string): Record<string, 1 | -1> {
  if (!sort) return { reminder_date: 1, priority: -1 };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const allowed = ['reminder_date', 'priority', 'created_at', 'status', 'title'];
  const key = allowed.includes(field) ? field : 'reminder_date';
  return { [key]: desc ? -1 : 1 };
}

export async function findReminders(
  page: number,
  limit: number,
  filters: ReminderListFilters
): Promise<PaginatedResult<IReminder>> {
  const query = buildQuery(filters);
  const sort = parseSort(filters.sort);

  const [data, total] = await Promise.all([
    Reminder.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Reminder.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findReminderById(id: string | Types.ObjectId): Promise<IReminder | null> {
  return Reminder.findOne({ _id: id, deleted_at: { $exists: false } }).lean();
}

const ACTIVE_REMINDER_STATUSES = ['pending', 'snoozed', 'rescheduled'] as const;

export async function findReminderByDedupKey(dedupKey: string): Promise<IReminder | null> {
  return Reminder.findOne({
    dedup_key: dedupKey,
    deleted_at: { $exists: false },
    status: { $in: ACTIVE_REMINDER_STATUSES },
  }).lean();
}

export async function upsertReminderByDedupKey(
  dedupKey: string,
  data: Partial<IReminder>,
  auditEntry?: IReminder['audit_history'][0]
): Promise<IReminder> {
  const update: Record<string, unknown> = { $set: data };
  if (auditEntry) {
    update['$push'] = { audit_history: auditEntry };
  }

  const doc = await Reminder.findOneAndUpdate(
    {
      dedup_key: dedupKey,
      deleted_at: { $exists: false },
      status: { $in: ACTIVE_REMINDER_STATUSES },
    },
    update,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  return doc as IReminder;
}

export async function createReminderDoc(data: Partial<IReminder>): Promise<IReminder> {
  const doc = await Reminder.create(data);
  return doc.toObject() as IReminder;
}

export async function updateReminderById(
  id: string | Types.ObjectId,
  data: Partial<IReminder>,
  auditEntry?: IReminder['audit_history'][0]
): Promise<IReminder | null> {
  const update: Record<string, unknown> = { $set: data };
  if (auditEntry) {
    update['$push'] = { audit_history: auditEntry };
  }
  return Reminder.findOneAndUpdate(
    { _id: id, deleted_at: { $exists: false } },
    update,
    { new: true, runValidators: true }
  ).lean();
}

export async function softDeleteReminder(
  id: string | Types.ObjectId,
  auditEntry: IReminder['audit_history'][0]
): Promise<IReminder | null> {
  return Reminder.findOneAndUpdate(
    { _id: id, deleted_at: { $exists: false } },
    {
      $set: { deleted_at: new Date(), status: 'cancelled' as ReminderStatus },
      $unset: { dedup_key: '' },
      $push: { audit_history: auditEntry },
    },
    { new: true }
  ).lean();
}

export async function cancelPendingRemindersForRecord(
  relatedModule: ReminderModule,
  relatedRecordId: Types.ObjectId
): Promise<void> {
  await Reminder.updateMany(
    {
      related_module: relatedModule,
      related_record_id: relatedRecordId,
      status: { $in: ACTIVE_REMINDER_STATUSES },
      deleted_at: { $exists: false },
    },
    { $set: { status: 'cancelled' as ReminderStatus }, $unset: { dedup_key: '' } }
  );
}

/** Cancel all active lead follow-up reminders for a lead (e.g. before rescheduling follow_up_date). */
export async function cancelActiveLeadFollowUpReminders(
  leadId: Types.ObjectId
): Promise<void> {
  await Reminder.updateMany(
    {
      type: 'lead_followup',
      related_module: 'leads',
      related_record_id: leadId,
      status: { $in: ACTIVE_REMINDER_STATUSES },
      deleted_at: { $exists: false },
    },
    { $set: { status: 'cancelled' as ReminderStatus }, $unset: { dedup_key: '' } }
  );
}

export async function aggregateReminderStats(
  scope: Record<string, unknown>
): Promise<ReminderStats> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const now = new Date();

  const base = { ...scope };

  const [unreadCount, overdueCount, dueTodayCount, completedCount, pendingCount, criticalCount] =
    await Promise.all([
      Reminder.countDocuments({ ...base, is_read: false, status: { $in: ['pending', 'snoozed', 'rescheduled'] } }),
      Reminder.countDocuments({
        ...base,
        status: { $in: ['pending', 'rescheduled'] },
        reminder_date: { $lt: todayStart },
        $or: [{ snoozed_until: { $exists: false } }, { snoozed_until: { $lte: now } }],
      }),
      Reminder.countDocuments({
        ...base,
        status: { $in: ['pending', 'rescheduled'] },
        reminder_date: { $gte: todayStart, $lte: todayEnd },
      }),
      Reminder.countDocuments({ ...base, status: 'done' }),
      Reminder.countDocuments({ ...base, status: { $in: ['pending', 'snoozed', 'rescheduled'] } }),
      Reminder.countDocuments({
        ...base,
        priority: 'critical' as ReminderPriority,
        status: { $in: ['pending', 'rescheduled'] },
      }),
    ]);

  return {
    unreadCount,
    overdueCount,
    dueTodayCount,
    completedCount,
    pendingCount,
    criticalCount,
  };
}

export async function fetchDashboardReminders(
  scope: Record<string, unknown>,
  limit: number
): Promise<IReminder[]> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  return Reminder.find({
    ...scope,
    status: { $in: ['pending', 'snoozed', 'rescheduled'] },
    $or: [
      { reminder_date: { $lte: todayEnd } },
      { priority: 'critical' },
    ],
  })
    .sort({ priority: -1, reminder_date: 1 })
    .limit(limit)
    .lean();
}

export async function aggregateRemindersByType(
  scope: Record<string, unknown>
): Promise<Record<string, number>> {
  const rows = await Reminder.aggregate([
    { $match: { ...scope, status: { $in: ['pending', 'snoozed', 'rescheduled'] } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[String(r['_id'])] = r['count'] as number;
  }
  return out;
}
