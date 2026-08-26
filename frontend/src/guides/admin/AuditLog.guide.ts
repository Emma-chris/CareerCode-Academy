import type { Guide } from '../types';

export const auditLogGuide: Guide = {
  title: 'Audit Log',
  icon: 'ScrollText',
  sections: [
    { icon: 'List', heading: 'Action History', content: 'View a chronological log of all administrative actions for security and compliance.' },
    { icon: 'Search', heading: 'Filter', content: 'Filter by admin user, action type, or date range to find specific events.' },
    { icon: 'Info', heading: 'Details', content: 'Click any entry to see what was changed, by whom, and when.' },
  ],
};
