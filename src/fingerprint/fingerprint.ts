import { createHash } from 'crypto';
import {
  FingerprintPolicy,
  FingerprintRecord,
  FingerprintStore,
} from './fingerprint.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createFingerprintStore(): FingerprintStore {
  return {
    policies: new Map(),
    records: new Map(),
  };
}

export function setPolicy(
  store: FingerprintStore,
  policy: FingerprintPolicy
): void {
  store.policies.set(policy.vaultId, policy);
}

export function getPolicy(
  store: FingerprintStore,
  vaultId: string
): FingerprintPolicy | undefined {
  return store.policies.get(vaultId);
}

export function computeFingerprint(
  value: string,
  algorithm: 'sha256' | 'sha512',
  metadata?: Record<string, string>
): string {
  const hash = createHash(algorithm);
  hash.update(value);
  if (metadata) {
    hash.update(JSON.stringify(metadata));
  }
  return hash.digest('hex');
}

export function recordFingerprint(
  store: FingerprintStore,
  vaultId: string,
  secretKey: string,
  value: string,
  metadata?: Record<string, string>
): FingerprintRecord {
  const policy = store.policies.get(vaultId);
  const algorithm = policy?.algorithm ?? 'sha256';
  const includeMetadata = policy?.includeMetadata ?? false;

  const fingerprint = computeFingerprint(
    value,
    algorithm,
    includeMetadata ? metadata : undefined
  );

  const record: FingerprintRecord = {
    id: generateId(),
    vaultId,
    secretKey,
    fingerprint,
    algorithm,
    computedAt: now(),
  };

  const storeKey = `${vaultId}:${secretKey}`;
  store.records.set(storeKey, record);
  return record;
}

export function getFingerprint(
  store: FingerprintStore,
  vaultId: string,
  secretKey: string
): FingerprintRecord | undefined {
  return store.records.get(`${vaultId}:${secretKey}`);
}

export function verifyFingerprint(
  store: FingerprintStore,
  vaultId: string,
  secretKey: string,
  value: string,
  metadata?: Record<string, string>
): boolean {
  const record = getFingerprint(store, vaultId, secretKey);
  if (!record) return false;

  const policy = store.policies.get(vaultId);
  const includeMetadata = policy?.includeMetadata ?? false;

  const current = computeFingerprint(
    value,
    record.algorithm,
    includeMetadata ? metadata : undefined
  );
  return current === record.fingerprint;
}

export function listFingerprintsForVault(
  store: FingerprintStore,
  vaultId: string
): FingerprintRecord[] {
  const results: FingerprintRecord[] = [];
  for (const [key, record] of store.records) {
    if (key.startsWith(`${vaultId}:`)) {
      results.push(record);
    }
  }
  return results;
}
