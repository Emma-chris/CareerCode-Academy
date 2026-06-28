import type { Guide } from '../types';

export const adminCalendarGuide: Guide = {
  title: 'Calendar',
  icon: 'Calendar',
  sections: [
    { icon: 'Calendar', heading: 'Platform Events', content: 'View all scheduled events across the platform: live classes, deadlines, and admin events.' },
    { icon: 'Filter', heading: 'Filters', content: 'Filter by event type or date range to focus on specific timeframes.' },
    { icon: 'Bell', heading: 'Details', content: 'Click any event to view full details and take action.' },
  ],
};
