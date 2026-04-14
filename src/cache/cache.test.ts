import {
  createCacheStore,
  cacheSet,
  cacheGet,
  cacheDelete,
  cacheHas,
  cacheClear,
  cacheSize,
  purgeExpired,
  cacheStats,
  makeCacheKey,
} from "./cache";

describe("cache", () => {
  it("sets and gets a value", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "key1", "hello");
    expect(cacheGet(cache, "key1")).toBe("hello");
  });

  it("returns null for missing key", () => {
    const cache = createCacheStore<string>();
    expect(cacheGet(cache, "missing")).toBeNull();
  });

  it("expires entries after ttl", () => {
    jest.useFakeTimers();
    const cache = createCacheStore<string>();
    cacheSet(cache, "k", "v", 1000);
    expect(cacheGet(cache, "k")).toBe("v");
    jest.advanceTimersByTime(1001);
    expect(cacheGet(cache, "k")).toBeNull();
    jest.useRealTimers();
  });

  it("uses defaultTtlMs from store", () => {
    jest.useFakeTimers();
    const cache = createCacheStore<number>(500);
    cacheSet(cache, "n", 42);
    expect(cacheGet(cache, "n")).toBe(42);
    jest.advanceTimersByTime(501);
    expect(cacheGet(cache, "n")).toBeNull();
    jest.useRealTimers();
  });

  it("deletes a key", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "x", "val");
    expect(cacheDelete(cache, "x")).toBe(true);
    expect(cacheGet(cache, "x")).toBeNull();
  });

  it("cacheHas returns correct boolean", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "a", "1");
    expect(cacheHas(cache, "a")).toBe(true);
    expect(cacheHas(cache, "b")).toBe(false);
  });

  it("cacheClear removes all entries", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "a", "1");
    cacheSet(cache, "b", "2");
    cacheClear(cache);
    expect(cacheSize(cache)).toBe(0);
  });

  it("purgeExpired removes only expired entries", () => {
    jest.useFakeTimers();
    const cache = createCacheStore<string>();
    cacheSet(cache, "short", "s", 100);
    cacheSet(cache, "long", "l", 5000);
    jest.advanceTimersByTime(200);
    const purged = purgeExpired(cache);
    expect(purged).toBe(1);
    expect(cacheHas(cache, "long")).toBe(true);
    jest.useRealTimers();
  });

  it("cacheStats returns size and keys", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "p", "1");
    cacheSet(cache, "q", "2");
    const stats = cacheStats(cache);
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain("p");
    expect(stats.keys).toContain("q");
  });

  it("makeCacheKey produces consistent hashes", () => {
    const k1 = makeCacheKey("vault1", "secret", "v1");
    const k2 = makeCacheKey("vault1", "secret", "v1");
    const k3 = makeCacheKey("vault1", "secret", "v2");
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it("increments hitCount on repeated gets", () => {
    const cache = createCacheStore<string>();
    cacheSet(cache, "h", "hit");
    cacheGet(cache, "h");
    cacheGet(cache, "h");
    const entry = cache.store.get("h");
    expect(entry?.hitCount).toBe(2);
  });
});
