import { query } from '../config/db';
import { createNotification } from '../models/notification';
import { Server } from 'socket.io';

const REMINDER_INTERVALS = [
  { label: '7 days', hours: 168, minutes: 10080 },
  { label: '3 days', hours: 72, minutes: 4320 },
  { label: '24 hours', hours: 24, minutes: 1440 },
  { label: '1 hour', hours: 1, minutes: 60 },
  { label: '15 minutes', hours: 0.25, minutes: 15 },
];

let interval: ReturnType<typeof setInterval> | null = null;

export function startCalendarReminderWorker(io: Server) {
  if (interval) return;
  interval = setInterval(async () => {
    try {
      const now = new Date();

      // ---- calendar_events table reminders ----
      for (const reminder of REMINDER_INTERVALS) {
        const target = new Date(now.getTime() + reminder.hours * 60 * 60 * 1000);

        const events = await query(`
          SELECT ce.id, ce.title, ce.start_datetime, ce.event_type, ce.visibility,
                 ce.visibility_target_id, ce.created_by, ce.instructor_id
          FROM calendar_events ce
          WHERE ce.start_datetime BETWEEN $1 AND $2
            AND ce.status IN ('scheduled', 'live')
            AND ce.reminder_minutes @> ARRAY[$3::int]
        `, [new Date(target.getTime() - 60000), target, reminder.minutes]);

        for (const ev of events.rows) {
          // Check if reminder already sent
          const alreadySent = await query(`
            SELECT 1 FROM calendar_event_reminders
            WHERE event_id = $1 AND minutes_before = $2
          `, [ev.id, reminder.minutes]);
          if (alreadySent.rows.length > 0) continue;

          // Determine who to notify
          let userIds: string[] = [];

          if (ev.visibility === 'public') {
            // Notify all users
            const allUsers = await query(`SELECT id FROM users WHERE is_suspended = false`);
            userIds = allUsers.rows.map((u: any) => u.id);
          } else if (ev.visibility === 'students_only') {
            const students = await query(`SELECT id FROM users WHERE role = 'student' AND is_suspended = false`);
            userIds = students.rows.map((u: any) => u.id);
          } else if (ev.visibility === 'specific_school' && ev.visibility_target_id) {
            const enrolled = await query(`
              SELECT DISTINCT e.user_id as id
              FROM enrollments e
              JOIN courses co ON co.id = e.course_id
              WHERE co.school_id = $1
            `, [ev.visibility_target_id]);
            userIds = enrolled.rows.map((u: any) => u.id);
          } else {
            // For other visibility types, notify enrolled students of associated course
            const courseStudents = await query(`
              SELECT user_id as id FROM enrollments WHERE course_id = (
                SELECT course_id FROM calendar_events WHERE id = $1
              )
            `, [ev.id]);
            userIds = courseStudents.rows.map((u: any) => u.id);
          }

          for (const userId of userIds) {
            await createNotification({
              user_id: userId,
              title: `Upcoming: ${ev.title}`,
              message: `"${ev.title}" starts in ${reminder.label}. Don't miss it!`,
              type: reminder.minutes <= 60 ? 'warning' : 'info',
            });
            io.to(userId).emit('new_notification', {
              title: `Upcoming: ${ev.title}`,
              message: `"${ev.title}" starts in ${reminder.label}`,
              type: reminder.minutes <= 60 ? 'warning' : 'info',
            });
          }

          // Mark reminder as sent for this interval
          await query(`
            INSERT INTO calendar_event_reminders (event_id, user_id, minutes_before)
            SELECT $1, unnest(ARRAY(SELECT unnest($2::uuid[]))), $3
            ON CONFLICT DO NOTHING
          `, [ev.id, userIds, reminder.minutes]);
        }
      }

      // ---- Live classes (legacy) ----
      for (const reminder of REMINDER_INTERVALS) {
        const target = new Date(now.getTime() + reminder.hours * 60 * 60 * 1000);

        const liveClasses = await query(`
          SELECT lc.id, lc.title, lc.scheduled_at, lc.course_id, c.title as course_title
          FROM live_classes lc
          JOIN courses c ON c.id = lc.course_id
          WHERE lc.scheduled_at BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const lc of liveClasses.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [lc.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Upcoming Live Class: ${lc.title}`,
              message: `"${lc.title}" starts in ${reminder.label}. Join on time!`,
              type: 'info',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Upcoming Live Class: ${lc.title}`,
              message: `"${lc.title}" starts in ${reminder.label}. Join on time!`,
              type: 'info',
            });
          }
        }

        // Assignments due soon
        const assignments = await query(`
          SELECT a.id, a.title, a.due_date, a.course_id, c.title as course_title
          FROM assignments a
          JOIN courses c ON c.id = a.course_id
          WHERE a.due_date BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const a of assignments.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [a.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Assignment Due: ${a.title}`,
              message: `"${a.title}" is due in ${reminder.label}. Don't forget to submit!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Assignment Due: ${a.title}`,
              message: `"${a.title}" is due in ${reminder.label}. Don't forget to submit!`,
              type: 'warning',
            });
          }
        }

        // Quizzes due soon
        const quizzes = await query(`
          SELECT q.id, q.title, q.due_date, q.course_id, c.title as course_title
          FROM quizzes q
          JOIN courses c ON c.id = q.course_id
          WHERE q.due_date IS NOT NULL AND q.due_date BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const q of quizzes.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [q.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Quiz Due: ${q.title}`,
              message: `"${q.title}" is due in ${reminder.label}. Complete it before the deadline!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Quiz Due: ${q.title}`,
              message: `"${q.title}" is due in ${reminder.label}. Complete it before the deadline!`,
              type: 'warning',
            });
          }
        }

        // Exams starting soon
        const exams = await query(`
          SELECT e.id, e.title, e.starts_at, e.course_id, c.title as course_title
          FROM exams e
          JOIN courses c ON c.id = e.course_id
          WHERE e.starts_at IS NOT NULL AND e.starts_at BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const ex of exams.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [ex.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Exam Starting: ${ex.title}`,
              message: `"${ex.title}" starts in ${reminder.label}. Be prepared!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Exam Starting: ${ex.title}`,
              message: `"${ex.title}" starts in ${reminder.label}. Be prepared!`,
              type: 'warning',
            });
          }
        }
      }
    } catch (err) {
    }
  }, 60000);
}

export function stopCalendarReminderWorker() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
