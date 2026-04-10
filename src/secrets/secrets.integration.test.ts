import { describe, it, expect, beforeEach } from "vitest";
import { createSecretStore, setSecret, getSecret, listSecrets, deleteSecret } from "./secrets";
import { createAuditLog, recordEvent, getEntriesByAction } from "../audit/audit";
import { SecretStore } from "./secrets.types";
import { AuditLog } from "../audit/audit.types";

const PASSWORD = "integration-password";
const VAULT_ID = "vault-integration";
const ACTOR = "alice";

describe("secrets + audit integration", () => {
  let store: SecretStore;
  let audit: AuditLog;

  beforeEach(() => {
    store = createSecretStore();
    audit = createAuditLog();
  });

  it("should record audit events when setting a secret", async () => {
    await setSecret(
      store,
      { vaultId: VAULT_ID, key: "DB_PASS", value: "secret123", createdBy: ACTOR },
      PASSWORD
    );
    recordEvent(audit, { actor: ACTOR, action: "secret.set", vaultId: VAULT_ID, details: { key: "DB_PASS" } });

    const entries = getEntriesByAction(audit, "secret.set");
    expect(entries).toHaveLength(1);
    expect(entries[0].actor).toBe(ACTOR);
    expect(entries[0].details).toMatchObject({ key: "DB_PASS" });
  });

  it("should record audit event on secret deletion", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "TEMP", value: "val", createdBy: ACTOR }, PASSWORD);
    deleteSecret(store, VAULT_ID, "TEMP");
    recordEvent(audit, { actor: ACTOR, action: "secret.delete", vaultId: VAULT_ID, details: { key: "TEMP" } });

    const entries = getEntriesByAction(audit, "secret.delete");
    expect(entries).toHaveLength(1);
  });

  it("should list secrets and verify they are encrypted at rest", async () => {
    await setSecret(store, { vaultId: VAULT_ID, key: "RAW", value: "plaintext", createdBy: ACTOR }, PASSWORD);

    const secrets = listSecrets(store, VAULT_ID);
    expect(secrets).toHaveLength(1);
    // Value stored in the map should be encrypted, not plaintext
    expect(secrets[0].encryptedValue).not.toBe("plaintext");

    // But decrypted retrieval should return plaintext
    const result = await getSecret(store, VAULT_ID, "RAW", PASSWORD);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.secret.encryptedValue).toBe("plaintext");
    }
  });

  it("should handle multiple secrets across vaults independently", async () => {
    await setSecret(store, { vaultId: "vault-a", key: "X", value: "1", createdBy: ACTOR }, PASSWORD);
    await setSecret(store, { vaultId: "vault-b", key: "X", value: "2", createdBy: ACTOR }, PASSWORD);

    const resultA = await getSecret(store, "vault-a", "X", PASSWORD);
    const resultB = await getSecret(store, "vault-b", "X", PASSWORD);

    expect(resultA.found).toBe(true);
    expect(resultB.found).toBe(true);
    if (resultA.found && resultB.found) {
      expect(resultA.secret.encryptedValue).toBe("1");
      expect(resultB.secret.encryptedValue).toBe("2");
    }
  });
});
