type Key = string;

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<Key, Bucket>();

export interface RateLimitOptions {
  tokensPerInterval: number; // e.g., 5
  intervalMs: number; // e.g., 60000
}

function getKey(userId: string, routeId: string): Key {
  return `${userId}:${routeId}`;
}

export function rateLimit(
  userId: string,
  routeId: string,
  opts: RateLimitOptions
): boolean {
  const key = getKey(userId, routeId);
  const now = Date.now();
  const existing = buckets.get(key) ?? {
    tokens: opts.tokensPerInterval,
    lastRefill: now,
  };

  // Refill
  const elapsed = now - existing.lastRefill;
  if (elapsed >= opts.intervalMs) {
    const refills = Math.floor(elapsed / opts.intervalMs);
    existing.tokens = Math.min(
      opts.tokensPerInterval,
      existing.tokens + refills * opts.tokensPerInterval
    );
    existing.lastRefill = now;
  }

  if (existing.tokens <= 0) {
    buckets.set(key, existing);
    return false;
  }

  existing.tokens -= 1;
  buckets.set(key, existing);
  return true;
}
