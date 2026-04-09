import { createAccessStore, grantAccess, checkAccess, revokeAccess } from './access';
import { createAuditLog, recordEvent } from '../audit/audit';
import { AuditAction } from '../audit/audit.types';

describe('access + audit integration', () => {
  it('records audit event when granting access', () => {
    const store = createAccessStore();
    const audit = createAuditLog();
    const vaultId = 'vault-42';
    const actorId = 'user-10';

    grantAccess(store, { vaultId, actorId, permission: 'write', grantedBy: 'admin-1' });
    recordEvent(audit, {
      actor: 'admin-1',
      action: 'grant_access' as AuditAction,
      vaultId,
      metadata: { targetActor: actorId, permission: 'write' },
    });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0].actor).toBe('admin-1');
  });

  it('records audit event when revoking access', () => {
    const store = createAccessStore();
    const audit = createAuditLog();
    const vaultId = 'vault-42';
    const actorId = 'user-10';

    grantAccess(store, { vaultId, actorId, permission: 'read', grantedBy: 'admin-1' });
    revokeAccess(store, vaultId, actorId);
    recordEvent(audit, {
      actor: 'admin-1',
      action: 'revoke_access' as AuditAction,
      vaultId,
      metadata: { targetActor: actorId },
    });

    const result = checkAccess(store, vaultId, actorId, 'read');
    expect(result.allowed).toBe(false);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0].action).toBe('revoke_access');
  });

  it('denies access after expiry and logs check', () => {
    const store = createAccessStore();
    const audit = createAuditLog();
    const vaultId = 'vault-99';
    const actorId = 'temp-user';

    grantAccess(store, {
      vaultId,
      actorId,
      permission: 'read',
      grantedBy: 'admin-1',
      expiresAt: new Date(Date.now() - 5000),
    });

    const result = checkAccess(store, vaultId, actorId, 'read');
    recordEvent(audit, {
      actor: actorId,
      action: 'access_denied' as AuditAction,
      vaultId,
      metadata: { reason: result.reason },
    });

    expect(result.allowed).toBe(false);
    expect(audit.entries[0].metadata?.reason).toMatch(/expired/);
  });
});
