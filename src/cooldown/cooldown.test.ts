import {
  createCooldownStore,
  setPolicy,
  getPolicy,
  removePolicy,
  checkCooldown,
  resetCooldown,
} from "./cooldown";

function makeStore() {
  return createCooldownStore();
}

describe("cooldown", () => {
  it("allows action when no policy is set", () => {
    const store = makeStore();
    const result = checkCooldown(store, "v1", "alice", "read");
    expect(result.allowed).toBe(true);
  });

  it("sets and retrieves a policy", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 5000 });
    const policy = getPolicy(store, "v1", "write");
    expect(policy).toBeDefined();
    expect(policy?.cooldownMs).toBe(5000);
  });

  it("allows first action when policy exists", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 5000 });
    const result = checkCooldown(store, "v1", "alice", "write");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("blocks second action within cooldown window", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 60_000 });
    checkCooldown(store, "v1", "alice", "write");
    const result = checkCooldown(store, "v1", "alice", "write");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("isolates cooldown per actor", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "delete", cooldownMs: 60_000 });
    checkCooldown(store, "v1", "alice", "delete");
    const result = checkCooldown(store, "v1", "bob", "delete");
    expect(result.allowed).toBe(true);
  });

  it("isolates cooldown per action", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 60_000 });
    setPolicy(store, { vaultId: "v1", action: "read", cooldownMs: 60_000 });
    checkCooldown(store, "v1", "alice", "write");
    const result = checkCooldown(store, "v1", "alice", "read");
    expect(result.allowed).toBe(true);
  });

  it("resets cooldown and allows immediate retry", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 60_000 });
    checkCooldown(store, "v1", "alice", "write");
    resetCooldown(store, "v1", "alice", "write");
    const result = checkCooldown(store, "v1", "alice", "write");
    expect(result.allowed).toBe(true);
  });

  it("removes a policy so actions are always allowed", () => {
    const store = makeStore();
    setPolicy(store, { vaultId: "v1", action: "write", cooldownMs: 60_000 });
    checkCooldown(store, "v1", "alice", "write");
    removePolicy(store, "v1", "write");
    const result = checkCooldown(store, "v1", "alice", "write");
    expect(result.allowed).toBe(true);
  });

  it("returns undefined for missing policy", () => {
    const store = makeStore();
    expect(getPolicy(store, "v1", "nonexistent")).toBeUndefined();
  });
});
