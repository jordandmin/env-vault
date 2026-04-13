/**
 * Circuit breaker for vault operations.
 * Prevents cascading failures by tracking error rates and tripping open.
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitPolicy {
  vaultId: string;
  failureThreshold: number;  // number of failures before opening
  successThreshold: number;  // successes needed in half-open to close
  cooldownMs: number;        // time in open state before going half-open
}

export interface CircuitStatus {
  vaultId: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
  trippedAt: number | null;
}

export interface CircuitStore {
  policies: Map<string, CircuitPolicy>;
  statuses: Map<string, CircuitStatus>;
}

const now = () => Date.now();

export function createCircuitStore(): CircuitStore {
  return { policies: new Map(), statuses: new Map() };
}

export function setPolicy(store: CircuitStore, policy: CircuitPolicy): void {
  store.policies.set(policy.vaultId, policy);
  if (!store.statuses.has(policy.vaultId)) {
    store.statuses.set(policy.vaultId, {
      vaultId: policy.vaultId,
      state: "closed",
      failures: 0,
      successes: 0,
      lastFailureAt: null,
      trippedAt: null,
    });
  }
}

export function getStatus(store: CircuitStore, vaultId: string): CircuitStatus | undefined {
  return store.statuses.get(vaultId);
}

export function recordSuccess(store: CircuitStore, vaultId: string): void {
  const status = store.statuses.get(vaultId);
  const policy = store.policies.get(vaultId);
  if (!status || !policy) return;

  if (status.state === "half-open") {
    status.successes += 1;
    if (status.successes >= policy.successThreshold) {
      status.state = "closed";
      status.failures = 0;
      status.successes = 0;
      status.trippedAt = null;
    }
  } else if (status.state === "closed") {
    status.failures = 0;
  }
}

export function recordFailure(store: CircuitStore, vaultId: string): void {
  const status = store.statuses.get(vaultId);
  const policy = store.policies.get(vaultId);
  if (!status || !policy) return;

  status.lastFailureAt = now();

  if (status.state === "half-open") {
    status.state = "open";
    status.trippedAt = now();
    status.successes = 0;
    return;
  }

  if (status.state === "closed") {
    status.failures += 1;
    if (status.failures >= policy.failureThreshold) {
      status.state = "open";
      status.trippedAt = now();
    }
  }
}

export function checkCircuit(store: CircuitStore, vaultId: string): boolean {
  const status = store.statuses.get(vaultId);
  const policy = store.policies.get(vaultId);
  if (!status || !policy) return true; // allow if no policy configured

  if (status.state === "closed") return true;

  if (status.state === "open") {
    const elapsed = now() - (status.trippedAt ?? 0);
    if (elapsed >= policy.cooldownMs) {
      status.state = "half-open";
      status.successes = 0;
      return true;
    }
    return false;
  }

  // half-open: allow probe request
  return true;
}
