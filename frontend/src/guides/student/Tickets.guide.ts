import type { Guide } from '../types';

export const ticketsGuide: Guide = {
  title: 'Support Tickets',
  icon: 'HelpCircle',
  sections: [
    { icon: 'Plus', heading: 'Create a Ticket', content: 'Submit a new support ticket describing your issue. Include relevant details for faster resolution.' },
    { icon: 'List', heading: 'Track Status', content: 'View all your tickets with current status: open, in progress, or resolved.' },
    { icon: 'MessageSquare', heading: 'Reply to Tickets', content: 'Add comments to your ticket thread to provide updates or answer follow-up questions.' },
  ],
};
