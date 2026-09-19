import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

const mockGet = mocks.get;
const mockPost = mocks.post;
const mockPut = mocks.put;
const mockDelete = mocks.delete;

vi.mock('@/lib/axios', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
}));

import { useCalendarStore, EVENT_TYPE_CONFIG, type CalendarEvent } from '@/store/calendarStore';

const event = (partial: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'React Workshop',
  description: 'Build a todo app',
  event_type: 'workshop',
  start_datetime: '2026-01-10T10:00:00.000Z',
  end_datetime: '2026-01-10T11:00:00.000Z',
  timezone: 'UTC',
  location: null,
  meeting_url: null,
  meeting_platform: null,
  color: null,
  course_id: null,
  module_id: null,
  program_id: null,
  cohort_id: null,
  school_id: null,
  instructor_id: null,
  community_id: null,
  channel_id: null,
  created_by: 'admin-1',
  visibility: 'public',
  visibility_target_id: null,
  status: 'scheduled',
  is_recurring: false,
  recurrence_rule: null,
  max_attendees: null,
  reminder_minutes: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...partial,
});

beforeEach(() => {
  vi.clearAllMocks();
  useCalendarStore.setState({
    events: [],
    upcomingEvents: [],
    selectedEvent: null,
    stats: null,
    isLoading: false,
    error: null,
    view: 'month',
    currentDate: new Date('2026-01-01T00:00:00.000Z'),
    filters: { event_type: '', status: '', course_id: '', instructor_id: '', search: '' },
  });
});

describe('calendarStore — initial state', () => {
  it('starts with empty collections and defaults', () => {
    const s = useCalendarStore.getState();
    expect(s.events).toEqual([]);
    expect(s.upcomingEvents).toEqual([]);
    expect(s.selectedEvent).toBeNull();
    expect(s.stats).toBeNull();
    expect(s.view).toBe('month');
    expect(s.filters).toEqual({ event_type: '', status: '', course_id: '', instructor_id: '', search: '' });
  });
});

describe('calendarStore — view/filter/selection setters', () => {
  it('setView updates the view', () => {
    useCalendarStore.getState().setView('agenda');
    expect(useCalendarStore.getState().view).toBe('agenda');
  });

  it('setCurrentDate updates the date', () => {
    const d = new Date('2026-05-05T00:00:00.000Z');
    useCalendarStore.getState().setCurrentDate(d);
    expect(useCalendarStore.getState().currentDate).toBe(d);
  });

  it('setFilters merges partial filters', () => {
    useCalendarStore.getState().setFilters({ status: 'live' });
    const f = useCalendarStore.getState().filters;
    expect(f.status).toBe('live');
    expect(f.event_type).toBe('');
  });

  it('setSelectedEvent sets and clears the selection', () => {
    useCalendarStore.getState().setSelectedEvent(event());
    expect(useCalendarStore.getState().selectedEvent?.id).toBe('evt-1');
    useCalendarStore.getState().setSelectedEvent(null);
    expect(useCalendarStore.getState().selectedEvent).toBeNull();
  });
});

describe('calendarStore — fetchEvents', () => {
  it('calls GET /calendar and stores rows plus resets loading/error', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [event()] } });
    await useCalendarStore.getState().fetchEvents();
    expect(mockGet).toHaveBeenCalledWith('/calendar');
    const s = useCalendarStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0].title).toBe('React Workshop');
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('sends start/end range params and the active filters', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } });
    useCalendarStore.getState().setFilters({ event_type: 'exam', status: 'live', course_id: 'c9', instructor_id: 'i1', search: 'js' });
    await useCalendarStore.getState().fetchEvents('2026-01-01', '2026-01-31');
    expect(mockGet).toHaveBeenCalledWith(
      '/calendar?start=2026-01-01&end=2026-01-31&event_type=exam&status=live&course_id=c9&instructor_id=i1&search=js'
    );
  });

  it('omits empty filters from the query string', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } });
    await useCalendarStore.getState().fetchEvents();
    expect(mockGet).toHaveBeenCalledWith('/calendar');
  });

  it('records an error message and stops loading on failure', async () => {
    mockGet.mockRejectedValueOnce({ response: { data: { message: 'DB down' } } });
    await useCalendarStore.getState().fetchEvents();
    const s = useCalendarStore.getState();
    expect(s.error).toBe('DB down');
    expect(s.isLoading).toBe(false);
    expect(s.events).toEqual([]);
  });
});

describe('calendarStore — fetchUpcoming', () => {
  it('stores upcoming events from GET /calendar/upcoming?limit=10', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [event({ id: 'up-1' })] } });
    await useCalendarStore.getState().fetchUpcoming();
    expect(mockGet).toHaveBeenCalledWith('/calendar/upcoming?limit=10');
    expect(useCalendarStore.getState().upcomingEvents[0].id).toBe('up-1');
  });

  it('falls back to empty array on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('nope'));
    await useCalendarStore.getState().fetchUpcoming();
    expect(useCalendarStore.getState().upcomingEvents).toEqual([]);
  });
});

describe('calendarStore — fetchEvent', () => {
  it('calls GET /calendar/:id and stores the selected event', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: event({ id: 'evt-9' }) } });
    await useCalendarStore.getState().fetchEvent('evt-9');
    expect(mockGet).toHaveBeenCalledWith('/calendar/evt-9');
    expect(useCalendarStore.getState().selectedEvent?.id).toBe('evt-9');
  });

  it('clears the selection on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('x'));
    await useCalendarStore.getState().fetchEvent('evt-9');
    expect(useCalendarStore.getState().selectedEvent).toBeNull();
  });
});

