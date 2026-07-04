import { query } from '../config/db';

export interface ShowcaseVideo {
  id: string;
  entity_type: 'school' | 'program' | 'course';
  entity_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  provider: 'html5' | 'youtube' | 'vimeo';
  views: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VideoAnalytics {
  id: string;
  video_id: string;
  user_id: string | null;
  watch_duration: number;
  completed: boolean;
  ip_address: string | null;
  created_at: Date;
}

export interface VideoStats {
  total_views: number;
  unique_viewers: number;
  completions: number;
  avg_watch_duration: number;
  completion_rate: number;
}

// ── CRUD ──

export async function getVideosByEntity(entityType: string, entityId: string): Promise<ShowcaseVideo[]> {
  const { rows } = await query<ShowcaseVideo>(
    `SELECT * FROM showcase_videos
     WHERE entity_type = $1 AND entity_id = $2 AND is_active = true
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return rows;
}

export async function getVideoById(id: string): Promise<ShowcaseVideo | null> {
  const { rows } = await query<ShowcaseVideo>(
    'SELECT * FROM showcase_videos WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function getAllVideos(): Promise<ShowcaseVideo[]> {
  const { rows } = await query<ShowcaseVideo>(
    `SELECT sv.*,
            COALESCE(s.name, p.name, c.title) as entity_name
     FROM showcase_videos sv
     LEFT JOIN schools s ON sv.entity_type = 'school' AND s.id = sv.entity_id
     LEFT JOIN programs p ON sv.entity_type = 'program' AND p.id = sv.entity_id
     LEFT JOIN courses c ON sv.entity_type = 'course' AND c.id = sv.entity_id
     ORDER BY sv.created_at DESC`
  );
  return rows;
}

export async function createVideo(data: {
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  provider?: string;
}): Promise<ShowcaseVideo> {
  const { rows } = await query<ShowcaseVideo>(
    `INSERT INTO showcase_videos (entity_type, entity_id, title, description, video_url, thumbnail_url, duration, provider)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.entity_type,
      data.entity_id,
      data.title,
      data.description || null,
      data.video_url,
      data.thumbnail_url || null,
      data.duration || 0,
      data.provider || 'html5',
    ]
  );
  return rows[0];
}

export async function updateVideo(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    duration: number;
    provider: string;
    is_active: boolean;
  }>
): Promise<ShowcaseVideo | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getVideoById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query<ShowcaseVideo>(
    `UPDATE showcase_videos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteVideo(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM showcase_videos WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ── Analytics ──

export async function logVideoView(data: {
  video_id: string;
  user_id?: string;
  watch_duration: number;
  completed: boolean;
  ip_address?: string;
}): Promise<VideoAnalytics> {
  const { rows } = await query<VideoAnalytics>(
    `INSERT INTO video_analytics (video_id, user_id, watch_duration, completed, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.video_id, data.user_id || null, data.watch_duration, data.completed, data.ip_address || null]
  );

  await query(
    `UPDATE showcase_videos SET views = views + 1 WHERE id = $1`,
    [data.video_id]
  );

  return rows[0];
}

export async function getVideoStats(videoId: string): Promise<VideoStats> {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int as total_views,
       COUNT(DISTINCT user_id)::int as unique_viewers,
       COUNT(*) FILTER (WHERE completed = true)::int as completions,
       COALESCE(ROUND(AVG(watch_duration)::numeric, 0), 0)::int as avg_watch_duration
     FROM video_analytics
     WHERE video_id = $1`,
    [videoId]
  );

  const stats = rows[0];
  return {
    total_views: stats.total_views,
    unique_viewers: stats.unique_viewers,
    completions: stats.completions,
    avg_watch_duration: stats.avg_watch_duration,
    completion_rate: stats.total_views > 0
      ? Math.round((stats.completions / stats.total_views) * 100)
      : 0,
  };
}
