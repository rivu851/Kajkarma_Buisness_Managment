import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMyReminders, fetchReminderStats, patchReminderAction } from '../../api/reminders';
import type { Reminder, ReminderStats } from '../../types/reminder';
import { NotificationDropdown } from './NotificationDropdown';

interface Props {
  onOpenCenter: () => void;
  onSelectReminder: (r: Reminder) => void;
}

export function NotificationBell({ onOpenCenter, onSelectReminder }: Props) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [items, setItems] = useState<Reminder[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        fetchReminderStats(),
        fetchMyReminders({ limit: 10, status: 'pending', sort: 'reminder_date' }),
      ]);
      setStats(s);
      setItems(list.data);
    } catch {
      /* permission or network */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = stats?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          stats={stats}
          items={items}
          onOpenCenter={() => {
            setOpen(false);
            onOpenCenter();
          }}
          onSelect={(r) => {
            setOpen(false);
            onSelectReminder(r);
          }}
          onMarkRead={async (id) => {
            await patchReminderAction(id, 'read');
            void refresh();
          }}
        />
      )}
    </div>
  );
}
