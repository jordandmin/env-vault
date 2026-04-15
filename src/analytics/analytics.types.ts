export type AnalyticsEventType =
  | 'secret_read'
  | 'secret_write'
  | 'secret_delete'
  | 'vault_access'
  | 'key_rotation'
  | 'export'
  | 'import';

export interface AnalyticsEvent {
  id: string;
  vaultId: string;
  actorId: string;
  eventType: AnalyticsEventType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  vaultId: string;
  totalEvents: number;
  eventCounts: Record<AnalyticsEventType, number>;
  uniqueActors: number;
  periodStart: number;
  periodEnd: number;
}

export interface AnalyticsStore {
  events: Map<string, AnalyticsEvent>;
}
