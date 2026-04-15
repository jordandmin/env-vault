import { SnapshotStore, Snapshot, SnapshotEntry, SnapshotStatus } from './snapshot.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

function computeChecksum(entries: SnapshotEntry[]): string {
  const raw = entries.map(e => `${e.key}:${e.encryptedValue}`).sort().join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function createSnapshotStore(): SnapshotStore {
  return { snapshots: new Map(), entries: new Map() };
}

export function createSnapshot(
  store: SnapshotStore,
  vaultId: string,
  createdBy: string,
  entries: SnapshotEntry[],
  label?: string
): Snapshot {
  const id = generateId();
  const checksum = computeChecksum(entries);
  const snapshot: Snapshot = {
    id,
    vaultId,
    createdAt: now(),
    createdBy,
    status: 'complete',
    secretCount: entries.length,
    checksum,
    label,
  };
  store.snapshots.set(id, snapshot);
  store.entries.set(id, entries);
  return snapshot;
}

export function getSnapshot(store: SnapshotStore, snapshotId: string): Snapshot | undefined {
  return store.snapshots.get(snapshotId);
}

export function getSnapshotEntries(store: SnapshotStore, snapshotId: string): SnapshotEntry[] {
  return store.entries.get(snapshotId) ?? [];
}

export function listSnapshotsForVault(store: SnapshotStore, vaultId: string): Snapshot[] {
  return Array.from(store.snapshots.values())
    .filter(s => s.vaultId === vaultId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteSnapshot(store: SnapshotStore, snapshotId: string): boolean {
  if (!store.snapshots.has(snapshotId)) return false;
  store.snapshots.delete(snapshotId);
  store.entries.delete(snapshotId);
  return true;
}

export function restoreSnapshot(
  store: SnapshotStore,
  snapshotId: string
): { entries: SnapshotEntry[]; snapshot: Snapshot } | undefined {
  const snapshot = store.snapshots.get(snapshotId);
  if (!snapshot) return undefined;
  const entries = store.entries.get(snapshotId) ?? [];
  return { snapshot, entries };
}
