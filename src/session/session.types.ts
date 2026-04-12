export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface Session {
  id: string;
  actorId: string;
  vaultId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  status: SessionStatus;
  metadata?: Record<string, string>;
}

export interface SessionStore {
  sessions: Map<string, Session>;
}

export interface CreateSessionOptions {
  actorId: string;
  vaultId: string;
  ttlMs?: number;
  metadata?: Record<string, string>;
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  session?: Session;
}
