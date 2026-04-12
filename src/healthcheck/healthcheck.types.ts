export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: number;
}

export interface HealthReport {
  status: HealthStatus;
  components: ComponentHealth[];
  generatedAt: number;
}

export type HealthCheckFn = () => Promise<ComponentHealth>;

export interface HealthCheckStore {
  checks: Map<string, HealthCheckFn>;
}
