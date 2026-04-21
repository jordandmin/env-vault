import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  SigningKey,
  SigningKeyPolicy,
  SigningKeyStore,
  SignResult,
  SigningAlgorithm,
} from './signingkey.types';

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function now(): number {
  return Date.now();
}

export function createSigningKeyStore(): SigningKeyStore {
  return { keys: new Map(), policies: new Map() };
}

export function setPolicy(
  store: SigningKeyStore,
  policy: SigningKeyPolicy
): void {
  store.policies.set(policy.vaultId, policy);
}

export function getPolicy(
  store: SigningKeyStore,
  vaultId: string
): SigningKeyPolicy | undefined {
  return store.policies.get(vaultId);
}

export function createSigningKey(
  store: SigningKeyStore,
  vaultId: string,
  algorithm: SigningAlgorithm = 'HMAC-SHA256'
): SigningKey {
  const policy = store.policies.get(vaultId);
  const rotationDays = policy?.rotationIntervalDays ?? 90;
  const key: SigningKey = {
    id: generateId(),
    vaultId,
    algorithm,
    secret: randomBytes(32).toString('hex'),
    createdAt: now(),
    expiresAt: now() + rotationDays * 86_400_000,
    revokedAt: null,
    active: true,
  };
  store.keys.set(key.id, key);
  return key;
}

export function revokeSigningKey(
  store: SigningKeyStore,
  keyId: string
): boolean {
  const key = store.keys.get(keyId);
  if (!key || !key.active) return false;
  key.active = false;
  key.revokedAt = now();
  return true;
}

export function getActiveKeyForVault(
  store: SigningKeyStore,
  vaultId: string
): SigningKey | undefined {
  const t = now();
  for (const key of store.keys.values()) {
    if (
      key.vaultId === vaultId &&
      key.active &&
      key.revokedAt === null &&
      (key.expiresAt === null || key.expiresAt > t)
    ) {
      return key;
    }
  }
  return undefined;
}

export function signPayload(
  store: SigningKeyStore,
  vaultId: string,
  payload: string
): SignResult {
  const key = getActiveKeyForVault(store, vaultId);
  if (!key) throw new Error(`No active signing key for vault: ${vaultId}`);
  const hashAlg = key.algorithm === 'HMAC-SHA512' ? 'sha512' : 'sha256';
  const signature = createHmac(hashAlg, key.secret)
    .update(payload)
    .digest('hex');
  return { keyId: key.id, signature, algorithm: key.algorithm, signedAt: now() };
}

export function verifyPayload(
  store: SigningKeyStore,
  keyId: string,
  payload: string,
  signature: string
): boolean {
  const key = store.keys.get(keyId);
  if (!key) return false;
  const hashAlg = key.algorithm === 'HMAC-SHA512' ? 'sha512' : 'sha256';
  const expected = createHmac(hashAlg, key.secret)
    .update(payload)
    .digest('hex');
  // Use timing-safe comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
