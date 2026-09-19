import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, ArrowRight, CheckCircle2, BookOpen } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

export default function CareerGoalWidget() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/career-goals/my/goals')
      .then((res) => setGoals(res.data.data || []))
      .catch(() => setGoals([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <GlassCard className="p-5 flex items-center gap-3" hover={false}>
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-2.5 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </GlassCard>
    );
  }

  const goal = goals[0] || null;

  return (
    <GlassCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" hover>
      <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
        <Target className="w-6 h-6 text-primary-500" />
      </div>

      {goal ? (
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">My Career Goal</p>
              <Link to={`/student/career-goals/${goal.slug}`} className="font-semibold hover:text-primary-600 transition-colors">
                {goal.role_title}
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {goal.completed ? (
                <Badge variant="success" size="sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Achieved</Badge>
              ) : (
                <>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.completed_courses}/{goal.total_courses} courses</span>
                  <Badge variant="primary" size="sm">{goal.progress}%</Badge>
                </>
              )}
            </div>
          </div>
          {!goal.completed && (
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
              />
            </div>
          )}
          <div className="mt-2">
            <Link to={`/student/career-goals/${goal.slug}`}>
              <Button size="sm" variant="outline">
                {goal.completed ? 'View Achievement' : 'Continue Goal'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Set your career goal</p>
          <p className="text-xs text-gray-500 mt-0.5">Pick a role and follow a curated pathway to get job-ready.</p>
          <Link to="/student/learning-paths" className="inline-block mt-2">
            <Button size="sm" variant="primary">
              Choose a Goal <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
}