import {
  createHealthCheckStore,
  deregisterCheck,
  registerCheck,
  runCheck,
  runChecks,
} from './healthcheck';
import { ComponentHealth } from './healthcheck.types';

const makeOkCheck = (name: string): (() => Promise<ComponentHealth>) =>
  async () => ({
    name,
    status: 'healthy',
    latencyMs: 5,
    checkedAt: Date.now(),
  });

const makeDegradedCheck = (name: string): (() => Promise<ComponentHealth>) =>
  async () => ({
    name,
    status: 'degraded',
    message: 'slow response',
    checkedAt: Date.now(),
  });

const makeFailingCheck = (name: string): (() => Promise<ComponentHealth>) =>
  async () => { throw new Error('connection refused'); };

describe('healthcheck', () => {
  it('reports healthy when all checks pass', async () => {
    const store = createHealthCheckStore();
    registerCheck(store, 'vault', makeOkCheck('vault'));
    registerCheck(store, 'crypto', makeOkCheck('crypto'));
    const report = await runChecks(store);
    expect(report.status).toBe('healthy');
    expect(report.components).toHaveLength(2);
  });

  it('reports degraded when any check is degraded', async () => {
    const store = createHealthCheckStore();
    registerCheck(store, 'vault', makeOkCheck('vault'));
    registerCheck(store, 'db', makeDegradedCheck('db'));
    const report = await runChecks(store);
    expect(report.status).toBe('degraded');
  });

  it('reports unhealthy when any check throws', async () => {
    const store = createHealthCheckStore();
    registerCheck(store, 'vault', makeOkCheck('vault'));
    registerCheck(store, 'db', makeFailingCheck('db'));
    const report = await runChecks(store);
    expect(report.status).toBe('unhealthy');
  });

  it('runCheck returns null for unknown check', async () => {
    const store = createHealthCheckStore();
    const result = await runCheck(store, 'nonexistent');
    expect(result).toBeNull();
  });

  it('runCheck returns result for known check', async () => {
    const store = createHealthCheckStore();
    registerCheck(store, 'vault', makeOkCheck('vault'));
    const result = await runCheck(store, 'vault');
    expect(result?.status).toBe('healthy');
  });

  it('deregisterCheck removes a check', async () => {
    const store = createHealthCheckStore();
    registerCheck(store, 'vault', makeOkCheck('vault'));
    const removed = deregisterCheck(store, 'vault');
    expect(removed).toBe(true);
    const report = await runChecks(store);
    expect(report.components).toHaveLength(0);
  });

  it('returns empty healthy report with no checks', async () => {
    const store = createHealthCheckStore();
    const report = await runChecks(store);
    expect(report.status).toBe('healthy');
    expect(report.components).toHaveLength(0);
  });
});
