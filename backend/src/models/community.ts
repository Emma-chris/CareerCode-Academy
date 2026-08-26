import { query } from '../config/db';

// ── Types ──────────────────────────────────────────────────────

export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: Date;
}

export interface CommunityChannel {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  type: 'text' | 'announcement' | 'project_showcase';
  is_public: boolean;
  is_archived: boolean;
  created_by: string | null;
  course_id: string | null;
  lesson_id: string | null;
  max_members: number | null;
  member_count: number;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  category_name?: string;
  category_slug?: string;
  is_member?: boolean;
  my_role?: string;
  unread_count?: number;
  last_message_at?: Date;
  last_message_content?: string;
  last_message_author?: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  last_read_at: Date;
  is_muted: boolean;
  joined_at: Date;
  // Joined
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_role?: string;
  is_online?: boolean;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  deleted_at: Date | null;
  deleted_by: string | null;
  parent_message_id: string | null;
  is_thread_parent: boolean;
  thread_count: number;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined
  author_name?: string;
  author_avatar?: string | null;
  author_role?: string;
  reactions?: ReactionGroup[];
  is_pinned?: boolean;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ChannelPin {
  id: string;
  channel_id: string;
  message_id: string;
  pinned_by: string;
  created_at: Date;
}

export interface CommunityReport {
  id: string;
  reporter_id: string;
  target_type: 'message' | 'user';
  target_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelInvite {
  id: string;
  channel_id: string;
  created_by: string;
  code: string;
  max_uses: number | null;
  use_count: number;
  expires_at: Date | null;
  created_at: Date;
}

// ── Categories ─────────────────────────────────────────────────

export async function getCategories(): Promise<CommunityCategory[]> {
  const { rows } = await query<CommunityCategory>(
    `SELECT * FROM community_categories ORDER BY sort_order, name`
  );
  return rows;
}

export async function getCategoryBySlug(slug: string): Promise<CommunityCategory | null> {
  const { rows } = await query<CommunityCategory>(
    `SELECT * FROM community_categories WHERE slug = $1`, [slug]
  );
  return rows[0] || null;
}

// ── Channels ───────────────────────────────────────────────────

export async function getChannels(userId: string): Promise<CommunityChannel[]> {
  const { rows } = await query<CommunityChannel>(
    `SELECT cc.*,
       ccat.name AS category_name, ccat.slug AS category_slug,
       CASE WHEN cm.id IS NOT NULL THEN true ELSE false END AS is_member,
       COALESCE(cm.role, 'none') AS my_role,
       (SELECT COUNT(*) FROM channel_members WHERE channel_id = cc.id) AS member_count,
       (SELECT MAX(created_at) FROM channel_messages WHERE channel_id = cc.id AND deleted = false) AS last_message_at,
       (SELECT content FROM channel_messages WHERE channel_id = cc.id AND deleted = false ORDER BY created_at DESC LIMIT 1) AS last_message_content,
       (SELECT u.name FROM channel_messages chm JOIN users u ON u.id = chm.author_id WHERE chm.channel_id = cc.id AND chm.deleted = false ORDER BY chm.created_at DESC LIMIT 1) AS last_message_author
     FROM community_channels cc
     LEFT JOIN community_categories ccat ON ccat.id = cc.category_id
     LEFT JOIN channel_members cm ON cm.channel_id = cc.id AND cm.user_id = $1
     WHERE cc.is_archived = false
     ORDER BY ccat.sort_order, cc.name`,
    [userId]
  );
  return rows;
}

export async function getChannelById(id: string): Promise<CommunityChannel | null> {
  const { rows } = await query<CommunityChannel>(
    `SELECT cc.*,
       ccat.name AS category_name, ccat.slug AS category_slug,
       (SELECT COUNT(*) FROM channel_members WHERE channel_id = cc.id) AS member_count
     FROM community_channels cc
     LEFT JOIN community_categories ccat ON ccat.id = cc.category_id
     WHERE cc.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createChannel(input: {
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  type?: string;
  is_public?: boolean;
  created_by: string;
  course_id?: string;
  lesson_id?: string;
}): Promise<CommunityChannel> {
  const { rows } = await query<CommunityChannel>(
    `INSERT INTO community_channels (category_id, name, slug, description, type, is_public, created_by, course_id, lesson_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [input.category_id || null, input.name, input.slug, input.description || null, input.type || 'text', input.is_public ?? true, input.created_by, input.course_id || null, input.lesson_id || null]
  );
  const channel = rows[0];
  // Auto-join creator as owner
  await joinChannel(channel.id, input.created_by, 'owner');
  return channel;
}

export async function updateChannel(id: string, input: {
  name?: string;
  description?: string;
  is_archived?: boolean;
  category_id?: string;
}): Promise<CommunityChannel | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  if (fields.length === 0) return getChannelById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<CommunityChannel>(
    `UPDATE community_channels SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteChannel(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM community_channels WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ── Members ────────────────────────────────────────────────────

export async function joinChannel(channelId: string, userId: string, role: string = 'member'): Promise<ChannelMember> {
  const { rows } = await query<ChannelMember>(
    `INSERT INTO channel_members (channel_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel_id, user_id) DO NOTHING
     RETURNING *`,
    [channelId, userId, role]
  );
  return rows[0];
}

export async function leaveChannel(channelId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2 AND role != $3',
    [channelId, userId, 'owner']
  );
  return (rowCount ?? 0) > 0;
}

export async function isChannelMember(channelId: string, userId: string): Promise<ChannelMember | null> {
  const { rows } = await query<ChannelMember>(
    'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );
  return rows[0] || null;
}

export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const { rows } = await query<ChannelMember>(
    `SELECT cm.*,
       u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar, u.role AS user_role
     FROM channel_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.channel_id = $1
     ORDER BY
       CASE cm.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
       u.name`,
    [channelId]
  );
  return rows;
}

export async function updateMemberRole(channelId: string, userId: string, role: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE channel_members SET role = $3 WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId, role]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateLastRead(channelId: string, userId: string): Promise<void> {
  await query(
    'UPDATE channel_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );
}

// ── Messages ───────────────────────────────────────────────────

export async function getChannelMessages(
  channelId: string,
  limit: number = 50,
  before?: string
): Promise<ChannelMessage[]> {
  let sql = `
    SELECT cm.*,
      u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role
    FROM channel_messages cm
    JOIN users u ON u.id = cm.author_id
    WHERE cm.channel_id = $1 AND cm.parent_message_id IS NULL
  `;
  const params: any[] = [channelId];

  if (before) {
    params.push(before);
    sql += ` AND cm.created_at < (SELECT created_at FROM channel_messages WHERE id = $${params.length})`;
  }

  sql += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await query<ChannelMessage>(sql, params);

  // Fetch reactions for each message
  if (rows.length > 0) {
    const ids = rows.map((m) => m.id);
    const { rows: reactions } = await query(
      `SELECT mr.message_id, mr.emoji, mr.user_id
       FROM message_reactions mr
       WHERE mr.message_id = ANY($1)`,
      [ids]
    );

    const reactionMap = new Map<string, Map<string, { count: number; userIds: string[] }>>();
    for (const r of reactions) {
      if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, new Map());
      const emojiMap = reactionMap.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, { count: 0, userIds: [] });
      const group = emojiMap.get(r.emoji)!;
      group.count++;
      group.userIds.push(r.user_id);
    }

    for (const msg of rows) {
      const emojiMap = reactionMap.get(msg.id);
      msg.reactions = emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            user_ids: data.userIds,
          }))
        : [];
    }
  }

  return rows.reverse(); // oldest first for display
}

export async function getMessageById(id: string): Promise<ChannelMessage | null> {
  const { rows } = await query<ChannelMessage>(
    `SELECT cm.*, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role
     FROM channel_messages cm
     JOIN users u ON u.id = cm.author_id
     WHERE cm.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createMessage(input: {
  channel_id: string;
  author_id: string;
  content: string;
  parent_message_id?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
}): Promise<ChannelMessage> {
  const { rows } = await query<ChannelMessage>(
    `INSERT INTO channel_messages (channel_id, author_id, content, parent_message_id, attachment_url, attachment_type, attachment_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.channel_id, input.author_id, input.content, input.parent_message_id || null, input.attachment_url || null, input.attachment_type || null, input.attachment_name || null]
  );
  const msg = rows[0];

  // If thread reply, increment parent's thread_count
  if (input.parent_message_id) {
    await query(
      'UPDATE channel_messages SET thread_count = thread_count + 1 WHERE id = $1',
      [input.parent_message_id]
    );
  }

  // Fetch author info
  const { rows: author } = await query<{ name: string; avatar: string | null; role: string }>(
    'SELECT name, avatar, role FROM users WHERE id = $1',
    [input.author_id]
  );
  msg.author_name = author[0]?.name;
  msg.author_avatar = author[0]?.avatar;
  msg.author_role = author[0]?.role;
  msg.reactions = [];

  return msg;
}

export async function editMessage(id: string, userId: string, content: string): Promise<ChannelMessage | null> {
  const { rows } = await query<ChannelMessage>(
    `UPDATE channel_messages SET content = $1, edited = true, updated_at = NOW()
     WHERE id = $2 AND author_id = $3 AND deleted = false
     RETURNING *`,
    [content, id, userId]
  );
  return rows[0] || null;
}

export async function deleteMessage(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE channel_messages SET deleted = true, deleted_at = NOW(), deleted_by = $2, content = '' WHERE id = $1 AND (author_id = $2 OR EXISTS (
      SELECT 1 FROM channel_members cm WHERE cm.channel_id = channel_messages.channel_id AND cm.user_id = $2 AND cm.role IN ('owner', 'moderator')
    ))`,
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

// ── Thread replies ─────────────────────────────────────────────

export async function getThreadReplies(parentMessageId: string): Promise<ChannelMessage[]> {
  const { rows } = await query<ChannelMessage>(
    `SELECT cm.*, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role
     FROM channel_messages cm
     JOIN users u ON u.id = cm.author_id
     WHERE cm.parent_message_id = $1 AND cm.deleted = false
     ORDER BY cm.created_at ASC`,
    [parentMessageId]
  );

  if (rows.length > 0) {
    const ids = rows.map((m) => m.id);
    const { rows: reactions } = await query(
      `SELECT mr.message_id, mr.emoji, mr.user_id
       FROM message_reactions mr WHERE mr.message_id = ANY($1)`,
      [ids]
    );
    const reactionMap = new Map<string, Map<string, { count: number; userIds: string[] }>>();
    for (const r of reactions) {
      if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, new Map());
      const emojiMap = reactionMap.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, { count: 0, userIds: [] });
      const group = emojiMap.get(r.emoji)!;
      group.count++;
      group.userIds.push(r.user_id);
    }
    for (const msg of rows) {
      const emojiMap = reactionMap.get(msg.id);
      msg.reactions = emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, data]) => ({ emoji, count: data.count, user_ids: data.userIds }))
        : [];
    }
  }

