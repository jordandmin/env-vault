import { randomBytes } from 'crypto';
import type { Permission, ShareToken, TeamMember, SharingStore } from './sharing.types';

export function createSharingStore(): SharingStore {
  return { members: {}, tokens: {} };
}

export function addMember(
  store: SharingStore,
  vaultId: string,
  member: Omit<TeamMember, 'addedAt'>
): TeamMember {
  const newMember: TeamMember = { ...member, addedAt: new Date() };
  if (!store.members[vaultId]) {
    store.members[vaultId] = [];
  }
  const existing = store.members[vaultId].find((m) => m.id === member.id);
  if (existing) {
    throw new Error(`Member ${member.email} already has access to vault ${vaultId}`);
  }
  store.members[vaultId].push(newMember);
  return newMember;
}

export function removeMember(
  store: SharingStore,
  vaultId: string,
  memberId: string
): void {
  if (!store.members[vaultId]) return;
  store.members[vaultId] = store.members[vaultId].filter((m) => m.id !== memberId);
}

export function getMembersForVault(
  store: SharingStore,
  vaultId: string
): TeamMember[] {
  return store.members[vaultId] ?? [];
}

export function updateMemberPermission(
  store: SharingStore,
  vaultId: string,
  memberId: string,
  permission: Permission
): TeamMember {
  const members = store.members[vaultId] ?? [];
  const member = members.find((m) => m.id === memberId);
  if (!member) {
    throw new Error(`Member ${memberId} not found in vault ${vaultId}`);
  }
  member.permission = permission;
  return member;
}

export function createShareToken(
  store: SharingStore,
  vaultId: string,
  grantedTo: string,
  grantedBy: string,
  permission: Permission,
  expiresInMs: number | null = null
): ShareToken {
  const token = randomBytes(32).toString('hex');
  const shareToken: ShareToken = {
    token,
    vaultId,
    grantedTo,
    grantedBy,
    permission,
    createdAt: new Date(),
    expiresAt: expiresInMs !== null ? new Date(Date.now() + expiresInMs) : null,
    revoked: false,
  };
  store.tokens[token] = shareToken;
  return shareToken;
}

export function revokeShareToken(store: SharingStore, token: string): void {
  if (!store.tokens[token]) {
    throw new Error(`Token not found`);
  }
  store.tokens[token].revoked = true;
}

export function validateShareToken(
  store: SharingStore,
  token: string
): ShareToken {
  const shareToken = store.tokens[token];
  if (!shareToken) throw new Error('Invalid token');
  if (shareToken.revoked) throw new Error('Token has been revoked');
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    throw new Error('Token has expired');
  }
  return shareToken;
}
