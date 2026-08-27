import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { Building, MapPin, Clock, DollarSign, ExternalLink, GraduationCap, Search } from 'lucide-react';
import SEO from '@/components/seo/SEO';

export default function InternshipsPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/career/internships');
        setInternships(data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load internships');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = internships.filter(intern => {
    if (typeFilter !== 'all' && intern.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return intern.title.toLowerCase().includes(q) || intern.company.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title="Internships" description="Browse internship opportunities to gain real-world experience." />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <Breadcrumb items={[{ label: 'Career Center', href: '/career' }, { label: 'Internships' }]} className="mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Internships</h1>
            <p className="text-gray-400 mt-1">Gain real-world experience with top companies.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm" />
            </div>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Types' }, { value: 'remote', label: 'Remote' }, { value: 'onsite', label: 'On-Site' }, { value: 'hybrid', label: 'Hybrid' }]}
              className="w-full sm:w-auto sm:min-w-[120px]" />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader size="lg" text="Loading internships..." /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<GraduationCap className="w-8 h-8" />} title="No internships available" description="New internship opportunities are added regularly. Check back soon." />
        ) : (
          <div className="space-y-4">
            {filtered.map((intern, i) => (
              <motion.div key={intern.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hover={false} className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                      <Building className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-semibold">{intern.title}</h3>
                          <p className="text-sm text-gray-400">{intern.company}</p>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400">{intern.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{intern.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        {intern.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {intern.location}</span>}
                        {intern.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {intern.duration}</span>}
                        {intern.stipend && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {intern.stipend}</span>}
                      </div>
                      {intern.requirements && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-3 break-words"><span className="text-gray-400 font-medium">Requirements:</span> {intern.requirements}</p>
                      )}
                    </div>
                    <div className="shrink-0 w-full sm:w-auto">
                      <a href={intern.application_url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex sm:inline-block">
                        <Button size="sm" variant="outline" disabled={!intern.application_url} className="w-full sm:w-auto">
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
