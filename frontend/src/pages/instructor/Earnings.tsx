import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Clock, Wallet, TrendingUp, Calendar,
  Download, RefreshCw, AlertCircle, Filter
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useInstructorStore } from '@/store/instructorStore';
import SEO from '@/components/seo/SEO';
import { cn } from '@/lib/utils';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const statusBadge: Record<string, 'warning' | 'success' | 'danger' | 'primary'> = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  processing: 'primary',
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sampleMonthlyRevenue = months.map((m, i) => ({
  month: m,
  revenue: Math.floor(Math.random() * 8000) + 2000,
  expenses: Math.floor(Math.random() * 2000) + 500,
}));

const sampleCourseRevenue = [
  { course: 'React Masterclass', revenue: 12400, students: 340 },
  { course: 'Node.js API Design', revenue: 9800, students: 210 },
  { course: 'TypeScript Deep Dive', revenue: 7200, students: 180 },
  { course: 'CSS Animations', revenue: 5400, students: 140 },
  { course: 'Python for Data Science', revenue: 4100, students: 95 },
];

const sampleProgramRevenue = [
  { program: 'Web Development', revenue: 28500 },
  { program: 'Data Science', revenue: 15200 },
  { program: 'Mobile Development', revenue: 12300 },
  { program: 'DevOps', revenue: 8700 },
  { program: 'AI & ML', revenue: 6400 },
];

const sampleYearlyRevenue = [
  { year: '2022', revenue: 32000 },
  { year: '2023', revenue: 54000 },
  { year: '2024', revenue: 78000 },
  { year: '2025', revenue: 92000 },
  { year: '2026', revenue: 42000 },
];

const sampleWithdrawals = [
  { id: '1', date: '2026-06-15', amount: 2500, status: 'completed', method: 'Bank Transfer' },
  { id: '2', date: '2026-05-01', amount: 1800, status: 'completed', method: 'PayPal' },
  { id: '3', date: '2026-03-20', amount: 3200, status: 'completed', method: 'Bank Transfer' },
  { id: '4', date: '2026-02-10', amount: 1500, status: 'processing', method: 'Mobile Money' },
  { id: '5', date: '2026-01-05', amount: 2000, status: 'completed', method: 'Bank Transfer' },
];

export default function Earnings() {
  const { fetchEarnings, fetchWithdrawalHistory } = useInstructorStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [earnings, setEarnings] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [earningsData, withdrawalData] = await Promise.all([
        fetchEarnings(),
        fetchWithdrawalHistory(),
      ]);
      setEarnings(earningsData);
      setWithdrawals(withdrawalData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load earnings data');
    } finally {
      setIsLoading(false);
    }
  };

  const summaryStats = [
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `$${(earnings?.totalRevenue ?? 48650).toLocaleString()}`,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      icon: TrendingUp,
      label: 'This Month',
      value: `$${(earnings?.thisMonth ?? 4200).toLocaleString()}`,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Clock,
      label: 'Pending Payouts',
      value: `$${(earnings?.pendingPayouts ?? 3200).toLocaleString()}`,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Wallet,
      label: 'Total Withdrawn',
      value: `$${(earnings?.totalWithdrawn ?? 21500).toLocaleString()}`,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  const monthlyRevenueData = earnings?.monthlyRevenue?.length
    ? earnings.monthlyRevenue
    : sampleMonthlyRevenue;

  const courseRevenueData = earnings?.courseRevenue?.length
    ? earnings.courseRevenue
    : sampleCourseRevenue;

  const programRevenueData = earnings?.programRevenue?.length
    ? earnings.programRevenue
    : sampleProgramRevenue;

  const yearlyRevenueData = earnings?.yearlyRevenue?.length
    ? earnings.yearlyRevenue
    : sampleYearlyRevenue;

  const withdrawalData = earnings?.withdrawals?.length
    ? earnings.withdrawals
    : withdrawals.length
      ? withdrawals
      : sampleWithdrawals;

  const currentBalance = earnings?.availableBalance ?? 12350;
  const minPayoutThreshold = earnings?.minPayoutThreshold ?? 50;

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SEO title="Earnings" />
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SEO title="Earnings" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to load earnings</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <SEO title="Earnings" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Earnings</h1>
          <p className="text-gray-500">Track your revenue, payouts, and withdrawal history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="primary" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <GlassCard key={stat.label} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Revenue Trend</h2>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
              Monthly
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                viewMode === 'annual'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Filter className="w-3.5 h-3.5 inline mr-1.5" />
              Annual
            </button>
          </div>
        </div>
        <div className="h-80 w-full">
          {(viewMode === 'monthly' ? monthlyRevenueData : yearlyRevenueData).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={viewMode === 'monthly' ? monthlyRevenueData : yearlyRevenueData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey={viewMode === 'monthly' ? 'month' : 'year'}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No revenue data available.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Revenue by Course Chart */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold mb-6">Revenue by Course</h2>
        <div className="h-72 w-full">
          {courseRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseRevenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="course"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    name === 'revenue' ? 'Revenue' : 'Students',
                  ]}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No course revenue data available.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Revenue by Program + Withdrawal History */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Program/Year */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold mb-6">
            Revenue by {viewMode === 'monthly' ? 'Program' : 'Year'}
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={viewMode === 'monthly' ? programRevenueData : yearlyRevenueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="revenue"
                  nameKey={viewMode === 'monthly' ? 'program' : 'year'}
                >
                  {(viewMode === 'monthly' ? programRevenueData : yearlyRevenueData).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Legend
                  formatter={(value: any) => (
                    <span className="text-xs text-gray-500">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Withdrawal History */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold mb-6">Withdrawal History</h2>
          {withdrawalData.length > 0 ? (
            <div className="space-y-3">
              {withdrawalData.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <div>
                    <div className="font-medium">${Number(w.amount).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {w.method || 'Bank Transfer'} — {new Date(w.date || w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={statusBadge[w.status] || 'default'} size="sm">
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <DollarSign className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium text-gray-500">No withdrawal history yet</p>
              <p className="text-sm mt-1">Your withdrawals will appear here.</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Payouts Section */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold mb-6">Payouts</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Current Balance</div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              ${currentBalance.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30">
            <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Minimum Payout</div>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              ${minPayoutThreshold.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Button
              variant="primary"
              size="lg"
              disabled={currentBalance < minPayoutThreshold}
              className="w-full"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Request Payout
            </Button>
          </div>
        </div>
        {currentBalance < minPayoutThreshold && (
          <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Your balance must reach ${minPayoutThreshold.toLocaleString()} before you can request a payout.
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}
