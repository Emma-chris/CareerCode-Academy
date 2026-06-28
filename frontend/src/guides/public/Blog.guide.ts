import type { Guide } from '../types';

export const blogGuide: Guide = {
  title: 'Blog',
  icon: 'FileText',
  sections: [
    { icon: 'Calendar', heading: 'Browse Articles', content: 'Read the latest articles on software development, career tips, and tech industry insights.' },
    { icon: 'Tag', heading: 'Categories', content: 'Articles are organized by topic. Click a category badge to filter related posts.' },
    { icon: 'User', heading: 'Authors', content: 'Each post shows the author name and publication date for credibility.' },
  ],
};
