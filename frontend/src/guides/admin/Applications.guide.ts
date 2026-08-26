import type { Guide } from '../types';

export const applicationsGuide: Guide = {
  title: 'Instructor Applications',
  icon: 'Briefcase',
  sections: [
    { icon: 'List', heading: 'View Applications', content: 'Review all instructor applications with applicant details, experience, and qualifications.' },
    { icon: 'CheckCircle', heading: 'Approve', content: 'Approve qualified applicants. They are automatically upgraded to the instructor role.' },
    { icon: 'XCircle', heading: 'Reject', content: 'Reject with optional feedback so applicants can improve and reapply.' },
  ],
};
