import {
  createCircuitStore,
  setPolicy,
  getStatus,
  recordSuccess,
  recordFailure,
  checkCircuit,
} from "./circuit";

describe("circuit breaker", () => {
  const vaultId = "vault-1";

  function makeStore() {
    const store = createCircuitStore();
    setPolicy(store, {
      vaultId,
      failureThreshold: 3,
      successThreshold: 2,
      cooldownMs: 5000,
    });
    return store;
  }

  it("starts in closed state", () => {
    const store = makeStore();
    expect(getStatus(store, vaultId)?.state).toBe("closed");
  });

  it("allows requests when closed", () => {
    const store = makeStore();
    expect(checkCircuit(store, vaultId)).toBe(true);
  });

  it("trips open after reaching failure threshold", () => {
    const store = makeStore();
    recordFailure(store, vaultId);
    recordFailure(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("closed");
    recordFailure(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("open");
  });

  it("blocks requests when open", () => {
    const store = makeStore();
    recordFailure(store, vaultId);
    recordFailure(store, vaultId);
    recordFailure(store, vaultId);
    expect(checkCircuit(store, vaultId)).toBe(false);
  });

  it("transitions to half-open after cooldown", () => {
    const store = createCircuitStore();
    setPolicy(store, { vaultId, failureThreshold: 1, successThreshold: 1, cooldownMs: 0 });
    recordFailure(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("open");
    expect(checkCircuit(store, vaultId)).toBe(true);
    expect(getStatus(store, vaultId)?.state).toBe("half-open");
  });

  it("closes after enough successes in half-open", () => {
    const store = createCircuitStore();
    setPolicy(store, { vaultId, failureThreshold: 1, successThreshold: 2, cooldownMs: 0 });
    recordFailure(store, vaultId);
    checkCircuit(store, vaultId); // transitions to half-open
    recordSuccess(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("half-open");
    recordSuccess(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("closed");
  });

  it("reopens on failure in half-open", () => {
    const store = createCircuitStore();
    setPolicy(store, { vaultId, failureThreshold: 1, successThreshold: 2, cooldownMs: 0 });
    recordFailure(store, vaultId);
    checkCircuit(store, vaultId);
    recordFailure(store, vaultId);
    expect(getStatus(store, vaultId)?.state).toBe("open");
  });

  it("allows requests for unknown vault with no policy", () => {
    const store = createCircuitStore();
    expect(checkCircuit(store, "unknown")).toBe(true);
  });

  it("resets failure count on success when closed", () => {
    const store = makeStore();
    recordFailure(store, vaultId);
    recordFailure(store, vaultId);
    recordSuccess(store, vaultId);
    expect(getStatus(store, vaultId)?.failures).toBe(0);
    expect(getStatus(store, vaultId)?.state).toBe("closed");
  });
});
