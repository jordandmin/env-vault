import { createKeyStore, createKey, rotateKey, revokeKey, getActiveKeyForVault, listKeysForVault } from './keys';

describe('keys integration', () => {
  it('full key lifecycle: create, rotate, revoke', () => {
    const store = createKeyStore();
    const vaultId = 'vault-integration-1';
    const actor = 'alice';

    // Create initial key
    const key1 = createKey(store, vaultId, actor);
    expect(key1.status).toBe('active');
    expect(key1.vaultId).toBe(vaultId);

    // Active key should be key1
    const active1 = getActiveKeyForVault(store, vaultId);
    expect(active1?.id).toBe(key1.id);

    // Rotate key — key1 becomes retired, key2 becomes active
    const key2 = rotateKey(store, vaultId, actor);
    expect(key2.status).toBe('active');
    expect(key2.version).toBeGreaterThan(key1.version);

    const active2 = getActiveKeyForVault(store, vaultId);
    expect(active2?.id).toBe(key2.id);

    const allKeys = listKeysForVault(store, vaultId);
    const retiredKey = allKeys.find(k => k.id === key1.id);
    expect(retiredKey?.status).toBe('retired');

    // Revoke the active key
    revokeKey(store, key2.id, actor);
    const active3 = getActiveKeyForVault(store, vaultId);
    expect(active3).toBeUndefined();

    const revokedKey = listKeysForVault(store, vaultId).find(k => k.id === key2.id);
    expect(revokedKey?.status).toBe('revoked');
  });

  it('multiple vaults maintain independent key stores', () => {
    const store = createKeyStore();

    const keyA = createKey(store, 'vault-A', 'alice');
    const keyB = createKey(store, 'vault-B', 'bob');

    expect(getActiveKeyForVault(store, 'vault-A')?.id).toBe(keyA.id);
    expect(getActiveKeyForVault(store, 'vault-B')?.id).toBe(keyB.id);

    rotateKey(store, 'vault-A', 'alice');

    // vault-B key should remain unchanged
    expect(getActiveKeyForVault(store, 'vault-B')?.id).toBe(keyB.id);

    // vault-A should now have 2 keys
    expect(listKeysForVault(store, 'vault-A').length).toBe(2);
    expect(listKeysForVault(store, 'vault-B').length).toBe(1);
  });

  it('rotate on vault with no existing key creates first key', () => {
    const store = createKeyStore();
    const key = rotateKey(store, 'vault-new', 'admin');
    expect(key.status).toBe('active');
    expect(listKeysForVault(store, 'vault-new').length).toBe(1);
  });
});
