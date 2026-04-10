import { describe, it, expect, beforeEach } from "vitest";
import {
  createSecretStore,
  setSecret,
  getSecret,
  updateSecret,
  deleteSecret,
  listSecrets,
} from "./secrets";
import { SecretStore } from "./secrets.types";

const MASTER_PASSWORD = "test-master-password";
const VAULT_ID = "vault-1";
const ACTOR = "user-1";

describe("secrets", () => {
  let store: SecretStore;

  beforeEach(() => {
    store = createSecretStore();
  });

  it("should set and retrieve a secret", async () => {
    await setSecret(
      store,
      { vaultId: VAULT_ID, key: "DB_URL", value: "postgres://localhost", createdBy: ACTOR },
      MASTER_PASSWORD
    );

    const result = await getSecret(store, VAULT_ID, "DB_URL", MASTER_PASSWORD);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.secret.encryptedValue).toBe("postgres://localhost");
      expect(result.secret.metadata.version).toBe(1);
      expect(result.secret.metadata.createdBy).toBe(ACTOR);
    }
  });

  it("should return not found for missing secret", async () => {
    const result = await getSecret(store, VAULT_ID, "MISSING", MASTER_PASSWORD);
    expect(result.found).toBe(false);
  });

  it("should increment version on overwrite via setSecret", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "API_KEY", value: "v1", createdBy: ACTOR }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: VAULT_ID, key: "API_KEY", value: "v2", createdBy: ACTOR }, MASTER_PASSWORD);

    const result = await getSecret(store, VAULT_ID, "API_KEY", MASTER_PASSWORD);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.secret.metadata.version).toBe(2);
      expect(result.secret.encryptedValue).toBe("v2");
    }
  });

  it("should update a secret", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "TOKEN", value: "old", createdBy: ACTOR }, MASTER_PASSWORD);
    await updateSecret(store, VAULT_ID, "TOKEN", { value: "new", updatedBy: ACTOR }, MASTER_PASSWORD);

    const result = await getSecret(store, VAULT_ID, "TOKEN", MASTER_PASSWORD);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.secret.encryptedValue).toBe("new");
      expect(result.secret.metadata.version).toBe(2);
    }
  });

  it("should delete a secret", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "DEL_KEY", value: "val", createdBy: ACTOR }, MASTER_PASSWORD);
    const deleted = deleteSecret(store, VAULT_ID, "DEL_KEY");
    expect(deleted).toBe(true);

    const result = await getSecret(store, VAULT_ID, "DEL_KEY", MASTER_PASSWORD);
    expect(result.found).toBe(false);
  });

  it("should list secrets for a vault", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "A", value: "1", createdBy: ACTOR }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: VAULT_ID, key: "B", value: "2", createdBy: ACTOR }, MASTER_PASSWORD);
    await setSecret(store, { vaultId: "other-vault", key: "C", value: "3", createdBy: ACTOR }, MASTER_PASSWORD);

    const secrets = listSecrets(store, VAULT_ID);
    expect(secrets).toHaveLength(2);
    expect(secrets.map((s) => s.key).sort()).toEqual(["A", "B"]);
  });
});
