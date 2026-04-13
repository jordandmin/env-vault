export type ThrottleStrategy = 'fixed' | 'sliding' | 'token-bucket';

export interface ThrottlePolicy {
  vaultId: string;
  actorId: string;
  maxRequests: number;
  windowMs: number;
  strategy: ThrottleStrategy;
}

export interface ThrottleState {
  vaultId: string;
  actorId: string;
  requestCount: number;
  windowStart: number;
  tokens: number;
  lastRefill: number;
}

export interface ThrottleResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

export interface ThrottleStore {
  policies: Map<string, ThrottlePolicy>;
  states: Map<string, ThrottleState>;
}
