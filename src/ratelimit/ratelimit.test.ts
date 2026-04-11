import {
  createRateLimitStore,
  setPolicy,
  getPolicy,
  checkRateLimit,
  resetCounterForActor,
} from './ratelimit';

describe('ratelimit', () => {
  it('allows requests when no policy is set', () => {
    const store = createRateLimitStore();
    const result = checkRateLimit(store, 'vault-1', 'alice');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it('sets and retrieves a policy', () => {
    const store = createRateLimitStore();
    const policy = setPolicy(store, 'vault-1', { maxRequests: 5, windowSeconds: 60 });
    expect(policy.vaultId).toBe('vault-1');
    expect(policy.maxRequests).toBe(5);
    expect(getPolicy(store, 'vault-1')).toEqual(policy);
  });

  it('allows requests within the limit', () => {
    const store = createRateLimitStore();
    setPolicy(store, 'vault-1', { maxRequests: 3, windowSeconds: 60 });
    const r1 = checkRateLimit(store, 'vault-1', 'alice');
    const r2 = checkRateLimit(store, 'vault-1', 'alice');
    const r3 = checkRateLimit(store, 'vault-1', 'alice');
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests exceeding the limit', () => {
    const store = createRateLimitStore();
    setPolicy(store, 'vault-1', { maxRequests: 2, windowSeconds: 60 });
    checkRateLimit(store, 'vault-1', 'bob');
    checkRateLimit(store, 'vault-1', 'bob');
    const result = checkRateLimit(store, 'vault-1', 'bob');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks limits per actor independently', () => {
    const store = createRateLimitStore();
    setPolicy(store, 'vault-1', { maxRequests: 1, windowSeconds: 60 });
    checkRateLimit(store, 'vault-1', 'alice');
    const aliceBlocked = checkRateLimit(store, 'vault-1', 'alice');
    const bobAllowed = checkRateLimit(store, 'vault-1', 'bob');
    expect(aliceBlocked.allowed).toBe(false);
    expect(bobAllowed.allowed).toBe(true);
  });

  it('resets counter for a specific actor', () => {
    const store = createRateLimitStore();
    setPolicy(store, 'vault-1', { maxRequests: 1, windowSeconds: 60 });
    checkRateLimit(store, 'vault-1', 'alice');
    resetCounterForActor(store, 'vault-1', 'alice');
    const result = checkRateLimit(store, 'vault-1', 'alice');
    expect(result.allowed).toBe(true);
  });

  it('provides a resetAt timestamp', () => {
    const store = createRateLimitStore();
    setPolicy(store, 'vault-1', { maxRequests: 5, windowSeconds: 30 });
    const before = Date.now();
    const result = checkRateLimit(store, 'vault-1', 'alice');
    const after = Date.now();
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 30000);
    expect(result.resetAt).toBeLessThanOrEqual(after + 30000);
  });
});
