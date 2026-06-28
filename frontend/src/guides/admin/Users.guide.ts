import type { Guide } from '../types';

export const usersGuide: Guide = {
  title: 'User Management',
  icon: 'Users',
  sections: [
    { icon: 'Search', heading: 'Browse Users', content: 'View and search all registered users. Filter by role, status, or date joined.' },
    { icon: 'Shield', heading: 'Manage Roles', content: 'Change user roles (e.g., promote student to instructor).' },
    { icon: 'Ban', heading: 'Suspend Accounts', content: 'Temporarily suspend user accounts for policy violations.' },
    { icon: 'UserCheck', heading: 'View Profiles', content: 'Click any user to view their detailed profile and activity history.' },
  ],
};
