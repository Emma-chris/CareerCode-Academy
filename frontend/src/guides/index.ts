import type { Guide } from './types';
import { defaultGuide } from './Default.guide';

import { coursesGuide } from './public/Courses.guide';
import { courseDetailsGuide } from './public/CourseDetails.guide';
import { blogGuide } from './public/Blog.guide';
import { blogPostGuide } from './public/BlogPost.guide';

import { studentDashboardGuide } from './student/Dashboard.guide';
import { myCoursesGuide } from './student/MyCourses.guide';
import { courseViewGuide } from './student/CourseView.guide';
import { studentAssignmentsGuide } from './student/Assignments.guide';
import { learningPathsGuide } from './student/LearningPaths.guide';
import { learningPathDetailGuide } from './student/LearningPathDetail.guide';
import { quizTakeGuide } from './student/QuizTake.guide';
import { examsListGuide } from './student/ExamsList.guide';
import { examTakeGuide } from './student/ExamTake.guide';
import { examResultsGuide } from './student/ExamResults.guide';
import { challengesGuide } from './student/Challenges.guide';
import { leaderboardGuide } from './student/Leaderboard.guide';
import { certificatesGuide } from './student/Certificates.guide';
import { studentMessagesGuide } from './student/Messages.guide';
import { ticketsGuide } from './student/Tickets.guide';

import { instructorDashboardGuide } from './instructor/Dashboard.guide';
import { manageCoursesGuide } from './instructor/ManageCourses.guide';
import { courseEditorGuide } from './instructor/CourseEditor.guide';
import { instructorAssignmentsGuide } from './instructor/Assignments.guide';
import { studentsGuide } from './instructor/Students.guide';
import { submissionsGuide } from './instructor/Submissions.guide';
import { quizzesGuide } from './instructor/Quizzes.guide';
import { announcementsGuide } from './instructor/Announcements.guide';
import { liveClassesGuide } from './instructor/LiveClasses.guide';
import { instructorMessagesGuide } from './instructor/Messages.guide';
import { scheduleGuide } from './instructor/Schedule.guide';
import { courseProposalsGuide } from './instructor/CourseProposals.guide';
import { instructorAnalyticsGuide } from './instructor/Analytics.guide';
import { instructorPayoutsGuide } from './instructor/Payouts.guide';

import { adminDashboardGuide } from './admin/Dashboard.guide';
import { usersGuide } from './admin/Users.guide';
import { adminCoursesGuide } from './admin/Courses.guide';
import { applicationsGuide } from './admin/Applications.guide';
import { paymentsGuide } from './admin/Payments.guide';
import { adminPayoutsGuide } from './admin/Payouts.guide';
import { adminCertificatesGuide } from './admin/Certificates.guide';
import { certificateTemplatesGuide } from './admin/CertificateTemplates.guide';
import { adminTicketsGuide } from './admin/Tickets.guide';
import { broadcastsGuide } from './admin/Broadcasts.guide';
import { categoriesGuide } from './admin/Categories.guide';
import { reportsGuide } from './admin/Reports.guide';
import { auditLogGuide } from './admin/AuditLog.guide';
import { adminManagementGuide } from './admin/AdminManagement.guide';
import { adminCalendarGuide } from './admin/Calendar.guide';

function matchPath(pattern: string, pathname: string): boolean {
  const patternSegs = pattern.split('/');
  const pathSegs = pathname.split('/');
  if (patternSegs.length !== pathSegs.length) return false;
  return patternSegs.every((seg, i) => seg.startsWith(':') || seg === pathSegs[i]);
}

const GUIDE_MAP: Record<string, Guide> = {
  '/courses': coursesGuide,
  '/courses/:slug': courseDetailsGuide,
  '/blog': blogGuide,
  '/blog/:slug': blogPostGuide,
  '/student/dashboard': studentDashboardGuide,
  '/student/courses': myCoursesGuide,
  '/student/courses/:slug': courseViewGuide,
  '/student/assignments': studentAssignmentsGuide,
  '/student/learning-paths': learningPathsGuide,
  '/student/learning-paths/:slug': learningPathDetailGuide,
  '/student/quiz/:quizId': quizTakeGuide,
  '/student/exams': examsListGuide,
  '/student/exams/:examId': examTakeGuide,
  '/student/exams/:examId/results/:attemptId': examResultsGuide,
  '/student/challenges': challengesGuide,
  '/student/leaderboard': leaderboardGuide,
  '/student/certificates': certificatesGuide,
  '/student/messages': studentMessagesGuide,
  '/student/tickets': ticketsGuide,
  '/instructor/dashboard': instructorDashboardGuide,
  '/instructor/courses': manageCoursesGuide,
  '/instructor/courses/new': courseEditorGuide,
  '/instructor/courses/:slug/edit': courseEditorGuide,
  '/instructor/assignments': instructorAssignmentsGuide,
  '/instructor/students': studentsGuide,
  '/instructor/submissions': submissionsGuide,
  '/instructor/quizzes': quizzesGuide,
  '/instructor/announcements': announcementsGuide,
  '/instructor/live-classes': liveClassesGuide,
  '/instructor/messages': instructorMessagesGuide,
  '/instructor/schedule': scheduleGuide,
  '/instructor/course-proposals': courseProposalsGuide,
  '/instructor/analytics': instructorAnalyticsGuide,
  '/instructor/payouts': instructorPayoutsGuide,
  '/admin/dashboard': adminDashboardGuide,
  '/admin/users': usersGuide,
  '/admin/courses': adminCoursesGuide,
  '/admin/applications': applicationsGuide,
  '/admin/payments': paymentsGuide,
  '/admin/payouts': adminPayoutsGuide,
  '/admin/certificates': adminCertificatesGuide,
  '/admin/certificate-templates': certificateTemplatesGuide,
  '/admin/tickets': adminTicketsGuide,
  '/admin/broadcasts': broadcastsGuide,
  '/admin/categories': categoriesGuide,
  '/admin/reports': reportsGuide,
  '/admin/audit-log': auditLogGuide,
  '/admin/admin-management': adminManagementGuide,
  '/admin/calendar': adminCalendarGuide,
};

export function getGuide(pathname: string): Guide | null {
  // 1. Exact match
  if (GUIDE_MAP[pathname]) return GUIDE_MAP[pathname];

  // 2. Param match
  for (const [pattern, guide] of Object.entries(GUIDE_MAP)) {
    if (matchPath(pattern, pathname)) return guide;
  }

  // 3. Role fallback
  if (pathname.startsWith('/student/')) return defaultGuide('Student');
  if (pathname.startsWith('/instructor/')) return defaultGuide('Instructor');
  if (pathname.startsWith('/admin/')) return defaultGuide('Admin');

  // 4. Public fallback — no guide for static pages
  return null;
}
