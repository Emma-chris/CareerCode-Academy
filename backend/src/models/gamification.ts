import { query } from '../config/db';

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
