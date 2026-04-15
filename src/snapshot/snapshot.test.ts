import {
  createSnapshotStore,
  createSnapshot,
  getSnapshot,
  getSnapshotEntries,
  listSnapshotsForVault,
  deleteSnapshot,
  restoreSnapshot,
} from './snapshot';
import { SnapshotEntry } from './snapshot.types';

const VAULT = 'vault-1';
const ACTOR = 'user-1';

const sampleEntries: SnapshotEntry[] = [
  { key: 'DB_URL', encryptedValue: 'enc:abc123' },
  { key: 'API_KEY', encryptedValue: 'enc:xyz789' },
];

describe('snapshot', () => {
  it('creates a snapshot with correct fields', () => {
    const store = createSnapshotStore();
    const snap = createSnapshot(store, VAULT, ACTOR, sampleEntries, 'before-deploy');
    expect(snap.vaultId).toBe(VAULT);
    expect(snap.createdBy).toBe(ACTOR);
    expect(snap.status).toBe('complete');
    expect(snap.secretCount).toBe(2);
    expect(snap.label).toBe('before-deploy');
    expect(snap.checksum).toBeTruthy();
  });

  it('retrieves snapshot by id', () => {
    const store = createSnapshotStore();
    const snap = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    expect(getSnapshot(store, snap.id)).toEqual(snap);
  });

  it('returns undefined for unknown snapshot', () => {
    const store = createSnapshotStore();
    expect(getSnapshot(store, 'no-such-id')).toBeUndefined();
  });

  it('retrieves entries for a snapshot', () => {
    const store = createSnapshotStore();
    const snap = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    const entries = getSnapshotEntries(store, snap.id);
    expect(entries).toHaveLength(2);
    expect(entries[0].key).toBe('DB_URL');
  });

  it('lists snapshots for a vault sorted newest first', () => {
    const store = createSnapshotStore();
    const s1 = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    const s2 = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    const list = listSnapshotsForVault(store, VAULT);
    expect(list[0].id).toBe(s2.id);
    expect(list[1].id).toBe(s1.id);
  });

  it('does not list snapshots from other vaults', () => {
    const store = createSnapshotStore();
    createSnapshot(store, 'other-vault', ACTOR, sampleEntries);
    expect(listSnapshotsForVault(store, VAULT)).toHaveLength(0);
  });

  it('deletes a snapshot', () => {
    const store = createSnapshotStore();
    const snap = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    expect(deleteSnapshot(store, snap.id)).toBe(true);
    expect(getSnapshot(store, snap.id)).toBeUndefined();
    expect(getSnapshotEntries(store, snap.id)).toHaveLength(0);
  });

  it('returns false when deleting non-existent snapshot', () => {
    const store = createSnapshotStore();
    expect(deleteSnapshot(store, 'ghost')).toBe(false);
  });

  it('restores a snapshot', () => {
    const store = createSnapshotStore();
    const snap = createSnapshot(store, VAULT, ACTOR, sampleEntries);
    const result = restoreSnapshot(store, snap.id);
    expect(result).toBeDefined();
    expect(result!.snapshot.id).toBe(snap.id);
    expect(result!.entries).toHaveLength(2);
  });

  it('returns undefined when restoring non-existent snapshot', () => {
    const store = createSnapshotStore();
    expect(restoreSnapshot(store, 'missing')).toBeUndefined();
  });
});
