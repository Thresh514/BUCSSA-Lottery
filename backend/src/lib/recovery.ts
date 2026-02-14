import { redis, RedisKeys } from './redis.js';
import { getLatestSnapshot } from './database.js';

let inFlight: Promise<void> | null = null;

async function sAddInBatches(key: string, members: string[], batchSize = 500): Promise<void> {
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    // redis.sAdd expects variadic members
    await redis.sAdd(key, batch);
  }
}

/**
 * Best-effort recovery:
 * - If Redis lost critical keys, attempt to restore minimal state from PostgreSQL snapshot.
 * - Normal operation still treats Redis as source of truth.
 */
export async function ensureRecovered(): Promise<void> {
  try {
    // If admin just reset the game, do NOT auto-recover from PG snapshot.
    const recoveryDisabled = await redis.exists(RedisKeys.recoveryDisabled());
    if (recoveryDisabled) return;

    // Fast path: Redis already has basic state
    const [hasRound, hasState] = await Promise.all([
      redis.exists(RedisKeys.currentRound()),
      redis.exists(RedisKeys.gameState()),
    ]);
    if (hasRound && hasState) return;
  } catch (err) {
    // Redis itself is unavailable; don't block socket connections here.
    console.error('ensureRecovered: Redis not reachable (non-blocking):', err);
    return;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const snapshot = await getLatestSnapshot();

      // Always re-initialize minimal runtime keys
      await Promise.all([
        redis.del(RedisKeys.currentQuestion()),
        redis.del(RedisKeys.gameAnswers()),
        redis.del(RedisKeys.gameWinner()),
        redis.del(RedisKeys.gameTie()),
        redis.del(RedisKeys.roomEliminated()),
      ]);

      if (snapshot?.started && snapshot.survivorEmails?.length) {
        // Restore “between rounds” state
        await Promise.all([
          redis.set(RedisKeys.gameStarted(), '1'),
          redis.set(RedisKeys.currentRound(), snapshot.currentRound.toString()),
          redis.hSet(RedisKeys.gameState(), 'status', 'waiting'),
          redis.hSet(RedisKeys.gameState(), 'timeLeft', '0'),
          redis.del(RedisKeys.roomSurvivors()),
        ]);
        await sAddInBatches(RedisKeys.roomSurvivors(), snapshot.survivorEmails);
      } else {
        // No active snapshot → start from a clean waiting state
        await Promise.all([
          redis.set(RedisKeys.gameStarted(), '0'),
          redis.set(RedisKeys.currentRound(), '0'),
          redis.hSet(RedisKeys.gameState(), 'status', 'waiting'),
          redis.hSet(RedisKeys.gameState(), 'timeLeft', '0'),
          redis.del(RedisKeys.roomSurvivors()),
        ]);
      }
    } catch (err) {
      // If DB is unavailable too, do not block connections.
      console.error('ensureRecovered failed (non-blocking):', err);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

