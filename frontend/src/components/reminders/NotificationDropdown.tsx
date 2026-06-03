import type { Reminder, ReminderStats } from '../../types/reminder';

interface Props {
  stats: ReminderStats | null;
  items: Reminder[];
  onOpenCenter: () => void;
  onSelect: (r: Reminder) => void;
  onMarkRead: (id: string) => void;
}

export function NotificationDropdown({ stats, items, onOpenCenter, onSelect, onMarkRead }: Props) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg md:w-96">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-900">Notifications</p>
        {stats && (
          <p className="text-xs text-slate-500">
            {stats.unreadCount} unread · {stats.dueTodayCount} today · {stats.overdueCount} overdue
          </p>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up</li>
        ) : (
          items.slice(0, 8).map((r) => (
            <li key={r._id} className="border-b border-slate-50 last:border-0">
              <button
                type="button"
                className="flex w-full gap-2 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => onSelect(r)}
              >
                {!r.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                <span className={!r.is_read ? 'flex-1' : 'flex-1 pl-4'}>
                  <span className="block text-sm font-medium text-slate-800">{r.title}</span>
                  <span className="text-xs text-slate-500">{new Date(r.reminder_date).toLocaleDateString()}</span>
                </span>
              </button>
              {!r.is_read && (
                <button
                  type="button"
                  className="px-4 pb-2 text-xs text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(r._id);
                  }}
                >
                  Mark read
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        onClick={onOpenCenter}
        className="w-full rounded-b-xl border-t border-slate-100 py-3 text-center text-sm font-medium text-blue-600 hover:bg-slate-50"
      >
        Open reminder center
      </button>
    </div>
  );
}
