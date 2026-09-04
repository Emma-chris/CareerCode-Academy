import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { SUPPORTED_CURRENCIES } from '../utils/currency';

const router = Router();

// GET /public/settings/currency — public, no auth, for frontend price display
router.get('/currency', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(`SELECT key, value FROM system_settings WHERE key IN ('platform_currency','platform_currency_locale','platform_currency_symbol','xp_to_ngn_rate','xp_redeem_enabled')`);
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    const code = map['platform_currency'] || 'NGN';
    const info = (SUPPORTED_CURRENCIES as any)[code] || SUPPORTED_CURRENCIES.NGN;
    res.json({
      success: true,
      data: {
        code,
        locale: map['platform_currency_locale'] || info.locale,
        symbol: map['platform_currency_symbol'] || info.symbol,
        xp_rate: map['xp_to_ngn_rate'] || '0.1',
        xp_enabled: map['xp_redeem_enabled'] || 'true',
        supported: Object.keys(SUPPORTED_CURRENCIES),
      }
    });
  } catch (e: any) {
    res.json({ success: true, data: { code: 'NGN', locale: 'en-NG', symbol: '₦', xp_rate: '0.1', xp_enabled: 'true', supported: Object.keys(SUPPORTED_CURRENCIES) } });
  }
});

// GET /public/settings — generic public settings (currency + xp)
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(`SELECT key, value FROM system_settings WHERE key IN ('platform_currency','platform_currency_locale','platform_currency_symbol','xp_to_ngn_rate','xp_redeem_enabled','xp_min_redeem','xp_redeem_step','xp_max_discount_percent','xp_code_expiry_days')`);
    const data: Record<string, string> = {};
    rows.forEach((r: any) => data[r.key] = r.value);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch public settings' });
  }
});

export default router;
