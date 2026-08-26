import type { Guide } from '../types';

export const examTakeGuide: Guide = {
  title: 'Exam',
  icon: 'FileCheck',
  sections: [
    { icon: 'Shield', heading: 'Proctoring Setup', content: 'Follow the wizard to enable your webcam and screen sharing before the exam starts.' },
    { icon: 'FileText', heading: 'Rules', content: 'Review the exam rules carefully. Agree to proceed to the questions.' },
    { icon: 'Clock', heading: 'Timer', content: 'The exam has a countdown timer. Auto-submit occurs when time expires.' },
    { icon: 'AlertTriangle', heading: 'Tab Switching', content: 'Leaving the exam tab or switching windows may trigger auto-submission.' },
    { icon: 'CheckCircle', heading: 'Answering', content: 'Navigate between questions using the sidebar or Next/Back buttons.' },
  ],
};
