import {
  createDriftStore,
  setDriftPolicy,
  getDriftPolicy,
  recordDrift,
  resolveDrift,
  getDriftsForVault,
  hasDrift,
} from './drift';

describe('drift', () => {
  it('creates an empty store', () => {
    const store = createDriftStore();
    expect(store.policies.size).toBe(0);
    expect(store.entries.size).toBe(0);
  });

  it('sets and retrieves a drift policy', () => {
    const store = createDriftStore();
    const policy = setDriftPolicy(store, 'vault-1', {
      enabled: true,
      severity: 'high',
      autoResolve: false,
    });
    expect(policy.vaultId).toBe('vault-1');
    expect(policy.severity).toBe('high');
    const fetched = getDriftPolicy(store, 'vault-1');
    expect(fetched).toEqual(policy);
  });

  it('returns undefined for missing policy', () => {
    const store = createDriftStore();
    expect(getDriftPolicy(store, 'missing')).toBeUndefined();
  });

  it('records a drift entry', () => {
    const store = createDriftStore();
    const entry = recordDrift(store, 'vault-1', 'DB_PASS', 'hash-a', 'hash-b', 'critical');
    expect(entry.vaultId).toBe('vault-1');
    expect(entry.key).toBe('DB_PASS');
    expect(entry.severity).toBe('critical');
    expect(entry.resolvedAt).toBeUndefined();
    expect(store.entries.size).toBe(1);
  });

  it('uses policy severity when none provided', () => {
    const store = createDriftStore();
    setDriftPolicy(store, 'vault-2', { enabled: true, severity: 'low', autoResolve: true });
    const entry = recordDrift(store, 'vault-2', 'API_KEY', 'h1', 'h2');
    expect(entry.severity).toBe('low');
  });

  it('resolves a drift entry', () => {
    const store = createDriftStore();
    const entry = recordDrift(store, 'vault-1', 'SECRET', 'h1', 'h2', 'medium');
    const resolved = resolveDrift(store, entry.id);
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('returns undefined when resolving missing entry', () => {
    const store = createDriftStore();
    expect(resolveDrift(store, 'nonexistent')).toBeUndefined();
  });

  it('gets drifts for a vault', () => {
    const store = createDriftStore();
    recordDrift(store, 'vault-1', 'K1', 'h1', 'h2', 'low');
    recordDrift(store, 'vault-1', 'K2', 'h3', 'h4', 'high');
    recordDrift(store, 'vault-2', 'K3', 'h5', 'h6', 'low');
    expect(getDriftsForVault(store, 'vault-1')).toHaveLength(2);
    expect(getDriftsForVault(store, 'vault-2')).toHaveLength(1);
  });

  it('filters unresolved drifts only', () => {
    const store = createDriftStore();
    const e1 = recordDrift(store, 'vault-1', 'K1', 'h1', 'h2', 'low');
    recordDrift(store, 'vault-1', 'K2', 'h3', 'h4', 'high');
    resolveDrift(store, e1.id);
    expect(getDriftsForVault(store, 'vault-1', true)).toHaveLength(1);
  });

  it('detects active drift for a key', () => {
    const store = createDriftStore();
    recordDrift(store, 'vault-1', 'MY_KEY', 'h1', 'h2', 'medium');
    expect(hasDrift(store, 'vault-1', 'MY_KEY')).toBe(true);
    expect(hasDrift(store, 'vault-1', 'OTHER')).toBe(false);
  });

  it('hasDrift returns false after resolution', () => {
    const store = createDriftStore();
    const entry = recordDrift(store, 'vault-1', 'MY_KEY', 'h1', 'h2', 'medium');
    resolveDrift(store, entry.id);
    expect(hasDrift(store, 'vault-1', 'MY_KEY')).toBe(false);
  });
});
