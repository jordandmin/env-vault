import {
  createReplayStore,
  createReplayJob,
  runReplay,
  getJob,
  listJobsForVault,
  cancelJob,
} from './replay';
import { AuditEntry } from '../audit/audit.types';

const BASE_TIME = 1_000_000;

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'e1',
    vaultId: 'vault-1',
    actorId: 'user-1',
    action: 'secret.read',
    timestamp: BASE_TIME + 100,
    metadata: {},
    ...overrides,
  };
}

describe('replay', () => {
  it('creates a replay job in pending state', () => {
    const store = createReplayStore();
    const job = createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 1000);
    expect(job.status).toBe('pending');
    expect(job.vaultId).toBe('vault-1');
    expect(job.processedEvents).toBe(0);
  });

  it('throws if fromTimestamp >= toTimestamp', () => {
    const store = createReplayStore();
    expect(() => createReplayJob(store, 'v', 'u', 500, 500)).toThrow();
  });

  it('runs replay and processes matching entries', () => {
    const store = createReplayStore();
    const job = createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 1000);
    const entries = [
      makeEntry({ id: 'e1', timestamp: BASE_TIME + 100 }),
      makeEntry({ id: 'e2', timestamp: BASE_TIME + 200 }),
      makeEntry({ id: 'e3', vaultId: 'vault-2', timestamp: BASE_TIME + 300 }),
    ];
    const seen: string[] = [];
    const result = runReplay(store, job.id, entries, { vaultId: 'vault-1', fromTimestamp: BASE_TIME, toTimestamp: BASE_TIME + 1000 }, (e) => seen.push(e.id));
    expect(result.status).toBe('completed');
    expect(result.processedEvents).toBe(2);
    expect(seen).toEqual(['e1', 'e2']);
  });

  it('marks job as failed when handler throws', () => {
    const store = createReplayStore();
    const job = createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 1000);
    const entries = [makeEntry()];
    const result = runReplay(store, job.id, entries, { vaultId: 'vault-1', fromTimestamp: BASE_TIME, toTimestamp: BASE_TIME + 1000 }, () => { throw new Error('handler error'); });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('handler error');
  });

  it('lists jobs for a vault', () => {
    const store = createReplayStore();
    createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 500);
    createReplayJob(store, 'vault-1', 'user-2', BASE_TIME, BASE_TIME + 500);
    createReplayJob(store, 'vault-2', 'user-1', BASE_TIME, BASE_TIME + 500);
    expect(listJobsForVault(store, 'vault-1')).toHaveLength(2);
  });

  it('cancels a pending job', () => {
    const store = createReplayStore();
    const job = createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 500);
    const cancelled = cancelJob(store, job.id);
    expect(cancelled.status).toBe('failed');
    expect(cancelled.error).toMatch(/cancelled/i);
  });

  it('throws when cancelling a non-pending job', () => {
    const store = createReplayStore();
    const job = createReplayJob(store, 'vault-1', 'user-1', BASE_TIME, BASE_TIME + 500);
    runReplay(store, job.id, [], { vaultId: 'vault-1', fromTimestamp: BASE_TIME, toTimestamp: BASE_TIME + 500 }, () => {});
    expect(() => cancelJob(store, job.id)).toThrow();
  });

  it('returns undefined for unknown job', () => {
    const store = createReplayStore();
    expect(getJob(store, 'nonexistent')).toBeUndefined();
  });
});
