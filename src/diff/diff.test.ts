import {
  createDiffStore,
  diffSecrets,
  getDiff,
  getDiffsForVault,
  filterByOperation,
} from './diff';

const OLD = { DB_HOST: 'localhost', DB_PORT: '5432', API_KEY: 'old-key' };
const NEW = { DB_HOST: 'prod-host', DB_PORT: '5432', SECRET: 'new-secret' };

describe('createDiffStore', () => {
  it('creates an empty store', () => {
    const store = createDiffStore();
    expect(store.diffs.size).toBe(0);
  });
});

describe('diffSecrets', () => {
  it('detects added, removed, changed, and unchanged keys', () => {
    const store = createDiffStore();
    const diff = diffSecrets(store, 'v1', 'v1', 'v2', OLD, NEW);

    expect(diff.summary.added).toBe(1);    // SECRET
    expect(diff.summary.removed).toBe(1);  // API_KEY
    expect(diff.summary.changed).toBe(1);  // DB_HOST
    expect(diff.summary.unchanged).toBe(1); // DB_PORT
  });

  it('stores the diff in the store', () => {
    const store = createDiffStore();
    diffSecrets(store, 'v1', 'v1', 'v2', OLD, NEW);
    expect(store.diffs.size).toBe(1);
  });

  it('returns unchanged for identical secrets', () => {
    const store = createDiffStore();
    const diff = diffSecrets(store, 'v1', 'v1', 'v2', OLD, OLD);
    expect(diff.summary.unchanged).toBe(3);
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.changed).toBe(0);
  });

  it('includes correct old and new values', () => {
    const store = createDiffStore();
    const diff = diffSecrets(store, 'v1', 'v1', 'v2', OLD, NEW);
    const changed = diff.entries.find((e) => e.key === 'DB_HOST');
    expect(changed?.oldValue).toBe('localhost');
    expect(changed?.newValue).toBe('prod-host');
  });
});

describe('getDiff', () => {
  it('retrieves a stored diff', () => {
    const store = createDiffStore();
    diffSecrets(store, 'v1', 'v1', 'v2', OLD, NEW);
    const diff = getDiff(store, 'v1', 'v1', 'v2');
    expect(diff).toBeDefined();
    expect(diff?.vaultId).toBe('v1');
  });

  it('returns undefined for unknown diff', () => {
    const store = createDiffStore();
    expect(getDiff(store, 'v1', 'a', 'b')).toBeUndefined();
  });
});

describe('getDiffsForVault', () => {
  it('returns all diffs for a vault', () => {
    const store = createDiffStore();
    diffSecrets(store, 'vault-1', 'v1', 'v2', OLD, NEW);
    diffSecrets(store, 'vault-1', 'v2', 'v3', NEW, {});
    diffSecrets(store, 'vault-2', 'v1', 'v2', OLD, NEW);
    expect(getDiffsForVault(store, 'vault-1')).toHaveLength(2);
    expect(getDiffsForVault(store, 'vault-2')).toHaveLength(1);
  });
});

describe('filterByOperation', () => {
  it('filters entries by operation', () => {
    const store = createDiffStore();
    const diff = diffSecrets(store, 'v1', 'v1', 'v2', OLD, NEW);
    expect(filterByOperation(diff, 'added')).toHaveLength(1);
    expect(filterByOperation(diff, 'removed')).toHaveLength(1);
  });
});
