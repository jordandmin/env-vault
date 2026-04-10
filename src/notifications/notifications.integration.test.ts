import { createNotificationStore, subscribe, unsubscribe, getSubscriptionsForVault, getSubscriptionsForActor } from './index';

describe('notifications integration', () => {
  const vaultId = 'vault-integration-1';
  const actorId = 'actor-integration-1';

  it('should subscribe and retrieve subscription by vault', () => {
    const store = createNotificationStore();
    subscribe(store, { vaultId, actorId, actions: ['secret.set', 'secret.delete'] });

    const subs = getSubscriptionsForVault(store, vaultId);
    expect(subs).toHaveLength(1);
    expect(subs[0].actorId).toBe(actorId);
    expect(subs[0].actions).toContain('secret.set');
  });

  it('should retrieve subscriptions by actor across multiple vaults', () => {
    const store = createNotificationStore();
    subscribe(store, { vaultId: 'vault-a', actorId, actions: ['secret.set'] });
    subscribe(store, { vaultId: 'vault-b', actorId, actions: ['key.rotate'] });

    const subs = getSubscriptionsForActor(store, actorId);
    expect(subs).toHaveLength(2);
    const vaultIds = subs.map(s => s.vaultId);
    expect(vaultIds).toContain('vault-a');
    expect(vaultIds).toContain('vault-b');
  });

  it('should allow multiple actors to subscribe to the same vault', () => {
    const store = createNotificationStore();
    subscribe(store, { vaultId, actorId: 'actor-1', actions: ['secret.set'] });
    subscribe(store, { vaultId, actorId: 'actor-2', actions: ['secret.delete'] });

    const subs = getSubscriptionsForVault(store, vaultId);
    expect(subs).toHaveLength(2);
  });

  it('should unsubscribe an actor from a vault', () => {
    const store = createNotificationStore();
    subscribe(store, { vaultId, actorId, actions: ['secret.set'] });
    unsubscribe(store, { vaultId, actorId });

    const subs = getSubscriptionsForVault(store, vaultId);
    expect(subs).toHaveLength(0);
  });

  it('should not affect other actors when one unsubscribes', () => {
    const store = createNotificationStore();
    subscribe(store, { vaultId, actorId: 'actor-keep', actions: ['secret.set'] });
    subscribe(store, { vaultId, actorId: 'actor-remove', actions: ['secret.set'] });

    unsubscribe(store, { vaultId, actorId: 'actor-remove' });

    const subs = getSubscriptionsForVault(store, vaultId);
    expect(subs).toHaveLength(1);
    expect(subs[0].actorId).toBe('actor-keep');
  });

  it('should return empty array when no subscriptions exist for a vault', () => {
    const store = createNotificationStore();
    const subs = getSubscriptionsForVault(store, 'nonexistent-vault');
    expect(subs).toEqual([]);
  });
});
