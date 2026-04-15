import {
  createGeoStore,
  setGeoPolicy,
  getGeoPolicy,
  checkGeoAccess,
  removeGeoPolicy,
} from './geo';
import { GeoStore } from './geo.types';

describe('geo', () => {
  let store: GeoStore;

  beforeEach(() => {
    store = createGeoStore();
  });

  it('allows access when no policy is configured', () => {
    const result = checkGeoAccess(store, 'vault-1', 'us-east');
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('no policy');
  });

  it('sets and retrieves a geo policy', () => {
    setGeoPolicy(store, 'vault-1', ['us-east', 'us-west'], [], 'deny');
    const policy = getGeoPolicy(store, 'vault-1');
    expect(policy).toBeDefined();
    expect(policy?.allowedRegions).toContain('us-east');
    expect(policy?.fallbackBehavior).toBe('deny');
  });

  it('allows access for region in allowlist', () => {
    setGeoPolicy(store, 'vault-1', ['eu-west'], [], 'deny');
    const result = checkGeoAccess(store, 'vault-1', 'eu-west');
    expect(result.allowed).toBe(true);
  });

  it('denies access for region not in allowlist', () => {
    setGeoPolicy(store, 'vault-1', ['eu-west'], [], 'deny');
    const result = checkGeoAccess(store, 'vault-1', 'us-east');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in allowlist');
  });

  it('denies access for explicitly denied region', () => {
    setGeoPolicy(store, 'vault-1', [], ['ap-southeast'], 'allow');
    const result = checkGeoAccess(store, 'vault-1', 'ap-southeast');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('explicitly denied');
  });

  it('applies fallback behavior for unknown region', () => {
    setGeoPolicy(store, 'vault-1', ['us-east'], [], 'allow');
    const result = checkGeoAccess(store, 'vault-1', null);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('fallback');
  });

  it('preserves createdAt on policy update', () => {
    setGeoPolicy(store, 'vault-1', ['us-east'], [], 'deny');
    const first = getGeoPolicy(store, 'vault-1')!;
    setGeoPolicy(store, 'vault-1', ['eu-west'], [], 'allow');
    const second = getGeoPolicy(store, 'vault-1')!;
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.allowedRegions).toContain('eu-west');
  });

  it('removes a geo policy', () => {
    setGeoPolicy(store, 'vault-1', ['us-east'], [], 'deny');
    const removed = removeGeoPolicy(store, 'vault-1');
    expect(removed).toBe(true);
    expect(getGeoPolicy(store, 'vault-1')).toBeUndefined();
  });

  it('returns false when removing non-existent policy', () => {
    expect(removeGeoPolicy(store, 'vault-none')).toBe(false);
  });
});
