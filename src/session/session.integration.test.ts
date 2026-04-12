import { createSessionStore, createSession, validateSession, revokeAllSessionsForActor, getActiveSessionsForVault } from './session';
import { createVault } from '../vault/vault';

describe('session integration', () => {
  it('full lifecycle: create vault, open sessions, validate, revoke all', () => {
    const vault = createVault({ name: 'my-vault', ownerActorId: 'alice' });
    const store = createSessionStore();

    const s1 = createSession(store, { actorId: 'alice', vaultId: vault.id });
    const s2 = createSession(store, { actorId: 'alice', vaultId: vault.id });
    const s3 = createSession(store, { actorId: 'bob', vaultId: vault.id });

    expect(validateSession(store, s1.id).valid).toBe(true);
    expect(validateSession(store, s2.id).valid).toBe(true);
    expect(validateSession(store, s3.id).valid).toBe(true);

    const activeBefore = getActiveSessionsForVault(store, vault.id);
    expect(activeBefore).toHaveLength(3);

    const revokedCount = revokeAllSessionsForActor(store, 'alice', vault.id);
    expect(revokedCount).toBe(2);

    expect(validateSession(store, s1.id).valid).toBe(false);
    expect(validateSession(store, s2.id).valid).toBe(false);
    expect(validateSession(store, s3.id).valid).toBe(true);

    const activeAfter = getActiveSessionsForVault(store, vault.id);
    expect(activeAfter).toHaveLength(1);
    expect(activeAfter[0].actorId).toBe('bob');
  });

  it('expired sessions are excluded from active list', () => {
    const vault = createVault({ name: 'exp-vault', ownerActorId: 'carol' });
    const store = createSessionStore();

    createSession(store, { actorId: 'carol', vaultId: vault.id, ttlMs: 0 });
    createSession(store, { actorId: 'carol', vaultId: vault.id, ttlMs: 60000 });

    const active = getActiveSessionsForVault(store, vault.id);
    expect(active).toHaveLength(1);
  });
});
