import { TtlStore, TtlPolicy, CreateTtlPolicyInput } from './ttl.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createTtlStore(): TtlStore {
  return { policies: new Map() };
}

function makeStoreKey(vaultId: string, secretKey: string): string {
  return `${vaultId}::${secretKey}`;
}

export function setTtlPolicy(
  store: TtlStore,
  input: CreateTtlPolicyInput
): TtlPolicy {
  const { vaultId, secretKey, ttlMs, createdBy } = input;
  const policy: TtlPolicy = {
    id: generateId(),
    vaultId,
    secretKey,
    expiresAt: now() + ttlMs,
    createdAt: now(),
    createdBy,
  };
  store.policies.set(makeStoreKey(vaultId, secretKey), policy);
  return policy;
}

export function getTtlPolicy(
  store: TtlStore,
  vaultId: string,
  secretKey: string
): TtlPolicy | undefined {
  return store.policies.get(makeStoreKey(vaultId, secretKey));
}

export function removeTtlPolicy(
  store: TtlStore,
  vaultId: string,
  secretKey: string
): boolean {
  return store.policies.delete(makeStoreKey(vaultId, secretKey));
}

export function isExpired(
  store: TtlStore,
  vaultId: string,
  secretKey: string
): boolean {
  const policy = getTtlPolicy(store, vaultId, secretKey);
  if (!policy) return false;
  return now() >= policy.expiresAt;
}

export function getExpiredPolicies(store: TtlStore): TtlPolicy[] {
  const current = now();
  return Array.from(store.policies.values()).filter(
    (p) => current >= p.expiresAt
  );
}

export function purgeExpired(
  store: TtlStore
): TtlPolicy[] {
  const expired = getExpiredPolicies(store);
  for (const policy of expired) {
    store.policies.delete(makeStoreKey(policy.vaultId, policy.secretKey));
  }
  return expired;
}
