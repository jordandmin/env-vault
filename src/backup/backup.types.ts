export type BackupFormat = 'json' | 'encrypted';

export interface BackupMetadata {
  id: string;
  vaultId: string;
  createdAt: Date;
  createdBy: string;
  format: BackupFormat;
  secretCount: number;
  checksum: string;
}

export interface BackupEntry {
  metadata: BackupMetadata;
  payload: string; // serialized secrets (possibly encrypted)
}

export interface BackupStore {
  backups: Map<string, BackupEntry>;
}

export interface CreateBackupOptions {
  vaultId: string;
  actorId: string;
  format: BackupFormat;
  passphrase?: string; // required when format === 'encrypted'
}

export interface RestoreBackupOptions {
  backupId: string;
  actorId: string;
  passphrase?: string;
}
