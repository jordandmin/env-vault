import {
  createTtlStore,
  setTtlPolicy,
  getTtlPolicy,
  removeTtlPolicy,
  isExpired,
  getExpiredPolicies,
  purgeExpired,
} from './ttl';

describe('ttl', () => {
  const vaultId = 'vault-1';
  const secretKey = 'DB_PASSWORD';
  const createdBy = 'user-1';

  it('creates a ttl store', () => {
    const store = createTtlStore();
    expect(store.policies).toBeInstanceOf(Map);
    expect(store.policies.size).toBe(0);
  });

  it('sets and retrieves a ttl policy', () => {
    const store = createTtlStore();
    const policy = setTtlPolicy(store, { vaultId, secretKey, ttlMs: 60000, createdBy });
    expect(policy.vaultId).toBe(vaultId);
    expect(policy.secretKey).toBe(secretKey);
    expect(policy.expiresAt).toBeGreaterThan(Date.now());

    const found = getTtlPolicy(store, vaultId, secretKey);
    expect(found).toBeDefined();
    expect(found?.id).toBe(policy.id);
  });

  it('returns undefined for missing policy', () => {
    const store = createTtlStore();
    expect(getTtlPolicy(store, vaultId, 'MISSING_KEY')).toBeUndefined();
  });

  it('removes a ttl policy', () => {
    const store = createTtlStore();
    setTtlPolicy(store, { vaultId, secretKey, ttlMs: 60000, createdBy });
    const removed = removeTtlPolicy(store, vaultId, secretKey);
    expect(removed).toBe(true);
    expect(getTtlPolicy(store, vaultId, secretKey)).toBeUndefined();
  });

  it('isExpired returns false for future expiry', () => {
    const store = createTtlStore();
    setTtlPolicy(store, { vaultId, secretKey, ttlMs: 60000, createdBy });
    expect(isExpired(store, vaultId, secretKey)).toBe(false);
  });

  it('isExpired returns true for past expiry', () => {
    const store = createTtlStore();
    setTtlPolicy(store, { vaultId, secretKey, ttlMs: -1000, createdBy });
    expect(isExpired(store, vaultId, secretKey)).toBe(true);
  });

  it('isExpired returns false when no policy exists', () => {
    const store = createTtlStore();
    expect(isExpired(store, vaultId, 'NO_POLICY')).toBe(false);
  });

  it('getExpiredPolicies returns only expired entries', () => {
    const store = createTtlStore();
    setTtlPolicy(store, { vaultId, secretKey: 'KEY_A', ttlMs: -500, createdBy });
    setTtlPolicy(store, { vaultId, secretKey: 'KEY_B', ttlMs: 60000, createdBy });
    const expired = getExpiredPolicies(store);
    expect(expired).toHaveLength(1);
    expect(expired[0].secretKey).toBe('KEY_A');
  });

  it('purgeExpired removes expired policies and returns them', () => {
    const store = createTtlStore();
    setTtlPolicy(store, { vaultId, secretKey: 'KEY_A', ttlMs: -500, createdBy });
    setTtlPolicy(store, { vaultId, secretKey: 'KEY_B', ttlMs: 60000, createdBy });
    const purged = purgeExpired(store);
    expect(purged).toHaveLength(1);
    expect(store.policies.size).toBe(1);
    expect(getTtlPolicy(store, vaultId, 'KEY_A')).toBeUndefined();
    expect(getTtlPolicy(store, vaultId, 'KEY_B')).toBeDefined();
  });
});
