import { Router, Request, Response, NextFunction } from 'express';
import * as SchoolModel from '../models/school';

const router = Router();

// GET /schools — list all schools with program counts
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = await SchoolModel.getAllSchools();
    res.json({ success: true, data: schools });
  } catch (error) {
    next(error);
  }
});

// GET /schools/:slug — school detail with programs
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await SchoolModel.getSchoolBySlug(req.params.slug);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const programs = await SchoolModel.getProgramsBySchool(school.id);
    res.json({ success: true, data: { ...school, programs } });
  } catch (error) {
    next(error);
  }
});

// GET /schools/programs/:slug — program detail with courses
router.get('/programs/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const program = await SchoolModel.getProgramBySlug(req.params.slug);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    const courses = await SchoolModel.getProgramCourses(program.id);
    res.json({ success: true, data: { ...program, courses } });
  } catch (error) {
    next(error);
  }
});

export default router;
