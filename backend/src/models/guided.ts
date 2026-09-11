import { query } from '../config/db';
import { NotFoundError } from '../utils/errors';
import { awardXp } from './gamification';

export interface GuidedEnrollment {
  id: string;
  user_id: string;
  path_id: string;
  mode: 'active' | 'paused';
  day_index: number;
  start_date: Date | string;
  created_at: Date;
  updated_at: Date;
}

export async function enrollInPath(userId: string, pathId: string): Promise<GuidedEnrollment> {
  const coursesRes = await query(
    `SELECT lpc.course_id, COALESCE(e.completed, false) AS completed
     FROM learning_path_courses lpc
     LEFT JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1
     WHERE lpc.path_id = $2
     ORDER BY lpc.order_index ASC`,
    [userId, pathId]
  );
  const courses = coursesRes.rows as { course_id: string; completed: boolean }[];
  let startDay = 0;
  for (let i = 0; i < courses.length; i++) {
    if (!courses[i].completed) {
      startDay = i;
      break;
    }
    startDay = i + 1;
  }

  const { rows } = await query<GuidedEnrollment>(
    `INSERT INTO guided_enrollments (user_id, path_id, day_index, mode)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (user_id, path_id)
     DO UPDATE SET mode = 'active', day_index = guided_enrollments.day_index, updated_at = NOW()
     RETURNING *`,
    [userId, pathId, startDay]
  );
  return rows[0];
}

export async function getEnrollmentByPath(userId: string, pathId: string): Promise<GuidedEnrollment | null> {
  const { rows } = await query<GuidedEnrollment>(
    'SELECT * FROM guided_enrollments WHERE user_id = $1 AND path_id = $2',
    [userId, pathId]
  );
  return rows[0] || null;
}

export async function setEnrollmentMode(userId: string, pathId: string, mode: 'active' | 'paused'): Promise<GuidedEnrollment | null> {
  const { rows } = await query<GuidedEnrollment>(
    `UPDATE guided_enrollments SET mode = $3, updated_at = NOW()
     WHERE user_id = $1 AND path_id = $2 RETURNING *`,
    [userId, pathId, mode]
  );
  return rows[0] || null;
}

