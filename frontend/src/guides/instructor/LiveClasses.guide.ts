import type { Guide } from '../types';

export const liveClassesGuide: Guide = {
  title: 'Live Classes',
  icon: 'Calendar',
  sections: [
    { icon: 'Plus', heading: 'Schedule a Class', content: 'Set a date, time, and duration for a live session. Add a Zoom or Google Meet link.' },
    { icon: 'Users', heading: 'Attendance', content: 'Mark attendance after the session ends. Students can see their attendance record.' },
    { icon: 'List', heading: 'Upcoming Classes', content: 'View your scheduled classes and any conflicts. Students see these in their calendar.' },
  ],
};
