import { query } from '../config/db';

export interface Visitor {
  id: string;
  visitor_id: string;
  user_id: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referral_source: string | null;
  landing_page: string | null;
  first_visit: Date;
  last_visit: Date;
  visit_count: number;
  session_start: Date;
  session_end: Date | null;
  is_active: boolean;
  created_at: Date;
}

export interface PageView {
  id: string;
  visitor_id: string;
  user_id: string | null;
  page_url: string;
  route_name: string | null;
  time_spent_sec: number;
  is_exit_page: boolean;
  created_at: Date;
}

export interface ClickEvent {
  id: string;
  visitor_id: string;
  user_id: string | null;
  page_url: string;
  element_selector: string | null;
  element_text: string | null;
  element_type: string | null;
  created_at: Date;
}

export interface ScrollEvent {
  id: string;
  visitor_id: string;
  user_id: string | null;
  page_url: string;
  depth_25: boolean;
  depth_50: boolean;
  depth_75: boolean;
  depth_100: boolean;
  max_depth: number;
  created_at: Date;
}

export interface UserJourney {
  id: string;
  visitor_id: string;
  user_id: string | null;
  pages_visited: string[];
  conversion_type: string | null;
  converted: boolean;
  enrolled_course_id: string | null;
  dropped_at_page: string | null;
  journey_duration_sec: number;
  created_at: Date;
}

export async function upsertVisitor(visitorId: string, data: {
  user_id?: string | null;
  ip_address?: string | null;
  country?: string | null;
  city?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  referral_source?: string | null;
  landing_page?: string | null;
}): Promise<Visitor> {
  const existing = await query<Visitor>(
    `SELECT * FROM visitors WHERE visitor_id = $1`,
    [visitorId]
  );

  if (existing.rows.length > 0) {
    const { rows } = await query<Visitor>(
      `UPDATE visitors SET
        user_id = COALESCE($2, user_id),
        ip_address = COALESCE($3, ip_address),
        country = COALESCE($4, country),
        city = COALESCE($5, city),
        device_type = COALESCE($6, device_type),
        browser = COALESCE($7, browser),
        os = COALESCE($8, os),
        referral_source = COALESCE($9, referral_source),
        landing_page = COALESCE($10, landing_page),
        last_visit = NOW(),
        visit_count = visit_count + 1,
        session_start = CASE WHEN session_end IS NULL OR session_end < NOW() - INTERVAL '30 minutes' THEN NOW() ELSE session_start END,
        session_end = NULL,
        is_active = true
      WHERE visitor_id = $1
      RETURNING *`,
      [visitorId, data.user_id, data.ip_address, data.country, data.city, data.device_type, data.browser, data.os, data.referral_source, data.landing_page]
    );
    return rows[0];
  }

  const { rows } = await query<Visitor>(
    `INSERT INTO visitors (visitor_id, user_id, ip_address, country, city, device_type, browser, os, referral_source, landing_page)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [visitorId, data.user_id, data.ip_address, data.country, data.city, data.device_type, data.browser, data.os, data.referral_source, data.landing_page]
  );
  return rows[0];
}

export async function endSession(visitorId: string): Promise<void> {
  await query(
    `UPDATE visitors SET session_end = NOW(), is_active = false WHERE visitor_id = $1 AND is_active = true`,
    [visitorId]
  );
}

export async function insertPageView(data: {
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  route_name?: string | null;
  time_spent_sec?: number;
  is_exit_page?: boolean;
}): Promise<PageView> {
  const { rows } = await query<PageView>(
    `INSERT INTO page_views (visitor_id, user_id, page_url, route_name, time_spent_sec, is_exit_page)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.visitor_id, data.user_id || null, data.page_url, data.route_name || null, data.time_spent_sec || 0, data.is_exit_page || false]
  );
  return rows[0];
}

