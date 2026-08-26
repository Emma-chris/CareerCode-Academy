import type { Guide } from '../types';

export const examResultsGuide: Guide = {
  title: 'Exam Results',
  icon: 'BarChart3',
  sections: [
    { icon: 'Award', heading: 'Your Score', content: 'View your total score, passing status, and grade breakdown.' },
    { icon: 'List', heading: 'Review Answers', content: 'See which questions you got right or wrong with correct answers and explanations.' },
    { icon: 'History', heading: 'Attempt History', content: 'If multiple attempts are allowed, review your past results and improvement.' },
  ],
};
