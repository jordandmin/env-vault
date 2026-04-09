import {
  createAccessStore,
  grantAccess,
  revokeAccess,
  checkAccess,
  getPoliciesForVault,
  getActorPermission,
} from './access';

describe('access control', () => {
  const vaultId = 'vault-1';
  const actorId = 'user-1';
  const grantedBy = 'admin-1';

  it('grants and retrieves access policies', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy });
    const policies = getPoliciesForVault(store, vaultId);
    expect(policies).toHaveLength(1);
    expect(policies[0].permission).toBe('read');
  });

  it('overwrites existing policy for same actor', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy });
    grantAccess(store, { vaultId, actorId, permission: 'write', grantedBy });
    expect(getPoliciesForVault(store, vaultId)).toHaveLength(1);
    expect(getActorPermission(store, vaultId, actorId)).toBe('write');
  });

  it('allows read action for read permission', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy });
    const result = checkAccess(store, vaultId, actorId, 'read');
    expect(result.allowed).toBe(true);
  });

  it('denies write action for read permission', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy });
    const result = checkAccess(store, vaultId, actorId, 'write');
    expect(result.allowed).toBe(false);
  });

  it('allows all actions for admin permission', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'admin', grantedBy });
    for (const action of ['read', 'write', 'delete', 'share', 'admin'] as const) {
      expect(checkAccess(store, vaultId, actorId, action).allowed).toBe(true);
    }
  });

  it('denies access when policy is expired', () => {
    const store = createAccessStore();
    const expiresAt = new Date(Date.now() - 1000);
    grantAccess(store, { vaultId, actorId, permission: 'admin', grantedBy, expiresAt });
    const result = checkAccess(store, vaultId, actorId, 'read');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/expired/);
  });

  it('revokes access successfully', () => {
    const store = createAccessStore();
    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy });
    const revoked = revokeAccess(store, vaultId, actorId);
    expect(revoked).toBe(true);
    expect(checkAccess(store, vaultId, actorId, 'read').allowed).toBe(false);
  });

  it('returns false when revoking non-existent policy', () => {
    const store = createAccessStore();
    expect(revokeAccess(store, vaultId, 'unknown')).toBe(false);
  });
});
