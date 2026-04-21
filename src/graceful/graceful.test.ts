import {
  createGracefulStore,
  registerHandler,
  deregisterHandler,
  getHandlers,
  runShutdown,
  isShuttingDown,
} from "./graceful";

describe("graceful shutdown", () => {
  it("creates a store with defaults", () => {
    const store = createGracefulStore();
    expect(store.handlers.size).toBe(0);
    expect(store.isShuttingDown).toBe(false);
    expect(store.timeoutMs).toBe(5000);
  });

  it("registers and retrieves handlers sorted by priority", () => {
    const store = createGracefulStore();
    registerHandler(store, { name: "db", priority: 2, fn: async () => {} });
    registerHandler(store, { name: "cache", priority: 1, fn: async () => {} });
    registerHandler(store, { name: "http", priority: 3, fn: async () => {} });
    const handlers = getHandlers(store);
    expect(handlers.map((h) => h.name)).toEqual(["cache", "db", "http"]);
  });

  it("throws when registering a duplicate handler name", () => {
    const store = createGracefulStore();
    registerHandler(store, { name: "db", priority: 1, fn: () => {} });
    expect(() =>
      registerHandler(store, { name: "db", priority: 2, fn: () => {} })
    ).toThrow('Handler "db" is already registered');
  });

  it("deregisters a handler", () => {
    const store = createGracefulStore();
    registerHandler(store, { name: "db", priority: 1, fn: () => {} });
    expect(deregisterHandler(store, "db")).toBe(true);
    expect(store.handlers.size).toBe(0);
    expect(deregisterHandler(store, "db")).toBe(false);
  });

  it("runs all handlers and collects results", async () => {
    const store = createGracefulStore();
    const order: string[] = [];
    registerHandler(store, { name: "b", priority: 2, fn: () => { order.push("b"); } });
    registerHandler(store, { name: "a", priority: 1, fn: async () => { order.push("a"); } });
    const result = await runShutdown(store);
    expect(result.succeeded).toEqual(["a", "b"]);
    expect(result.failed).toHaveLength(0);
    expect(order).toEqual(["a", "b"]);
    expect(isShuttingDown(store)).toBe(true);
  });

  it("captures errors from failing handlers without stopping others", async () => {
    const store = createGracefulStore();
    registerHandler(store, { name: "ok", priority: 2, fn: () => {} });
    registerHandler(store, { name: "bad", priority: 1, fn: () => { throw new Error("boom"); } });
    const result = await runShutdown(store);
    expect(result.failed).toEqual([{ name: "bad", error: "boom" }]);
    expect(result.succeeded).toEqual(["ok"]);
  });

  it("is idempotent — second call returns empty results", async () => {
    const store = createGracefulStore();
    registerHandler(store, { name: "x", priority: 1, fn: () => {} });
    await runShutdown(store);
    const second = await runShutdown(store);
    expect(second.succeeded).toHaveLength(0);
    expect(second.failed).toHaveLength(0);
  });

  it("times out slow handlers", async () => {
    const store = createGracefulStore(50);
    registerHandler(store, {
      name: "slow",
      priority: 1,
      fn: () => new Promise((resolve) => setTimeout(resolve, 200)),
    });
    const result = await runShutdown(store);
    expect(result.failed).toEqual([{ name: "slow", error: "timeout" }]);
  });
});
