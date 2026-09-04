import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency?: string, locale?: string): string {
  // Dynamic if currency provided, else try to use platform currency from localStorage fallback
  let cur = currency || 'NGN';
  let loc = locale;
  try {
    const stored = localStorage.getItem('platform_currency');
    if (!currency && stored) cur = stored;
    const storedLocale = localStorage.getItem('platform_currency_locale');
    if (!locale && storedLocale) loc = storedLocale;
  } catch {}
  // Map to known locales if needed
  const currencyLocales: Record<string, string> = { NGN: 'en-NG', USD: 'en-US', GHS: 'en-GH', KES: 'en-KE', ZAR: 'en-ZA', GBP: 'en-GB', EUR: 'de-DE', UGX: 'en-UG', TZS: 'en-TZ', RWF: 'rw-RW', XAF: 'fr-CM', XOF: 'fr-SN', CAD: 'en-CA', AUD: 'en-AU' };
  if (!loc) loc = currencyLocales[cur] || 'en-NG';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: cur,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()}`;
  }
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
