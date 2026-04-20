import {
  createConcurrencyStore,
  acquireLock,
  releaseLock,
  getLock,
  forceReleaseLock,
  listActiveLocks,
} from "./concurrency";

describe("concurrency", () => {
  it("acquires a lock on a free vault", () => {
    const store = createConcurrencyStore();
    const result = acquireLock(store, "vault-1", "alice");
    expect(result.acquired).toBe(true);
    expect(result.entry?.lockedBy).toBe("alice");
  });

  it("denies a second lock while first is held", () => {
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice");
    const result = acquireLock(store, "vault-1", "bob");
    expect(result.acquired).toBe(false);
  });

  it("allows re-acquire after TTL expiry", () => {
    jest.useFakeTimers();
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice", 1000);
    jest.advanceTimersByTime(1500);
    const result = acquireLock(store, "vault-1", "bob", 1000);
    expect(result.acquired).toBe(true);
    expect(result.entry?.lockedBy).toBe("bob");
    jest.useRealTimers();
  });

  it("releases a lock held by the same actor", () => {
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice");
    const result = releaseLock(store, "vault-1", "alice");
    expect(result.released).toBe(true);
    expect(getLock(store, "vault-1")).toBeUndefined();
  });

  it("rejects release by non-owner", () => {
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice");
    const result = releaseLock(store, "vault-1", "bob");
    expect(result.released).toBe(false);
    expect(result.reason).toBe("not_owner");
  });

  it("returns undefined from getLock when no lock exists", () => {
    const store = createConcurrencyStore();
    expect(getLock(store, "vault-99")).toBeUndefined();
  });

  it("force releases a lock regardless of owner", () => {
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice");
    const ok = forceReleaseLock(store, "vault-1");
    expect(ok).toBe(true);
    expect(getLock(store, "vault-1")).toBeUndefined();
  });

  it("listActiveLocks returns only non-expired locks", () => {
    jest.useFakeTimers();
    const store = createConcurrencyStore();
    acquireLock(store, "vault-1", "alice", 1000);
    acquireLock(store, "vault-2", "bob", 5000);
    jest.advanceTimersByTime(2000);
    const active = listActiveLocks(store);
    expect(active).toHaveLength(1);
    expect(active[0].lockedBy).toBe("bob");
    jest.useRealTimers();
  });

  it("releaseLock returns no_lock reason when vault has no lock", () => {
    const store = createConcurrencyStore();
    const result = releaseLock(store, "vault-missing", "alice");
    expect(result.released).toBe(false);
    expect(result.reason).toBe("no_lock");
  });
});
