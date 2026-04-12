import {
  createWebhookStore,
  deactivateEndpoint,
  getDeliveriesForEndpoint,
  getEndpointsForVault,
  recordDelivery,
  registerEndpoint,
  signPayload,
} from './webhook';

describe('webhook', () => {
  it('registers an endpoint and retrieves it by vault', () => {
    const store = createWebhookStore();
    const ep = registerEndpoint(store, 'vault-1', 'https://example.com/hook', 'mysecret', ['secret.created']);
    expect(ep.id).toBeDefined();
    expect(ep.active).toBe(true);
    const results = getEndpointsForVault(store, 'vault-1');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/hook');
  });

  it('does not return endpoints for other vaults', () => {
    const store = createWebhookStore();
    registerEndpoint(store, 'vault-1', 'https://a.com', 'sec', ['key.rotated']);
    const results = getEndpointsForVault(store, 'vault-2');
    expect(results).toHaveLength(0);
  });

  it('deactivates an endpoint', () => {
    const store = createWebhookStore();
    const ep = registerEndpoint(store, 'vault-1', 'https://b.com', 'sec', ['member.added']);
    const ok = deactivateEndpoint(store, ep.id);
    expect(ok).toBe(true);
    expect(getEndpointsForVault(store, 'vault-1')).toHaveLength(0);
  });

  it('returns false when deactivating a non-existent endpoint', () => {
    const store = createWebhookStore();
    expect(deactivateEndpoint(store, 'no-such-id')).toBe(false);
  });

  it('signs payload deterministically', () => {
    const sig1 = signPayload('secret', 'body');
    const sig2 = signPayload('secret', 'body');
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = signPayload('secret1', 'body');
    const sig2 = signPayload('secret2', 'body');
    expect(sig1).not.toBe(sig2);
  });

  it('records and retrieves deliveries for an endpoint', () => {
    const store = createWebhookStore();
    const ep = registerEndpoint(store, 'vault-1', 'https://c.com', 'sec', ['secret.deleted']);
    recordDelivery(store, ep.id, 'secret.deleted', { key: 'MY_SECRET' }, 200, true);
    recordDelivery(store, ep.id, 'secret.deleted', { key: 'OTHER' }, 500, false);
    const deliveries = getDeliveriesForEndpoint(store, ep.id);
    expect(deliveries).toHaveLength(2);
    expect(deliveries.some((d) => d.success)).toBe(true);
    expect(deliveries.some((d) => !d.success)).toBe(true);
  });

  it('returns empty deliveries for unknown endpoint', () => {
    const store = createWebhookStore();
    expect(getDeliveriesForEndpoint(store, 'unknown')).toHaveLength(0);
  });
});
