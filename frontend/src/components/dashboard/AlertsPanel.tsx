import type { DashboardAlert } from '../../types/dashboard';

const severityStyles: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-800 border-rose-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

interface Props {
  alerts: DashboardAlert[];
}

export function AlertsPanel({ alerts }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Recent alerts</h3>
      </div>
      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {alerts.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No alerts right now.</li>
        ) : (
          alerts.map((a, i) => (
            <li key={`${a.type}-${i}`} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase border ${severityStyles[a.severity]}`}
                >
                  {a.severity}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.description}</p>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
