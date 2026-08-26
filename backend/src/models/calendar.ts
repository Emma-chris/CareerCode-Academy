import { query } from '../config/db';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  meeting_platform: string | null;
  color: string | null;
  course_id: string | null;
  module_id: string | null;
  program_id: string | null;
  cohort_id: string | null;
  school_id: string | null;
  instructor_id: string | null;
  community_id: string | null;
  channel_id: string | null;
  created_by: string;
  visibility: string;
  visibility_target_id: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  max_attendees: number | null;
  reminder_minutes: number[];
  created_at: string;
  updated_at: string;
  // Joined fields
  course_title?: string;
  instructor_name?: string;
  instructor_avatar?: string;
  school_name?: string;
  rsvp_count?: number;
  is_rsvpd?: boolean;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  timezone?: string;
  location?: string;
  meeting_url?: string;
  meeting_platform?: string;
  color?: string;
  course_id?: string;
  module_id?: string;
  program_id?: string;
  cohort_id?: string;
  school_id?: string;
  instructor_id?: string;
  community_id?: string;
  channel_id?: string;
  created_by: string;
  visibility?: string;
  visibility_target_id?: string;
  status?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  max_attendees?: number;
  reminder_minutes?: number[];
}

export interface UpdateEventInput extends Partial<Omit<CreateEventInput, 'created_by'>> {}

