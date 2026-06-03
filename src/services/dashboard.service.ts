import { Types } from 'mongoose';
import type { JwtPayload } from '../types/index.js';
import type { DashboardOverview, DashboardAlert, DashboardReminder } from '../types/dashboard.js';
import type { Module } from '../constants/permissions.js';
import {
  resolveEffectivePermissions,
  canReadModule,
  isTeamDashboardRole,
  canViewSalaryMetrics,
} from '../utils/resolvePermissions.js';
import {
  leadListScope,
  clientListScope,
  communicationListScope,
  projectListScope,
  toObjectId,
} from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { findEmployeeByUserId } from '../repositories/employee.repository.js';
import {
  aggregateLeadMetrics,
  aggregateClientMetrics,
  aggregateProjectMetrics,
  aggregateRevenueMetrics,
  aggregatePaymentMetrics,
  aggregateSalaryMetrics,
  aggregateReimbursementMetrics,
  aggregateCommunicationMetrics,
  aggregateSubscriptionMetrics,
  aggregateEmployeeProductivity,
  fetchTeamAssignedProjects,
  fetchLeadReminders,
  fetchPaymentReminders,
  fetchAlertCandidates,
  type DashboardScope,
} from '../repositories/dashboard.repository.js';
import { startOfDay } from '../utils/dateRanges.js';
import { getDashboardReminderData } from './reminder.service.js';
import type { IReminder } from '../types/reminder.js';

function buildScope(user: JwtPayload, employeeId?: Types.ObjectId | null): DashboardScope {
  return {
    lead: leadListScope(user),
    client: clientListScope(user),
    project: projectListScope(user, employeeId ?? null),
    communication: communicationListScope(user),
    worklog: employeeId ? { employee_id: employeeId } : {},
    upcomingPayment:
      user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE
        ? { assigned_follow_up_user: toObjectId(user.userId) }
        : {},
  };
}