export async function insertClickEvent(data: {
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  element_selector?: string | null;
  element_text?: string | null;
  element_type?: string | null;
}): Promise<ClickEvent> {
  const { rows } = await query<ClickEvent>(
    `INSERT INTO click_events (visitor_id, user_id, page_url, element_selector, element_text, element_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.visitor_id, data.user_id || null, data.page_url, data.element_selector || null, data.element_text || null, data.element_type || null]
  );
  return rows[0];
}

export async function upsertScrollEvent(data: {
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  depth_25?: boolean;
  depth_50?: boolean;
  depth_75?: boolean;
  depth_100?: boolean;
  max_depth?: number;
}): Promise<ScrollEvent> {
  const existing = await query<ScrollEvent>(
    `SELECT * FROM scroll_events WHERE visitor_id = $1 AND page_url = $2 AND created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 1`,
    [data.visitor_id, data.page_url]
  );

  if (existing.rows.length > 0) {
    const { rows } = await query<ScrollEvent>(
      `UPDATE scroll_events SET
        depth_25 = depth_25 OR $3,
        depth_50 = depth_50 OR $4,
        depth_75 = depth_75 OR $5,
        depth_100 = depth_100 OR $6,
        max_depth = GREATEST(max_depth, $7)
      WHERE id = $1
      RETURNING *`,
      [existing.rows[0].id, null, data.depth_25 || false, data.depth_50 || false, data.depth_75 || false, data.depth_100 || false, data.max_depth || 0]
    );
    return rows[0];
  }

  const { rows } = await query<ScrollEvent>(
    `INSERT INTO scroll_events (visitor_id, user_id, page_url, depth_25, depth_50, depth_75, depth_100, max_depth)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.visitor_id, data.user_id || null, data.page_url, data.depth_25 || false, data.depth_50 || false, data.depth_75 || false, data.depth_100 || false, data.max_depth || 0]
  );
  return rows[0];
}

export async function upsertUserJourney(data: {
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  conversion_type?: string | null;
  converted?: boolean;
  enrolled_course_id?: string | null;
}): Promise<UserJourney> {
  const existing = await query<UserJourney>(
    `SELECT * FROM user_journeys WHERE visitor_id = $1 AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 1`,
    [data.visitor_id]
  );

  if (existing.rows.length > 0) {
    const journey = existing.rows[0];
    const pages = [...journey.pages_visited];
    if (!pages.includes(data.page_url)) {
      pages.push(data.page_url);
    }

    const { rows } = await query<UserJourney>(
      `UPDATE user_journeys SET
        pages_visited = $2,
        conversion_type = COALESCE($3, conversion_type),
        converted = $4 OR converted,
        enrolled_course_id = COALESCE($5, enrolled_course_id),
        journey_duration_sec = EXTRACT(EPOCH FROM (NOW() - created_at))::int
      WHERE id = $1
      RETURNING *`,
      [journey.id, pages, data.conversion_type || null, data.converted || false, data.enrolled_course_id || null]
    );
    return rows[0];
  }

  const { rows } = await query<UserJourney>(
    `INSERT INTO user_journeys (visitor_id, user_id, pages_visited, conversion_type, converted, enrolled_course_id)
     VALUES ($1, $2, ARRAY[$3], $4, $5, $6)
     RETURNING *`,
    [data.visitor_id, data.user_id || null, data.page_url, data.conversion_type || null, data.converted || false, data.enrolled_course_id || null]
  );
  return rows[0];
}

export async function batchInsertPageViews(views: Array<{
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  route_name?: string | null;
  time_spent_sec?: number;
  is_exit_page?: boolean;
}>): Promise<void> {
  if (views.length === 0) return;
  const values = views.map((_, i) =>
    `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
  ).join(',');
  const params = views.flatMap(v => [v.visitor_id, v.user_id || null, v.page_url, v.route_name || null, v.time_spent_sec || 0, v.is_exit_page || false]);
  await query(
    `INSERT INTO page_views (visitor_id, user_id, page_url, route_name, time_spent_sec, is_exit_page) VALUES ${values}`,
    params
  );
}

export async function batchInsertClickEvents(events: Array<{
  visitor_id: string;
  user_id?: string | null;
  page_url: string;
  element_selector?: string | null;
  element_text?: string | null;
  element_type?: string | null;
}>): Promise<void> {
  if (events.length === 0) return;
  const values = events.map((_, i) =>
    `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
  ).join(',');
  const params = events.flatMap(v => [v.visitor_id, v.user_id || null, v.page_url, v.element_selector || null, v.element_text || null, v.element_type || null]);
  await query(
    `INSERT INTO click_events (visitor_id, user_id, page_url, element_selector, element_text, element_type) VALUES ${values}`,
    params
  );
}

export async function deactivateStaleSessions(minutes: number = 5): Promise<void> {
  await query(
    `UPDATE visitors SET is_active = false, session_end = NOW() WHERE is_active = true AND last_visit < NOW() - INTERVAL '${minutes} minutes'`
  );
}
