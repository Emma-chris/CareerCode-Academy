import type { Guide } from '../types';

export const instructorAnalyticsGuide: Guide = {
  title: 'Analytics',
  icon: 'BarChart3',
  sections: [
    { icon: 'TrendingUp', heading: 'Enrollment Trends', content: 'Visualize how student enrollment changes over time for each course.' },
    { icon: 'CheckCircle', heading: 'Completion Rates', content: 'Track what percentage of students complete your courses.' },
    { icon: 'DollarSign', heading: 'Revenue Charts', content: 'See your earnings over time and identify your best-performing courses.' },
    { icon: 'BarChart3', heading: 'Quiz Performance', content: 'Analyze how students perform on quizzes across different lessons.' },
    { icon: 'Download', heading: 'Export Reports', content: 'Download analytics data as CSV for external analysis.' },
  ],
};