function buildAlerts(candidates: Awaited<ReturnType<typeof fetchAlertCandidates>>): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const lead of candidates.overdueLeads) {
    alerts.push({
      type: 'lead_followup_overdue',
      severity: 'high',
      title: 'Lead follow-up overdue',
      description: `${lead.lead_name} follow-up date has passed`,
      module: 'leads',
      recordId: lead._id.toString(),
    });
  }

  for (const payment of candidates.overduePayments) {
    alerts.push({
      type: 'client_payment_overdue',
      severity: 'critical',
      title: 'Client payment overdue',
      description: `Outstanding payment of ${payment.amount}`,
      module: 'upcoming-payments',
      recordId: payment._id.toString(),
    });
  }

  for (const project of candidates.overdueProjects) {
    alerts.push({
      type: 'project_deadline_missed',
      severity: 'high',
      title: 'Project deadline missed',
      description: `${project.project_name} is past its deadline`,
      module: 'projects',
      recordId: project._id.toString(),
    });
  }

  for (const sub of candidates.expiringSubscriptions) {
    alerts.push({
      type: 'subscription_expiring',
      severity: 'medium',
      title: 'Subscription expiring soon',
      description: `${sub.plan_name} renews on ${sub.renewal_date.toISOString().slice(0, 10)}`,
      module: 'subscriptions',
      recordId: sub._id.toString(),
    });
  }

  if (candidates.pendingSalaries > 0) {
    alerts.push({
      type: 'salary_pending',
      severity: 'medium',
      title: 'Salaries pending',
      description: `${candidates.pendingSalaries} salary record(s) awaiting payment`,
      module: 'salary',
      recordId: '',
    });
  }

  for (const r of candidates.largeReimbursements) {
    alerts.push({
      type: 'reimbursement_approval',
      severity: 'high',
      title: 'Large reimbursement pending',
      description: `${r.expense_title} — ${r.amount}`,
      module: 'reimbursements',
      recordId: r._id.toString(),
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 20);
}

async function buildTeamSummary(
  user: JwtPayload,
  employeeId: Types.ObjectId
): Promise<DashboardOverview['teamSummary']> {
  const [assignedProjects, productivity, leadReminders] = await Promise.all([
    fetchTeamAssignedProjects(employeeId),
    aggregateEmployeeProductivity({ employee_id: employeeId }),
    fetchLeadReminders(leadListScope(user), user.userId, 5),
  ]);

  const self = productivity.find((p) => p.employeeId === employeeId.toString()) ?? {
    employeeId: employeeId.toString(),
    employeeName: 'You',
    tasksCompleted: 0,
    tasksInProgress: 0,
    blockedTasks: 0,
    hoursLoggedToday: 0,
    hoursLoggedThisWeek: 0,
  };

  const pendingTasks = leadReminders.map((r) => ({
    type: r.type,
    title: r.title,
    dueDate: r.dueDate,
    recordId: r.recordId,
  }));

  for (const p of assignedProjects) {
    if (p.endDate && new Date(p.endDate) < addDaysSafe(startOfDay(), 7)) {
      pendingTasks.push({
        type: 'project_deadline',
        title: `Deadline approaching: ${p.projectName}`,
        dueDate: p.endDate,
        recordId: p.id,
      });
    }
  }

  return {
    assignedProjects,
    workSummary: {
      hoursLoggedToday: self.hoursLoggedToday,
      hoursLoggedThisWeek: self.hoursLoggedThisWeek,
      tasksCompleted: self.tasksCompleted,
      tasksInProgress: self.tasksInProgress,
      blockedTasks: self.blockedTasks,
    },
    pendingTasks: pendingTasks.slice(0, 10),
  };
}

function reminderToDashboardDto(r: IReminder): DashboardReminder {
  return {
    type: r.type,
    title: r.title,
    dueDate: r.reminder_date.toISOString(),
    module: r.related_module,
    recordId: r.related_record_id?.toString() ?? r._id.toString(),
    assignedUserId: r.assigned_user_id.toString(),
    reminderId: r._id.toString(),
    priority: r.priority,
    isRead: r.is_read,
  };
}

function addDaysSafe(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function getDashboardOverview(user: JwtPayload): Promise<DashboardOverview> {
  const permissions = await resolveEffectivePermissions(user);
  const can = (module: Module) =>
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN || canReadModule(permissions, module);

  const employee = await findEmployeeByUserId(user.userId);
  const employeeId = employee?._id ?? null;
  const scope = buildScope(user, employeeId);
  const teamView = isTeamDashboardRole(user.roleName);

  const loaders: Array<Promise<void>> = [];
  const result: DashboardOverview = {
    view: teamView ? 'team' : 'full',
    generatedAt: new Date().toISOString(),
    leadMetrics: null,
    clientMetrics: null,
    projectMetrics: null,
    revenueMetrics: null,
    paymentMetrics: null,
    salaryMetrics: null,
    reimbursementMetrics: null,
    communicationMetrics: null,
    subscriptionMetrics: null,
    employeeProductivity: null,
    teamSummary: null,
    recentReminders: [],
    reminderMetrics: null,
    alerts: [],
  };

  if (can('leads')) {
    loaders.push(
      aggregateLeadMetrics(scope).then((m) => {
        result.leadMetrics = m;
      })
    );
  }

  if (can('clients')) {
    loaders.push(
      aggregateClientMetrics(scope).then((m) => {
        result.clientMetrics = m;
      })
    );
  }

  if (can('projects')) {
    loaders.push(
      aggregateProjectMetrics(scope).then((m) => {
        result.projectMetrics = m;
      })
    );
  }

  if (can('revenue') && !teamView) {
    loaders.push(
      aggregateRevenueMetrics().then((m) => {
        result.revenueMetrics = m;
      })
    );
  }

  if (can('payments') && !teamView) {
    loaders.push(
      aggregatePaymentMetrics(scope).then((m) => {
        result.paymentMetrics = m;
      })
    );
  }

  if (canViewSalaryMetrics(user.roleName) && can('salary')) {
    loaders.push(
      aggregateSalaryMetrics().then((m) => {
        result.salaryMetrics = m;
      })
    );
  }

  if (can('reimbursements')) {
    loaders.push(
      aggregateReimbursementMetrics().then((m) => {
        result.reimbursementMetrics = m;
      })
    );
  }

  if (can('communications')) {
    loaders.push(
      aggregateCommunicationMetrics(scope).then((m) => {
        result.communicationMetrics = m;
      })
    );
  }

  if (can('subscriptions') && !teamView) {
    loaders.push(
      aggregateSubscriptionMetrics().then((m) => {
        result.subscriptionMetrics = m;
      })
    );
  }

  if (can('worklogs')) {
    const worklogScope =
      teamView && employeeId
        ? { employee_id: employeeId }
        : user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE && employeeId
          ? { employee_id: employeeId }
          : {};
    loaders.push(
      aggregateEmployeeProductivity(worklogScope).then((rows) => {
        result.employeeProductivity = rows;
      })
    );
  }

  if (teamView && employeeId) {
    loaders.push(
      buildTeamSummary(user, employeeId).then((summary) => {
        result.teamSummary = summary;
      })
    );
  }

  if (can('reminders')) {
    loaders.push(
      getDashboardReminderData(user).then((rm) => {
        result.reminderMetrics = {
          unreadCount: rm.unreadCount,
          upcomingCount: rm.today.length + rm.critical.length,
          overdueCount: rm.overdue.length,
          criticalCount: rm.critical.length,
          byType: rm.byType,
        };
        result.recentReminders = [...rm.today, ...rm.overdue, ...rm.critical]
          .slice(0, 15)
          .map(reminderToDashboardDto);
      })
    );
  } else {
    const reminderPromises: Promise<DashboardReminder[]>[] = [];
    if (can('leads')) {
      reminderPromises.push(
        fetchLeadReminders(scope.lead ?? {}, teamView ? user.userId : undefined, 8)
      );
    }
    if (can('payments') && !teamView) {
      reminderPromises.push(fetchPaymentReminders(5));
    }
    loaders.push(
      Promise.all(reminderPromises).then((groups) => {
        result.recentReminders = groups
          .flat()
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 15);
      })
    );
  }

  if (can('dashboard')) {
    loaders.push(
      fetchAlertCandidates({
        scope,
        includeLeadAlerts: can('leads'),
        includePaymentAlerts: can('payments') && !teamView,
        includeProjectAlerts: can('projects'),
        includeSalaryAlerts: canViewSalaryMetrics(user.roleName) && can('salary'),
        includeReimbursementAlerts: can('reimbursements'),
        includeSubscriptionAlerts: can('subscriptions') && !teamView,
      }).then((candidates) => {
        result.alerts = buildAlerts(candidates);
      })
    );
  }

  await Promise.all(loaders);

  return result;
}
