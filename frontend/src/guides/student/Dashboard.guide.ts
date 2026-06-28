import type { Guide } from '../types';

export const studentDashboardGuide: Guide = {
  title: 'Student Dashboard',
  icon: 'LayoutDashboard',
  sections: [
    { icon: 'Zap', heading: 'XP & Level', content: 'Earn XP by completing lessons, quizzes, and assignments. Each level unlocks new perks.' },
    { icon: 'Flame', heading: 'Daily Streak', content: 'Log in every day to build your streak. Longer streaks earn bonus XP multipliers.' },
    { icon: 'Trophy', heading: 'Leaderboard Rank', content: 'See your rank among all students. Rank updates based on total XP earned.' },
    { icon: 'Award', heading: 'Badges', content: 'Unlock badges for milestones like first course completed, 30-day streak, or top 10 rank.' },
    { icon: 'BarChart3', heading: 'Progress Charts', content: 'Weekly and monthly activity charts show your learning trends at a glance.' },
    { icon: 'BookOpen', heading: 'Recent Courses', content: 'Quick-access cards for your enrolled courses. Click to resume where you left off.' },
    { icon: 'Target', heading: 'Recommended Courses', content: 'Personalized suggestions based on your interests and learning history.' },
  ],
};
