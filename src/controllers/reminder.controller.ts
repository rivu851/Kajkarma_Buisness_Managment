import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as reminderService from '../services/reminder.service.js';
import type { ReminderStatus } from '../constants/enums.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

function parseQuery(req: Request, res: Response) {
  return (res.locals['query'] ?? req.query) as Record<string, string | number | boolean | undefined>;
}

export const getReminders: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = parseQuery(req, res);
  const result = await reminderService.listReminders(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.status ? { status: String(q.status) as ReminderStatus } : {}),
    ...(q.priority ? { priority: q.priority as import('../constants/enums.js').ReminderPriority } : {}),
    ...(q.type ? { type: q.type as import('../constants/enums.js').ReminderType } : {}),
    ...(q.assigned_user_id ? { assigned_user_id: String(q.assigned_user_id) } : {}),
    ...(q.is_read !== undefined ? { is_read: Boolean(q.is_read) } : {}),
    ...(q.date_from ? { date_from: new Date(String(q.date_from)) } : {}),
    ...(q.date_to ? { date_to: new Date(String(q.date_to)) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
    ...(q.sort ? { sort: String(q.sort) } : {}),
  });
  sendSuccess(res, result, 'Reminders retrieved');
});

export const getMyReminders: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = parseQuery(req, res);
  const result = await reminderService.listMyReminders(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.status ? { status: String(q.status) as ReminderStatus } : {}),
    ...(q.priority ? { priority: q.priority as import('../constants/enums.js').ReminderPriority } : {}),
    ...(q.type ? { type: q.type as import('../constants/enums.js').ReminderType } : {}),
    ...(q.is_read !== undefined ? { is_read: Boolean(q.is_read) } : {}),
    ...(q.date_from ? { date_from: new Date(String(q.date_from)) } : {}),
    ...(q.date_to ? { date_to: new Date(String(q.date_to)) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
    ...(q.sort ? { sort: String(q.sort) } : {}),
  });
  sendSuccess(res, result, 'My reminders retrieved');
});

export const getReminderStats: RequestHandler = asyncHandler(async (req, res: Response) => {
  const stats = await reminderService.getReminderStats(req.user!);
  sendSuccess(res, stats, 'Reminder stats retrieved');
});

export const getReminder: RequestHandler = asyncHandler(async (req, res: Response) => {
  const reminder = await reminderService.getReminderById(param(req, 'id'), req.user!);
  sendSuccess(res, reminder, 'Reminder retrieved');
});

export const createReminder: RequestHandler = asyncHandler(async (req, res: Response) => {
  const reminder = await reminderService.createManualReminder(req.body, req.user!);
  sendSuccess(res, reminder, 'Reminder created', 201);
});

export const markRead: RequestHandler = asyncHandler(async (req, res: Response) => {
  const reminder = await reminderService.markReminderRead(param(req, 'id'), req.user!);
  sendSuccess(res, reminder, 'Reminder marked as read');
});

export const markUnread: RequestHandler = asyncHandler(async (req, res: Response) => {
  const reminder = await reminderService.markReminderUnread(param(req, 'id'), req.user!);
  sendSuccess(res, reminder, 'Reminder marked as unread');
});

export const markDone: RequestHandler = asyncHandler(async (req, res: Response) => {
  const reminder = await reminderService.markReminderDone(param(req, 'id'), req.user!);
  sendSuccess(res, reminder, 'Reminder marked as done');
});

export const snoozeReminder: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { snoozed_until } = req.body as { snoozed_until: Date };
  const reminder = await reminderService.snoozeReminder(param(req, 'id'), snoozed_until, req.user!);
  sendSuccess(res, reminder, 'Reminder snoozed');
});

export const rescheduleReminderHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { reminder_date, reminder_time } = req.body as { reminder_date: Date; reminder_time?: string };
  const reminder = await reminderService.rescheduleReminder(
    param(req, 'id'),
    reminder_date,
    reminder_time,
    req.user!
  );
  sendSuccess(res, reminder, 'Reminder rescheduled');
});

export const deleteReminder: RequestHandler = asyncHandler(async (req, res: Response) => {
  await reminderService.removeReminder(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Reminder deleted');
});
