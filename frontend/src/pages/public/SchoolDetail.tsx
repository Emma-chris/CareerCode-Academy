import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine, SkeletonBlock } from '@/components/ui/Skeleton';
import { Code2, Database, Palette, Briefcase, GraduationCap, BookOpen, ArrowRight, Target, Clock, Users, Play } from 'lucide-react';
import SEO from '@/components/seo/SEO';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const iconMap: Record<string, any> = {
  Code2, Database, Palette, Briefcase, GraduationCap, BookOpen,
};

export default function SchoolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [school, setSchool] = useState<any>(null);
  const [schoolVideo, setSchoolVideo] = useState<any>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/schools/${slug}`);
        setSchool(data.data);
        if (data.data?.id) {
          const videoRes = await api.get(`/showcase-videos/school/${data.data.id}`);
          setSchoolVideo(videoRes.data?.data?.[0] || null);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'School not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-12">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <SkeletonLine className="w-48 h-6" />
          <SkeletonLine className="w-96 h-10" />
          <SkeletonLine className="w-2/3 h-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="School not found" description={error || 'This school does not exist.'} action={{ label: 'Browse Schools', onClick: () => window.location.href = '/schools' }} />
      </div>
    );
  }

  const Icon = iconMap[school.icon] || BookOpen;
  const programs = school.programs || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title={school.name} description={school.description || ''} />

      <div className="relative bg-gradient-to-b from-blue-900/40 dark:to-gray-950 to-white">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <Breadcrumb items={[
            { label: 'Schools', href: '/schools' },
            { label: school.name },
          ]} className="mb-6" />

          <div className="flex items-start gap-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${school.color || 'from-primary-500 to-accent-500'} flex items-center justify-center shrink-0`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{school.name}</h1>
              <p className="text-lg text-gray-400 max-w-3xl">{school.description}</p>
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="primary" size="md">{programs.length} Programs</Badge>
                {schoolVideo && (
                  <Button size="sm" variant="outline" onClick={() => setVideoOpen(true)} className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Watch Overview
                  </Button>
                )}
              </div>
            </div>
            {schoolVideo?.thumbnail_url && (
              <div className="shrink-0 cursor-pointer" onClick={() => setVideoOpen(true)}>
                <div className="relative w-40 h-24 rounded-xl overflow-hidden group">
                  <img src={schoolVideo.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {schoolVideo && (
        <VideoPlayer
          videoUrl={schoolVideo.video_url}
          provider={schoolVideo.provider}
          thumbnailUrl={schoolVideo.thumbnail_url}
          title={schoolVideo.title}
          videoId={schoolVideo.id}
          isOpen={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      )}

      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {programs.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No programs yet" description="Programs for this school are being developed." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program: any, i: number) => {
              const PIcon = iconMap[program.icon] || BookOpen;
              const outcomes = program.career_outcomes || [];
              return (
                <motion.div key={program.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/schools/programs/${program.slug}`}>
                    <GlassCard hover className="h-full p-6 group flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                          <PIcon className="w-5 h-5 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold group-hover:text-primary-500 transition-colors truncate">{program.name}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 flex-1 mb-3">{program.description}</p>

                      {program.duration && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                          <Clock className="w-3 h-3" /> {program.duration}
                        </div>
                      )}

                      {outcomes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Career Outcomes</p>
                          <div className="flex flex-wrap gap-1">
                            {outcomes.slice(0, 3).map((o: string, oi: number) => (
                              <Badge key={oi} variant="default" size="sm">{o}</Badge>
                            ))}
                            {outcomes.length > 3 && (
                              <Badge variant="default" size="sm">+{outcomes.length - 3}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-500">{program.course_count || 0} courses</span>
                        <span className="text-sm text-primary-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                          View Program <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
