/**
 * Reconciliation module for env-vault.
 *
 * Compares the current state of secrets in a vault against an expected
 * (desired) state and produces a diff of actions needed to bring the
 * vault into alignment. Useful for GitOps-style workflows where a
 * source-of-truth definition is applied to live vaults.
 */

import { SecretStore } from '../secrets/secrets';

export type ReconcileAction =
  | { type: 'create'; key: string; desiredValue: string }
  | { type: 'update'; key: string; currentValue: string; desiredValue: string }
  | { type: 'delete'; key: string; currentValue: string };

export interface ReconcileResult {
  vaultId: string;
  actions: ReconcileAction[];
  inSync: boolean;
  reconciledAt: number;
}

export interface ReconcileStore {
  /** Most recent reconcile result per vault. */
  results: Map<string, ReconcileResult>;
}

/** Create a fresh reconcile store. */
export function createReconcileStore(): ReconcileStore {
  return { results: new Map() };
}

/**
 * Compute the set of actions required to make the vault's secrets match
 * the desired state.
 *
 * @param store       - The reconcile store used to persist results.
 * @param secretStore - Live secret store for the vault.
 * @param vaultId     - Identifier of the vault being reconciled.
 * @param desired     - Map of key → plaintext value representing desired state.
 * @returns A ReconcileResult describing what must change.
 */
export function reconcile(
  store: ReconcileStore,
  secretStore: SecretStore,
  vaultId: string,
  desired: Record<string, string>
): ReconcileResult {
  const actions: ReconcileAction[] = [];

  // Collect current keys for this vault.
  const currentKeys = new Set<string>();
  for (const storeKey of secretStore.secrets.keys()) {
    // Store keys are formatted as "<vaultId>:<key>" (see makeStoreKey in secrets.ts).
    const prefix = `${vaultId}:`;
    if (storeKey.startsWith(prefix)) {
      currentKeys.add(storeKey.slice(prefix.length));
    }
  }

  // Detect creates and updates.
  for (const [key, desiredValue] of Object.entries(desired)) {
    const storeKey = `${vaultId}:${key}`;
    const entry = secretStore.secrets.get(storeKey);
    if (!entry) {
      actions.push({ type: 'create', key, desiredValue });
    } else if (entry.value !== desiredValue) {
      actions.push({
        type: 'update',
        key,
        currentValue: entry.value,
        desiredValue,
      });
    }
  }

  // Detect deletes — keys present in vault but absent from desired state.
  for (const key of currentKeys) {
    if (!(key in desired)) {
      const storeKey = `${vaultId}:${key}`;
      const entry = secretStore.secrets.get(storeKey);
      actions.push({
        type: 'delete',
        key,
        currentValue: entry ? entry.value : '',
      });
    }
  }

  const result: ReconcileResult = {
    vaultId,
    actions,
    inSync: actions.length === 0,
    reconciledAt: Date.now(),
  };

  store.results.set(vaultId, result);
  return result;
}

/**
 * Retrieve the most recent reconcile result for a vault, if any.
 */
export function getLastResult(
  store: ReconcileStore,
  vaultId: string
): ReconcileResult | undefined {
  return store.results.get(vaultId);
}
