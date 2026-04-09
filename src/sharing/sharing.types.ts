export type Permission = 'read' | 'write' | 'admin';

export interface TeamMember {
  id: string;
  email: string;
  permission: Permission;
  addedAt: Date;
  addedBy: string;
}

export interface ShareToken {
  token: string;
  vaultId: string;
  grantedTo: string;
  grantedBy: string;
  permission: Permission;
  createdAt: Date;
  expiresAt: Date | null;
  revoked: boolean;
}

export interface SharingStore {
  members: Record<string, TeamMember[]>;
  tokens: Record<string, ShareToken>;
}
