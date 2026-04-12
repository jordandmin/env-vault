export type ReplayStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ReplayJob {
  id: string;
  vaultId: string;
  actorId: string;
  fromTimestamp: number;
  toTimestamp: number;
  status: ReplayStatus;
  processedEvents: number;
  totalEvents: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface ReplayStore {
  jobs: Map<string, ReplayJob>;
}

export interface ReplayFilter {
  vaultId: string;
  fromTimestamp: number;
  toTimestamp: number;
  actorId?: string;
  action?: string;
}
