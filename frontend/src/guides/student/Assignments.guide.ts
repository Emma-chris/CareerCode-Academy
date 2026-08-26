import type { Guide } from '../types';

export const studentAssignmentsGuide: Guide = {
  title: 'Assignments',
  icon: 'ClipboardList',
  sections: [
    { icon: 'List', heading: 'View Assignments', content: 'See all assignments for your enrolled courses with due dates and status.' },
    { icon: 'Upload', heading: 'Submit Work', content: 'Click an assignment to read instructions and upload your work (files, links, or text).' },
    { icon: 'CheckCircle', heading: 'Grades & Feedback', content: 'After grading, view your score and instructor feedback on the submission.' },
    { icon: 'RefreshCw', heading: 'Resubmissions', content: 'Some assignments allow resubmission if enabled by the instructor.' },
  ],
};
