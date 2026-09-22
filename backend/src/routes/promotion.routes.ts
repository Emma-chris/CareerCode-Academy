import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';
import { emitDashboardUpdate } from '../config/socket';
import * as PromotionModel from '../models/promotion';
import { NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

// Public
router.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await PromotionModel.getActivePromotions();
    res.json({ success: true, data: promotions });
  } catch (error) {
    next(error);
  }
});

// Admin
const promotionBaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/i).optional(),
  discount_percent: z.number().min(0.01).max(100),
  scope: z.enum(['all', 'category', 'course']),
  category_id: z.string().uuid().nullable().optional(),
  course_id: z.string().uuid().nullable().optional(),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  is_active: z.boolean().optional(),
});

const scopeRules = (v: any) => {
  if (v.scope === 'category' && !v.category_id) return { message: 'category_id is required for category scope', path: ['category_id'] as const };
  if (v.scope === 'course' && !v.course_id) return { message: 'course_id is required for course scope', path: ['course_id'] as const };
  if (v.scope === 'all' && (v.category_id || v.course_id)) return { message: 'category_id/course_id must be empty for all scope', path: ['scope'] as const };
  return true;
};

const createPromotionSchema = promotionBaseSchema
  .refine((v) => v.ends_at > v.starts_at, { message: 'ends_at must be after starts_at', path: ['ends_at'] })
  .refine(scopeRules);

const updatePromotionSchema = promotionBaseSchema
  .partial()
  .refine((v) => !(v.ends_at && v.starts_at && v.ends_at <= v.starts_at), { message: 'ends_at must be after starts_at', path: ['ends_at'] })
  .refine(scopeRules);

const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin', 'super_admin'));

adminRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await PromotionModel.listPromotions();
    res.json({ success: true, data: promotions });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/', validate(createPromotionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body.slug) {
      const existing = await PromotionModel.getPromotionBySlug(req.body.slug);
      if (existing) throw new ConflictError('A promotion with this slug already exists');
    }
    const promotion = await PromotionModel.createPromotion({
      ...req.body,
      created_by: req.user?.userId,
    });
    logAudit({
      adminId: req.user?.userId || '',
      action: 'promotion.create',
      resourceType: 'promotion',
      resourceId: promotion.id,
      details: `Created promotional event "${promotion.title}"`,
    });
    emitDashboardUpdate();
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/:id', validate(updatePromotionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await PromotionModel.getPromotionById(req.params.id);
    if (!existing) throw new NotFoundError('Promotion not found');
    if (req.body.slug && req.body.slug !== existing.slug) {
      const dup = await PromotionModel.getPromotionBySlug(req.body.slug);
      if (dup && dup.id !== existing.id) throw new ConflictError('A promotion with this slug already exists');
    }
    const promotion = await PromotionModel.updatePromotion(req.params.id, req.body);
    logAudit({
      adminId: req.user?.userId || '',
      action: 'promotion.update',
      resourceType: 'promotion',
      resourceId: req.params.id,
      details: `Updated promotional event "${existing.title}"`,
    });
    emitDashboardUpdate();
    res.json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await PromotionModel.getPromotionById(req.params.id);
    if (!existing) throw new NotFoundError('Promotion not found');
    const deleted = await PromotionModel.deletePromotion(req.params.id);
    logAudit({
      adminId: req.user?.userId || '',
      action: 'promotion.delete',
      resourceType: 'promotion',
      resourceId: req.params.id,
      details: `Deleted promotional event "${existing.title}"`,
    });
    emitDashboardUpdate();
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    next(error);
  }
});

router.use('/', adminRouter);

export default router;