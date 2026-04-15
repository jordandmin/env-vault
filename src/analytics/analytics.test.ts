import {
  createAnalyticsStore,
  recordEvent,
  getEventsForVault,
  getEventsForActor,
  summarizeVault,
  clearEventsForVault,
} from './analytics';

describe('analytics', () => {
  it('creates an empty store', () => {
    const store = createAnalyticsStore();
    expect(store.events.size).toBe(0);
  });

  it('records an event and assigns an id', () => {
    const store = createAnalyticsStore();
    const event = recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    expect(event.id).toBeDefined();
    expect(event.vaultId).toBe('vault-1');
    expect(event.actorId).toBe('actor-1');
    expect(event.eventType).toBe('secret_read');
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('records event metadata', () => {
    const store = createAnalyticsStore();
    const event = recordEvent(store, 'v1', 'a1', 'export', { format: 'dotenv' });
    expect(event.metadata).toEqual({ format: 'dotenv' });
  });

  it('retrieves events by vault', () => {
    const store = createAnalyticsStore();
    recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    recordEvent(store, 'vault-2', 'actor-1', 'secret_write');
    recordEvent(store, 'vault-1', 'actor-2', 'vault_access');
    const events = getEventsForVault(store, 'vault-1');
    expect(events).toHaveLength(2);
    expect(events.every(e => e.vaultId === 'vault-1')).toBe(true);
  });

  it('retrieves events by actor', () => {
    const store = createAnalyticsStore();
    recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    recordEvent(store, 'vault-2', 'actor-2', 'secret_write');
    recordEvent(store, 'vault-3', 'actor-1', 'key_rotation');
    const events = getEventsForActor(store, 'actor-1');
    expect(events).toHaveLength(2);
    expect(events.every(e => e.actorId === 'actor-1')).toBe(true);
  });

  it('summarizes events for a vault within a time period', () => {
    const store = createAnalyticsStore();
    const base = Date.now();
    recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    recordEvent(store, 'vault-1', 'actor-2', 'secret_read');
    recordEvent(store, 'vault-1', 'actor-1', 'secret_write');
    const summary = summarizeVault(store, 'vault-1', base - 1000, base + 10000);
    expect(summary.totalEvents).toBe(3);
    expect(summary.eventCounts['secret_read']).toBe(2);
    expect(summary.eventCounts['secret_write']).toBe(1);
    expect(summary.uniqueActors).toBe(2);
  });

  it('excludes events outside the time period in summary', () => {
    const store = createAnalyticsStore();
    recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    const summary = summarizeVault(store, 'vault-1', Date.now() + 5000, Date.now() + 10000);
    expect(summary.totalEvents).toBe(0);
  });

  it('clears events for a vault and returns count', () => {
    const store = createAnalyticsStore();
    recordEvent(store, 'vault-1', 'actor-1', 'secret_read');
    recordEvent(store, 'vault-1', 'actor-2', 'secret_write');
    recordEvent(store, 'vault-2', 'actor-1', 'vault_access');
    const deleted = clearEventsForVault(store, 'vault-1');
    expect(deleted).toBe(2);
    expect(getEventsForVault(store, 'vault-1')).toHaveLength(0);
    expect(getEventsForVault(store, 'vault-2')).toHaveLength(1);
  });
});
