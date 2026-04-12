import {
  ComponentHealth,
  HealthCheckFn,
  HealthCheckStore,
  HealthReport,
  HealthStatus,
} from './healthcheck.types';

export function createHealthCheckStore(): HealthCheckStore {
  return { checks: new Map() };
}

export function registerCheck(
  store: HealthCheckStore,
  name: string,
  fn: HealthCheckFn
): void {
  store.checks.set(name, fn);
}

export function deregisterCheck(
  store: HealthCheckStore,
  name: string
): boolean {
  return store.checks.delete(name);
}

export async function runChecks(
  store: HealthCheckStore
): Promise<HealthReport> {
  const results: ComponentHealth[] = await Promise.all(
    Array.from(store.checks.values()).map((fn) =>
      fn().catch(
        (err): ComponentHealth => ({
          name: 'unknown',
          status: 'unhealthy',
          message: err instanceof Error ? err.message : String(err),
          checkedAt: Date.now(),
        })
      )
    )
  );

  const overallStatus = deriveOverallStatus(results);

  return {
    status: overallStatus,
    components: results,
    generatedAt: Date.now(),
  };
}

export async function runCheck(
  store: HealthCheckStore,
  name: string
): Promise<ComponentHealth | null> {
  const fn = store.checks.get(name);
  if (!fn) return null;
  return fn().catch(
    (err): ComponentHealth => ({
      name,
      status: 'unhealthy',
      message: err instanceof Error ? err.message : String(err),
      checkedAt: Date.now(),
    })
  );
}

function deriveOverallStatus(components: ComponentHealth[]): HealthStatus {
  if (components.some((c) => c.status === 'unhealthy')) return 'unhealthy';
  if (components.some((c) => c.status === 'degraded')) return 'degraded';
  return 'healthy';
}
