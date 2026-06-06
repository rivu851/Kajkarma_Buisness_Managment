import { Types, type PipelineStage } from 'mongoose';
import { Lead } from '../models/lead.model.js';
import { Client } from '../models/client.model.js';
import { Project } from '../models/project.model.js';
import { Revenue } from '../models/revenue.model.js';
import { UpcomingPayment } from '../models/upcoming_payment.model.js';
import { Salary } from '../models/salary.model.js';
import { Reimbursement } from '../models/reimbursement.model.js';
import { Communication } from '../models/communication.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Worklog } from '../models/worklog.model.js';
import { Employee } from '../models/employee.model.js';
import {
  LEAD_STAGES,
  LEAD_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_PRIORITIES,
  COMMUNICATION_TYPES,
} from '../constants/enums.js';
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfMonth,
  endOfMonth,
  monthKey,
  last12MonthKeys,
} from '../utils/dateRanges.js';

export interface DashboardScope {
  lead?: Record<string, unknown>;
  client?: Record<string, unknown>;
  project?: Record<string, unknown>;
  communication?: Record<string, unknown>;
  worklog?: Record<string, unknown>;
  upcomingPayment?: Record<string, unknown>;
}

function emptyBreakdown<T extends string>(keys: readonly T[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

async function breakdown(
  model: { aggregate: <T>(pipeline: PipelineStage[]) => Promise<T[]> },
  match: Record<string, unknown>,
  field: string
): Promise<Record<string, number>> {
  const rows = await model.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (row._id) out[row._id] = row.count;
  }
  return out;
}

export async function aggregateLeadMetrics(scope: DashboardScope): Promise<{
  totalLeads: number;
  activeLeads: number;
  leadStageBreakdown: Record<string, number>;
  leadStatusBreakdown: Record<string, number>;
  conversionRate: number;
  todayFollowups: number;
  overdueFollowups: number;
}> {
  const match = scope.lead ?? {};
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [totalLeads, activeLeads, wonLeads, stageMap, statusMap, todayFollowups, overdueFollowups] =
    await Promise.all([
      Lead.countDocuments(match),
      Lead.countDocuments({ ...match, status: 'active' }),
      Lead.countDocuments({ ...match, stage: 'won' }),
      breakdown(Lead, match, 'stage'),
      breakdown(Lead, match, 'status'),
      Lead.countDocuments({
        ...match,
        follow_up_date: { $gte: todayStart, $lte: todayEnd },
      }),
      Lead.countDocuments({
        ...match,
        follow_up_date: { $lt: todayStart },
        status: 'active',
      }),
    ]);

  const leadStageBreakdown = { ...emptyBreakdown(LEAD_STAGES), ...stageMap };
  const leadStatusBreakdown = { ...emptyBreakdown(LEAD_STATUSES), ...statusMap };
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 10000) / 100 : 0;

  return {
    totalLeads,
    activeLeads,
    leadStageBreakdown,
    leadStatusBreakdown,
    conversionRate,
    todayFollowups,
    overdueFollowups,
  };
}

export async function aggregateClientMetrics(scope: DashboardScope): Promise<{
  totalClients: number;
  activeClients: number;
  onHoldClients: number;
  churnedClients: number;
  prospectClients: number;
  newClientsThisMonth: number;
}> {
  const match = scope.client ?? {};
  const monthStart = startOfMonth();

  const [totalClients, activeClients, onHoldClients, churnedClients, prospectClients, newClientsThisMonth] =
    await Promise.all([
      Client.countDocuments(match),
      Client.countDocuments({ ...match, status: 'active' }),
      Client.countDocuments({ ...match, status: 'on_hold' }),
      Client.countDocuments({ ...match, status: 'churned' }),
      Client.countDocuments({ ...match, status: 'prospect' }),
      Client.countDocuments({ ...match, created_at: { $gte: monthStart } }),
    ]);

  return {
    totalClients,
    activeClients,
    onHoldClients,
    churnedClients,
    prospectClients,
    newClientsThisMonth,
  };
}

