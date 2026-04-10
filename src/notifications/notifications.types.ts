export type NotificationChannel = 'email' | 'webhook' | 'console';

export type NotificationEvent =
  | 'secret.created'
  | 'secret.updated'
  | 'secret.deleted'
  | 'member.added'
  | 'member.removed'
  | 'key.rotated'
  | 'key.revoked'
  | 'access.granted'
  | 'access.revoked';

export interface NotificationSubscription {
  id: string;
  vaultId: string;
  actorId: string;
  channel: NotificationChannel;
  events: NotificationEvent[];
  destination: string; // email address, webhook URL, or 'stdout'
  createdAt: Date;
}

export interface NotificationPayload {
  event: NotificationEvent;
  vaultId: string;
  actorId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface NotificationStore {
  subscriptions: Map<string, NotificationSubscription>;
}
