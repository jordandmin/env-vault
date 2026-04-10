import {
  createNotificationStore,
  dispatch,
  getSubscriptionsForActor,
  getSubscriptionsForVault,
  subscribe,
  unsubscribe,
} from './notifications';
import { NotificationPayload } from './notifications.types';

describe('notifications', () => {
  it('creates an empty store', () => {
    const store = createNotificationStore();
    expect(store.subscriptions.size).toBe(0);
  });

  it('subscribes and stores a subscription', () => {
    const store = createNotificationStore();
    const sub = subscribe(store, 'vault-1', 'actor-1', 'console', ['secret.created'], 'stdout');
    expect(sub.id).toBeDefined();
    expect(store.subscriptions.size).toBe(1);
    expect(sub.vaultId).toBe('vault-1');
    expect(sub.events).toContain('secret.created');
  });

  it('unsubscribes successfully', () => {
    const store = createNotificationStore();
    const sub = subscribe(store, 'vault-1', 'actor-1', 'console', ['key.rotated'], 'stdout');
    expect(unsubscribe(store, sub.id)).toBe(true);
    expect(store.subscriptions.size).toBe(0);
  });

  it('returns false when unsubscribing unknown id', () => {
    const store = createNotificationStore();
    expect(unsubscribe(store, 'nonexistent')).toBe(false);
  });

  it('gets subscriptions for vault', () => {
    const store = createNotificationStore();
    subscribe(store, 'vault-1', 'actor-1', 'console', ['secret.created'], 'stdout');
    subscribe(store, 'vault-2', 'actor-2', 'console', ['secret.deleted'], 'stdout');
    const results = getSubscriptionsForVault(store, 'vault-1');
    expect(results).toHaveLength(1);
    expect(results[0].vaultId).toBe('vault-1');
  });

  it('gets subscriptions for actor', () => {
    const store = createNotificationStore();
    subscribe(store, 'vault-1', 'actor-1', 'console', ['member.added'], 'stdout');
    subscribe(store, 'vault-2', 'actor-1', 'console', ['member.removed'], 'stdout');
    subscribe(store, 'vault-1', 'actor-2', 'console', ['key.revoked'], 'stdout');
    const results = getSubscriptionsForActor(store, 'actor-1');
    expect(results).toHaveLength(2);
  });

  it('dispatches to matching subscriptions via custom sender', async () => {
    const store = createNotificationStore();
    subscribe(store, 'vault-1', 'actor-1', 'webhook', ['secret.updated'], 'https://example.com/hook');
    subscribe(store, 'vault-1', 'actor-2', 'webhook', ['secret.created'], 'https://example.com/hook2');

    const received: string[] = [];
    const payload: NotificationPayload = {
      event: 'secret.updated',
      vaultId: 'vault-1',
      actorId: 'actor-1',
      details: { key: 'DB_PASSWORD' },
      timestamp: new Date(),
    };

    await dispatch(store, payload, async (sub) => {
      received.push(sub.actorId);
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toBe('actor-1');
  });

  it('does not dispatch when no subscriptions match event', async () => {
    const store = createNotificationStore();
    subscribe(store, 'vault-1', 'actor-1', 'console', ['key.rotated'], 'stdout');
    const called: boolean[] = [];
    const payload: NotificationPayload = {
      event: 'secret.deleted',
      vaultId: 'vault-1',
      actorId: 'actor-1',
      details: {},
      timestamp: new Date(),
    };
    await dispatch(store, payload, async () => { called.push(true); });
    expect(called).toHaveLength(0);
  });
});
