/**
 * Concurrency control: per-vault mutex/lock management to prevent
 * race conditions during concurrent secret writes or rotations.
 */

export interface LockEntry {
  vaultId: string;
  lockedBy: string;
  acquiredAt: number;
  ttlMs: number;
}

export interface ConcurrencyStore {
  locks: Map<string, LockEntry>;
}

function now(): number {
  return Date.now();
}

export function createConcurrencyStore(): ConcurrencyStore {
  return { locks: new Map() };
}

export function acquireLock(
  store: ConcurrencyStore,
  vaultId: string,
  actor: string,
  ttlMs = 5000
): { acquired: boolean; entry?: LockEntry } {
  const existing = store.locks.get(vaultId);
  if (existing) {
    const expired = now() - existing.acquiredAt > existing.ttlMs;
    if (!expired) {
      return { acquired: false };
    }
  }
  const entry: LockEntry = {
    vaultId,
    lockedBy: actor,
    acquiredAt: now(),
    ttlMs,
  };
  store.locks.set(vaultId, entry);
  return { acquired: true, entry };
}

export function releaseLock(
  store: ConcurrencyStore,
  vaultId: string,
  actor: string
): { released: boolean; reason?: string } {
  const existing = store.locks.get(vaultId);
  if (!existing) {
    return { released: false, reason: "no_lock" };
  }
  if (existing.lockedBy !== actor) {
    return { released: false, reason: "not_owner" };
  }
  store.locks.delete(vaultId);
  return { released: true };
}

export function getLock(
  store: ConcurrencyStore,
  vaultId: string
): LockEntry | undefined {
  const entry = store.locks.get(vaultId);
  if (!entry) return undefined;
  const expired = now() - entry.acquiredAt > entry.ttlMs;
  if (expired) {
    store.locks.delete(vaultId);
    return undefined;
  }
  return entry;
}

export function forceReleaseLock(
  store: ConcurrencyStore,
  vaultId: string
): boolean {
  return store.locks.delete(vaultId);
}

export function listActiveLocks(store: ConcurrencyStore): LockEntry[] {
  const active: LockEntry[] = [];
  const t = now();
  for (const [vaultId, entry] of store.locks) {
    if (t - entry.acquiredAt <= entry.ttlMs) {
      active.push(entry);
    } else {
      store.locks.delete(vaultId);
    }
  }
  return active;
}
