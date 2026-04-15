import { GeoStore, GeoPolicy, GeoRegion, GeoCheckResult } from './geo.types';

function now(): number {
  return Date.now();
}

export function createGeoStore(): GeoStore {
  return { policies: new Map() };
}

export function setGeoPolicy(
  store: GeoStore,
  vaultId: string,
  allowedRegions: GeoRegion[],
  denyRegions: GeoRegion[],
  fallbackBehavior: 'allow' | 'deny' = 'deny'
): GeoPolicy {
  const existing = store.policies.get(vaultId);
  const policy: GeoPolicy = {
    vaultId,
    allowedRegions,
    denyRegions,
    fallbackBehavior,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  store.policies.set(vaultId, policy);
  return policy;
}

export function getGeoPolicy(
  store: GeoStore,
  vaultId: string
): GeoPolicy | undefined {
  return store.policies.get(vaultId);
}

export function checkGeoAccess(
  store: GeoStore,
  vaultId: string,
  region: GeoRegion | null
): GeoCheckResult {
  const policy = store.policies.get(vaultId);

  if (!policy) {
    return { allowed: true, region, reason: 'no policy configured' };
  }

  if (region === null) {
    const allowed = policy.fallbackBehavior === 'allow';
    return { allowed, region: null, reason: 'region unknown, fallback applied' };
  }

  if (policy.denyRegions.includes(region)) {
    return { allowed: false, region, reason: `region '${region}' is explicitly denied` };
  }

  if (policy.allowedRegions.length > 0) {
    if (policy.allowedRegions.includes(region)) {
      return { allowed: true, region, reason: `region '${region}' is allowed` };
    }
    return { allowed: false, region, reason: `region '${region}' not in allowlist` };
  }

  const allowed = policy.fallbackBehavior === 'allow';
  return { allowed, region, reason: `fallback behavior applied: ${policy.fallbackBehavior}` };
}

export function removeGeoPolicy(store: GeoStore, vaultId: string): boolean {
  return store.policies.delete(vaultId);
}
