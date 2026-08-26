import type { Guide } from '../types';

export const broadcastsGuide: Guide = {
  title: 'Broadcasts',
  icon: 'Megaphone',
  sections: [
    { icon: 'Plus', heading: 'Create Broadcast', content: 'Send platform-wide announcements with a title and message body.' },
    { icon: 'Users', heading: 'Target Audience', content: 'Send to all users or filter by role (students only, instructors only, or both).' },
    { icon: 'Bell', heading: 'Delivery', content: 'Recipients receive in-app notifications plus optional email delivery.' },
  ],
};
