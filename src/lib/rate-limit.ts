/**
 * In-memory sliding window rate limiter for security-sensitive endpoints (login, PIN check).
 * Automatically purges stale records to avoid memory leaks.
 */

interface RateLimitRecord {
  attempts: number[];
}

const attemptsMap = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsMap.entries()) {
      record.attempts = record.attempts.filter(t => now - t < 15 * 60 * 1000);
      if (record.attempts.length === 0) {
        attemptsMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if an action is currently rate-limited.
 * @param key Unique key, e.g. "login:ip:identifier"
 * @param maxAttempts Maximum allowed failed attempts in window
 * @param windowMs Time window in milliseconds (default: 10 minutes)
 * @returns { isLimited: boolean, remainingAttempts: number, retryAfterSec: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 10 * 60 * 1000
): { isLimited: boolean; remainingAttempts: number; retryAfterSec: number } {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record) {
    return { isLimited: false, remainingAttempts: maxAttempts, retryAfterSec: 0 };
  }

  // Filter out attempts older than window
  record.attempts = record.attempts.filter(t => now - t < windowMs);

  if (record.attempts.length >= maxAttempts) {
    const oldestAttempt = record.attempts[0];
    const retryAfterSec = Math.ceil((oldestAttempt + windowMs - now) / 1000);
    return { isLimited: true, remainingAttempts: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  return {
    isLimited: false,
    remainingAttempts: maxAttempts - record.attempts.length,
    retryAfterSec: 0,
  };
}

/**
 * Records a failed attempt for the given key.
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  let record = attemptsMap.get(key);
  if (!record) {
    record = { attempts: [] };
    attemptsMap.set(key, record);
  }
  record.attempts.push(now);
}

/**
 * Clears rate limit state on successful operation.
 */
export function resetRateLimit(key: string): void {
  attemptsMap.delete(key);
}
