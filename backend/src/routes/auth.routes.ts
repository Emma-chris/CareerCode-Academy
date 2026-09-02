import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as UserModel from '../models/user';
import * as NotificationModel from '../models/notification';
import * as TokenModel from '../models/token';
import { emitDashboardUpdate, emitPasswordResetLink } from '../config/socket';
import { isDatabaseAvailable } from '../config/db';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationCode,
  generatePasswordResetToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/helpers';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['student']).optional().default('student'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  channelId: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

// POST /register
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;

      const existingUser = await UserModel.getUserByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = generateVerificationCode();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await UserModel.createUser({
        name,
        email,
        password: hashedPassword,
        role,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      const tokenPayload = { userId: user.id, role: user.role };
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      emitDashboardUpdate();

      setAuthCookies(res, token, refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account created. Please verify your email.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /login
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await UserModel.getUserByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.is_verified) {
        throw new UnauthorizedError('Please verify your email address.');
      }

      if (user.is_suspended) {
        throw new UnauthorizedError('Your account has been suspended. Please contact support.');
      }

      // Update last_login
      await UserModel.updateUser(user.id, { last_login: new Date() } as any);

      const tokenPayload = { userId: user.id, role: user.role };
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      setAuthCookies(res, token, refreshToken);

      res.json({
        success: true,
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.is_verified,
          allowed_dashboards: (user as any).allowed_dashboards ?? null,
          allowedDashboards: (user as any).allowed_dashboards ?? null,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /forgot-password
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, channelId } = req.body;

      if (!isDatabaseAvailable()) {
        console.warn('[Mail] DATABASE_URL is not set — returning dev mode success response for forgot-password:', email);
        if (channelId) {
          emitPasswordResetLink(channelId, {
            success: true,
            email,
            message: 'Password reset link generated (dev mode - no DB).',
          });
        }
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        });
      }

      const user = await UserModel.getUserByEmail(email);

      if (user) {
        const resetToken = generatePasswordResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await UserModel.updateUser(user.id, {
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry,
        });

        if (channelId) {
          emitPasswordResetLink(channelId, {
            success: true,
            email,
            token: resetToken,
            message: 'Password reset link generated.',
          });
        }

        await sendPasswordResetEmail(email, resetToken);
      }

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      const user = await UserModel.getUserByResetToken(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await UserModel.updateUser(user.id, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      });

      // Revoke all existing sessions
      await TokenModel.deleteAllRefreshTokensForUser(user.id);

      res.json({
        success: true,
        message: 'Password reset successful. All other sessions have been logged out.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /set-password - first-time password setup (instructor approval flow)
const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

router.post(
  '/set-password',
  validate(setPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      const user = await UserModel.getUserBySetupToken(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired setup token');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await UserModel.updateUser(user.id, {
        password: hashedPassword,
        setup_token: null,
        setup_token_expires: null,
        is_verified: true,
      });

      await sendWelcomeEmail(user.email, user.name);

      res.json({
        success: true,
        message: 'Password set successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /verify-email - verify with 6-digit code
const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

router.post(
  '/verify-email',
  validate(verifyCodeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;

      const user = await UserModel.getUserByEmail(email);
      if (!user || user.verification_token !== code) {
        throw new UnauthorizedError('Invalid verification code');
      }

      if (user.is_verified) {
        return res.json({ success: true, message: 'Email already verified.' });
      }

      if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
        throw new UnauthorizedError('Verification code has expired. Please request a new one.');
      }

      await UserModel.updateUser(user.id, {
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
      });

      // Generate fresh tokens
      const tokenPayload = { userId: user.id, role: user.role };
      const newToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      await sendWelcomeEmail(user.email, user.name);
      setAuthCookies(res, newToken, refreshToken);
      res.json({
        success: true,
        message: 'Email verified successfully.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: newToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /verify-email/:token
router.get(
  '/verify-email/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const user = await UserModel.getUserByVerificationToken(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired verification token');
      }

      await UserModel.updateUser(user.id, {
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
      });

      // Generate fresh tokens so the frontend can update auth state without re-login
      const tokenPayload = { userId: user.id, role: user.role };
      const newToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      // Send welcome email
      await sendWelcomeEmail(user.email, user.name);
      setAuthCookies(res, newToken, refreshToken);
      res.json({
        success: true,
        message: 'Email verified successfully.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: newToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /resend-verification
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification email requests. Please try again later.' },
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate(resendVerificationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await UserModel.getUserByEmail(email);

      if (!user || user.is_verified) {
        return res.json({
          success: true,
          message: 'If the account exists and is unverified, a verification email has been sent.',
        });
      }

      const verificationToken = generateVerificationCode();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await UserModel.updateUser(user.id, {
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      await sendVerificationEmail(email, verificationToken);

      res.json({
        success: true,
        message: 'If the account exists and is unverified, a verification email has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /refresh-token
router.post(
  '/refresh-token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }
      const decoded = verifyRefreshToken(refreshToken);

      // Verify token exists in database (whitelist)
      const dbToken = await TokenModel.findRefreshToken(refreshToken);
      if (!dbToken) {
        throw new UnauthorizedError('Invalid or revoked refresh token');
      }

      const user = await UserModel.getUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const newToken = generateToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      // Token Rotation: Delete old token, insert new token
      await TokenModel.deleteRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await TokenModel.createRefreshToken(user.id, newRefreshToken, expiresAt);

      setAuthCookies(res, newToken, newRefreshToken);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        next(new UnauthorizedError('Invalid or expired refresh token'));
      } else if (error.code === '23505') {
        next(new UnauthorizedError('Refresh token already used — please re-authenticate'));
      } else {
        next(error);
      }
    }
  }
);

// POST /logout
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      
      if (refreshToken) {
        await TokenModel.deleteRefreshToken(refreshToken);
      }
      clearAuthCookies(res);
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /me
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await UserModel.getUserById(req.user!.userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /profile
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await UserModel.updateUser(req.user!.userId, req.body);
      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /change-password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
});

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get full user record (with password hash)
      const user = await UserModel.getUserByEmail(
        (await UserModel.getUserById(req.user!.userId))!.email
      );
      if (!user) {
        throw new NotFoundError('User');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await UserModel.updateUser(user.id, { password: hashedPassword });

      // Revoke all existing refresh tokens (force re-login on other devices)
      await TokenModel.deleteAllRefreshTokensForUser(user.id);

      // Generate fresh tokens
      const tokenPayload = { userId: user.id, role: user.role };
      const newToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await TokenModel.createRefreshToken(user.id, refreshToken, expiresAt);

      setAuthCookies(res, newToken, refreshToken);

      res.json({
        success: true,
        message: 'Password changed successfully. Other sessions have been logged out.',
        data: { token: newToken, refreshToken },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /google - Initiate Google OAuth
function requireGoogleOAuth(req: Request, res: Response, next: NextFunction) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
    });
  }
  next();
}

router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /google/callback - Google OAuth callback
router.get(
  '/google/callback',
  requireGoogleOAuth,
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { session: false }, (err: any, data: any) => {
      if (err || !data) {
        console.error('Google OAuth callback error:', err || 'No user data returned');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }
      const { user, token, refreshToken } = data;
      setAuthCookies(res, token, refreshToken);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
    })(req, res, next);
  }
);

export default router;
