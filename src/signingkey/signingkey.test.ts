import {
  createSigningKeyStore,
  createSigningKey,
  revokeSigningKey,
  getActiveKeyForVault,
  signPayload,
  verifyPayload,
  setPolicy,
  getPolicy,
} from './signingkey';

describe('signingkey', () => {
  const vaultId = 'vault-1';

  it('creates a store', () => {
    const store = createSigningKeyStore();
    expect(store.keys.size).toBe(0);
    expect(store.policies.size).toBe(0);
  });

  it('sets and gets a policy', () => {
    const store = createSigningKeyStore();
    setPolicy(store, { vaultId, algorithm: 'HMAC-SHA256', rotationIntervalDays: 30 });
    const policy = getPolicy(store, vaultId);
    expect(policy?.rotationIntervalDays).toBe(30);
  });

  it('creates a signing key', () => {
    const store = createSigningKeyStore();
    const key = createSigningKey(store, vaultId);
    expect(key.vaultId).toBe(vaultId);
    expect(key.active).toBe(true);
    expect(key.revokedAt).toBeNull();
    expect(key.secret).toHaveLength(64);
  });

  it('returns active key for vault', () => {
    const store = createSigningKeyStore();
    createSigningKey(store, vaultId);
    const active = getActiveKeyForVault(store, vaultId);
    expect(active).toBeDefined();
  });

  it('revokes a signing key', () => {
    const store = createSigningKeyStore();
    const key = createSigningKey(store, vaultId);
    expect(revokeSigningKey(store, key.id)).toBe(true);
    expect(store.keys.get(key.id)?.active).toBe(false);
    expect(getActiveKeyForVault(store, vaultId)).toBeUndefined();
  });

  it('returns false when revoking already revoked key', () => {
    const store = createSigningKeyStore();
    const key = createSigningKey(store, vaultId);
    revokeSigningKey(store, key.id);
    expect(revokeSigningKey(store, key.id)).toBe(false);
  });

  it('signs and verifies a payload', () => {
    const store = createSigningKeyStore();
    createSigningKey(store, vaultId);
    const result = signPayload(store, vaultId, 'hello-world');
    expect(result.signature).toBeTruthy();
    expect(verifyPayload(store, result.keyId, 'hello-world', result.signature)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const store = createSigningKeyStore();
    createSigningKey(store, vaultId);
    const result = signPayload(store, vaultId, 'hello-world');
    expect(verifyPayload(store, result.keyId, 'tampered', result.signature)).toBe(false);
  });

  it('throws when signing with no active key', () => {
    const store = createSigningKeyStore();
    expect(() => signPayload(store, 'no-vault', 'data')).toThrow();
  });

  it('supports HMAC-SHA512 algorithm', () => {
    const store = createSigningKeyStore();
    createSigningKey(store, vaultId, 'HMAC-SHA512');
    const result = signPayload(store, vaultId, 'secure-data');
    expect(result.algorithm).toBe('HMAC-SHA512');
    expect(verifyPayload(store, result.keyId, 'secure-data', result.signature)).toBe(true);
  });
});
