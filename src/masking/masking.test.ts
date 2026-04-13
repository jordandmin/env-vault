import {
  createMaskingStore,
  setMaskPolicy,
  getMaskPolicy,
  maskValue,
  maskRecord,
} from "./masking";

describe("createMaskingStore", () => {
  it("creates an empty store", () => {
    const store = createMaskingStore();
    expect(store.policies.size).toBe(0);
  });
});

describe("setMaskPolicy / getMaskPolicy", () => {
  it("stores and retrieves a policy", () => {
    const store = createMaskingStore();
    const policy = setMaskPolicy(store, { vaultId: "v1", mode: "full" });
    expect(policy.vaultId).toBe("v1");
    expect(getMaskPolicy(store, "v1")).toEqual(policy);
  });

  it("returns undefined for unknown vault", () => {
    const store = createMaskingStore();
    expect(getMaskPolicy(store, "unknown")).toBeUndefined();
  });

  it("overwrites an existing policy", () => {
    const store = createMaskingStore();
    setMaskPolicy(store, { vaultId: "v1", mode: "full" });
    setMaskPolicy(store, { vaultId: "v1", mode: "hash" });
    expect(getMaskPolicy(store, "v1")?.mode).toBe("hash");
  });
});

describe("maskValue", () => {
  it("full mode returns asterisks", () => {
    const result = maskValue("supersecret", { vaultId: "v1", mode: "full" });
    expect(result).toBe("********");
  });

  it("full mode caps at 8 asterisks", () => {
    const result = maskValue("ab", { vaultId: "v1", mode: "full" });
    expect(result).toBe("**");
  });

  it("partial mode reveals trailing chars", () => {
    const result = maskValue("mysecret", {
      vaultId: "v1",
      mode: "partial",
      revealCount: 3,
    });
    expect(result).toBe("*****ret");
  });

  it("partial mode defaults revealCount to 4", () => {
    const result = maskValue("abcdefgh", { vaultId: "v1", mode: "partial" });
    expect(result).toMatch(/^\*{4}efgh$/);
  });

  it("hash mode returns deterministic hash string", () => {
    const r1 = maskValue("secret", { vaultId: "v1", mode: "hash" });
    const r2 = maskValue("secret", { vaultId: "v1", mode: "hash" });
    expect(r1).toBe(r2);
    expect(r1).toMatch(/^\[hash:[0-9a-f]{8}\]$/);
  });

  it("hash mode differs for different values", () => {
    const r1 = maskValue("secret", { vaultId: "v1", mode: "hash" });
    const r2 = maskValue("other", { vaultId: "v1", mode: "hash" });
    expect(r1).not.toBe(r2);
  });

  it("handles empty string gracefully", () => {
    expect(maskValue("", { vaultId: "v1", mode: "full" })).toBe("");
  });
});

describe("maskRecord", () => {
  it("masks all values in a record", () => {
    const record = { DB_PASS: "hunter2", API_KEY: "abc123" };
    const masked = maskRecord(record, { vaultId: "v1", mode: "full" });
    expect(masked.DB_PASS).toBe("*******");
    expect(masked.API_KEY).toBe("******");
    expect(Object.keys(masked)).toEqual(["DB_PASS", "API_KEY"]);
  });
});
