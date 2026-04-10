import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Secret, SecretStore, SecretMetadata } from './secrets.types';

export function createSecretStore(): SecretStore {
  const secrets = new Map<string, Secret>();
  return { secrets };
}

export function makeStoreKey(vaultId: string, name: string): string {
  return `${vaultId}:${name}`;
}

export function setSecret(
  store: SecretStore,
  vaultId: string,
  name: string,
  value: string,
  actor: string,
  metadata?: Partial<SecretMetadata>
): Secret {
  const key = makeStoreKey(vaultId, name);
  const now = new Date().toISOString();
  const existing = store.secrets.get(key);

  const secret: Secret = {
    id: existing?.id ?? crypto.randomUUID(),
    vaultId,
    name,
    value,
    version: (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? actor,
    updatedBy: actor,
    tags: metadata?.tags ?? existing?.tags ?? [],
    description: metadata?.description ?? existing?.description,
  };

  store.secrets.set(key, secret);
  return secret;
}

export function getSecret(
  store: SecretStore,
  vaultId: string,
  name: string
): Secret | undefined {
  return store.secrets.get(makeStoreKey(vaultId, name));
}

export function deleteSecret(
  store: SecretStore,
  vaultId: string,
  name: string
): boolean {
  return store.secrets.delete(makeStoreKey(vaultId, name));
}

export function listSecrets(
  store: SecretStore,
  vaultId: string
): Secret[] {
  const results: Secret[] = [];
  for (const [key, secret] of store.secrets.entries()) {
    if (key.startsWith(`${vaultId}:`)) {
      results.push(secret);
    }
  }
  return results;
}

export function secretExists(
  store: SecretStore,
  vaultId: string,
  name: string
): boolean {
  return store.secrets.has(makeStoreKey(vaultId, name));
}

export function bulkSetSecrets(
  store: SecretStore,
  vaultId: string,
  entries: Array<{ name: string; value: string }>,
  actor: string
): Secret[] {
  return entries.map(({ name, value }) =>
    setSecret(store, vaultId, name, value, actor)
  );
}
