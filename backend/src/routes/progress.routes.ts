import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { emitStudentUpdate } from '../config/socket';
import { awardXp, updateStreak } from '../models/gamification';

const router = Router();

// GET /progress?courseId=xxx - get lesson progress for a course
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const courseId = req.query.courseId as string;

      if (!courseId) {
        return res.status(400).json({ success: false, error: 'courseId is required' });
      }

      const { rows } = await query(
        `SELECT lp.*, l.title as lesson_title
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = $1 AND lp.course_id = $2
         ORDER BY l.order_index`,
        [userId, courseId]
      );

      const totalRes = await query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const totalLessons = parseInt(totalRes.rows[0].count, 10);
      const completedCount = rows.filter((r: any) => r.completed).length;

      res.json({
        success: true,
        data: {
          progress: rows,
          completedLessons: completedCount,
          totalLessons,
          percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /progress - update lesson completion
router.post(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { lessonId, completed } = req.body;

      if (!lessonId) {
        return res.status(400).json({ success: false, error: 'lessonId is required' });
      }

      // Get lesson info
      const lessonRes = await query(
        'SELECT id, course_id FROM lessons WHERE id = $1',
        [lessonId]
      );
      if (lessonRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }
      const { course_id: courseId } = lessonRes.rows[0];

      // If marking complete, check quiz gate
      if (completed) {
        const quizRes = await query(
          'SELECT id, passing_score FROM quizzes WHERE lesson_id = $1 AND published = true',
          [lessonId]
        );
        if (quizRes.rows.length > 0) {
          const quiz = quizRes.rows[0];
          const attemptRes = await query(
            'SELECT passed FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
            [quiz.id, userId]
          );
          const passed = attemptRes.rows.length > 0 && attemptRes.rows[0].passed;
          if (!passed) {
            return res.status(403).json({
              success: false,
              error: 'You must pass the lesson quiz before marking this lesson complete',
              quizRequired: true,
              quizId: quiz.id,
            });
          }
        }
      }

      // Upsert lesson progress
      const existing = await query(
        'SELECT id FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
        [userId, lessonId]
      );

      if (existing.rows.length > 0) {
        await query(
          `UPDATE lesson_progress SET completed = $1, completed_at = $2, updated_at = NOW()
           WHERE user_id = $3 AND lesson_id = $4`,
          [completed, completed ? new Date() : null, userId, lessonId]
        );
      } else {
        await query(
          `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, lessonId, courseId, completed, completed ? new Date() : null]
        );
      }

      // Calculate overall progress
      const totalRes = await query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const completedRes = await query(
        `SELECT COUNT(*) as count FROM lesson_progress
         WHERE user_id = $1 AND course_id = $2 AND completed = true`,
        [userId, courseId]
      );
      const totalLessons = parseInt(totalRes.rows[0].count, 10);
      const completedCount = parseInt(completedRes.rows[0].count, 10);
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progress >= 100;

      // Update enrollment progress
      await query(
        `UPDATE enrollments SET progress = $1, completed = $2, updated_at = NOW()
         WHERE user_id = $3 AND course_id = $4`,
        [progress, isCompleted, userId, courseId]
      );

      if (isCompleted) {
        await query(
          `UPDATE enrollments SET status = 'completed', completed_at = NOW()
           WHERE user_id = $1 AND course_id = $2`,
          [userId, courseId]
        );

        // Auto-generate certificate if not exists
        const certExists = await query(
          'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
          [userId, courseId]
        );

        if (certExists.rows.length === 0) {
          const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          await query(
            `INSERT INTO certificates (user_id, course_id, verification_code)
             VALUES ($1, $2, $3)`,
            [userId, courseId, code]
          );

          // Notify student
          const courseInfo = await query('SELECT title FROM courses WHERE id = $1', [courseId]);
          const courseTitle = courseInfo.rows[0]?.title || 'Course';
          await query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, 'Certificate Earned!', $2, 'certificate')`,
            [userId, `Congratulations! You earned a certificate for "${courseTitle}"`]
          );

          // Gamification: award bonus XP for course completion
          await awardXp(userId, 50, 'course_complete', `Completed course: ${courseTitle}`);
        }
      }

      res.json({
        success: true,
        data: {
          completed,
          progress,
          completedCount,
          totalLessons,
          isCompleted,
        },
      });

      // Gamification: award XP and update streak for completed lessons
      if (completed) {
        const newTotal = await awardXp(userId, 10, 'lesson_complete', 'Completed a lesson');
        await updateStreak(userId);
        emitStudentUpdate(userId);
      } else {
        emitStudentUpdate(userId);
      }
    } catch (error) {
      next(error);
    }
  }
);

