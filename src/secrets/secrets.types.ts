export type SecretValue = string;

export type SecretMetadata = {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  tags?: Record<string, string>;
};

export type Secret = {
  id: string;
  vaultId: string;
  key: string;
  encryptedValue: string;
  metadata: SecretMetadata;
};

export type CreateSecretInput = {
  vaultId: string;
  key: string;
  value: SecretValue;
  createdBy: string;
  tags?: Record<string, string>;
};

export type UpdateSecretInput = {
  value: SecretValue;
  updatedBy: string;
  tags?: Record<string, string>;
};

export type SecretStore = {
  secrets: Map<string, Secret>;
};

export type GetSecretResult =
  | { found: true; secret: Secret }
  | { found: false };
