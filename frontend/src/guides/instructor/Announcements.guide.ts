import type { Guide } from '../types';

export const announcementsGuide: Guide = {
  title: 'Announcements',
  icon: 'Megaphone',
  sections: [
    { icon: 'Plus', heading: 'Create Announcement', content: 'Write a title and message to broadcast to all students enrolled in a specific course.' },
    { icon: 'Bell', heading: 'Notifications', content: 'Students receive in-app notifications and optional email alerts for new announcements.' },
    { icon: 'List', heading: 'History', content: 'View all past announcements with timestamps and delivery status.' },
  ],
};
