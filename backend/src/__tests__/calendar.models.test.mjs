import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// ───────────── mocked DB (records every query + params) ─────────────

const calls = [];
const returnPlan = [];

mock.module('../config/db.ts', {
  namedExports: {
    query: async (text, params) => {
      calls.push({ text, params });
      if (returnPlan.length > 0) {
        return returnPlan.shift();
      }
      return { rows: [] };
    },
  },
});

const CalendarModel = await import('../models/calendar.ts');

function reset() {
  calls.length = 0;
  returnPlan.length = 0;
}

const ID = '3dd2a9c0-aa0a-4f3a-9e2a-111111111111';
const OTHER = '3dd2a9c0-aa0a-4f3a-9e2a-222222222222';

describe('calendar model — CREATE', () => {
  it('inserts with defaults (timezone UTC, visibility public, status scheduled, default reminders)', async () => {
    reset();
    returnPlan.push({ rows: [{ id: ID, title: 'T', event_type: 'class' }] });
    const evt = await CalendarModel.createEvent({ title: 'T', event_type: 'class', start_datetime: '2026-01-01T10:00:00Z', end_datetime: '2026-01-01T11:00:00Z', created_by: 'admin-1' });
    assert.equal(evt.id, ID);
    const sql = calls[0].text;
    assert.match(sql, /INSERT INTO calendar_events/);
    assert.match(sql, /RETURNING \*/);
    assert.deepEqual(calls[0].params.slice(2, 6), ['class', '2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z', 'UTC']);
    // defaults: visibility -> 'public', status -> 'scheduled', reminders -> [1440,60,15]
    const params = calls[0].params;
    assert.equal(params[18], 'admin-1');       // created_by
    assert.equal(params[19], 'public');         // visibility
    assert.equal(params[21], 'scheduled');      // status
    assert.deepEqual(params[25], [1440, 60, 15]); // reminder_minutes
  });

  it('defaults color from event type', async () => {
    reset();
    returnPlan.push({ rows: [{ id: ID }] });
    await CalendarModel.createEvent({ title: 'T', event_type: 'exam', start_datetime: '2026-01-01T10:00:00Z', end_datetime: '2026-01-01T11:00:00Z', created_by: 'a' });
    assert.equal(calls[0].params[9], '#ef4444'); // exam color
  });
});

describe('calendar model — UPDATE', () => {
  it('only sets fields provided and bumps updated_at', async () => {
    reset();
    returnPlan.push({ rows: [{ id: ID, title: 'New' }] });
    await CalendarModel.updateEvent(ID, { title: 'New' });
    assert.match(calls[0].text, /UPDATE calendar_events SET title = \$1, updated_at = NOW\(\) WHERE id = \$2/);
    assert.deepEqual(calls[0].params, ['New', ID]);
  });

  it('returns null update when no fields provided', async () => {
    reset();
    const result = await CalendarModel.updateEvent(ID, {});
    assert.equal(result, null);
    assert.equal(calls.length, 0);
  });
});

describe('calendar model — DELETE', () => {
  it('deletes by id and returns whether a row was affected', async () => {
    reset();
    returnPlan.push({ rowCount: 1 });
    const ok = await CalendarModel.deleteEvent(ID);
    assert.equal(ok, true);
    assert.equal(calls[0].params[0], ID);
  });
});

describe('calendar model — getEventById', () => {
  it('selects joined fields and rsvp_count', async () => {
    reset();
    returnPlan.push({ rows: [{ id: ID }] });
    await CalendarModel.getEventById(ID);
    const sql = calls[0].text;
    assert.match(sql, /LEFT JOIN courses c ON c\.id = ce\.course_id/);
    assert.match(sql, /LEFT JOIN users u ON u\.id = ce\.instructor_id/);
    assert.match(sql, /FROM calendar_event_rsvps WHERE event_id = ce\.id AND status = 'going'\) as rsvp_count/);
    assert.doesNotMatch(sql, /is_rsvpd/);
    assert.deepEqual(calls[0].params, [ID]);
  });

  it('adds is_rsvpd subquery when a userId is supplied', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await CalendarModel.getEventById(ID, 'user-9');
    const sql = calls[0].text;
    assert.match(sql, /is_rsvpd/);
    assert.deepEqual(calls[0].params, [ID, 'user-9']);
  });
});

