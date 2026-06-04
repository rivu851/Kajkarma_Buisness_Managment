import { useCallback, useEffect, useState } from 'react';
import { apiRequest, getAccessToken, login } from './api/client';
import type { DashboardOverview } from './types/dashboard';
import { StatCard } from './components/dashboard/StatCard';
import { DashboardSkeleton } from './components/dashboard/Skeleton';
import { LeadFunnelChart } from './components/dashboard/LeadFunnelChart';
import { RevenueTrendChart } from './components/dashboard/RevenueTrendChart';
import { ProjectStatusChart } from './components/dashboard/ProjectStatusChart';
import { EmployeeProductivityTable } from './components/dashboard/EmployeeProductivityTable';
import { AlertsPanel } from './components/dashboard/AlertsPanel';
import { RemindersPanel } from './components/dashboard/RemindersPanel';
import { NotificationBell } from './components/reminders/NotificationBell';
import { ReminderToasts } from './components/dashboard/ReminderToasts';
import { ReminderCenterPage } from './pages/ReminderCenterPage';
import type { Reminder } from './types/reminder';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('admin@kajkarma.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
      >
        <h1 className="text-xl font-bold text-slate-900">Kajkarma Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to view business overview</p>
        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <label className="mt-6 block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function DashboardPage({
  data,
  onOpenReminders,
  onSelectReminder,
}: {
  data: DashboardOverview;
  onOpenReminders: () => void;
  onSelectReminder: (r: Reminder) => void;
}) {
  const isTeam = data.view === 'team';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Business Dashboard</h1>
            <p className="text-xs text-slate-500">
              {isTeam ? 'Team view' : 'Management overview'} · Updated{' '}
              {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenReminders}
              className="hidden text-sm font-medium text-blue-600 hover:underline sm:block"
            >
              Reminder center
            </button>
            <NotificationBell onOpenCenter={onOpenReminders} onSelectReminder={onSelectReminder} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.leadMetrics && (
            <StatCard label="Total leads" value={data.leadMetrics.totalLeads} accent="blue" />
          )}
          {data.clientMetrics && (
            <StatCard label="Active clients" value={data.clientMetrics.activeClients} accent="green" />
          )}
          {data.projectMetrics && (
            <StatCard label="Active projects" value={data.projectMetrics.activeProjects} accent="amber" />
          )}
          {data.revenueMetrics && (
            <StatCard
              label="Revenue received (month)"
              value={formatCurrency(data.revenueMetrics.currentMonthReceivedRevenue)}
              accent="green"
            />
          )}
          {isTeam && data.teamSummary && (
            <>
              <StatCard label="My projects" value={data.teamSummary.assignedProjects.length} accent="blue" />
              <StatCard
                label="Hours this week"
                value={data.teamSummary.workSummary.hoursLoggedThisWeek}
                accent="amber"
              />
            </>
          )}
        </div>

        {isTeam && data.teamSummary && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">Assigned projects</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {data.teamSummary.assignedProjects.map((p) => (
                  <li key={p.id} className="flex justify-between border-b border-slate-50 pb-2">
                    <span>{p.projectName}</span>
                    <span className="text-slate-500">{p.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">Pending tasks</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {data.teamSummary.pendingTasks.map((t) => (
                  <li key={t.recordId}>{t.title}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Charts row */}
        <section className="grid gap-4 lg:grid-cols-3">
          {data.leadMetrics && (
            <div className="lg:col-span-1">
              <LeadFunnelChart data={data.leadMetrics.leadStageBreakdown} />
            </div>
          )}
          {data.revenueMetrics && (
            <div className="lg:col-span-2">
              <RevenueTrendChart trend={data.revenueMetrics.monthlyRevenueTrend} />
            </div>
          )}
          {data.projectMetrics && !data.revenueMetrics && (
            <div className="lg:col-span-2">
              <ProjectStatusChart
                active={data.projectMetrics.activeProjects}
                completed={data.projectMetrics.completedProjects}
                onHold={data.projectMetrics.onHoldProjects}
                cancelled={data.projectMetrics.cancelledProjects}
              />
            </div>
          )}
        </section>

        {data.projectMetrics && data.revenueMetrics && (
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ProjectStatusChart
                active={data.projectMetrics.activeProjects}
                completed={data.projectMetrics.completedProjects}
                onHold={data.projectMetrics.onHoldProjects}
                cancelled={data.projectMetrics.cancelledProjects}
              />
            </div>
          </section>
        )}

        {/* Finance row */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {data.paymentMetrics && (
            <StatCard
              label="Payments due (7d)"
              value={data.paymentMetrics.paymentsDue7Days}
              sub={`Overdue: ${data.paymentMetrics.totalOverduePayments}`}
            />
          )}
          {data.salaryMetrics && (
            <StatCard
              label="Pending salaries"
              value={data.salaryMetrics.pendingSalaryCount}
              sub={formatCurrency(data.salaryMetrics.pendingSalaryAmount)}
              accent="rose"
            />
          )}
          {data.reimbursementMetrics && (
            <StatCard
              label="Reimbursements pending"
              value={data.reimbursementMetrics.pendingApprovalCount}
              sub={formatCurrency(data.reimbursementMetrics.pendingAmount)}
            />
          )}
          {data.subscriptionMetrics && (
            <StatCard
              label="Subscriptions expiring (7d)"
              value={data.subscriptionMetrics.expiringWithin7Days}
              sub={formatCurrency(data.subscriptionMetrics.monthlySubscriptionCost) + '/mo'}
            />
          )}
        </section>

        {/* Productivity + alerts */}
        <section className="grid gap-4 lg:grid-cols-3">
          {data.employeeProductivity && (
            <div className="lg:col-span-2">
              <EmployeeProductivityTable rows={data.employeeProductivity} />
            </div>
          )}
          <div className="space-y-4">
            <AlertsPanel alerts={data.alerts} />
            <RemindersPanel
              reminders={data.recentReminders}
              metrics={data.reminderMetrics}
              onOpenCenter={onOpenReminders}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

type AppView = 'dashboard' | 'reminders';

export default function App() {
  const [authed, setAuthed] = useState(!!getAccessToken());
  const [view, setView] = useState<AppView>('dashboard');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await apiRequest<DashboardOverview>('/dashboard/overview');
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      if (String(err).includes('401') || String(err).includes('Unauthorized')) {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadDashboard();
  }, [authed, loadDashboard]);

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-rose-600">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (view === 'reminders') {
    return (
      <ReminderCenterPage
        onBack={() => setView('dashboard')}
        initialSelected={selectedReminder}
      />
    );
  }

  return (
    <>
      <ReminderToasts
        enabled
        onOpenReminderCenter={() => setView('reminders')}
        onSelectReminder={(r) => {
          setSelectedReminder(r);
          setView('reminders');
        }}
      />
      <DashboardPage
        data={data}
        onOpenReminders={() => setView('reminders')}
        onSelectReminder={(r) => {
          setSelectedReminder(r);
          setView('reminders');
        }}
      />
    </>
  );
}
