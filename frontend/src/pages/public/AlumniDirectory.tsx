import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Users, Star, ExternalLink, Search, MapPin, Quote } from 'lucide-react';
import SEO from '@/components/seo/SEO';

export default function AlumniDirectory() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/career/alumni');
        setAlumni(data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load alumni');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search
    ? alumni.filter(a => (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.current_company || '').toLowerCase().includes(search.toLowerCase()) || (a.current_position || '').toLowerCase().includes(search.toLowerCase()))
    : alumni;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title="Alumni Network" description="Meet CareerCode Academy alumni and see where their careers have taken them." />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <Breadcrumb items={[{ label: 'Career Center', href: '/career' }, { label: 'Alumni Network' }]} className="mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Alumni Network</h1>
            <p className="text-gray-400 mt-1">Meet our graduates and see where CareerCode has taken them.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, company, or role..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm" />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader size="lg" text="Loading alumni..." /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="w-8 h-8" />} title={search ? 'No matching alumni' : 'No alumni yet'} description={search ? 'Try a different search.' : 'Alumni profiles will appear here as students graduate.'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((person: any, i: number) => (
              <motion.div key={person.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hover={false} className="p-5 h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0">
                      {person.name?.[0] || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-medium truncate">{person.name}</p>
                        {person.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                      </div>
                      {person.current_position && (
                        <p className="text-xs text-gray-400 truncate">{person.current_position}</p>
                      )}
                      {person.current_company && (
                        <p className="text-xs text-gray-500 truncate">at {person.current_company}</p>
                      )}
                    </div>
                  </div>

                  {person.testimonial && (
                    <div className="flex-1 mb-3 p-3 rounded-xl bg-gray-800/30">
                      <Quote className="w-3 h-3 text-gray-500 mb-1" />
                      <p className="text-xs text-gray-400 italic leading-relaxed">"{person.testimonial}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {person.graduation_year && <Badge variant="default" size="sm">Class of {person.graduation_year}</Badge>}
                    </div>
                    {person.linkedin_url && (
                      <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
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
