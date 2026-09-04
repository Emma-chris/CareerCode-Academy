export const SUPPORTED_CURRENCIES = {
  NGN: { symbol: '₦', locale: 'en-NG', name: 'Nigerian Naira' },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
  GHS: { symbol: 'GH₵', locale: 'en-GH', name: 'Ghanaian Cedi' },
  KES: { symbol: 'KSh', locale: 'en-KE', name: 'Kenyan Shilling' },
  ZAR: { symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
  UGX: { symbol: 'USh', locale: 'en-UG', name: 'Ugandan Shilling' },
  TZS: { symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling' },
  RWF: { symbol: 'RF', locale: 'rw-RW', name: 'Rwandan Franc' },
  XAF: { symbol: 'FCFA', locale: 'fr-CM', name: 'Central African CFA' },
  XOF: { symbol: 'CFA', locale: 'fr-SN', name: 'West African CFA' },
  CAD: { symbol: 'CA$', locale: 'en-CA', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export function formatCurrency(amount: number, currency: string = 'NGN', locale?: string): string {
  const info = (SUPPORTED_CURRENCIES as any)[currency] || SUPPORTED_CURRENCIES.NGN;
  try {
    return new Intl.NumberFormat(locale || info.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${info.symbol}${amount.toLocaleString()}`;
  }
}
