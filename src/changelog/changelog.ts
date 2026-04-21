import { randomUUID } from "crypto";

export type ChangelogAction =
  | "secret.set"
  | "secret.delete"
  | "key.rotated"
  | "member.added"
  | "member.removed"
  | "policy.updated"
  | "vault.created";

export interface ChangelogEntry {
  id: string;
  vaultId: string;
  actor: string;
  action: ChangelogAction;
  targetKey?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ChangelogStore {
  entries: Map<string, ChangelogEntry>;
}

function generateId(): string {
  return randomUUID();
}

function now(): number {
  return Date.now();
}

export function createChangelogStore(): ChangelogStore {
  return { entries: new Map() };
}

export function recordChange(
  store: ChangelogStore,
  vaultId: string,
  actor: string,
  action: ChangelogAction,
  targetKey?: string,
  metadata?: Record<string, unknown>
): ChangelogEntry {
  const entry: ChangelogEntry = {
    id: generateId(),
    vaultId,
    actor,
    action,
    targetKey,
    metadata,
    timestamp: now(),
  };
  store.entries.set(entry.id, entry);
  return entry;
}

export function getChangelogForVault(
  store: ChangelogStore,
  vaultId: string
): ChangelogEntry[] {
  return Array.from(store.entries.values())
    .filter((e) => e.vaultId === vaultId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getChangelogByActor(
  store: ChangelogStore,
  actor: string
): ChangelogEntry[] {
  return Array.from(store.entries.values())
    .filter((e) => e.actor === actor)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getChangelogAfter(
  store: ChangelogStore,
  vaultId: string,
  since: number
): ChangelogEntry[] {
  return getChangelogForVault(store, vaultId).filter(
    (e) => e.timestamp > since
  );
}

export function clearChangelog(
  store: ChangelogStore,
  vaultId: string
): number {
  let removed = 0;
  for (const [id, entry] of store.entries) {
    if (entry.vaultId === vaultId) {
      store.entries.delete(id);
      removed++;
    }
  }
  return removed;
}
