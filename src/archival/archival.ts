import { ArchivalPolicy, ArchivalRecord, ArchivalStatus, ArchivalStore } from './archival.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createArchivalStore(): ArchivalStore {
  return {
    policies: new Map(),
    records: new Map(),
  };
}

export function setArchivalPolicy(
  store: ArchivalStore,
  vaultId: string,
  retentionDays: number,
  autoArchiveAfterDays: number,
  autoPurgeAfterDays?: number
): ArchivalPolicy {
  const existing = store.policies.get(vaultId);
  const policy: ArchivalPolicy = {
    vaultId,
    retentionDays,
    autoArchiveAfterDays,
    autoPurgeAfterDays,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  store.policies.set(vaultId, policy);
  return policy;
}

export function getArchivalPolicy(
  store: ArchivalStore,
  vaultId: string
): ArchivalPolicy | undefined {
  return store.policies.get(vaultId);
}

export function archiveSecret(
  store: ArchivalStore,
  vaultId: string,
  secretKey: string,
  archivedBy?: string,
  reason?: string
): ArchivalRecord {
  const id = generateId();
  const record: ArchivalRecord = {
    id,
    vaultId,
    secretKey,
    status: 'archived',
    archivedAt: now(),
    archivedBy,
    reason,
    createdAt: now(),
  };
  store.records.set(id, record);
  return record;
}

export function purgeSecret(
  store: ArchivalStore,
  recordId: string
): ArchivalRecord | undefined {
  const record = store.records.get(recordId);
  if (!record) return undefined;
  const updated: ArchivalRecord = { ...record, status: 'purged', purgedAt: now() };
  store.records.set(recordId, updated);
  return updated;
}

export function getRecordsForVault(
  store: ArchivalStore,
  vaultId: string,
  status?: ArchivalStatus
): ArchivalRecord[] {
  const all = Array.from(store.records.values()).filter(r => r.vaultId === vaultId);
  return status ? all.filter(r => r.status === status) : all;
}

export function applyAutoArchival(
  store: ArchivalStore,
  vaultId: string,
  secretKey: string,
  createdAt: number
): ArchivalRecord | null {
  const policy = store.policies.get(vaultId);
  if (!policy) return null;
  const ageMs = now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= policy.autoArchiveAfterDays) {
    return archiveSecret(store, vaultId, secretKey, 'system', 'auto-archival policy');
  }
  return null;
}
