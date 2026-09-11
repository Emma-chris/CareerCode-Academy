import { Router, Request, Response, NextFunction } from 'express';
import * as GuidedModel from '../models/guided';
import * as LearningPathModel from '../models/learningPath';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

const router = Router();

router.use(authenticate);

// POST /guided/enroll — opt into Guided Mode for a learning path
router.post('/enroll', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pathSlug = req.body.pathSlug || req.body.path_slug;
    if (!pathSlug) throw new ValidationError({ pathSlug: ['pathSlug is required'] });
    const path = await LearningPathModel.getLearningPathBySlug(pathSlug);
    if (!path) return res.status(404).json({ success: false, message: 'Learning path not found' });
    const enrollment = await GuidedModel.enrollInPath(req.user!.userId, path.id);
    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
});

// GET /guided/today — today's day plan (course, lessons, gate quiz, streaks)
router.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pathId = req.query.path_id as string | undefined;
    if (!pathId) {
      const active = await GuidedModel.getActiveGuided(req.user!.userId);
      if (!active) return res.status(404).json({ success: false, message: 'No active guided path. Enroll first.' });
      const state = await GuidedModel.getTodayState(req.user!.userId, active.path_id);
      return res.json({ success: true, data: state });
    }
    const state = await GuidedModel.getTodayState(req.user!.userId, pathId);
    res.json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
});

// POST /guided/lessons/:lessonId/complete — mark a lesson complete; auto-advances day when gate passed
router.post('/lessons/:lessonId/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pathId = req.body.path_id as string | undefined;
    const active = !pathId ? await GuidedModel.getActiveGuided(req.user!.userId) : null;
    const resolvedPathId = pathId || active?.path_id;
    if (!resolvedPathId) return res.status(404).json({ success: false, message: 'No active guided path' });
    const result = await GuidedModel.markLessonComplete(req.user!.userId, resolvedPathId, req.params.lessonId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /guided/checkin — daily check-in
router.post('/checkin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await GuidedModel.checkIn(req.user!.userId, {
      productive: req.body.productive,
      energy: req.body.energy,
      blocks_completed: req.body.blocks_completed,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /guided/readiness — progress + streak + weekly blocks
router.get('/readiness', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pathId = req.query.path_id as string | undefined;
    const data = await GuidedModel.getReadiness(req.user!.userId, pathId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /guided/accountability — day-by-day loop snapshot
router.get('/accountability', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pathId = req.query.path_id as string | undefined;
    const data = await GuidedModel.getAccountability(req.user!.userId, pathId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// PATCH /guided/:pathId/mode — pause/resume guided mode
router.patch('/:pathId/mode', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mode = req.body.mode;
    if (mode !== 'active' && mode !== 'paused') {
      return res.status(400).json({ success: false, message: 'Mode must be active or paused' });
    }
    const enrollment = await GuidedModel.setEnrollmentMode(req.user!.userId, req.params.pathId, mode);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Guided enrollment not found' });
    res.json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
});

export default router;