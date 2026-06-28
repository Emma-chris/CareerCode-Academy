import type { Guide } from '../types';

export const adminManagementGuide: Guide = {
  title: 'Admin Management',
  icon: 'Shield',
  sections: [
    { icon: 'List', heading: 'Admin Accounts', content: 'View all admin accounts with their roles and permissions (super admin only).' },
    { icon: 'UserPlus', heading: 'Add Admin', content: 'Create new admin accounts with appropriate role assignments.' },
    { icon: 'UserMinus', heading: 'Remove Admin', content: 'Revoke admin privileges from existing accounts.' },
    { icon: 'Shield', heading: 'Role Assignment', content: 'Assign different admin roles with varying permission levels.' },
  ],
};
