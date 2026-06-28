import type { Guide } from '../types';

export const coursesGuide: Guide = {
  title: 'Course Catalog',
  icon: 'BookOpen',
  sections: [
    { icon: 'Search', heading: 'Browse & Search', content: 'Filter courses by category or difficulty level. Use the search bar to find specific topics.' },
    { icon: 'Star', heading: 'Ratings & Reviews', content: 'Each course shows its average rating, student count, and duration to help you decide.' },
    { icon: 'Filter', heading: 'Categories', content: 'Courses are grouped into categories like Web Development, Data Science, Mobile, and more.' },
    { icon: 'BarChart3', heading: 'Levels', content: 'Filter by Beginner, Intermediate, or Advanced to find courses matching your skill level.' },
    { icon: 'ShoppingCart', heading: 'Enrollment', content: 'Click any course to view details and enroll. Free courses are available immediately.' },
  ],
};
