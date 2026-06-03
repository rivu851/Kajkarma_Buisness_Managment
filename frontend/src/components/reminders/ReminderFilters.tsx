import type { ReminderPriority, ReminderStatus } from '../../types/reminder';

export interface ReminderFilterState {
  search: string;
  status: ReminderStatus | '';
  priority: ReminderPriority | '';
  type: string;
  sort: string;
}

interface Props {
  filters: ReminderFilterState;
  onChange: (next: ReminderFilterState) => void;
}

export function ReminderFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input
        type="search"
        placeholder="Search reminders…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as ReminderFilterState['status'] })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="snoozed">Snoozed</option>
        <option value="rescheduled">Rescheduled</option>
        <option value="done">Done</option>
      </select>
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value as ReminderFilterState['priority'] })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <select
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Sort: due date</option>
        <option value="-reminder_date">Due date (latest)</option>
        <option value="-priority">Priority</option>
        <option value="-created_at">Created</option>
      </select>
    </div>
  );
}
