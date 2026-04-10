import { randomUUID } from "crypto";
import { encrypt, decrypt } from "../crypto/encryption";
import {
  Secret,
  SecretStore,
  CreateSecretInput,
  UpdateSecretInput,
  GetSecretResult,
} from "./secrets.types";

export function createSecretStore(): SecretStore {
  return { secrets: new Map() };
}

export function makeStoreKey(vaultId: string, key: string): string {
  return `${vaultId}::${key}`;
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
    metadata: {
      createdAt: existing?.metadata.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.metadata.createdBy ?? input.createdBy,
      version: (existing?.metadata.version ?? 0) + 1,
      tags: input.tags ?? existing?.metadata.tags,
    },
  };

  store.secrets.set(storeKey, secret);
  return secret;
}

export async function getSecret(
  store: SecretStore,
  vaultId: string,
  key: string,
  masterPassword: string
): Promise<GetSecretResult> {
  const storeKey = makeStoreKey(vaultId, key);
  const secret = store.secrets.get(storeKey);
  if (!secret) return { found: false };

  const decryptedValue = await decrypt(secret.encryptedValue, masterPassword);
  return {
    found: true,
    secret: { ...secret, encryptedValue: decryptedValue },
  };
}

export async function updateSecret(
  store: SecretStore,
  vaultId: string,
  key: string,
  input: UpdateSecretInput,
  masterPassword: string
): Promise<Secret | null> {
  const storeKey = makeStoreKey(vaultId, key);
  const existing = store.secrets.get(storeKey);
  if (!existing) return null;

  const encryptedValue = await encrypt(input.value, masterPassword);
  const updated: Secret = {
    ...existing,
    encryptedValue,
    metadata: {
      ...existing.metadata,
      updatedAt: new Date(),
      version: existing.metadata.version + 1,
      tags: input.tags ?? existing.metadata.tags,
    },
  };

  store.secrets.set(storeKey, updated);
  return updated;
}

export function deleteSecret(
  store: SecretStore,
  vaultId: string,
  key: string
): boolean {
  const storeKey = makeStoreKey(vaultId, key);
  return store.secrets.delete(storeKey);
}

export function listSecrets(store: SecretStore, vaultId: string): Secret[] {
  return Array.from(store.secrets.values()).filter(
    (s) => s.vaultId === vaultId
  );
}
