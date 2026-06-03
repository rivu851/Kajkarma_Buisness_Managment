import { useCallback, useEffect, useState } from 'react';
import {
  fetchMyReminders,
  fetchReminderStats,
  patchReminderAction,
  fetchReminderById,
} from '../api/reminders';
import type { Reminder, ReminderStats } from '../types/reminder';
import { ReminderFilters, type ReminderFilterState } from '../components/reminders/ReminderFilters';
import { ReminderTimeline } from '../components/reminders/ReminderTimeline';
import { ReminderDetailDrawer } from '../components/reminders/ReminderDetailDrawer';

type Tab = 'today' | 'upcoming' | 'overdue' | 'done' | 'snoozed';

interface Props {
  onBack: () => void;
  initialSelected?: Reminder | null;
}

export function ReminderCenterPage({ onBack, initialSelected }: Props) {
  const [tab, setTab] = useState<Tab>('today');
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reminder | null>(initialSelected ?? null);
  const [filters, setFilters] = useState<ReminderFilterState>({
    search: '',
    status: '',
    priority: '',
    type: '',
    sort: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<Tab, string | undefined> = {
        today: 'pending',
        upcoming: 'pending',
        overdue: 'pending',
        done: 'done',
        snoozed: 'snoozed',
      };
      const [s, list] = await Promise.all([
        fetchReminderStats(),
        fetchMyReminders({
          limit: 50,
          status: filters.status || statusMap[tab] || 'pending',
          ...(filters.priority ? { priority: filters.priority } : {}),
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.sort ? { sort: filters.sort } : {}),
        }),
      ]);
      setStats(s);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      let filtered = list.data;
      if (tab === 'today') {
        filtered = filtered.filter((r) => {
          const d = new Date(r.reminder_date);
          return d >= today && d <= end;
        });
      } else if (tab === 'overdue') {
        filtered = filtered.filter((r) => new Date(r.reminder_date) < today && r.status !== 'done');
      } else if (tab === 'upcoming') {
        filtered = filtered.filter((r) => new Date(r.reminder_date) > end);
      }

      setItems(filtered);
    } finally {
      setLoading(false);
    }
  }, [tab, filters]);

  const openDetail = async (r: Reminder) => {
    try {
      const full = await fetchReminderById(r._id);
      setSelected(full);
      if (!full.is_read) {
        await patchReminderAction(r._id, 'read');
        void load();
      }
    } catch {
      setSelected(r);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialSelected?._id) {
      void openDetail(initialSelected);
    }
  }, [initialSelected]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'today', label: 'Today', count: stats?.dueTodayCount },
    { id: 'overdue', label: 'Overdue', count: stats?.overdueCount },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'snoozed', label: 'Snoozed' },
    { id: 'done', label: 'Done', count: stats?.completedCount },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <button type="button" onClick={onBack} className="text-sm text-blue-600 hover:underline">
              ← Back to dashboard
            </button>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Reminder Center</h1>
          </div>
          {stats && (
            <div className="text-right text-xs text-slate-500">
              <p>{stats.pendingCount} pending</p>
              <p>{stats.criticalCount} critical</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <ReminderFilters filters={filters} onChange={setFilters} />

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {t.label}
              {t.count !== undefined ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ReminderTimeline
              items={items}
              selectedId={selected?._id}
              onSelect={(r) => void openDetail(r)}
              loading={loading}
            />
          </section>
          <section className="hidden rounded-xl border border-slate-200 bg-slate-50 p-4 lg:block">
            {selected ? (
              <div className="text-sm">
                <h3 className="font-semibold text-slate-900">{selected.title}</h3>
                <p className="mt-2 text-slate-600">{selected.description}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a reminder to preview</p>
            )}
          </section>
        </div>
      </main>

      <ReminderDetailDrawer
        reminder={selected}
        onClose={() => setSelected(null)}
        onRead={async (id) => {
          await patchReminderAction(id, 'read');
          void load();
        }}
        onDone={async (id) => {
          await patchReminderAction(id, 'done');
          setSelected(null);
          void load();
        }}
        onSnooze={async (id, until) => {
          await patchReminderAction(id, 'snooze', { snoozed_until: until.toISOString() });
          setSelected(null);
          void load();
        }}
      />
    </div>
  );
}
