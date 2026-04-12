export interface LockoutPolicy {
  vaultId: string;
  maxAttempts: number;
  windowMs: number;
  lockoutDurationMs: number;
  createdAt: number;
  updatedAt: number;
}

export interface LockoutRecord {
  id: string;
  vaultId: string;
  actorId: string;
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
  updatedAt: number;
}

export interface LockoutStore {
  policies: Map<string, LockoutPolicy>;
  records: Map<string, LockoutRecord>;
}

export type LockoutCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'locked'; lockedUntil: number }
  | { allowed: false; reason: 'no_policy' };
