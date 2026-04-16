import { createPinStore, pinVersion, unpinVersion, getPinsForVault, getActivePin, resolveVersion } from './pinning';

describe('pinning', () => {
  it('pins a version at vault scope', () => {
    const store = createPinStore();
    const policy = pinVersion(store, 'v1', 'abc123', 'alice');
    expect(policy.vaultId).toBe('v1');
    expect(policy.pinnedVersion).toBe('abc123');
    expect(policy.scope).toBe('vault');
  });

  it('pins a version at secret scope', () => {
    const store = createPinStore();
    const policy = pinVersion(store, 'v1', 'def456', 'bob', { scope: 'secret', secretKey: 'DB_PASS' });
    expect(policy.scope).toBe('secret');
    expect(policy.secretKey).toBe('DB_PASS');
  });

  it('throws when secret scope missing secretKey', () => {
    const store = createPinStore();
    expect(() => pinVersion(store, 'v1', 'x', 'alice', { scope: 'secret' })).toThrow();
  });

  it('unpins a policy', () => {
    const store = createPinStore();
    const p = pinVersion(store, 'v1', 'abc', 'alice');
    expect(unpinVersion(store, p.id)).toBe(true);
    expect(getPinsForVault(store, 'v1')).toHaveLength(0);
  });

  it('returns pins for vault', () => {
    const store = createPinStore();
    pinVersion(store, 'v1', 'a', 'alice');
    pinVersion(store, 'v1', 'b', 'bob');
    pinVersion(store, 'v2', 'c', 'carol');
    expect(getPinsForVault(store, 'v1')).toHaveLength(2);
  });

  it('respects expiry in getActivePin', () => {
    const store = createPinStore();
    pinVersion(store, 'v1', 'old', 'alice', { expiresAt: Date.now() - 1000 });
    expect(getActivePin(store, 'v1')).toBeUndefined();
  });

  it('resolves pinned version over current', () => {
    const store = createPinStore();
    pinVersion(store, 'v1', 'pinned-ver', 'alice');
    expect(resolveVersion(store, 'v1', 'current-ver')).toBe('pinned-ver');
  });

  it('falls back to current version when no pin', () => {
    const store = createPinStore();
    expect(resolveVersion(store, 'v1', 'current-ver')).toBe('current-ver');
  });

  it('secret-scoped pin takes precedence', () => {
    const store = createPinStore();
    pinVersion(store, 'v1', 'vault-pin', 'alice');
    pinVersion(store, 'v1', 'secret-pin', 'alice', { scope: 'secret', secretKey: 'API_KEY' });
    expect(resolveVersion(store, 'v1', 'current', 'API_KEY')).toBe('secret-pin');
  });
});
