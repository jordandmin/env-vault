export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventBusStore {
  handlers: Map<string, Set<EventHandler>>;
}

export function createEventBusStore(): EventBusStore {
  return { handlers: new Map() };
}

export function subscribe<T = unknown>(
  store: EventBusStore,
  event: string,
  handler: EventHandler<T>
): () => void {
  if (!store.handlers.has(event)) {
    store.handlers.set(event, new Set());
  }
  store.handlers.get(event)!.add(handler as EventHandler);
  return () => unsubscribe(store, event, handler);
}

export function unsubscribe<T = unknown>(
  store: EventBusStore,
  event: string,
  handler: EventHandler<T>
): void {
  store.handlers.get(event)?.delete(handler as EventHandler);
}

export async function publish<T = unknown>(
  store: EventBusStore,
  event: string,
  payload: T
): Promise<void> {
  const handlers = store.handlers.get(event);
  if (!handlers || handlers.size === 0) return;
  await Promise.all([...handlers].map((h) => h(payload)));
}

export function getSubscriberCount(store: EventBusStore, event: string): number {
  return store.handlers.get(event)?.size ?? 0;
}

export function clearEvent(store: EventBusStore, event: string): void {
  store.handlers.delete(event);
}

export function clearAll(store: EventBusStore): void {
  store.handlers.clear();
}
