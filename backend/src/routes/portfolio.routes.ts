import { Router, Request, Response, NextFunction } from 'express';
import * as PortfolioModel from '../models/portfolio';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

function requireText(value: any, field: string, errors: Record<string, string[]>): void {
  if (value === undefined || String(value).trim() === '') errors[field] = [`${field} is required`];
}

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// GET /portfolio/user/:username — public learner profile
router.get('/user/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await PortfolioModel.getPublicProfileByUsername(req.params.username);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found or not public' });
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// All below require auth
router.use(authenticate);

// GET /portfolio/me — own portfolio (items, certs, projects, skills)
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PortfolioModel.getMyPortfolio(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// POST /portfolio/items
router.post('/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors: Record<string, string[]> = {};
    requireText(req.body.title, 'title', errors);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const item = await PortfolioModel.createPortfolioItem(req.user!.userId, {
      title: req.body.title,
      description: req.body.description,
      url: req.body.url,
      image_url: req.body.image_url,
      skills: parseSkills(req.body.skills),
      is_public: req.body.is_public !== false,
      project_id: req.body.project_id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /portfolio/items/:id
router.put('/items/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await PortfolioModel.updatePortfolioItem(req.user!.userId, req.params.id, {
      title: req.body.title,
      description: req.body.description,
      url: req.body.url,
      image_url: req.body.image_url,
      skills: req.body.skills === undefined ? undefined : parseSkills(req.body.skills),
      is_public: req.body.is_public,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// DELETE /portfolio/items/:id
router.delete('/items/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await PortfolioModel.deletePortfolioItem(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (error) {
    next(error);
  }
});

// PATCH /portfolio/privacy — toggle public profile exposure
router.patch('/privacy', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    await PortfolioModel.ensureUsername(userId);
    await PortfolioModel.updateProfilePublic(userId, req.body.portfolio_public !== false);
    const data = await PortfolioModel.getMyPortfolio(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Projects ──

// POST /portfolio/projects — submit a project (status: submitted)
router.post('/projects', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors: Record<string, string[]> = {};
    requireText(req.body.title, 'title', errors);
    requireText(req.body.description, 'description', errors);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const project = await PortfolioModel.createProject(req.user!.userId, {
      title: req.body.title,
      description: req.body.description,
      source_url: req.body.source_url,
      demo_url: req.body.demo_url,
      image_url: req.body.image_url,
      skills: parseSkills(req.body.skills),
      course_id: req.body.course_id,
    });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// GET /portfolio/projects — own projects
router.get('/projects', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await PortfolioModel.getProjectsByUser(req.user!.userId);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// GET /portfolio/projects/review — instructor/admin queue
router.get('/projects/review', authorize('admin', 'super_admin', 'instructor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await PortfolioModel.getProjectsForReview();
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// GET /portfolio/projects/:id — single project (owner or reviewer)
router.get('/projects/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const project = await PortfolioModel.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== userId && !['admin', 'super_admin', 'instructor'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, message: 'You cannot view this project' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// POST /portfolio/projects/:id/review — approve/reject + feedback; auto portfolio item on approve
router.post('/projects/:id/review', authorize('admin', 'super_admin', 'instructor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.body.status;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }
    const project = await PortfolioModel.reviewProject(req.params.id, req.user!.userId, status, req.body.feedback);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

export default router;