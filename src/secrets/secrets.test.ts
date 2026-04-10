import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSecretStore,
  setSecret,
  getSecret,
  deleteSecret,
  listSecrets,
} from './secrets';
import { SecretStore } from './secrets.types';

const MASTER_PASSWORD = 'test-master-password';
const VAULT_ID = 'vault-abc';
const ACTOR_ID = 'user-1';

describe('secrets', () => {
  let store: SecretStore;

  beforeEach(() => {
    store = createSecretStore();
  });

  it('should set and retrieve a secret', async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: 'DB_URL', value: 'postgres://localhost', actorId: ACTOR_ID }, MASTER_PASSWORD);
    const result = await getSecret(store, VAULT_ID, 'DB_URL', MASTER_PASSWORD);
    expect(result).not.toBeNull();
    expect(result?.value).toBe('postgres://localhost');
    expect(result?.key).toBe('DB_URL');
    expect(result?.version).toBe(1);
  });

  it('should return null for missing secret', async () => {
    const result = await getSecret(store, VAULT_ID, 'MISSING', MASTER_PASSWORD);
    expect(result).toBeNull();
  });

  it('should increment version on update', async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: 'API_KEY', value: 'old-key', actorId: ACTOR_ID }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: VAULT_ID, key: 'API_KEY', value: 'new-key', actorId: ACTOR_ID }, MASTER_PASSWORD);
    const result = await getSecret(store, VAULT_ID, 'API_KEY', MASTER_PASSWORD);
    expect(result?.value).toBe('new-key');
    expect(result?.version).toBe(2);
  });

  it('should delete a secret', async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: 'TOKEN', value: 'secret', actorId: ACTOR_ID }, MASTER_PASSWORD);
    const deleted = deleteSecret(store, VAULT_ID, 'TOKEN');
    expect(deleted).toBe(true);
    const result = await getSecret(store, VAULT_ID, 'TOKEN', MASTER_PASSWORD);
    expect(result).toBeNull();
  });

  it('should return false when deleting non-existent secret', () => {
    const deleted = deleteSecret(store, VAULT_ID, 'GHOST');
    expect(deleted).toBe(false);
  });

  it('should list secrets for a vault without exposing values', async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: 'KEY_A', value: 'val-a', actorId: ACTOR_ID }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: VAULT_ID, key: 'KEY_B', value: 'val-b', actorId: ACTOR_ID }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: 'other-vault', key: 'KEY_C', value: 'val-c', actorId: ACTOR_ID }, MASTER_PASSWORD);
    const list = listSecrets(store, VAULT_ID);
    expect(list).toHaveLength(2);
    expect(list.map(s => s.key)).toContain('KEY_A');
    expect(list.map(s => s.key)).toContain('KEY_B');
    expect(list.every(s => !('value' in s))).toBe(true);
  });

  it('should fail to decrypt with wrong password', async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: 'SECRET', value: 'hidden', actorId: ACTOR_ID }, MASTER_PASSWORD);
    await expect(getSecret(store, VAULT_ID, 'SECRET', 'wrong-password')).rejects.toThrow();
  });
});
