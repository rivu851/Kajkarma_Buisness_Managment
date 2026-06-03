import type { EmployeeProductivityRow } from '../../types/dashboard';

interface Props {
  rows: EmployeeProductivityRow[];
}

export function EmployeeProductivityTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        No work log data yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Employee productivity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Done</th>
              <th className="px-4 py-2">In progress</th>
              <th className="px-4 py-2">Blocked</th>
              <th className="px-4 py-2">Hrs today</th>
              <th className="px-4 py-2">Hrs week</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employeeId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{r.employeeName}</td>
                <td className="px-4 py-2">{r.tasksCompleted}</td>
                <td className="px-4 py-2">{r.tasksInProgress}</td>
                <td className="px-4 py-2">{r.blockedTasks}</td>
                <td className="px-4 py-2">{r.hoursLoggedToday}</td>
                <td className="px-4 py-2">{r.hoursLoggedThisWeek}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
