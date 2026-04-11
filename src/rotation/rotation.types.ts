export type RotationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface RotationPolicy {
  id: string;
  vaultId: string;
  intervalDays: number;
  lastRotatedAt: number | null;
  nextRotationAt: number;
  createdAt: number;
  createdBy: string;
}

export interface RotationRecord {
  id: string;
  vaultId: string;
  policyId: string;
  status: RotationStatus;
  triggeredBy: string;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  rotatedSecretKeys: string[];
}

export interface RotationStore {
  policies: Map<string, RotationPolicy>;
  records: Map<string, RotationRecord>;
}
