export interface FingerprintPolicy {
  vaultId: string;
  fields: string[];        // secret keys to include in fingerprint
  algorithm: 'sha256' | 'sha512';
  includeMetadata: boolean;
}

export interface FingerprintRecord {
  id: string;
  vaultId: string;
  secretKey: string;
  fingerprint: string;     // hex digest
  algorithm: 'sha256' | 'sha512';
  computedAt: number;
}

export interface FingerprintStore {
  policies: Map<string, FingerprintPolicy>;      // vaultId -> policy
  records: Map<string, FingerprintRecord>;       // recordKey -> record
}
