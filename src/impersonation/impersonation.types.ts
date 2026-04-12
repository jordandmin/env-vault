export type ImpersonationStatus = 'active' | 'expired' | 'revoked';

export interface ImpersonationSession {
  id: string;
  actorId: string;       // who is impersonating
  targetActorId: string; // who is being impersonated
  vaultId: string;
  reason: string;
  status: ImpersonationStatus;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
  revokedBy?: string;
}

export interface ImpersonationStore {
  sessions: Map<string, ImpersonationSession>;
}
