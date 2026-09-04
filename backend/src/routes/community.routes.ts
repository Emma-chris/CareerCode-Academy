import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { uploadFile } from '../config/storage';
import * as Community from '../models/community';
import * as NotificationModel from '../models/notification';
import { io } from '../config/socket';
import { UnauthorizedError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

const router = Router();

// ── Schemas ────────────────────────────────────────────────────

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(['text', 'announcement', 'project_showcase']).optional(),
  course_id: z.string().uuid().optional(),
  lesson_id: z.string().uuid().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

const reportSchema = z.object({
  target_type: z.enum(['message', 'user']),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

const moderateSchema = z.object({
  target_user_id: z.string().uuid(),
  channel_id: z.string().uuid().optional(),
  action: z.enum(['mute', 'unmute', 'ban', 'unban', 'warn', 'delete_message']),
  reason: z.string().max(500).optional(),
  duration: z.string().optional(),
});

const inviteSchema = z.object({
  max_uses: z.number().int().positive().optional(),
  expires_in: z.string().optional(),
});

// ── Categories ─────────────────────────────────────────────────

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Community.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// ── Channels ───────────────────────────────────────────────────

router.get('/channels', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const channels = await Community.getChannels(req.user!.userId);
    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

router.post('/channels', authenticate, validate(createChannelSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const channel = await Community.createChannel({
      ...req.body,
      created_by: req.user!.userId,
    });
    // Broadcast new channel
    if (io) io.emit('community:channel_created', { channel });
    res.status(201).json({ success: true, data: channel });
  } catch (error: any) {
    if (error.code === '23505') {
      return next(new ConflictError('A channel with that slug already exists in this category'));
    }
    next(error);
  }
});

router.get('/channels/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const channel = await Community.getChannelById(req.params.id);
    if (!channel) throw new NotFoundError('Channel');

    const member = await Community.isChannelMember(channel.id, req.user!.userId);
    const stats = await Community.getChannelStats(channel.id);

    res.json({
      success: true,
      data: { ...channel, ...stats, is_member: !!member, my_role: member?.role },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/channels/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Admin/super_admin can rename any channel
    const fullUserForEdit = await (await import('../models/user')).getUserById(req.user!.userId);
    if (!fullUserForEdit || !['admin', 'super_admin'].includes(fullUserForEdit.role)) {
      const member = await Community.isChannelMember(req.params.id, req.user!.userId);
      if (!member || !['owner', 'moderator'].includes(member.role)) {
        throw new ForbiddenError('Only channel owners and moderators can edit channels');
      }
    }

    const channel = await Community.updateChannel(req.params.id, req.body);
    if (!channel) throw new NotFoundError('Channel');

    if (io) io.to(`channel:${req.params.id}`).emit('community:channel_updated', { channel });
    res.json({ success: true, data: channel });
  } catch (error) {
    next(error);
  }
});

router.delete('/channels/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member || member.role !== 'owner') {
      const user = (await import('../models/user')).getUserById;
      const fullUser = await user(req.user!.userId);
      if (!fullUser || !['admin', 'super_admin'].includes(fullUser.role)) {
        throw new ForbiddenError('Only channel owners or admins can delete channels');
      }
    }

    const deleted = await Community.deleteChannel(req.params.id);
    if (!deleted) throw new NotFoundError('Channel');

    if (io) io.emit('community:channel_deleted', { channelId: req.params.id });
    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Join / Leave ───────────────────────────────────────────────

router.post('/channels/:id/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const channel = await Community.getChannelById(req.params.id);
    if (!channel) throw new NotFoundError('Channel');

    const existing = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (existing) {
      return res.json({ success: true, message: 'Already a member', data: existing });
    }

    const member = await Community.joinChannel(req.params.id, req.user!.userId);

    // Update member_count
    await (await import('../config/db')).query(
      'UPDATE community_channels SET member_count = member_count + 1 WHERE id = $1',
      [req.params.id]
    );

    if (io) io.to(`channel:${req.params.id}`).emit('community:member_joined', { member });
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

router.post('/channels/:id/leave', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const left = await Community.leaveChannel(req.params.id, req.user!.userId);
    if (left) {
      await (await import('../config/db')).query(
        'UPDATE community_channels SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
        [req.params.id]
      );
      if (io) io.to(`channel:${req.params.id}`).emit('community:member_left', { userId: req.user!.userId });
    }
    res.json({ success: true, message: 'Left channel' });
  } catch (error) {
    next(error);
  }
});

// ── Members ────────────────────────────────────────────────────

router.get('/channels/:id/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member) throw new ForbiddenError('You must be a member to view members');

    const members = await Community.getChannelMembers(req.params.id);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

// ── Messages ───────────────────────────────────────────────────

router.get('/channels/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member) throw new ForbiddenError('You must be a member to view messages');

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    const messages = await Community.getChannelMessages(req.params.id, limit, before);

    // Mark as read
    await Community.updateLastRead(req.params.id, req.user!.userId);

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

router.post('/channels/:id/messages', authenticate, validate(sendMessageSchema), ...uploadSingle('attachment'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member) throw new ForbiddenError('You must be a member to send messages');
    if (member.is_muted) throw new ForbiddenError('You are muted in this channel');

    let content = req.body.content;
    if (!content || !content.trim()) throw new UnauthorizedError('Message content is required');

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    let attachmentName: string | undefined;

    if (req.file) {
      const buffer = require('fs').readFileSync(req.file.path);
      attachmentUrl = await uploadFile(buffer, req.file.originalname, 'community/attachments');
      attachmentType = req.file.mimetype;
      attachmentName = req.file.originalname;
    }

    const message = await Community.createMessage({
      channel_id: req.params.id,
      author_id: req.user!.userId,
      content: content.trim(),
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    });

    // Broadcast via Socket.IO
    if (io) {
      io.to(`channel:${req.params.id}`).emit('community:message', { message });
    }

    // Notify mentioned users
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      const { getUserByEmail } = await import('../models/user');
      for (const mention of mentions) {
        const username = mention.slice(1);
        const mentionedUser = await getUserByEmail(`${username}@careercode.com`);
        if (mentionedUser) {
          await NotificationModel.createNotification({
            user_id: mentionedUser.id,
            title: 'You were mentioned',
            message: `You were mentioned in #${(await Community.getChannelById(req.params.id))?.name || 'channel'}`,
            type: 'info',
          });
          if (io) {
            io.to(mentionedUser.id).emit('community:mention', {
              channelId: req.params.id,
              messageId: message.id,
              mentionedBy: message.author_name,
            });
          }
        }
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

router.put('/channels/:channelId/messages/:msgId', authenticate, validate(editMessageSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await Community.editMessage(req.params.msgId, req.user!.userId, req.body.content);
    if (!message) throw new NotFoundError('Message');

    if (io) io.to(`channel:${req.params.channelId}`).emit('community:edit', { message });
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

router.delete('/channels/:channelId/messages/:msgId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await Community.deleteMessage(req.params.msgId, req.user!.userId);
    if (!deleted) throw new NotFoundError('Message');

    if (io) io.to(`channel:${req.params.channelId}`).emit('community:delete', { messageId: req.params.msgId });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Threads ────────────────────────────────────────────────────

router.get('/messages/:msgId/threads', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const replies = await Community.getThreadReplies(req.params.msgId);
    res.json({ success: true, data: replies });
  } catch (error) {
    next(error);
  }
});

router.post('/messages/:msgId/threads', authenticate, validate(z.object({ content: z.string().min(1).max(5000) })), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) throw new UnauthorizedError('Content is required');

    const parent = await Community.getMessageById(req.params.msgId);
    if (!parent) throw new NotFoundError('Message');

    const reply = await Community.createMessage({
      channel_id: parent.channel_id,
      author_id: req.user!.userId,
      content: content.trim(),
      parent_message_id: req.params.msgId,
    });

    if (io) {
      io.to(`channel:${parent.channel_id}`).emit('community:thread', {
        parentMessageId: req.params.msgId,
        reply,
      });
    }

    // Notify parent author
    if (parent.author_id !== req.user!.userId) {
      await NotificationModel.createNotification({
        user_id: parent.author_id,
        title: 'New reply to your message',
        message: `${reply.author_name} replied to your message`,
        type: 'info',
      });
    }

    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    next(error);
  }
});

// ── Reactions ──────────────────────────────────────────────────

router.post('/messages/:msgId/reactions', authenticate, validate(reactionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await Community.getMessageById(req.params.msgId);
    if (!message) throw new NotFoundError('Message');

    await Community.addReaction(req.params.msgId, req.user!.userId, req.body.emoji);

    if (io) {
      io.to(`channel:${message.channel_id}`).emit('community:reaction', {
        messageId: req.params.msgId,
        emoji: req.body.emoji,
        userId: req.user!.userId,
        action: 'add',
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/messages/:msgId/reactions/:emoji', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await Community.getMessageById(req.params.msgId);
    if (!message) throw new NotFoundError('Message');

    await Community.removeReaction(req.params.msgId, req.user!.userId, decodeURIComponent(req.params.emoji));

    if (io) {
      io.to(`channel:${message.channel_id}`).emit('community:reaction', {
        messageId: req.params.msgId,
        emoji: decodeURIComponent(req.params.emoji),
        userId: req.user!.userId,
        action: 'remove',
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── Pins ───────────────────────────────────────────────────────

router.get('/channels/:id/pins', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pins = await Community.getPinnedMessages(req.params.id);
    res.json({ success: true, data: pins });
  } catch (error) {
    next(error);
  }
});

router.post('/channels/:id/pins/:msgId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      throw new ForbiddenError('Only moderators can pin messages');
    }

    await Community.pinMessage(req.params.id, req.params.msgId, req.user!.userId);
    if (io) io.to(`channel:${req.params.id}`).emit('community:pin', { messageId: req.params.msgId, pinned: true });

    res.json({ success: true, message: 'Message pinned' });
  } catch (error) {
    next(error);
  }
});

router.delete('/channels/:id/pins/:msgId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      throw new ForbiddenError('Only moderators can unpin messages');
    }

    await Community.unpinMessage(req.params.id, req.params.msgId);
    if (io) io.to(`channel:${req.params.id}`).emit('community:pin', { messageId: req.params.msgId, pinned: false });

    res.json({ success: true, message: 'Message unpinned' });
  } catch (error) {
    next(error);
  }
});

// ── Search ─────────────────────────────────────────────────────

router.get('/search', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length < 2) {
      throw new UnauthorizedError('Search query must be at least 2 characters');
    }

    const results = await Community.searchMessages(req.user!.userId, q.trim());
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ── Reports ────────────────────────────────────────────────────

router.post('/reports', authenticate, validate(reportSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await Community.createReport({
      reporter_id: req.user!.userId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ── Admin / Moderation ─────────────────────────────────────────

router.get('/admin/reports', authenticate, authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const reports = await Community.getReports(status);
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/reports/:id', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      throw new UnauthorizedError('Invalid status');
    }
    const updated = await Community.updateReportStatus(req.params.id, status, req.user!.userId);
    if (!updated) throw new NotFoundError('Report');
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/moderate', authenticate, authorize('admin', 'super_admin', 'instructor'), validate(moderateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Community.createModerationAction({
      moderator_id: req.user!.userId,
      ...req.body,
    });

    if (req.body.action === 'delete_message') {
      await Community.deleteMessage(req.body.target_user_id, req.user!.userId);
    }

    // Notify target user
    await NotificationModel.createNotification({
      user_id: req.body.target_user_id,
      title: 'Moderation action',
      message: `A moderator has ${req.body.action}ed you${req.body.reason ? ': ' + req.body.reason : ''}`,
      type: 'warning',
    });

    res.json({ success: true, message: 'Moderation action applied' });
  } catch (error) {
    next(error);
  }
});

// ── Invites ────────────────────────────────────────────────────

router.post('/channels/:id/invite', authenticate, validate(inviteSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await Community.isChannelMember(req.params.id, req.user!.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      throw new ForbiddenError('Only channel owners and moderators can create invites');
    }

    const invite = await Community.createInvite(
      req.params.id,
      req.user!.userId,
      req.body.max_uses,
      req.body.expires_in
    );
    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    next(error);
  }
});

router.post('/invites/:code/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invite = await Community.findInviteByCode(req.params.code);
    if (!invite) throw new NotFoundError('Invite');

    await Community.useInvite(req.params.code);
    const member = await Community.joinChannel(invite.channel_id, req.user!.userId);

    const channel = await Community.getChannelById(invite.channel_id);
    res.json({ success: true, data: { channel, member } });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// ── Community Management (full CRUD, membership, rules, etc.) ─
// ══════════════════════════════════════════════════════════════

// ── Schemas ────────────────────────────────────────────────────

const createCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  category: z.string().max(50).optional(),
  visibility: z.enum(['public', 'private', 'restricted']).optional(),
  join_policy: z.enum(['open', 'approval', 'invite_only']).optional(),
  rules: z.string().max(5000).optional(),
});

const updateCommunitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().optional().nullable(),
  category: z.string().max(50).optional(),
  visibility: z.enum(['public', 'private', 'restricted']).optional(),
  join_policy: z.enum(['open', 'approval', 'invite_only']).optional(),
  rules: z.string().max(5000).optional().nullable(),
});

const communityRuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sort_order: z.number().int().optional(),
});

const communityInviteSchema = z.object({
  max_uses: z.number().int().positive().optional(),
  expires_in: z.string().optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'moderator', 'member']),
});

// Helper: check community role
async function requireCommunityRole(communityId: string, userId: string, allowedRoles: string[], userRole?: string) {
  if (userRole && ['admin', 'super_admin'].includes(userRole)) return null as any;
  const member = await Community.isCommunityMember(communityId, userId);
  if (!member) throw new ForbiddenError('You are not a member of this community');
  if (!allowedRoles.includes(member.role)) throw new ForbiddenError('Insufficient permissions');
  return member;
}

// ── Community CRUD ─────────────────────────────────────────────

router.get('/communities', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const communities = await Community.getCommunities(req.user!.userId);
    res.json({ success: true, data: communities });
  } catch (error) {
    next(error);
  }
});

router.post('/communities', authenticate, validate(createCommunitySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.createCommunity({
      ...req.body,
      created_by: req.user!.userId,
    });
    if (io) io.emit('community:created', { community });
    res.status(201).json({ success: true, data: community });
  } catch (error: any) {
    if (error.code === '23505') {
      return next(new ConflictError('A community with that slug already exists'));
    }
    next(error);
  }
});

