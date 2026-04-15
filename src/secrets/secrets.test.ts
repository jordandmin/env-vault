import {
  createSecretStore,
  setSecret,
  getSecret,
  deleteSecret,
  listSecrets,
  secretExists,
  bulkSetSecrets,
  makeStoreKey,
} from './secrets';

const VAULT_ID = 'vault-abc';
const ACTOR = 'user-1';

describe('createSecretStore', () => {
  it('creates an empty store', () => {
    const store = createSecretStore();
    expect(store.secrets.size).toBe(0);
  });
});

describe('makeStoreKey', () => {
  it('combines vaultId and name', () => {
    expect(makeStoreKey('v1', 'DB_URL')).toBe('v1:DB_URL');
  });
});

describe('setSecret', () => {
  it('stores a new secret with version 1', () => {
    const store = createSecretStore();
    const secret = setSecret(store, VAULT_ID, 'API_KEY', 'secret123', ACTOR);
    expect(secret.name).toBe('API_KEY');
    expect(secret.value).toBe('secret123');
    expect(secret.version).toBe(1);
    expect(secret.createdBy).toBe(ACTOR);
  });

  it('increments version on update', () => {
    const store = createSecretStore();
    setSecret(store, VAULT_ID, 'API_KEY', 'v1', ACTOR);
    const updated = setSecret(store, VAULT_ID, 'API_KEY', 'v2', 'user-2');
    expect(updated.version).toBe(2);
    expect(updated.updatedBy).toBe('user-2');
    expect(updated.createdBy).toBe(ACTOR);
  });

  it('stores metadata tags and description', () => {
    const store = createSecretStore();
    const secret = setSecret(store, VAULT_ID, 'DB_PASS', 'pass', ACTOR, {
      tags: ['db', 'prod'],
      description: 'Database password',
    });
    expect(secret.tags).toEqual(['db', 'prod']);
    expect(secret.description).toBe('Database password');
  });
});

describe('getSecret', () => {
  it('retrieves an existing secret', () => {
    const store = createSecretStore();
    setSecret(store, VAULT_ID, 'TOKEN', 'tok', ACTOR);
    const s = getSecret(store, VAULT_ID, 'TOKEN');
    expect(s?.value).toBe('tok');
  });

  it('returns undefined for missing secret', () => {
    const store = createSecretStore();
    expect(getSecret(store, VAULT_ID, 'MISSING')).toBeUndefined();
  });
});

describe('deleteSecret', () => {
  it('removes a secret and returns true', () => {
    const store = createSecretStore();
    setSecret(store, VAULT_ID, 'X', 'val', ACTOR);
    expect(deleteSecret(store, VAULT_ID, 'X')).toBe(true);
    expect(getSecret(store, VAULT_ID, 'X')).toBeUndefined();
  });

  it('returns false when secret does not exist', () => {
    const store = createSecretStore();
    expect(deleteSecret(store, VAULT_ID, 'NOPE')).toBe(false);
  });
});

describe('listSecrets', () => {
  it('lists only secrets for the given vault', () => {
    const store = createSecretStore();
    setSecret(store, VAULT_ID, 'A', '1', ACTOR);
    setSecret(store, VAULT_ID, 'B', '2', ACTOR);
    setSecret(store, 'other-vault', 'C', '3', ACTOR);
    const list = listSecrets(store, VAULT_ID);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name).sort()).toEqual(['A', 'B']);
  });

  it('returns an empty array when vault has no secrets', () => {
    const store = createSecretStore();
    expect(listSecrets(store, VAULT_ID)).toEqual([]);
  });
});

describe('secretExists', () => {
  it('returns true when secret exists', () => {
    const store = createSecretStore();
    setSecret(store, VAULT_ID, 'PRESENT', 'val', ACTOR);
    expect(secretExists(store, VAULT_ID, 'PRESENT')).toBe(true);
  });

  it('returns false when secret does not exist', () => {
    const store = createSecretStore();
    expect(secretExists(store, VAULT_ID, 'ABSENT')).toBe(false);
  });
});

describe('bulkSetSecrets', () => {
  it('sets multiple secrets at once', () => {
    const store = createSecretStore();
    bulkSetSecrets(store, VAULT_ID, { FOO: 'foo', BAR: 'bar' }, ACTOR);
    expect(getSecret(store, VAULT_ID, 'FOO')?.value).toBe('foo');
    expect(getSecret(store, VAULT_ID, 'BAR')?.value).toBe('bar');
  });

  it('returns the list of set secrets', () => {
    const store = createSecretStore();
    const results = bulkSetSecrets(store, VAULT_ID, { X: '1', Y: '2' }, ACTOR);
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.name).sort()).toEqual(['X', 'Y']);
  });
});
