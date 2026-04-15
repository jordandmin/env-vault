export type SnapshotStatus = 'pending' | 'complete' | 'failed';

export interface Snapshot {
  id: string;
  vaultId: string;
  createdAt: number;
  createdBy: string;
  status: SnapshotStatus;
  secretCount: number;
  checksum: string;
  label?: string;
}

export interface SnapshotEntry {
  key: string;
  encryptedValue: string;
  metadata?: Record<string, string>;
}

export interface SnapshotStore {
  snapshots: Map<string, Snapshot>;
  entries: Map<string, SnapshotEntry[]>;
}