export async function aggregateProjectMetrics(scope: DashboardScope): Promise<{
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  projectCategoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  projectsEndingWithin7Days: number;
  overdueProjects: number;
}> {
  const match = scope.project ?? {};
  const now = new Date();
  const in7 = addDays(now, 7);

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    onHoldProjects,
    cancelledProjects,
    categoryMap,
    priorityMap,
    projectsEndingWithin7Days,
    overdueProjects,
  ] = await Promise.all([
    Project.countDocuments(match),
    Project.countDocuments({ ...match, status: { $in: ['not_started', 'in_progress'] } }),
    Project.countDocuments({ ...match, status: 'completed' }),
    Project.countDocuments({ ...match, status: 'on_hold' }),
    Project.countDocuments({ ...match, status: 'cancelled' }),
    breakdown(Project, match, 'category'),
    breakdown(Project, match, 'priority'),
    Project.countDocuments({
      ...match,
      end_date: { $gte: now, $lte: in7 },
      status: { $in: ['not_started', 'in_progress'] },
    }),
    Project.countDocuments({
      ...match,
      end_date: { $lt: now },
      status: { $in: ['not_started', 'in_progress', 'on_hold'] },
    }),
  ]);

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    onHoldProjects,
    cancelledProjects,
    projectCategoryBreakdown: { ...emptyBreakdown(PROJECT_CATEGORIES), ...categoryMap },
    priorityBreakdown: { ...emptyBreakdown(PROJECT_PRIORITIES), ...priorityMap },
    projectsEndingWithin7Days,
    overdueProjects,
  };
}

const REVENUE_TREND_START = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0));
};

