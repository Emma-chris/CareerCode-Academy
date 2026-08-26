import type { Guide } from '../types';

export const challengesGuide: Guide = {
  title: 'Coding Challenges',
  icon: 'Terminal',
  sections: [
    { icon: 'List', heading: 'Browse Challenges', content: 'View available coding challenges sorted by difficulty and topic.' },
    { icon: 'Code', heading: 'Code Editor', content: 'Write your solution in the browser-based code editor with syntax highlighting.' },
    { icon: 'Play', heading: 'Run Tests', content: 'Test your solution against provided test cases before submitting.' },
    { icon: 'Zap', heading: 'Earn XP', content: 'Each successful submission earns XP and contributes to your skills profile.' },
  ],
};