const EVENT_TYPE_COLORS: Record<string, string> = {
  live_session: '#3b82f6',
  class: '#6366f1',
  lecture: '#8b5cf6',
  module_release: '#a855f7',
  assignment: '#f97316',
  quiz: '#a855f7',
  exam: '#ef4444',
  challenge: '#eab308',
  project_deadline: '#f43f5e',
  code_review: '#14b8a6',
  mentorship: '#22c55e',
  career_event: '#06b6d4',
  community_event: '#ec4899',
  announcement: '#64748b',
  workshop: '#0ea5e9',
  meeting: '#6366f1',
};

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const { rows } = await query<CalendarEvent>(
    `INSERT INTO calendar_events (
      title, description, event_type, start_datetime, end_datetime, timezone,
      location, meeting_url, meeting_platform, color, course_id, module_id,
      program_id, cohort_id, school_id, instructor_id, community_id, channel_id,
      created_by, visibility, visibility_target_id, status, is_recurring,
      recurrence_rule, max_attendees, reminder_minutes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
    RETURNING *`,
    [
      input.title, input.description || null, input.event_type,
      input.start_datetime, input.end_datetime, input.timezone || 'UTC',
      input.location || null, input.meeting_url || null, input.meeting_platform || null,
      input.color || EVENT_TYPE_COLORS[input.event_type] || '#6366f1',
      input.course_id || null, input.module_id || null, input.program_id || null,
      input.cohort_id || null, input.school_id || null, input.instructor_id || null,
      input.community_id || null, input.channel_id || null,
      input.created_by, input.visibility || 'public',
      input.visibility_target_id || null, input.status || 'scheduled',
      input.is_recurring || false, input.recurrence_rule || null,
      input.max_attendees || null, input.reminder_minutes || [1440, 60, 15],
    ]
  );
  return rows[0];
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const allowedFields = [
    'title', 'description', 'event_type', 'start_datetime', 'end_datetime',
    'timezone', 'location', 'meeting_url', 'meeting_platform', 'color',
    'course_id', 'module_id', 'program_id', 'cohort_id', 'school_id',
    'instructor_id', 'community_id', 'channel_id', 'visibility',
    'visibility_target_id', 'status', 'is_recurring', 'recurrence_rule',
    'max_attendees', 'reminder_minutes',
  ];

  for (const key of allowedFields) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push((input as any)[key]);
      idx++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query<CalendarEvent>(
    `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM calendar_events WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getEventById(id: string, userId?: string): Promise<CalendarEvent | null> {
  const { rows } = await query<CalendarEvent>(
    `SELECT ce.*,
      c.title as course_title,
      u.name as instructor_name, u.avatar as instructor_avatar,
      s.name as school_name,
      (SELECT COUNT(*)::int FROM calendar_event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count
      ${userId ? `, (SELECT EXISTS(SELECT 1 FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = $2 AND status = 'going')) as is_rsvpd` : ''}
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    LEFT JOIN users u ON u.id = ce.instructor_id
    LEFT JOIN schools s ON s.id = ce.school_id
    WHERE ce.id = $1`,
    userId ? [id, userId] : [id]
  );
  return rows[0] || null;
}

export interface GetEventsParams {
  start?: string;
  end?: string;
  event_type?: string;
  status?: string;
  course_id?: string;
  instructor_id?: string;
  school_id?: string;
  community_id?: string;
  created_by?: string;
  visibility?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getEvents(params: GetEventsParams, userId?: string, userRole?: string): Promise<{ events: CalendarEvent[]; total: number }> {
  const conditions: string[] = [];
  const whereValues: any[] = [];
  let idx = 1;

  // Visibility filtering (server-side authorization)
  if (userId && userRole && !['admin', 'super_admin'].includes(userRole)) {
    conditions.push(`(
      ce.visibility = 'public'
      OR ce.created_by = $${idx}
      OR ce.instructor_id = $${idx}
    )`);
    whereValues.push(userId);
    idx++;
  }

  if (params.start) {
    conditions.push(`ce.end_datetime >= $${idx}`);
    whereValues.push(params.start);
    idx++;
  }
  if (params.end) {
    conditions.push(`ce.start_datetime <= $${idx}`);
    whereValues.push(params.end);
    idx++;
  }
  if (params.event_type) {
    conditions.push(`ce.event_type = $${idx}`);
    whereValues.push(params.event_type);
    idx++;
  }
  if (params.status) {
    conditions.push(`ce.status = $${idx}`);
    whereValues.push(params.status);
    idx++;
  }
  if (params.course_id) {
    conditions.push(`ce.course_id = $${idx}`);
    whereValues.push(params.course_id);
    idx++;
  }
  if (params.instructor_id) {
    conditions.push(`ce.instructor_id = $${idx}`);
    whereValues.push(params.instructor_id);
    idx++;
  }
  if (params.school_id) {
    conditions.push(`ce.school_id = $${idx}`);
    whereValues.push(params.school_id);
    idx++;
  }
  if (params.community_id) {
    conditions.push(`ce.community_id = $${idx}`);
    whereValues.push(params.community_id);
    idx++;
  }
  if (params.created_by) {
    conditions.push(`ce.created_by = $${idx}`);
    whereValues.push(params.created_by);
    idx++;
  }
  if (params.search) {
    conditions.push(`(ce.title ILIKE $${idx} OR ce.description ILIKE $${idx})`);
    whereValues.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query uses only WHERE-condition params
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM calendar_events ce ${where}`,
    whereValues
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const limit = params.limit || 50;
  const page = params.page || 1;
  const offset = (page - 1) * limit;

  // Main query: append userId as the last param for rsvp_status subquery
  const mainValues = userId ? [...whereValues, userId] : whereValues;
  const userIdParam = userId ? `$${idx}` : null;

  const { rows } = await query<CalendarEvent>(
    `SELECT ce.*,
      c.title as course_title,
      u.name as instructor_name, u.avatar as instructor_avatar,
      s.name as school_name,
      (SELECT COUNT(*)::int FROM calendar_event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count
      ${userIdParam ? `, COALESCE((SELECT status FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = ${userIdParam}), '') as rsvp_status` : ''}
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    LEFT JOIN users u ON u.id = ce.instructor_id
    LEFT JOIN schools s ON s.id = ce.school_id
    ${where}
    ORDER BY ce.start_datetime ASC
    LIMIT ${limit} OFFSET ${offset}`,
    mainValues
  );

  return { events: rows, total };
}

export async function getEventsForRange(start: string, end: string, userId?: string, userRole?: string): Promise<CalendarEvent[]> {
  const conditions: string[] = ['ce.start_datetime <= $2', 'ce.end_datetime >= $1'];
  const values: any[] = [start, end];
  let idx = 3;

  if (userId && userRole && !['admin', 'super_admin'].includes(userRole)) {
    conditions.push(`(ce.visibility = 'public' OR ce.created_by = $${idx} OR ce.instructor_id = $${idx})`);
    values.push(userId);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await query<CalendarEvent>(
    `SELECT ce.*,
      c.title as course_title,
      u.name as instructor_name, u.avatar as instructor_avatar,
      (SELECT COUNT(*)::int FROM calendar_event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    LEFT JOIN users u ON u.id = ce.instructor_id
    ${where}
    ORDER BY ce.start_datetime ASC`,
    values
  );
  return rows;
}

export async function getUpcomingEvents(userId: string, userRole: string, limit: number = 10): Promise<CalendarEvent[]> {
  const conditions: string[] = [
    'ce.start_datetime >= NOW()',
    `ce.status IN ('scheduled', 'live')`,
  ];
  const values: any[] = [userId];
  let idx = 2;

  if (!['admin', 'super_admin'].includes(userRole)) {
    conditions.push(`(ce.visibility = 'public' OR ce.created_by = $1 OR ce.instructor_id = $1)`);
  }

  const { rows } = await query<CalendarEvent>(
    `SELECT ce.*,
      c.title as course_title,
      u.name as instructor_name, u.avatar as instructor_avatar,
      (SELECT COUNT(*)::int FROM calendar_event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count,
      COALESCE((SELECT status FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = $1), '') as rsvp_status
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    LEFT JOIN users u ON u.id = ce.instructor_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ce.start_datetime ASC
    LIMIT ${limit}`,
    values
  );
  return rows;
}

export async function getStats(): Promise<{
  total: number;
  scheduled: number;
  live: number;
  completed: number;
  cancelled: number;
  draft: number;
  by_type: Record<string, number>;
}> {
  const { rows } = await query(
    `SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
      COUNT(*) FILTER (WHERE status = 'live')::int as live,
      COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
      COUNT(*) FILTER (WHERE status = 'draft')::int as draft
    FROM calendar_events`
  );

  const typeRows = await query(
    `SELECT event_type, COUNT(*)::int as count FROM calendar_events GROUP BY event_type`
  );
  const by_type: Record<string, number> = {};
  for (const row of typeRows.rows) {
    by_type[row.event_type] = row.count;
  }

  return { ...rows[0], by_type };
}

// RSVP
export async function setRsvp(eventId: string, userId: string, status: string): Promise<void> {
  await query(
    `INSERT INTO calendar_event_rsvps (event_id, user_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3`,
    [eventId, userId, status]
  );
}

export async function getRsvps(eventId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT r.*, u.name, u.avatar FROM calendar_event_rsvps r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = $1 ORDER BY r.created_at ASC`,
    [eventId]
  );
  return rows;
}

export async function toggleReminderSent(eventId: string, userId: string, minutesBefore: number): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM calendar_event_reminders WHERE event_id = $1 AND user_id = $2 AND minutes_before = $3) as exists`,
    [eventId, userId, minutesBefore]
  );
  if (rows[0]?.exists) return false;

  await query(
    `INSERT INTO calendar_event_reminders (event_id, user_id, minutes_before) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [eventId, userId, minutesBefore]
  );
  return true;
}
