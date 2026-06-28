import type { Guide } from '../types';

export const adminDashboardGuide: Guide = {
  title: 'Admin Dashboard',
  icon: 'LayoutDashboard',
  sections: [
    { icon: 'Users', heading: 'Total Users', content: 'See platform-wide user count broken down by role: students, instructors, and admins.' },
    { icon: 'BookOpen', heading: 'Total Courses', content: 'View all courses across the platform with published vs draft counts.' },
    { icon: 'DollarSign', heading: 'Revenue', content: 'Monitor platform-wide earnings from course sales and commissions.' },
    { icon: 'Clock', heading: 'Pending Actions', content: 'Quick overview of pending proposals, applications, and support tickets.' },
    { icon: 'Activity', heading: 'Recent Activity', content: 'See the latest registrations, course publications, and key actions.' },
  ],
};
