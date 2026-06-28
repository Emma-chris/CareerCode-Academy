import type { Guide } from '../types';

export const manageCoursesGuide: Guide = {
  title: 'Course Management',
  icon: 'BookOpen',
  sections: [
    { icon: 'Plus', heading: 'Create Course', content: 'Click Create New Course to start building a new course from scratch.' },
    { icon: 'Edit', heading: 'Edit Courses', content: 'Click the edit button on any course to modify its content, modules, and lessons.' },
    { icon: 'Eye', heading: 'Preview', content: 'Preview your course as students will see it before publishing.' },
    { icon: 'Globe', heading: 'Publish', content: 'Toggle course visibility between draft and published status.' },
    { icon: 'Trash2', heading: 'Delete', content: 'Remove a course permanently. This action cannot be undone.' },
  ],
};
