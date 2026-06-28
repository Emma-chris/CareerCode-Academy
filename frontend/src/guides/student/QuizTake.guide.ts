import type { Guide } from '../types';

export const quizTakeGuide: Guide = {
  title: 'Quiz',
  icon: 'HelpCircle',
  sections: [
    { icon: 'Clock', heading: 'Time Limit', content: 'Some quizzes have a time limit. The timer counts down and auto-submits when time runs out.' },
    { icon: 'CheckCircle', heading: 'Answering', content: 'Select your answer for each question. You can review and change answers before submitting.' },
    { icon: 'BarChart3', heading: 'Instant Feedback', content: 'After submission, see your score and correct answers with explanations.' },
    { icon: 'RefreshCw', heading: 'Retakes', content: 'If allowed by the instructor, you can retake the quiz to improve your score.' },
  ],
};
