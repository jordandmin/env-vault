import { SecretStore, SecretMetadata } from '../secrets/secrets.types';

export interface SearchQuery {
  vaultId?: string;
  key?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  actor?: string;
}

export interface SearchResult {
  vaultId: string;
  key: string;
  metadata: SecretMetadata;
}

export function searchSecrets(
  store: SecretStore,
  query: SearchQuery
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const [storeKey, entry] of Object.entries(store.secrets)) {
    const [vaultId, key] = storeKey.split(':');

    if (query.vaultId && vaultId !== query.vaultId) continue;
    if (query.key && !key.includes(query.key)) continue;
    if (
      query.tags &&
      query.tags.length > 0 &&
      !query.tags.every((t) => entry.metadata.tags?.includes(t))
    )
      continue;
    if (
      query.createdAfter &&
      new Date(entry.metadata.createdAt) < query.createdAfter
    )
      continue;
    if (
      query.createdBefore &&
      new Date(entry.metadata.createdAt) > query.createdBefore
    )
      continue;
    if (
      query.updatedAfter &&
      new Date(entry.metadata.updatedAt) < query.updatedAfter
    )
      continue;
    if (query.actor && entry.metadata.createdBy !== query.actor) continue;

    results.push({ vaultId, key, metadata: entry.metadata });
  }

  return results;
}

export function searchByKeyPattern(
  store: SecretStore,
  vaultId: string,
  pattern: RegExp
): SearchResult[] {
  return searchSecrets(store, { vaultId }).filter(({ key }) =>
    pattern.test(key)
  );
}
