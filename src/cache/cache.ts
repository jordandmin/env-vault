import { createHash } from "crypto";

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  hitCount: number;
  createdAt: number;
}

export interface CacheStore<T> {
  store: Map<string, CacheEntry<T>>;
  defaultTtlMs: number | null;
}

const now = () => Date.now();

export function createCacheStore<T>(defaultTtlMs: number | null = null): CacheStore<T> {
  return { store: new Map(), defaultTtlMs };
}

export function cacheSet<T>(
  cache: CacheStore<T>,
  key: string,
  value: T,
  ttlMs?: number
): void {
  const resolvedTtl = ttlMs ?? cache.defaultTtlMs;
  const expiresAt = resolvedTtl !== null ? now() + resolvedTtl : null;
  cache.store.set(key, { value, expiresAt, hitCount: 0, createdAt: now() });
}

export function cacheGet<T>(cache: CacheStore<T>, key: string): T | null {
  const entry = cache.store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && now() > entry.expiresAt) {
    cache.store.delete(key);
    return null;
  }
  entry.hitCount += 1;
  return entry.value;
}

export function cacheDelete<T>(cache: CacheStore<T>, key: string): boolean {
  return cache.store.delete(key);
}

export function cacheHas<T>(cache: CacheStore<T>, key: string): boolean {
  return cacheGet(cache, key) !== null;
}

export function cacheClear<T>(cache: CacheStore<T>): void {
  cache.store.clear();
}

export function cacheSize<T>(cache: CacheStore<T>): number {
  purgeExpired(cache);
  return cache.store.size;
}

export function purgeExpired<T>(cache: CacheStore<T>): number {
  const ts = now();
  let purged = 0;
  for (const [key, entry] of cache.store) {
    if (entry.expiresAt !== null && ts > entry.expiresAt) {
      cache.store.delete(key);
      purged++;
    }
  }
  return purged;
}

export function cacheStats<T>(cache: CacheStore<T>): { size: number; keys: string[] } {
  purgeExpired(cache);
  return { size: cache.store.size, keys: Array.from(cache.store.keys()) };
}

export function makeCacheKey(...parts: string[]): string {
  return createHash("sha1").update(parts.join(":")).digest("hex");
}
