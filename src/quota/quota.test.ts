import {
  createQuotaStore,
  setPolicy,
  getPolicyForScope,
  recordUsage,
  checkSecretQuota,
  checkVersionQuota,
  checkBackupQuota,
} from './quota';

describe('quota', () => {
  const scopeId = 'vault-abc';

  describe('setPolicy', () => {
    it('creates a new policy', () => {
      const store = createQuotaStore();
      const policy = setPolicy(store, 'vault', scopeId, {
        maxSecrets: 10,
        maxVersionsPerSecret: 5,
        maxBackups: 3,
      });
      expect(policy.scopeId).toBe(scopeId);
      expect(policy.maxSecrets).toBe(10);
      expect(policy.scope).toBe('vault');
    });

    it('updates existing policy preserving createdAt', () => {
      const store = createQuotaStore();
      const first = setPolicy(store, 'vault', scopeId, { maxSecrets: 10, maxVersionsPerSecret: 5, maxBackups: 3 });
      const second = setPolicy(store, 'vault', scopeId, { maxSecrets: 20, maxVersionsPerSecret: 5, maxBackups: 3 });
      expect(second.id).toBe(first.id);
      expect(second.createdAt).toBe(first.createdAt);
      expect(second.maxSecrets).toBe(20);
    });
  });

  describe('getPolicyForScope', () => {
    it('returns undefined when no policy exists', () => {
      const store = createQuotaStore();
      expect(getPolicyForScope(store, 'missing')).toBeUndefined();
    });

    it('returns the policy after it is set', () => {
      const store = createQuotaStore();
      setPolicy(store, 'actor', scopeId, { maxSecrets: 5, maxVersionsPerSecret: 2, maxBackups: 1 });
      expect(getPolicyForScope(store, scopeId)).toBeDefined();
    });
  });

  describe('checkSecretQuota', () => {
    it('allows when no policy is set', () => {
      const store = createQuotaStore();
      expect(checkSecretQuota(store, scopeId).allowed).toBe(true);
    });

    it('allows when under the limit', () => {
      const store = createQuotaStore();
      setPolicy(store, 'vault', scopeId, { maxSecrets: 10, maxVersionsPerSecret: 5, maxBackups: 3 });
      recordUsage(store, scopeId, { secretCount: 5, versionCount: 0, backupCount: 0 });
      const result = checkSecretQuota(store, scopeId);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
    });

    it('denies when at or over the limit', () => {
      const store = createQuotaStore();
      setPolicy(store, 'vault', scopeId, { maxSecrets: 3, maxVersionsPerSecret: 5, maxBackups: 3 });
      recordUsage(store, scopeId, { secretCount: 3, versionCount: 0, backupCount: 0 });
      const result = checkSecretQuota(store, scopeId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/quota exceeded/);
    });
  });

  describe('checkVersionQuota', () => {
    it('denies when version count meets limit', () => {
      const store = createQuotaStore();
      setPolicy(store, 'vault', scopeId, { maxSecrets: 10, maxVersionsPerSecret: 2, maxBackups: 3 });
      recordUsage(store, scopeId, { secretCount: 1, versionCount: 2, backupCount: 0 });
      expect(checkVersionQuota(store, scopeId).allowed).toBe(false);
    });
  });

  describe('checkBackupQuota', () => {
    it('allows when backup count is under limit', () => {
      const store = createQuotaStore();
      setPolicy(store, 'vault', scopeId, { maxSecrets: 10, maxVersionsPerSecret: 5, maxBackups: 5 });
      recordUsage(store, scopeId, { secretCount: 0, versionCount: 0, backupCount: 2 });
      expect(checkBackupQuota(store, scopeId).allowed).toBe(true);
    });
  });
});
