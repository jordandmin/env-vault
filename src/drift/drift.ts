import { DriftEntry, DriftPolicy, DriftSeverity, DriftStore } from './drift.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createDriftStore(): DriftStore {
  return {
    policies: new Map(),
    entries: new Map(),
  };
}

export function setDriftPolicy(
  store: DriftStore,
  vaultId: string,
  policy: Omit<DriftPolicy, 'vaultId'>
): DriftPolicy {
  const full: DriftPolicy = { ...policy, vaultId };
  store.policies.set(vaultId, full);
  return full;
}

export function getDriftPolicy(
  store: DriftStore,
  vaultId: string
): DriftPolicy | undefined {
  return store.policies.get(vaultId);
}

export function recordDrift(
  store: DriftStore,
  vaultId: string,
  key: string,
  expectedHash: string,
  actualHash: string,
  severity?: DriftSeverity
): DriftEntry {
  const policy = store.policies.get(vaultId);
  const resolvedSeverity: DriftSeverity = severity ?? policy?.severity ?? 'medium';
  const entry: DriftEntry = {
    id: generateId(),
    vaultId,
    key,
    expectedHash,
    actualHash,
    severity: resolvedSeverity,
    detectedAt: now(),
  };
  store.entries.set(entry.id, entry);
  return entry;
}

export function resolveDrift(
  store: DriftStore,
  entryId: string
): DriftEntry | undefined {
  const entry = store.entries.get(entryId);
  if (!entry) return undefined;
  const resolved: DriftEntry = { ...entry, resolvedAt: now() };
  store.entries.set(entryId, resolved);
  return resolved;
}

export function getDriftsForVault(
  store: DriftStore,
  vaultId: string,
  unresolvedOnly = false
): DriftEntry[] {
  const results: DriftEntry[] = [];
  for (const entry of store.entries.values()) {
    if (entry.vaultId !== vaultId) continue;
    if (unresolvedOnly && entry.resolvedAt !== undefined) continue;
    results.push(entry);
  }
  return results;
}

export function hasDrift(
  store: DriftStore,
  vaultId: string,
  key: string
): boolean {
  for (const entry of store.entries.values()) {
    if (entry.vaultId === vaultId && entry.key === key && !entry.resolvedAt) {
      return true;
    }
  }
  return false;
}
