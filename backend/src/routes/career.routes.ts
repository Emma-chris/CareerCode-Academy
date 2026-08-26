import { Router, Request, Response, NextFunction } from 'express';
import * as CareerModel from '../models/career';

const router = Router();

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

export default router;
