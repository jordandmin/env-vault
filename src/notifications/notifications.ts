import { randomUUID } from 'crypto';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationPayload,
  NotificationStore,
  NotificationSubscription,
} from './notifications.types';

export function createNotificationStore(): NotificationStore {
  return { subscriptions: new Map() };
}

export function subscribe(
  store: NotificationStore,
  vaultId: string,
  actorId: string,
  channel: NotificationChannel,
  events: NotificationEvent[],
  destination: string
): NotificationSubscription {
  const subscription: NotificationSubscription = {
    id: randomUUID(),
    vaultId,
    actorId,
    channel,
    events,
    destination,
    createdAt: new Date(),
  };
  store.subscriptions.set(subscription.id, subscription);
  return subscription;
}

export function unsubscribe(store: NotificationStore, subscriptionId: string): boolean {
  return store.subscriptions.delete(subscriptionId);
}

export function getSubscriptionsForVault(
  store: NotificationStore,
  vaultId: string
): NotificationSubscription[] {
  return Array.from(store.subscriptions.values()).filter((s) => s.vaultId === vaultId);
}

export function getSubscriptionsForActor(
  store: NotificationStore,
  actorId: string
): NotificationSubscription[] {
  return Array.from(store.subscriptions.values()).filter((s) => s.actorId === actorId);
}

/**
 * Returns the subscription with the given ID, or undefined if not found.
 */
export function getSubscriptionById(
  store: NotificationStore,
  subscriptionId: string
): NotificationSubscription | undefined {
  return store.subscriptions.get(subscriptionId);
}

export async function dispatch(
  store: NotificationStore,
  payload: NotificationPayload,
  sender?: (sub: NotificationSubscription, payload: NotificationPayload) => Promise<void>
): Promise<void> {
  const matching = Array.from(store.subscriptions.values()).filter(
    (s) => s.vaultId === payload.vaultId && s.events.includes(payload.event)
  );

  for (const sub of matching) {
    if (sender) {
      await sender(sub, payload);
    } else if (sub.channel === 'console') {
      console.log(
        `[notification] event=${payload.event} vault=${payload.vaultId} actor=${payload.actorId}`,
        payload.details
      );
    }
  }
}
