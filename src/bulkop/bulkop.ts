import { SecretStore } from '../secrets/secrets.types';
import { getSecret, setSecret, deleteSecret } from '../secrets/secrets';

export interface BulkSetEntry {
  vaultId: string;
  key: string;
  value: string;
}

export interface BulkOpResult {
  succeeded: string[];
  failed: Array<{ key: string; reason: string }>;
}

export interface BulkOpStore {
  secrets: SecretStore;
}

export function createBulkOpStore(secrets: SecretStore): BulkOpStore {
  return { secrets };
}

export function bulkSet(
  store: BulkOpStore,
  entries: BulkSetEntry[],
  actor: string
): BulkOpResult {
  const result: BulkOpResult = { succeeded: [], failed: [] };
  for (const entry of entries) {
    try {
      setSecret(store.secrets, entry.vaultId, entry.key, entry.value, actor);
      result.succeeded.push(entry.key);
    } catch (err) {
      result.failed.push({ key: entry.key, reason: (err as Error).message });
    }
  }
  return result;
}

export function bulkGet(
  store: BulkOpStore,
  vaultId: string,
  keys: string[]
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    const entry = getSecret(store.secrets, vaultId, key);
    out[key] = entry?.value;
  }
  return out;
}

export function bulkDelete(
  store: BulkOpStore,
  vaultId: string,
  keys: string[],
  actor: string
): BulkOpResult {
  const result: BulkOpResult = { succeeded: [], failed: [] };
  for (const key of keys) {
    try {
      deleteSecret(store.secrets, vaultId, key, actor);
      result.succeeded.push(key);
    } catch (err) {
      result.failed.push({ key: key, reason: (err as Error).message });
    }
  }
  return result;
}
