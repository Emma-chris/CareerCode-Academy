import type { Guide } from '../types';

export const adminCoursesGuide: Guide = {
  title: 'Courses',
  icon: 'BookOpen',
  sections: [
    { icon: 'List', heading: 'All Courses', content: 'View every course on the platform with status indicators: draft, published, or archived.' },
    { icon: 'Edit', heading: 'Edit or Unpublish', content: 'Modify course details or unpublish courses that violate platform policies.' },
    { icon: 'ClipboardList', heading: 'Proposals', content: 'Review pending course proposals from instructors and approve or reject them.' },
    { icon: 'Tag', heading: 'Categories', content: 'Assign or change course categories to keep the catalog organized.' },
  ],
};
