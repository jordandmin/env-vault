export type Priority = 'critical' | 'high' | 'normal' | 'low';

export interface QueuedItem<T> {
  id: string;
  vaultId: string;
  payload: T;
  priority: Priority;
  enqueuedAt: number;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export interface PriorityQueueStore<T> {
  items: Map<string, QueuedItem<T>>;
}

export function createPriorityQueueStore<T>(): PriorityQueueStore<T> {
  return { items: new Map() };
}

export function enqueue<T>(
  store: PriorityQueueStore<T>,
  vaultId: string,
  payload: T,
  priority: Priority = 'normal'
): QueuedItem<T> {
  const item: QueuedItem<T> = {
    id: generateId(),
    vaultId,
    payload,
    priority,
    enqueuedAt: now(),
  };
  store.items.set(item.id, item);
  return item;
}

export function dequeue<T>(store: PriorityQueueStore<T>, vaultId: string): QueuedItem<T> | null {
  const candidates = Array.from(store.items.values()).filter(
    (item) => item.vaultId === vaultId
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return pd !== 0 ? pd : a.enqueuedAt - b.enqueuedAt;
  });

  const next = candidates[0];
  store.items.delete(next.id);
  return next;
}

export function peek<T>(store: PriorityQueueStore<T>, vaultId: string): QueuedItem<T> | null {
  const candidates = Array.from(store.items.values()).filter(
    (item) => item.vaultId === vaultId
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return pd !== 0 ? pd : a.enqueuedAt - b.enqueuedAt;
  });

  return candidates[0];
}

export function listForVault<T>(store: PriorityQueueStore<T>, vaultId: string): QueuedItem<T>[] {
  return Array.from(store.items.values())
    .filter((item) => item.vaultId === vaultId)
    .sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return pd !== 0 ? pd : a.enqueuedAt - b.enqueuedAt;
    });
}

export function removeItem<T>(store: PriorityQueueStore<T>, id: string): boolean {
  return store.items.delete(id);
}

export function queueSize<T>(store: PriorityQueueStore<T>, vaultId: string): number {
  return Array.from(store.items.values()).filter((item) => item.vaultId === vaultId).length;
}
