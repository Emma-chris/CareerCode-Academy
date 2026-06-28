import type { Guide } from '../types';

export const learningPathDetailGuide: Guide = {
  title: 'Learning Path Details',
  icon: 'Target',
  sections: [
    { icon: 'Info', heading: 'Path Overview', content: 'View the path description, total courses, estimated duration, and skill level.' },
    { icon: 'List', heading: 'Course List', content: 'All courses in the path are listed in recommended order with enrollment status.' },
    { icon: 'BarChart3', heading: 'Progress', content: 'Track your completion for each course and the overall path.' },
  ],
};
