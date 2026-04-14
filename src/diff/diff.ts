import { DiffEntry, DiffOperation, DiffStore, VaultDiff } from './diff.types';

export function createDiffStore(): DiffStore {
  return { diffs: new Map() };
}

function makeDiffKey(vaultId: string, fromVersion: string, toVersion: string): string {
  return `${vaultId}:${fromVersion}:${toVersion}`;
}

export function diffSecrets(
  store: DiffStore,
  vaultId: string,
  fromVersion: string,
  toVersion: string,
  oldSecrets: Record<string, string>,
  newSecrets: Record<string, string>
): VaultDiff {
  const entries: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(oldSecrets), ...Object.keys(newSecrets)]);

  for (const key of allKeys) {
    const inOld = key in oldSecrets;
    const inNew = key in newSecrets;

    let operation: DiffOperation;
    if (!inOld && inNew) {
      operation = 'added';
    } else if (inOld && !inNew) {
      operation = 'removed';
    } else if (oldSecrets[key] !== newSecrets[key]) {
      operation = 'changed';
    } else {
      operation = 'unchanged';
    }

    entries.push({
      key,
      operation,
      oldValue: inOld ? oldSecrets[key] : undefined,
      newValue: inNew ? newSecrets[key] : undefined,
    });
  }

  const summary = entries.reduce(
    (acc, e) => { acc[e.operation]++; return acc; },
    { added: 0, removed: 0, changed: 0, unchanged: 0 }
  );

  const diff: VaultDiff = {
    vaultId,
    fromVersion,
    toVersion,
    timestamp: Date.now(),
    entries,
    summary,
  };

  store.diffs.set(makeDiffKey(vaultId, fromVersion, toVersion), diff);
  return diff;
}

export function getDiff(
  store: DiffStore,
  vaultId: string,
  fromVersion: string,
  toVersion: string
): VaultDiff | undefined {
  return store.diffs.get(makeDiffKey(vaultId, fromVersion, toVersion));
}

export function getDiffsForVault(store: DiffStore, vaultId: string): VaultDiff[] {
  return Array.from(store.diffs.values()).filter((d) => d.vaultId === vaultId);
}

export function filterByOperation(
  diff: VaultDiff,
  operation: DiffOperation
): DiffEntry[] {
  return diff.entries.filter((e) => e.operation === operation);
}
