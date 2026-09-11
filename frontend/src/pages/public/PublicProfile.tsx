import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { User, Award, Briefcase, Calendar, ExternalLink, FolderGit2, GraduationCap, Lock } from 'lucide-react';
import SEO from '@/components/seo/SEO';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const { data } = await api.get(`/portfolio/user/${username}`);
        setProfile(data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Could not load this profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title={profile ? `${profile.user.name} — Portfolio` : 'Portfolio'} description="Student portfolio on CareerCode Academy." />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <Breadcrumb items={[{ label: 'Career Center', href: '/career' }, { label: 'Alumni Network', href: '/career/alumni' }, { label: username || '' }]} className="mb-6" />

        {loading ? (
          <div className="flex justify-center py-20"><Loader size="lg" text="Loading profile..." /></div>
        ) : error ? (
          <EmptyState
            icon={<Lock className="w-8 h-8" />}
            title="Profile not available"
            description={error}
            action={{ label: 'Back to Alumni Network', onClick: () => (window.location.href = '/career/alumni') }}
          />
        ) : profile ? (
          <div className="max-w-3xl space-y-6">
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:items-start">
                {profile.user.avatar ? (
                  <img src={profile.user.avatar} alt={profile.user.name} className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {profile.user.name?.[0] || 'U'}
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">{profile.user.name}</h1>
                  {profile.alumni?.current_position && (
                    <p className="text-primary-500 text-sm mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> {profile.alumni.current_position}
                      {profile.alumni.current_company ? ` at ${profile.alumni.current_company}` : ''}
                    </p>
                  )}
                  {profile.user.bio && <p className="text-sm text-gray-400 mt-2">{profile.user.bio}</p>}
                </div>
                {profile.alumni?.graduation_year && (
                  <Badge variant="primary" size="md">Class of {profile.alumni.graduation_year}</Badge>
                )}
              </div>

              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                  {profile.skills.map((s: string) => <Badge key={s}>{s}</Badge>)}
                </div>
              )}
            </GlassCard>

            {profile.certificates.length > 0 && (
              <GlassCard className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary-500" /> Certificates</h2>
                <div className="space-y-3">
                  {profile.certificates.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{c.course_title || c.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Award className="w-3 h-3" /> {new Date(c.issued_at || c.created_at).toLocaleDateString()}</p>
                      </div>
                      {c.certificate_no && (
                        <Link to={`/verify-certificate?certificate_no=${c.certificate_no}`} className="text-xs text-primary-500 hover:text-primary-400 shrink-0">Verify</Link>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {profile.items.length > 0 && (
              <GlassCard className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><FolderGit2 className="w-4 h-4 text-primary-500" /> Portfolio</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.items.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium">{item.title}</h3>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                      {Array.isArray(item.skills) && item.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.skills.map((s: string) => <Badge key={s}>{s}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {!profile.alumni && profile.items.length === 0 && profile.certificates.length === 0 && (
              <GlassCard className="p-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                <User className="w-8 h-8 text-gray-400" />
                This student hasn't added portfolio items or certificates yet.
              </GlassCard>
            )}
          </div>
        ) : (
          <EmptyState icon={<User className="w-8 h-8" />} title="Profile not found" description="This public profile doesn't exist." />
        )}
      </div>
    </motion.div>
  );
}