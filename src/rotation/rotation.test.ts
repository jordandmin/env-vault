import {
  createRotationStore,
  createRotationPolicy,
  getPolicyForVault,
  startRotation,
  completeRotation,
  failRotation,
  getRotationHistory,
  getPoliciesDueForRotation,
} from './rotation';

describe('rotation', () => {
  it('creates a rotation store', () => {
    const store = createRotationStore();
    expect(store.policies.size).toBe(0);
    expect(store.records.size).toBe(0);
  });

  it('creates a rotation policy', () => {
    const store = createRotationStore();
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    expect(policy.vaultId).toBe('vault-1');
    expect(policy.intervalDays).toBe(30);
    expect(policy.createdBy).toBe('alice');
    expect(policy.lastRotatedAt).toBeNull();
    expect(store.policies.size).toBe(1);
  });

  it('retrieves policy for vault', () => {
    const store = createRotationStore();
    createRotationPolicy(store, 'vault-1', 30, 'alice');
    const found = getPolicyForVault(store, 'vault-1');
    expect(found).toBeDefined();
    expect(found?.vaultId).toBe('vault-1');
  });

  it('returns undefined for missing vault policy', () => {
    const store = createRotationStore();
    expect(getPolicyForVault(store, 'no-vault')).toBeUndefined();
  });

  it('starts a rotation record', () => {
    const store = createRotationStore();
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    const record = startRotation(store, 'vault-1', policy.id, 'alice');
    expect(record.status).toBe('in_progress');
    expect(record.triggeredBy).toBe('alice');
    expect(store.records.size).toBe(1);
  });

  it('completes a rotation and updates policy timestamps', () => {
    const store = createRotationStore();
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    const record = startRotation(store, 'vault-1', policy.id, 'alice');
    const completed = completeRotation(store, record.id, ['SECRET_A', 'SECRET_B']);
    expect(completed.status).toBe('completed');
    expect(completed.rotatedSecretKeys).toEqual(['SECRET_A', 'SECRET_B']);
    const updatedPolicy = store.policies.get(policy.id)!;
    expect(updatedPolicy.lastRotatedAt).not.toBeNull();
  });

  it('fails a rotation with an error', () => {
    const store = createRotationStore();
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    const record = startRotation(store, 'vault-1', policy.id, 'alice');
    const failed = failRotation(store, record.id, 'Key unavailable');
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Key unavailable');
  });

  it('throws when completing unknown record', () => {
    const store = createRotationStore();
    expect(() => completeRotation(store, 'bad-id', [])).toThrow();
  });

  it('returns rotation history sorted by startedAt desc', () => {
    const store = createRotationStore();
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    const r1 = startRotation(store, 'vault-1', policy.id, 'alice');
    const r2 = startRotation(store, 'vault-1', policy.id, 'bob');
    const history = getRotationHistory(store, 'vault-1');
    expect(history[0].id).toBe(r2.id);
    expect(history[1].id).toBe(r1.id);
  });

  it('finds policies due for rotation', () => {
    const store = createRotationStore();
    const past = Date.now() - 1000;
    const policy = createRotationPolicy(store, 'vault-1', 30, 'alice');
    store.policies.set(policy.id, { ...policy, nextRotationAt: past });
    const due = getPoliciesDueForRotation(store);
    expect(due.length).toBe(1);
  });
});
