import { QuotaStore, QuotaPolicy, QuotaUsage, QuotaCheckResult, QuotaScope } from './quota.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createQuotaStore(): QuotaStore {
  return {
    policies: new Map(),
    usage: new Map(),
  };
}

export function setPolicy(
  store: QuotaStore,
  scope: QuotaScope,
  scopeId: string,
  limits: Pick<QuotaPolicy, 'maxSecrets' | 'maxVersionsPerSecret' | 'maxBackups'>
): QuotaPolicy {
  const existing = getPolicyForScope(store, scopeId);
  const policy: QuotaPolicy = {
    id: existing?.id ?? generateId(),
    scope,
    scopeId,
    ...limits,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  store.policies.set(scopeId, policy);
  return policy;
}

export function getPolicyForScope(
  store: QuotaStore,
  scopeId: string
): QuotaPolicy | undefined {
  return store.policies.get(scopeId);
}

export function recordUsage(
  store: QuotaStore,
  scopeId: string,
  usage: Omit<QuotaUsage, 'scopeId' | 'checkedAt'>
): QuotaUsage {
  const entry: QuotaUsage = { scopeId, ...usage, checkedAt: now() };
  store.usage.set(scopeId, entry);
  return entry;
}

export function checkSecretQuota(
  store: QuotaStore,
  scopeId: string
): QuotaCheckResult {
  const policy = getPolicyForScope(store, scopeId);
  if (!policy) return { allowed: true, current: 0, limit: Infinity };
  const usage = store.usage.get(scopeId);
  const current = usage?.secretCount ?? 0;
  const allowed = current < policy.maxSecrets;
  return {
    allowed,
    current,
    limit: policy.maxSecrets,
    reason: allowed ? undefined : `Secret quota exceeded: ${current}/${policy.maxSecrets}`,
  };
}

export function checkVersionQuota(
  store: QuotaStore,
  scopeId: string
): QuotaCheckResult {
  const policy = getPolicyForScope(store, scopeId);
  if (!policy) return { allowed: true, current: 0, limit: Infinity };
  const usage = store.usage.get(scopeId);
  const current = usage?.versionCount ?? 0;
  const allowed = current < policy.maxVersionsPerSecret;
  return {
    allowed,
    current,
    limit: policy.maxVersionsPerSecret,
    reason: allowed ? undefined : `Version quota exceeded: ${current}/${policy.maxVersionsPerSecret}`,
  };
}

export function checkBackupQuota(
  store: QuotaStore,
  scopeId: string
): QuotaCheckResult {
  const policy = getPolicyForScope(store, scopeId);
  if (!policy) return { allowed: true, current: 0, limit: Infinity };
  const usage = store.usage.get(scopeId);
  const current = usage?.backupCount ?? 0;
  const allowed = current < policy.maxBackups;
  return {
    allowed,
    current,
    limit: policy.maxBackups,
    reason: allowed ? undefined : `Backup quota exceeded: ${current}/${policy.maxBackups}`,
  };
}
