import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/helpers';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import * as UserModel from '../models/user';
import { query } from '../config/db';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

declare global {
  namespace Express {
    interface User extends TokenPayload {
      [key: string]: any;
    }
  }
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to httpOnly cookie
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    // Check if user is suspended
    const user = await UserModel.getUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (user.is_suspended) {
      throw new ForbiddenError('Your account has been suspended');
    }

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}

export function checkDashboardPermission(requiredPath: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError('Not authenticated'));
      if (req.user.role === 'super_admin') return next();
      const { rows } = await query(`SELECT allowed_dashboards, role FROM users WHERE id=$1`, [req.user!.userId]);
      const userRow: any = rows[0];
      if (!userRow) return next(new UnauthorizedError('User not found'));
      const allowed: string[] | null = userRow.allowed_dashboards;
      if (allowed === null || allowed === undefined) return next();
      if (Array.isArray(allowed) && allowed.includes(requiredPath)) return next();
      return next(new ForbiddenError(`Access denied to ${requiredPath}. Contact super_admin.`));
    } catch (e) { next(e); }
  };
}

export async function requireVerifiedEmail(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await UserModel.getUserById(req.user!.userId);
    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }
    if (!user.is_verified) {
      return next(new UnauthorizedError('Please verify your email address.'));
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      req.user = decoded;
    } else if (req.cookies?.token) {
      const decoded = verifyToken(req.cookies.token);
      req.user = decoded;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}
