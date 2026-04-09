export type Permission = 'read' | 'write' | 'admin';

export interface AccessPolicy {
  vaultId: string;
  actorId: string;
  permission: Permission;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  policy?: AccessPolicy;
}

export interface AccessStore {
  policies: Map<string, AccessPolicy[]>;
}

export type AccessAction = 'read' | 'write' | 'delete' | 'share' | 'admin';

const PERMISSION_ACTIONS: Record<Permission, AccessAction[]> = {
  read: ['read'],
  write: ['read', 'write', 'delete'],
  admin: ['read', 'write', 'delete', 'share', 'admin'],
};

export { PERMISSION_ACTIONS };
