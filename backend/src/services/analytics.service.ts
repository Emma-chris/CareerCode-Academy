import { query } from '../config/db';

const CACHE_TTL_MS = 30000;
const cache = new Map<string, { data: any; expiresAt: number }>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number = CACHE_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

function rangeInterval(range: string): string {
  const map: Record<string, string> = {
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y': '1 year',
  };
  return map[range] || '7 days';
}

function granularityExpr(range: string): { trunc: string; label: string } {
  if (range === '24h') return { trunc: "DATE_TRUNC('hour', created_at)::date", label: "to_char(created_at, 'HH24:00')" };
  if (range === '7d') return { trunc: 'DATE(created_at)', label: "to_char(created_at, 'Mon DD')" };
  return { trunc: "DATE_TRUNC('day', created_at)::date", label: "to_char(created_at, 'Mon DD')" };
}

export async function getOverview(range: string = '7d') {
  const cacheKey = `overview_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [totalVisitors, returningVisitors, pageViews, activeVisitors, bounceSessions] = await Promise.all([
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE created_at > NOW() - INTERVAL '${interval}'`),
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE visit_count > 1 AND created_at > NOW() - INTERVAL '${interval}'`),
    query(`SELECT COUNT(*)::int as count FROM page_views WHERE created_at > NOW() - INTERVAL '${interval}'`),
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE is_active = true`),
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE visit_count = 1 AND created_at > NOW() - INTERVAL '${interval}'`),
  ]);

  const total = totalVisitors.rows[0].count;
  const returning = returningVisitors.rows[0].count;
  const views = pageViews.rows[0].count;
  const active = activeVisitors.rows[0].count;
  const bounced = bounceSessions.rows[0].count;

  const uniqueVisitors = total;
  const returningRate = total > 0 ? Math.round((returning / total) * 100) : 0;
  const bounceRate = total > 0 ? Math.round((bounced / total) * 100) : 0;
  const avgSessionDuration = await query(
    `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start))), 0)::int as avg_sec
     FROM visitors WHERE session_start > NOW() - INTERVAL '${interval}' AND session_start IS NOT NULL`
  );

  const result = {
    totalVisitors: total,
    uniqueVisitors,
    returningVisitors: returning,
    returningRate,
    totalPageViews: views,
    bounceRate,
    avgSessionDuration: avgSessionDuration.rows[0]?.avg_sec || 0,
    activeVisitors: active,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getVisitorTrend(range: string = '7d') {
  const cacheKey = `visitor_trend_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);
  const g = granularityExpr(range);

  const result = await query(
    `SELECT ${g.trunc} as date, ${g.label} as label,
            COUNT(DISTINCT visitor_id)::int as visitors,
            COUNT(*)::int as page_views
     FROM page_views
     WHERE created_at > NOW() - INTERVAL '${interval}'
     GROUP BY date, label
     ORDER BY date`
  );

  setCache(cacheKey, result.rows);
  return result.rows;
}

