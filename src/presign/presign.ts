import { randomBytes, createHmac } from 'crypto';

export interface PresignedToken {
  id: string;
  vaultId: string;
  key: string;
  actorId: string;
  expiresAt: number;
  signature: string;
}

export interface PresignStore {
  tokens: Map<string, PresignedToken>;
  secret: string;
}

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function now(): number {
  return Date.now();
}

export function createPresignStore(secret: string): PresignStore {
  return { tokens: new Map(), secret };
}

function sign(store: PresignStore, id: string, vaultId: string, key: string, expiresAt: number): string {
  return createHmac('sha256', store.secret)
    .update(`${id}:${vaultId}:${key}:${expiresAt}`)
    .digest('hex');
}

export function issuePresignedToken(
  store: PresignStore,
  vaultId: string,
  key: string,
  actorId: string,
  ttlMs: number
): PresignedToken {
  const id = generateId();
  const expiresAt = now() + ttlMs;
  const signature = sign(store, id, vaultId, key, expiresAt);
  const token: PresignedToken = { id, vaultId, key, actorId, expiresAt, signature };
  store.tokens.set(id, token);
  return token;
}

export function validatePresignedToken(
  store: PresignStore,
  id: string
): { valid: boolean; token?: PresignedToken; reason?: string } {
  const token = store.tokens.get(id);
  if (!token) return { valid: false, reason: 'not_found' };
  if (now() > token.expiresAt) {
    store.tokens.delete(id);
    return { valid: false, reason: 'expired' };
  }
  const expected = sign(store, token.id, token.vaultId, token.key, token.expiresAt);
  if (expected !== token.signature) return { valid: false, reason: 'invalid_signature' };
  return { valid: true, token };
}

export function revokePresignedToken(store: PresignStore, id: string): boolean {
  return store.tokens.delete(id);
}

export function listPresignedTokens(store: PresignStore, vaultId: string): PresignedToken[] {
  return Array.from(store.tokens.values()).filter(t => t.vaultId === vaultId);
}