router.get('/communities/search', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length < 2) {
      throw new UnauthorizedError('Search query must be at least 2 characters');
    }
    const results = await Community.searchCommunities(q.trim());
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

router.get('/communities/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.getCommunityById(req.params.id);
    if (!community) throw new NotFoundError('Community');

    const membership = await Community.isCommunityMember(community.id, req.user!.userId);
    const stats = await Community.getCommunityStats(community.id);

    res.json({
      success: true,
      data: {
        ...community,
        ...stats,
        is_member: !!membership,
        my_role: membership?.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/communities/:id', authenticate, validate(updateCommunitySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin'], req.user!.role);

    const community = await Community.updateCommunity(req.params.id, req.body);
    if (!community) throw new NotFoundError('Community');

    if (io) io.emit('community:updated', { community });
    res.json({ success: true, data: community });
  } catch (error) {
    next(error);
  }
});

router.delete('/communities/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner'], req.user!.role);

    const deleted = await Community.deleteCommunity(req.params.id);
    if (!deleted) throw new NotFoundError('Community');

    if (io) io.emit('community:deleted', { communityId: req.params.id });
    res.json({ success: true, message: 'Community deleted' });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/archive', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner'], req.user!.role);

    const archived = await Community.archiveCommunity(req.params.id);
    if (!archived) throw new NotFoundError('Community');

    if (io) io.emit('community:updated', { communityId: req.params.id, is_archived: true });
    res.json({ success: true, message: 'Community archived' });
  } catch (error) {
    next(error);
  }
});

