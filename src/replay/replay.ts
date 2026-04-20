import { ReplayStore, ReplayJob, ReplayFilter, ReplayStatus } from './replay.types';
import { AuditEntry } from '../audit/audit.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createReplayStore(): ReplayStore {
  return { jobs: new Map() };
}

export function createReplayJob(
  store: ReplayStore,
  vaultId: string,
  actorId: string,
  fromTimestamp: number,
  toTimestamp: number
): ReplayJob {
  if (fromTimestamp >= toTimestamp) {
    throw new Error('fromTimestamp must be before toTimestamp');
  }
  const job: ReplayJob = {
    id: generateId(),
    vaultId,
    actorId,
    fromTimestamp,
    toTimestamp,
    status: 'pending',
    processedEvents: 0,
    totalEvents: 0,
    createdAt: now(),
  };
  store.jobs.set(job.id, job);
  return job;
}

export function runReplay(
  store: ReplayStore,
  jobId: string,
  entries: AuditEntry[],
  filter: ReplayFilter,
  handler: (entry: AuditEntry) => void
): ReplayJob {
  const job = store.jobs.get(jobId);
  if (!job) throw new Error(`Replay job not found: ${jobId}`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} is not in pending state`);

  const matched = entries.filter(
    (e) =>
      e.vaultId === filter.vaultId &&
      e.timestamp >= filter.fromTimestamp &&
      e.timestamp <= filter.toTimestamp &&
      (!filter.actorId || e.actorId === filter.actorId) &&
      (!filter.action || e.action === filter.action)
  );

  job.status = 'running';
  job.totalEvents = matched.length;

  try {
    for (const entry of matched) {
      handler(entry);
      job.processedEvents += 1;
    }
    job.status = 'completed';
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
  }

  job.completedAt = now();
  return job;
}

export function getJob(store: ReplayStore, jobId: string): ReplayJob | undefined {
  return store.jobs.get(jobId);
}

export function listJobsForVault(store: ReplayStore, vaultId: string): ReplayJob[] {
  return Array.from(store.jobs.values()).filter((j) => j.vaultId === vaultId);
}

export function cancelJob(store: ReplayStore, jobId: string): ReplayJob {
  const job = store.jobs.get(jobId);
  if (!job) throw new Error(`Replay job not found: ${jobId}`);
  if (job.status !== 'pending') throw new Error(`Only pending jobs can be cancelled`);
  job.status = 'failed';
  job.error = 'Cancelled by user';
  job.completedAt = now();
  return job;
}

/**
 * Returns a summary of all jobs for a vault grouped by status.
 */
export function getJobStats(
  store: ReplayStore,
  vaultId: string
): Record<ReplayStatus, number> {
  const jobs = listJobsForVault(store, vaultId);
  const stats: Record<ReplayStatus, number> = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const job of jobs) {
    stats[job.status] += 1;
  }
  return stats;
}
