import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import * as VisitorModel from '../models/visitor';
import { emitAnalyticsEvent } from '../config/socket';

const router = Router();

// Per-visitor rate limiting: 1 req/sec per visitor per endpoint
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 1000;

// Page view dedup: skip same visitor + URL within 30s
const pageViewDedup = new Map<string, number>();
const DEDUP_WINDOW = 30000;

function analyticsRateLimit(req: Request, res: Response, next: any): void {
  const visitorId = req.cookies?.['vcv_id'];
  if (!visitorId) return next();
  const key = `${visitorId}:${req.path}`;
  const now = Date.now();
  const last = rateLimitMap.get(key) || 0;
  if (now - last < RATE_LIMIT_WINDOW) {
    res.status(200).json({ success: true });
    return;
  }
  rateLimitMap.set(key, now);
  if (rateLimitMap.size > 10000) {
    const cutoff = now - 60000;
    for (const [k, t] of rateLimitMap) {
      if (t < cutoff) rateLimitMap.delete(k);
    }
  }
  next();
}

// All tracking endpoints accept optional auth (work for both anonymous and logged-in users)
router.use((req, res, next) => optionalAuth(req as any, res, next));
router.use(analyticsRateLimit);

function getVisitorId(req: Request): string | undefined {
  return req.cookies?.['vcv_id'];
}

function getUserId(req: Request): string | null {
  return (req as any).user?.userId || null;
}

// POST /analytics/track/page-view
router.post('/track/page-view', (req: Request, res: Response) => {
  const visitorId = getVisitorId(req);
  if (!visitorId) return res.status(200).json({ success: true });

  const { page_url, route_name, time_spent_sec, is_exit_page } = req.body || {};
  if (!page_url) return res.status(200).json({ success: true });

  // Dedup: skip same visitor + URL within 30s
  const dedupKey = `${visitorId}:${page_url}`;
  const now = Date.now();
  const lastView = pageViewDedup.get(dedupKey) || 0;
  if (now - lastView < DEDUP_WINDOW) {
    if (pageViewDedup.size > 50000) {
      const cutoff = now - 60000;
      for (const [k, t] of pageViewDedup) {
        if (t < cutoff) pageViewDedup.delete(k);
      }
    }
    return res.status(200).json({ success: true });
  }
  pageViewDedup.set(dedupKey, now);

  VisitorModel.insertPageView({
    visitor_id: visitorId,
    user_id: getUserId(req),
    page_url: String(page_url).substring(0, 1000),
    route_name: route_name ? String(route_name).substring(0, 255) : null,
    time_spent_sec: Math.min(Math.max(Number(time_spent_sec) || 0, 0), 86400),
    is_exit_page: !!is_exit_page,
  }).catch(() => {});

  setImmediate(() => {
    emitAnalyticsEvent('page-view', { page_url, visitorId, userId: getUserId(req), route_name });
  });

  res.status(200).json({ success: true });
});

// POST /analytics/track/click
router.post('/track/click', (req: Request, res: Response) => {
  const visitorId = getVisitorId(req);
  if (!visitorId) return res.status(200).json({ success: true });

  const { page_url, element_selector, element_text, element_type } = req.body || {};
  if (!page_url || !element_text) return res.status(200).json({ success: true });

  VisitorModel.insertClickEvent({
    visitor_id: visitorId,
    user_id: getUserId(req),
    page_url: String(page_url).substring(0, 1000),
    element_selector: element_selector ? String(element_selector).substring(0, 500) : null,
    element_text: String(element_text).substring(0, 500),
    element_type: element_type ? String(element_type).substring(0, 100) : null,
  }).catch(() => {});

  setImmediate(() => {
    emitAnalyticsEvent('click', { page_url, visitorId, userId: getUserId(req), element_text });
  });

  res.status(200).json({ success: true });
});

// POST /analytics/track/scroll
router.post('/track/scroll', (req: Request, res: Response) => {
  const visitorId = getVisitorId(req);
  if (!visitorId) return res.status(200).json({ success: true });

  const { page_url, depth, max_depth } = req.body || {};
  if (!page_url) return res.status(200).json({ success: true });

  const depthNum = Number(depth) || 0;

  VisitorModel.upsertScrollEvent({
    visitor_id: visitorId,
    user_id: getUserId(req),
    page_url: String(page_url).substring(0, 1000),
    depth_25: depthNum >= 25,
    depth_50: depthNum >= 50,
    depth_75: depthNum >= 75,
    depth_100: depthNum >= 100,
    max_depth: Math.min(Math.max(Number(max_depth) || depthNum, depthNum), 100),
  }).catch(() => {});

  setImmediate(() => {
    emitAnalyticsEvent('scroll', { page_url, visitorId, userId: getUserId(req), depth: depthNum });
  });

  res.status(200).json({ success: true });
});

// POST /analytics/track/journey
router.post('/track/journey', (req: Request, res: Response) => {
  const visitorId = getVisitorId(req);
  if (!visitorId) return res.status(200).json({ success: true });

  const { page_url, conversion_type, converted, enrolled_course_id } = req.body || {};
  if (!page_url) return res.status(200).json({ success: true });

  VisitorModel.upsertUserJourney({
    visitor_id: visitorId,
    user_id: getUserId(req),
    page_url: String(page_url).substring(0, 1000),
    conversion_type: conversion_type ? String(conversion_type).substring(0, 50) : null,
    converted: !!converted,
    enrolled_course_id: enrolled_course_id || null,
  }).catch(() => {});

  setImmediate(() => {
    emitAnalyticsEvent('journey', { page_url, visitorId, userId: getUserId(req), conversion_type, converted: !!converted });
  });

  res.status(200).json({ success: true });
});

// POST /analytics/track/heartbeat
router.post('/track/heartbeat', (req: Request, res: Response) => {
  const visitorId = getVisitorId(req);
  if (!visitorId) return res.status(200).json({ success: true });

  VisitorModel.upsertVisitor(visitorId, {
    user_id: getUserId(req),
  }).catch(() => {});

  setImmediate(() => {
    emitAnalyticsEvent('heartbeat', { visitorId, userId: getUserId(req) });
  });

  res.status(200).json({ success: true });
});

export default router;
