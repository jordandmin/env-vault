import { createHmac, randomUUID } from 'crypto';
import {
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
  WebhookStore,
} from './webhook.types';

export function createWebhookStore(): WebhookStore {
  return {
    endpoints: new Map(),
    deliveries: new Map(),
  };
}

export function registerEndpoint(
  store: WebhookStore,
  vaultId: string,
  url: string,
  secret: string,
  events: WebhookEvent[]
): WebhookEndpoint {
  const endpoint: WebhookEndpoint = {
    id: randomUUID(),
    vaultId,
    url,
    secret,
    events,
    createdAt: Date.now(),
    active: true,
  };
  store.endpoints.set(endpoint.id, endpoint);
  return endpoint;
}

export function deactivateEndpoint(
  store: WebhookStore,
  endpointId: string
): boolean {
  const endpoint = store.endpoints.get(endpointId);
  if (!endpoint) return false;
  store.endpoints.set(endpointId, { ...endpoint, active: false });
  return true;
}

export function getEndpointsForVault(
  store: WebhookStore,
  vaultId: string
): WebhookEndpoint[] {
  return Array.from(store.endpoints.values()).filter(
    (e) => e.vaultId === vaultId && e.active
  );
}

export function signPayload(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function recordDelivery(
  store: WebhookStore,
  endpointId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  statusCode: number | null,
  success: boolean
): WebhookDelivery {
  const delivery: WebhookDelivery = {
    id: randomUUID(),
    endpointId,
    event,
    payload,
    statusCode,
    deliveredAt: Date.now(),
    success,
  };
  store.deliveries.set(delivery.id, delivery);
  return delivery;
}

export function getDeliveriesForEndpoint(
  store: WebhookStore,
  endpointId: string
): WebhookDelivery[] {
  return Array.from(store.deliveries.values()).filter(
    (d) => d.endpointId === endpointId
  );
}
