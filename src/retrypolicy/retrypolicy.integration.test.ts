import {
  createRetryStore,
  setPolicy,
  recordAttempt,
  shouldRetry,
  getAttemptsForOperation,
  computeDelay,
} from './retrypolicy';

describe('retrypolicy integration', () => {
  it('simulates a full retry lifecycle with exponential backoff', () => {
    const store = createRetryStore();
    const vaultId = 'vault-integration';
    const operation = 'fetchSecret';

    setPolicy(store, vaultId, {
      maxAttempts: 4,
      strategy: 'exponential',
      baseDelayMs: 50,
      maxDelayMs: 800,
      jitter: false,
    });

    const delays: number[] = [];
    let attempt = 1;

    while (shouldRetry(store, vaultId, operation) && attempt <= 4) {
      const policy = store.policies.get(vaultId)!;
      delays.push(computeDelay(policy, attempt));
      const success = attempt === 4;
      recordAttempt(store, vaultId, operation, attempt, {
        success,
        error: success ? undefined : `error-${attempt}`,
      });
      attempt++;
    }

    const attempts = getAttemptsForOperation(store, vaultId, operation);
    expect(attempts).toHaveLength(4);
    expect(attempts[3].succeededAt).toBeDefined();
    expect(delays[0]).toBe(50);
    expect(delays[1]).toBe(100);
    expect(delays[2]).toBe(200);
    expect(delays[3]).toBe(400);
  });

  it('does not retry after exhausting maxAttempts', () => {
    const store = createRetryStore();
    const vaultId = 'vault-exhaust';
    const operation = 'writeSecret';

    setPolicy(store, vaultId, {
      maxAttempts: 2,
      strategy: 'linear',
      baseDelayMs: 100,
      maxDelayMs: 1000,
    });

    recordAttempt(store, vaultId, operation, 1, { success: false, error: 'network' });
    recordAttempt(store, vaultId, operation, 2, { success: false, error: 'timeout' });

    expect(shouldRetry(store, vaultId, operation)).toBe(false);
    const attempts = getAttemptsForOperation(store, vaultId, operation);
    expect(attempts.every((a) => a.failedAt !== undefined)).toBe(true);
  });
});
