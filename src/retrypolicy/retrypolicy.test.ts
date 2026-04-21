import {
  createRetryStore,
  setPolicy,
  getPolicyForVault,
  computeDelay,
  recordAttempt,
  getAttemptsForOperation,
  shouldRetry,
} from './retrypolicy';

describe('retrypolicy', () => {
  const vaultId = 'vault-1';

  it('sets and retrieves a policy', () => {
    const store = createRetryStore();
    const policy = setPolicy(store, vaultId, {
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 100,
      maxDelayMs: 5000,
    });
    expect(policy.vaultId).toBe(vaultId);
    expect(policy.strategy).toBe('exponential');
    expect(getPolicyForVault(store, vaultId)).toBe(policy);
  });

  it('updating policy preserves id and createdAt', () => {
    const store = createRetryStore();
    const p1 = setPolicy(store, vaultId, { maxAttempts: 3, strategy: 'fixed', baseDelayMs: 50, maxDelayMs: 500 });
    const p2 = setPolicy(store, vaultId, { maxAttempts: 5, strategy: 'linear', baseDelayMs: 100, maxDelayMs: 1000 });
    expect(p2.id).toBe(p1.id);
    expect(p2.createdAt).toBe(p1.createdAt);
    expect(p2.maxAttempts).toBe(5);
  });

  it('computes fixed delay', () => {
    const store = createRetryStore();
    const policy = setPolicy(store, vaultId, { maxAttempts: 3, strategy: 'fixed', baseDelayMs: 200, maxDelayMs: 5000 });
    expect(computeDelay(policy, 1)).toBe(200);
    expect(computeDelay(policy, 3)).toBe(200);
  });

  it('computes linear delay', () => {
    const store = createRetryStore();
    const policy = setPolicy(store, vaultId, { maxAttempts: 3, strategy: 'linear', baseDelayMs: 100, maxDelayMs: 5000 });
    expect(computeDelay(policy, 2)).toBe(200);
    expect(computeDelay(policy, 3)).toBe(300);
  });

  it('computes exponential delay and caps at maxDelayMs', () => {
    const store = createRetryStore();
    const policy = setPolicy(store, vaultId, { maxAttempts: 5, strategy: 'exponential', baseDelayMs: 100, maxDelayMs: 500 });
    expect(computeDelay(policy, 1)).toBe(100);
    expect(computeDelay(policy, 4)).toBe(500);
  });

  it('records attempts and retrieves them', () => {
    const store = createRetryStore();
    setPolicy(store, vaultId, { maxAttempts: 3, strategy: 'fixed', baseDelayMs: 100, maxDelayMs: 1000 });
    recordAttempt(store, vaultId, 'getSecret', 1, { success: false, error: 'timeout' });
    recordAttempt(store, vaultId, 'getSecret', 2, { success: true });
    const attempts = getAttemptsForOperation(store, vaultId, 'getSecret');
    expect(attempts).toHaveLength(2);
    expect(attempts[0].error).toBe('timeout');
    expect(attempts[1].succeededAt).toBeDefined();
  });

  it('shouldRetry returns true when under maxAttempts', () => {
    const store = createRetryStore();
    setPolicy(store, vaultId, { maxAttempts: 3, strategy: 'fixed', baseDelayMs: 100, maxDelayMs: 1000 });
    recordAttempt(store, vaultId, 'op', 1, { success: false, error: 'err' });
    expect(shouldRetry(store, vaultId, 'op')).toBe(true);
  });

  it('shouldRetry returns false when maxAttempts exhausted', () => {
    const store = createRetryStore();
    setPolicy(store, vaultId, { maxAttempts: 2, strategy: 'fixed', baseDelayMs: 100, maxDelayMs: 1000 });
    recordAttempt(store, vaultId, 'op', 1, { success: false, error: 'e1' });
    recordAttempt(store, vaultId, 'op', 2, { success: false, error: 'e2' });
    expect(shouldRetry(store, vaultId, 'op')).toBe(false);
  });

  it('recordAttempt returns null when no policy exists', () => {
    const store = createRetryStore();
    const result = recordAttempt(store, 'no-vault', 'op', 1, { success: false });
    expect(result).toBeNull();
  });
});
