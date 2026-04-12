export type WebhookEvent =
  | 'secret.created'
  | 'secret.updated'
  | 'secret.deleted'
  | 'member.added'
  | 'member.removed'
  | 'key.rotated'
  | 'access.granted'
  | 'access.revoked';

export interface WebhookEndpoint {
  id: string;
  vaultId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  createdAt: number;
  active: boolean;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  statusCode: number | null;
  deliveredAt: number | null;
  success: boolean;
}

export interface WebhookStore {
  endpoints: Map<string, WebhookEndpoint>;
  deliveries: Map<string, WebhookDelivery>;
}
