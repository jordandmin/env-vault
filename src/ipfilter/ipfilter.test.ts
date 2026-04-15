import {
  createIpFilterStore,
  setIpFilterPolicy,
  getIpFilterPolicy,
  removeIpFilterPolicy,
  checkIpAccess,
} from './ipfilter';

describe('ipfilter', () => {
  it('returns allowed=true when no policy exists', () => {
    const store = createIpFilterStore();
    const result = checkIpAccess(store, 'vault-1', '10.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.policy).toBeNull();
  });

  it('sets and retrieves a policy', () => {
    const store = createIpFilterStore();
    const policy = setIpFilterPolicy(store, 'vault-1', 'allow', ['192.168.1.0/24']);
    expect(policy.vaultId).toBe('vault-1');
    expect(policy.action).toBe('allow');
    expect(getIpFilterPolicy(store, 'vault-1')).toEqual(policy);
  });

  it('allows IP within allowed CIDR range', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'allow', ['192.168.1.0/24']);
    const result = checkIpAccess(store, 'vault-1', '192.168.1.55');
    expect(result.allowed).toBe(true);
    expect(result.matchedRange).toBe('192.168.1.0/24');
  });

  it('denies IP outside allowed CIDR range', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'allow', ['192.168.1.0/24']);
    const result = checkIpAccess(store, 'vault-1', '10.0.0.1');
    expect(result.allowed).toBe(false);
    expect(result.matchedRange).toBeNull();
  });

  it('deny action blocks IP in listed range', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'deny', ['10.0.0.0/8']);
    const result = checkIpAccess(store, 'vault-1', '10.5.3.1');
    expect(result.allowed).toBe(false);
    expect(result.matchedRange).toBe('10.0.0.0/8');
  });

  it('deny action allows IP not in listed range', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'deny', ['10.0.0.0/8']);
    const result = checkIpAccess(store, 'vault-1', '172.16.0.1');
    expect(result.allowed).toBe(true);
  });

  it('matches exact IP without CIDR', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'allow', ['203.0.113.42']);
    expect(checkIpAccess(store, 'vault-1', '203.0.113.42').allowed).toBe(true);
    expect(checkIpAccess(store, 'vault-1', '203.0.113.43').allowed).toBe(false);
  });

  it('removes a policy', () => {
    const store = createIpFilterStore();
    setIpFilterPolicy(store, 'vault-1', 'allow', ['10.0.0.0/8']);
    expect(removeIpFilterPolicy(store, 'vault-1')).toBe(true);
    expect(getIpFilterPolicy(store, 'vault-1')).toBeNull();
    expect(removeIpFilterPolicy(store, 'vault-1')).toBe(false);
  });

  it('preserves createdAt on policy update', () => {
    const store = createIpFilterStore();
    const first = setIpFilterPolicy(store, 'vault-1', 'allow', ['10.0.0.0/8']);
    const second = setIpFilterPolicy(store, 'vault-1', 'deny', ['10.0.0.0/8']);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.action).toBe('deny');
  });
});
