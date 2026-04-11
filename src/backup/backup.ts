import { createHash, randomUUID } from 'crypto';
import { BackupStore, BackupEntry, BackupMetadata, CreateBackupOptions, RestoreBackupOptions } from './backup.types';
import { SecretStore } from '../secrets/secrets.types';
import { encrypt, decrypt, serializePayload, deserializePayload, deriveKey } from '../crypto/encryption';

export function createBackupStore(): BackupStore {
  return { backups: new Map() };
}

function computeChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export async function createBackup(
  store: BackupStore,
  secretStore: SecretStore,
  options: CreateBackupOptions
): Promise<BackupMetadata> {
  const { vaultId, actorId, format, passphrase } = options;

  const vaultSecrets: Record<string, string> = {};
  for (const [key, value] of secretStore.secrets.entries()) {
    if (key.startsWith(`${vaultId}:`)) {
      vaultSecrets[key] = value;
    }
  }

  const raw = JSON.stringify(vaultSecrets);
  let payload: string;

  if (format === 'encrypted') {
    if (!passphrase) throw new Error('Passphrase required for encrypted backup');
    const key = await deriveKey(passphrase, randomUUID());
    const encrypted = await encrypt(key, raw);
    payload = serializePayload(encrypted);
  } else {
    payload = Buffer.from(raw).toString('base64');
  }

  const checksum = computeChecksum(payload);
  const id = randomUUID();
  const metadata: BackupMetadata = {
    id,
    vaultId,
    createdAt: new Date(),
    createdBy: actorId,
    format,
    secretCount: Object.keys(vaultSecrets).length,
    checksum,
  };

  store.backups.set(id, { metadata, payload });
  return metadata;
}

export async function restoreBackup(
  store: BackupStore,
  secretStore: SecretStore,
  options: RestoreBackupOptions
): Promise<number> {
  const { backupId, passphrase } = options;
  const entry = store.backups.get(backupId);
  if (!entry) throw new Error(`Backup not found: ${backupId}`);

  const { metadata, payload } = entry;
  if (computeChecksum(payload) !== metadata.checksum) {
    throw new Error('Backup checksum mismatch — data may be corrupted');
  }

  let raw: string;
  if (metadata.format === 'encrypted') {
    if (!passphrase) throw new Error('Passphrase required to restore encrypted backup');
    const encryptedPayload = deserializePayload(payload);
    const key = await deriveKey(passphrase, encryptedPayload.salt);
    raw = await decrypt(key, encryptedPayload);
  } else {
    raw = Buffer.from(payload, 'base64').toString('utf8');
  }

  const secrets: Record<string, string> = JSON.parse(raw);
  let count = 0;
  for (const [key, value] of Object.entries(secrets)) {
    secretStore.secrets.set(key, value);
    count++;
  }
  return count;
}

export function listBackups(store: BackupStore, vaultId: string): BackupMetadata[] {
  return Array.from(store.backups.values())
    .filter(e => e.metadata.vaultId === vaultId)
    .map(e => e.metadata)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function deleteBackup(store: BackupStore, backupId: string): boolean {
  return store.backups.delete(backupId);
}
