import { Router, Request, Response, NextFunction } from 'express';
import * as CareerModel from '../models/career';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

const router = Router();

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function requireFields(body: any, fields: string[]): void {
  const errors: Record<string, string[]> = {};
  for (const f of fields) {
    if (body[f] === undefined || String(body[f]).trim() === '') errors[f] = [`${f} is required`];
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

// GET /career/jobs — active job listings
router.get('/jobs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await CareerModel.getActiveJobs();
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
});

// GET /career/jobs/:id — single job detail
router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await CareerModel.getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// GET /career/internships — active internship listings
router.get('/internships', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const internships = await CareerModel.getActiveInternships();
    res.json({ success: true, data: internships });
  } catch (error) {
    next(error);
  }
});

// GET /career/internships/:id — single internship detail
router.get('/internships/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const internship = await CareerModel.getInternshipById(req.params.id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    res.json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
});

// GET /career/alumni — alumni directory
router.get('/alumni', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alumni = await CareerModel.getAllAlumni();
    res.json({ success: true, data: alumni });
  } catch (error) {
    next(error);
  }
});

// GET /career/alumni/featured — featured alumni
router.get('/alumni/featured', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alumni = await CareerModel.getFeaturedAlumni();
    res.json({ success: true, data: alumni });
  } catch (error) {
    next(error);
  }
});

// ── Applications (student) ──

// POST /career/jobs/:id/apply — student applies to a job in-platform
router.post('/jobs/:id/apply', authenticate, authorize('student'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const job = await CareerModel.getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.is_active) return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
    const existing = await CareerModel.getApplicationByTarget(userId, { job_id: job.id });
    if (existing) return res.status(409).json({ success: false, message: 'You already applied to this job' });
    const application = await CareerModel.createApplication(userId, { job_id: job.id, cover_note: req.body.cover_note });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// POST /career/internships/:id/apply — student applies to an internship in-platform
router.post('/internships/:id/apply', authenticate, authorize('student'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const internship = await CareerModel.getInternshipById(req.params.id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    if (!internship.is_active) return res.status(400).json({ success: false, message: 'This internship is no longer accepting applications' });
    const existing = await CareerModel.getApplicationByTarget(userId, { internship_id: internship.id });
    if (existing) return res.status(409).json({ success: false, message: 'You already applied to this internship' });
    const application = await CareerModel.createApplication(userId, { internship_id: internship.id, cover_note: req.body.cover_note });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /career/applications/mine — student's application pipeline
router.get('/applications/mine', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const applications = await CareerModel.getApplicationsByUser(req.user!.userId);
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
});

// GET /career/match — roles matched to the student's completed tracks/skills
router.get('/match', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const matches = await CareerModel.matchRolesForUser(req.user!.userId);
    res.json({ success: true, data: matches });
  } catch (error) {
    next(error);
  }
});

// ── Jobs/Internships admin CRUD ──

router.use('/admin', authenticate, authorize('admin', 'super_admin'));

// GET /career/admin/jobs — all listings incl. inactive
router.get('/admin/jobs', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await CareerModel.getAllJobsAdmin() });
  } catch (error) {
    next(error);
  }
});

// POST /career/admin/jobs
router.post('/admin/jobs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    requireFields(req.body, ['title', 'company', 'description']);
    const job = await CareerModel.createJob({
      ...req.body,
      skills: parseSkills(req.body.skills),
      posted_by: req.user!.userId,
    });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// PUT /career/admin/jobs/:id
router.put('/admin/jobs/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await CareerModel.updateJob(req.params.id, { ...req.body, skills: req.body.skills === undefined ? undefined : parseSkills(req.body.skills) });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// PATCH /career/admin/jobs/:id/toggle — activate/deactivate
router.patch('/admin/jobs/:id/toggle', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await CareerModel.setJobActive(req.params.id, req.body.is_active !== false);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// DELETE /career/admin/jobs/:id
router.delete('/admin/jobs/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await CareerModel.deleteJob(req.params.id);
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /career/admin/internships
router.get('/admin/internships', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await CareerModel.getAllInternshipsAdmin() });
  } catch (error) {
    next(error);
  }
});

// POST /career/admin/internships
router.post('/admin/internships', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    requireFields(req.body, ['title', 'company', 'description']);
    const internship = await CareerModel.createInternship({
      ...req.body,
      skills: parseSkills(req.body.skills),
      posted_by: req.user!.userId,
    });
    res.status(201).json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
});

// PUT /career/admin/internships/:id
router.put('/admin/internships/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internship = await CareerModel.updateInternship(req.params.id, { ...req.body, skills: req.body.skills === undefined ? undefined : parseSkills(req.body.skills) });
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    res.json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
});

// PATCH /career/admin/internships/:id/toggle
router.patch('/admin/internships/:id/toggle', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internship = await CareerModel.setInternshipActive(req.params.id, req.body.is_active !== false);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    res.json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
});

// DELETE /career/admin/internships/:id
router.delete('/admin/internships/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await CareerModel.deleteInternship(req.params.id);
    res.json({ success: true, message: 'Internship deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Applications admin pipeline ──

// GET /career/admin/applications?status=reviewing
router.get('/admin/applications', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const applications = await CareerModel.getApplicationsAdmin({ status: req.query.status as string | undefined });
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
});

// PATCH /career/admin/applications/:id — update pipeline status
router.patch('/admin/applications/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const statuses = ['applied', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected'];
    if (!statuses.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid application status' });
    }
    const application = await CareerModel.updateApplicationStatus(req.params.id, req.body.status, req.body.note);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /career/admin/outcomes — aggregate funnel + alumni stats
router.get('/admin/outcomes', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await CareerModel.getCareerOutcomes() });
  } catch (error) {
    next(error);
  }
});

export default router;
