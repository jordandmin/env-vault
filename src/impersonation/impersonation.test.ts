import {
  createImpersonationStore,
  startImpersonation,
  revokeImpersonation,
  getActiveSession,
  resolveEffectiveActor,
  listSessionsForVault,
  expireStaleSessions,
} from './impersonation';

const VAULT = 'vault-1';
const ADMIN = 'admin-user';
const TARGET = 'target-user';

describe('impersonation', () => {
  it('creates a store with no sessions', () => {
    const store = createImpersonationStore();
    expect(store.sessions.size).toBe(0);
  });

  it('starts an impersonation session', () => {
    const store = createImpersonationStore();
    const session = startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', 60_000);
    expect(session.actorId).toBe(ADMIN);
    expect(session.targetActorId).toBe(TARGET);
    expect(session.status).toBe('active');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('throws when actor impersonates themselves', () => {
    const store = createImpersonationStore();
    expect(() => startImpersonation(store, ADMIN, ADMIN, VAULT, 'self', 1000)).toThrow();
  });

  it('revokes an active session', () => {
    const store = createImpersonationStore();
    const session = startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', 60_000);
    const revoked = revokeImpersonation(store, session.id, 'super-admin');
    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedBy).toBe('super-admin');
  });

  it('throws when revoking a non-active session', () => {
    const store = createImpersonationStore();
    const session = startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', 60_000);
    revokeImpersonation(store, session.id, 'super-admin');
    expect(() => revokeImpersonation(store, session.id, 'super-admin')).toThrow();
  });

  it('resolves effective actor when session is active', () => {
    const store = createImpersonationStore();
    startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', 60_000);
    expect(resolveEffectiveActor(store, ADMIN, VAULT)).toBe(TARGET);
  });

  it('resolves self when no active session exists', () => {
    const store = createImpersonationStore();
    expect(resolveEffectiveActor(store, ADMIN, VAULT)).toBe(ADMIN);
  });

  it('lists sessions for a vault', () => {
    const store = createImpersonationStore();
    startImpersonation(store, ADMIN, TARGET, VAULT, 'r1', 60_000);
    startImpersonation(store, ADMIN, TARGET, 'vault-2', 'r2', 60_000);
    const sessions = listSessionsForVault(store, VAULT);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].vaultId).toBe(VAULT);
  });

  it('expires stale sessions', () => {
    const store = createImpersonationStore();
    const session = startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', -1);
    const count = expireStaleSessions(store);
    expect(count).toBe(1);
    expect(store.sessions.get(session.id)?.status).toBe('expired');
  });

  it('does not return expired session as active', () => {
    const store = createImpersonationStore();
    startImpersonation(store, ADMIN, TARGET, VAULT, 'debug', -1);
    expireStaleSessions(store);
    expect(getActiveSession(store, ADMIN, VAULT)).toBeUndefined();
  });
});
