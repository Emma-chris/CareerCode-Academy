import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatGoogleCalendarUrl, generateIcsContent, downloadIcs, EventActions } from '@/components/calendar/EventActions';

const sampleEvent = {
  title: 'Intro to React',
  description: 'Learn hooks',
  date: '2026-01-10T10:00:00.000Z',
  time: '10:00 AM',
  meeting_url: 'https://meet.example.com/abc',
};

describe('formatGoogleCalendarUrl', () => {
  it('builds a Google Calendar render URL with encoded params', () => {
    const url = formatGoogleCalendarUrl(sampleEvent);
    expect(url).toMatch(/^https:\/\/www\.google\.com\/calendar\/render\?/);
    const params = new URL(url).searchParams;
    expect(params.get('action')).toBe('TEMPLATE');
    expect(params.get('text')).toBe('Intro to React');
    expect(params.get('details')).toBe('Learn hooks');
    const dates = params.get('dates') || '';
    // YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ
    expect(dates).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
  });

  it('defaults end time to 1 hour after start', () => {
    const url = formatGoogleCalendarUrl({ ...sampleEvent, date: '2026-01-10T09:00:00.000Z' });
    const dates = new URL(url).searchParams.get('dates') || '';
    const [start, end] = dates.split('/');
    const startMs = parseIcsDateTime(start);
    const endMs = parseIcsDateTime(end);
    expect(endMs - startMs).toBe(60 * 60 * 1000);
  });

  it('falls back to now when no date provided', () => {
    const url = formatGoogleCalendarUrl({ title: 'Now-ish' });
    expect(new URL(url).searchParams.get('dates')).toBeTruthy();
  });
});

describe('generateIcsContent', () => {
  it('produces a valid VCALENDAR with a single VEVENT', () => {
    const ics = generateIcsContent(sampleEvent);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain(`SUMMARY:Intro to React`);
    expect(ics).toContain('DESCRIPTION:Learn hooks');
    expect(ics.match(/DTSTART:/g)).toHaveLength(1);
    expect(ics.match(/DTEND:/g)).toHaveLength(1);
  });

  it('uses CRLF line endings per RFC 5545', () => {
    const ics = generateIcsContent(sampleEvent);
    expect(ics).toContain('\r\n');
    expect(ics.split('\r\n').length).toBeGreaterThan(3);
  });
});

describe('downloadIcs', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a downloadable .ics file anchor', () => {
    const originalCreateElement = document.createElement.bind(document);
    const anchor = { click: vi.fn(), href: '', download: '' };
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchor as unknown as HTMLAnchorElement;
      return originalCreateElement(tag);
    });

    downloadIcs(sampleEvent);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('Intro_to_React.ics');
    expect(anchor.click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

describe('EventActions component', () => {
  it('renders Google, Outlook and .ICS export buttons', () => {
    render(<EventActions event={sampleEvent} />);
    expect(screen.getByText('Google')).toHaveAttribute('href', expect.stringContaining('google.com/calendar'));
    expect(screen.getByText('Outlook')).toHaveAttribute('href', expect.stringContaining('outlook.live.com'));
    expect(screen.getByText('.ICS')).toBeInTheDocument();
  });
});

function parseIcsDateTime(s: string): number {
  // YYYYMMDDTHHMMSSZ
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const day = Number(s.slice(6, 8));
  const hour = Number(s.slice(9, 11));
  const minute = Number(s.slice(11, 13));
  const second = Number(s.slice(13, 15));
  return Date.UTC(year, month - 1, day, hour, minute, second);
}