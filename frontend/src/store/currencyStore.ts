import { create } from 'zustand';
import api from '@/lib/axios';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

interface CurrencyState {
  code: string;
  locale: string;
  symbol: string;
  supported: string[];
  isLoading: boolean;
  fetchCurrency: () => Promise<void>;
  format: (amount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  code: 'NGN',
  locale: 'en-NG',
  symbol: '₦',
  supported: Object.keys(SUPPORTED_CURRENCIES),
  isLoading: false,
  fetchCurrency: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/public/currency');
      if (data.success && data.data) {
        set({
          code: data.data.code || 'NGN',
          locale: data.data.locale || (SUPPORTED_CURRENCIES as any)[data.data.code]?.locale || 'en-NG',
          symbol: data.data.symbol || (SUPPORTED_CURRENCIES as any)[data.data.code]?.symbol || '₦',
          supported: data.data.supported || Object.keys(SUPPORTED_CURRENCIES),
        });
      }
    } catch {
      // keep defaults, try admin settings fallback if admin
      try {
        const { data } = await api.get('/admin/settings');
        const rows: any[] = data.data || [];
        const map: Record<string, string> = {};
        rows.forEach((r: any) => { map[r.key] = r.value; });
        if (map['platform_currency']) {
          const code = map['platform_currency'];
          const info = (SUPPORTED_CURRENCIES as any)[code] || SUPPORTED_CURRENCIES.NGN;
          set({ code, locale: map['platform_currency_locale'] || info.locale, symbol: map['platform_currency_symbol'] || info.symbol });
        }
      } catch {}
    } finally {
      set({ isLoading: false });
    }
  },
  format: (amount: number) => {
    const { code, locale } = get();
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount);
    } catch {
      const sym = get().symbol;
      return `${sym}${amount.toLocaleString()}`;
    }
  },
}));
