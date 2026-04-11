export type SecretVersion = {
  id: string;
  vaultId: string;
  secretKey: string;
  encryptedValue: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  note?: string;
};

export type VersionStore = {
  versions: Map<string, SecretVersion[]>;
};

export type CreateVersionInput = {
  vaultId: string;
  secretKey: string;
  encryptedValue: string;
  createdBy: string;
  note?: string;
};
