import { randomUUID } from "crypto";

export interface WhitelistEntry {
  id: string;
  vaultId: string;
  pattern: string; // glob or exact key name
  createdBy: string;
  createdAt: number;
  description?: string;
}

export interface WhitelistStore {
  entries: Map<string, WhitelistEntry>;
}

export function createWhitelistStore(): WhitelistStore {
  return { entries: new Map() };
}

export function addToWhitelist(
  store: WhitelistStore,
  vaultId: string,
  pattern: string,
  createdBy: string,
  description?: string
): WhitelistEntry {
  const entry: WhitelistEntry = {
    id: randomUUID(),
    vaultId,
    pattern,
    createdBy,
    createdAt: Date.now(),
    description,
  };
  store.entries.set(entry.id, entry);
  return entry;
}

export function removeFromWhitelist(
  store: WhitelistStore,
  entryId: string
): boolean {
  return store.entries.delete(entryId);
}

export function getWhitelistForVault(
  store: WhitelistStore,
  vaultId: string
): WhitelistEntry[] {
  return Array.from(store.entries.values()).filter(
    (e) => e.vaultId === vaultId
  );
}

export function isKeyWhitelisted(
  store: WhitelistStore,
  vaultId: string,
  key: string
): boolean {
  const entries = getWhitelistForVault(store, vaultId);
  if (entries.length === 0) return true; // no whitelist means all keys allowed
  return entries.some((e) => matchPattern(e.pattern, key));
}

function matchPattern(pattern: string, key: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return key.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith("*")) {
    return key.endsWith(pattern.slice(1));
  }
  return pattern === key;
}
