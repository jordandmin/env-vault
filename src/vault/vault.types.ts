export interface VaultEntry {
  key: string;
  encryptedValue: string;
  salt: string;
  setBy: string;
  setAt: string;
}

export interface VaultMetadata {
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DerivedKeyResult {
  key: CryptoKey;
  salt: string;
}

export interface VaultExport {
  metadata: VaultMetadata;
  entries: Record<string, VaultEntry>;
}
