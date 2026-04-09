import {
  AccessPolicy,
  AccessStore,
  AccessCheckResult,
  AccessAction,
  Permission,
  PERMISSION_ACTIONS,
} from './access.types';

export function createAccessStore(): AccessStore {
  return { policies: new Map() };
}

export function grantAccess(
  store: AccessStore,
  policy: Omit<AccessPolicy, 'grantedAt'>
): AccessPolicy {
  const fullPolicy: AccessPolicy = { ...policy, grantedAt: new Date() };
  const existing = store.policies.get(policy.vaultId) ?? [];
  const filtered = existing.filter((p) => p.actorId !== policy.actorId);
  store.policies.set(policy.vaultId, [...filtered, fullPolicy]);
  return fullPolicy;
}

export function revokeAccess(
  store: AccessStore,
  vaultId: string,
  actorId: string
): boolean {
  const existing = store.policies.get(vaultId) ?? [];
  const filtered = existing.filter((p) => p.actorId !== actorId);
  if (filtered.length === existing.length) return false;
  store.policies.set(vaultId, filtered);
  return true;
}

export function checkAccess(
  store: AccessStore,
  vaultId: string,
  actorId: string,
  action: AccessAction
): AccessCheckResult {
  const policies = store.policies.get(vaultId) ?? [];
  const policy = policies.find((p) => p.actorId === actorId);

  if (!policy) {
    return { allowed: false, reason: 'No policy found for actor on this vault' };
  }

  if (policy.expiresAt && policy.expiresAt < new Date()) {
    return { allowed: false, reason: 'Access policy has expired', policy };
  }

  const allowedActions = PERMISSION_ACTIONS[policy.permission];
  if (!allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: `Permission '${policy.permission}' does not allow action '${action}'`,
      policy,
    };
  }

  return { allowed: true, reason: 'Access granted', policy };
}

export function getPoliciesForVault(
  store: AccessStore,
  vaultId: string
): AccessPolicy[] {
  return store.policies.get(vaultId) ?? [];
}

export function getActorPermission(
  store: AccessStore,
  vaultId: string,
  actorId: string
): Permission | null {
  const policies = store.policies.get(vaultId) ?? [];
  const policy = policies.find((p) => p.actorId === actorId);
  return policy?.permission ?? null;
}
