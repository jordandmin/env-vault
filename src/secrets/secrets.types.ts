export type SecretValue = string;

export interface Secret {
  id: string;
  vaultId: string;
  key: string;
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

export interface SecretStore {
  secrets: Map<string, Secret>;
}

export interface CreateSecretInput {
  vaultId: string;
  key: string;
  value: SecretValue;
  actorId: string;
}

export interface UpdateSecretInput {
  vaultId: string;
  key: string;
  value: SecretValue;
  actorId: string;
}

export interface SecretResult {
  id: string;
  vaultId: string;
  key: string;
  value: SecretValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
