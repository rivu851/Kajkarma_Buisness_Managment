import type { Types } from 'mongoose';
import { Reminder } from '../models/reminder.model.js';
import type { IReminder } from '../types/reminder.js';
import type { ReminderPriority } from '../constants/enums.js';
import type { JwtPayload } from '../types/index.js';
import { digestAlreadySent, recordDigestSent } from '../repositories/daily-digest-log.repository.js';
import { findAllActiveUsersWithRoles } from '../repositories/user.repository.js';
import { fetchAlertCandidates } from '../repositories/dashboard.repository.js';
import { reminderMyScope } from '../utils/reminderScope.js';
import {
  resolveEffectivePermissions,
  canReadModule,
  canViewSalaryMetrics,
  isTeamDashboardRole,
} from '../utils/resolvePermissions.js';
import { leadListScope, clientListScope, projectListScope } from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { sendPlainEmail } from './email.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getIstDateKey, getIstDayBounds, formatDateInIst } from '../utils/istDayBounds.js';
import type {
  DigestReminderItem,
  DigestAlertItem,
  ReminderDigestPayload,
} from '../types/reminder-digest.js';

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

export async function fetchActiveRemindersForDigest(
  scope: Record<string, unknown> = {}
): Promise<IReminder[]> {
  const rows = await Reminder.find({
    ...scope,
    status: { $in: ACTIVE_STATUSES },
  })
    .sort({ reminder_date: 1 })
    .lean();

  return rows as IReminder[];
}

async function buildDigestAlerts(user: JwtPayload): Promise<DigestAlertItem[]> {
  const permissions = await resolveEffectivePermissions(user);
  const can = (mod: Parameters<typeof canReadModule>[1]) =>
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN || canReadModule(permissions, mod);
  const teamView = isTeamDashboardRole(user.roleName);

  const scope = {
    lead: leadListScope(user),
    client: clientListScope(user),
    project: projectListScope(user, null),
    upcomingPayment:
      user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE
        ? { assigned_follow_up_user: new (await import('mongoose')).default.Types.ObjectId(user.userId) }
        : {},
  };

  const candidates = await fetchAlertCandidates({
    scope,
    includeLeadAlerts: can('leads'),
    includePaymentAlerts: can('payments') && !teamView,
    includeProjectAlerts: can('projects'),
    includeSalaryAlerts: canViewSalaryMetrics(user.roleName) && can('salary'),
    includeReimbursementAlerts: can('reimbursements'),
    includeSubscriptionAlerts: can('subscriptions') && !teamView,
  });

  const alerts: DigestAlertItem[] = [];

  for (const lead of candidates.overdueLeads) {
    alerts.push({ title: 'Lead follow-up overdue', description: lead.lead_name });
  }
  for (const payment of candidates.overduePayments) {
    alerts.push({ title: 'Client payment overdue', description: `Outstanding: ${payment.amount}` });
  }
  for (const project of candidates.overdueProjects) {
    alerts.push({ title: 'Project deadline missed', description: project.project_name });
  }
  for (const sub of candidates.expiringSubscriptions) {
    alerts.push({
      title: 'Subscription expiring soon',
      description: `${sub.plan_name} — renews ${sub.renewal_date.toISOString().slice(0, 10)}`,
    });
  }
  if (candidates.pendingSalaries > 0) {
    alerts.push({
      title: 'Salaries pending',
      description: `${candidates.pendingSalaries} record(s) awaiting payment`,
    });
  }
  for (const r of candidates.largeReimbursements) {
    alerts.push({
      title: 'Large reimbursement pending',
      description: `${r.expense_title} — ${r.amount}`,
    });
  }

  return alerts;
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

  return { alerts: [] as DigestAlertItem[], overdue, dueToday, upcoming, summary };
}

function formatAlertSection(alerts: DigestAlertItem[]): string {
  if (alerts.length === 0) return '';
  const lines = alerts.map((a) => `• ${a.title}: ${a.description}`);
  return `---\n\nALERTS\n\n${lines.join('\n')}\n`;
}

function formatSection(title: string, items: DigestReminderItem[]): string {
  const lines = items.map((item) => `• ${item.title}\n  ${item.dueDate}\n  ${item.module}`);
  return `---\n\n${title}\n\n${lines.length ? lines.join('\n\n') : '(none)'}\n`;
}

export function formatDigestEmailBody(digest: ReminderDigestPayload): string {
  const { summary, alerts } = digest;
  const hasReminders = summary.total > 0;
  const hasAlerts = alerts.length > 0;

  if (!hasReminders && !hasAlerts) return '';

  const parts: string[] = [
    'Good Morning,',
    '',
  ];

  if (hasAlerts) {
    parts.push(`You have ${alerts.length} alert${alerts.length === 1 ? '' : 's'} requiring attention.`);
  }
  if (hasReminders) {
    parts.push(`You have ${summary.total} active reminder${summary.total === 1 ? '' : 's'}.`);
  }

  parts.push('');

  if (hasAlerts) parts.push(formatAlertSection(alerts));
  if (hasReminders) {
    parts.push(formatSection('OVERDUE', digest.overdue));
    parts.push(formatSection('DUE TODAY', digest.dueToday));
    parts.push(formatSection('UPCOMING', digest.upcoming));
    parts.push('---');
    parts.push('');
    parts.push('Summary');
    parts.push('');
    parts.push(`Critical: ${summary.critical}`);
    parts.push(`High:     ${summary.high}`);
    parts.push(`Medium:   ${summary.medium}`);
    parts.push(`Low:      ${summary.low}`);
    parts.push('');
  }

  parts.push('Login to Kajkarma to review and take action.');
  return parts.join('\n');
}

export async function getDigestPreview(user: JwtPayload): Promise<ReminderDigestPayload> {
  const scope = reminderMyScope(user);
  const [reminders, alerts] = await Promise.all([
    fetchActiveRemindersForDigest(scope),
    buildDigestAlerts(user),
  ]);
  return { ...buildReminderDigest(reminders), alerts };
}

export async function runDailyReminderDigest(): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    logger.warn('Daily digest email skipped: SMTP not configured');
    return;
  }

  const digestDate = getIstDateKey();
  const users = await findAllActiveUsersWithRoles();

  let sentCount = 0;

  for (const user of users) {
    const userId = user._id as Types.ObjectId;

    if (await digestAlreadySent(userId, digestDate)) continue;

    const fakePayload: JwtPayload = {
      userId: userId.toString(),
      roleId: user.roleId,
      roleName: user.roleName,
    };

    const scope = reminderMyScope(fakePayload);
    const [reminders, alerts] = await Promise.all([
      fetchActiveRemindersForDigest(scope),
      buildDigestAlerts(fakePayload),
    ]);

    if (reminders.length === 0 && alerts.length === 0) continue;

    const digest: ReminderDigestPayload = { ...buildReminderDigest(reminders), alerts };
    const body = formatDigestEmailBody(digest);

    const sent = await sendPlainEmail(user.email, 'Kajkarma Daily Reminder Digest', body);
    if (sent) {
      await recordDigestSent(userId, digestDate);
      sentCount++;
      logger.info(
        `Digest sent to ${user.email} (${user.roleName}) — ${reminders.length} reminders, ${alerts.length} alerts`
      );
    }
  }

  logger.info(`Daily reminder digest complete: sent to ${sentCount}/${users.length} users`);
}
