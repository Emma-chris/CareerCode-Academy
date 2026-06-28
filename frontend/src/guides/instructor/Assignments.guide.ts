import type { Guide } from '../types';

export const instructorAssignmentsGuide: Guide = {
  title: 'Assignments',
  icon: 'ClipboardList',
  sections: [
    { icon: 'Plus', heading: 'Create Assignment', content: 'Create a new assignment by selecting a course and adding instructions, rubric, due date, and max points.' },
    { icon: 'Search', heading: 'Filter by Course', content: 'Use the course selector to view assignments for a specific course.' },
    { icon: 'Edit', heading: 'Edit & Delete', content: 'Update assignment details or remove assignments that are no longer needed.' },
    { icon: 'FileText', heading: 'Submissions', content: 'Click the Submissions link to view and grade student submissions for each assignment.' },
  ],
};
