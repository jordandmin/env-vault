import { RateLimitStore, RateLimitPolicy, RateLimitResult } from './ratelimit.types';

function now(): number {
  return Date.now();
}

export function createRateLimitStore(): RateLimitStore {
  return {
    policies: new Map(),
    counters: new Map(),
  };
}

export function setPolicy(
  store: RateLimitStore,
  vaultId: string,
  policy: Omit<RateLimitPolicy, 'vaultId'>
): RateLimitPolicy {
  const full: RateLimitPolicy = { ...policy, vaultId };
  store.policies.set(vaultId, full);
  return full;
}

export function getPolicy(
  store: RateLimitStore,
  vaultId: string
): RateLimitPolicy | undefined {
  return store.policies.get(vaultId);
}

export function checkRateLimit(
  store: RateLimitStore,
  vaultId: string,
  actor: string
): RateLimitResult {
  const policy = store.policies.get(vaultId);
  if (!policy) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const key = `${vaultId}:${actor}`;
  const windowMs = policy.windowSeconds * 1000;
  const currentTime = now();
  const windowStart = currentTime - windowMs;

  let timestamps = store.counters.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  const count = timestamps.length;
  const allowed = count < policy.maxRequests;

  if (allowed) {
    timestamps.push(currentTime);
    store.counters.set(key, timestamps);
  }

  const resetAt =
    timestamps.length > 0 ? timestamps[0] + windowMs : currentTime + windowMs;

  return {
    allowed,
    remaining: Math.max(0, policy.maxRequests - timestamps.length),
    resetAt,
  };
}

export function resetCounterForActor(
  store: RateLimitStore,
  vaultId: string,
  actor: string
): void {
  const key = `${vaultId}:${actor}`;
  store.counters.delete(key);
}
