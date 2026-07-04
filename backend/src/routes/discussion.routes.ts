import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as DiscussionModel from '../models/discussion';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createDiscussionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const updateDiscussionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  pinned: z.boolean().optional(),
});

const createReplySchema = z.object({
  content: z.string().min(1, 'Reply is required').max(5000),
});

// GET /discussions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, limit, offset } = req.query;
    const discussions = await DiscussionModel.getDiscussions({
      category: category as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json({ success: true, data: discussions });
  } catch (error) {
    next(error);
  }
});

// GET /discussions/categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await DiscussionModel.getDiscussionCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// GET /discussions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const discussion = await DiscussionModel.getDiscussionById(req.params.id);
    if (!discussion) {
      throw new NotFoundError('Discussion');
    }

    await DiscussionModel.incrementDiscussionViews(req.params.id);
    const replies = await DiscussionModel.getRepliesByDiscussion(req.params.id);

    res.json({ success: true, data: { ...discussion, replies } });
  } catch (error) {
    next(error);
  }
});

// POST /discussions
router.post(
  '/',
  authenticate,
  validate(createDiscussionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const discussion = await DiscussionModel.createDiscussion({
        user_id: req.user!.userId,
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        tags: req.body.tags,
      });

      res.status(201).json({ success: true, data: discussion });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /discussions/:id
router.put(
  '/:id',
  authenticate,
  validate(updateDiscussionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const discussion = await DiscussionModel.getDiscussionById(req.params.id);
      if (!discussion) {
        throw new NotFoundError('Discussion');
      }

      if (req.user!.role !== 'admin' && discussion.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit your own discussions');
      }

      const updated = await DiscussionModel.updateDiscussion(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /discussions/:id
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const discussion = await DiscussionModel.getDiscussionById(req.params.id);
      if (!discussion) {
        throw new NotFoundError('Discussion');
      }

      if (req.user!.role !== 'admin' && discussion.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete your own discussions');
      }

      await DiscussionModel.deleteDiscussion(req.params.id);
      res.json({ success: true, message: 'Discussion deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /discussions/:id/replies
router.get('/:id/replies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const discussion = await DiscussionModel.getDiscussionById(req.params.id);
    if (!discussion) {
      throw new NotFoundError('Discussion');
    }

    const replies = await DiscussionModel.getRepliesByDiscussion(req.params.id);
    res.json({ success: true, data: replies });
  } catch (error) {
    next(error);
  }
});

// POST /discussions/:id/replies
router.post(
  '/:id/replies',
  authenticate,
  validate(createReplySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const discussion = await DiscussionModel.getDiscussionById(req.params.id);
      if (!discussion) {
        throw new NotFoundError('Discussion');
      }

      const reply = await DiscussionModel.createReply({
        discussion_id: req.params.id,
        user_id: req.user!.userId,
        content: req.body.content,
      });

      res.status(201).json({ success: true, data: reply });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /discussions/replies/:id
router.delete(
  '/replies/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const reply = await DiscussionModel.getReplyById(req.params.id);

      if (!reply) {
        throw new NotFoundError('Reply');
      }

      if (req.user!.role !== 'admin' && reply.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete your own replies');
      }

      await DiscussionModel.deleteReply(req.params.id);
      res.json({ success: true, message: 'Reply deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
