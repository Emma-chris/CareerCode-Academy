import type { Guide } from '../types';

export const learningPathsGuide: Guide = {
  title: 'Learning Paths',
  icon: 'Target',
  sections: [
    { icon: 'Route', heading: 'Guided Curricula', content: 'Learning paths group related courses into a structured journey from beginner to advanced.' },
    { icon: 'BarChart3', heading: 'Track Progress', content: 'See your overall progress across all courses in the path.' },
    { icon: 'Lock', heading: 'Prerequisites', content: 'Some paths require completing prerequisite courses before advancing.' },
    { icon: 'Award', heading: 'Specialization Badge', content: 'Earn a specialization badge upon completing a full learning path.' },
  ],
};
