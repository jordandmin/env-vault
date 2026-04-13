import type {
  ThrottleStore,
  ThrottlePolicy,
  ThrottleState,
  ThrottleResult,
} from './throttle.types';

const now = (): number => Date.now();

const policyKey = (vaultId: string, actorId: string): string =>
  `${vaultId}::${actorId}`;

export function createThrottleStore(): ThrottleStore {
  return {
    policies: new Map(),
    states: new Map(),
  };
}

export function setPolicy(
  store: ThrottleStore,
  policy: ThrottlePolicy
): void {
  const key = policyKey(policy.vaultId, policy.actorId);
  store.policies.set(key, { ...policy });
}

export function getPolicy(
  store: ThrottleStore,
  vaultId: string,
  actorId: string
): ThrottlePolicy | undefined {
  return store.policies.get(policyKey(vaultId, actorId));
}

export function checkThrottle(
  store: ThrottleStore,
  vaultId: string,
  actorId: string
): ThrottleResult {
  const key = policyKey(vaultId, actorId);
  const policy = store.policies.get(key);

  if (!policy) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const current = now();
  let state: ThrottleState = store.states.get(key) ?? {
    vaultId,
    actorId,
    requestCount: 0,
    windowStart: current,
    tokens: policy.maxRequests,
    lastRefill: current,
  };

  if (policy.strategy === 'token-bucket') {
    const elapsed = current - state.lastRefill;
    const refillRate = policy.maxRequests / policy.windowMs;
    const newTokens = Math.min(
      policy.maxRequests,
      state.tokens + elapsed * refillRate
    );
    state = { ...state, tokens: newTokens, lastRefill: current };

    if (state.tokens < 1) {
      const retryAfterMs = Math.ceil((1 - state.tokens) / refillRate);
      store.states.set(key, state);
      return {
        allowed: false,
        remaining: 0,
        resetAt: current + retryAfterMs,
        retryAfterMs,
      };
    }

    state = { ...state, tokens: state.tokens - 1 };
    store.states.set(key, state);
    return {
      allowed: true,
      remaining: Math.floor(state.tokens),
      resetAt: current + policy.windowMs,
    };
  }

  // fixed or sliding window
  const windowExpired = current - state.windowStart >= policy.windowMs;
  if (windowExpired) {
    state = { ...state, requestCount: 0, windowStart: current };
  }

  if (state.requestCount >= policy.maxRequests) {
    const resetAt = state.windowStart + policy.windowMs;
    const retryAfterMs = resetAt - current;
    store.states.set(key, state);
    return { allowed: false, remaining: 0, resetAt, retryAfterMs };
  }

  state = { ...state, requestCount: state.requestCount + 1 };
  store.states.set(key, state);

  return {
    allowed: true,
    remaining: policy.maxRequests - state.requestCount,
    resetAt: state.windowStart + policy.windowMs,
  };
}

export function resetThrottle(
  store: ThrottleStore,
  vaultId: string,
  actorId: string
): void {
  store.states.delete(policyKey(vaultId, actorId));
}