describe('calendar model — getEvents filtering (WHERE building)', () => {
  it('returns all events with no filters', async () => {
    reset();
    returnPlan.push({ rows: [{ count: '0' }] }, { rows: [] });
    const res = await CalendarModel.getEvents({}, 'admin-1', 'admin');
    assert.equal(res.total, 0);
    assert.deepEqual(res.events, []);
    assert.doesNotMatch(calls[0].text, /WHERE ce\./);
    assert.doesNotMatch(calls[1].text, /WHERE ce\./);
  });

  it('applies visibility restriction for non-admin roles', async () => {
    reset();
    returnPlan.push({ rows: [{ count: '3' }] }, { rows: [{ id: ID }] });
    const res = await CalendarModel.getEvents({}, 'student-1', 'student');
    assert.equal(res.total, 3);
    assert.match(calls[0].text, /ce\.visibility = 'public'[\s\S]*?ce\.created_by = \$1[\s\S]*?ce\.instructor_id = \$1/);
    // user id injected for visibility filter and as rsvp_status param
    assert.deepEqual(calls[0].params, ['student-1']);
    assert.equal(calls[1].params[calls[1].params.length - 1], 'student-1');
  });

  it('does not restrict visibility for admins', async () => {
    reset();
    returnPlan.push({ rows: [{ count: '0' }] }, { rows: [] });
    await CalendarModel.getEvents({}, 'admin-1', 'admin');
    assert.doesNotMatch(calls[0].text, /visibility = 'public'/);
    assert.deepEqual(calls[0].params, []);
  });

  it('applies every filter param with correct precedence', async () => {
    reset();
    returnPlan.push({ rows: [{ count: '1' }] }, { rows: [{ id: ID, title: 'Only' }] });
    const res = await CalendarModel.getEvents(
      { start: 'S', end: 'E', event_type: 'exam', status: 'live', course_id: 'C', instructor_id: 'I', school_id: 'H', community_id: 'M', created_by: 'B', search: 'needle' },
      'admin-1', 'admin'
    );
    assert.equal(res.events.length, 1);
    const sql = calls[0].text;
    // all conditions present
    assert.match(sql, /ce\.end_datetime >= \$1/);
    assert.match(sql, /ce\.start_datetime <= \$2/);
    assert.match(sql, /ce\.event_type = \$3/);
    assert.match(sql, /ce\.status = \$4/);
    assert.match(sql, /ce\.course_id = \$5/);
    assert.match(sql, /ce\.instructor_id = \$6/);
    assert.match(sql, /ce\.school_id = \$7/);
    assert.match(sql, /ce\.community_id = \$8/);
    assert.match(sql, /ce\.created_by = \$9/);
    assert.match(sql, /\(ce\.title ILIKE \$10 OR ce\.description ILIKE \$10\)/);
    assert.deepEqual(calls[0].params[9], '%needle%');
  });

  it('orders by start_datetime ascending and applies LIMIT/OFFSET', async () => {
    reset();
    returnPlan.push({ rows: [{ count: '100' }] }, { rows: [] });
    await CalendarModel.getEvents({ page: 3, limit: 10 }, 'admin-1', 'admin');
    assert.match(calls[1].text, /ORDER BY ce\.start_datetime ASC/);
    assert.match(calls[1].text, /LIMIT 10 OFFSET 20/);
  });
});

