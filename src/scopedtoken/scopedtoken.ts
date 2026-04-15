import { ScopedToken, ScopedTokenPolicy, ScopedTokenStore, TokenScope } from './scopedtoken.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createScopedTokenStore(): ScopedTokenStore {
  return {
    tokens: new Map(),
    byVault: new Map(),
  };
}

export function issueToken(store: ScopedTokenStore, policy: ScopedTokenPolicy): ScopedToken {
  if (policy.scopes.length === 0) {
    throw new Error('At least one scope is required');
  }
  const id = generateId();
  const token = generateId() + generateId();
  const entry: ScopedToken = {
    id,
    token,
    vaultId: policy.vaultId,
    scopes: [...policy.scopes],
    createdBy: policy.createdBy,
    createdAt: now(),
    expiresAt: policy.expiresAt,
    active: true,
  };
  store.tokens.set(id, entry);
  if (!store.byVault.has(policy.vaultId)) {
    store.byVault.set(policy.vaultId, new Set());
  }
  store.byVault.get(policy.vaultId)!.add(id);
  return entry;
}

export function revokeToken(store: ScopedTokenStore, tokenId: string): boolean {
  const entry = store.tokens.get(tokenId);
  if (!entry || !entry.active) return false;
  store.tokens.set(tokenId, { ...entry, active: false, revokedAt: now() });
  return true;
}

export function validateToken(
  store: ScopedTokenStore,
  rawToken: string,
  requiredScope: TokenScope
): { valid: boolean; reason?: string; token?: ScopedToken } {
  const entry = [...store.tokens.values()].find((t) => t.token === rawToken);
  if (!entry) return { valid: false, reason: 'token_not_found' };
  if (!entry.active) return { valid: false, reason: 'token_revoked' };
  if (entry.expiresAt !== undefined && now() > entry.expiresAt) {
    return { valid: false, reason: 'token_expired' };
  }
  if (!entry.scopes.includes(requiredScope)) {
    return { valid: false, reason: 'insufficient_scope' };
  }
  return { valid: true, token: entry };
}

export function getTokensForVault(store: ScopedTokenStore, vaultId: string): ScopedToken[] {
  const ids = store.byVault.get(vaultId);
  if (!ids) return [];
  return [...ids].map((id) => store.tokens.get(id)!).filter(Boolean);
}

export function getActiveTokensForVault(store: ScopedTokenStore, vaultId: string): ScopedToken[] {
  return getTokensForVault(store, vaultId).filter(
    (t) => t.active && (t.expiresAt === undefined || t.expiresAt > now())
  );
}