// GET /progress/detailed?courseId=xxx - practical learning detailed progress
router.get(
  '/detailed',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const courseId = req.query.courseId as string;
      if (!courseId) return res.status(400).json({ success: false, error: 'courseId is required' });

      // Use single aggregated query to avoid pool exhaustion (Neon free tier)
      let aggregated: any = null;
      try {
        const { rows } = await query(`
          SELECT
            (SELECT COUNT(*)::int FROM lessons WHERE course_id = $1) as total_lessons,
            (SELECT COUNT(*)::int FROM lesson_progress WHERE user_id = $2 AND course_id = $1 AND completed = true) as completed_lessons,
            (SELECT COUNT(*)::int FROM quizzes WHERE course_id = $1) as total_quizzes,
            (SELECT COUNT(*)::int FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE q.course_id = $1 AND qa.user_id = $2 AND qa.passed = true) as passed_quizzes,
            (SELECT COUNT(*)::int FROM coding_challenges cc JOIN lessons l ON cc.lesson_id = l.id WHERE l.course_id = $1) as total_challenges,
            (SELECT COUNT(*)::int FROM challenge_submissions cs JOIN coding_challenges cc ON cs.challenge_id = cc.id JOIN lessons l ON cc.lesson_id = l.id WHERE l.course_id = $1 AND cs.user_id = $2 AND cs.passed = true) as passed_challenges,
            (SELECT COUNT(*)::int FROM assignments WHERE course_id = $1) as total_assignments,
            (SELECT COUNT(*)::int FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE a.course_id = $1 AND s.student_id = $2) as submitted_assignments
        `, [courseId, userId]);
        aggregated = rows[0];
      } catch (e: any) {
        // Fallback sequential with defaults on failure
        console.warn('Detailed progress aggregated query failed, falling back:', e.message);
        aggregated = {
          total_lessons: 0, completed_lessons: 0,
          total_quizzes: 0, passed_quizzes: 0,
          total_challenges: 0, passed_challenges: 0,
          total_assignments: 0, submitted_assignments: 0,
        };
        try {
          const r1 = await query('SELECT COUNT(*)::int as total FROM lessons WHERE course_id = $1', [courseId]);
          aggregated.total_lessons = r1.rows[0].total;
        } catch {}
        try {
          const r2 = await query('SELECT COUNT(*)::int as total FROM lesson_progress WHERE user_id = $1 AND course_id = $2 AND completed = true', [userId, courseId]);
          aggregated.completed_lessons = r2.rows[0].total;
        } catch {}
      }

      const totalLessons = aggregated.total_lessons ?? 0;
      const completedLessons = aggregated.completed_lessons ?? 0;
      const totalQuizzes = aggregated.total_quizzes ?? 0;
      const passedQuizzes = aggregated.passed_quizzes ?? 0;
      const totalChallenges = aggregated.total_challenges ?? 0;
      const passedChallenges = aggregated.passed_challenges ?? 0;
      const totalAssignments = aggregated.total_assignments ?? 0;
      const submittedAssignments = aggregated.submitted_assignments ?? 0;

      // Projects considered as assignments + challenges combined for now
      const totalProjects = totalAssignments + totalChallenges;
      const completedProjects = submittedAssignments + passedChallenges;

      const overall = totalLessons + totalQuizzes + totalChallenges + totalAssignments > 0
        ? Math.round(((completedLessons + passedQuizzes + passedChallenges + submittedAssignments) / (totalLessons + totalQuizzes + totalChallenges + totalAssignments)) * 100)
        : Math.round((completedLessons / Math.max(totalLessons,1))*100);

      // Streak - reuse logic inline (with fallback)
      let streak = 0;
      try {
        const streakRes = await query(
          `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
          [userId]
        );
        if (streakRes.rows.length > 0) {
          streak = 1;
          const today = new Date(); today.setHours(0,0,0,0);
          const firstDay = new Date(streakRes.rows[0].day); firstDay.setHours(0,0,0,0);
          const diffDays = Math.floor((today.getTime() - firstDay.getTime())/(1000*60*60*24));
          if (diffDays <= 1) {
            for(let i=1;i<streakRes.rows.length;i++){
              const prev = new Date(streakRes.rows[i-1].day);
              const curr = new Date(streakRes.rows[i].day);
              if ((prev.getTime()-curr.getTime())/(1000*60*60*24)===1) streak++; else break;
            }
          } else streak = 0;
        }
      } catch (e: any) {
        console.warn('Streak query failed:', e.message);
        streak = 0;
      }

      res.json({
        success: true,
        data: {
          lessons: { completed: completedLessons, total: totalLessons },
          exercises: { completed: passedChallenges, total: totalChallenges },
          quizzes: { completed: passedQuizzes, total: totalQuizzes },
          projects: { completed: completedProjects, total: totalProjects, assignments: { completed: submittedAssignments, total: totalAssignments }, challenges: { completed: passedChallenges, total: totalChallenges } },
          overall,
          streak,
        }
      });
    } catch (error) { next(error); }
  }
);

// GET /progress/modules?courseId=xxx - per-module progress
router.get(
  '/modules',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const courseId = req.query.courseId as string;
      if (!courseId) return res.status(400).json({ success: false, error: 'courseId is required' });

      const { rows } = await query(
        `SELECT m.id, m.title, m.order_index,
                COUNT(l.id)::int as total_lessons,
                COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::int as completed_lessons,
                COALESCE(ROUND((COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::float / NULLIF(COUNT(l.id),0) * 100))::int,0) as percentage
         FROM modules m
         LEFT JOIN lessons l ON l.module_id = m.id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
         WHERE m.course_id = $1
         GROUP BY m.id, m.title, m.order_index
         ORDER BY m.order_index ASC`,
        [courseId, userId]
      );

      // Include ungrouped lessons as pseudo-module
      const ungroupedRes = await query(
        `SELECT COUNT(l.id)::int as total_lessons,
                COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::int as completed_lessons
         FROM lessons l
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
         WHERE l.course_id = $1 AND l.module_id IS NULL`,
        [courseId, userId]
      );
      const modules = [...rows];
      if (ungroupedRes.rows[0].total_lessons > 0) {
        const ug = ungroupedRes.rows[0];
        modules.push({
          id: 'ungrouped',
          title: 'Course Content',
          order_index: 9999,
          total_lessons: ug.total_lessons,
          completed_lessons: ug.completed_lessons,
          percentage: ug.total_lessons ? Math.round((ug.completed_lessons/ug.total_lessons)*100) : 0,
        });
      }

      res.json({ success: true, data: modules });
    } catch (error) { next(error); }
  }
);

// GET /progress/continue-watching - get last watched lessons per course
router.get(
  '/continue-watching',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { rows } = await query(
        `SELECT DISTINCT ON (lp.course_id)
           lp.course_id, l.title as lesson_title, lp.watch_position, lp.watch_percentage,
           c.title as course_title, c.slug as course_slug, c.thumbnail
         FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         JOIN courses c ON lp.course_id = c.id
         WHERE lp.user_id = $1 AND lp.completed = false
         ORDER BY lp.course_id, lp.updated_at DESC
         LIMIT 10`,
        [userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /progress/watch-position - update watch position
router.put(
  '/watch-position',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { lessonId, courseId, watchPosition, watchPercentage } = req.body;

      const { rows } = await query(
        `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, watch_position, watch_percentage)
         VALUES ($1, $2, $3, false, $4, $5)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET
           watch_position = COALESCE($4, lesson_progress.watch_position),
           watch_percentage = COALESCE($5, lesson_progress.watch_percentage),
           updated_at = NOW()
         RETURNING *`,
        [userId, lessonId, courseId, watchPosition ?? 0, watchPercentage ?? 0]
      );

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
