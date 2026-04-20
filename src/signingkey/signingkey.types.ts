export type SigningAlgorithm = 'HMAC-SHA256' | 'HMAC-SHA512';

export interface SigningKeyPolicy {
  vaultId: string;
  algorithm: SigningAlgorithm;
  rotationIntervalDays: number;
}

export interface SigningKey {
  id: string;
  vaultId: string;
  algorithm: SigningAlgorithm;
  secret: string;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  active: boolean;
}

export interface SigningKeyStore {
  keys: Map<string, SigningKey>;
  policies: Map<string, SigningKeyPolicy>;
}

export interface SignResult {
  keyId: string;
  signature: string;
  algorithm: SigningAlgorithm;
  signedAt: number;
}
