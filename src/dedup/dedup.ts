import { createHash } from 'crypto';

export interface DedupStore {
  hashes: Map<string, { vaultId: string; key: string; addedAt: number }>;
}

export function createDedupStore(): DedupStore {
  return { hashes: new Map() };
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function registerSecret(
  store: DedupStore,
  vaultId: string,
  key: string,
  value: string
): { duplicate: boolean; existingKey?: string } {
  const h = hashValue(value);
  const existing = store.hashes.get(h);
  if (existing && existing.vaultId === vaultId) {
    return { duplicate: true, existingKey: existing.key };
  }
  store.hashes.set(h, { vaultId, key, addedAt: Date.now() });
  return { duplicate: false };
}

export function deregisterSecret(
  store: DedupStore,
  vaultId: string,
  value: string
): boolean {
  const h = hashValue(value);
  const existing = store.hashes.get(h);
  if (existing && existing.vaultId === vaultId) {
    store.hashes.delete(h);
    return true;
  }
  return false;
}

export function isDuplicate(
  store: DedupStore,
  vaultId: string,
  value: string
): boolean {
  const h = hashValue(value);
  const existing = store.hashes.get(h);
  return !!existing && existing.vaultId === vaultId;
}

export function getDedupEntriesForVault(
  store: DedupStore,
  vaultId: string
): Array<{ key: string; hash: string; addedAt: number }> {
  const results: Array<{ key: string; hash: string; addedAt: number }> = [];
  for (const [hash, entry] of store.hashes.entries()) {
    if (entry.vaultId === vaultId) {
      results.push({ key: entry.key, hash, addedAt: entry.addedAt });
    }
  }
  return results;
}
