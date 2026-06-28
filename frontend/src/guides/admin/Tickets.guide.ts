import type { Guide } from '../types';

export const adminTicketsGuide: Guide = {
  title: 'Support Tickets',
  icon: 'HelpCircle',
  sections: [
    { icon: 'List', heading: 'All Tickets', content: 'View all user-submitted support tickets sorted by status and priority.' },
    { icon: 'MessageSquare', heading: 'Respond', content: 'Reply to tickets directly. Users receive notifications on replies.' },
    { icon: 'CheckCircle', heading: 'Resolve', content: 'Mark tickets as resolved when the issue is addressed.' },
    { icon: 'UserPlus', heading: 'Assign', content: 'Assign tickets to specific support team members for accountability.' },
  ],
};
