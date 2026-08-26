import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Lock, Play, Star } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

interface SkillNode {
  id: string;
  title: string;
  order_index: number;
  is_free: boolean;
  duration: number;
  completed: boolean;
  completed_at: string | null;
  watch_percentage: number;
}

interface SkillModule {
  id: string;
  title: string;
  order_index: number;
  lessons: SkillNode[];
  completed: number;
  total: number;
  percentage: number;
}

export default function SkillTree() {
  const { courseId } = useParams<{ courseId: string }>();
  const [modules, setModules] = useState<SkillModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.get(`/gamification/skill-tree/${courseId}`)
      .then(({ data }) => {
        setModules(data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load skill tree');
        setLoading(false);
      });
  }, [courseId]);

  const totalLessons = modules.reduce((sum, m) => sum + m.total, 0);
  const completedLessons = modules.reduce((sum, m) => sum + m.completed, 0);
  const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link to="/student/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-2">Skill Tree</h1>
      <p className="text-sm text-gray-400 mb-6">{completedLessons}/{totalLessons} lessons completed ({overallPct}%)</p>

      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${overallPct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
        />
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-400 text-sm">{error}</p>}

      <div className="space-y-6 relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-800" />

        {modules.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="relative pl-12">
              <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 z-10 ${
                mod.percentage === 100
                  ? 'bg-success-500 border-success-500'
                  : mod.completed > 0
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-gray-900 border-gray-600'
              }`} />

              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{mod.title}</h3>
                  <span className="text-xs text-gray-400">{mod.completed}/{mod.total}</span>
                </div>
                <div className="space-y-2">
                  {mod.lessons.map((lesson) => {
                    const Icon = lesson.completed ? CheckCircle2 : lesson.is_free ? Play : Lock;
                    return (
                      <Link
                        key={lesson.id}
                        to={lesson.is_free || lesson.completed ? `/student/courses/${courseId}/lessons/${lesson.id}` : '#'}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          lesson.completed
                            ? 'bg-success-500/10 hover:bg-success-500/20'
                            : lesson.is_free
                            ? 'bg-primary-500/10 hover:bg-primary-500/20'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${
                          lesson.completed ? 'text-success-500' : lesson.is_free ? 'text-primary-400' : 'text-gray-500'
                        }`} />
                        <span className="text-sm flex-1">{lesson.title}</span>
                        {lesson.completed && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        {!lesson.completed && !lesson.is_free && <Lock className="w-3.5 h-3.5 text-gray-500" />}
                      </Link>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
