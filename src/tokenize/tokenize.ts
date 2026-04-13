import { randomUUID } from 'crypto';
import { Token, TokenFormat, TokenPolicy, TokenStore } from './tokenize.types';

function now(): number {
  return Date.now();
}

function generateId(): string {
  return randomUUID();
}

function generateToken(format: TokenFormat, prefix?: string): string {
  const raw = randomUUID().replace(/-/g, '');
  switch (format) {
    case 'uuid':
      return randomUUID();
    case 'prefixed':
      return `${prefix ?? 'tok'}_${raw}`;
    case 'opaque':
    default:
      return raw;
  }
}

export function createTokenStore(): TokenStore {
  return {
    tokens: new Map(),
    bySecret: new Map(),
    policies: new Map(),
  };
}

export function setPolicy(
  store: TokenStore,
  policy: Omit<TokenPolicy, 'createdAt'>
): TokenPolicy {
  const full: TokenPolicy = { ...policy, createdAt: now() };
  store.policies.set(policy.vaultId, full);
  return full;
}

export function getPolicyForVault(
  store: TokenStore,
  vaultId: string
): TokenPolicy | undefined {
  return store.policies.get(vaultId);
}

export function tokenizeSecret(
  store: TokenStore,
  vaultId: string,
  secretKey: string
): Token {
  const storeKey = `${vaultId}:${secretKey}`;
  const existing = store.bySecret.get(storeKey);
  if (existing) {
    const token = store.tokens.get(existing);
    if (token && !token.revokedAt) return token;
  }

  const policy = store.policies.get(vaultId);
  const format: TokenFormat = policy?.format ?? 'opaque';
  const tokenValue = generateToken(format, policy?.prefix);
  const createdAt = now();
  const expiresAt = policy?.ttlSeconds ? createdAt + policy.ttlSeconds * 1000 : undefined;

  const entry: Token = {
    id: generateId(),
    vaultId,
    secretKey,
    token: tokenValue,
    createdAt,
    expiresAt,
  };

  store.tokens.set(tokenValue, entry);
  store.bySecret.set(storeKey, tokenValue);
  return entry;
}

export function detokenize(
  store: TokenStore,
  token: string
): Token | { error: string } {
  const entry = store.tokens.get(token);
  if (!entry) return { error: 'token_not_found' };
  if (entry.revokedAt) return { error: 'token_revoked' };
  if (entry.expiresAt && now() > entry.expiresAt) return { error: 'token_expired' };
  return entry;
}

export function revokeToken(
  store: TokenStore,
  token: string
): boolean {
  const entry = store.tokens.get(token);
  if (!entry || entry.revokedAt) return false;
  entry.revokedAt = now();
  store.bySecret.delete(`${entry.vaultId}:${entry.secretKey}`);
  return true;
}

export function listTokensForVault(
  store: TokenStore,
  vaultId: string
): Token[] {
  return Array.from(store.tokens.values()).filter(
    (t) => t.vaultId === vaultId && !t.revokedAt
  );
}
