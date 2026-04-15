import {
  createRedactStore,
  setRedactPolicy,
  getRedactPolicy,
  redactValue,
  redactRecord,
  removeRedactPolicy,
} from "./redact";

describe("redact", () => {
  const vaultId = "vault-1";

  function makeStore() {
    const store = createRedactStore();
    setRedactPolicy(store, {
      vaultId,
      patterns: ["password", "secret", "token"],
      replacement: "[REDACTED]",
    });
    return store;
  }

  it("stores and retrieves a policy", () => {
    const store = makeStore();
    const policy = getRedactPolicy(store, vaultId);
    expect(policy).toBeDefined();
    expect(policy?.replacement).toBe("[REDACTED]");
  });

  it("returns undefined for unknown vaultId", () => {
    const store = createRedactStore();
    expect(getRedactPolicy(store, "missing")).toBeUndefined();
  });

  it("redacts a value whose key matches a pattern", () => {
    const store = makeStore();
    expect(redactValue(store, vaultId, "db_password", "s3cr3t")).toBe("[REDACTED]");
  });

  it("does not redact a value whose key does not match", () => {
    const store = makeStore();
    expect(redactValue(store, vaultId, "db_host", "localhost")).toBe("localhost");
  });

  it("returns original value when no policy exists", () => {
    const store = createRedactStore();
    expect(redactValue(store, vaultId, "db_password", "s3cr3t")).toBe("s3cr3t");
  });

  it("redacts matching keys in a record", () => {
    const store = makeStore();
    const result = redactRecord(store, vaultId, {
      db_host: "localhost",
      api_token: "abc123",
      app_secret: "xyz",
      port: "5432",
    });
    expect(result.db_host).toBe("localhost");
    expect(result.api_token).toBe("[REDACTED]");
    expect(result.app_secret).toBe("[REDACTED]");
    expect(result.port).toBe("5432");
  });

  it("returns a copy of the record when no policy exists", () => {
    const store = createRedactStore();
    const input = { key: "value" };
    const result = redactRecord(store, vaultId, input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("removes a policy", () => {
    const store = makeStore();
    expect(removeRedactPolicy(store, vaultId)).toBe(true);
    expect(getRedactPolicy(store, vaultId)).toBeUndefined();
  });

  it("returns false when removing a non-existent policy", () => {
    const store = createRedactStore();
    expect(removeRedactPolicy(store, "ghost")).toBe(false);
  });
});