  return rows;
}

// ── Reactions ──────────────────────────────────────────────────

export async function addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  await query(
    `INSERT INTO message_reactions (message_id, user_id, emoji)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
    [messageId, userId, emoji]
  );
}

export async function removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
    [messageId, userId, emoji]
  );
  return (rowCount ?? 0) > 0;
}

// ── Pins ───────────────────────────────────────────────────────

export async function pinMessage(channelId: string, messageId: string, userId: string): Promise<ChannelPin> {
  const { rows } = await query<ChannelPin>(
    `INSERT INTO channel_pins (channel_id, message_id, pinned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel_id, message_id) DO NOTHING
     RETURNING *`,
    [channelId, messageId, userId]
  );
  return rows[0];
}

export async function unpinMessage(channelId: string, messageId: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM channel_pins WHERE channel_id = $1 AND message_id = $2',
    [channelId, messageId]
  );
  return (rowCount ?? 0) > 0;
}

export async function getPinnedMessages(channelId: string): Promise<ChannelMessage[]> {
  const { rows } = await query<ChannelMessage>(
    `SELECT cm.*, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role, true AS is_pinned
     FROM channel_pins cp
     JOIN channel_messages cm ON cm.id = cp.message_id
     JOIN users u ON u.id = cm.author_id
     WHERE cp.channel_id = $1 AND cm.deleted = false
     ORDER BY cp.created_at DESC`,
    [channelId]
  );
  return rows;
}

// ── Search ─────────────────────────────────────────────────────

export async function searchMessages(userId: string, queryText: string, limit: number = 20): Promise<ChannelMessage[]> {
  const { rows } = await query<ChannelMessage>(
    `SELECT cm.*, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role,
       cc.name AS channel_name
     FROM channel_messages cm
     JOIN users u ON u.id = cm.author_id
     JOIN community_channels cc ON cc.id = cm.channel_id
     JOIN channel_members cmm ON cmm.channel_id = cm.channel_id AND cmm.user_id = $1
     WHERE cm.deleted = false AND cm.content ILIKE $2
     ORDER BY cm.created_at DESC
     LIMIT $3`,
    [userId, `%${queryText}%`, limit]
  );
  return rows;
}

// ── Reports ────────────────────────────────────────────────────

export async function createReport(input: {
  reporter_id: string;
  target_type: 'message' | 'user';
  target_id: string;
  reason: string;
  description?: string;
}): Promise<CommunityReport> {
  const { rows } = await query<CommunityReport>(
    `INSERT INTO community_reports (reporter_id, target_type, target_id, reason, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.reporter_id, input.target_type, input.target_id, input.reason, input.description || null]
  );
  return rows[0];
}

