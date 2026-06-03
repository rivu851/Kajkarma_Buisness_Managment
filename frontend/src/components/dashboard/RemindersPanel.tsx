import type { DashboardReminder, DashboardReminderMetrics } from '../../types/dashboard';

interface Props {
  reminders: DashboardReminder[];
  metrics?: DashboardReminderMetrics | null;
  onOpenCenter?: () => void;
}

export function RemindersPanel({ reminders, metrics, onOpenCenter }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Recent reminders</h3>
        {onOpenCenter && (
          <button type="button" onClick={onOpenCenter} className="text-xs font-medium text-blue-600 hover:underline">
            View all
          </button>
        )}
      </div>
      {metrics && (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-50 px-4 py-2 text-xs text-slate-600">
          <span>{metrics.unreadCount} unread</span>
          <span>{metrics.overdueCount} overdue</span>
          <span>{metrics.upcomingCount} upcoming</span>
          <span>{metrics.criticalCount} critical</span>
        </div>
      )}
      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {reminders.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No upcoming reminders.</li>
        ) : (
          reminders.map((r, i) => (
            <li key={`${r.reminderId ?? r.recordId}-${i}`} className="px-4 py-3">
              <p className={`text-sm font-medium ${r.isRead === false ? 'text-slate-900' : 'text-slate-600'}`}>
                {r.title}
                {r.priority === 'critical' && (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">critical</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(r.dueDate).toLocaleString()} · {r.module}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
