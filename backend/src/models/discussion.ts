import { query } from '../config/db';

export interface Discussion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  likes_count: number;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
  user_name?: string;
  user_avatar?: string;
  reply_count?: number;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: Date;
  user_name?: string;
  user_avatar?: string;
}

export interface CreateDiscussionInput {
  user_id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface CreateReplyInput {
  discussion_id: string;
  user_id: string;
  content: string;
}

export async function createDiscussion(input: CreateDiscussionInput): Promise<Discussion> {
  const { rows } = await query<Discussion>(
    `INSERT INTO discussions (user_id, title, content, category, tags)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.user_id, input.title, input.content, input.category || 'General', JSON.stringify(input.tags || [])]
  );
  return rows[0];
}

export async function getDiscussions(options: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Discussion[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.category && options.category !== 'All') {
    conditions.push(`d.category = $${paramIdx++}`);
    params.push(options.category);
  }
  if (options.search) {
    conditions.push(`(d.title ILIKE $${paramIdx} OR d.content ILIKE $${paramIdx})`);
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const { rows } = await query<Discussion>(
    `SELECT d.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     ${where}
     ORDER BY d.pinned DESC, d.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );
  return rows;
}

export async function getDiscussionById(id: string): Promise<Discussion | null> {
  const { rows } = await query<Discussion>(
    `SELECT d.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function incrementDiscussionViews(id: string): Promise<void> {
  await query('UPDATE discussions SET views = views + 1 WHERE id = $1', [id]);
}

export async function updateDiscussion(id: string, input: Partial<CreateDiscussionInput> & { pinned?: boolean }): Promise<Discussion | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key === 'pinned' ? 'pinned' : key;
      fields.push(`${snakeKey} = $${paramIdx++}`);
      values.push(key === 'tags' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return getDiscussionById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Discussion>(
    `UPDATE discussions SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteDiscussion(id: string): Promise<boolean> {
  await query('DELETE FROM discussion_replies WHERE discussion_id = $1', [id]);
  const { rowCount } = await query('DELETE FROM discussions WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Replies ----

export async function createReply(input: CreateReplyInput): Promise<DiscussionReply> {
  const { rows } = await query<DiscussionReply>(
    `INSERT INTO discussion_replies (discussion_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.discussion_id, input.user_id, input.content]
  );
  return rows[0];
}

export async function getRepliesByDiscussion(discussionId: string): Promise<DiscussionReply[]> {
  const { rows } = await query<DiscussionReply>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM discussion_replies r
     JOIN users u ON r.user_id = u.id
     WHERE r.discussion_id = $1
     ORDER BY r.created_at ASC`,
    [discussionId]
  );
  return rows;
}

export async function getReplyById(id: string): Promise<DiscussionReply | null> {
  const { rows } = await query<DiscussionReply>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM discussion_replies r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function deleteReply(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM discussion_replies WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getDiscussionCategories(): Promise<string[]> {
  const { rows } = await query(
    'SELECT DISTINCT category FROM discussions ORDER BY category ASC'
  );
  return rows.map(r => r.category);
}
