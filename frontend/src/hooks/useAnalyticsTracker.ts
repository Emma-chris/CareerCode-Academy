import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/axios';

interface PageViewEvent {
  page_url: string;
  route_name?: string;
  time_spent_sec?: number;
  is_exit_page?: boolean;
}

interface ClickEvent {
  page_url: string;
  element_selector?: string;
  element_text: string;
  element_type?: string;
}

interface ScrollEvent {
  page_url: string;
  depth: number;
  max_depth: number;
}

interface JourneyEvent {
  page_url: string;
  conversion_type?: string;
  converted?: boolean;
  enrolled_course_id?: string;
}

const TRACKING_ENABLED = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
const ANALYTICS_API = '';
const BATCH_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

type BatchItem = { endpoint: string; data: any };
type DepthCallback = (depth: number) => void;

function getPageUrl(): string {
  return window.location.pathname + window.location.search;
}

function getRouteName(): string {
  return window.location.pathname.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/g, '/:id');
}

function getElementType(el: HTMLElement): string | undefined {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input') return 'input';
  if (tag === 'img') return 'image';
  const role = el.getAttribute('role');
  if (role === 'button') return 'button';
  if (role === 'link') return 'link';
  if (el.closest('[data-cta]')) return 'cta';
  if (el.closest('[data-enroll]')) return 'enroll';
  return tag;
}

function getElementSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
  }
  return el.tagName.toLowerCase();
}

function getElementText(el: HTMLElement): string {
  const text = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  return text.substring(0, 100);
}

export function useAnalyticsTracker() {
  const location = useLocation();
  const pageStartRef = useRef(Date.now());
  const prevUrlRef = useRef('');
  const batchRef = useRef<BatchItem[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const scrollDepthsRef = useRef<Set<string>>(new Set());
  const enabledRef = useRef(TRACKING_ENABLED);

  const trackPageViewInternal = useCallback((pageUrl: string, isExit: boolean) => {
    if (!enabledRef.current) return;
    const elapsed = Math.round((Date.now() - pageStartRef.current) / 1000);
    batchRef.current.push({
      endpoint: 'page-view',
      data: {
        page_url: pageUrl,
        route_name: getRouteName(),
        time_spent_sec: Math.min(elapsed, 3600),
        is_exit_page: isExit,
        prev_page: prevUrlRef.current,
      },
    });
  }, []);

  const sendBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;
    const batch = batchRef.current.splice(0);
    api.post(`${ANALYTICS_API}/analytics/track/batch`, { events: batch }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;

    const batchTimer = setInterval(sendBatch, BATCH_INTERVAL_MS);
    const heartbeatTimer = setInterval(() => {
      api.post(`${ANALYTICS_API}/analytics/track/heartbeat`).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(batchTimer);
      clearInterval(heartbeatTimer);
      // Flush remaining events on unmount
      sendBatch();
    };
  }, [sendBatch]);

  useEffect(() => {
    if (!enabledRef.current) return;
    const currentUrl = getPageUrl();

    if (prevUrlRef.current) {
      trackPageViewInternal(prevUrlRef.current, true);
    }
    trackPageViewInternal(currentUrl, false);

    prevUrlRef.current = currentUrl;
    pageStartRef.current = Date.now();
    scrollDepthsRef.current = new Set();
  }, [location.pathname, location.search, trackPageViewInternal]);

  useEffect(() => {
    if (!enabledRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickEl = target.closest('button, a, [role="button"], [data-cta], [data-enroll], [data-track]') as HTMLElement;
      if (!clickEl) return;

      const elementText = getElementText(clickEl);
      const elementType = getElementType(clickEl);
      const elementSelector = getElementSelector(clickEl);

      if (!elementText && !elementType) return;

      batchRef.current.push({
        endpoint: 'click',
        data: {
          page_url: getPageUrl(),
          element_selector: elementSelector,
          element_text: elementText || elementType,
          element_type: elementType,
        },
      });

      if (elementType === 'enroll' || elementText.toLowerCase().includes('enroll')) {
        batchRef.current.push({
          endpoint: 'journey',
          data: {
            page_url: getPageUrl(),
            conversion_type: 'enrollment_click',
          },
        });
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        const docEl = document.documentElement;
        const scrollTop = window.scrollY || docEl.scrollTop || 0;
        const scrollHeight = Math.max(docEl.scrollHeight, docEl.offsetHeight, docEl.clientHeight);
        const clientHeight = docEl.clientHeight || window.innerHeight;
        const totalScrollable = scrollHeight - clientHeight;
        if (totalScrollable <= 0) return;

        const depth = Math.round((scrollTop / totalScrollable) * 100);
        const depths = [25, 50, 75, 100];
        const currentUrl = getPageUrl();
        const key = `${currentUrl}`;

        for (const d of depths) {
          if (depth >= d && !scrollDepthsRef.current.has(`${key}_${d}`)) {
            scrollDepthsRef.current.add(`${key}_${d}`);
            batchRef.current.push({
              endpoint: 'scroll',
              data: {
                page_url: currentUrl,
                depth: d,
                max_depth: Math.min(depth, 100),
              },
            });
          }
        }
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;

    const handleBeforeUnload = () => {
      const elapsed = Math.round((Date.now() - pageStartRef.current) / 1000);
      const body = JSON.stringify({
        page_url: getPageUrl(),
        route_name: getRouteName(),
        time_spent_sec: Math.min(elapsed, 3600),
        is_exit_page: true,
      });

      try {
        navigator.sendBeacon(
          `${ANALYTICS_API}/analytics/track/page-view`,
          new Blob([body], { type: 'application/json' })
        );
      } catch {
        // Fallback — ignore
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  return null;
}

export function trackConversion(type: string, courseId?: string) {
  if (!TRACKING_ENABLED) return;
  api.post(`${ANALYTICS_API}/analytics/track/journey`, {
    page_url: getPageUrl(),
    conversion_type: type,
    converted: true,
    enrolled_course_id: courseId,
  }).catch(() => {});
}

export function AnalyticsTracker() {
  useAnalyticsTracker();
  return null;
}
