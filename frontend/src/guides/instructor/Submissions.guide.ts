import type { Guide } from '../types';

export const submissionsGuide: Guide = {
  title: 'Submissions',
  icon: 'FileCheck',
  sections: [
    { icon: 'List', heading: 'Pending Work', content: 'View all student submissions awaiting your grading, sorted by assignment and course.' },
    { icon: 'Eye', heading: 'Review', content: 'Click a submission to view the student work, attached files, and their response.' },
    { icon: 'Star', heading: 'Grade & Feedback', content: 'Assign a score and write personalized feedback. Students are notified instantly.' },
    { icon: 'Filter', heading: 'Filter', content: 'Filter by course, assignment, or grading status to focus on what needs attention.' },
  ],
};
