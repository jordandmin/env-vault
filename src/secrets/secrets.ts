import { randomUUID } from 'crypto';
import { encrypt, decrypt } from '../crypto/encryption';
import {
  Secret,
  SecretStore,
  CreateSecretInput,
  UpdateSecretInput,
  SecretResult,
} from './secrets.types';

export function createSecretStore(): SecretStore {
  return { secrets: new Map() };
}

function makeStoreKey(vaultId: string, key: string): string {
  return `${vaultId}:${key}`;
}

export async function setSecret(
  store: SecretStore,
  input: CreateSecretInput,
  masterPassword: string
): Promise<Secret> {
  const storeKey = makeStoreKey(input.vaultId, input.key);
  const existing = store.secrets.get(storeKey);
  const encryptedValue = await encrypt(input.value, masterPassword);
  const now = new Date();

  const secret: Secret = {
    id: existing?.id ?? randomUUID(),
    vaultId: input.vaultId,
    key: input.key,
    encryptedValue,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? input.actorId,
    version: (existing?.version ?? 0) + 1,
  };

  store.secrets.set(storeKey, secret);
  return secret;
}

export async function getSecret(
  store: SecretStore,
  vaultId: string,
  key: string,
  masterPassword: string
): Promise<SecretResult | null> {
  const storeKey = makeStoreKey(vaultId, key);
  const secret = store.secrets.get(storeKey);
  if (!secret) return null;

  const value = await decrypt(secret.encryptedValue, masterPassword);
  return {
    id: secret.id,
    vaultId: secret.vaultId,
    key: secret.key,
    value,
    version: secret.version,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}

export function deleteSecret(
  store: SecretStore,
  vaultId: string,
  key: string
): boolean {
  const storeKey = makeStoreKey(vaultId, key);
  return store.secrets.delete(storeKey);
}

export function listSecrets(
  store: SecretStore,
  vaultId: string
): Pick<Secret, 'id' | 'key' | 'version' | 'updatedAt' | 'createdBy'>[] {
  const results: Pick<Secret, 'id' | 'key' | 'version' | 'updatedAt' | 'createdBy'>[] = [];
  for (const secret of store.secrets.values()) {
    if (secret.vaultId === vaultId) {
      results.push({
        id: secret.id,
        key: secret.key,
        version: secret.version,
        updatedAt: secret.updatedAt,
        createdBy: secret.createdBy,
      });
    }
  }
  return results;
}
