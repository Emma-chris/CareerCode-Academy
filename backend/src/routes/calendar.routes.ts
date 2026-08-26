import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import * as Calendar from '../models/calendar';

const router = Router();

const emptyToUndef = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().optional()
);
const emptyToUndefUuid = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().uuid().optional()
);

const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: emptyToUndef,
  event_type: z.enum([
    'live_session', 'class', 'lecture', 'module_release',
    'assignment', 'quiz', 'exam', 'challenge', 'project_deadline',
    'code_review', 'mentorship', 'career_event', 'community_event',
    'announcement', 'workshop', 'meeting',
  ]),
  start_datetime: z.string(),
  end_datetime: z.string(),
  timezone: z.string().default('UTC'),
  location: emptyToUndef,
  meeting_url: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.string().url().optional()
  ),
  meeting_platform: emptyToUndef,
  color: emptyToUndef,
  course_id: emptyToUndefUuid,
  module_id: emptyToUndefUuid,
  program_id: emptyToUndefUuid,
  cohort_id: emptyToUndef,
  school_id: emptyToUndefUuid,
  instructor_id: emptyToUndefUuid,
  community_id: emptyToUndefUuid,
  channel_id: emptyToUndefUuid,
  visibility: z.enum([
    'public', 'students_only', 'specific_program',
    'specific_cohort', 'specific_school', 'specific_community',
  ]).default('public'),
  visibility_target_id: emptyToUndefUuid,
  status: z.enum(['draft', 'scheduled', 'live', 'completed', 'cancelled']).default('scheduled'),
  is_recurring: z.boolean().optional(),
  recurrence_rule: emptyToUndef,
  max_attendees: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  reminder_minutes: z.array(z.number().int()).optional(),
});

const updateEventSchema = createEventSchema.partial();

const rsvpSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
});

function canCreateEvent(role: string): boolean {
  return ['admin', 'super_admin', 'instructor'].includes(role);
}

function canManageEvent(role: string, event: Calendar.CalendarEvent, userId: string): boolean {
  if (['admin', 'super_admin'].includes(role)) return true;
  if (event.created_by === userId) return true;
  if (event.instructor_id === userId) return true;
  return false;
}

// List events (with filters)
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { events, total } = await Calendar.getEvents(
      {
        start: req.query.start as string,
        end: req.query.end as string,
        event_type: req.query.event_type as string,
        status: req.query.status as string,
        course_id: req.query.course_id as string,
        instructor_id: req.query.instructor_id as string,
        school_id: req.query.school_id as string,
        community_id: req.query.community_id as string,
        created_by: req.query.created_by as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      },
      req.user!.userId,
      req.user!.role
    );
    res.json({ success: true, data: events, total });
  } catch (error) {
    next(error);
  }
});

// Get events for a date range (month/week/day view)
router.get('/range', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const start = req.query.start as string;
    const end = req.query.end as string;
    if (!start || !end) {
      res.status(400).json({ success: false, message: 'start and end query params required' });
      return;
    }
    const events = await Calendar.getEventsForRange(start, end, req.user!.userId, req.user!.role);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// Get upcoming events
router.get('/upcoming', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const events = await Calendar.getUpcomingEvents(req.user!.userId, req.user!.role, limit);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// Get event stats (admin only)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError('Admin access required');
    }
    const stats = await Calendar.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get single event
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await Calendar.getEventById(req.params.id, req.user!.userId);
    if (!event) throw new NotFoundError('Event');
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// Create event
router.post('/', authenticate, validate(createEventSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreateEvent(req.user!.role)) {
      throw new ForbiddenError('Only admins and instructors can create events');
    }
    const event = await Calendar.createEvent({ ...req.body, created_by: req.user!.userId });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// Update event
router.put('/:id', authenticate, validate(updateEventSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await Calendar.getEventById(req.params.id);
    if (!existing) throw new NotFoundError('Event');
    if (!canManageEvent(req.user!.role, existing, req.user!.userId)) {
      throw new ForbiddenError('You do not have permission to edit this event');
    }
    const event = await Calendar.updateEvent(req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await Calendar.getEventById(req.params.id);
    if (!existing) throw new NotFoundError('Event');
    if (!canManageEvent(req.user!.role, existing, req.user!.userId)) {
      throw new ForbiddenError('You do not have permission to delete this event');
    }
    await Calendar.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

// RSVP to event
router.post('/:id/rsvp', authenticate, validate(rsvpSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await Calendar.getEventById(req.params.id);
    if (!event) throw new NotFoundError('Event');
    await Calendar.setRsvp(req.params.id, req.user!.userId, req.body.status);
    res.json({ success: true, message: 'RSVP updated' });
  } catch (error) {
    next(error);
  }
});

// Get RSVPs for event
router.get('/:id/rsvps', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await Calendar.getEventById(req.params.id);
    if (!event) throw new NotFoundError('Event');
    const rsvps = await Calendar.getRsvps(req.params.id);
    res.json({ success: true, data: rsvps });
  } catch (error) {
    next(error);
  }
});

export default router;
