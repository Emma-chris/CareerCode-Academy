import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { upsertVisitor, endSession } from '../models/visitor';

export interface AnalyticsRequest extends AuthRequest {
  visitorId?: string;
  visitor?: any;
}

const VISITOR_COOKIE = 'vcv_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

function parseDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  return 'Other';
}

function generateVisitorId(): string {
  return 'vcv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
}

export function analyticsTracker(req: AnalyticsRequest, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  let visitorId = req.cookies?.[VISITOR_COOKIE];
  const isNewVisitor = !visitorId;

  if (!visitorId) {
    visitorId = generateVisitorId();
    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const ua = (req.headers['user-agent'] || 'Unknown').substring(0, 200);
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

  const visitorData = {
    user_id: req.user?.userId || null,
    ip_address: ip.substring(0, 45),
    device_type: parseDeviceType(ua),
    browser: parseBrowser(ua),
    os: parseOS(ua),
    referral_source: (req.headers['referer'] || req.headers['referrer'] || '').toString().substring(0, 255) || 'Direct',
    landing_page: req.originalUrl?.substring(0, 500) || '/',
  };

  req.visitorId = visitorId;

  if (isNewVisitor && process.env.NODE_ENV !== 'test') {
    upsertVisitor(visitorId, visitorData).catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Visitor upsert error:', err.message);
      }
    });
  } else if (!isNewVisitor && process.env.NODE_ENV !== 'test') {
    upsertVisitor(visitorId, { ...visitorData }).catch(() => {});
  }

  res.on('finish', () => {
    // Track response time as part of analytics if needed
    const duration = Date.now() - startTime;
    if (duration > 5000 && process.env.NODE_ENV === 'development') {
      console.warn(`Slow request: ${req.method} ${req.originalUrl} (${duration}ms)`);
    }
  });

  next();
}

export async function trackSessionEnd(req: AnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
  const visitorId = req.cookies?.[VISITOR_COOKIE];
  if (visitorId) {
    try {
      await endSession(visitorId);
    } catch {
      // Silently fail
    }
  }
  next();
}
