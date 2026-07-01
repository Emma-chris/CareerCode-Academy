import { create } from 'zustand';
import api from '@/lib/axios';

export interface AnalyticsOverview {
  totalVisitors: number;
  uniqueVisitors: number;
  returningVisitors: number;
  returningRate: number;
  totalPageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  activeVisitors: number;
}

export interface VisitorTrend {
  date: string;
  label: string;
  visitors: number;
  page_views: number;
}

export interface PageAnalytics {
  mostVisited: Array<{ page_url: string; views: number; unique_visitors: number; avg_time_sec: number }>;
  landingPages: Array<{ page_url: string; entries: number }>;
  exitPages: Array<{ page_url: string; exits: number }>;
}

export interface DeviceAnalytics {
  devices: Array<{ device_type: string; count: number; percentage: number }>;
  browsers: Array<{ browser: string; count: number; percentage: number }>;
  os: Array<{ os: string; count: number; percentage: number }>;
  total: number;
}

export interface ConversionFunnel {
  funnel: {
    visitors: number;
    signups: number;
    enrollments: number;
    visitorToSignup: number;
    signupToEnrollment: number;
    overallConversion: number;
  };
  sourcePerformance: Array<{
    source: string;
    visitors: number;
    signups: number;
    enrollments: number;
  }>;
}

export interface CourseAnalyticsItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  page_views: number;
  enrollments: number;
  completions: number;
  avg_rating: number;
  review_count: number;
  revenue: number;
  completion_rate: number;
}

export interface RealtimeStats {
  activeVisitors: number;
  currentPages: Array<{ page_url: string; viewers: number }>;
  todayRegistrations: number;
  todayEnrollments: number;
}

interface AnalyticsState {
  overview: AnalyticsOverview | null;
  visitorTrend: VisitorTrend[];
  pageAnalytics: PageAnalytics | null;
  deviceAnalytics: DeviceAnalytics | null;
  sourceAnalytics: any[];
  conversionFunnel: ConversionFunnel | null;
  journeyAnalytics: any | null;
  courseAnalytics: CourseAnalyticsItem[];
  clickAnalytics: any | null;
  realtime: RealtimeStats | null;
  range: string;
  loading: boolean;
  error: string | null;

  setRange: (range: string) => void;
  fetchAll: (range?: string) => Promise<void>;
  fetchOverview: (range?: string) => Promise<void>;
  fetchVisitorTrend: (range?: string) => Promise<void>;
  fetchPageAnalytics: (range?: string) => Promise<void>;
  fetchDeviceAnalytics: (range?: string) => Promise<void>;
  fetchSourceAnalytics: (range?: string) => Promise<void>;
  fetchConversionFunnel: (range?: string) => Promise<void>;
  fetchJourneyAnalytics: (range?: string) => Promise<void>;
  fetchCourseAnalytics: (range?: string) => Promise<void>;
  fetchClickAnalytics: (range?: string) => Promise<void>;
  fetchRealtime: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  overview: null,
  visitorTrend: [],
  pageAnalytics: null,
  deviceAnalytics: null,
  sourceAnalytics: [],
  conversionFunnel: null,
  journeyAnalytics: null,
  courseAnalytics: [],
  clickAnalytics: null,
  realtime: null,
  range: '7d',
  loading: false,
  error: null,

  setRange: (range: string) => {
    set({ range });
    get().fetchAll(range);
  },

  fetchAll: async (range?: string) => {
    const r = range || get().range;
    set({ loading: true, error: null });
    try {
      const [
        overviewRes, trendRes, pagesRes, devicesRes,
        sourcesRes, funnelRes, journeysRes, coursesRes,
        clicksRes, realtimeRes,
      ] = await Promise.all([
        api.get(`/admin/analytics/overview?range=${r}`),
        api.get(`/admin/analytics/visitors?range=${r}`),
        api.get(`/admin/analytics/pages?range=${r}`),
        api.get(`/admin/analytics/devices?range=${r}`),
        api.get(`/admin/analytics/sources?range=${r}`),
        api.get(`/admin/analytics/conversions?range=${r}`),
        api.get(`/admin/analytics/journeys?range=${r}`),
        api.get(`/admin/analytics/courses?range=${r}`),
        api.get(`/admin/analytics/clicks?range=${r}`),
        api.get('/admin/analytics/realtime'),
      ]);
      set({
        overview: overviewRes.data.data,
        visitorTrend: trendRes.data.data || [],
        pageAnalytics: pagesRes.data.data,
        deviceAnalytics: devicesRes.data.data,
        sourceAnalytics: sourcesRes.data.data || [],
        conversionFunnel: funnelRes.data.data,
        journeyAnalytics: journeysRes.data.data,
        courseAnalytics: coursesRes.data.data || [],
        clickAnalytics: clicksRes.data.data,
        realtime: realtimeRes.data.data,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, error: error.response?.data?.message || 'Failed to load analytics' });
    }
  },

  fetchOverview: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/overview?range=${r}`);
      set({ overview: data.data });
    } catch { /* ignore */ }
  },

  fetchVisitorTrend: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/visitors?range=${r}`);
      set({ visitorTrend: data.data || [] });
    } catch { /* ignore */ }
  },

  fetchPageAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/pages?range=${r}`);
      set({ pageAnalytics: data.data });
    } catch { /* ignore */ }
  },

  fetchDeviceAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/devices?range=${r}`);
      set({ deviceAnalytics: data.data });
    } catch { /* ignore */ }
  },

  fetchSourceAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/sources?range=${r}`);
      set({ sourceAnalytics: data.data || [] });
    } catch { /* ignore */ }
  },

  fetchConversionFunnel: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/conversions?range=${r}`);
      set({ conversionFunnel: data.data });
    } catch { /* ignore */ }
  },

  fetchJourneyAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/journeys?range=${r}`);
      set({ journeyAnalytics: data.data });
    } catch { /* ignore */ }
  },

  fetchCourseAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/courses?range=${r}`);
      set({ courseAnalytics: data.data || [] });
    } catch { /* ignore */ }
  },

  fetchClickAnalytics: async (range?: string) => {
    const r = range || get().range;
    try {
      const { data } = await api.get(`/admin/analytics/clicks?range=${r}`);
      set({ clickAnalytics: data.data });
    } catch { /* ignore */ }
  },

  fetchRealtime: async () => {
    try {
      const { data } = await api.get('/admin/analytics/realtime');
      set({ realtime: data.data });
    } catch { /* ignore */ }
  },
}));
