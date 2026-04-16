import { PinPolicy, PinScope, PinStore } from './pinning.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createPinStore(): PinStore {
  return { policies: new Map() };
}

export function pinVersion(
  store: PinStore,
  vaultId: string,
  pinnedVersion: string,
  createdBy: string,
  options: { scope?: PinScope; secretKey?: string; expiresAt?: number } = {}
): PinPolicy {
  const { scope = 'vault', secretKey, expiresAt } = options;
  if (scope === 'secret' && !secretKey) {
    throw new Error('secretKey is required for secret-scoped pin');
  }
  const id = generateId();
  const policy: PinPolicy = {
    id,
    vaultId,
    scope,
    secretKey,
    pinnedVersion,
    createdBy,
    createdAt: now(),
    expiresAt,
  };
  store.policies.set(id, policy);
  return policy;
}

export function unpinVersion(store: PinStore, policyId: string): boolean {
  return store.policies.delete(policyId);
}

export function getPinsForVault(store: PinStore, vaultId: string): PinPolicy[] {
  return Array.from(store.policies.values()).filter(p => p.vaultId === vaultId);
}

export function getActivePin(
  store: PinStore,
  vaultId: string,
  secretKey?: string
): PinPolicy | undefined {
  const t = now();
  return Array.from(store.policies.values()).find(p => {
    if (p.vaultId !== vaultId) return false;
    if (p.expiresAt !== undefined && p.expiresAt < t) return false;
    if (secretKey) return p.scope === 'secret' && p.secretKey === secretKey;
    return p.scope === 'vault';
  });
}

export function resolveVersion(
  store: PinStore,
  vaultId: string,
  currentVersion: string,
  secretKey?: string
): string {
  const pin = getActivePin(store, vaultId, secretKey)
    ?? getActivePin(store, vaultId);
  return pin ? pin.pinnedVersion : currentVersion;
}
