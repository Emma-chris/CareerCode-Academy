import type { Guide } from '../types';

export const examsListGuide: Guide = {
  title: 'Exams',
  icon: 'FileCheck',
  sections: [
    { icon: 'List', heading: 'Available Exams', content: 'View all available exams for your enrolled courses with duration and status.' },
    { icon: 'Clock', heading: 'Attempts', content: 'See your past attempts, scores, and remaining attempts for each exam.' },
    { icon: 'Shield', heading: 'Proctoring', content: 'Exams are proctored. Ensure your webcam is working before starting.' },
  ],
};