async function getStreak(userId: string): Promise<number> {
  const { rows } = await query(
    `SELECT DISTINCT checkin_date FROM daily_checkins
     WHERE user_id = $1 AND checkin_date >= (CURRENT_DATE - INTERVAL '60 days')
     ORDER BY checkin_date DESC`,
    [userId]
  );
  if (rows.length === 0) return 0;

  const days = new Set(rows.map((r) => String(r.checkin_date)));
  let streak = 0;
  const cursor = new Date();
  // If today not checked yet, allow streak counting from yesterday
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getTodayCheckin(userId: string): Promise<any | null> {
  const { rows } = await query(
    'SELECT * FROM daily_checkins WHERE user_id = $1 AND checkin_date = CURRENT_DATE',
    [userId]
  );
  return rows[0] || null;
}

async function getRecentBlocks(userId: string, days = 7): Promise<number> {
  const { rows } = await query(
    `SELECT COALESCE(SUM(blocks_completed), 0)::int AS total
     FROM daily_checkins
     WHERE user_id = $1 AND checkin_date >= CURRENT_DATE - $2::int * INTERVAL '1 day'`,
    [userId, days]
  );
  return Number(rows[0]?.total) || 0;
}

export async function getTodayState(userId: string, pathId: string): Promise<any> {
  const enrollment = await getEnrollmentByPath(userId, pathId);
  if (!enrollment) throw new NotFoundError('Guided enrollment');

  const pathRes = await query('SELECT id, title, slug FROM learning_paths WHERE id = $1', [pathId]);
  const path = pathRes.rows[0];
  const coursesRes = await query(
    `SELECT lpc.order_index, lpc.course_id, c.title, c.slug, c.level, c.thumbnail, c.duration, c.category,
            u.name AS instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON c.id = lpc.course_id
     JOIN users u ON u.id = c.instructor_id
     WHERE lpc.path_id = $1
     ORDER BY lpc.order_index ASC`,
    [pathId]
  );
  const courses = coursesRes.rows;

  const finished = enrollment.day_index >= courses.length;
  const currentIndex = Math.min(enrollment.day_index, Math.max(courses.length - 1, 0));
  const currentCourse = finished ? null : courses[currentIndex];

  let lessons: any[] = [];
  let completedLessonIds: string[] = [];
  let gate: any = null;
  if (currentCourse) {
    const lessonsRes = await query(
      `SELECT id, title, description, duration, is_free, order_index, video_url
       FROM lessons WHERE course_id = $1 ORDER BY order_index ASC`,
      [currentCourse.course_id]
    );
    lessons = lessonsRes.rows;
    const completedRes = await query(
      `SELECT lesson_id FROM guided_loop_entries
       WHERE guided_enrollment_id = $1 AND completed = true AND course_id = $2`,
      [enrollment.id, currentCourse.course_id]
    );
    completedLessonIds = completedRes.rows.map((r) => r.lesson_id);

    const quizRes = await query(
      `SELECT q.id, q.title, q.passing_score, q.time_limit
       FROM quizzes q WHERE q.course_id = $1 AND q.published = true
       ORDER BY (q.lesson_id IS NULL) DESC, q.created_at ASC LIMIT 1`,
      [currentCourse.course_id]
    );
    if (quizRes.rows[0]) {
      const quiz = quizRes.rows[0];
      const attemptRes = await query(
        'SELECT passed FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 LIMIT 1',
        [quiz.id, userId]
      );
      gate = {
        id: quiz.id,
        title: quiz.title,
        passing_score: quiz.passing_score,
        time_limit: quiz.time_limit,
        passed: attemptRes.rows[0]?.passed === true,
      };
    }
  }

  const allLessonsDone = currentCourse
    ? lessons.length > 0 && lessons.every((l) => completedLessonIds.includes(l.id))
    : false;
  const gatePassed = gate ? gate.passed : true;
  const dayReady = finished || (gate ? gatePassed : true);

  const [streak, todayCheckin, blocks7] = await Promise.all([
    getStreak(userId),
    getTodayCheckin(userId),
    getRecentBlocks(userId, 7),
  ]);

  return {
    path,
    enrollment: {
      id: enrollment.id,
      day_index: enrollment.day_index,
      mode: enrollment.mode,
      start_date: enrollment.start_date,
    },
    finished,
    currentDay: finished ? courses.length : enrollment.day_index + 1,
    totalDays: courses.length,
    course: currentCourse && {
      ...currentCourse,
      lessons,
      completedLessonIds,
      all_lessons_done: allLessonsDone,
      gate,
      gate_passed: gatePassed,
      day_ready: dayReady,
    },
    streak,
    today_checkin: todayCheckin,
    blocks_this_week: blocks7,
  };
}

export async function markLessonComplete(userId: string, pathId: string, lessonId: string): Promise<any> {
  const enrollment = await getEnrollmentByPath(userId, pathId);
  if (!enrollment) throw new NotFoundError('Guided enrollment');
  if (enrollment.mode !== 'active') return { error: 'Guided mode is paused' };

  const lessonRes = await query('SELECT id, course_id FROM lessons WHERE id = $1', [lessonId]);
  const lesson = lessonRes.rows[0];
  if (!lesson) throw new NotFoundError('Lesson');

  const courseOrderRes = await query(
    'SELECT order_index FROM learning_path_courses WHERE path_id = $1 AND course_id = $2',
    [enrollment.path_id, lesson.course_id]
  );
  const courseOrder = courseOrderRes.rows[0];
  if (!courseOrder) throw new NotFoundError('Course in path');
  if (courseOrder.order_index > enrollment.day_index) {
    return { error: 'This lesson is not unlocked yet' };
  }

  await query(
    `INSERT INTO guided_loop_entries (guided_enrollment_id, day_index, course_id, lesson_id, completed, completed_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (guided_enrollment_id, lesson_id)
     DO UPDATE SET completed = true, completed_at = NOW()`,
    [enrollment.id, courseOrder.order_index, lesson.course_id, lessonId]
  );

  const state = await getTodayState(userId, pathId);
  const currentCourse = state.course;
  if (currentCourse && !state.finished && currentCourse.all_lessons_done && state.gate_passed) {
    const next = Math.min(enrollment.day_index + 1, state.totalDays);
    await query(
      'UPDATE guided_enrollments SET day_index = $3, updated_at = NOW() WHERE user_id = $1 AND path_id = $2',
      [userId, pathId, next]
    );
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Day complete!', $2, 'guided_day')`,
      [userId, `You finished day ${state.currentDay} of "${state.path.title}" in Guided Mode.`]
    );
    const { rows } = await query(
      'SELECT * FROM guided_enrollments WHERE user_id = $1 AND path_id = $2',
      [userId, pathId]
    );
    const updated = rows[0];
    return {
      advanced: true,
      day_index: updated.day_index,
      state: await getTodayState(userId, pathId),
    };
  }

  return { advanced: false, day_index: enrollment.day_index, state: await getTodayState(userId, pathId) };
}

