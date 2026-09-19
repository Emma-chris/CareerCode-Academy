import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { once } from 'node:events';

process.env.JWT_SECRET = 'test-secret';

// ───────────── modules under test (imported after mocking seams) ─────────────

const testUsers = {
  'admin-1':    { id: 'admin-1',    name: 'Admin',    email: 'admin@x.com',    role: 'admin',       is_verified: true,  is_suspended: false, allowed_dashboards: null },
  'super-1':    { id: 'super-1',    name: 'Super',    email: 'super@x.com',    role: 'super_admin', is_verified: true,  is_suspended: false, allowed_dashboards: null },
  'instr-1':    { id: 'instr-1',    name: 'Instr',    email: 'instr@x.com',    role: 'instructor',  is_verified: true,  is_suspended: false, allowed_dashboards: null },
  'student-1':  { id: 'student-1',  name: 'Student',  email: 's@x.com',        role: 'student',     is_verified: true,  is_suspended: false, allowed_dashboards: null },
  'student-2':  { id: 'student-2',  name: 'Student2', email: 's2@x.com',       role: 'student',     is_verified: true,  is_suspended: false, allowed_dashboards: null },
  'suspended-1':{ id: 'suspended-1',name: 'Banned',   email: 'b@x.com',        role: 'admin',       is_verified: true,  is_suspended: true,  allowed_dashboards: null },
  'unverified-1':{ id: 'unverified-1', name: 'Un',    email: 'u@x.com',        role: 'admin',       is_verified: false, is_suspended: false, allowed_dashboards: null },
};

// Auth middleware (real) does a DB lookup for the user, so mock config/db.
mock.module('../config/db.ts', {
  namedExports: {
    query: async (text, params) => {
      if (text.includes('FROM users')) {
        return { rows: [testUsers[params?.[0]] || null] };
      }
      return { rows: [] };
    },
  },
});

// Calendar model (mocked) — routes layer behavior test double.
function makeFakeCalendar() {
  let nextId = 1;
  const events = new Map();
  const rsvps = new Map();
  const calls = { getEvents: [], getEventById: [], getEventsForRange: [], getUpcomingEvents: [], getStats: [] };

  function seedEvent(overrides = {}) {
    const e = {
      id: `evt-${nextId++}`, title: 'Default Event', description: null, event_type: 'class',
      start_datetime: '2026-01-01T10:00:00Z', end_datetime: '2026-01-01T11:00:00Z', timezone: 'UTC',
      location: null, meeting_url: null, meeting_platform: null, color: null,
      course_id: null, module_id: null, program_id: null, cohort_id: null, school_id: null,
      instructor_id: null, community_id: null, channel_id: null, created_by: 'admin-1',
      visibility: 'public', visibility_target_id: null, status: 'scheduled',
      is_recurring: false, recurrence_rule: null, max_attendees: null, reminder_minutes: [],
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      ...overrides,
    };
    events.set(e.id, e);
    return e;
  }

  function clone(e) { return { ...e }; }

  return {
    __calls: calls,
    __events: events,
    seedEvent,
    getEvents: async (params, userId, userRole) => {
      calls.getEvents.push({ params, userId, userRole });
      const all = [...events.values()].map(clone);
      return { events: all, total: all.length };
    },
    getEventsForRange: async (start, end, userId, userRole) => {
      calls.getEventsForRange.push({ start, end, userId, userRole });
      return [...events.values()].map(clone);
    },
    getUpcomingEvents: async (userId, userRole, limit) => {
      calls.getUpcomingEvents.push({ userId, userRole, limit });
      return [...events.values()].map(clone);
    },
    getStats: async () => {
      calls.getStats.push(true);
      const all = [...events.values()];
      const count = (status) => all.filter((e) => e.status === status).length;
      const by_type = {};
      for (const e of all) by_type[e.event_type] = (by_type[e.event_type] || 0) + 1;
      return { total: all.length, scheduled: count('scheduled'), live: count('live'), completed: count('completed'), cancelled: count('cancelled'), draft: count('draft'), by_type };
    },
    getEventById: async (id, userId) => {
      calls.getEventById.push({ id, userId });
      const e = events.get(id);
      return e ? { ...e, course_title: null, instructor_name: null, rsvp_count: 0 } : null;
    },
    createEvent: async (input) => {
      const evt = { ...seedEvent(), ...input, id: `evt-${nextId++}` };
      events.set(evt.id, evt);
      return clone(evt);
    },
    updateEvent: async (id, input) => {
      const e = events.get(id);
      if (!e) return null;
      Object.assign(e, input, { updated_at: '2026-01-02T00:00:00Z' });
      return clone(e);
    },
    deleteEvent: async (id) => {
      return events.delete(id);
    },
    setRsvp: async (eventId, userId, status) => {
      rsvps.set(`${eventId}:${userId}`, { event_id: eventId, user_id: userId, status });
    },
    getRsvps: async (eventId) => {
      return [...rsvps.values()]
        .filter((r) => r.event_id === eventId)
        .map((r) => ({ ...r, name: testUsers[r.user_id]?.name || 'User', avatar: null }));
    },
  };
}

