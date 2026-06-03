import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RevenueMetrics } from '../../types/dashboard';

interface Props {
  trend: RevenueMetrics['monthlyRevenueTrend'];
}

export function RevenueTrendChart({ trend }: Props) {
  return (
    <div className="h-64 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Revenue trend (12 months)</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="expected" stroke="#94a3b8" name="Expected" />
          <Line type="monotone" dataKey="received" stroke="#10b981" name="Received" strokeWidth={2} />
          <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
