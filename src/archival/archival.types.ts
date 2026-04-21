export type ArchivalStatus = 'active' | 'archived' | 'purged';

export interface ArchivalPolicy {
  vaultId: string;
  retentionDays: number;
  autoArchiveAfterDays: number;
  autoPurgeAfterDays?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ArchivalRecord {
  id: string;
  vaultId: string;
  secretKey: string;
  status: ArchivalStatus;
  archivedAt?: number;
  purgedAt?: number;
  archivedBy?: string;
  reason?: string;
  createdAt: number;
}

export interface ArchivalStore {
  policies: Map<string, ArchivalPolicy>;
  records: Map<string, ArchivalRecord>;
}
