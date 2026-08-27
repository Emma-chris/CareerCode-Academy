import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Briefcase, MapPin, Clock, DollarSign, ExternalLink, Building, Search } from 'lucide-react';
import SEO from '@/components/seo/SEO';

const typeLabels: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  'contract': 'Contract',
  'remote': 'Remote',
  'hybrid': 'Hybrid',
};

const typeColors: Record<string, string> = {
  'full-time': 'bg-emerald-500/20 text-emerald-400',
  'part-time': 'bg-blue-500/20 text-blue-400',
  'contract': 'bg-amber-500/20 text-amber-400',
  'remote': 'bg-purple-500/20 text-purple-400',
  'hybrid': 'bg-cyan-500/20 text-cyan-400',
};

export default function JobBoard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/career/jobs');
        setJobs(data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = jobs.filter(j => {
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title="Job Board" description="Browse job opportunities from partner companies." />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <Breadcrumb items={[{ label: 'Career Center', href: '/career' }, { label: 'Job Board' }]} className="mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Job Board</h1>
            <p className="text-gray-400 mt-1">Explore opportunities from our partner companies.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
              />
            </div>
            <Select
              value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'full-time', label: 'Full-Time' },
                { value: 'part-time', label: 'Part-Time' },
                { value: 'contract', label: 'Contract' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' },
              ]}
              className="w-full sm:w-auto sm:min-w-[120px]"
            />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader size="lg" text="Loading jobs..." /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Briefcase className="w-8 h-8" />} title={search || typeFilter !== 'all' ? 'No matching jobs' : 'No jobs available'} description={search ? 'Try different search terms.' : 'Check back soon for new opportunities.'} />
        ) : (
          <div className="space-y-4">
            {filtered.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hover={false} className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center shrink-0">
                      <Building className="w-6 h-6 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-semibold">{job.title}</h3>
                          <p className="text-sm text-gray-400">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={typeColors[job.type] || ''}>{typeLabels[job.type] || job.type}</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.description}</p>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                        {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary_range}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="shrink-0 w-full sm:w-auto">
                      <a href={job.application_url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex sm:inline-block">
                        <Button size="sm" variant="outline" disabled={!job.application_url} className="w-full sm:w-auto">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Apply
                        </Button>
                      </a>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
