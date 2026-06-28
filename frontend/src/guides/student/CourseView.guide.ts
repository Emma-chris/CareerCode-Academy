import type { Guide } from '../types';

export const courseViewGuide: Guide = {
  title: 'Course View',
  icon: 'BookOpen',
  sections: [
    { icon: 'Play', heading: 'Video Player', content: 'Watch lessons with playback speed controls, bookmarks, and auto-save progress.' },
    { icon: 'Menu', heading: 'Module Navigation', content: 'Jump between modules and lessons using the left sidebar. Completed lessons show a green check.' },
    { icon: 'PenLine', heading: 'Notes Tab', content: 'Take timestamped notes synced to the current video position. Notes auto-save.' },
    { icon: 'HelpCircle', heading: 'Quiz Tab', content: 'Test your knowledge after each lesson. Auto-graded with instant feedback.' },
    { icon: 'Download', heading: 'Resources Tab', content: 'Download supplementary materials like code samples and PDFs.' },
    { icon: 'BarChart3', heading: 'Analytics Tab', content: 'Track time spent, quiz scores, and progress per module.' },
  ],
};
