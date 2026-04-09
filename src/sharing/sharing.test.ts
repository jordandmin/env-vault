import {
  createSharingStore,
  addMember,
  removeMember,
  getMembersForVault,
  updateMemberPermission,
  createShareToken,
  revokeShareToken,
  validateShareToken,
} from './sharing';

describe('sharing', () => {
  const vaultId = 'vault-1';
  const actorId = 'user-admin';

  describe('members', () => {
    it('adds a member to a vault', () => {
      const store = createSharingStore();
      const member = addMember(store, vaultId, {
        id: 'user-1',
        email: 'alice@example.com',
        permission: 'read',
        addedBy: actorId,
      });
      expect(member.email).toBe('alice@example.com');
      expect(getMembersForVault(store, vaultId)).toHaveLength(1);
    });

    it('throws when adding duplicate member', () => {
      const store = createSharingStore();
      const base = { id: 'user-1', email: 'alice@example.com', permission: 'read' as const, addedBy: actorId };
      addMember(store, vaultId, base);
      expect(() => addMember(store, vaultId, base)).toThrow();
    });

    it('removes a member', () => {
      const store = createSharingStore();
      addMember(store, vaultId, { id: 'user-1', email: 'alice@example.com', permission: 'read', addedBy: actorId });
      removeMember(store, vaultId, 'user-1');
      expect(getMembersForVault(store, vaultId)).toHaveLength(0);
    });

    it('updates member permission', () => {
      const store = createSharingStore();
      addMember(store, vaultId, { id: 'user-1', email: 'alice@example.com', permission: 'read', addedBy: actorId });
      const updated = updateMemberPermission(store, vaultId, 'user-1', 'write');
      expect(updated.permission).toBe('write');
    });

    it('throws when updating non-existent member', () => {
      const store = createSharingStore();
      expect(() => updateMemberPermission(store, vaultId, 'ghost', 'admin')).toThrow();
    });
  });

  describe('share tokens', () => {
    it('creates and validates a token', () => {
      const store = createSharingStore();
      const shareToken = createShareToken(store, vaultId, 'bob@example.com', actorId, 'read', 60_000);
      expect(shareToken.token).toHaveLength(64);
      const validated = validateShareToken(store, shareToken.token);
      expect(validated.vaultId).toBe(vaultId);
    });

    it('throws on revoked token', () => {
      const store = createSharingStore();
      const shareToken = createShareToken(store, vaultId, 'bob@example.com', actorId, 'read');
      revokeShareToken(store, shareToken.token);
      expect(() => validateShareToken(store, shareToken.token)).toThrow('revoked');
    });

    it('throws on expired token', () => {
      const store = createSharingStore();
      const shareToken = createShareToken(store, vaultId, 'bob@example.com', actorId, 'read', -1);
      expect(() => validateShareToken(store, shareToken.token)).toThrow('expired');
    });

    it('throws on unknown token', () => {
      const store = createSharingStore();
      expect(() => validateShareToken(store, 'bad-token')).toThrow('Invalid token');
    });
  });
});
