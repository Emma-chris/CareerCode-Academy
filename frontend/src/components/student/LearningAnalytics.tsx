import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Line,
} from 'recharts';
import { Download, TrendingUp, Clock, Lightbulb, Flame, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStudentStore } from '@/store/studentStore';
import { ChartSkeleton } from './SkeletonLoader';
import { cn } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl border border-white/20 dark:border-gray-800/50">
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {entry.value}{entry.name === 'Hours' ? 'h' : entry.name === 'Projected' ? 'h' : '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const courseColors = ['#6366f1', '#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EF4444'];
const categoryColors = ['#6366f1', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#06B6D4'];

const heatmapData = [
  { week: 'W1', Mon: 2, Tue: 1, Wed: 3, Thu: 0, Fri: 2, Sat: 4, Sun: 1 },
  { week: 'W2', Mon: 1, Tue: 2, Wed: 1, Thu: 3, Fri: 1, Sat: 2, Sun: 0 },
  { week: 'W3', Mon: 3, Tue: 0, Wed: 2, Thu: 2, Fri: 3, Sat: 1, Sun: 2 },
  { week: 'W4', Mon: 0, Tue: 3, Wed: 1, Thu: 1, Fri: 2, Sat: 3, Sun: 1 },
  { week: 'W5', Mon: 2, Tue: 1, Wed: 3, Thu: 2, Fri: 0, Sat: 2, Sun: 3 },
  { week: 'W6', Mon: 1, Tue: 2, Wed: 0, Thu: 1, Fri: 3, Sat: 1, Sun: 2 },
  { week: 'W7', Mon: 3, Tue: 1, Wed: 2, Thu: 3, Fri: 1, Sat: 0, Sun: 1 },
  { week: 'W8', Mon: 2, Tue: 3, Wed: 1, Thu: 0, Fri: 2, Sat: 3, Sun: 2 },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getHeatColor(val: number): string {
  if (val === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (val <= 1) return 'bg-primary-200 dark:bg-primary-900/40';
  if (val <= 2) return 'bg-primary-400 dark:bg-primary-700';
  return 'bg-primary-600 dark:bg-primary-500';
}

function computeProjected(monthlyData: { month: string; hours: number }[]) {
  if (monthlyData.length < 2) return null;
  const values = monthlyData.map(d => d.hours);
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den ? num / den : 0;
  const nextVal = Math.max(0, Math.round(yMean + slope * n));
  return [...monthlyData, { month: 'Proj.', hours: nextVal, isProjected: true }];
}

function exportReport(weekly: any[], monthly: any[], skills: any[], courses: any[]) {
  const header = 'Learning Progress Report\n';
  const weeklyStr = `\nWeekly Activity:\n${weekly.map(d => `${d.day}: ${d.hours}h`).join('\n')}`;
  const monthlyStr = `\n\nMonthly Learning:\n${monthly.map(d => `${d.month}: ${d.hours}h`).join('\n')}`;
  const skillsStr = `\n\nSkill Growth:\n${skills.map(d => `${d.skill}: ${d.current}%`).join('\n')}`;
  const coursesStr = `\n\nCourse Progress:\n${courses.map(d => `${d.title}: ${d.progress}%`).join('\n')}`;
  const blob = new Blob([header + weeklyStr + monthlyStr + skillsStr + coursesStr], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learning-report-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function findBestTime(weekly: { day: string; hours: number }[]): string {
  if (weekly.length === 0) return 'Start tracking!';
  const maxDay = weekly.reduce((a, b) => a.hours > b.hours ? a : b);
  const dayNames: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  return `${dayNames[maxDay.day] || maxDay.day} (${maxDay.hours}h)`;
}

export function LearningAnalytics() {
  const { weeklyActivity, monthlyLearning, skillGrowth, recentCourses, isLoading } = useStudentStore();
  const [showForecast, setShowForecast] = useState(false);

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const hasData = weeklyActivity.length > 0 || monthlyLearning.length > 0 || skillGrowth.length > 0 || recentCourses.length > 0;
  if (!hasData) return null;

  const topCourses = recentCourses.slice(0, 6);
  const projectedData = showForecast ? computeProjected(monthlyLearning) : null;
  const bestDay = findBestTime(weeklyActivity);
  const overallProgress = Math.round(topCourses.reduce((sum, c) => sum + (c.progress || 0), 0) / Math.max(topCourses.length, 1));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Learning Analytics</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportReport(weeklyActivity, monthlyLearning, skillGrowth, recentCourses)}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export
        </Button>
      </div>

      {/* Milestone badges */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {[25, 50, 75, 100].map((milestone) => (
          <div key={milestone} className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0',
            overallProgress >= milestone
              ? 'bg-success-500/10 border-success-500/30 text-success-600 dark:text-success-400'
              : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
          )}>
            {overallProgress >= milestone ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <span className="w-3 h-3 rounded-full border-2 border-current" />
            )}
            {milestone}% Complete
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Weekly Learning Activity</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" name="Hours" radius={[6, 6, 0, 0]} fill="url(#barGradient)">
                    {weeklyActivity.map((_, i) => (
                      <Cell key={i} fill={courseColors[i % courseColors.length]} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Learning Heatmap */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Learning Heatmap</h3>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded bg-gray-100 dark:bg-gray-800" />
                <span>Less</span>
                <span className="w-2 h-2 rounded bg-primary-600 dark:bg-primary-500" />
                <span>More</span>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-[400px]">
                <div className="flex flex-col gap-1 mr-1">
                  <div className="h-4" />
                  {days.map((d) => (
                    <div key={d} className="h-4 text-[10px] text-gray-400 leading-4">{d.slice(0, 1)}</div>
                  ))}
                </div>
                {heatmapData.map((week) => (
                  <div key={week.week} className="flex flex-col gap-1">
                    <div className="h-4 text-[10px] text-gray-400 text-center">{week.week.slice(-1)}</div>
                    {days.map((day) => (
                      <div
                        key={`${week.week}-${day}`}
                        className={cn('w-4 h-4 rounded-sm', getHeatColor(week[day as keyof typeof week] as number))}
                        title={`${week.week} ${day}: ${week[day as keyof typeof week] as number}h`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-gray-500">Most productive:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{bestDay}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Monthly Learning with Forecast */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Learning Time</h3>
              <button
                onClick={() => setShowForecast(!showForecast)}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                  showForecast ? 'bg-primary-500/10 text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                Forecast
              </button>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectedData || monthlyLearning} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="hours" name="Hours" stroke="#7C3AED" fill="url(#areaGradient)" strokeWidth={2} />
                  {projectedData && projectedData.length > monthlyLearning.length && (
                    <Line
                      type="monotone"
                      data={projectedData.filter((d: any) => d.isProjected)}
                      dataKey="hours"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#F59E0B', r: 4 }}
                      name="Projected"
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Course Progress + Skill Growth */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Course Progress</h3>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 mb-4">
              {topCourses.length === 0 ? (
                <div className="col-span-3 flex flex-col items-center justify-center py-6 text-sm text-gray-400">
                  <Lightbulb className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-sm">No enrolled courses yet.</p>
                  <p className="text-sm">Enroll in a course to see progress!</p>
                </div>
              ) : topCourses.map((course, i) => (
                <div key={course.id} className="flex flex-col items-center gap-2">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke={courseColors[i % courseColors.length]} strokeWidth="4" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - (course.progress || 0) / 100)}`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums" style={{ color: courseColors[i % courseColors.length] }}>
                      {course.progress || 0}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 text-center leading-tight line-clamp-2">{course.title}</span>
                </div>
              ))}
            </div>

            {/* Skill Growth */}
            <h3 className="text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">Skill Growth</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillGrowth} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} className="text-gray-500" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar name="Current" dataKey="current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Previous" dataKey="previous" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
