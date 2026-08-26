import dotenv from 'dotenv';
dotenv.config();
import { query } from './config/db';

const categories = [
  { name: 'General', slug: 'general', description: 'General discussions and community help', icon: 'Hash', color: '#6366f1', sort_order: 0 },
  { name: 'Learning', slug: 'learning', description: 'Course and subject discussions', icon: 'BookOpen', color: '#8b5cf6', sort_order: 1 },
  { name: 'Career', slug: 'career', description: 'Career growth and opportunities', icon: 'Briefcase', color: '#06b6d4', sort_order: 2 },
  { name: 'Practical Experience', slug: 'practical', description: 'Projects, challenges, and hands-on work', icon: 'Code', color: '#10b981', sort_order: 3 },
];

const channelsByCategory: Record<string, Array<{ name: string; slug: string; description: string; type?: string }>> = {
  general: [
    { name: 'general', slug: 'general', description: 'Hang out and chat with the community' },
    { name: 'announcements', slug: 'announcements', description: 'Official updates and news from CareerCode Academy', type: 'announcement' },
    { name: 'introductions', slug: 'introductions', description: 'Introduce yourself to the community' },
    { name: 'community-help', slug: 'community-help', description: 'Ask for help from the community' },
  ],
  learning: [
    { name: 'frontend', slug: 'frontend', description: 'React, Vue, HTML, CSS, JavaScript' },
    { name: 'backend', slug: 'backend', description: 'Node.js, Python, databases, APIs' },
    { name: 'fullstack', slug: 'fullstack', description: 'End-to-end development discussions' },
    { name: 'mobile-dev', slug: 'mobile-dev', description: 'React Native, Flutter, iOS, Android' },
    { name: 'data-ai', slug: 'data-ai', description: 'Data science, machine learning, AI' },
    { name: 'ui-ux', slug: 'ui-ux', description: 'Design, prototyping, user experience' },
    { name: 'cybersecurity', slug: 'cybersecurity', description: 'Security, ethical hacking, networking' },
  ],
  career: [
    { name: 'career', slug: 'career', description: 'Career growth and professional development' },
    { name: 'internships', slug: 'internships', description: 'Internship opportunities and advice' },
    { name: 'jobs', slug: 'jobs', description: 'Job postings and referrals' },
    { name: 'freelancing', slug: 'freelancing', description: 'Freelance work and client management' },
    { name: 'portfolio', slug: 'portfolio', description: 'Portfolio reviews and feedback' },
    { name: 'career-advice', slug: 'career-advice', description: 'Get career guidance from mentors and peers' },
  ],
  practical: [
    { name: 'projects', slug: 'projects', description: 'Share and discuss projects' },
    { name: 'challenges', slug: 'challenges', description: 'Coding challenges and competitions' },
    { name: 'code-review', slug: 'code-review', description: 'Get feedback on your code' },
    { name: 'project-showcase', slug: 'project-showcase', description: 'Show off your completed projects', type: 'project_showcase' },
  ],
};

async function seedCommunity() {
  console.log('Seeding community categories and channels...');

  // Insert categories
  for (const cat of categories) {
    const existing = await query('SELECT id FROM community_categories WHERE slug = $1', [cat.slug]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO community_categories (name, slug, description, icon, color, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cat.name, cat.slug, cat.description, cat.icon, cat.color, cat.sort_order]
      );
      console.log(`  Created category: ${cat.name}`);
    }
  }

  // Insert channels
  for (const cat of categories) {
    const catResult = await query('SELECT id FROM community_categories WHERE slug = $1', [cat.slug]);
    const categoryId = catResult.rows[0]?.id;
    if (!categoryId) continue;

    const channels = channelsByCategory[cat.slug] || [];
    for (const ch of channels) {
      const existing = await query(
        'SELECT id FROM community_channels WHERE category_id = $1 AND slug = $2',
        [categoryId, ch.slug]
      );
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO community_channels (category_id, name, slug, description, type, is_public)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [categoryId, ch.name, ch.slug, ch.description, ch.type || 'text']
        );
        console.log(`  Created channel: #${ch.name}`);
      }
    }
  }

  console.log('Community seed complete!');
}

seedCommunity()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Community seed failed:', err);
    process.exit(1);
  });
