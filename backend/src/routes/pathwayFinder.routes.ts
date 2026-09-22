import { Router, Request, Response, NextFunction } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { getPathwayFinderData } from '../models/pathwayFinder';

const router = Router();

// GET /pathway-finder — discoverable pathways plus the caller's progress and
// recommended next step. Works for guests (progress empty) and students.
router.get(
  '/',
  optionalAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || undefined;
      const data = await getPathwayFinderData(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;