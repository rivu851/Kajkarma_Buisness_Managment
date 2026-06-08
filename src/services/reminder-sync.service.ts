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
import { findSalaryByEmployeeAndPeriod, createSalary } from '../repositories/salary.repository.js';
import type { ISalary } from '../types/business.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { startOfDay, endOfMonth, monthKey } from '../utils/dateRanges.js';
import { toObjectId } from '../utils/recordScope.js';
import {
  upsertAutoReminder,
  escalateOverdueReminders,
  wakeSnoozedReminders,
  closePendingRemindersForRecord,
} from './reminder.service.js';
import {
  cancelOrphanRemindersForModule,
  cancelReminderByDedupKey,
  cancelRemindersByDedupKeyPattern,
} from '../repositories/reminder.repository.js';
import type { ReminderPriority } from '../constants/enums.js';

async function financeAndAdminUserIds(): Promise<Types.ObjectId[]> {
  const ids: Types.ObjectId[] = [];
  for (const roleName of [SYSTEM_ROLES.HR, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SUPER_ADMIN]) {
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

async function resolveAllProjectUserIds(project: {
  created_by?: Types.ObjectId;
  assigned_employees?: Types.ObjectId[];
}): Promise<Types.ObjectId[]> {
  const seen = new Set<string>();
  const userIds: Types.ObjectId[] = [];

  if (project.created_by) {
    seen.add(project.created_by.toString());
    userIds.push(project.created_by as Types.ObjectId);
  }

  if (project.assigned_employees?.length) {
    const employees = await Employee.find({
      _id: { $in: project.assigned_employees },
      user_id: { $exists: true, $ne: null },
    })
      .select('user_id')
      .lean();

    for (const emp of employees) {
      if (!emp.user_id) continue;
      const key = emp.user_id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        userIds.push(emp.user_id as Types.ObjectId);
      }
    }
  }

  return userIds;
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

// OLD dedup_key format included a trailing date segment (e.g. `lead_followup|leads|<id>|2026-06-01`).
// These are replaced by stable per-entity keys. Cancel any survivors so they stop appearing.
async function cancelLegacyDateKeyedReminders(): Promise<void> {
  await Promise.all([
    cancelRemindersByDedupKeyPattern(/^lead_followup\|leads\|[0-9a-fA-F]{24}\|/),
    cancelRemindersByDedupKeyPattern(/^communication_followup\|communications\|[0-9a-fA-F]{24}\|/),
  ]);
}

async function cancelStaleSourceReminders(): Promise<void> {
  const [closedLeads, closedPayments, closedProjects, closedSubs, activeComms] = await Promise.all([
    Lead.find({ stage: { $in: ['won', 'lost'] } }).select('_id').lean(),
    UpcomingPayment.find({ payment_status: { $in: ['received', 'cancelled'] } }).select('_id').lean(),
    Project.find({ status: { $in: ['completed', 'cancelled'] } }).select('_id').lean(),
    Subscription.find({ status: { $in: ['expired', 'cancelled'] } }).select('_id').lean(),
    Communication.find({ next_follow_up_date: { $exists: true, $ne: null } }).select('_id').lean(),
  ]);

  const activeCommIds = activeComms.map((c) => c._id as Types.ObjectId);

  await Promise.all([
    ...closedLeads.map((l) => closePendingRemindersForRecord('leads', l._id as Types.ObjectId)),
    ...closedPayments.map((p) =>
      closePendingRemindersForRecord('upcoming-payments', p._id as Types.ObjectId)
    ),
    ...closedProjects.map((p) => closePendingRemindersForRecord('projects', p._id as Types.ObjectId)),
    ...closedSubs.map((s) => closePendingRemindersForRecord('subscriptions', s._id as Types.ObjectId)),
    cancelOrphanRemindersForModule('communications', activeCommIds),
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
    const overdue = lead.follow_up_date < today;
    await upsertAutoReminder({
      dedup_key: `lead_followup|leads|${lead._id}`,
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

    const end = startOfDay(project.end_date);
    const daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 7) continue;

    let title: string;
    let priority: ReminderPriority;

    if (daysLeft < 0) {
      title = 'Project deadline missed';
      priority = 'critical';
    } else if (daysLeft === 0) {
      title = 'Project deadline is today';
      priority = 'critical';
    } else {
      title = `Project deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      priority = daysLeft <= 3 ? 'high' : 'medium';
    }

    // Cancel the old single-assignee reminder (dedup_key ending in |main) if still active
    await cancelReminderByDedupKey(`project_deadline|projects|${project._id}|main`);

    const userIds = await resolveAllProjectUserIds(project);
    if (userIds.length === 0) continue;

    for (const userId of userIds) {
      await upsertAutoReminder({
        dedup_key: `project_deadline|projects|${project._id}|${userId}`,
        type: 'project_deadline',
        title,
        description: `${project.project_name} ends on ${end.toISOString().slice(0, 10)}`,
        priority,
        related_module: 'projects',
        related_record_id: project._id as Types.ObjectId,
        assigned_user_id: userId,
        reminder_date: end,
        created_by: (project.created_by ?? userId) as Types.ObjectId,
      });
    }
  }
}

export async function syncPaymentReminders(): Promise<void> {
  type PaymentWithClient = {
    _id: Types.ObjectId;
    amount: number;
    due_date: Date;
    reminder_date?: Date;
    payment_status: string;
    assigned_follow_up_user?: Types.ObjectId;
    created_by?: Types.ObjectId;
    client_id?: Types.ObjectId | { _id: Types.ObjectId; company_name: string };
  };

  const payments = (await UpcomingPayment.find({
    payment_status: { $in: ['pending', 'overdue'] },
  })
    .select('amount due_date reminder_date assigned_follow_up_user created_by client_id payment_status')
    .populate('client_id', 'company_name')
    .lean()) as PaymentWithClient[];

  const today = startOfDay();

  for (const p of payments) {
    const assignee = (p.assigned_follow_up_user ?? p.created_by) as Types.ObjectId | undefined;
    if (!assignee) continue;

    const reminderDate = p.reminder_date ?? p.due_date;
    const overdue = p.due_date < today || p.payment_status === 'overdue';
    const clientName =
      p.client_id && typeof p.client_id === 'object' && 'company_name' in p.client_id
        ? (p.client_id as { company_name: string }).company_name
        : 'Client';

    await upsertAutoReminder({
      dedup_key: `client_payment|upcoming-payments|${p._id}|main`,
      type: 'client_payment',
      title: overdue ? 'Client payment overdue' : 'Client payment follow-up',
      description: `${clientName} – outstanding payment of ${p.amount}`,
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
    const daysLeft = Math.round((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 30) continue;

    let title: string;
    let priority: ReminderPriority;

    if (daysLeft < 0) {
      title = 'Subscription expired';
      priority = 'critical';
    } else if (daysLeft === 0) {
      title = 'Subscription renewal is today';
      priority = 'critical';
    } else {
      title = `Subscription renewing in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      priority = daysLeft <= 7 ? 'high' : 'medium';
    }

    await upsertAutoReminder({
      dedup_key: `subscription_renewal|subscriptions|${sub._id}|main`,
      type: 'subscription_renewal',
      title,
      description: `${sub.plan_name} renews on ${renewal.toISOString().slice(0, 10)}`,
      priority,
      related_module: 'subscriptions',
      related_record_id: sub._id as Types.ObjectId,
      assigned_user_id: assignee,
      reminder_date: renewal,
      created_by: assignee,
    });
  }
}

export async function syncSalaryReminders(): Promise<void> {
  const now = new Date();
  const prevMonthAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const deadline = endOfMonth(prevMonthAnchor);

  if (now.getTime() <= deadline.getTime()) return;

  const currentMonth = now.getUTCMonth() + 1; // 1-12
  const currentYear = now.getUTCFullYear();
  // Only count salaries from previous months — current month is handled by autoGenerateSalaryEntries
  const pending = await Salary.find({
    status: 'pending',
    $or: [{ year: { $lt: currentYear } }, { year: currentYear, month: { $lt: currentMonth } }],
  }).select('month year net_salary').lean();
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

export async function autoGenerateSalaryEntries(): Promise<void> {
  const now = new Date();
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth(); // 0-indexed
  const todayDay = now.getUTCDate();
  const todayMs = Date.UTC(todayYear, todayMonth, todayDay);
  const MS_PER_DAY = 86_400_000;

  const employees = await Employee.find({
    status: 'active',
    salary: { $gt: 0 },
  }).lean();

  if (employees.length === 0) return;

  const assignees = await financeAndAdminUserIds();

  for (const emp of employees) {
    // Use explicit salary_day if set, otherwise fall back to the day of joining_date
    const rawDay = emp.salary_day ?? new Date(emp.joining_date).getUTCDate();
    const salaryDay = Math.min(rawDay, 28); // cap at 28 so Feb is always valid
    const baseSalary = emp.salary!;

    // Find the next upcoming occurrence of salary_day (this month or next)
    const lastDayThisMonth = new Date(Date.UTC(todayYear, todayMonth + 1, 0)).getUTCDate();
    const actualDayThisMonth = Math.min(salaryDay, lastDayThisMonth);
    const salaryDateThisMonthMs = Date.UTC(todayYear, todayMonth, actualDayThisMonth);

    let salaryDateMs: number;
    let targetMonth: number; // 1-12
    let targetYear: number;

    if (salaryDateThisMonthMs >= todayMs) {
      salaryDateMs = salaryDateThisMonthMs;
      targetMonth = todayMonth + 1;
      targetYear = todayYear;
    } else {
      const nextMonthIndex = (todayMonth + 1) % 12;
      const nextMonthYear = todayMonth === 11 ? todayYear + 1 : todayYear;
      const lastDayNextMonth = new Date(Date.UTC(nextMonthYear, nextMonthIndex + 1, 0)).getUTCDate();
      salaryDateMs = Date.UTC(nextMonthYear, nextMonthIndex, Math.min(salaryDay, lastDayNextMonth));
      targetMonth = nextMonthIndex + 1;
      targetYear = nextMonthYear;
    }

    const diffDays = Math.floor((salaryDateMs - todayMs) / MS_PER_DAY);
    if (diffDays < 0 || diffDays > 3) continue;

    // Auto-create salary entry if one doesn't already exist for this period
    const existing = await findSalaryByEmployeeAndPeriod(emp._id, targetMonth, targetYear);
    let salaryId: Types.ObjectId;
    if (!existing) {
      const created = await createSalary({
        employee_id: emp._id,
        month: targetMonth,
        year: targetYear,
        base_salary: baseSalary,
        bonus: 0,
        deductions: 0,
        net_salary: baseSalary,
        status: 'pending',
      } as Partial<ISalary>);
      salaryId = created._id as Types.ObjectId;
    } else {
      salaryId = existing._id as Types.ObjectId;
    }

    // Remind HR / Finance / Admin / Super Admin
    // Use salary._id as related_record_id so reminders can be closed when salary is paid
    const salaryDateStr = new Date(salaryDateMs).toISOString().slice(0, 10);
    const priority = diffDays <= 1 ? 'critical' : 'high';
    const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    for (const userId of assignees) {
      await upsertAutoReminder({
        dedup_key: `salary_upcoming|salary|${emp._id}|${monthLabel}|${userId}`,
        type: 'salary_due',
        title: `Salary due: ${emp.full_name}`,
        description: `₹${baseSalary} due on ${salaryDateStr}`,
        priority,
        related_module: 'salary',
        related_record_id: salaryId,
        assigned_user_id: userId,
        reminder_date: new Date(salaryDateMs),
        created_by: userId,
      });
    }
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
    await upsertAutoReminder({
      dedup_key: `communication_followup|communications|${c._id}`,
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
    .select('project_name created_by assigned_employees')
    .lean();

  for (const project of projects) {
    if (!project.created_by) continue;
    const hasReport = await Report.exists({
      project_id: project._id,
      month: { $gte: monthStart, $lte: monthEnd },
    });
    if (hasReport) continue;

    const userIds = await resolveAllProjectUserIds(project);
    if (userIds.length === 0) continue;

    for (const userId of userIds) {
      await upsertAutoReminder({
        dedup_key: `report_upload|reports|${project._id}|${label}|${userId}`,
        type: 'report_upload',
        title: 'Monthly report upload due',
        description: `Upload report for ${project.project_name} (${label})`,
        priority: 'medium',
        related_module: 'reports',
        related_record_id: project._id as Types.ObjectId,
        assigned_user_id: userId,
        reminder_date: startOfDay(now),
        created_by: project.created_by as Types.ObjectId,
      });
    }
  }
}

/** Sync reminders for a single project immediately (called from project.service on update/delete). */
export async function syncProjectRemindersForOne(projectId: Types.ObjectId): Promise<void> {
  const project = await Project.findById(projectId)
    .select('project_name end_date status created_by assigned_employees')
    .lean();

  if (!project || !project.end_date || ['completed', 'cancelled'].includes(project.status)) {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    await closePendingRemindersForRecord('projects', projectId);
    return;
  }

  const today = startOfDay();
  const end = startOfDay(project.end_date);
  const daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7) return;

  let title: string;
  let priority: ReminderPriority;
  if (daysLeft < 0) { title = 'Project deadline missed'; priority = 'critical'; }
  else if (daysLeft === 0) { title = 'Project deadline is today'; priority = 'critical'; }
  else {
    title = `Project deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    priority = daysLeft <= 3 ? 'high' : 'medium';
  }

  await cancelReminderByDedupKey(`project_deadline|projects|${projectId}|main`);

  const userIds = await resolveAllProjectUserIds(project);
  if (userIds.length === 0) return;

  for (const userId of userIds) {
    await upsertAutoReminder({
      dedup_key: `project_deadline|projects|${projectId}|${userId}`,
      type: 'project_deadline',
      title,
      description: `${project.project_name} ends on ${end.toISOString().slice(0, 10)}`,
      priority,
      related_module: 'projects',
      related_record_id: projectId,
      assigned_user_id: userId,
      reminder_date: end,
      created_by: (project.created_by ?? userId) as Types.ObjectId,
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
    autoGenerateSalaryEntries(),
    syncReimbursementReminders(),
    syncCommunicationReminders(),
    syncReportUploadReminders(),
  ]);
  await cancelStaleSourceReminders();
  await cancelLegacyDateKeyedReminders();
  await wakeSnoozedReminders();
  await escalateOverdueReminders();
}