const fake = makeFakeCalendar();
const fakeModule = {
  getEvents: fake.getEvents,
  getEventsForRange: fake.getEventsForRange,
  getUpcomingEvents: fake.getUpcomingEvents,
  getStats: fake.getStats,
  getEventById: fake.getEventById,
  createEvent: fake.createEvent,
  updateEvent: fake.updateEvent,
  deleteEvent: fake.deleteEvent,
  setRsvp: fake.setRsvp,
  getRsvps: fake.getRsvps,
};

mock.module('../models/calendar.ts', { namedExports: fakeModule });

const calendarRoutes = (await import('../routes/calendar.routes.ts')).default;

// ───────────── test app / HTTP helper ─────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/calendar', calendarRoutes);
  // Error handler mirroring backend/src/middleware/errorHandler.ts (AppError branch)
  app.use((err, _req, res, _next) => {
    if (err && err.statusCode) {
      const body = { success: false, message: err.message };
      if (err.errors) body.errors = err.errors;
      return res.status(err.statusCode).json(body);
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  });
  return app;
}

let server;
let baseUrl;

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

function makeToken(userId) {
  return jwt.sign({ userId, role: testUsers[userId].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

before(async () => {
  server = buildApp().listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

describe('GET /calendar', () => {
  it('returns events and total', async () => {
    fake.seedEvent({ title: 'Alpha', event_type: 'class', status: 'scheduled' });
    fake.seedEvent({ title: 'Beta', event_type: 'exam', status: 'live' });
    const { status, json } = await request('GET', '/calendar', { token: makeToken('admin-1') });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(Array.isArray(json.data), true);
    assert.equal(json.total, 2);
    assert.equal(json.data.length, 2);
  });

  it('forwards query filters to the model', async () => {
    fake.__calls.getEvents.length = 0;
    const { status } = await request('GET', '/calendar?event_type=class&status=scheduled&search=js&course_id=c1&instructor_id=i1&school_id=s1&community_id=com1&created_by=admin-1&page=2&limit=10', {
      token: makeToken('admin-1'),
    });
    assert.equal(status, 200);
    const call = fake.__calls.getEvents[fake.__calls.getEvents.length - 1];
    assert.equal(call.params.event_type, 'class');
    assert.equal(call.params.status, 'scheduled');
    assert.equal(call.params.course_id, 'c1');
    assert.equal(call.params.instructor_id, 'i1');
    assert.equal(call.params.school_id, 's1');
    assert.equal(call.params.community_id, 'com1');
    assert.equal(call.params.created_by, 'admin-1');
    assert.equal(call.params.search, 'js');
    assert.equal(call.params.page, 2);
    assert.equal(call.params.limit, 10);
    assert.equal(call.params.start, undefined);
    assert.equal(call.params.end, undefined);
    assert.equal(call.userId, 'admin-1');
    assert.equal(call.userRole, 'admin');
  });

  it('requires authentication', async () => {
    const { status, json } = await request('GET', '/calendar');
    assert.equal(status, 401);
    assert.equal(json.success, false);
  });

  it('rejects an invalid token', async () => {
    const { status } = await request('GET', '/calendar', { token: 'not-a-jwt' });
    assert.equal(status, 401);
  });

  it('rejects suspended and unverified users', async () => {
    const susp = await request('GET', '/calendar', { token: makeToken('suspended-1') });
    assert.equal(susp.status, 403);
    const unverif = await request('GET', '/calendar', { token: makeToken('unverified-1') });
    assert.equal(unverif.status, 401);
  });
});

describe('GET /calendar/range', () => {
  it('returns events for a range', async () => {
    const { status, json } = await request('GET', '/calendar/range?start=2026-01-01&end=2026-01-31', { token: makeToken('admin-1') });
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  it('requires start and end params', async () => {
    const missingStart = await request('GET', '/calendar/range?end=2026-01-31', { token: makeToken('admin-1') });
    assert.equal(missingStart.status, 400);
    const missingEnd = await request('GET', '/calendar/range?start=2026-01-01', { token: makeToken('admin-1') });
    assert.equal(missingEnd.status, 400);
  });
});

describe('GET /calendar/upcoming', () => {
  it('returns upcoming events and forwards limit', async () => {
    fake.__calls.getUpcomingEvents.length = 0;
    const { status, json } = await request('GET', '/calendar/upcoming?limit=5', { token: makeToken('instr-1') });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(fake.__calls.getUpcomingEvents[0].limit, 5);
  });
});

describe('GET /calendar/stats', () => {
  it('returns stats for admins', async () => {
    fake.__events.clear();
    fake.seedEvent({ status: 'draft' });
    fake.seedEvent({ event_type: 'exam', status: 'cancelled' });
    const { status, json } = await request('GET', '/calendar/stats', { token: makeToken('admin-1') });
    assert.equal(status, 200);
    assert.equal(json.data.total, 2);
    assert.equal(json.data.draft, 1);
    assert.equal(json.data.cancelled, 1);
    assert.equal(json.data.by_type.class, 1);
    assert.equal(json.data.by_type.exam, 1);
  });

  it('forbids non-admin roles', async () => {
    const { status, json } = await request('GET', '/calendar/stats', { token: makeToken('student-1') });
    assert.equal(status, 403);
    assert.equal(json.success, false);
  });
});

describe('GET /calendar/:id', () => {
  it('returns a single event with joined fields', async () => {
    const evt = fake.seedEvent({ title: 'Single' });
    const { status, json } = await request('GET', `/calendar/${evt.id}`, { token: makeToken('student-1') });
    assert.equal(status, 200);
    assert.equal(json.data.title, 'Single');
    assert.equal(json.data.rsvp_count, 0);
  });

  it('returns 404 for unknown event', async () => {
    const { status, json } = await request('GET', '/calendar/nope', { token: makeToken('admin-1') });
    assert.equal(status, 404);
    assert.equal(json.success, false);
  });
});

describe('POST /calendar', () => {
  const validBody = () => ({
    title: 'New Live Session', event_type: 'live_session',
    start_datetime: '2026-01-10T10:00:00Z', end_datetime: '2026-01-10T11:00:00Z',
  });

  it('creates an event as admin (201)', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: validBody() });
    assert.equal(status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.title, 'New Live Session');
    assert.equal(json.data.created_by, 'admin-1');
    assert.equal(json.data.visibility, 'public');
    assert.equal(json.data.status, 'scheduled');
  });

  it('creates an event as instructor', async () => {
    const { status } = await request('POST', '/calendar', { token: makeToken('instr-1'), body: validBody() });
    assert.equal(status, 201);
  });

  it('forbids students from creating events', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('student-1'), body: validBody() });
    assert.equal(status, 403);
    assert.equal(json.message, 'Only admins and instructors can create events');
  });

  it('validates required fields (title, start, end, type)', async () => {
    const missingTitle = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { event_type: 'class', start_datetime: '2026-01-10T10:00:00Z', end_datetime: '2026-01-10T11:00:00Z' } });
    assert.equal(missingTitle.status, 400);
    const missingStart = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { title: 'X', event_type: 'class', end_datetime: '2026-01-10T11:00:00Z' } });
    assert.equal(missingStart.status, 400);
    const missingType = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { title: 'X', start_datetime: '2026-01-10T10:00:00Z', end_datetime: '2026-01-10T11:00:00Z' } });
    assert.equal(missingType.status, 400);
  });

  it('rejects empty title', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), title: '' } });
    assert.equal(status, 400);
    assert.ok(json.errors.title);
  });

  it('rejects invalid event_type enum', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), event_type: 'party' } });
    assert.equal(status, 400);
    assert.ok(json.errors.event_type);
  });

  it('rejects invalid status enum', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), status: 'exploded' } });
    assert.equal(status, 400);
    assert.ok(json.errors.status);
  });

  it('rejects invalid visibility enum', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), visibility: 'everyone_ever' } });
    assert.equal(status, 400);
    assert.ok(json.errors.visibility);
  });

  it('rejects invalid meeting_url', async () => {
    const { status, json } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), meeting_url: 'not-a-url' } });
    assert.equal(status, 400);
    assert.ok(json.errors.meeting_url);
  });

  it('rejects invalid max_attendees', async () => {
    const negative = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), max_attendees: -5 } });
    assert.equal(negative.status, 400);
    const float = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), max_attendees: 2.5 } });
    assert.equal(float.status, 400);
  });

  it('coerces empty max_attendees to undefined and creates fine', async () => {
    const { status } = await request('POST', '/calendar', { token: makeToken('admin-1'), body: { ...validBody(), max_attendees: '' } });
    assert.equal(status, 201);
  });
});

