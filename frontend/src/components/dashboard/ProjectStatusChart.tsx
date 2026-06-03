import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  active: number;
  completed: number;
  onHold: number;
  cancelled: number;
  notStarted?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

export function ProjectStatusChart({ active, completed, onHold, cancelled, notStarted = 0 }: Props) {
  const data = [
    { name: 'Active', value: active },
    { name: 'Completed', value: completed },
    { name: 'On hold', value: onHold },
    { name: 'Cancelled', value: cancelled },
    { name: 'Not started', value: notStarted },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-64 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Project status</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
