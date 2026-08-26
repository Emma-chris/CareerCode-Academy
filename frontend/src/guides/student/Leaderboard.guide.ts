import type { Guide } from '../types';

export const leaderboardGuide: Guide = {
  title: 'Leaderboard',
  icon: 'Trophy',
  sections: [
    { icon: 'Trophy', heading: 'Rankings', content: 'See where you stand among all students. Rankings are based on total XP earned.' },
    { icon: 'Search', heading: 'Search Students', content: 'Search for specific students to view their rank and XP.' },
    { icon: 'BarChart3', heading: 'Time Periods', content: 'Filter rankings by all-time, monthly, or weekly to track recent performance.' },
    { icon: 'Award', heading: 'Top Performers', content: 'The top students are highlighted with special badges on the leaderboard.' },
  ],
};