// ── Community Membership ───────────────────────────────────────

router.post('/communities/:id/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.getCommunityById(req.params.id);
    if (!community) throw new NotFoundError('Community');
    if (community.is_archived) throw new ForbiddenError('Community is archived');

    const existing = await Community.isCommunityMember(req.params.id, req.user!.userId);
    if (existing) {
      return res.json({ success: true, message: 'Already a member', data: existing });
    }

    if (community.join_policy === 'invite_only') {
      throw new ForbiddenError('This community is invite only');
    }

    const member = await Community.joinCommunity(req.params.id, req.user!.userId);

    if (io) io.emit('community:member_joined', { communityId: req.params.id, member });
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/leave', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const left = await Community.leaveCommunity(req.params.id, req.user!.userId);
    if (left) {
      if (io) io.emit('community:member_left', { communityId: req.params.id, userId: req.user!.userId });
    }
    res.json({ success: true, message: 'Left community' });
  } catch (error) {
    next(error);
  }
});

router.get('/communities/:id/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.getCommunityById(req.params.id);
    if (!community) throw new NotFoundError('Community');

    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
    const membership = await Community.isCommunityMember(req.params.id, req.user!.userId);
    if (!membership && !isAdmin) throw new ForbiddenError('You must be a member to view members');

    const members = await Community.getCommunityMembers(req.params.id);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

router.put('/communities/:id/members/:userId/role', authenticate, validate(updateMemberRoleSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin'], req.user!.role);

    const updated = await Community.updateCommunityMemberRole(req.params.id, req.params.userId, req.body.role);
    if (!updated) throw new NotFoundError('Member');

    res.json({ success: true, message: 'Member role updated' });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/members/:userId/ban', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const banned = await Community.banCommunityMember(req.params.id, req.params.userId);
    if (!banned) throw new NotFoundError('Member');

    if (io) io.emit('community:member_banned', { communityId: req.params.id, userId: req.params.userId });
    res.json({ success: true, message: 'Member banned' });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/members/:userId/unban', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const unbanned = await Community.unbanCommunityMember(req.params.id, req.params.userId);
    if (!unbanned) throw new NotFoundError('Member');

    if (io) io.emit('community:member_unbanned', { communityId: req.params.id, userId: req.params.userId });
    res.json({ success: true, message: 'Member unbanned' });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/members/:userId/mute', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const muted = await Community.muteCommunityMember(req.params.id, req.params.userId);
    if (!muted) throw new NotFoundError('Member');

    res.json({ success: true, message: 'Member muted' });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/members/:userId/unmute', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const unmuted = await Community.unmuteCommunityMember(req.params.id, req.params.userId);
    if (!unmuted) throw new NotFoundError('Member');

    res.json({ success: true, message: 'Member unmuted' });
  } catch (error) {
    next(error);
  }
});

