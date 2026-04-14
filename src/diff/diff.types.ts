export type DiffOperation = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
  key: string;
  operation: DiffOperation;
  oldValue?: string;
  newValue?: string;
}

export interface VaultDiff {
  vaultId: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  entries: DiffEntry[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

export interface DiffStore {
  diffs: Map<string, VaultDiff>;
}
