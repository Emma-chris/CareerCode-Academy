import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';
import * as BoardModel from '../models/board';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Public board information
router.get('/members', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await BoardModel.getActiveBoardMembers();
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

router.get('/policies', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await BoardModel.getPublishedPolicies();
    res.json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
});

router.get('/policies/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policy = await BoardModel.getPolicyBySlug(req.params.slug, true);
    if (!policy) throw new NotFoundError('Policy');
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

router.get('/resolutions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const resolutions = await BoardModel.listResolutions();
    res.json({ success: true, data: resolutions });
  } catch (error) {
    next(error);
  }
});

// Admin / board oversight management
const memberSchema = z.object({
  name: z.string().min(2).max(200),
  title: z.string().min(2).max(200),
  bio: z.string().max(5000).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const policySchema = z.object({
  title: z.string().min(3).max(200),
  category: z.enum(['pricing', 'content', 'community', 'data', 'finance', 'operations', 'governance']),
  summary: z.string().max(500).optional(),
  body: z.string().min(10),
  status: z.enum(['draft', 'pending_review']).optional(),
});

const resolveSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().optional(),
  body: z.string().optional(),
  passed: z.boolean().optional(),
  meeting_date: z.coerce.date(),
});

const decideSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional(),
  publish: z.boolean().optional(),
});

const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin', 'super_admin'));

adminRouter.get('/oversight', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await BoardModel.getBoardOversightSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/members', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const members = await BoardModel.listBoardMembers();
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/members', validate(memberSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await BoardModel.createBoardMember(req.body);
    logAudit({ adminId: req.user!.userId, action: 'board.member.create', resourceType: 'board_member', resourceId: member.id, details: `Added board member ${member.name}` });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/members/:id', validate(memberSchema.partial()), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getBoardMemberById(req.params.id);
    if (!existing) throw new NotFoundError('Board member');
    const member = await BoardModel.updateBoardMember(req.params.id, req.body);
    logAudit({ adminId: req.user!.userId, action: 'board.member.update', resourceType: 'board_member', resourceId: req.params.id, details: `Updated board member ${member!.name}` });
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/members/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getBoardMemberById(req.params.id);
    if (!existing) throw new NotFoundError('Board member');
    await BoardModel.deleteBoardMember(req.params.id);
    logAudit({ adminId: req.user!.userId, action: 'board.member.delete', resourceType: 'board_member', resourceId: req.params.id, details: `Removed board member ${existing.name}` });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/policies', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const policies = await BoardModel.listPolicies();
    res.json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/policies', validate(policySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const policy = await BoardModel.createPolicy({ ...req.body, proposed_by: req.user!.userId });
    logAudit({ adminId: req.user!.userId, action: 'board.policy.create', resourceType: 'board_policy', resourceId: policy.id, details: `Drafted policy "${policy.title}"` });
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/policies/:id', validate(policySchema.partial()), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getPolicyById(req.params.id);
    if (!existing) throw new NotFoundError('Policy');
    const policy = await BoardModel.updatePolicy(req.params.id, req.body);
    logAudit({ adminId: req.user!.userId, action: 'board.policy.update', resourceType: 'board_policy', resourceId: req.params.id, details: `Updated policy "${policy!.title}"` });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/policies/:id/submit', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getPolicyById(req.params.id);
    if (!existing) throw new NotFoundError('Policy');
    const policy = await BoardModel.updatePolicy(req.params.id, { status: 'pending_review' });
    logAudit({ adminId: req.user!.userId, action: 'board.policy.submit', resourceType: 'board_policy', resourceId: req.params.id, details: `Submitted "${policy!.title}" for board review` });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/policies/:id/decide', validate(decideSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getPolicyById(req.params.id);
    if (!existing) throw new NotFoundError('Policy');
    const policy = await BoardModel.decidePolicy(req.params.id, req.body.status, req.user!.userId, req.body.notes, req.body.publish);
    logAudit({ adminId: req.user!.userId, action: `board.policy.${req.body.status}`, resourceType: 'board_policy', resourceId: req.params.id, details: `Board ${req.body.status} "${existing.title}"` });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/policies/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await BoardModel.getPolicyById(req.params.id);
    if (!existing) throw new NotFoundError('Policy');
    await BoardModel.deletePolicy(req.params.id);
    logAudit({ adminId: req.user!.userId, action: 'board.policy.delete', resourceType: 'board_policy', resourceId: req.params.id, details: `Deleted policy "${existing.title}"` });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/resolutions', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resolutions = await BoardModel.listResolutions();
    res.json({ success: true, data: resolutions });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/resolutions', validate(resolveSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resolution = await BoardModel.createResolution({ ...req.body, recorded_by: req.user!.userId });
    logAudit({ adminId: req.user!.userId, action: 'board.resolution.create', resourceType: 'board_resolution', resourceId: resolution.id, details: `Recorded resolution ${resolution.resolution_number}` });
    res.status(201).json({ success: true, data: resolution });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/resolutions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await BoardModel.deleteResolution(req.params.id);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    next(error);
  }
});

router.use('/', adminRouter);

export default router;