/**
 * Cooldown — enforces a minimum wait period between repeated actions
 * per (vaultId, actor, action) triple.
 */

export interface CooldownPolicy {
  vaultId: string;
  action: string;
  cooldownMs: number;
}

export interface CooldownRecord {
  lastTriggeredAt: number;
}

export interface CooldownStore {
  policies: Map<string, CooldownPolicy>;
  records: Map<string, CooldownRecord>;
}

function makePolicyKey(vaultId: string, action: string): string {
  return `${vaultId}::${action}`;
}

function makeRecordKey(vaultId: string, actor: string, action: string): string {
  return `${vaultId}::${actor}::${action}`;
}

function now(): number {
  return Date.now();
}

export function createCooldownStore(): CooldownStore {
  return {
    policies: new Map(),
    records: new Map(),
  };
}

export function setPolicy(
  store: CooldownStore,
  policy: CooldownPolicy
): void {
  store.policies.set(makePolicyKey(policy.vaultId, policy.action), policy);
}

export function getPolicy(
  store: CooldownStore,
  vaultId: string,
  action: string
): CooldownPolicy | undefined {
  return store.policies.get(makePolicyKey(vaultId, action));
}

export function removePolicy(
  store: CooldownStore,
  vaultId: string,
  action: string
): void {
  store.policies.delete(makePolicyKey(vaultId, action));
}

/**
 * Returns true if the actor is allowed to perform the action now.
 * Records the trigger timestamp when allowed.
 */
export function checkCooldown(
  store: CooldownStore,
  vaultId: string,
  actor: string,
  action: string
): { allowed: boolean; retryAfterMs?: number } {
  const policy = getPolicy(store, vaultId, action);
  if (!policy) return { allowed: true };

  const key = makeRecordKey(vaultId, actor, action);
  const record = store.records.get(key);
  const current = now();

  if (record) {
    const elapsed = current - record.lastTriggeredAt;
    if (elapsed < policy.cooldownMs) {
      return { allowed: false, retryAfterMs: policy.cooldownMs - elapsed };
    }
  }

  store.records.set(key, { lastTriggeredAt: current });
  return { allowed: true };
}

export function resetCooldown(
  store: CooldownStore,
  vaultId: string,
  actor: string,
  action: string
): void {
  store.records.delete(makeRecordKey(vaultId, actor, action));
}
