import { describe, it, expect, beforeEach } from 'vitest';
import { createBackupStore, createBackup, restoreBackup, listBackups, deleteBackup } from './backup';
import { BackupStore } from './backup.types';
import { SecretStore } from '../secrets/secrets.types';

function makeSecretStore(): SecretStore {
  return {
    secrets: new Map([
      ['vault1:KEY_A', 'value_a'],
      ['vault1:KEY_B', 'value_b'],
      ['vault2:OTHER', 'other_value'],
    ]),
  };
}

describe('createBackupStore', () => {
  it('returns an empty store', () => {
    const store = createBackupStore();
    expect(store.backups.size).toBe(0);
  });
});

describe('createBackup', () => {
  let store: BackupStore;
  let secretStore: SecretStore;

  beforeEach(() => {
    store = createBackupStore();
    secretStore = makeSecretStore();
  });

  it('creates a json backup with correct metadata', async () => {
    const meta = await createBackup(store, secretStore, {
      vaultId: 'vault1',
      actorId: 'user1',
      format: 'json',
    });
    expect(meta.vaultId).toBe('vault1');
    expect(meta.format).toBe('json');
    expect(meta.secretCount).toBe(2);
    expect(meta.checksum).toBeTruthy();
    expect(store.backups.size).toBe(1);
  });

  it('creates an encrypted backup', async () => {
    const meta = await createBackup(store, secretStore, {
      vaultId: 'vault1',
      actorId: 'user1',
      format: 'encrypted',
      passphrase: 'secret-pass',
    });
    expect(meta.format).toBe('encrypted');
    expect(meta.secretCount).toBe(2);
  });

  it('throws when encrypted format missing passphrase', async () => {
    await expect(
      createBackup(store, secretStore, { vaultId: 'vault1', actorId: 'u', format: 'encrypted' })
    ).rejects.toThrow('Passphrase required');
  });
});

describe('restoreBackup', () => {
  it('restores json backup into secret store', async () => {
    const backupStore = createBackupStore();
    const source = makeSecretStore();
    const meta = await createBackup(backupStore, source, { vaultId: 'vault1', actorId: 'u', format: 'json' });

    const target: SecretStore = { secrets: new Map() };
    const count = await restoreBackup(backupStore, target, { backupId: meta.id, actorId: 'u' });
    expect(count).toBe(2);
    expect(target.secrets.get('vault1:KEY_A')).toBe('value_a');
  });

  it('restores encrypted backup with correct passphrase', async () => {
    const backupStore = createBackupStore();
    const source = makeSecretStore();
    const meta = await createBackup(backupStore, source, {
      vaultId: 'vault1', actorId: 'u', format: 'encrypted', passphrase: 'mypass',
    });
    const target: SecretStore = { secrets: new Map() };
    const count = await restoreBackup(backupStore, target, { backupId: meta.id, actorId: 'u', passphrase: 'mypass' });
    expect(count).toBe(2);
  });

  it('throws for unknown backup id', async () => {
    const backupStore = createBackupStore();
    const target: SecretStore = { secrets: new Map() };
    await expect(restoreBackup(backupStore, target, { backupId: 'nope', actorId: 'u' })).rejects.toThrow('Backup not found');
  });
});

describe('listBackups / deleteBackup', () => {
  it('lists backups for a vault sorted by date desc', async () => {
    const store = createBackupStore();
    const ss = makeSecretStore();
    await createBackup(store, ss, { vaultId: 'vault1', actorId: 'u', format: 'json' });
    await createBackup(store, ss, { vaultId: 'vault1', actorId: 'u', format: 'json' });
    const list = listBackups(store, 'vault1');
    expect(list).toHaveLength(2);
  });

  it('deleteBackup removes entry', async () => {
    const store = createBackupStore();
    const ss = makeSecretStore();
    const meta = await createBackup(store, ss, { vaultId: 'vault1', actorId: 'u', format: 'json' });
    expect(deleteBackup(store, meta.id)).toBe(true);
    expect(store.backups.size).toBe(0);
  });
});
