export type RetryStrategy = 'fixed' | 'exponential' | 'linear';

export interface RetryPolicy {
  id: string;
  vaultId: string;
  maxAttempts: number;
  strategy: RetryStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RetryAttempt {
  id: string;
  policyId: string;
  vaultId: string;
  operation: string;
  attemptNumber: number;
  delayMs: number;
  succeededAt?: number;
  failedAt?: number;
  error?: string;
  createdAt: number;
}

export interface RetryStore {
  policies: Map<string, RetryPolicy>;
  attempts: Map<string, RetryAttempt[]>;
}