describe('PUT /calendar/:id', () => {
  it('updates an event as admin', async () => {
    const evt = fake.seedEvent({ title: 'Before' });
    const { status, json } = await request('PUT', `/calendar/${evt.id}`, { token: makeToken('admin-1'), body: { title: 'After' } });
    assert.equal(status, 200);
    assert.equal(json.data.title, 'After');
  });

  it('lets the creator update their own event regardless of role', async () => {
    const evt = fake.seedEvent({ created_by: 'student-1', title: 'Owned' });
    const { status, json } = await request('PUT', `/calendar/${evt.id}`, { token: makeToken('student-1'), body: { title: 'Owned Updated' } });
    assert.equal(status, 200);
    assert.equal(json.data.title, 'Owned Updated');
  });

  it('lets the assigned instructor update an event', async () => {
    const evt = fake.seedEvent({ instructor_id: 'instr-1', title: 'Taught' });
    const { status } = await request('PUT', `/calendar/${evt.id}`, { token: makeToken('instr-1'), body: { title: 'Taught v2' } });
    assert.equal(status, 200);
  });

  it('forbids non-creator, non-instructor, non-admin updates', async () => {
    const evt = fake.seedEvent({ created_by: 'admin-1', instructor_id: null, title: 'Locked' });
    const { status, json } = await request('PUT', `/calendar/${evt.id}`, { token: makeToken('student-2'), body: { title: 'Nope' } });
    assert.equal(status, 403);
    assert.equal(json.message, 'You do not have permission to edit this event');
  });

  it('returns 404 for unknown event', async () => {
    const { status } = await request('PUT', '/calendar/ghost', { token: makeToken('admin-1'), body: { title: 'X' } });
    assert.equal(status, 404);
  });

  it('validates update body', async () => {
    const evt = fake.seedEvent({ title: 'Valid' });
    const { status, json } = await request('PUT', `/calendar/${evt.id}`, { token: makeToken('admin-1'), body: { event_type: 'bad' } });
    assert.equal(status, 400);
    assert.ok(json.errors.event_type);
  });
});

