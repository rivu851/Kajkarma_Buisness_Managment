export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DashboardAlert {
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  module: string;
  recordId: string;
}

export interface DashboardReminder {
  type: string;
  title: string;
  dueDate: string;
  module: string;
  recordId: string;
  assignedUserId?: string;
  reminderId?: string;
  priority?: string;
  isRead?: boolean;
}

export interface LeadMetrics {
  totalLeads: number;
  activeLeads: number;
  leadStageBreakdown: Record<string, number>;
  leadStatusBreakdown: Record<string, number>;
  conversionRate: number;
  todayFollowups: number;
  overdueFollowups: number;
}

export interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  onHoldClients: number;
  churnedClients: number;
  prospectClients: number;
  newClientsThisMonth: number;
}

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  projectCategoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  projectsEndingWithin7Days: number;
  overdueProjects: number;
}

export interface RevenueMonthTrend {
  month: string;
  expected: number;
  received: number;
  pending: number;
}

export interface RevenueMetrics {
  currentMonthExpectedRevenue: number;
  currentMonthReceivedRevenue: number;
  currentMonthPendingRevenue: number;
  allTimeExpectedRevenue: number;
  allTimeReceivedRevenue: number;
  allTimePendingRevenue: number;
  monthlyRevenueTrend: RevenueMonthTrend[];
}

export interface PaymentMetrics {
  paymentsDue7Days: number;
  paymentsDue30Days: number;
  totalPendingPayments: number;
  totalOverduePayments: number;
  overdueAmount: number;
  confirmedUpcomingPayments: number;
  expectedUpcomingPayments: number;
}

export interface SalaryMetrics {
  pendingSalaryCount: number;
  pendingSalaryAmount: number;
  partiallyPaidCount: number;
  paidCount: number;
  currentMonthSalaryExpense: number;
}

export interface ReimbursementMetrics {
  pendingApprovalCount: number;
  approvedAwaitingPaymentCount: number;
  paidReimbursementsCount: number;
  pendingAmount: number;
}

export interface CommunicationMetrics {
  todayCommunications: number;
  weeklyCommunications: number;
  monthlyCommunications: number;
  communicationTypeBreakdown: Record<string, number>;
  topActiveEmployees: Array<{
    userId: string;
    name: string;
    count: number;
  }>;
}

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  expiringWithin7Days: number;
  expiringWithin30Days: number;
  expiredSubscriptions: number;
  monthlySubscriptionCost: number;
}

export interface EmployeeProductivityRow {
  employeeId: string;
  employeeName: string;
  tasksCompleted: number;
  tasksInProgress: number;
  blockedTasks: number;
  hoursLoggedToday: number;
  hoursLoggedThisWeek: number;
}

export interface TeamDashboardSummary {
  assignedProjects: Array<{
    id: string;
    projectName: string;
    status: string;
    endDate?: string;
    clientName?: string;
  }>;
  workSummary: {
    hoursLoggedToday: number;
    hoursLoggedThisWeek: number;
    tasksCompleted: number;
    tasksInProgress: number;
    blockedTasks: number;
  };
  pendingTasks: Array<{
    type: string;
    title: string;
    dueDate?: string;
    recordId: string;
  }>;
}

export interface DashboardReminderMetrics {
  unreadCount: number;
  upcomingCount: number;
  overdueCount: number;
  criticalCount: number;
  byType: Record<string, number>;
}

export interface DashboardOverview {
  view: 'full' | 'team';
  generatedAt: string;
  reminderMetrics: DashboardReminderMetrics | null;
  leadMetrics: LeadMetrics | null;
  clientMetrics: ClientMetrics | null;
  projectMetrics: ProjectMetrics | null;
  revenueMetrics: RevenueMetrics | null;
  paymentMetrics: PaymentMetrics | null;
  salaryMetrics: SalaryMetrics | null;
  reimbursementMetrics: ReimbursementMetrics | null;
  communicationMetrics: CommunicationMetrics | null;
  subscriptionMetrics: SubscriptionMetrics | null;
  employeeProductivity: EmployeeProductivityRow[] | null;
  teamSummary: TeamDashboardSummary | null;
  recentReminders: DashboardReminder[];
  alerts: DashboardAlert[];
}
