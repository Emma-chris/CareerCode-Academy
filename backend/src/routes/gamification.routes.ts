import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as Gamification from '../models/gamification';

const router = Router();
router.use(authenticate);

// GET /gamification/hearts - current hearts + regen info
router.get('/hearts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hearts = await Gamification.getHearts(req.user!.userId);
    res.json({ success: true, data: hearts });
  } catch (error) { next(error); }
});

// GET /gamification/daily-progress - today's XP vs goal
router.get('/daily-progress', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await Gamification.getDailyProgress(req.user!.userId);
    res.json({ success: true, data: progress });
  } catch (error) { next(error); }
});

// PUT /gamification/daily-goal - set daily XP goal
router.put('/daily-goal', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== 'number') {
      return res.status(400).json({ success: false, error: 'goal must be a number' });
    }
    await Gamification.setDailyGoal(req.user!.userId, goal);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// GET /gamification/xp-history - recent XP earnings
router.get('/xp-history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const breakdown = await Gamification.getXpBreakdown(req.user!.userId);
    res.json({ success: true, data: breakdown });
  } catch (error) { next(error); }
});

// POST /gamification/streak-freeze - use a freeze token
router.post('/streak-freeze', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const used = await Gamification.useStreakFreeze(req.user!.userId);
    res.json({ success: true, data: { used } });
  } catch (error) { next(error); }
});

// GET /gamification/skill-tree/:courseId - course module/lesson tree
router.get('/skill-tree/:courseId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tree = await Gamification.getSkillTree(req.user!.userId, req.params.courseId);
    res.json({ success: true, data: tree });
  } catch (error) { next(error); }
});

export default router;
