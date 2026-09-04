import { query } from '../config/db';
import crypto from 'crypto';

export interface GamificationState {
  hearts: number;
  maxHearts: number;
  nextHeartIn: number | null;
  streakFreezes: number;
  dailyXpGoal: number;
  dailyXpEarned: number;
  dailyGoalReached: boolean;
  bestStreak: number;
}

export interface XpBalance {
  totalEarned: number;
  totalRedeemed: number;
  available: number;
  rate: number;
  ngnValue: number;
  currency?: string;
  currencySymbol?: string;
  minRedeem: number;
  step: number;
  maxDiscountPercent: number;
  redeemEnabled: boolean;
}

export interface DiscountCode {
  id: string;
  code: string;
  user_id: string;
  xp_redeemed: number;
  discount_amount: number;
  currency: string;
  status: string;
  expires_at: string;
  created_at: string;
}

async function getPlatformCurrency(): Promise<{ code: string; symbol: string; locale: string }> {
  try {
    const { rows } = await query(`SELECT key, value FROM system_settings WHERE key IN ('platform_currency','platform_currency_symbol','platform_currency_locale')`);
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    return { code: map['platform_currency'] || 'NGN', symbol: map['platform_currency_symbol'] || '₦', locale: map['platform_currency_locale'] || 'en-NG' };
  } catch { return { code: 'NGN', symbol: '₦', locale: 'en-NG' }; }
}

async function getXpSettings(): Promise<{ rate: number; redeemEnabled: boolean; minRedeem: number; step: number; maxDiscountPercent: number; expiryDays: number }> {
  const { rows } = await query(`SELECT key, value FROM system_settings WHERE key IN ('xp_to_ngn_rate','xp_redeem_enabled','xp_min_redeem','xp_redeem_step','xp_max_discount_percent','xp_code_expiry_days')`);
  const map: Record<string, string> = {};
  rows.forEach((r: any) => { map[r.key] = r.value; });
  return {
    rate: parseFloat(map['xp_to_ngn_rate'] || '0.1'),
    redeemEnabled: (map['xp_redeem_enabled'] || 'true') === 'true',
    minRedeem: parseInt(map['xp_min_redeem'] || '1000', 10),
    step: parseInt(map['xp_redeem_step'] || '1000', 10),
    maxDiscountPercent: parseInt(map['xp_max_discount_percent'] || '50', 10),
    expiryDays: parseInt(map['xp_code_expiry_days'] || '30', 10),
  };
}

export async function awardXp(userId: string, amount: number, source: string, description?: string): Promise<number> {
  await query(
    `INSERT INTO xp_history (user_id, amount, source, description) VALUES ($1, $2, $3, $4)`,
    [userId, amount, source, description || null]
  );
  await query(
    `INSERT INTO daily_xp_log (user_id, xp_earned, date) VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (user_id, date) DO UPDATE SET xp_earned = daily_xp_log.xp_earned + $2`,
    [userId, amount]
  );
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM xp_history WHERE user_id = $1`,
    [userId]
  );
  return Number(rows[0].total) || 0;
}

export async function loseHeart(userId: string): Promise<number> {
  const { rows } = await query(
    `UPDATE users SET hearts = GREATEST(0, hearts - 1), updated_at = NOW()
     WHERE id = $1 RETURNING hearts`,
    [userId]
  );
  return Number(rows[0]?.hearts) || 0;
}

export async function getHearts(userId: string): Promise<{ hearts: number; maxHearts: number; nextHeartIn: number | null }> {
  const { rows } = await query(
    `SELECT hearts, max_hearts, last_heart_regeneration FROM users WHERE id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return { hearts: 0, maxHearts: 5, nextHeartIn: null };

  const hearts = Number(user.hearts);
  const maxHearts = Number(user.max_hearts);

  if (hearts >= maxHearts) return { hearts, maxHearts, nextHeartIn: null };

  const lastRegen = new Date(user.last_heart_regeneration).getTime();
  const elapsed = Date.now() - lastRegen;
  const REGEN_INTERVAL = 30 * 60 * 1000;
  const remaining = REGEN_INTERVAL - elapsed;

  if (remaining <= 0) return { hearts, maxHearts, nextHeartIn: 0 };
  return { hearts, maxHearts, nextHeartIn: Math.ceil(remaining / 60000) };
}

export async function regenerateHearts(): Promise<number> {
  const { rowCount } = await query(
    `UPDATE users SET hearts = LEAST(max_hearts, hearts + 1), last_heart_regeneration = NOW()
     WHERE hearts < max_hearts
     AND last_heart_regeneration <= NOW() - INTERVAL '30 minutes'`
  );
  return rowCount || 0;
}

