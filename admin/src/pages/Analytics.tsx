import { useState, useEffect } from 'react';
import { Download, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import api from '../services/api';

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await api.getFunnelMetrics();
        // Transform API data to chart format if needed
        // Assuming API returns { step: string, count: number, rate: number }[]
        setFunnelData(data || []);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [dateRange]);

  // Mock trend data for now until we have a trend endpoint
  const weeklyTrend = [
    { week: 'Week 1', completions: 198, rate: 68 },
    { week: 'Week 2', completions: 215, rate: 70 },
    { week: 'Week 3', completions: 234, rate: 72 },
    { week: 'Week 4', completions: 245, rate: 74 },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Detailed insights into enrollment behavior</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Enrollment Funnel */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h3 className="font-semibold text-gray-900 mb-6">Enrollment Funnel</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData} layout="vertical">
            <XAxis type="number" axisLine={false} tickLine={false} />
            <YAxis dataKey="step" type="category" axisLine={false} tickLine={false} width={120} />
            <Tooltip
              formatter={(value, name) => [
                name === 'count' ? value.toLocaleString() : `${value}%`,
                name === 'count' ? 'Sessions' : 'Rate'
              ]}
            />
            <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Drop-off Analysis */}
        <div className="mt-6 grid grid-cols-5 gap-4">
          {funnelData.slice(1).map((step, index) => {
            const previousStep = funnelData[index];
            const dropOff = previousStep.count - step.count;
            const dropOffRate = previousStep.count > 0
              ? ((dropOff / previousStep.count) * 100).toFixed(1)
              : '0.0';

            return (
              <div key={step.step} className="p-3 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Drop-off to {step.step}</div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-gray-900">{dropOffRate}%</span>
                </div>
                <div className="text-xs text-gray-400">{dropOff} sessions</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">Weekly Completions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyTrend}>
              <XAxis dataKey="week" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="completions"
                stroke="#14b8a6"
                fill="#ccfbf1"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">Completion Rate Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyTrend}>
              <XAxis dataKey="week" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} domain={[60, 80]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
