export type KeyAlgorithm = 'AES-256-GCM' | 'AES-128-GCM';

export type KeyStatus = 'active' | 'rotated' | 'revoked';

export interface VaultKey {
  id: string;
  vaultId: string;
  algorithm: KeyAlgorithm;
  status: KeyStatus;
  createdAt: Date;
  rotatedAt?: Date;
  revokedAt?: Date;
  createdBy: string;
  derivationSalt: string;
}

export interface KeyStore {
  keys: Map<string, VaultKey>;
}

export interface CreateKeyOptions {
  vaultId: string;
  algorithm?: KeyAlgorithm;
  createdBy: string;
}

export interface RotateKeyOptions {
  keyId: string;
  rotatedBy: string;
}
