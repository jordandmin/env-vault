import {
  createSnapshotStore,
  createSnapshot,
  listSnapshotsForVault,
  restoreSnapshot,
  deleteSnapshot,
} from './snapshot';
import { SnapshotEntry } from './snapshot.types';

describe('snapshot integration', () => {
  it('full lifecycle: create, list, restore, delete', () => {
    const store = createSnapshotStore();
    const vaultId = 'vault-prod';
    const actor = 'ops-bot';

    const entries: SnapshotEntry[] = [
      { key: 'SECRET_A', encryptedValue: 'enc:aaaa' },
      { key: 'SECRET_B', encryptedValue: 'enc:bbbb' },
      { key: 'SECRET_C', encryptedValue: 'enc:cccc' },
    ];

    const snap = createSnapshot(store, vaultId, actor, entries, 'v1.0-release');
    expect(snap.secretCount).toBe(3);

    const list = listSnapshotsForVault(store, vaultId);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('v1.0-release');

    const restored = restoreSnapshot(store, snap.id);
    expect(restored).toBeDefined();
    expect(restored!.entries.map(e => e.key)).toEqual(
      expect.arrayContaining(['SECRET_A', 'SECRET_B', 'SECRET_C'])
    );

    deleteSnapshot(store, snap.id);
    expect(listSnapshotsForVault(store, vaultId)).toHaveLength(0);
  });

  it('checksum differs for different entry sets', () => {
    const store = createSnapshotStore();
    const s1 = createSnapshot(store, 'v', 'u', [{ key: 'K', encryptedValue: 'enc:1' }]);
    const s2 = createSnapshot(store, 'v', 'u', [{ key: 'K', encryptedValue: 'enc:2' }]);
    expect(s1.checksum).not.toBe(s2.checksum);
  });

  it('multiple vaults are isolated', () => {
    const store = createSnapshotStore();
    createSnapshot(store, 'vault-a', 'user', [{ key: 'X', encryptedValue: 'enc:x' }]);
    createSnapshot(store, 'vault-b', 'user', [{ key: 'Y', encryptedValue: 'enc:y' }]);
    expect(listSnapshotsForVault(store, 'vault-a')).toHaveLength(1);
    expect(listSnapshotsForVault(store, 'vault-b')).toHaveLength(1);
  });
});
