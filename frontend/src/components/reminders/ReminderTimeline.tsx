import type { Reminder } from '../../types/reminder';

const priorityColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-800',
  critical: 'bg-rose-50 text-rose-800',
};

interface Props {
  items: Reminder[];
  selectedId?: string;
  onSelect: (r: Reminder) => void;
  loading?: boolean;
}

export function ReminderTimeline({ items, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No reminders match your filters.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r._id}>
          <button
            type="button"
            onClick={() => onSelect(r)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              selectedId === r._id
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${!r.is_read ? 'shadow-sm' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-sm font-medium ${!r.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                  {r.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.type.replace(/_/g, ' ')} · {new Date(r.reminder_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[r.priority]}`}>
                {r.priority}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
