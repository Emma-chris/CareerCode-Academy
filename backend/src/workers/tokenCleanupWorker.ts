import { clearExpiredTokens } from '../models/token';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export function startTokenCleanupWorker(): void {
  console.log('[TokenCleanup] Worker started — cleaning expired refresh tokens every hour');

  // Run immediately on start
  runCleanup();

  setInterval(runCleanup, CLEANUP_INTERVAL);
}

async function runCleanup(): Promise<void> {
  try {
    const deleted = await clearExpiredTokens();
    if (deleted > 0) {
      console.log(`[TokenCleanup] Removed ${deleted} expired refresh tokens`);
    }
  } catch (error) {
    console.error('[TokenCleanup] Error cleaning expired tokens:', error);
  }
}
