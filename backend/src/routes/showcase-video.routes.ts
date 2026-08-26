import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as VideoModel from '../models/showcase-video';
import { NotFoundError } from '../utils/errors';

const router = Router();

// GET /showcase-videos/:entityType/:entityId - Get videos for an entity
router.get('/:entityType/:entityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.params;

    if (!['school', 'program', 'course'].includes(entityType)) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const videos = await VideoModel.getVideosByEntity(entityType, entityId);
    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
});

// GET /showcase-videos/all - List all videos (admin)
router.get('/all', authenticate, authorize('admin', 'super_admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const videos = await VideoModel.getAllVideos();
    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
});

// GET /showcase-videos/:id - Get single video
router.get('/detail/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await VideoModel.getVideoById(req.params.id);
    if (!video) throw new NotFoundError('Video');
    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
});

// POST /showcase-videos - Create video (admin)
router.post('/', authenticate, authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity_type, entity_id, title, description, video_url, thumbnail_url, duration, provider } = req.body;

    if (!entity_type || !entity_id || !title || !video_url) {
      return res.status(400).json({ success: false, message: 'entity_type, entity_id, title, and video_url are required' });
    }

    const video = await VideoModel.createVideo({
      entity_type,
      entity_id,
      title,
      description,
      video_url,
      thumbnail_url,
      duration,
      provider,
    });

    res.status(201).json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
});

// PUT /showcase-videos/:id - Update video (admin)
router.put('/:id', authenticate, authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await VideoModel.updateVideo(req.params.id, req.body);
    if (!video) throw new NotFoundError('Video');
    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
});

// DELETE /showcase-videos/:id - Delete video (admin)
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await VideoModel.deleteVideo(req.params.id);
    if (!deleted) throw new NotFoundError('Video');
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /showcase-videos/:id/analytics - Log a video view (heartbeat)
router.post('/:id/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { watch_duration, completed } = req.body;
    const userId = (req as any).user?.userId;

    const analytics = await VideoModel.logVideoView({
      video_id: req.params.id,
      user_id: userId,
      watch_duration: watch_duration || 0,
      completed: completed || false,
      ip_address: req.ip,
    });

    res.status(201).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
});

// GET /showcase-videos/:id/stats - Get video analytics (admin)
router.get('/:id/stats', authenticate, authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await VideoModel.getVideoStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
