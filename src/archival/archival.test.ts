import {
  createArchivalStore,
  setArchivalPolicy,
  getArchivalPolicy,
  archiveSecret,
  purgeSecret,
  getRecordsForVault,
  applyAutoArchival,
} from './archival';

describe('archival', () => {
  it('creates an empty store', () => {
    const store = createArchivalStore();
    expect(store.policies.size).toBe(0);
    expect(store.records.size).toBe(0);
  });

  it('sets and retrieves an archival policy', () => {
    const store = createArchivalStore();
    const policy = setArchivalPolicy(store, 'vault-1', 90, 30, 180);
    expect(policy.vaultId).toBe('vault-1');
    expect(policy.retentionDays).toBe(90);
    expect(policy.autoArchiveAfterDays).toBe(30);
    expect(policy.autoPurgeAfterDays).toBe(180);
    const fetched = getArchivalPolicy(store, 'vault-1');
    expect(fetched).toEqual(policy);
  });

  it('returns undefined for missing policy', () => {
    const store = createArchivalStore();
    expect(getArchivalPolicy(store, 'no-vault')).toBeUndefined();
  });

  it('archives a secret and records it', () => {
    const store = createArchivalStore();
    const record = archiveSecret(store, 'vault-1', 'DB_PASSWORD', 'alice', 'rotation');
    expect(record.status).toBe('archived');
    expect(record.secretKey).toBe('DB_PASSWORD');
    expect(record.archivedBy).toBe('alice');
    expect(record.reason).toBe('rotation');
    expect(record.archivedAt).toBeDefined();
  });

  it('purges an archived record', () => {
    const store = createArchivalStore();
    const record = archiveSecret(store, 'vault-1', 'API_KEY');
    const purged = purgeSecret(store, record.id);
    expect(purged?.status).toBe('purged');
    expect(purged?.purgedAt).toBeDefined();
  });

  it('returns undefined when purging non-existent record', () => {
    const store = createArchivalStore();
    expect(purgeSecret(store, 'ghost-id')).toBeUndefined();
  });

  it('gets records for a vault filtered by status', () => {
    const store = createArchivalStore();
    const r1 = archiveSecret(store, 'vault-1', 'KEY_A');
    archiveSecret(store, 'vault-1', 'KEY_B');
    purgeSecret(store, r1.id);
    const archived = getRecordsForVault(store, 'vault-1', 'archived');
    expect(archived).toHaveLength(1);
    expect(archived[0].secretKey).toBe('KEY_B');
    const purged = getRecordsForVault(store, 'vault-1', 'purged');
    expect(purged).toHaveLength(1);
  });

  it('applies auto-archival when age exceeds policy threshold', () => {
    const store = createArchivalStore();
    setArchivalPolicy(store, 'vault-1', 90, 30);
    const oldCreatedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const record = applyAutoArchival(store, 'vault-1', 'OLD_KEY', oldCreatedAt);
    expect(record).not.toBeNull();
    expect(record?.status).toBe('archived');
    expect(record?.reason).toBe('auto-archival policy');
  });

  it('does not archive when age is below threshold', () => {
    const store = createArchivalStore();
    setArchivalPolicy(store, 'vault-1', 90, 30);
    const recentCreatedAt = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const record = applyAutoArchival(store, 'vault-1', 'NEW_KEY', recentCreatedAt);
    expect(record).toBeNull();
  });

  it('returns null for auto-archival when no policy exists', () => {
    const store = createArchivalStore();
    const result = applyAutoArchival(store, 'no-vault', 'KEY', Date.now() - 9999999);
    expect(result).toBeNull();
  });
});
