import type { Guide } from '../types';

export const studentsGuide: Guide = {
  title: 'Students',
  icon: 'Users',
  sections: [
    { icon: 'List', heading: 'Student List', content: 'View all students enrolled in your courses with their progress and engagement status.' },
    { icon: 'Search', heading: 'Search & Filter', content: 'Search by student name or filter by specific course.' },
    { icon: 'BarChart3', heading: 'Progress Reports', content: 'Click a student to view their detailed progress, grades, and activity across your course.' },
    { icon: 'MessageSquare', heading: 'Contact', content: 'Message students directly from their profile for one-on-one communication.' },
  ],
};