describe('calendarStore — fetchStats', () => {
  it('stores stats from GET /calendar/stats', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: { total: 12, scheduled: 5, live: 2, completed: 3, cancelled: 1, draft: 1, by_type: { class: 4 } } },
    });
    await useCalendarStore.getState().fetchStats();
    expect(mockGet).toHaveBeenCalledWith('/calendar/stats');
    expect(useCalendarStore.getState().stats?.total).toBe(12);
  });

  it('nulls stats on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('x'));
    await useCalendarStore.getState().fetchStats();
    expect(useCalendarStore.getState().stats).toBeNull();
  });
});

describe('calendarStore — createEvent', () => {
  it('POSTs the input and appends the created event', async () => {
    mockPost.mockResolvedValueOnce({ data: { data: event({ id: 'evt-new' }) } });
    const created = await useCalendarStore.getState().createEvent({
      title: 'React Workshop',
      event_type: 'workshop',
      start_datetime: '2026-01-10T10:00:00.000Z',
      end_datetime: '2026-01-10T11:00:00.000Z',
    });
    expect(mockPost).toHaveBeenCalledWith('/calendar', {
      title: 'React Workshop',
      event_type: 'workshop',
      start_datetime: '2026-01-10T10:00:00.000Z',
      end_datetime: '2026-01-10T11:00:00.000Z',
    });
    expect(created.id).toBe('evt-new');
    expect(useCalendarStore.getState().events).toHaveLength(1);
  });
});

describe('calendarStore — updateEvent', () => {
  it('PUTs changes and replaces the event in the list and selection', async () => {
    useCalendarStore.setState({ events: [event()], selectedEvent: event() });
    mockPut.mockResolvedValueOnce({ data: { data: event({ title: 'Renamed' }) } });
    const updated = await useCalendarStore.getState().updateEvent('evt-1', { title: 'Renamed' });
    expect(mockPut).toHaveBeenCalledWith('/calendar/evt-1', { title: 'Renamed' });
    expect(updated.title).toBe('Renamed');
    const s = useCalendarStore.getState();
    expect(s.events[0].title).toBe('Renamed');
    expect(s.selectedEvent?.title).toBe('Renamed');
  });

  it('updates an unrelated selection untouched', async () => {
    useCalendarStore.setState({ events: [event({ id: 'other' })], selectedEvent: event({ id: 'other' }) });
    mockPut.mockResolvedValueOnce({ data: { data: event({ id: 'other' }) } });
    await useCalendarStore.getState().updateEvent('evt-1', { title: 'Renamed' });
    expect(useCalendarStore.getState().events[0].id).toBe('other');
  });
});

describe('calendarStore — deleteEvent', () => {
  it('DELETEs and removes the event from the list', async () => {
    useCalendarStore.setState({ events: [event(), event({ id: 'evt-2' })] });
    mockDelete.mockResolvedValueOnce({ data: { success: true } });
    await useCalendarStore.getState().deleteEvent('evt-1');
    expect(mockDelete).toHaveBeenCalledWith('/calendar/evt-1');
    const s = useCalendarStore.getState();
    expect(s.events).toHaveLength(1);
    expect(s.events[0].id).toBe('evt-2');
  });

  it('clears the selection when it matches the deleted event', async () => {
    useCalendarStore.setState({ events: [event()], selectedEvent: event() });
    mockDelete.mockResolvedValueOnce({ data: { success: true } });
    await useCalendarStore.getState().deleteEvent('evt-1');
    expect(useCalendarStore.getState().selectedEvent).toBeNull();
  });
});

describe('calendarStore — rsvp', () => {
  it('POSTs the rsvp and updates status in list and selection', async () => {
    useCalendarStore.setState({ events: [event()], selectedEvent: event() });
    mockPost.mockResolvedValueOnce({ data: { success: true } });
    await useCalendarStore.getState().rsvp('evt-1', 'going');
    expect(mockPost).toHaveBeenCalledWith('/calendar/evt-1/rsvp', { status: 'going' });
    expect(useCalendarStore.getState().events[0].rsvp_status).toBe('going');
    expect(useCalendarStore.getState().selectedEvent?.rsvp_status).toBe('going');
  });
});

describe('EVENT_TYPE_CONFIG', () => {
  it('defines all 16 event types with label/color/bg/hex', () => {
    const types = [
      'live_session', 'class', 'lecture', 'module_release', 'assignment', 'quiz', 'exam',
      'challenge', 'project_deadline', 'code_review', 'mentorship', 'career_event',
      'community_event', 'announcement', 'workshop', 'meeting',
    ];
    expect(Object.keys(EVENT_TYPE_CONFIG).sort()).toEqual(types.sort());
    for (const [key, cfg] of Object.entries(EVENT_TYPE_CONFIG)) {
      expect(typeof cfg.label).toBe('string');
      expect(typeof cfg.color).toBe('string');
      expect(typeof cfg.bg).toBe('string');
      expect(typeof cfg.hex).toBe('string');
      expect(cfg.label).toMatch(/^[A-Za-z]/);
      expect(cfg.color).toMatch(/^text-/);
      expect(cfg.bg).toMatch(/^bg-/);
      expect(cfg.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('assigns valid hex colors with healthy variety', () => {
    const hexes = Object.values(EVENT_TYPE_CONFIG).map((c) => c.hex);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    // Some types intentionally share a color (quiz & module_release), so distinct >= 10 of 16
    expect(new Set(hexes).size).toBeGreaterThanOrEqual(10);
  });
});