export async function aggregateRevenueMetrics(): Promise<{
  currentMonthExpectedRevenue: number;
  currentMonthReceivedRevenue: number;
  currentMonthPendingRevenue: number;
  allTimeExpectedRevenue: number;
  allTimeReceivedRevenue: number;
  allTimePendingRevenue: number;
  monthlyRevenueTrend: Array<{ month: string; expected: number; received: number; pending: number }>;
}> {
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [allTime, currentMonth, trendRows] = await Promise.all([
    Revenue.aggregate<{ expected: number; received: number }>([
      {
        $group: {
          _id: null,
          expected: { $sum: '$amount' },
          received: { $sum: '$received_amount' },
        },
      },
    ]),
    Revenue.aggregate<{ expected: number; received: number }>([
      { $match: { revenue_date: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: null,
          expected: { $sum: '$amount' },
          received: { $sum: '$received_amount' },
        },
      },
    ]),
    Revenue.aggregate<{ _id: string; expected: number; received: number }>([
      {
        $match: {
          revenue_date: { $gte: REVENUE_TREND_START() },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$revenue_date', timezone: 'UTC' },
          },
          expected: { $sum: '$amount' },
          received: { $sum: '$received_amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const all = allTime[0] ?? { expected: 0, received: 0 };
  const cur = currentMonth[0] ?? { expected: 0, received: 0 };
  const trendMap = new Map<string, { expected: number; received: number }>();
  for (const row of trendRows) {
    trendMap.set(row._id, { expected: row.expected, received: row.received });
  }

  const monthlyRevenueTrend = last12MonthKeys().map((month) => {
    const v = trendMap.get(month) ?? { expected: 0, received: 0 };
    return {
      month,
      expected: v.expected,
      received: v.received,
      pending: Math.max(0, v.expected - v.received),
    };
  });

  return {
    currentMonthExpectedRevenue: cur.expected,
    currentMonthReceivedRevenue: cur.received,
    currentMonthPendingRevenue: Math.max(0, cur.expected - cur.received),
    allTimeExpectedRevenue: all.expected,
    allTimeReceivedRevenue: all.received,
    allTimePendingRevenue: Math.max(0, all.expected - all.received),
    monthlyRevenueTrend,
  };
}

export async function aggregatePaymentMetrics(scope: DashboardScope): Promise<{
  paymentsDue7Days: number;
  paymentsDue30Days: number;
  totalPendingPayments: number;
  totalOverduePayments: number;
  overdueAmount: number;
  confirmedUpcomingPayments: number;
  expectedUpcomingPayments: number;
}> {
  const pendingStatuses = ['pending', 'overdue'] as const;
  const base = { ...scope.upcomingPayment, payment_status: { $in: pendingStatuses } };
  const now = new Date();
  const in7 = addDays(now, 7);
  const in30 = addDays(now, 30);

  const [
    paymentsDue7Days,
    paymentsDue30Days,
    totalPendingPayments,
    totalOverduePayments,
    overdueAgg,
    confirmedUpcomingPayments,
    expectedUpcomingPayments,
  ] = await Promise.all([
    UpcomingPayment.countDocuments({ ...base, due_date: { $gte: now, $lte: in7 } }),
    UpcomingPayment.countDocuments({ ...base, due_date: { $gte: now, $lte: in30 } }),
    UpcomingPayment.countDocuments({ ...base }),
    UpcomingPayment.countDocuments({ ...scope.upcomingPayment, payment_status: 'overdue' }),
    UpcomingPayment.aggregate<{ total: number }>([
      { $match: { ...scope.upcomingPayment, payment_status: 'overdue' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    UpcomingPayment.countDocuments({
      ...scope.upcomingPayment,
      payment_type: 'confirmed',
      payment_status: { $in: ['pending', 'overdue'] },
    }),
    UpcomingPayment.countDocuments({
      ...scope.upcomingPayment,
      payment_type: 'expected',
      payment_status: { $in: ['pending', 'overdue'] },
    }),
  ]);

  return {
    paymentsDue7Days,
    paymentsDue30Days,
    totalPendingPayments,
    totalOverduePayments,
    overdueAmount: overdueAgg[0]?.total ?? 0,
    confirmedUpcomingPayments,
    expectedUpcomingPayments,
  };
}

export async function aggregateSalaryMetrics(): Promise<{
  pendingSalaryCount: number;
  pendingSalaryAmount: number;
  partiallyPaidCount: number;
  paidCount: number;
  currentMonthSalaryExpense: number;
}> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [pendingAgg, partiallyPaidCount, paidCount, paidMonthAgg] = await Promise.all([
    Salary.aggregate<{ count: number; amount: number }>([
      { $match: { status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$net_salary' } } },
    ]),
    Salary.countDocuments({ status: 'on_hold' }),
    Salary.countDocuments({ status: 'paid' }),
    Salary.aggregate<{ total: number }>([
      { $match: { status: 'paid', month, year } },
      { $group: { _id: null, total: { $sum: '$net_salary' } } },
    ]),
  ]);

  const pending = pendingAgg[0];
  return {
    pendingSalaryCount: pending?.count ?? 0,
    pendingSalaryAmount: pending?.amount ?? 0,
    partiallyPaidCount,
    paidCount,
    currentMonthSalaryExpense: paidMonthAgg[0]?.total ?? 0,
  };
}

export async function aggregateReimbursementMetrics(): Promise<{
  pendingApprovalCount: number;
  approvedAwaitingPaymentCount: number;
  paidReimbursementsCount: number;
  pendingAmount: number;
}> {
  const [pendingApprovalCount, approvedAwaitingPaymentCount, paidReimbursementsCount, pendingAgg] =
    await Promise.all([
      Reimbursement.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
      Reimbursement.countDocuments({ status: 'approved' }),
      Reimbursement.countDocuments({ status: 'paid' }),
      Reimbursement.aggregate<{ total: number }>([
        { $match: { status: { $in: ['submitted', 'under_review', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

  return {
    pendingApprovalCount,
    approvedAwaitingPaymentCount,
    paidReimbursementsCount,
    pendingAmount: pendingAgg[0]?.total ?? 0,
  };
}

export async function aggregateCommunicationMetrics(
  scope: DashboardScope
): Promise<{
  todayCommunications: number;
  weeklyCommunications: number;
  monthlyCommunications: number;
  communicationTypeBreakdown: Record<string, number>;
  topActiveEmployees: Array<{ userId: string; name: string; count: number }>;
}> {
  const match = scope.communication ?? {};
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const weekStart = addDays(todayStart, -7);
  const monthStart = startOfMonth();

  const [todayCommunications, weeklyCommunications, monthlyCommunications, typeMap, topRows] =
    await Promise.all([
      Communication.countDocuments({ ...match, date: { $gte: todayStart, $lte: todayEnd } }),
      Communication.countDocuments({ ...match, date: { $gte: weekStart, $lte: todayEnd } }),
      Communication.countDocuments({ ...match, date: { $gte: monthStart, $lte: todayEnd } }),
      breakdown(Communication, match, 'type'),
      Communication.aggregate<{ _id: Types.ObjectId; count: number; name?: string }>([
        { $match: { ...match, date: { $gte: monthStart } } },
        { $group: { _id: '$user_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { count: 1, name: '$user.name' } },
      ]),
    ]);

  return {
    todayCommunications,
    weeklyCommunications,
    monthlyCommunications,
    communicationTypeBreakdown: { ...emptyBreakdown(COMMUNICATION_TYPES), ...typeMap },
    topActiveEmployees: topRows.map((r) => ({
      userId: r._id.toString(),
      name: r.name ?? 'Unknown',
      count: r.count,
    })),
  };
}

export async function aggregateSubscriptionMetrics(): Promise<{
  activeSubscriptions: number;
  expiringWithin7Days: number;
  expiringWithin30Days: number;
  expiredSubscriptions: number;
  monthlySubscriptionCost: number;
}> {
  const now = new Date();
  const in7 = addDays(now, 7);
  const in30 = addDays(now, 30);

  const [activeSubscriptions, expiringWithin7Days, expiringWithin30Days, expiredSubscriptions, costAgg] =
    await Promise.all([
      Subscription.countDocuments({ status: { $in: ['active', 'expiring_soon'] } }),
      Subscription.countDocuments({
        renewal_date: { $gte: now, $lte: in7 },
        status: { $in: ['active', 'expiring_soon'] },
      }),
      Subscription.countDocuments({
        renewal_date: { $gte: now, $lte: in30 },
        status: { $in: ['active', 'expiring_soon'] },
      }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.aggregate<{ total: number }>([
        { $match: { status: { $in: ['active', 'expiring_soon'] }, billing_cycle: 'monthly' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

  return {
    activeSubscriptions,
    expiringWithin7Days,
    expiringWithin30Days,
    expiredSubscriptions,
    monthlySubscriptionCost: costAgg[0]?.total ?? 0,
  };
}

export async function aggregateEmployeeProductivity(
  worklogScope: Record<string, unknown>
): Promise<
  Array<{
    employeeId: string;
    employeeName: string;
    tasksCompleted: number;
    tasksInProgress: number;
    blockedTasks: number;
    hoursLoggedToday: number;
    hoursLoggedThisWeek: number;
  }>
> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const weekStart = addDays(todayStart, -7);

  const rows = await Worklog.aggregate<{
    _id: Types.ObjectId;
    tasksCompleted: number;
    tasksInProgress: number;
    blockedTasks: number;
    hoursLoggedToday: number;
    hoursLoggedThisWeek: number;
    name?: string;
  }>([
    { $match: worklogScope },
    {
      $group: {
        _id: '$employee_id',
        tasksCompleted: {
          $sum: { $cond: [{ $eq: ['$work_status', 'completed'] }, 1, 0] },
        },
        tasksInProgress: {
          $sum: { $cond: [{ $eq: ['$work_status', 'in_progress'] }, 1, 0] },
        },
        blockedTasks: {
          $sum: { $cond: [{ $eq: ['$work_status', 'blocked'] }, 1, 0] },
        },
        hoursLoggedToday: {
          $sum: {
            $cond: [
              {
                $and: [{ $gte: ['$date', todayStart] }, { $lte: ['$date', todayEnd] }],
              },
              '$time_spent_hours',
              0,
            ],
          },
        },
        hoursLoggedThisWeek: {
          $sum: {
            $cond: [{ $gte: ['$date', weekStart] }, '$time_spent_hours', 0],
          },
        },
      },
    },
    { $sort: { hoursLoggedThisWeek: -1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: 'employees',
        localField: '_id',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        tasksCompleted: 1,
        tasksInProgress: 1,
        blockedTasks: 1,
        hoursLoggedToday: 1,
        hoursLoggedThisWeek: 1,
        name: '$emp.full_name',
      },
    },
  ]);

  return rows.map((r) => ({
    employeeId: r._id.toString(),
    employeeName: r.name ?? 'Unknown',
    tasksCompleted: r.tasksCompleted,
    tasksInProgress: r.tasksInProgress,
    blockedTasks: r.blockedTasks,
    hoursLoggedToday: Math.round(r.hoursLoggedToday * 100) / 100,
    hoursLoggedThisWeek: Math.round(r.hoursLoggedThisWeek * 100) / 100,
  }));
}

export async function fetchTeamAssignedProjects(
  employeeId: Types.ObjectId
): Promise<
  Array<{
    id: string;
    projectName: string;
    status: string;
    endDate?: string;
    clientName?: string;
  }>
> {
  const projects = await Project.find({
    assigned_employees: employeeId,
    status: { $in: ['not_started', 'in_progress', 'on_hold'] },
  })
    .populate('client_id', 'company_name')
    .sort({ end_date: 1 })
    .limit(10)
    .lean();

  return projects.map((p) => {
    const clientName =
      typeof p.client_id === 'object' && p.client_id && 'company_name' in p.client_id
        ? String((p.client_id as { company_name: string }).company_name)
        : undefined;
    const row: {
      id: string;
      projectName: string;
      status: string;
      endDate?: string;
      clientName?: string;
    } = {
      id: p._id.toString(),
      projectName: p.project_name,
      status: p.status,
    };
    if (p.end_date) row.endDate = p.end_date.toISOString();
    if (clientName) row.clientName = clientName;
    return row;
  });
}

export async function fetchLeadReminders(
  scope: Record<string, unknown>,
  userId?: string,
  limit = 10
): Promise<
  Array<{ type: string; title: string; dueDate: string; module: string; recordId: string }>
> {
  const match: Record<string, unknown> = {
    ...scope,
    follow_up_date: { $exists: true, $ne: null },
    status: 'active',
  };
  const leads = await Lead.find(match)
    .sort({ follow_up_date: 1 })
    .limit(limit)
    .select('lead_name company_name follow_up_date assigned_user_id')
    .lean();

  return leads.map((l) => ({
    type: 'lead_follow_up',
    title: `Follow up: ${l.lead_name}${l.company_name ? ` (${l.company_name})` : ''}`,
    dueDate: l.follow_up_date!.toISOString(),
    module: 'leads',
    recordId: l._id.toString(),
    ...(userId ? { assignedUserId: l.assigned_user_id?.toString() } : {}),
  }));
}

export async function fetchPaymentReminders(limit = 10): Promise<
  Array<{ type: string; title: string; dueDate: string; module: string; recordId: string }>
> {
  const rows = await UpcomingPayment.find({
    payment_status: { $in: ['pending', 'overdue'] },
    reminder_date: { $exists: true, $ne: null },
  })
    .sort({ reminder_date: 1 })
    .limit(limit)
    .populate('client_id', 'company_name')
    .lean();

  return rows.map((p) => ({
    type: 'client_payment',
    title: `Payment follow-up${typeof p.client_id === 'object' && p.client_id && 'company_name' in p.client_id ? `: ${(p.client_id as { company_name: string }).company_name}` : ''}`,
    dueDate: (p.reminder_date ?? p.due_date).toISOString(),
    module: 'upcoming-payments',
    recordId: p._id.toString(),
  }));
}

export interface AlertFetchOptions {
  scope: DashboardScope;
  includeLeadAlerts: boolean;
  includePaymentAlerts: boolean;
  includeProjectAlerts: boolean;
  includeSalaryAlerts: boolean;
  includeReimbursementAlerts: boolean;
  includeSubscriptionAlerts: boolean;
}

export async function fetchAlertCandidates(options: AlertFetchOptions): Promise<{
  overdueLeads: Array<{ _id: Types.ObjectId; lead_name: string }>;
  overduePayments: Array<{ _id: Types.ObjectId; amount: number }>;
  overdueProjects: Array<{ _id: Types.ObjectId; project_name: string }>;
  expiringSubscriptions: Array<{ _id: Types.ObjectId; plan_name: string; renewal_date: Date }>;
  pendingSalaries: number;
  largeReimbursements: Array<{ _id: Types.ObjectId; expense_title: string; amount: number }>;
}> {
  const {
    scope,
    includeLeadAlerts,
    includePaymentAlerts,
    includeProjectAlerts,
    includeSalaryAlerts,
    includeReimbursementAlerts,
    includeSubscriptionAlerts,
  } = options;
  const todayStart = startOfDay();
  const now = new Date();
  const in7 = addDays(now, 7);
  const reimbursementThreshold = Number(process.env['REIMBURSEMENT_APPROVAL_THRESHOLD'] ?? 10000);

  const overdueLeadsP = includeLeadAlerts
    ? Lead.find({
        ...(scope.lead ?? {}),
        follow_up_date: { $lt: todayStart },
        status: 'active',
        stage: { $nin: ['won', 'lost'] },
      })
        .limit(5)
        .select('lead_name')
        .lean()
    : Promise.resolve([]);

  const overduePaymentsP = includePaymentAlerts
    ? UpcomingPayment.find({
        ...(scope.upcomingPayment ?? {}),
        payment_status: 'overdue',
      })
        .limit(5)
        .select('amount')
        .lean()
    : Promise.resolve([]);

  const overdueProjectsP = includeProjectAlerts
    ? Project.find({
        ...(scope.project ?? {}),
        end_date: { $lt: now },
        status: { $in: ['not_started', 'in_progress', 'on_hold'] },
      })
        .limit(5)
        .select('project_name')
        .lean()
    : Promise.resolve([]);

  const expiringSubscriptionsP = includeSubscriptionAlerts
    ? Subscription.find({
        renewal_date: { $gte: now, $lte: in7 },
        status: { $in: ['active', 'expiring_soon'] },
      })
        .limit(5)
        .select('plan_name renewal_date')
        .lean()
    : Promise.resolve([]);

  const pendingSalariesP = includeSalaryAlerts
    ? Salary.countDocuments({ status: 'pending' })
    : Promise.resolve(0);

  const largeReimbursementsP = includeReimbursementAlerts
    ? Reimbursement.find({
        status: { $in: ['submitted', 'under_review'] },
        amount: { $gte: reimbursementThreshold },
      })
        .limit(5)
        .select('expense_title amount')
        .lean()
    : Promise.resolve([]);

  const [
    overdueLeads,
    overduePayments,
    overdueProjects,
    expiringSubscriptions,
    pendingSalaries,
    largeReimbursements,
  ] = await Promise.all([
    overdueLeadsP,
    overduePaymentsP,
    overdueProjectsP,
    expiringSubscriptionsP,
    pendingSalariesP,
    largeReimbursementsP,
  ]);

  return {
    overdueLeads,
    overduePayments,
    overdueProjects,
    expiringSubscriptions,
    pendingSalaries,
    largeReimbursements,
  };
}
