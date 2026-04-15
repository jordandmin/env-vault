import { AnalyticsEvent, AnalyticsEventType, AnalyticsSummary, AnalyticsStore } from './analytics.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createAnalyticsStore(): AnalyticsStore {
  return { events: new Map() };
}

export function recordEvent(
  store: AnalyticsStore,
  vaultId: string,
  actorId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: generateId(),
    vaultId,
    actorId,
    eventType,
    timestamp: now(),
    metadata,
  };
  store.events.set(event.id, event);
  return event;
}

export function getEventsForVault(
  store: AnalyticsStore,
  vaultId: string
): AnalyticsEvent[] {
  return Array.from(store.events.values()).filter(e => e.vaultId === vaultId);
}

export function getEventsForActor(
  store: AnalyticsStore,
  actorId: string
): AnalyticsEvent[] {
  return Array.from(store.events.values()).filter(e => e.actorId === actorId);
}

export function summarizeVault(
  store: AnalyticsStore,
  vaultId: string,
  periodStart: number,
  periodEnd: number
): AnalyticsSummary {
  const events = getEventsForVault(store, vaultId).filter(
    e => e.timestamp >= periodStart && e.timestamp <= periodEnd
  );

  const eventCounts = {} as Record<AnalyticsEventType, number>;
  const actors = new Set<string>();

  for (const event of events) {
    eventCounts[event.eventType] = (eventCounts[event.eventType] ?? 0) + 1;
    actors.add(event.actorId);
  }

  return {
    vaultId,
    totalEvents: events.length,
    eventCounts,
    uniqueActors: actors.size,
    periodStart,
    periodEnd,
  };
}

export function clearEventsForVault(
  store: AnalyticsStore,
  vaultId: string
): number {
  const toDelete = Array.from(store.events.values())
    .filter(e => e.vaultId === vaultId)
    .map(e => e.id);
  toDelete.forEach(id => store.events.delete(id));
  return toDelete.length;
}
