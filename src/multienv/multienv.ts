/**
 * Multi-environment support: manage secrets across named environments
 * (e.g. development, staging, production) within a single vault.
 */

export type Environment = string;

export interface MultiEnvStore {
  /** vaultId -> Set of environment names */
  envs: Map<string, Set<Environment>>;
  /** "vaultId:env:key" -> value */
  values: Map<string, string>;
}

export function createMultiEnvStore(): MultiEnvStore {
  return {
    envs: new Map(),
    values: new Map(),
  };
}

function makeKey(vaultId: string, env: Environment, key: string): string {
  return `${vaultId}:${env}:${key}`;
}

export function addEnvironment(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment
): void {
  if (!store.envs.has(vaultId)) {
    store.envs.set(vaultId, new Set());
  }
  store.envs.get(vaultId)!.add(env);
}

export function removeEnvironment(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment
): void {
  store.envs.get(vaultId)?.delete(env);
  // Remove all keys for this env
  for (const k of store.values.keys()) {
    if (k.startsWith(`${vaultId}:${env}:`)) {
      store.values.delete(k);
    }
  }
}

export function listEnvironments(
  store: MultiEnvStore,
  vaultId: string
): Environment[] {
  return Array.from(store.envs.get(vaultId) ?? []);
}

export function setEnvSecret(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment,
  key: string,
  value: string
): void {
  if (!store.envs.get(vaultId)?.has(env)) {
    throw new Error(`Environment "${env}" does not exist for vault "${vaultId}"`);
  }
  store.values.set(makeKey(vaultId, env, key), value);
}

export function getEnvSecret(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment,
  key: string
): string | undefined {
  return store.values.get(makeKey(vaultId, env, key));
}

export function deleteEnvSecret(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment,
  key: string
): boolean {
  return store.values.delete(makeKey(vaultId, env, key));
}

export function getSecretsForEnv(
  store: MultiEnvStore,
  vaultId: string,
  env: Environment
): Record<string, string> {
  const prefix = `${vaultId}:${env}:`;
  const result: Record<string, string> = {};
  for (const [k, v] of store.values.entries()) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = v;
    }
  }
  return result;
}

export function promoteSecret(
  store: MultiEnvStore,
  vaultId: string,
  fromEnv: Environment,
  toEnv: Environment,
  key: string
): void {
  const value = getEnvSecret(store, vaultId, fromEnv, key);
  if (value === undefined) {
    throw new Error(`Key "${key}" not found in environment "${fromEnv}"`);
  }
  setEnvSecret(store, vaultId, toEnv, key, value);
}
