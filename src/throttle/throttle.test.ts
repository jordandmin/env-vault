import {
  createThrottleStore,
  setPolicy,
  getPolicy,
  checkThrottle,
  resetThrottle,
} from './throttle';
import type { ThrottleStore } from './throttle.types';

let store: ThrottleStore;

beforeEach(() => {
  store = createThrottleStore();
});

describe('setPolicy / getPolicy', () => {
  it('stores and retrieves a policy', () => {
    setPolicy(store, {
      vaultId: 'v1',
      actorId: 'a1',
      maxRequests: 5,
      windowMs: 1000,
      strategy: 'fixed',
    });
    const p = getPolicy(store, 'v1', 'a1');
    expect(p).toBeDefined();
    expect(p?.maxRequests).toBe(5);
  });

  it('returns undefined for unknown policy', () => {
    expect(getPolicy(store, 'v1', 'unknown')).toBeUndefined();
  });
});

describe('checkThrottle - fixed window', () => {
  beforeEach(() => {
    setPolicy(store, {
      vaultId: 'v1',
      actorId: 'a1',
      maxRequests: 3,
      windowMs: 5000,
      strategy: 'fixed',
    });
  });

  it('allows requests within limit', () => {
    expect(checkThrottle(store, 'v1', 'a1').allowed).toBe(true);
    expect(checkThrottle(store, 'v1', 'a1').allowed).toBe(true);
    expect(checkThrottle(store, 'v1', 'a1').allowed).toBe(true);
  });

  it('blocks after limit is reached', () => {
    checkThrottle(store, 'v1', 'a1');
    checkThrottle(store, 'v1', 'a1');
    checkThrottle(store, 'v1', 'a1');
    const result = checkThrottle(store, 'v1', 'a1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('decrements remaining correctly', () => {
    const r1 = checkThrottle(store, 'v1', 'a1');
    expect(r1.remaining).toBe(2);
    const r2 = checkThrottle(store, 'v1', 'a1');
    expect(r2.remaining).toBe(1);
  });
});

describe('checkThrottle - token-bucket', () => {
  it('allows up to maxRequests initially', () => {
    setPolicy(store, {
      vaultId: 'v2',
      actorId: 'a2',
      maxRequests: 2,
      windowMs: 1000,
      strategy: 'token-bucket',
    });
    expect(checkThrottle(store, 'v2', 'a2').allowed).toBe(true);
    expect(checkThrottle(store, 'v2', 'a2').allowed).toBe(true);
    expect(checkThrottle(store, 'v2', 'a2').allowed).toBe(false);
  });
});

describe('checkThrottle - no policy', () => {
  it('allows all requests when no policy is set', () => {
    const result = checkThrottle(store, 'v99', 'a99');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });
});

describe('resetThrottle', () => {
  it('resets state so requests are allowed again', () => {
    setPolicy(store, {
      vaultId: 'v1',
      actorId: 'a1',
      maxRequests: 1,
      windowMs: 5000,
      strategy: 'fixed',
    });
    checkThrottle(store, 'v1', 'a1');
    expect(checkThrottle(store, 'v1', 'a1').allowed).toBe(false);
    resetThrottle(store, 'v1', 'a1');
    expect(checkThrottle(store, 'v1', 'a1').allowed).toBe(true);
  });
});