export async function checkIn(userId: string, input: { productive?: number; energy?: number; blocks_completed?: number }): Promise<any> {
  const productive = Math.max(1, Math.min(5, Number(input.productive) || 3));
  const energy = Math.max(1, Math.min(5, Number(input.energy) || 3));
  const blocks = Math.max(0, Number(input.blocks_completed) || 0);

  const { rows } = await query(
    `INSERT INTO daily_checkins (user_id, checkin_date, productive, energy, blocks_completed, claimed)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, false)
     ON CONFLICT (user_id, checkin_date)
     DO UPDATE SET productive = $2, energy = $3,
       blocks_completed = GREATEST(daily_checkins.blocks_completed, $4), updated_at = NOW()
     RETURNING *`,
    [userId, productive, energy, blocks]
  );
  const row = rows[0];

  if (blocks >= 4 && !row.claimed) {
    await query('UPDATE daily_checkins SET claimed = true WHERE id = $1', [row.id]);
    await awardXp(userId, 30, 'guided_checkin', 'Completed 4+ guided blocks in a day');
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Check-in bonus!', $2, 'guided_checkin')`,
      [userId, 'Nice work — you completed 4+ guided blocks today. +30 XP earned.']
    );
  }

  return {
    checkin: row,
    streak: await getStreak(userId),
    claimed_xp: blocks >= 4,
  };
}

export async function getReadiness(userId: string, pathId?: string): Promise<any> {
  const guidedRes = await query(
    `SELECT ge.path_id, lp.title, lp.slug, ge.mode
     FROM guided_enrollments ge
     JOIN learning_paths lp ON lp.id = ge.path_id
     WHERE ge.user_id = $1
       AND ($2::uuid IS NULL OR ge.path_id = $2)
     ORDER BY ge.updated_at DESC`,
    [userId, pathId || null]
  );

  const enrollments: any[] = [];
  for (const g of guidedRes.rows) {
    const totalRes = await query(
      'SELECT COUNT(*)::int AS n FROM learning_path_courses WHERE path_id = $1',
      [g.path_id]
    );
    const doneRes = await query(
      `SELECT COUNT(DISTINCT c.id)::int AS n
       FROM learning_path_courses lpc
       JOIN courses c ON c.id = lpc.course_id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1 AND e.completed = true
       WHERE lpc.path_id = $2`,
      [userId, g.path_id]
    );
    const total = Number(totalRes.rows[0]?.n) || 0;
    const done = Number(doneRes.rows[0]?.n) || 0;
    enrollments.push({
      path_id: g.path_id,
      title: g.title,
      slug: g.slug,
      mode: g.mode,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      completed: total > 0 && done >= total,
    });
  }

  const [streak, blocks7] = await Promise.all([getStreak(userId), getRecentBlocks(userId, 7)]);

  return {
    enrollments,
    readiness_score: enrollments.length
      ? Math.round(enrollments.reduce((a, b) => a + Number(b.progress || 0), 0) / enrollments.length)
      : 0,
    streak,
    blocks_this_week: blocks7,
    active_guided: await getActiveGuided(userId),
  };
}

export async function getActiveGuided(userId: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT ge.*, lp.title, lp.slug, lp.icon, lp.color
     FROM guided_enrollments ge
     JOIN learning_paths lp ON lp.id = ge.path_id
     WHERE ge.user_id = $1 AND ge.mode = 'active'
     ORDER BY ge.updated_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getAccountability(userId: string, pathId?: string): Promise<any> {
  const activeGuidId = pathId || (await getActiveGuided(userId))?.path_id;
  if (!activeGuidId) return { active: false, message: 'No active guided path' };

  const [state, checkins, done] = await Promise.all([
    getTodayState(userId, activeGuidId),
    query(
      `SELECT checkin_date, productive, energy, blocks_completed
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date > (CURRENT_DATE - INTERVAL '14 days')
       ORDER BY checkin_date DESC`,
      [userId]
    ),
    query(
      `SELECT COUNT(*)::int AS n FROM guided_loop_entries
       WHERE guided_enrollment_id = (SELECT id FROM guided_enrollments WHERE user_id = $1 AND path_id = $2) AND completed = true`,
      [userId, activeGuidId]
    ),
  ]);

  return {
    active: true,
    path: state.path,
    enrollment: state.enrollment,
    current_day: state.currentDay,
    total_days: state.totalDays,
    finished: state.finished,
    gate_passed: state.course?.gate_passed ?? null,
    lessons_done_today: state.course?.completedLessonIds?.length || 0,
    lessons_today: state.course?.lessons?.length || 0,
    total_lessons_done: Number(done.rows[0]?.n) || 0,
    streak: state.streak,
    blocks_this_week: state.blocks_this_week,
    checkins: checkins.rows,
  };
}