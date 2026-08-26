import type { Guide } from '../types';

export const myCoursesGuide: Guide = {
  title: 'My Courses',
  icon: 'BookOpen',
  sections: [
    { icon: 'Play', heading: 'Course Progress', content: 'Each course card shows your completion percentage. Click to resume learning.' },
    { icon: 'Search', heading: 'Search & Filter', content: 'Search your enrolled courses or filter by category.' },
    { icon: 'Plus', heading: 'Browse More', content: 'Use the Browse Courses button to find and enroll in new courses.' },
  ],
};