// ── Community Rules ────────────────────────────────────────────

router.get('/communities/:id/rules', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rules = await Community.getCommunityRules(req.params.id);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/:id/rules', authenticate, validate(communityRuleSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const rule = await Community.createCommunityRule(req.params.id, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

router.put('/communities/:id/rules/:ruleId', authenticate, validate(communityRuleSchema.partial()), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const rule = await Community.updateCommunityRule(req.params.ruleId, req.body);
    if (!rule) throw new NotFoundError('Rule');

    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

router.delete('/communities/:id/rules/:ruleId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const deleted = await Community.deleteCommunityRule(req.params.ruleId);
    if (!deleted) throw new NotFoundError('Rule');

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Community Stats ────────────────────────────────────────────

router.get('/communities/:id/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.getCommunityById(req.params.id);
    if (!community) throw new NotFoundError('Community');

    const stats = await Community.getCommunityStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ── Community Invites ──────────────────────────────────────────

router.post('/communities/:id/invites', authenticate, validate(communityInviteSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityRole(req.params.id, req.user!.userId, ['owner', 'admin', 'moderator'], req.user!.role);

    const invite = await Community.createCommunityInvite(
      req.params.id,
      req.user!.userId,
      req.body.max_uses,
      req.body.expires_in
    );
    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    next(error);
  }
});

router.post('/communities/invites/:code/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invite = await Community.findCommunityInviteByCode(req.params.code);
    if (!invite) throw new NotFoundError('Invite');

    const existing = await Community.isCommunityMember(invite.community_id, req.user!.userId);
    if (existing) {
      return res.json({ success: true, message: 'Already a member', data: existing });
    }

    await Community.useCommunityInvite(req.params.code);
    const member = await Community.joinCommunity(invite.community_id, req.user!.userId);

    const community = await Community.getCommunityById(invite.community_id);
    if (io) io.emit('community:member_joined', { communityId: invite.community_id, member });
    res.json({ success: true, data: { community, member } });
  } catch (error) {
    next(error);
  }
});

// ── Community Channels ─────────────────────────────────────────

router.get('/communities/:id/channels', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await Community.getCommunityById(req.params.id);
    if (!community) throw new NotFoundError('Community');

    const channels = await Community.getCommunityChannels(req.params.id);
    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

export default router;
