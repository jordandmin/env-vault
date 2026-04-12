export type QuotaScope = 'vault' | 'actor' | 'global';

export interface QuotaPolicy {
  id: string;
  scope: QuotaScope;
  scopeId: string; // vaultId, actorId, or 'global'
  maxSecrets: number;
  maxVersionsPerSecret: number;
  maxBackups: number;
  createdAt: number;
  updatedAt: number;
}

export interface QuotaUsage {
  scopeId: string;
  secretCount: number;
  versionCount: number;
  backupCount: number;
  checkedAt: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}

export interface QuotaStore {
  policies: Map<string, QuotaPolicy>;
  usage: Map<string, QuotaUsage>;
}
