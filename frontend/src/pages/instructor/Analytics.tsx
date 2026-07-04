import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, DollarSign, TrendingUp, Activity, Clock,
  Target, UserCheck, UserX, Eye, BarChart3, RefreshCw,
  AlertCircle, GraduationCap, PlayCircle, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';

import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useInstructorStore } from '@/store/instructorStore';
import SEO from '@/components/seo/SEO';
import { StatsSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';

const enrollmentTrendData = [
  { month: '2025-01', students: 180 }, { month: '2025-02', students: 220 },
  { month: '2025-03', students: 310 }, { month: '2025-04', students: 290 },
  { month: '2025-05', students: 380 }, { month: '2025-06', students: 420 },
];

const completionByCourseData = [
  { course: 'React Fundamentals', rate: 82 }, { course: 'Node.js Mastery', rate: 68 },
  { course: 'TypeScript Deep Dive', rate: 74 }, { course: 'Full Stack Project', rate: 59 },
  { course: 'CSS & Design Systems', rate: 91 }, { course: 'Python for Data', rate: 63 },
];

const watchTimeTrendData = [
  { month: '2025-01', hours: 420 }, { month: '2025-02', hours: 510 },
  { month: '2025-03', hours: 680 }, { month: '2025-04', hours: 590 },
  { month: '2025-05', hours: 720 }, { month: '2025-06', hours: 850 },
];

const mostViewedLessonsData = [
  { lesson: 'Introduction to React Hooks', views: 1240 },
  { lesson: 'State Management with Redux', views: 980 },
  { lesson: 'REST API Design Patterns', views: 870 },
  { lesson: 'Authentication & Authorization', views: 760 },
  { lesson: 'Database Modeling', views: 690 },
];

const leastViewedLessonsData = [
  { lesson: 'Advanced Webpack Config', views: 120 },
  { lesson: 'Docker Compose Networks', views: 145 },
  { lesson: 'GraphQL Subscriptions', views: 180 },
  { lesson: 'CI/CD Pipeline Setup', views: 210 },
  { lesson: 'Performance Profiling', views: 260 },
];

const monthlyRevenueData = [
  { month: '2025-01', revenue: 12400 }, { month: '2025-02', revenue: 16200 },
  { month: '2025-03', revenue: 19800 }, { month: '2025-04', revenue: 17500 },
  { month: '2025-05', revenue: 22400 }, { month: '2025-06', revenue: 25600 },
];

const revenueByCourseData = [
  { course: 'React Fundamentals', revenue: 12450 },
  { course: 'Node.js Mastery', revenue: 9820 },
  { course: 'TypeScript Deep Dive', revenue: 8750 },
  { course: 'Full Stack Project', revenue: 7210 },
  { course: 'CSS & Design Systems', revenue: 6540 },
  { course: 'Python for Data', revenue: 5230 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl border border-gray-200/60 dark:border-gray-800/50">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const tabs = [
  { key: 'students', label: 'Student Analytics', icon: Users },
  { key: 'courses', label: 'Course Analytics', icon: BookOpen },
  { key: 'revenue', label: 'Revenue Analytics', icon: DollarSign },
];

export default function InstructorAnalytics() {
  const { analytics, fetchAnalytics, isLoading, error } = useInstructorStore();
  const [activeTab, setActiveTab] = useState('students');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (error) setHasError(true);
    else setHasError(false);
  }, [error]);

  const handleRetry = () => {
    setHasError(false);
    fetchAnalytics();
  };

  if (isLoading && !analytics) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading analytics">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <StatsSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!isLoading && hasError && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load analytics</h2>
          <p className="text-gray-500 mb-4">{error || 'Something went wrong loading analytics data.'}</p>
          <Button onClick={handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <SEO title="Analytics Center" />

      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics Center</h1>
            <p className="text-gray-500 mt-1">Comprehensive insights into your courses, students, and revenue.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </motion.div>

      {hasError && (
        <motion.div variants={item} className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error || 'Failed to load analytics data.'}</p>
          <Button size="sm" onClick={handleRetry}>Retry</Button>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} variant="underline" />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Tab 1: Student Analytics */}
        <TabPanel activeKey={activeTab} tabKey="students">
          <motion.div variants={item}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">1,247</div>
                <div className="text-sm text-gray-500">Total Enrollments</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">892</div>
                <div className="text-sm text-gray-500">Active Learners</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">68%</div>
                <div className="text-sm text-gray-500">Completion Rate</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-red-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">32%</div>
                <div className="text-sm text-gray-500">Drop-off Rate</div>
              </GlassCard>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Enrollment Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Enrollment Trend (Last 6 Months)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enrollmentTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                        tick={{ fontSize: 12 }}
                        className="text-gray-500"
                      />
                      <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="students" name="Enrollments" stroke="#8B5CF6" fill="url(#enrollmentGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Completion Rate by Course */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Completion Rate by Course
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionByCourseData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} className="text-gray-500" tickFormatter={(val) => `${val}%`} />
                      <YAxis type="category" dataKey="course" tick={{ fontSize: 11 }} className="text-gray-500" width={140} />
                      <Tooltip content={<CustomTooltip />} formatter={(value: number) => [`${value}%`, 'Completion']} />
                      <Bar dataKey="rate" name="Completion" radius={[0, 6, 6, 0]} fill="#6366F1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </TabPanel>

        {/* Tab 2: Course Analytics */}
        <TabPanel activeKey={activeTab} tabKey="courses">
          <motion.div variants={item}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">3,420</div>
                <div className="text-sm text-gray-500">Total Watch Time (hours)</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">78%</div>
                <div className="text-sm text-gray-500">Avg Lesson Engagement</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <PlayCircle className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">156</div>
                <div className="text-sm text-gray-500">Total Lessons</div>
              </GlassCard>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Watch Time Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Watch Time Trend (Last 6 Months)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={watchTimeTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                        tick={{ fontSize: 12 }}
                        className="text-gray-500"
                      />
                      <YAxis tick={{ fontSize: 12 }} className="text-gray-500" tickFormatter={(val) => `${val}h`} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="watchTimeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="hours" name="Watch Time" stroke="#3B82F6" fill="url(#watchTimeGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Most Viewed Lessons */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-500" />
                  Most Viewed Lessons (Top 5)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostViewedLessonsData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis type="number" tick={{ fontSize: 12 }} className="text-gray-500" />
                      <YAxis type="category" dataKey="lesson" tick={{ fontSize: 11 }} className="text-gray-500" width={150} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="views" name="Views" radius={[0, 6, 6, 0]} fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Least Viewed Lessons */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Least Viewed Lessons (Bottom 5)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leastViewedLessonsData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="text-gray-500" />
                    <YAxis type="category" dataKey="lesson" tick={{ fontSize: 11 }} className="text-gray-500" width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="views" name="Views" radius={[0, 6, 6, 0]} fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </TabPanel>

        {/* Tab 3: Revenue Analytics */}
        <TabPanel activeKey={activeTab} tabKey="revenue">
          <motion.div variants={item}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">$24,560</div>
                <div className="text-sm text-gray-500">Monthly Revenue</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">$197</div>
                <div className="text-sm text-gray-500">Revenue per Student</div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold">$49.99</div>
                <div className="text-sm text-gray-500">Avg Course Price</div>
              </GlassCard>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Revenue Chart */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Monthly Revenue (Last 6 Months)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                        tick={{ fontSize: 12 }}
                        className="text-gray-500"
                      />
                      <YAxis tick={{ fontSize: 12 }} className="text-gray-500" tickFormatter={(val) => `$${val.toLocaleString()}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revenueGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Revenue by Course */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Revenue by Course
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByCourseData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis type="number" tick={{ fontSize: 12 }} className="text-gray-500" tickFormatter={(val) => `$${val.toLocaleString()}`} />
                      <YAxis type="category" dataKey="course" tick={{ fontSize: 11 }} className="text-gray-500" width={140} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </TabPanel>
      </motion.div>
    </motion.div>
  );
}
