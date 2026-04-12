import {
  createSessionStore,
  createSession,
  validateSession,
  revokeSession,
  revokeAllSessionsForActor,
  getActiveSessionsForVault,
} from './session';

describe('session', () => {
  const actorId = 'actor-1';
  const vaultId = 'vault-1';

  it('creates a session with default TTL', () => {
    const store = createSessionStore();
    const session = createSession(store, { actorId, vaultId });
    expect(session.id).toBeDefined();
    expect(session.actorId).toBe(actorId);
    expect(session.vaultId).toBe(vaultId);
    expect(session.status).toBe('active');
    expect(session.expiresAt).toBeGreaterThan(session.createdAt);
  });

  it('validates an active session', () => {
    const store = createSessionStore();
    const session = createSession(store, { actorId, vaultId });
    const result = validateSession(store, session.id);
    expect(result.valid).toBe(true);
    expect(result.session?.id).toBe(session.id);
  });

  it('returns invalid for unknown session id', () => {
    const store = createSessionStore();
    const result = validateSession(store, 'nonexistent');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  it('marks session as expired when TTL is 0', () => {
    const store = createSessionStore();
    const session = createSession(store, { actorId, vaultId, ttlMs: 0 });
    const result = validateSession(store, session.id);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it('revokes a session', () => {
    const store = createSessionStore();
    const session = createSession(store, { actorId, vaultId });
    const revoked = revokeSession(store, session.id);
    expect(revoked).toBe(true);
    const result = validateSession(store, session.id);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/revoked/i);
  });

  it('returns false when revoking nonexistent session', () => {
    const store = createSessionStore();
    expect(revokeSession(store, 'ghost')).toBe(false);
  });

  it('revokes all active sessions for an actor in a vault', () => {
    const store = createSessionStore();
    createSession(store, { actorId, vaultId });
    createSession(store, { actorId, vaultId });
    createSession(store, { actorId: 'actor-2', vaultId });
    const count = revokeAllSessionsForActor(store, actorId, vaultId);
    expect(count).toBe(2);
  });

  it('lists active sessions for a vault', () => {
    const store = createSessionStore();
    createSession(store, { actorId, vaultId });
    createSession(store, { actorId: 'actor-2', vaultId });
    createSession(store, { actorId, vaultId: 'vault-2' });
    const sessions = getActiveSessionsForVault(store, vaultId);
    expect(sessions).toHaveLength(2);
    expect(sessions.every(s => s.vaultId === vaultId)).toBe(true);
  });

  it('stores optional metadata on session', () => {
    const store = createSessionStore();
    const session = createSession(store, { actorId, vaultId, metadata: { ip: '127.0.0.1' } });
    expect(session.metadata?.ip).toBe('127.0.0.1');
  });
});