describe('DELETE /calendar/:id', () => {
  it('deletes an event as admin', async () => {
    const evt = fake.seedEvent({ title: 'Doomed' });
    const { status, json } = await request('DELETE', `/calendar/${evt.id}`, { token: makeToken('admin-1') });
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  it('forbids unauthorized deletion', async () => {
    const evt = fake.seedEvent({ created_by: 'admin-1', title: 'Protected' });
    const { status } = await request('DELETE', `/calendar/${evt.id}`, { token: makeToken('student-1') });
    assert.equal(status, 403);
  });

  it('returns 404 for unknown event', async () => {
    const { status } = await request('DELETE', '/calendar/ghost', { token: makeToken('admin-1') });
    assert.equal(status, 404);
  });
});

describe('RSVP endpoints', () => {
  it('POST /:id/rsvp accepts going/maybe/not_going', async () => {
    const evt = fake.seedEvent({ title: 'Rsvp' });
    for (const s of ['going', 'maybe', 'not_going']) {
      const { status } = await request('POST', `/calendar/${evt.id}/rsvp`, { token: makeToken('student-1'), body: { status: s } });
      assert.equal(status, 200);
    }
  });

  it('rejects an invalid rsvp status', async () => {
    const evt = fake.seedEvent({ title: 'Rsvp2' });
    const { status, json } = await request('POST', `/calendar/${evt.id}/rsvp`, { token: makeToken('student-1'), body: { status: 'wedging' } });
    assert.equal(status, 400);
    assert.ok(json.errors.status);
  });

  it('returns 404 when rsvping an unknown event', async () => {
    const { status } = await request('POST', '/calendar/ghost/rsvp', { token: makeToken('student-1'), body: { status: 'going' } });
    assert.equal(status, 404);
  });

  it('GET /:id/rsvps lists attendees', async () => {
    const evt = fake.seedEvent({ title: 'Rsvp3' });
    await request('POST', `/calendar/${evt.id}/rsvp`, { token: makeToken('student-1'), body: { status: 'going' } });
    const { status, json } = await request('GET', `/calendar/${evt.id}/rsvps`, { token: makeToken('admin-1') });
    assert.equal(status, 200);
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].user_id, 'student-1');
    assert.equal(json.data[0].status, 'going');
  });

  it('GET /:id/rsvps returns 404 for unknown event', async () => {
    const { status } = await request('GET', '/calendar/ghost/rsvps', { token: makeToken('admin-1') });
    assert.equal(status, 404);
  });
});