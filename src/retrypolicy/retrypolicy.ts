import { RetryPolicy, RetryAttempt, RetryStore, RetryStrategy } from './retrypolicy.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createRetryStore(): RetryStore {
  return { policies: new Map(), attempts: new Map() };
}

export function setPolicy(
  store: RetryStore,
  vaultId: string,
  opts: { maxAttempts: number; strategy: RetryStrategy; baseDelayMs: number; maxDelayMs: number; jitter?: boolean }
): RetryPolicy {
  const existing = getPolicyForVault(store, vaultId);
  const policy: RetryPolicy = {
    id: existing?.id ?? generateId(),
    vaultId,
    maxAttempts: opts.maxAttempts,
    strategy: opts.strategy,
    baseDelayMs: opts.baseDelayMs,
    maxDelayMs: opts.maxDelayMs,
    jitter: opts.jitter ?? false,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  store.policies.set(vaultId, policy);
  return policy;
}

export function getPolicyForVault(store: RetryStore, vaultId: string): RetryPolicy | undefined {
  return store.policies.get(vaultId);
}

export function computeDelay(policy: RetryPolicy, attemptNumber: number): number {
  let delay: number;
  if (policy.strategy === 'fixed') {
    delay = policy.baseDelayMs;
  } else if (policy.strategy === 'linear') {
    delay = policy.baseDelayMs * attemptNumber;
  } else {
    delay = policy.baseDelayMs * Math.pow(2, attemptNumber - 1);
  }
  delay = Math.min(delay, policy.maxDelayMs);
  if (policy.jitter) {
    delay = Math.floor(delay * (0.5 + Math.random() * 0.5));
  }
  return delay;
}

export function recordAttempt(
  store: RetryStore,
  vaultId: string,
  operation: string,
  attemptNumber: number,
  result: { success: boolean; error?: string }
): RetryAttempt | null {
  const policy = getPolicyForVault(store, vaultId);
  if (!policy) return null;
  const delay = computeDelay(policy, attemptNumber);
  const attempt: RetryAttempt = {
    id: generateId(),
    policyId: policy.id,
    vaultId,
    operation,
    attemptNumber,
    delayMs: delay,
    createdAt: now(),
    ...(result.success ? { succeededAt: now() } : { failedAt: now(), error: result.error }),
  };
  const key = `${vaultId}:${operation}`;
  const list = store.attempts.get(key) ?? [];
  list.push(attempt);
  store.attempts.set(key, list);
  return attempt;
}

export function getAttemptsForOperation(
  store: RetryStore,
  vaultId: string,
  operation: string
): RetryAttempt[] {
  return store.attempts.get(`${vaultId}:${operation}`) ?? [];
}

export function shouldRetry(
  store: RetryStore,
  vaultId: string,
  operation: string
): boolean {
  const policy = getPolicyForVault(store, vaultId);
  if (!policy) return false;
  const attempts = getAttemptsForOperation(store, vaultId, operation);
  const failures = attempts.filter((a) => a.failedAt !== undefined);
  return failures.length < policy.maxAttempts;
}
