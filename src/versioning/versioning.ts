import { VersionStore, SecretVersion, CreateVersionInput } from './versioning.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeStoreKey(vaultId: string, secretKey: string): string {
  return `${vaultId}::${secretKey}`;
}

export function createVersionStore(): VersionStore {
  return { versions: new Map() };
}

export function recordVersion(
  store: VersionStore,
  input: CreateVersionInput
): SecretVersion {
  const key = makeStoreKey(input.vaultId, input.secretKey);
  const existing = store.versions.get(key) ?? [];
  const nextVersion = existing.length > 0
    ? Math.max(...existing.map(v => v.version)) + 1
    : 1;

  const entry: SecretVersion = {
    id: generateId(),
    vaultId: input.vaultId,
    secretKey: input.secretKey,
    encryptedValue: input.encryptedValue,
    version: nextVersion,
    createdAt: new Date(),
    createdBy: input.createdBy,
    note: input.note,
  };

  store.versions.set(key, [...existing, entry]);
  return entry;
}

export function getVersionHistory(
  store: VersionStore,
  vaultId: string,
  secretKey: string
): SecretVersion[] {
  const key = makeStoreKey(vaultId, secretKey);
  return store.versions.get(key) ?? [];
}

export function getVersionById(
  store: VersionStore,
  vaultId: string,
  secretKey: string,
  version: number
): SecretVersion | undefined {
  return getVersionHistory(store, vaultId, secretKey)
    .find(v => v.version === version);
}

export function getLatestVersion(
  store: VersionStore,
  vaultId: string,
  secretKey: string
): SecretVersion | undefined {
  const history = getVersionHistory(store, vaultId, secretKey);
  if (history.length === 0) return undefined;
  return history.reduce((latest, v) => v.version > latest.version ? v : latest);
}

export function pruneVersions(
  store: VersionStore,
  vaultId: string,
  secretKey: string,
  keepCount: number
): void {
  const key = makeStoreKey(vaultId, secretKey);
  const history = store.versions.get(key) ?? [];
  if (history.length <= keepCount) return;
  const sorted = [...history].sort((a, b) => b.version - a.version);
  store.versions.set(key, sorted.slice(0, keepCount));
}
