import {
  createKeyStore,
  createKey,
  rotateKey,
  revokeKey,
  getActiveKeyForVault,
  getKeysForVault,
} from './keys';

describe('keys module', () => {
  const vaultId = 'vault-1';
  const actor = 'user-alice';

  it('creates a key store', () => {
    const store = createKeyStore();
    expect(store.keys.size).toBe(0);
  });

  it('creates a key with defaults', () => {
    const store = createKeyStore();
    const key = createKey(store, { vaultId, createdBy: actor });
    expect(key.algorithm).toBe('AES-256-GCM');
    expect(key.status).toBe('active');
    expect(key.vaultId).toBe(vaultId);
    expect(key.derivationSalt).toHaveLength(64);
  });

  it('creates a key with a custom algorithm', () => {
    const store = createKeyStore();
    const key = createKey(store, { vaultId, createdBy: actor, algorithm: 'AES-128-GCM' });
    expect(key.algorithm).toBe('AES-128-GCM');
  });

  it('rotates an active key and creates a new active key', () => {
    const store = createKeyStore();
    const original = createKey(store, { vaultId, createdBy: actor });
    const newKey = rotateKey(store, { keyId: original.id, rotatedBy: actor });

    const oldKey = store.keys.get(original.id)!;
    expect(oldKey.status).toBe('rotated');
    expect(oldKey.rotatedAt).toBeInstanceOf(Date);
    expect(newKey.status).toBe('active');
    expect(newKey.id).not.toBe(original.id);
  });

  it('throws when rotating a non-active key', () => {
    const store = createKeyStore();
    const key = createKey(store, { vaultId, createdBy: actor });
    revokeKey(store, key.id);
    expect(() => rotateKey(store, { keyId: key.id, rotatedBy: actor })).toThrow();
  });

  it('revokes a key', () => {
    const store = createKeyStore();
    const key = createKey(store, { vaultId, createdBy: actor });
    const revoked = revokeKey(store, key.id);
    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedAt).toBeInstanceOf(Date);
  });

  it('throws when revoking an already revoked key', () => {
    const store = createKeyStore();
    const key = createKey(store, { vaultId, createdBy: actor });
    revokeKey(store, key.id);
    expect(() => revokeKey(store, key.id)).toThrow('already revoked');
  });

  it('returns the active key for a vault', () => {
    const store = createKeyStore();
    createKey(store, { vaultId, createdBy: actor });
    const active = getActiveKeyForVault(store, vaultId);
    expect(active?.status).toBe('active');
  });

  it('returns all keys for a vault', () => {
    const store = createKeyStore();
    const k1 = createKey(store, { vaultId, createdBy: actor });
    rotateKey(store, { keyId: k1.id, rotatedBy: actor });
    const keys = getKeysForVault(store, vaultId);
    expect(keys.length).toBe(3);
  });
});
