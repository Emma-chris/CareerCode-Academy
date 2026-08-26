import type { Guide } from '../types';

export const reportsGuide: Guide = {
  title: 'Reports',
  icon: 'BarChart3',
  sections: [
    { icon: 'Users', heading: 'User Growth', content: 'Track new user registrations and account growth over time.' },
    { icon: 'BookOpen', heading: 'Course Performance', content: 'View enrollment and completion metrics for all courses.' },
    { icon: 'DollarSign', heading: 'Revenue Summaries', content: 'Generate platform-wide revenue and financial summary reports.' },
    { icon: 'Download', heading: 'Export', content: 'Download all reports as CSV or PDF for external analysis.' },
  ],
};
