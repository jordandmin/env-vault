import { createAuditLog, recordEvent, getEntriesByActor, getEntriesByAction, getEntriesAfter } from './audit';
import { AuditAction } from './audit.types';

describe('Audit integration tests', () => {
  const vaultId = 'vault-integration-001';
  const actorAlice = 'alice@example.com';
  const actorBob = 'bob@example.com';

  it('records multiple events and retrieves them by actor', () => {
    const log = createAuditLog();

    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.CREATE_VAULT });
    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.SET_SECRET, key: 'DB_PASS' });
    recordEvent(log, { vaultId, actor: actorBob, action: AuditAction.READ_SECRET, key: 'DB_PASS' });

    const aliceEntries = getEntriesByActor(log, actorAlice);
    expect(aliceEntries).toHaveLength(2);
    expect(aliceEntries.every(e => e.actor === actorAlice)).toBe(true);

    const bobEntries = getEntriesByActor(log, actorBob);
    expect(bobEntries).toHaveLength(1);
    expect(bobEntries[0].action).toBe(AuditAction.READ_SECRET);
  });

  it('retrieves entries by action across multiple vaults', () => {
    const log = createAuditLog();
    const vaultId2 = 'vault-integration-002';

    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.SET_SECRET, key: 'API_KEY' });
    recordEvent(log, { vaultId: vaultId2, actor: actorBob, action: AuditAction.SET_SECRET, key: 'SECRET_TOKEN' });
    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.DELETE_SECRET, key: 'API_KEY' });

    const setEntries = getEntriesByAction(log, AuditAction.SET_SECRET);
    expect(setEntries).toHaveLength(2);
    expect(setEntries.map(e => e.key)).toContain('API_KEY');
    expect(setEntries.map(e => e.key)).toContain('SECRET_TOKEN');
  });

  it('retrieves entries after a specific timestamp', async () => {
    const log = createAuditLog();

    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.CREATE_VAULT });

    const checkpoint = new Date();
    await new Promise(resolve => setTimeout(resolve, 10));

    recordEvent(log, { vaultId, actor: actorBob, action: AuditAction.READ_SECRET, key: 'TOKEN' });
    recordEvent(log, { vaultId, actor: actorAlice, action: AuditAction.SET_SECRET, key: 'NEW_KEY' });

    const recentEntries = getEntriesAfter(log, checkpoint);
    expect(recentEntries).toHaveLength(2);
    expect(recentEntries.every(e => e.timestamp > checkpoint)).toBe(true);
  });

  it('maintains insertion order for entries', () => {
    const log = createAuditLog();
    const actions: AuditAction[] = [
      AuditAction.CREATE_VAULT,
      AuditAction.SET_SECRET,
      AuditAction.READ_SECRET,
      AuditAction.DELETE_SECRET,
    ];

    actions.forEach(action => recordEvent(log, { vaultId, actor: actorAlice, action }));

    const allEntries = getEntriesByActor(log, actorAlice);
    expect(allEntries.map(e => e.action)).toEqual(actions);
  });
});
