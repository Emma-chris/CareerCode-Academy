import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useAuthStore } from '@/store/authStore';
import { Briefcase, FileText, Calendar, Building, Sparkles, ChevronRight } from 'lucide-react';

const statusMeta: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' }> = {
  applied: { label: 'Applied', variant: 'default' },
  reviewing: { label: 'Reviewing', variant: 'primary' },
  interviewing: { label: 'Interviewing', variant: 'warning' },
  offered: { label: 'Offered', variant: 'success' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export default function ApplicationsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('mine');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const [appsRes, matchRes] = await Promise.all([
          api.get('/career/applications/mine'),
          api.get('/career/match'),
        ]);
        setApplications(appsRes.data.data || []);
        setMatches(matchRes.data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, navigate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-sm text-gray-400 mt-1">Track every job and internship you've applied to, and get role recommendations.</p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Tabs
        tabs={[
          { key: 'mine', label: 'My Applications', icon: FileText },
          { key: 'matches', label: 'Recommended Roles', icon: Sparkles },
        ]}
        activeKey={tab}
        onChange={setTab}
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader size="lg" text="Loading..." /></div>
      ) : (
        <>
          <TabPanel activeKey={tab} tabKey="mine">
            {applications.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8" />}
                title="No applications yet"
                description="When you apply through the Job Board or Internships, they'll show up here."
                action={{ label: 'Browse Jobs', onClick: () => navigate('/career/jobs') }}
              />
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const meta = statusMeta[app.status] || { label: app.status, variant: 'default' as const };
                  return (
                    <GlassCard key={app.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center shrink-0">
                            <Building className="w-5 h-5 text-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{app.role_title}</h3>
                            </div>
                            <p className="text-sm text-gray-400">{app.company} {app.job_id ? '· Job' : '· Internship'}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Applied {new Date(app.created_at).toLocaleDateString()}</span>
                              {app.cover_note && (
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {app.cover_note.length > 60 ? app.cover_note.slice(0, 60) + '…' : app.cover_note}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={meta.variant} size="md">{meta.label}</Badge>
                      </div>
                      {Array.isArray(app.status_timeline) && app.status_timeline.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          {app.status_timeline.map((step: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                              {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                              <Badge variant={statusMeta[step.status]?.variant || 'default'}>
                                {statusMeta[step.status]?.label || step.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabPanel>

          <TabPanel activeKey={tab} tabKey="matches">
            {matches.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-8 h-8" />}
                title="No matches yet"
                description="Complete courses and add skills to your portfolio to unlock role recommendations."
              />
            ) : (
              <div className="space-y-4">
                {matches.map((job) => (
                  <GlassCard key={`${job.kind}-${job.id}`} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{job.title}</h3>
                          <Badge variant="primary" size="sm">{(job.score * 15).toFixed(0)}% match</Badge>
                        </div>
                        <p className="text-sm text-gray-400">{job.company}</p>
                        {Array.isArray(job.skills) && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.skills.slice(0, 5).map((s: string) => (
                              <Badge key={s}>{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => navigate(job.kind === 'job' ? '/career/jobs' : '/career/internships')}>View</Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </TabPanel>
        </>
      )}
    </motion.div>
  );
}