import type { Guide } from '../types';

export const courseDetailsGuide: Guide = {
  title: 'Course Details',
  icon: 'BookOpen',
  sections: [
    { icon: 'Info', heading: 'Course Overview', content: 'View the course description, instructor info, rating, and what you will learn.' },
    { icon: 'List', heading: 'Syllabus', content: 'Browse the full curriculum broken into modules and lessons before enrolling.' },
    { icon: 'Star', heading: 'Student Reviews', content: 'Read reviews from past students to gauge the course quality.' },
    { icon: 'ShoppingCart', heading: 'Pricing & Enrollment', content: 'See the price, any active discounts, and click Enroll Now to get started.' },
  ],
};