export async function getPageAnalytics(range: string = '7d') {
  const cacheKey = `page_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [mostVisited, landingPages, exitPages] = await Promise.all([
    query(
      `SELECT page_url, COUNT(*)::int as views,
              COUNT(DISTINCT visitor_id)::int as unique_visitors,
              ROUND(AVG(time_spent_sec))::int as avg_time_sec
       FROM page_views
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT 20`
    ),
    query(
      `SELECT page_url, COUNT(*)::int as entries
       FROM page_views p1
       WHERE created_at > NOW() - INTERVAL '${interval}'
         AND NOT EXISTS (
           SELECT 1 FROM page_views p2
           WHERE p2.visitor_id = p1.visitor_id
             AND p2.created_at < p1.created_at
             AND p2.created_at > NOW() - INTERVAL '${interval}'
         )
       GROUP BY page_url
       ORDER BY entries DESC
       LIMIT 10`
    ),
    query(
      `SELECT pv.page_url, COUNT(*)::int as exits
       FROM page_views pv
       WHERE pv.is_exit_page = true
         AND pv.created_at > NOW() - INTERVAL '${interval}'
       GROUP BY pv.page_url
       ORDER BY exits DESC
       LIMIT 10`
    ),
  ]);

  const result = {
    mostVisited: mostVisited.rows,
    landingPages: landingPages.rows,
    exitPages: exitPages.rows,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getDeviceAnalytics(range: string = '7d') {
  const cacheKey = `device_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [devices, browsers, oss] = await Promise.all([
    query(
      `SELECT device_type, COUNT(*)::int as count
       FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY device_type
       ORDER BY count DESC`
    ),
    query(
      `SELECT browser, COUNT(*)::int as count
       FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY browser
       ORDER BY count DESC`
    ),
    query(
      `SELECT os, COUNT(*)::int as count
       FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY os
       ORDER BY count DESC`
    ),
  ]);

  const total = devices.rows.reduce((acc: number, r: any) => acc + r.count, 0);

  const result = {
    devices: devices.rows.map((r: any) => ({ ...r, percentage: total > 0 ? Math.round((r.count / total) * 100) : 0 })),
    browsers: browsers.rows.map((r: any) => ({ ...r, percentage: total > 0 ? Math.round((r.count / total) * 100) : 0 })),
    os: oss.rows.map((r: any) => ({ ...r, percentage: total > 0 ? Math.round((r.count / total) * 100) : 0 })),
    total,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getSourceAnalytics(range: string = '7d') {
  const cacheKey = `source_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const sources = await query(
    `SELECT
       COALESCE(NULLIF(referral_source, ''), 'Direct') as source,
       COUNT(*)::int as visitors,
       COUNT(*) FILTER (WHERE visit_count > 1)::int as returning
     FROM visitors
     WHERE created_at > NOW() - INTERVAL '${interval}'
     GROUP BY source
     ORDER BY visitors DESC`
  );

  const total = sources.rows.reduce((acc: number, r: any) => acc + r.visitors, 0);

  const result = sources.rows.map((r: any) => ({
    ...r,
    percentage: total > 0 ? Math.round((r.visitors / total) * 100) : 0,
    returningRate: r.visitors > 0 ? Math.round((r.returning / r.visitors) * 100) : 0,
  }));

  setCache(cacheKey, result);
  return result;
}

export async function getConversionFunnel(range: string = '7d') {
  const cacheKey = `conversion_funnel_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [totalVisitors, newRegistrations, totalEnrollments, sourceConversions] = await Promise.all([
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE created_at > NOW() - INTERVAL '${interval}'`),
    query(`SELECT COUNT(*)::int as count FROM users WHERE created_at > NOW() - INTERVAL '${interval}'`),
    query(`SELECT COUNT(*)::int as count FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '${interval}'`),
    query(
      `SELECT
         COALESCE(NULLIF(v.referral_source, ''), 'Direct') as source,
         COUNT(DISTINCT v.visitor_id)::int as visitors,
         COUNT(DISTINCT u.id) FILTER (WHERE u.id IS NOT NULL)::int as signups,
         COUNT(DISTINCT e.id)::int as enrollments
       FROM visitors v
       LEFT JOIN users u ON u.id = v.user_id AND u.created_at > NOW() - INTERVAL '${interval}'
       LEFT JOIN enrollments e ON e.user_id = v.user_id AND e.enrolled_at > NOW() - INTERVAL '${interval}'
       WHERE v.created_at > NOW() - INTERVAL '${interval}'
       GROUP BY source
       ORDER BY visitors DESC`
    ),
  ]);

  const visitors = totalVisitors.rows[0].count;
  const signups = newRegistrations.rows[0].count;
  const enrollments = totalEnrollments.rows[0].count;

  const result = {
    funnel: {
      visitors,
      signups,
      enrollments,
      visitorToSignup: visitors > 0 ? Math.round((signups / visitors) * 100) : 0,
      signupToEnrollment: signups > 0 ? Math.round((enrollments / signups) * 100) : 0,
      overallConversion: visitors > 0 ? Math.round((enrollments / visitors) * 10000) / 100 : 0,
    },
    sourcePerformance: sourceConversions.rows,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getJourneyAnalytics(range: string = '7d') {
  const cacheKey = `journey_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [commonPaths, dropOffs] = await Promise.all([
    query(
      `SELECT pages_visited, COUNT(*)::int as count,
              COUNT(*) FILTER (WHERE converted)::int as conversions
       FROM user_journeys
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY pages_visited
       ORDER BY count DESC
       LIMIT 20`
    ),
    query(
      `SELECT dropped_at_page, COUNT(*)::int as drop_offs
       FROM user_journeys
       WHERE dropped_at_page IS NOT NULL
         AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY dropped_at_page
       ORDER BY drop_offs DESC
       LIMIT 10`
    ),
  ]);

  const result = {
    commonPaths: commonPaths.rows,
    dropOffs: dropOffs.rows,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getCourseAnalytics(range: string = '7d') {
  const cacheKey = `course_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const courses = await query(
    `SELECT
       c.id, c.title, c.slug, c.price,
       COUNT(DISTINCT pv.id)::int as page_views,
       COUNT(DISTINCT e.id)::int as enrollments,
       COUNT(DISTINCT e.id) FILTER (WHERE e.completed)::int as completions,
       ROUND(COALESCE(AVG(r.rating), 0), 1)::float as avg_rating,
       COUNT(DISTINCT r.id)::int as review_count,
       COALESCE(SUM(p.amount), 0)::float as revenue,
       CASE WHEN COUNT(DISTINCT e.id) > 0
         THEN ROUND((COUNT(DISTINCT e.id) FILTER (WHERE e.completed)::decimal / COUNT(DISTINCT e.id)) * 100)
         ELSE 0
       END as completion_rate
     FROM courses c
     LEFT JOIN page_views pv ON pv.page_url LIKE '%' || c.slug || '%' AND pv.created_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN enrollments e ON e.course_id = c.id AND e.enrolled_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN reviews r ON r.course_id = c.id AND r.created_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN payments p ON p.course_id = c.id AND p.status = 'completed' AND p.created_at > NOW() - INTERVAL '${interval}'
     GROUP BY c.id, c.title, c.slug, c.price
     ORDER BY enrollments DESC
     LIMIT 20`
  );

  setCache(cacheKey, courses.rows);
  return courses.rows;
}

export async function getClickAnalytics(range: string = '7d') {
  const cacheKey = `click_analytics_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = rangeInterval(range);

  const [topClicks, topCtas] = await Promise.all([
    query(
      `SELECT element_text, element_type, page_url, COUNT(*)::int as clicks
       FROM click_events
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY element_text, element_type, page_url
       ORDER BY clicks DESC
       LIMIT 30`
    ),
    query(
      `SELECT element_text, COUNT(*)::int as clicks
       FROM click_events
       WHERE element_type IN ('button', 'cta', 'enroll', 'signup')
         AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY element_text
       ORDER BY clicks DESC
       LIMIT 10`
    ),
  ]);

  const result = {
    topClicks: topClicks.rows,
    topCtas: topCtas.rows,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getRealtimeStats() {
  const [activeVisitors, currentPages, todayRegistrations, todayEnrollments] = await Promise.all([
    query(`SELECT COUNT(*)::int as count FROM visitors WHERE is_active = true`),
    query(
      `SELECT pv.page_url, COUNT(DISTINCT pv.visitor_id)::int as viewers
       FROM page_views pv
       WHERE pv.created_at > NOW() - INTERVAL '5 minutes'
       GROUP BY pv.page_url
       ORDER BY viewers DESC
       LIMIT 10`
    ),
    query(`SELECT COUNT(*)::int as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'`),
    query(`SELECT COUNT(*)::int as count FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '24 hours'`),
  ]);

  return {
    activeVisitors: activeVisitors.rows[0]?.count || 0,
    currentPages: currentPages.rows,
    todayRegistrations: todayRegistrations.rows[0]?.count || 0,
    todayEnrollments: todayEnrollments.rows[0]?.count || 0,
  };
}

export async function getDashboardSummary() {
  const cacheKey = 'dashboard_summary';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [todayStats, overview, realtime] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM visitors WHERE created_at > NOW() - INTERVAL '24 hours') as visitors_today,
         (SELECT COUNT(*)::int FROM page_views WHERE created_at > NOW() - INTERVAL '24 hours') as page_views_today,
         (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as signups_today,
         (SELECT COUNT(*)::int FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '24 hours') as enrollments_today`
    ),
    getOverview('7d'),
    getRealtimeStats(),
  ]);

  const result = {
    today: todayStats.rows[0],
    overview,
    realtime,
  };

  setCache(cacheKey, result, 15000);
  return result;
}

export function clearAnalyticsCache(): void {
  cache.clear();
}
