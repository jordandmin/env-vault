/**
 * Redaction module — strips or replaces sensitive values before logging/display.
 */

export interface RedactPolicy {
  vaultId: string;
  patterns: string[]; // regex patterns to match keys
  replacement: string; // e.g. "[REDACTED]"
}

export interface RedactStore {
  policies: Map<string, RedactPolicy>; // keyed by vaultId
}

export function createRedactStore(): RedactStore {
  return { policies: new Map() };
}

export function setRedactPolicy(
  store: RedactStore,
  policy: RedactPolicy
): void {
  store.policies.set(policy.vaultId, policy);
}

export function getRedactPolicy(
  store: RedactStore,
  vaultId: string
): RedactPolicy | undefined {
  return store.policies.get(vaultId);
}

export function redactValue(
  store: RedactStore,
  vaultId: string,
  key: string,
  value: string
): string {
  const policy = store.policies.get(vaultId);
  if (!policy) return value;
  const matches = policy.patterns.some((p) => new RegExp(p, "i").test(key));
  return matches ? policy.replacement : value;
}

export function redactRecord(
  store: RedactStore,
  vaultId: string,
  record: Record<string, string>
): Record<string, string> {
  const policy = store.policies.get(vaultId);
  if (!policy) return { ...record };
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [
      k,
      policy.patterns.some((p) => new RegExp(p, "i").test(k))
        ? policy.replacement
        : v,
    ])
  );
}

export function removeRedactPolicy(
  store: RedactStore,
  vaultId: string
): boolean {
  return store.policies.delete(vaultId);
}
