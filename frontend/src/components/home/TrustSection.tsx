import { motion } from 'framer-motion';
import { Award, Star, TrendingUp, Briefcase, Quote } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

const achievements = [
  {
    name: 'Sarah Johnson',
    role: 'Frontend Developer at Google',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    quote: 'CareerCode took me from zero to Google in 6 months. The project-based approach is unmatched.',
    prevSalary: '$45K',
    newSalary: '$145K',
  },
  {
    name: 'Marcus Chen',
    role: 'Full-Stack Developer at Stripe',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    quote: 'The mentorship program was incredible. My portfolio stood out to top tech companies.',
    prevSalary: '$55K',
    newSalary: '$165K',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Data Scientist at Netflix',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    quote: 'The Data Science track was comprehensive and up-to-date. Real-world projects gave me confidence.',
    prevSalary: '$50K',
    newSalary: '$155K',
  },
];

const certifications = [
  { name: 'AWS', label: 'Approved Training Partner' },
  { name: 'Google', label: 'Cloud Ready Program' },
  { name: 'Microsoft', label: 'Learn Partner' },
  { name: 'Meta', label: 'Certificate Program' },
];

export function TrustSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.03),transparent_50%)]" />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Real <span className="gradient-text">Career Transformations</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Our graduates work at the world's leading tech companies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {achievements.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6 h-full flex flex-col" hover>
                <div className="flex items-start justify-between mb-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-500/20"
                  />
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Quote className="w-3.5 h-3.5 text-primary-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
                      "{item.quote}"
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{item.role}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 line-through">{item.prevSalary}</span>
                    <TrendingUp className="w-3 h-3 text-success-500" />
                    <span className="text-success-500 font-semibold">{item.newSalary}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {certifications.map((cert) => (
              <div key={cert.name} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cert.name}</p>
                  <p className="text-xs text-gray-500">{cert.label}</p>
                </div>
              </div>
            ))}
            <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <Badge variant="primary" size="lg" className="px-4 py-2">
              <Briefcase className="w-4 h-4" />
              500+ Hiring Partners
            </Badge>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
