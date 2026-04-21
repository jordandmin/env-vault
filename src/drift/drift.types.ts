export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DriftEntry {
  id: string;
  vaultId: string;
  key: string;
  expectedHash: string;
  actualHash: string;
  severity: DriftSeverity;
  detectedAt: number;
  resolvedAt?: number;
}

export interface DriftPolicy {
  vaultId: string;
  enabled: boolean;
  severity: DriftSeverity;
  autoResolve: boolean;
}

export interface DriftStore {
  policies: Map<string, DriftPolicy>;
  entries: Map<string, DriftEntry>;
}
