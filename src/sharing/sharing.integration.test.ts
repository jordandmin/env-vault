import { createSharingStore, addMember, createShareToken, validateShareToken, revokeShareToken } from './sharing';
import { createAuditLog, recordEvent } from '../audit/audit';

describe('sharing + audit integration', () => {
  const vaultId = 'vault-42';
  const adminId = 'admin-user';

  it('records audit event when a member is added', () => {
    const store = createSharingStore();
    const auditLog = createAuditLog();

    const member = addMember(store, vaultId, {
      id: 'user-2',
      email: 'bob@example.com',
      permission: 'write',
      addedBy: adminId,
    });

    recordEvent(auditLog, {
      action: 'member_added',
      actor: adminId,
      resourceId: vaultId,
      metadata: { memberId: member.id, permission: member.permission },
    });

    const entries = auditLog.entries.filter((e) => e.action === 'member_added');
    expect(entries).toHaveLength(1);
    expect(entries[0].actor).toBe(adminId);
    expect(entries[0].metadata?.memberId).toBe('user-2');
  });

  it('records audit event when a share token is created and revoked', () => {
    const store = createSharingStore();
    const auditLog = createAuditLog();

    const shareToken = createShareToken(store, vaultId, 'carol@example.com', adminId, 'read', 3_600_000);

    recordEvent(auditLog, {
      action: 'share_token_created',
      actor: adminId,
      resourceId: vaultId,
      metadata: { token: shareToken.token, grantedTo: shareToken.grantedTo },
    });

    revokeShareToken(store, shareToken.token);

    recordEvent(auditLog, {
      action: 'share_token_revoked',
      actor: adminId,
      resourceId: vaultId,
      metadata: { token: shareToken.token },
    });

    expect(() => validateShareToken(store, shareToken.token)).toThrow('revoked');

    const revokeEntries = auditLog.entries.filter((e) => e.action === 'share_token_revoked');
    expect(revokeEntries).toHaveLength(1);
    expect(revokeEntries[0].metadata?.token).toBe(shareToken.token);
  });
});
