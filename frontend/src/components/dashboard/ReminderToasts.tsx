import { useCallback, useEffect, useState } from 'react';
import { fetchMyReminders } from '../../api/reminders';
import type { Reminder, ReminderPriority } from '../../types/reminder';

const STORAGE_KEY = 'shownReminderIds';

const PRIORITY_ORDER: Record<ReminderPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLE: Record<ReminderPriority, { dot: string; label: string }> = {
  critical: { dot: '🔴', label: 'text-rose-700' },
  high: { dot: '🟠', label: 'text-orange-700' },
  medium: { dot: '🟡', label: 'text-amber-700' },
  low: { dot: '🔵', label: 'text-blue-700' },
};

function loadShownIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveShownIds(ids: Set<string>): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function formatDueLabel(reminderDate: string): string {
  const due = new Date(reminderDate);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  if (due < todayStart) return 'Overdue';
  if (due <= todayEnd) return 'Due Today';
  if (due <= tomorrowEnd) return 'Due Tomorrow';
  return `Due ${due.toLocaleDateString()}`;
}

interface Props {
  enabled: boolean;
  onOpenReminderCenter: () => void;
  onSelectReminder: (r: Reminder) => void;
}

export function ReminderToasts({ enabled, onOpenReminderCenter, onSelectReminder }: Props) {
  const [toasts, setToasts] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const shown = loadShownIds();
      const list = await fetchMyReminders({ status: 'pending', limit: 50, sort: 'reminder_date' });
      const now = Date.now();
      const candidates = list.data
        .filter((r) => new Date(r.reminder_date).getTime() <= now)
        .filter((r) => !shown.has(r._id))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        .slice(0, 3);

      if (candidates.length === 0) return;

      const nextShown = new Set(shown);
      for (const r of candidates) nextShown.add(r._id);
      saveShownIds(nextShown);
      setToasts(candidates);
    } catch {
      /* no reminders permission or network */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((r) => {
        const style = PRIORITY_STYLE[r.priority];
        return (
          <div
            key={r._id}
            role="button"
            tabIndex={0}
            onClick={() => {
              dismiss(r._id);
              onSelectReminder(r);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                dismiss(r._id);
                onSelectReminder(r);
              }
            }}
            className="pointer-events-auto w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg transition hover:border-blue-300 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-semibold ${style.label}`}>
                {style.dot} {r.title}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(r._id);
                }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatDueLabel(r.reminder_date)}</p>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onOpenReminderCenter}
        className="pointer-events-auto self-end text-xs font-medium text-blue-600 hover:underline"
      >
        Open Reminder Center
      </button>
    </div>
  );
}
