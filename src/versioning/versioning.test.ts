import {
  createVersionStore,
  recordVersion,
  getVersionHistory,
  getVersionById,
  getLatestVersion,
  pruneVersions,
} from './versioning';

const VAULT_ID = 'vault-1';
const SECRET_KEY = 'DB_PASSWORD';
const ACTOR = 'user-42';

describe('versioning', () => {
  it('creates an empty version store', () => {
    const store = createVersionStore();
    expect(store.versions.size).toBe(0);
  });

  it('records first version with version number 1', () => {
    const store = createVersionStore();
    const v = recordVersion(store, {
      vaultId: VAULT_ID,
      secretKey: SECRET_KEY,
      encryptedValue: 'enc-abc',
      createdBy: ACTOR,
    });
    expect(v.version).toBe(1);
    expect(v.vaultId).toBe(VAULT_ID);
    expect(v.secretKey).toBe(SECRET_KEY);
    expect(v.createdBy).toBe(ACTOR);
  });

  it('increments version number on subsequent records', () => {
    const store = createVersionStore();
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-1', createdBy: ACTOR });
    const v2 = recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-2', createdBy: ACTOR });
    expect(v2.version).toBe(2);
  });

  it('returns full version history in insertion order', () => {
    const store = createVersionStore();
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-1', createdBy: ACTOR });
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-2', createdBy: ACTOR });
    const history = getVersionHistory(store, VAULT_ID, SECRET_KEY);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });

  it('returns empty array for unknown key', () => {
    const store = createVersionStore();
    expect(getVersionHistory(store, VAULT_ID, 'MISSING')).toEqual([]);
  });

  it('retrieves a specific version by number', () => {
    const store = createVersionStore();
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-1', createdBy: ACTOR });
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-2', createdBy: ACTOR });
    const v = getVersionById(store, VAULT_ID, SECRET_KEY, 1);
    expect(v?.encryptedValue).toBe('enc-1');
  });

  it('returns undefined for a non-existent version number', () => {
    const store = createVersionStore();
    expect(getVersionById(store, VAULT_ID, SECRET_KEY, 99)).toBeUndefined();
  });

  it('returns the latest version', () => {
    const store = createVersionStore();
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-1', createdBy: ACTOR });
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-2', createdBy: ACTOR });
    recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: 'enc-3', createdBy: ACTOR });
    const latest = getLatestVersion(store, VAULT_ID, SECRET_KEY);
    expect(latest?.version).toBe(3);
  });

  it('prunes old versions keeping only the most recent N', () => {
    const store = createVersionStore();
    for (let i = 0; i < 5; i++) {
      recordVersion(store, { vaultId: VAULT_ID, secretKey: SECRET_KEY, encryptedValue: `enc-${i}`, createdBy: ACTOR });
    }
    pruneVersions(store, VAULT_ID, SECRET_KEY, 2);
    const history = getVersionHistory(store, VAULT_ID, SECRET_KEY);
    expect(history).toHaveLength(2);
    expect(history.every(v => v.version >= 4)).toBe(true);
  });
});
