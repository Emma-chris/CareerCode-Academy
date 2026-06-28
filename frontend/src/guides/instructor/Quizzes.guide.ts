import type { Guide } from '../types';

export const quizzesGuide: Guide = {
  title: 'Quizzes',
  icon: 'HelpCircle',
  sections: [
    { icon: 'Plus', heading: 'Create Quiz', content: 'Build multiple-choice, true/false, and short answer questions for your lessons.' },
    { icon: 'Clock', heading: 'Time & Attempts', content: 'Set time limits, passing scores, and maximum attempt limits per student.' },
    { icon: 'Zap', heading: 'Auto-Grading', content: 'Quizzes are automatically graded, giving students instant feedback on their answers.' },
    { icon: 'Link', heading: 'Attach to Lessons', content: 'Associate quizzes with specific lessons or modules for contextual testing.' },
  ],
};
