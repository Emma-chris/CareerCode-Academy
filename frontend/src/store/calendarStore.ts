import { create } from 'zustand';
import api from '@/lib/axios';

export type CalendarEventType =
  | 'live_session' | 'class' | 'lecture' | 'module_release'
  | 'assignment' | 'quiz' | 'exam' | 'challenge' | 'project_deadline'
  | 'code_review' | 'mentorship' | 'career_event' | 'community_event'
  | 'announcement' | 'workshop' | 'meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_datetime: string;
  end_datetime: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  meeting_platform: string | null;
  color: string | null;
  course_id: string | null;
  module_id: string | null;
  program_id: string | null;
  cohort_id: string | null;
  school_id: string | null;
  instructor_id: string | null;
  community_id: string | null;
  channel_id: string | null;
  created_by: string;
  visibility: string;
  visibility_target_id: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  max_attendees: number | null;
  reminder_minutes: number[];
  created_at: string;
  updated_at: string;
  course_title?: string;
  instructor_name?: string;
  instructor_avatar?: string;
  school_name?: string;
  rsvp_count?: number;
  rsvp_status?: string;
  is_rsvpd?: boolean;
}

export interface CalendarStats {
  total: number;
  scheduled: number;
  live: number;
  completed: number;
  cancelled: number;
  draft: number;
  by_type: Record<string, number>;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  timezone?: string;
  location?: string;
  meeting_url?: string;
  meeting_platform?: string;
  color?: string;
  course_id?: string;
  module_id?: string;
  program_id?: string;
  cohort_id?: string;
  school_id?: string;
  instructor_id?: string;
  community_id?: string;
  channel_id?: string;
  visibility?: string;
  visibility_target_id?: string;
  status?: string;
  max_attendees?: number;
  reminder_minutes?: number[];
}

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; bg: string; hex: string }> = {
  live_session:      { label: 'Live Session',   color: 'text-blue-400',   bg: 'bg-blue-500/15',   hex: '#3b82f6' },
  class:             { label: 'Class',          color: 'text-indigo-400', bg: 'bg-indigo-500/15', hex: '#6366f1' },
  lecture:           { label: 'Lecture',        color: 'text-violet-400', bg: 'bg-violet-500/15', hex: '#8b5cf6' },
  module_release:    { label: 'Module Release', color: 'text-purple-400', bg: 'bg-purple-500/15', hex: '#a855f7' },
  assignment:        { label: 'Assignment',     color: 'text-orange-400', bg: 'bg-orange-500/15', hex: '#f97316' },
  quiz:              { label: 'Quiz',           color: 'text-violet-400', bg: 'bg-violet-500/15', hex: '#a855f7' },
  exam:              { label: 'Exam',           color: 'text-red-400',    bg: 'bg-red-500/15',    hex: '#ef4444' },
  challenge:         { label: 'Challenge',      color: 'text-yellow-400', bg: 'bg-yellow-500/15', hex: '#eab308' },
  project_deadline:  { label: 'Project Deadline', color: 'text-rose-400',  bg: 'bg-rose-500/15',   hex: '#f43f5e' },
  code_review:       { label: 'Code Review',    color: 'text-teal-400',   bg: 'bg-teal-500/15',   hex: '#14b8a6' },
  mentorship:        { label: 'Mentorship',     color: 'text-green-400',  bg: 'bg-green-500/15',  hex: '#22c55e' },
  career_event:      { label: 'Career Event',   color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   hex: '#06b6d4' },
  community_event:   { label: 'Community Event', color: 'text-pink-400',   bg: 'bg-pink-500/15',   hex: '#ec4899' },
  announcement:      { label: 'Announcement',   color: 'text-slate-400',  bg: 'bg-slate-500/15',  hex: '#64748b' },
  workshop:          { label: 'Workshop',       color: 'text-sky-400',    bg: 'bg-sky-500/15',    hex: '#0ea5e9' },
  meeting:           { label: 'Meeting',        color: 'text-indigo-400', bg: 'bg-indigo-500/15', hex: '#6366f1' },
};

interface CalendarState {
  events: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  stats: CalendarStats | null;
  isLoading: boolean;
  error: string | null;
  view: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  filters: {
    event_type: string;
    status: string;
    course_id: string;
    instructor_id: string;
    search: string;
  };

  setView: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  setCurrentDate: (date: Date) => void;
  setFilters: (filters: Partial<CalendarState['filters']>) => void;
  setSelectedEvent: (event: CalendarEvent | null) => void;

  fetchEvents: (start?: string, end?: string) => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  fetchEvent: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, input: Partial<CreateEventInput>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  rsvp: (id: string, status: 'going' | 'maybe' | 'not_going') => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  upcomingEvents: [],
  selectedEvent: null,
  stats: null,
  isLoading: false,
  error: null,
  view: 'month',
  currentDate: new Date(),
  filters: { event_type: '', status: '', course_id: '', instructor_id: '', search: '' },

  setView: (view) => set({ view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setSelectedEvent: (event) => set({ selectedEvent: event }),

  fetchEvents: async (start, end) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const { filters } = get();
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.status) params.set('status', filters.status);
      if (filters.course_id) params.set('course_id', filters.course_id);
      if (filters.instructor_id) params.set('instructor_id', filters.instructor_id);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();
      const { data } = await api.get(`/calendar${qs ? `?${qs}` : ''}`);
      set({ events: data.data || [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch events' });
    }
  },

  fetchUpcoming: async () => {
    try {
      const { data } = await api.get('/calendar/upcoming?limit=10');
      set({ upcomingEvents: data.data || [] });
    } catch {
      set({ upcomingEvents: [] });
    }
  },

  fetchEvent: async (id) => {
    try {
      const { data } = await api.get(`/calendar/${id}`);
      set({ selectedEvent: data.data || null });
    } catch {
      set({ selectedEvent: null });
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await api.get('/calendar/stats');
      set({ stats: data.data || null });
    } catch {
      set({ stats: null });
    }
  },

  createEvent: async (input) => {
    const { data } = await api.post('/calendar', input);
    const event = data.data;
    set((s) => ({ events: [...s.events, event] }));
    return event;
  },

  updateEvent: async (id, input) => {
    const { data } = await api.put(`/calendar/${id}`, input);
    const updated = data.data;
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? updated : e)),
      selectedEvent: s.selectedEvent?.id === id ? updated : s.selectedEvent,
    }));
    return updated;
  },

  deleteEvent: async (id) => {
    await api.delete(`/calendar/${id}`);
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      selectedEvent: s.selectedEvent?.id === id ? null : s.selectedEvent,
    }));
  },

  rsvp: async (id, status) => {
    await api.post(`/calendar/${id}/rsvp`, { status });
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, rsvp_status: status } : e)),
      selectedEvent: s.selectedEvent?.id === id ? { ...s.selectedEvent, rsvp_status: status } : s.selectedEvent,
    }));
  },
}));
