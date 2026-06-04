import type { Types } from 'mongoose';
import { Reminder } from '../models/reminder.model.js';
import type { IReminder } from '../types/reminder.js';
import type { ReminderPriority } from '../constants/enums.js';
import { findUserByEmail } from '../repositories/user.repository.js';
import { digestAlreadySent, recordDigestSent } from '../repositories/daily-digest-log.repository.js';
import { sendPlainEmail } from './email.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getIstDateKey, getIstDayBounds, formatDateInIst } from '../utils/istDayBounds.js';
import type { DigestReminderItem, ReminderDigestPayload } from '../types/reminder-digest.js';

const ACTIVE_STATUSES = ['pending', 'snoozed', 'rescheduled'] as const;

const PRIORITY_RANK: Record<ReminderPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatModuleLabel(module: string): string {
  return module
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toDigestItem(doc: IReminder): DigestReminderItem {
  return {
    title: doc.title,
    dueDate: formatDateInIst(doc.reminder_date),
    module: formatModuleLabel(doc.related_module),
  };
}

function sortByPriority(a: IReminder, b: IReminder): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

export async function fetchActiveRemindersForDigest(): Promise<IReminder[]> {
  const rows = await Reminder.find({
    status: { $in: ACTIVE_STATUSES },
    deleted_at: { $exists: false },
  })
    .sort({ reminder_date: 1 })
    .lean();

  return rows as IReminder[];
}

export function buildReminderDigest(reminders: IReminder[]): ReminderDigestPayload {
  const { start: todayStart, end: todayEnd } = getIstDayBounds();

  const overdue: DigestReminderItem[] = [];
  const dueToday: DigestReminderItem[] = [];
  const upcoming: DigestReminderItem[] = [];

  const sorted = [...reminders].sort(sortByPriority);

  for (const doc of sorted) {
    const due = doc.reminder_date;
    if (due < todayStart) {
      overdue.push(toDigestItem(doc));
    } else if (due <= todayEnd) {
      dueToday.push(toDigestItem(doc));
    } else {
      upcoming.push(toDigestItem(doc));
    }
  }

  const summary = {
    total: reminders.length,
    critical: reminders.filter((r) => r.priority === 'critical').length,
    high: reminders.filter((r) => r.priority === 'high').length,
    medium: reminders.filter((r) => r.priority === 'medium').length,
    low: reminders.filter((r) => r.priority === 'low').length,
  };

  return { overdue, dueToday, upcoming, summary };
}

function formatSection(title: string, items: DigestReminderItem[]): string {
  const lines = items.map((item) => `• ${item.title}\n• ${item.dueDate}\n• ${item.module}`);
  return `---\n\n${title}\n\n${lines.length ? lines.join('\n\n') : '(none)'}\n`;
}

export function formatDigestEmailBody(digest: ReminderDigestPayload): string {
  const { summary } = digest;
  return [
    'Good Morning,',
    '',
    `You currently have ${summary.total} active reminders.`,
    '',
    formatSection('OVERDUE', digest.overdue),
    formatSection('DUE TODAY', digest.dueToday),
    formatSection('UPCOMING', digest.upcoming),
    '---',
    '',
    'Summary',
    '',
    `Critical: ${summary.critical}`,
    `High: ${summary.high}`,
    `Medium: ${summary.medium}`,
    `Low: ${summary.low}`,
    '',
    'Login to Kajkarma to review and take action.',
  ].join('\n');
}

async function resolveDigestRecipientUserId(): Promise<Types.ObjectId | null> {
  const email = env.DAILY_REMINDER_DIGEST_EMAIL?.trim().toLowerCase();
  if (!email) return null;

  const user = await findUserByEmail(email);
  if (user?._id) return user._id as Types.ObjectId;

  const fallback = await findUserByEmail(env.SUPER_ADMIN_EMAIL);
  return (fallback?._id as Types.ObjectId) ?? null;
}

export async function getDigestPreview(): Promise<ReminderDigestPayload> {
  const reminders = await fetchActiveRemindersForDigest();
  return buildReminderDigest(reminders);
}

export async function runDailyReminderDigest(): Promise<void> {
  const recipient = env.DAILY_REMINDER_DIGEST_EMAIL?.trim();
  if (!recipient) {
    logger.warn('Daily reminder digest skipped: DAILY_REMINDER_DIGEST_EMAIL not set');
    return;
  }

  const userId = await resolveDigestRecipientUserId();
  if (!userId) {
    logger.warn('Daily reminder digest skipped: no user found for digest log');
    return;
  }

  const digestDate = getIstDateKey();
  if (await digestAlreadySent(userId, digestDate)) {
    logger.info(`Daily reminder digest already sent for ${digestDate}`);
    return;
  }

  const reminders = await fetchActiveRemindersForDigest();
  if (reminders.length === 0) {
    logger.info('Daily reminder digest skipped: zero active reminders');
    return;
  }

  const digest = buildReminderDigest(reminders);
  const body = formatDigestEmailBody(digest);

  const sent = await sendPlainEmail(recipient, 'Kajkarma Daily Reminder Digest', body);
  if (!sent) {
    logger.warn('Daily reminder digest not logged: email was not sent');
    return;
  }

  await recordDigestSent(userId, digestDate);
  logger.info(`Daily reminder digest sent to ${recipient} (${digest.summary.total} reminders)`);
}
