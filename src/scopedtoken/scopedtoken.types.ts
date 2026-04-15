export type TokenScope = 'read' | 'write' | 'delete' | 'admin';

export interface ScopedTokenPolicy {
  vaultId: string;
  scopes: TokenScope[];
  expiresAt?: number;
  createdBy: string;
}

export interface ScopedToken {
  id: string;
  token: string;
  vaultId: string;
  scopes: TokenScope[];
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  revokedAt?: number;
  active: boolean;
}

export interface ScopedTokenStore {
  tokens: Map<string, ScopedToken>;
  byVault: Map<string, Set<string>>;
}
