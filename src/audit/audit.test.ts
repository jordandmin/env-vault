import {
  createAuditLog,
  recordEvent,
  getEntriesByActor,
  getEntriesByAction,
  getEntriesAfter,
  serializeAuditLog,
  deserializeAuditLog,
} from './audit';

const VAULT_ID = 'vault-abc-123';

describe('audit log', () => {
  it('creates an empty audit log', () => {
    const log = createAuditLog(VAULT_ID);
    expect(log.vaultId).toBe(VAULT_ID);
    expect(log.entries).toHaveLength(0);
  });

  it('records an event and returns the entry', () => {
    const log = createAuditLog(VAULT_ID);
    const entry = recordEvent(log, 'secret.set', 'alice', { key: 'DB_URL' });
    expect(log.entries).toHaveLength(1);
    expect(entry.action).toBe('secret.set');
    expect(entry.actor).toBe('alice');
    expect(entry.meta).toEqual({ key: 'DB_URL' });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it('filters entries by actor', () => {
    const log = createAuditLog(VAULT_ID);
    recordEvent(log, 'secret.set', 'alice');
    recordEvent(log, 'secret.get', 'bob');
    recordEvent(log, 'secret.delete', 'alice');
    const aliceEntries = getEntriesByActor(log, 'alice');
    expect(aliceEntries).toHaveLength(2);
    expect(aliceEntries.every((e) => e.actor === 'alice')).toBe(true);
  });

  it('filters entries by action', () => {
    const log = createAuditLog(VAULT_ID);
    recordEvent(log, 'secret.set', 'alice');
    recordEvent(log, 'secret.set', 'bob');
    recordEvent(log, 'vault.open', 'alice');
    const setEntries = getEntriesByAction(log, 'secret.set');
    expect(setEntries).toHaveLength(2);
  });

  it('filters entries after a given date', () => {
    const log = createAuditLog(VAULT_ID);
    const before = new Date();
    recordEvent(log, 'secret.set', 'alice');
    const after = getEntriesAfter(log, before);
    expect(after).toHaveLength(1);
    const none = getEntriesAfter(log, new Date());
    expect(none).toHaveLength(0);
  });

  it('serializes and deserializes the audit log', () => {
    const log = createAuditLog(VAULT_ID);
    recordEvent(log, 'vault.create', 'alice');
    const raw = serializeAuditLog(log);
    const restored = deserializeAuditLog(raw);
    expect(restored.vaultId).toBe(VAULT_ID);
    expect(restored.entries).toHaveLength(1);
  });

  it('throws on invalid audit log JSON', () => {
    expect(() => deserializeAuditLog('{"bad":true}')).toThrow(
      'Invalid audit log format'
    );
  });
});
