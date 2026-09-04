export const SUPPORTED_CURRENCIES = {
  NGN: { symbol: '₦', locale: 'en-NG', name: 'Nigerian Naira', gateways: ['paystack', 'flutterwave'] as const },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar', gateways: ['paystack', 'flutterwave'] as const },
  GHS: { symbol: 'GH₵', locale: 'en-GH', name: 'Ghanaian Cedi', gateways: ['paystack', 'flutterwave'] as const },
  KES: { symbol: 'KSh', locale: 'en-KE', name: 'Kenyan Shilling', gateways: ['paystack', 'flutterwave'] as const },
  ZAR: { symbol: 'R', locale: 'en-ZA', name: 'South African Rand', gateways: ['paystack', 'flutterwave'] as const },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound', gateways: ['flutterwave'] as const },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro', gateways: ['flutterwave'] as const },
  UGX: { symbol: 'USh', locale: 'en-UG', name: 'Ugandan Shilling', gateways: ['flutterwave'] as const },
  TZS: { symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling', gateways: ['flutterwave'] as const },
  RWF: { symbol: 'RF', locale: 'rw-RW', name: 'Rwandan Franc', gateways: ['flutterwave'] as const },
  XAF: { symbol: 'FCFA', locale: 'fr-CM', name: 'Central African CFA', gateways: ['flutterwave'] as const },
  XOF: { symbol: 'CFA', locale: 'fr-SN', name: 'West African CFA', gateways: ['flutterwave'] as const },
  CAD: { symbol: 'CA$', locale: 'en-CA', name: 'Canadian Dollar', gateways: ['flutterwave'] as const },
  AUD: { symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar', gateways: ['flutterwave'] as const },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}

export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES[code as CurrencyCode] || SUPPORTED_CURRENCIES.NGN;
}

export function formatCurrency(amount: number, currency: string = 'NGN', locale?: string): string {
  const info = getCurrencyInfo(currency);
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

export function getPlatformCurrencyFallback(): CurrencyCode {
  return 'NGN';
}
