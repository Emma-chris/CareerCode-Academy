import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as Gamification from '../models/gamification';
import { query } from '../config/db';
import { z } from 'zod';

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

// GET /gamification/balance - XP balance for redeem
router.get('/balance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const balance = await Gamification.getXpBalance(req.user!.userId);
    res.json({ success: true, data: balance });
  } catch (error) { next(error); }
});

// POST /gamification/redeem - redeem XP for discount code
router.post('/redeem', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ xpAmount: z.number().int().min(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'xpAmount required (integer)' });
    const code = await Gamification.redeemXpForDiscount(req.user!.userId, parsed.data.xpAmount);
    res.status(201).json({ success: true, data: code });
  } catch (error: any) {
    const msg = error?.message || 'Failed to redeem';
    const status = msg.includes('Insufficient') || msg.includes('Minimum') || msg.includes('steps') || msg.includes('disabled') ? 400 : 500;
    res.status(status).json({ success: false, message: msg });
  }
});

// POST /gamification/validate-discount - preview discount code
router.post('/validate-discount', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, courseId } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'code required' });
    let coursePrice: number | undefined;
    if (courseId) {
      const { rows } = await query('SELECT price FROM courses WHERE id=$1', [courseId]);
      if (rows[0]) coursePrice = Number(rows[0].price);
    }
    const result = await Gamification.validateDiscountCode(code, req.user!.userId, coursePrice);
    if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
    res.json({ success: true, data: { discount: result.discount, row: result.row } });
  } catch (error) { next(error); }
});

// GET /gamification/discount-codes - my codes
router.get('/discount-codes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const codes = await Gamification.getUserDiscountCodes(req.user!.userId);
    res.json({ success: true, data: codes });
  } catch (error) { next(error); }
});

// GET /gamification/xp-history-full - includes total balance
router.get('/xp-history-full', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const balance = await Gamification.getXpBalance(req.user!.userId);
    const breakdown = await Gamification.getXpBreakdown(req.user!.userId);
    const { rows } = await query(`SELECT * FROM xp_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user!.userId]);
    res.json({ success: true, data: { balance, breakdown, history: rows } });
  } catch (error) { next(error); }
});

export default router;
