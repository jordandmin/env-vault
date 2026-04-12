import { Session, SessionStore, CreateSessionOptions, SessionValidationResult } from './session.types';

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createSessionStore(): SessionStore {
  return { sessions: new Map() };
}

export function createSession(
  store: SessionStore,
  options: CreateSessionOptions
): Session {
  const { actorId, vaultId, ttlMs = DEFAULT_TTL_MS, metadata } = options;
  const createdAt = now();
  const session: Session = {
    id: generateId(),
    actorId,
    vaultId,
    createdAt,
    expiresAt: createdAt + ttlMs,
    lastAccessedAt: createdAt,
    status: 'active',
    metadata,
  };
  store.sessions.set(session.id, session);
  return session;
}

export function validateSession(
  store: SessionStore,
  sessionId: string
): SessionValidationResult {
  const session = store.sessions.get(sessionId);
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }
  if (session.status === 'revoked') {
    return { valid: false, reason: 'Session has been revoked', session };
  }
  if (session.status === 'expired' || now() > session.expiresAt) {
    session.status = 'expired';
    return { valid: false, reason: 'Session has expired', session };
  }
  session.lastAccessedAt = now();
  return { valid: true, session };
}

export function revokeSession(store: SessionStore, sessionId: string): boolean {
  const session = store.sessions.get(sessionId);
  if (!session) return false;
  session.status = 'revoked';
  return true;
}

export function revokeAllSessionsForActor(
  store: SessionStore,
  actorId: string,
  vaultId: string
): number {
  let count = 0;
  for (const session of store.sessions.values()) {
    if (session.actorId === actorId && session.vaultId === vaultId && session.status === 'active') {
      session.status = 'revoked';
      count++;
    }
  }
  return count;
}

export function getActiveSessionsForVault(
  store: SessionStore,
  vaultId: string
): Session[] {
  const result: Session[] = [];
  for (const session of store.sessions.values()) {
    if (session.vaultId === vaultId && session.status === 'active' && now() <= session.expiresAt) {
      result.push(session);
    }
  }
  return result;
}