describe('calendar model — getEventsForRange', () => {
  it('filters overlapping events by start/end', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await CalendarModel.getEventsForRange('2026-01-01', '2026-01-31', 'admin-1', 'admin');
    assert.match(calls[0].text, /ce\.start_datetime <= \$2 AND ce\.end_datetime >= \$1/);
  });

  it('restricts visibility for non-admins', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await CalendarModel.getEventsForRange('2026-01-01', '2026-01-31', 'student-1', 'student');
    assert.match(calls[0].text, /ce\.visibility = 'public' OR ce\.created_by = \$3 OR ce\.instructor_id = \$3/);
  });
});

describe('calendar model — getUpcomingEvents', () => {
  it('filters future scheduled/live events', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await CalendarModel.getUpcomingEvents('student-1', 'student', 5);
    assert.match(calls[0].text, /ce\.start_datetime >= NOW\(\)/);
    assert.match(calls[0].text, /ce\.status IN \('scheduled', 'live'\)/);
    assert.match(calls[0].text, /LIMIT 5/);
  });

  it('skips visibility restriction for admins', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await CalendarModel.getUpcomingEvents('admin-1', 'admin', 10);
    assert.doesNotMatch(calls[0].text, /visibility = 'public'/);
  });
});

describe('calendar model — getStats', () => {
  it('aggregates a status count row and per-type counts', async () => {
    reset();
    returnPlan.push(
      { rows: [{ total: 6, scheduled: 2, live: 1, completed: 1, cancelled: 1, draft: 1 }] },
      { rows: [{ event_type: 'class', count: 4 }, { event_type: 'exam', count: 2 }] }
    );
    const stats = await CalendarModel.getStats();
    assert.equal(stats.total, 6);
    assert.equal(stats.scheduled, 2);
    assert.equal(stats.live, 1);
    assert.deepEqual(stats.by_type, { class: 4, exam: 2 });
    assert.match(calls[0].text, /COUNT\(\*\) FILTER \(WHERE status = 'scheduled'\)::int as scheduled/);
    assert.match(calls[1].text, /GROUP BY event_type/);
  });
});

describe('calendar model — RSVP', () => {
  it('upserts rsvp with ON CONFLICT', async () => {
    reset();
    await CalendarModel.setRsvp(ID, 'student-1', 'going');
    assert.match(calls[0].text, /INSERT INTO calendar_event_rsvps \(event_id, user_id, status\)/);
    assert.match(calls[0].text, /ON CONFLICT \(event_id, user_id\) DO UPDATE SET status = \$3/);
    assert.deepEqual(calls[0].params, [ID, 'student-1', 'going']);
  });

  it('lists rsvps with user name/avatar joined and ordered', async () => {
    reset();
    returnPlan.push({ rows: [{ event_id: ID, user_id: 'student-1', status: 'going', name: 'Student', avatar: null }] });
    const rsvps = await CalendarModel.getRsvps(ID);
    assert.equal(rsvps.length, 1);
    assert.equal(rsvps[0].status, 'going');
    assert.match(calls[0].text, /JOIN users u ON u\.id = r\.user_id/);
    assert.match(calls[0].text, /ORDER BY r\.created_at ASC/);
  });
});

describe('calendar model — reminders', () => {
  it('inserts reminder only when it does not already exist', async () => {
    reset();
    returnPlan.push({ rows: [{ exists: true }] });
    const alreadySent = await CalendarModel.toggleReminderSent(ID, 'student-1', 60);
    assert.equal(alreadySent, false);
    assert.equal(calls.length, 1); // no insert performed
  });

  it('inserts reminder record when missing', async () => {
    reset();
    returnPlan.push({ rows: [{ exists: false }] });
    const sent = await CalendarModel.toggleReminderSent(ID, 'student-1', 60);
    assert.equal(sent, true);
    assert.match(calls[1].text, /INSERT INTO calendar_event_reminders/);
    assert.deepEqual(calls[1].params, [ID, 'student-1', 60]);
  });
});