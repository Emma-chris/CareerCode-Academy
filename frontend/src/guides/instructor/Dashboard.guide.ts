import type { Guide } from '../types';

export const instructorDashboardGuide: Guide = {
  title: 'Instructor Dashboard',
  icon: 'LayoutDashboard',
  sections: [
    { icon: 'BookOpen', heading: 'Active Courses', content: 'View how many courses you have published and their overall performance.' },
    { icon: 'Users', heading: 'Total Students', content: 'See the total number of students enrolled across all your courses.' },
    { icon: 'DollarSign', heading: 'Revenue', content: 'Track your earnings from course sales over time.' },
    { icon: 'Star', heading: 'Average Rating', content: 'Monitor your overall student satisfaction score.' },
    { icon: 'FileText', heading: 'Pending Reviews', content: 'See how many submissions are waiting for your grading.' },
    { icon: 'BarChart3', heading: 'Enrollment Trends', content: 'Charts showing enrollment patterns over weeks and months.' },
  ],
};
