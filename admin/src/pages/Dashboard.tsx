import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, CheckCircle, Clock, ArrowUp, ArrowDown,
  BarChart3, PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalSessions: number;
  completedEnrollments: number;
  completionRate: number;
  avgSessionDuration: number;
  activeUsers: { date: string; count: number }[];
  planDistribution: { name: string; value: number }[];
  modeCompletion: { mode: string; rate: number }[];
}

const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444'];

import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [dateRange]);

  if (isLoading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of enrollment activity</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-100 rounded-xl">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <span className="flex items-center text-sm text-green-600">
              <ArrowUp className="w-4 h-4 mr-1" />
              12%
            </span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">{stats.totalSessions.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Sessions</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="flex items-center text-sm text-green-600">
              <ArrowUp className="w-4 h-4 mr-1" />
              8%
            </span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">{stats.completedEnrollments.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Completed Enrollments</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-secondary-600" />
            </div>
            <span className="flex items-center text-sm text-red-600">
              <ArrowDown className="w-4 h-4 mr-1" />
              3%
            </span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">{stats.completionRate}%</div>
          <div className="text-sm text-gray-500">Completion Rate</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-gray-900">{stats.avgSessionDuration} min</div>
          <div className="text-sm text-gray-500">Avg. Session Duration</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Activity Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Daily Activity</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.activeUsers}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={{ fill: '#14b8a6', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Plan Distribution</h3>
          </div>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <RechartsPie>
                <Pie
                  data={stats.planDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.planDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
            <div className="space-y-3">
              {stats.planDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Completion Rates */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-6">Completion Rate by Mode</h3>
        <div className="grid grid-cols-2 gap-6">
          {stats.modeCompletion.map((item) => (
            <div key={item.mode} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{item.mode} Mode</span>
                <span className="font-semibold text-gray-900">{item.rate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${item.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