export async function getReports(status?: string): Promise<CommunityReport[]> {
  let sql = `SELECT cr.*, u.name AS reporter_name
     FROM community_reports cr
     JOIN users u ON u.id = cr.reporter_id`;
  const params: any[] = [];

  if (status) {
    sql += ` WHERE cr.status = $1`;
    params.push(status);
  }

  sql += ` ORDER BY cr.created_at DESC LIMIT 50`;
  const { rows } = await query<CommunityReport>(sql, params);
  return rows;
}

export async function updateReportStatus(id: string, status: string, reviewedBy?: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE community_reports SET status = $1, reviewed_by = $2, updated_at = NOW() WHERE id = $3`,
    [status, reviewedBy || null, id]
  );
  return (rowCount ?? 0) > 0;
}

// ── Moderation ─────────────────────────────────────────────────

export async function createModerationAction(input: {
  moderator_id: string;
  target_user_id: string;
  channel_id?: string;
  action: string;
  reason?: string;
  duration?: string;
}): Promise<void> {
  let expiresAt = null;
  if (input.duration) {
    expiresAt = new Date(Date.now() + parseInterval(input.duration));
  }

  await query(
    `INSERT INTO community_moderation_actions (moderator_id, target_user_id, channel_id, action, reason, duration, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.moderator_id, input.target_user_id, input.channel_id || null, input.action, input.reason || null, input.duration || null, expiresAt]
  );

  // Apply mute/ban
  if (input.channel_id && (input.action === 'mute' || input.action === 'ban')) {
    await query(
      'UPDATE channel_members SET is_muted = true WHERE channel_id = $1 AND user_id = $2',
      [input.channel_id, input.target_user_id]
    );
  }
  if (input.channel_id && (input.action === 'unmute' || input.action === 'unban')) {
    await query(
      'UPDATE channel_members SET is_muted = false WHERE channel_id = $1 AND user_id = $2',
      [input.channel_id, input.target_user_id]
    );
  }
}

