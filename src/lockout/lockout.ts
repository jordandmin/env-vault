import {
  LockoutStore,
  LockoutPolicy,
  LockoutRecord,
  LockoutCheckResult,
} from './lockout.types';

function now(): number {
  return Date.now();
}

function recordKey(vaultId: string, actorId: string): string {
  return `${vaultId}::${actorId}`;
}

export function createLockoutStore(): LockoutStore {
  return { policies: new Map(), records: new Map() };
}

export function setPolicy(
  store: LockoutStore,
  policy: Omit<LockoutPolicy, 'createdAt' | 'updatedAt'>
): LockoutPolicy {
  const ts = now();
  const existing = store.policies.get(policy.vaultId);
  const full: LockoutPolicy = {
    ...policy,
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
  store.policies.set(policy.vaultId, full);
  return full;
}

export function getPolicyForVault(
  store: LockoutStore,
  vaultId: string
): LockoutPolicy | undefined {
  return store.policies.get(vaultId);
}

export function recordFailedAttempt(
  store: LockoutStore,
  vaultId: string,
  actorId: string
): LockoutRecord {
  const policy = store.policies.get(vaultId);
  const key = recordKey(vaultId, actorId);
  const ts = now();
  const existing = store.records.get(key);

  const windowStart = ts - (policy?.windowMs ?? Infinity);
  const inWindow = existing && existing.firstAttemptAt >= windowStart;

  const attempts = inWindow ? existing!.attempts + 1 : 1;
  const firstAttemptAt = inWindow ? existing!.firstAttemptAt : ts;

  let lockedUntil: number | null = null;
  if (policy && attempts >= policy.maxAttempts) {
    lockedUntil = ts + policy.lockoutDurationMs;
  }

  const record: LockoutRecord = {
    id: key,
    vaultId,
    actorId,
    attempts,
    firstAttemptAt,
    lockedUntil,
    updatedAt: ts,
  };
  store.records.set(key, record);
  return record;
}

export function checkLockout(
  store: LockoutStore,
  vaultId: string,
  actorId: string
): LockoutCheckResult {
  const policy = store.policies.get(vaultId);
  if (!policy) return { allowed: false, reason: 'no_policy' };

  const key = recordKey(vaultId, actorId);
  const record = store.records.get(key);
  if (!record || record.lockedUntil === null) return { allowed: true };

  const ts = now();
  if (ts < record.lockedUntil) {
    return { allowed: false, reason: 'locked', lockedUntil: record.lockedUntil };
  }
  return { allowed: true };
}

export function clearLockout(
  store: LockoutStore,
  vaultId: string,
  actorId: string
): boolean {
  const key = recordKey(vaultId, actorId);
  return store.records.delete(key);
}
