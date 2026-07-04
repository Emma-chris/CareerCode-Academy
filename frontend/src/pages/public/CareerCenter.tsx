import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { Briefcase, GraduationCap, Users, Target, ArrowRight, Building, Star, MapPin, ExternalLink } from 'lucide-react';
import SEO from '@/components/seo/SEO';

export default function CareerCenter() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, internRes, alumniRes] = await Promise.all([
          api.get('/career/jobs'),
          api.get('/career/internships'),
          api.get('/career/alumni/featured'),
        ]);
        setJobs((jobsRes.data.data || []).slice(0, 4));
        setInternships((internRes.data.data || []).slice(0, 4));
        setAlumni(alumniRes.data.data || []);
      } catch { } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sections = [
    {
      title: 'Job Board',
      description: 'Browse full-time and part-time opportunities from our partner companies.',
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-500',
      path: '/career/jobs',
      count: jobs.length,
      label: 'Browse Jobs',
    },
    {
      title: 'Internships',
      description: 'Gain real-world experience with internship programs from top companies.',
      icon: Building,
      color: 'from-purple-500 to-pink-500',
      path: '/career/internships',
      count: internships.length,
      label: 'View Internships',
    },
    {
      title: 'Alumni Network',
      description: 'Connect with graduates and see where CareerCode has taken them.',
      icon: Users,
      color: 'from-amber-500 to-orange-500',
      path: '/career/alumni',
      count: alumni.length,
      label: 'Meet Alumni',
    },
    {
      title: 'Career Resources',
      description: 'Resume templates, interview prep, LinkedIn optimization guides.',
      icon: Target,
      color: 'from-emerald-500 to-teal-500',
      path: '/student/dashboard',
      count: null,
      label: 'View Resources',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Career Center" description="CareerCode Academy Career Center — jobs, internships, alumni network, and career resources." />
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Career <span className="gradient-text">Center</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Your hub for job opportunities, internships, and career growth resources. We're committed to your professional success.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader size="lg" text="Loading..." /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {sections.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <motion.div key={section.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <Link to={section.path}>
                        <GlassCard hover className="p-6 group h-full">
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-bold text-white group-hover:text-primary-500 transition-colors">{section.title}</h2>
                                {section.count !== null && <Badge variant="primary" size="sm">{section.count} active</Badge>}
                              </div>
                              <p className="text-sm text-gray-400">{section.description}</p>
                              <div className="flex items-center gap-1 text-sm text-primary-500 font-medium mt-3 group-hover:gap-2 transition-all">
                                {section.label} <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {alumni.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Featured Alumni</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alumni.map((person: any, i: number) => (
                      <motion.div key={person.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <GlassCard hover={false} className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0">
                              {person.name?.[0] || 'A'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">{person.name}</p>
                              {person.current_position && (
                                <p className="text-xs text-gray-400 truncate">{person.current_position}{person.current_company ? ` at ${person.current_company}` : ''}</p>
                              )}
                            </div>
                            {person.is_featured && <Star className="w-4 h-4 text-yellow-500 shrink-0" />}
                          </div>
                          {person.testimonial && (
                            <p className="text-sm text-gray-400 italic line-clamp-3">"{person.testimonial}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                            {person.graduation_year && <span>Class of {person.graduation_year}</span>}
                            {person.linkedin_url && (
                              <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 ml-auto" onClick={e => e.stopPropagation()}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center mt-6">
                    <Link to="/career/alumni"><Badge variant="primary" size="md" className="cursor-pointer">View All Alumni →</Badge></Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </motion.div>
  );
}