function parseInterval(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3600000; // default 1h
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  switch (unit) {
    case 'm': return n * 60 * 1000;
    case 'h': return n * 3600 * 1000;
    case 'd': return n * 86400000;
    default: return 3600000;
  }
}

// ── Invites ────────────────────────────────────────────────────

export async function createInvite(channelId: string, userId: string, maxUses?: number, expiresIn?: string): Promise<ChannelInvite> {
  const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + parseInterval(expiresIn));
  }

  const { rows } = await query<ChannelInvite>(
    `INSERT INTO channel_invites (channel_id, created_by, code, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [channelId, userId, code, maxUses || null, expiresAt]
  );
  return rows[0];
}

export async function findInviteByCode(code: string): Promise<ChannelInvite | null> {
  const { rows } = await query<ChannelInvite>(
    `SELECT * FROM channel_invites
     WHERE code = $1
       AND (max_uses IS NULL OR use_count < max_uses)
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [code]
  );
  return rows[0] || null;
}

export async function useInvite(code: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE channel_invites SET use_count = use_count + 1 WHERE code = $1',
    [code]
  );
  return (rowCount ?? 0) > 0;
}

// ── Stats ──────────────────────────────────────────────────────

export async function getChannelStats(channelId: string): Promise<{ totalMessages: number; totalMembers: number; activeToday: number }> {
  const { rows: msgCount } = await query(
    'SELECT COUNT(*) FROM channel_messages WHERE channel_id = $1 AND deleted = false',
    [channelId]
  );
  const { rows: memCount } = await query(
    'SELECT COUNT(*) FROM channel_members WHERE channel_id = $1',
    [channelId]
  );
  const { rows: activeCount } = await query(
    `SELECT COUNT(DISTINCT user_id) FROM channel_messages
     WHERE channel_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [channelId]
  );

  return {
    totalMessages: parseInt(msgCount[0].count, 10),
    totalMembers: parseInt(memCount[0].count, 10),
    activeToday: parseInt(activeCount[0].count, 10),
  };
}

// ── Communities ─────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  visibility: 'public' | 'private' | 'restricted';
  join_policy: 'open' | 'approval' | 'invite_only';
  created_by: string;
  member_count: number;
  channel_count: number;
  is_archived: boolean;
  rules: string | null;
  created_at: Date;
  updated_at: Date;
  creator_name?: string;
  creator_avatar?: string | null;
  is_member?: boolean;
  my_role?: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  is_muted: boolean;
  is_banned: boolean;
  joined_at: Date;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_role?: string;
  is_online?: boolean;
}

export interface CommunityRule {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface CommunityInvite {
  id: string;
  community_id: string;
  created_by: string;
  code: string;
  max_uses: number | null;
  use_count: number;
  expires_at: Date | null;
  created_at: Date;
}

export async function getCommunities(userId: string): Promise<Community[]> {
  const { rows } = await query<Community>(
    `SELECT c.*,
       u.name AS creator_name, u.avatar AS creator_avatar,
       CASE WHEN cm.id IS NOT NULL THEN true ELSE false END AS is_member,
       COALESCE(cm.role, 'none') AS my_role
     FROM communities c
     JOIN users u ON u.id = c.created_by
     LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = $1
     WHERE c.is_archived = false
     ORDER BY c.member_count DESC, c.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getCommunityById(id: string): Promise<Community | null> {
  const { rows } = await query<Community>(
    `SELECT c.*,
       u.name AS creator_name, u.avatar AS creator_avatar
     FROM communities c
     JOIN users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const { rows } = await query<Community>(
    `SELECT c.*,
       u.name AS creator_name, u.avatar AS creator_avatar
     FROM communities c
     JOIN users u ON u.id = c.created_by
     WHERE c.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

export async function createCommunity(input: {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  category?: string;
  visibility?: string;
  join_policy?: string;
  rules?: string;
  created_by: string;
}): Promise<Community> {
  const { rows } = await query<Community>(
    `INSERT INTO communities (name, slug, description, image_url, category, visibility, join_policy, rules, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.name,
      input.slug,
      input.description || null,
      input.image_url || null,
      input.category || 'general',
      input.visibility || 'public',
      input.join_policy || 'open',
      input.rules || null,
      input.created_by,
    ]
  );
  const community = rows[0];

  // Auto-add creator as owner
  await query(
    `INSERT INTO community_members (community_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (community_id, user_id) DO NOTHING`,
    [community.id, input.created_by]
  );

  // Update creator's member_count
  await query(
    'UPDATE communities SET member_count = member_count + 1 WHERE id = $1',
    [community.id]
  );

  community.member_count = 1;
  return community;
}

export async function updateCommunity(id: string, input: {
  name?: string;
  description?: string;
  image_url?: string;
  category?: string;
  visibility?: string;
  join_policy?: string;
  rules?: string;
}): Promise<Community | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  if (fields.length === 0) return getCommunityById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Community>(
    `UPDATE communities SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function archiveCommunity(id: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE communities SET is_archived = true, updated_at = NOW() WHERE id = $1',
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteCommunity(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM communities WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function isCommunityMember(communityId: string, userId: string): Promise<CommunityMember | null> {
  const { rows } = await query<CommunityMember>(
    'SELECT * FROM community_members WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return rows[0] || null;
}

export async function joinCommunity(communityId: string, userId: string, role: string = 'member'): Promise<CommunityMember> {
  const { rows } = await query<CommunityMember>(
    `INSERT INTO community_members (community_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (community_id, user_id) DO NOTHING
     RETURNING *`,
    [communityId, userId, role]
  );
  await query(
    'UPDATE communities SET member_count = member_count + 1 WHERE id = $1',
    [communityId]
  );
  return rows[0];
}

export async function leaveCommunity(communityId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2 AND role != $3',
    [communityId, userId, 'owner']
  );
  if ((rowCount ?? 0) > 0) {
    await query(
      'UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
      [communityId]
    );
    return true;
  }
  return false;
}

export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const { rows } = await query<CommunityMember>(
    `SELECT cm.*,
       u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar, u.role AS user_role
     FROM community_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.community_id = $1
     ORDER BY
       CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
       u.name`,
    [communityId]
  );
  return rows;
}

export async function updateCommunityMemberRole(communityId: string, userId: string, role: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_members SET role = $3 WHERE community_id = $1 AND user_id = $2',
    [communityId, userId, role]
  );
  return (rowCount ?? 0) > 0;
}

export async function banCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_members SET is_banned = true WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function unbanCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_members SET is_banned = false WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function muteCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_members SET is_muted = true WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function unmuteCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_members SET is_muted = false WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function getCommunityRules(communityId: string): Promise<CommunityRule[]> {
  const { rows } = await query<CommunityRule>(
    `SELECT * FROM community_rules
     WHERE community_id = $1 AND is_active = true
     ORDER BY sort_order, created_at`,
    [communityId]
  );
  return rows;
}

export async function createCommunityRule(communityId: string, input: {
  title: string;
  description?: string;
  sort_order?: number;
}): Promise<CommunityRule> {
  const { rows } = await query<CommunityRule>(
    `INSERT INTO community_rules (community_id, title, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [communityId, input.title, input.description || null, input.sort_order || 0]
  );
  return rows[0];
}

export async function updateCommunityRule(id: string, input: {
  title?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<CommunityRule | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  if (fields.length === 0) return null;

  values.push(id);
  const { rows } = await query<CommunityRule>(
    `UPDATE community_rules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteCommunityRule(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM community_rules WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getCommunityStats(communityId: string): Promise<{ memberCount: number; channelCount: number; activeToday: number }> {
  const { rows: memCount } = await query(
    'SELECT COUNT(*) FROM community_members WHERE community_id = $1',
    [communityId]
  );
  const { rows: chanCount } = await query(
    'SELECT COUNT(*) FROM community_channels WHERE community_id = $1',
    [communityId]
  );
  const { rows: activeCount } = await query(
    `SELECT COUNT(DISTINCT cm.author_id)
     FROM channel_messages cm
     JOIN community_channels cc ON cc.id = cm.channel_id
     WHERE cc.community_id = $1 AND cm.created_at > NOW() - INTERVAL '24 hours'`,
    [communityId]
  );

  return {
    memberCount: parseInt(memCount[0].count, 10),
    channelCount: parseInt(chanCount[0].count, 10),
    activeToday: parseInt(activeCount[0].count, 10),
  };
}

export async function searchCommunities(queryText: string): Promise<Community[]> {
  const { rows } = await query<Community>(
    `SELECT c.*, u.name AS creator_name, u.avatar AS creator_avatar
     FROM communities c
     JOIN users u ON u.id = c.created_by
     WHERE c.is_archived = false AND c.visibility = 'public'
       AND (c.name ILIKE $1 OR c.description ILIKE $1)
     ORDER BY c.member_count DESC
     LIMIT 20`,
    [`%${queryText}%`]
  );
  return rows;
}

export async function createCommunityInvite(communityId: string, userId: string, maxUses?: number, expiresIn?: string): Promise<CommunityInvite> {
  const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + parseInterval(expiresIn));
  }

  const { rows } = await query<CommunityInvite>(
    `INSERT INTO community_invites (community_id, created_by, code, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [communityId, userId, code, maxUses || null, expiresAt]
  );
  return rows[0];
}

export async function findCommunityInviteByCode(code: string): Promise<CommunityInvite | null> {
  const { rows } = await query<CommunityInvite>(
    `SELECT * FROM community_invites
     WHERE code = $1
       AND (max_uses IS NULL OR use_count < max_uses)
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [code]
  );
  return rows[0] || null;
}

export async function useCommunityInvite(code: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE community_invites SET use_count = use_count + 1 WHERE code = $1',
    [code]
  );
  return (rowCount ?? 0) > 0;
}

export async function getCommunityChannels(communityId: string): Promise<CommunityChannel[]> {
  const { rows } = await query<CommunityChannel>(
    `SELECT cc.*,
       ccat.name AS category_name, ccat.slug AS category_slug
     FROM community_channels cc
     LEFT JOIN community_categories ccat ON ccat.id = cc.category_id
     WHERE cc.community_id = $1 AND cc.is_archived = false
     ORDER BY cc.name`,
    [communityId]
  );
  return rows;
}
