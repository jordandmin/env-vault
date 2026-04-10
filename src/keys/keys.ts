import { randomBytes, randomUUID } from 'crypto';
import {
  KeyStore,
  VaultKey,
  CreateKeyOptions,
  RotateKeyOptions,
} from './keys.types';

export function createKeyStore(): KeyStore {
  return { keys: new Map() };
}

export function createKey(
  store: KeyStore,
  options: CreateKeyOptions
): VaultKey {
  const key: VaultKey = {
    id: randomUUID(),
    vaultId: options.vaultId,
    algorithm: options.algorithm ?? 'AES-256-GCM',
    status: 'active',
    createdAt: new Date(),
    createdBy: options.createdBy,
    derivationSalt: randomBytes(32).toString('hex'),
  };
  store.keys.set(key.id, key);
  return key;
}

export function rotateKey(
  store: KeyStore,
  options: RotateKeyOptions
): VaultKey {
  const existing = store.keys.get(options.keyId);
  if (!existing) throw new Error(`Key not found: ${options.keyId}`);
  if (existing.status !== 'active')
    throw new Error(`Cannot rotate key with status: ${existing.status}`);

  const rotated: VaultKey = { ...existing, status: 'rotated', rotatedAt: new Date() };
  store.keys.set(existing.id, rotated);

  const newKey: VaultKey = {
    id: randomUUID(),
    vaultId: existing.vaultId,
    algorithm: existing.algorithm,
    status: 'active',
    createdAt: new Date(),
    createdBy: options.rotatedBy,
    derivationSalt: randomBytes(32).toString('hex'),
  };
  store.keys.set(newKey.id, newKey);
  return newKey;
}

export function revokeKey(store: KeyStore, keyId: string): VaultKey {
  const key = store.keys.get(keyId);
  if (!key) throw new Error(`Key not found: ${keyId}`);
  if (key.status === 'revoked') throw new Error('Key is already revoked');
  const revoked: VaultKey = { ...key, status: 'revoked', revokedAt: new Date() };
  store.keys.set(keyId, revoked);
  return revoked;
}

export function getActiveKeyForVault(
  store: KeyStore,
  vaultId: string
): VaultKey | undefined {
  for (const key of store.keys.values()) {
    if (key.vaultId === vaultId && key.status === 'active') return key;
  }
  return undefined;
}

export function getKeysForVault(store: KeyStore, vaultId: string): VaultKey[] {
  return Array.from(store.keys.values()).filter((k) => k.vaultId === vaultId);
}