export async function getDailyProgress(userId: string): Promise<{ xpEarned: number; goal: number; goalReached: boolean }> {
  const { rows } = await query(
    `SELECT d.xp_earned, d.goal_reached, u.daily_xp_goal
     FROM daily_xp_log d
     RIGHT JOIN users u ON u.id = d.user_id AND d.date = CURRENT_DATE
     WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  return {
    xpEarned: Number(row?.xp_earned) || 0,
    goal: Number(row?.daily_xp_goal) || 50,
    goalReached: row?.goal_reached || false,
  };
}

export async function setDailyGoal(userId: string, goal: number): Promise<void> {
  const clamped = Math.max(10, Math.min(200, goal));
  await query(`UPDATE users SET daily_xp_goal = $1, updated_at = NOW() WHERE id = $2`, [clamped, userId]);
}

export async function updateStreak(userId: string): Promise<{ current: number; best: number }> {
  const { rows: userRows } = await query(
    `SELECT best_streak FROM users WHERE id = $1`,
    [userId]
  );
  const prevBest = Number(userRows[0]?.best_streak) || 0;

  const { rows: days } = await query(`
    SELECT DISTINCT DATE(completed_at) as day
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
    ORDER BY day DESC
  `, [userId]);

  if (days.length === 0) {
    await query(`UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1`, [userId]);
    return { current: 0, best: prevBest };
  }

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(days[0].day);
  firstDay.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - firstDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    await query(`UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1`, [userId]);
    return { current: 0, best: prevBest };
  }

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1].day);
    const curr = new Date(days[i].day);
    const d = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (d === 1) streak++;
    else break;
  }

  const newBest = Math.max(prevBest, streak);
  await query(
    `UPDATE users SET last_active_date = CURRENT_DATE, best_streak = $1, updated_at = NOW() WHERE id = $2`,
    [newBest, userId]
  );
  return { current: streak, best: newBest };
}

export async function useStreakFreeze(userId: string): Promise<boolean> {
  const { rows } = await query(
    `UPDATE users SET streak_freezes = streak_freezes - 1, updated_at = NOW()
     WHERE id = $1 AND streak_freezes > 0
     RETURNING streak_freezes`,
    [userId]
  );
  return rows.length > 0;
}

export async function getXpBreakdown(userId: string): Promise<{ source: string; amount: number; count: number }[]> {
  const { rows } = await query(`
    SELECT source, SUM(amount) as amount, COUNT(*) as count
    FROM xp_history WHERE user_id = $1
    GROUP BY source ORDER BY amount DESC
  `, [userId]);
  return rows.map((r: any) => ({ source: r.source, amount: Number(r.amount), count: Number(r.count) }));
}

export async function getSkillTree(userId: string, courseId: string): Promise<any[]> {
  const { rows: modules } = await query(`
    SELECT m.id, m.title, m.order_index
    FROM modules m WHERE m.course_id = $1
    ORDER BY m.order_index
  `, [courseId]);

  for (const mod of modules) {
    const { rows: lessons } = await query(`
      SELECT l.id, l.title, l.order_index, l.is_free, l.duration,
        lp.completed, lp.completed_at, lp.watch_percentage
      FROM lessons l
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
      WHERE l.module_id = $2
      ORDER BY l.order_index
    `, [userId, mod.id]);

    mod.lessons = lessons.map((l: any) => {
      let xpLevel = 'none';
      if (l.completed) {
        xpLevel = 'bronze';
      }
      return { ...l, xpLevel };
    });

    const completed = lessons.filter((l: any) => l.completed).length;
    mod.completed = completed;
    mod.total = lessons.length;
    mod.percentage = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
  }

  return modules;
}

export async function getXpBalance(userId: string): Promise<XpBalance> {
  const settings = await getXpSettings();
  const currency = await getPlatformCurrency();
  const { rows: earnedRows } = await query(`SELECT COALESCE(SUM(amount),0)::int as total FROM xp_history WHERE user_id = $1`, [userId]);
  const { rows: redeemedRows } = await query(`SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END),0)::int as redeemed FROM xp_history WHERE user_id = $1`, [userId]);
  const totalEarned = Number(earnedRows[0]?.total) || 0;
  // net available = sum all (negative redeem reduces)
  const { rows: netRows } = await query(`SELECT COALESCE(SUM(amount),0)::int as net FROM xp_history WHERE user_id = $1`, [userId]);
  const net = Number(netRows[0]?.net) || 0;
  const totalRedeemed = Number(redeemedRows[0]?.redeemed) || 0;
  const available = Math.max(0, net);
  const totalPositive = totalEarned > 0 ? totalEarned : available + totalRedeemed;
  return {
    totalEarned: totalPositive,
    totalRedeemed,
    available,
    rate: settings.rate,
    ngnValue: Math.floor(available * settings.rate),
    minRedeem: settings.minRedeem,
    step: settings.step,
    maxDiscountPercent: settings.maxDiscountPercent,
    redeemEnabled: settings.redeemEnabled,
    // also expose platform currency for frontend
    currency: currency.code,
    currencySymbol: currency.symbol,
  } as any;
}

export async function redeemXpForDiscount(userId: string, xpAmount: number): Promise<DiscountCode> {
  const settings = await getXpSettings();
  if (!settings.redeemEnabled) throw new Error('XP redemption is disabled');
  if (!Number.isInteger(xpAmount) || xpAmount < settings.minRedeem) throw new Error(`Minimum redeem is ${settings.minRedeem} XP`);
  if (xpAmount % settings.step !== 0) throw new Error(`XP amount must be in steps of ${settings.step}`);
  const balance = await getXpBalance(userId);
  if (balance.available < xpAmount) throw new Error(`Insufficient XP. Available: ${balance.available}`);

  const discountAmount = Math.floor(xpAmount * settings.rate);
  if (discountAmount <= 0) throw new Error('Discount amount must be greater than 0');

  // Transactional insert
  const currencyInfo = await getPlatformCurrency();
  const code = 'XP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + settings.expiryDays * 24 * 60 * 60 * 1000).toISOString();

  // Insert discount code
  const { rows: codeRows } = await query(
    `INSERT INTO discount_codes (code, user_id, xp_redeemed, discount_amount, currency, status, expires_at)
     VALUES ($1,$2,$3,$4,$5,'active',$6) RETURNING *`,
    [code, userId, xpAmount, discountAmount, currencyInfo.code, expiresAt]
  );
  // Deduct XP via negative history
  await query(
    `INSERT INTO xp_history (user_id, amount, source, description) VALUES ($1,$2,'redeem',$3)`,
    [userId, -xpAmount, `Redeemed ${xpAmount} XP for ${code} (${currencyInfo.symbol}${discountAmount})`]
  );
  // Do not touch daily_xp_log for redeem (only earn)

  return codeRows[0];
}

export async function validateDiscountCode(code: string, userId: string, coursePrice?: number): Promise<{ valid: boolean; discount: number; reason?: string; row?: any }> {
  const normalized = code.trim().toUpperCase();
  const { rows } = await query(`SELECT * FROM discount_codes WHERE code = $1`, [normalized]);
  if (rows.length === 0) return { valid: false, discount: 0, reason: 'Invalid code' };
  const row = rows[0];
  if (row.user_id !== userId) return { valid: false, discount: 0, reason: 'Code does not belong to you' };
  if (row.status !== 'active') return { valid: false, discount: 0, reason: row.status === 'used' ? 'Code already used' : `Code ${row.status}` };
  if (new Date(row.expires_at) < new Date()) {
    await query(`UPDATE discount_codes SET status='expired' WHERE id=$1`, [row.id]);
    return { valid: false, discount: 0, reason: 'Code expired' };
  }
  if (coursePrice !== undefined) {
    const settings = await getXpSettings();
    const currencyInfo = await getPlatformCurrency();
    const maxDiscount = Math.floor(coursePrice * (settings.maxDiscountPercent / 100));
    if (row.discount_amount > maxDiscount) {
      return { valid: false, discount: 0, reason: `Discount exceeds ${settings.maxDiscountPercent}% cap (${currencyInfo.symbol}${maxDiscount} max)` };
    }
  }
  return { valid: true, discount: Number(row.discount_amount), row };
}

export async function getUserDiscountCodes(userId: string): Promise<DiscountCode[]> {
  const { rows } = await query(`SELECT * FROM discount_codes WHERE user_id=$1 ORDER BY created_at DESC`, [userId]);
  return rows;
}

export async function markDiscountCodeUsed(codeId: string, paymentId?: string): Promise<void> {
  await query(`UPDATE discount_codes SET status='used', used_at=NOW(), used_payment_id=$2 WHERE id=$1`, [codeId, paymentId || null]);
}

export { getXpSettings };
