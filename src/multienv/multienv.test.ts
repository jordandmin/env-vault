import {
  createMultiEnvStore,
  addEnvironment,
  removeEnvironment,
  listEnvironments,
  setEnvSecret,
  getEnvSecret,
  deleteEnvSecret,
  getSecretsForEnv,
  promoteSecret,
} from "./multienv";

describe("multienv", () => {
  const vaultId = "vault-1";

  function makeStore() {
    const store = createMultiEnvStore();
    addEnvironment(store, vaultId, "development");
    addEnvironment(store, vaultId, "staging");
    addEnvironment(store, vaultId, "production");
    return store;
  }

  test("addEnvironment and listEnvironments", () => {
    const store = makeStore();
    const envs = listEnvironments(store, vaultId);
    expect(envs).toContain("development");
    expect(envs).toContain("staging");
    expect(envs).toContain("production");
    expect(envs).toHaveLength(3);
  });

  test("listEnvironments returns empty for unknown vault", () => {
    const store = createMultiEnvStore();
    expect(listEnvironments(store, "unknown")).toEqual([]);
  });

  test("setEnvSecret and getEnvSecret", () => {
    const store = makeStore();
    setEnvSecret(store, vaultId, "development", "DB_URL", "localhost:5432");
    expect(getEnvSecret(store, vaultId, "development", "DB_URL")).toBe("localhost:5432");
  });

  test("getEnvSecret returns undefined for missing key", () => {
    const store = makeStore();
    expect(getEnvSecret(store, vaultId, "development", "MISSING")).toBeUndefined();
  });

  test("setEnvSecret throws for non-existent environment", () => {
    const store = makeStore();
    expect(() =>
      setEnvSecret(store, vaultId, "canary", "KEY", "val")
    ).toThrow(/does not exist/);
  });

  test("deleteEnvSecret removes the key", () => {
    const store = makeStore();
    setEnvSecret(store, vaultId, "staging", "API_KEY", "abc123");
    expect(deleteEnvSecret(store, vaultId, "staging", "API_KEY")).toBe(true);
    expect(getEnvSecret(store, vaultId, "staging", "API_KEY")).toBeUndefined();
  });

  test("deleteEnvSecret returns false for missing key", () => {
    const store = makeStore();
    expect(deleteEnvSecret(store, vaultId, "staging", "NOPE")).toBe(false);
  });

  test("getSecretsForEnv returns all keys for env", () => {
    const store = makeStore();
    setEnvSecret(store, vaultId, "production", "DB_URL", "prod-db");
    setEnvSecret(store, vaultId, "production", "API_KEY", "prod-key");
    setEnvSecret(store, vaultId, "staging", "DB_URL", "stage-db");
    const secrets = getSecretsForEnv(store, vaultId, "production");
    expect(secrets).toEqual({ DB_URL: "prod-db", API_KEY: "prod-key" });
  });

  test("promoteSecret copies value to target env", () => {
    const store = makeStore();
    setEnvSecret(store, vaultId, "staging", "DB_URL", "stage-db");
    promoteSecret(store, vaultId, "staging", "production", "DB_URL");
    expect(getEnvSecret(store, vaultId, "production", "DB_URL")).toBe("stage-db");
    // original still present
    expect(getEnvSecret(store, vaultId, "staging", "DB_URL")).toBe("stage-db");
  });

  test("promoteSecret throws if source key is missing", () => {
    const store = makeStore();
    expect(() =>
      promoteSecret(store, vaultId, "staging", "production", "MISSING")
    ).toThrow(/not found/);
  });

  test("removeEnvironment deletes env and its secrets", () => {
    const store = makeStore();
    setEnvSecret(store, vaultId, "development", "SECRET", "dev-val");
    removeEnvironment(store, vaultId, "development");
    expect(listEnvironments(store, vaultId)).not.toContain("development");
    expect(getEnvSecret(store, vaultId, "development", "SECRET")).toBeUndefined();
  });
});
