import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitDashboardUpdate, emitStudentUpdate } from '../config/socket';
import * as CareerGoalModel from '../models/careerGoal';
import * as LearningPathModel from '../models/learningPath';
import { NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

// GET /career-goals — public list of active goals (card grid)
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const goals = await CareerGoalModel.getAllCareerGoals();
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
});

// GET /career-goals/my/goals — user's pursued goals with progress (before :slug)
router.get(
  '/my/goals',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const goals = await CareerGoalModel.getMyCareerGoals(userId);
      res.json({ success: true, data: goals });
    } catch (error) {
      next(error);
    }
  }
);

// GET /career-goals/:slug — single goal with ordered courses + linked path
router.get('/:slug', async (req, res: Response, next: NextFunction) => {
  try {
    const goal = await CareerGoalModel.getCareerGoalBySlug(req.params.slug);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Career goal not found' });
    }

    const courses = await CareerGoalModel.getCareerGoalCourses(goal.id);
    res.json({ success: true, data: { ...goal, courses } });
  } catch (error) {
    next(error);
  }
});

// POST /career-goals/:slug/enroll — Enroll in a goal's linked path.
// Free courses are enrolled immediately; paid courses require checkout.
router.post(
  '/:slug/enroll',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const goal = await CareerGoalModel.getCareerGoalBySlug(req.params.slug);
      if (!goal) throw new NotFoundError('Career goal');

      if (!goal.path_slug) {
        return res.status(409).json({
          success: false,
          message: 'This career goal has no pathway yet',
        });
      }

      const path = await LearningPathModel.getLearningPathBySlug(goal.path_slug);
      if (!path) throw new NotFoundError('Career goal pathway');

      let result;
      try {
        result = await LearningPathModel.enrollInPath(userId, path);
      } catch (err: any) {
        if (err?.message === 'Already enrolled in this learning path') {
          throw new ConflictError('Already pursuing this career goal');
        }
        throw err;
      }

      emitDashboardUpdate();
      emitStudentUpdate(userId);

      res.status(201).json({
        success: true,
        data: {
          ...result.enrollment,
          goalTitle: goal.title,
          goalSlug: goal.slug,
          pathTitle: path.title,
          pathSlug: path.slug,
          enrolledCourseIds: result.enrolledCourseIds,
          paidCourses: result.paidCourses,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;