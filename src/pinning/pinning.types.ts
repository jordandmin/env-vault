export type PinScope = 'vault' | 'secret';

export interface PinPolicy {
  id: string;
  vaultId: string;
  scope: PinScope;
  secretKey?: string;
  pinnedVersion: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
}

export interface PinStore {
  policies: Map<string, PinPolicy>;
}
