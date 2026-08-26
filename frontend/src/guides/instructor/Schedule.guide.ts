import type { Guide } from '../types';

export const scheduleGuide: Guide = {
  title: 'Schedule',
  icon: 'Calendar',
  sections: [
    { icon: 'Calendar', heading: 'Your Timeline', content: 'View all your upcoming live classes, assignment due dates, and events in one place.' },
    { icon: 'List', heading: 'Filters', content: 'Filter by course or event type to focus on specific commitments.' },
    { icon: 'Bell', heading: 'Reminders', content: 'Click an event to view details and set reminders so you never miss a session.' },
  ],
};
