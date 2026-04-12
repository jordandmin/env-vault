import {
  createLockoutStore,
  setPolicy,
  getPolicyForVault,
  recordFailedAttempt,
  checkLockout,
  clearLockout,
} from './lockout';

const VAULT = 'vault-1';
const ACTOR = 'actor-1';

function makeStore() {
  const store = createLockoutStore();
  setPolicy(store, {
    vaultId: VAULT,
    maxAttempts: 3,
    windowMs: 60_000,
    lockoutDurationMs: 300_000,
  });
  return store;
}

describe('lockout', () => {
  it('returns no_policy when vault has no policy', () => {
    const store = createLockoutStore();
    const result = checkLockout(store, VAULT, ACTOR);
    expect(result).toEqual({ allowed: false, reason: 'no_policy' });
  });

  it('allows access when no failed attempts recorded', () => {
    const store = makeStore();
    const result = checkLockout(store, VAULT, ACTOR);
    expect(result).toEqual({ allowed: true });
  });

  it('allows access below max attempts', () => {
    const store = makeStore();
    recordFailedAttempt(store, VAULT, ACTOR);
    recordFailedAttempt(store, VAULT, ACTOR);
    const result = checkLockout(store, VAULT, ACTOR);
    expect(result).toEqual({ allowed: true });
  });

  it('locks actor after reaching maxAttempts', () => {
    const store = makeStore();
    recordFailedAttempt(store, VAULT, ACTOR);
    recordFailedAttempt(store, VAULT, ACTOR);
    const record = recordFailedAttempt(store, VAULT, ACTOR);
    expect(record.lockedUntil).not.toBeNull();
    const result = checkLockout(store, VAULT, ACTOR);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('locked');
  });

  it('clearLockout removes the record', () => {
    const store = makeStore();
    recordFailedAttempt(store, VAULT, ACTOR);
    recordFailedAttempt(store, VAULT, ACTOR);
    recordFailedAttempt(store, VAULT, ACTOR);
    const cleared = clearLockout(store, VAULT, ACTOR);
    expect(cleared).toBe(true);
    expect(checkLockout(store, VAULT, ACTOR)).toEqual({ allowed: true });
  });

  it('getPolicyForVault returns the stored policy', () => {
    const store = makeStore();
    const policy = getPolicyForVault(store, VAULT);
    expect(policy?.maxAttempts).toBe(3);
    expect(policy?.lockoutDurationMs).toBe(300_000);
  });

  it('setPolicy updates an existing policy', () => {
    const store = makeStore();
    const updated = setPolicy(store, {
      vaultId: VAULT,
      maxAttempts: 5,
      windowMs: 30_000,
      lockoutDurationMs: 600_000,
    });
    expect(updated.maxAttempts).toBe(5);
    expect(getPolicyForVault(store, VAULT)?.maxAttempts).toBe(5);
  });
});
