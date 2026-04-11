import { RotationStore, RotationPolicy, RotationRecord, RotationStatus } from './rotation.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createRotationStore(): RotationStore {
  return {
    policies: new Map(),
    records: new Map(),
  };
}

export function createRotationPolicy(
  store: RotationStore,
  vaultId: string,
  intervalDays: number,
  createdBy: string
): RotationPolicy {
  const now = Date.now();
  const policy: RotationPolicy = {
    id: generateId(),
    vaultId,
    intervalDays,
    lastRotatedAt: null,
    nextRotationAt: now + intervalDays * 86400000,
    createdAt: now,
    createdBy,
  };
  store.policies.set(policy.id, policy);
  return policy;
}

export function getPolicyForVault(
  store: RotationStore,
  vaultId: string
): RotationPolicy | undefined {
  for (const policy of store.policies.values()) {
    if (policy.vaultId === vaultId) return policy;
  }
  return undefined;
}

export function startRotation(
  store: RotationStore,
  vaultId: string,
  policyId: string,
  triggeredBy: string
): RotationRecord {
  const record: RotationRecord = {
    id: generateId(),
    vaultId,
    policyId,
    status: 'in_progress',
    triggeredBy,
    startedAt: Date.now(),
    completedAt: null,
    error: null,
    rotatedSecretKeys: [],
  };
  store.records.set(record.id, record);
  return record;
}

export function completeRotation(
  store: RotationStore,
  recordId: string,
  rotatedSecretKeys: string[]
): RotationRecord {
  const record = store.records.get(recordId);
  if (!record) throw new Error(`Rotation record not found: ${recordId}`);
  const updated: RotationRecord = {
    ...record,
    status: 'completed',
    completedAt: Date.now(),
    rotatedSecretKeys,
  };
  store.records.set(recordId, updated);

  const policy = store.policies.get(record.policyId);
  if (policy) {
    const now = Date.now();
    store.policies.set(policy.id, {
      ...policy,
      lastRotatedAt: now,
      nextRotationAt: now + policy.intervalDays * 86400000,
    });
  }
  return updated;
}

export function failRotation(
  store: RotationStore,
  recordId: string,
  error: string
): RotationRecord {
  const record = store.records.get(recordId);
  if (!record) throw new Error(`Rotation record not found: ${recordId}`);
  const updated: RotationRecord = { ...record, status: 'failed', completedAt: Date.now(), error };
  store.records.set(recordId, updated);
  return updated;
}

export function getRotationHistory(
  store: RotationStore,
  vaultId: string
): RotationRecord[] {
  return Array.from(store.records.values())
    .filter((r) => r.vaultId === vaultId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getPoliciesDueForRotation(
  store: RotationStore,
  asOf: number = Date.now()
): RotationPolicy[] {
  return Array.from(store.policies.values()).filter((p) => p.nextRotationAt <= asOf);
}
