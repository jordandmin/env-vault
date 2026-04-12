import { ImpersonationSession, ImpersonationStatus, ImpersonationStore } from './impersonation.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createImpersonationStore(): ImpersonationStore {
  return { sessions: new Map() };
}

export function startImpersonation(
  store: ImpersonationStore,
  actorId: string,
  targetActorId: string,
  vaultId: string,
  reason: string,
  durationMs: number
): ImpersonationSession {
  if (actorId === targetActorId) {
    throw new Error('Actor cannot impersonate themselves');
  }
  const session: ImpersonationSession = {
    id: generateId(),
    actorId,
    targetActorId,
    vaultId,
    reason,
    status: 'active',
    createdAt: now(),
    expiresAt: now() + durationMs,
  };
  store.sessions.set(session.id, session);
  return session;
}

export function revokeImpersonation(
  store: ImpersonationStore,
  sessionId: string,
  revokedBy: string
): ImpersonationSession {
  const session = store.sessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.status !== 'active') throw new Error(`Session is not active: ${session.status}`);
  const updated: ImpersonationSession = {
    ...session,
    status: 'revoked',
    revokedAt: now(),
    revokedBy,
  };
  store.sessions.set(sessionId, updated);
  return updated;
}

export function getActiveSession(
  store: ImpersonationStore,
  actorId: string,
  vaultId: string
): ImpersonationSession | undefined {
  const ts = now();
  for (const session of store.sessions.values()) {
    if (
      session.actorId === actorId &&
      session.vaultId === vaultId &&
      session.status === 'active' &&
      session.expiresAt > ts
    ) {
      return session;
    }
  }
  return undefined;
}

export function resolveEffectiveActor(
  store: ImpersonationStore,
  actorId: string,
  vaultId: string
): string {
  const session = getActiveSession(store, actorId, vaultId);
  return session ? session.targetActorId : actorId;
}

export function listSessionsForVault(
  store: ImpersonationStore,
  vaultId: string
): ImpersonationSession[] {
  return Array.from(store.sessions.values()).filter(s => s.vaultId === vaultId);
}

export function expireStaleSessions(store: ImpersonationStore): number {
  const ts = now();
  let count = 0;
  for (const [id, session] of store.sessions.entries()) {
    if (session.status === 'active' && session.expiresAt <= ts) {
      store.sessions.set(id, { ...session, status: 'expired' });
      count++;
    }
  }
  return count;
}
