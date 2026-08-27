import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { uploadSingle, getFileUrl } from '../middleware/upload';

const router = Router();

// POST /upload — generic file upload returning a public URL
// Used by CourseBuilder (thumbnail/banner) and other clients that need to
// upload media before the owning resource exists.
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin', 'super_admin', 'student'),
  uploadSingle('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const url = getFileUrl(file);
      res.status(201).json({ success: true, data: { url, path: url } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
