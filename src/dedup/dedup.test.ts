import {
  createDedupStore,
  registerSecret,
  deregisterSecret,
  isDuplicate,
  getDedupEntriesForVault,
  hashValue,
} from './dedup';

describe('dedup', () => {
  it('registers a secret without duplicate', () => {
    const store = createDedupStore();
    const result = registerSecret(store, 'v1', 'DB_PASS', 'secret123');
    expect(result.duplicate).toBe(false);
    expect(result.existingKey).toBeUndefined();
  });

  it('detects duplicate value in same vault', () => {
    const store = createDedupStore();
    registerSecret(store, 'v1', 'DB_PASS', 'secret123');
    const result = registerSecret(store, 'v1', 'API_KEY', 'secret123');
    expect(result.duplicate).toBe(true);
    expect(result.existingKey).toBe('DB_PASS');
  });

  it('allows same value in different vaults', () => {
    const store = createDedupStore();
    registerSecret(store, 'v1', 'KEY', 'sharedvalue');
    const result = registerSecret(store, 'v2', 'KEY', 'sharedvalue');
    expect(result.duplicate).toBe(false);
  });

  it('isDuplicate returns true for registered value', () => {
    const store = createDedupStore();
    registerSecret(store, 'v1', 'KEY', 'myval');
    expect(isDuplicate(store, 'v1', 'myval')).toBe(true);
    expect(isDuplicate(store, 'v2', 'myval')).toBe(false);
  });

  it('deregisters a secret', () => {
    const store = createDedupStore();
    registerSecret(store, 'v1', 'KEY', 'myval');
    const removed = deregisterSecret(store, 'v1', 'myval');
    expect(removed).toBe(true);
    expect(isDuplicate(store, 'v1', 'myval')).toBe(false);
  });

  it('deregister returns false for unknown value', () => {
    const store = createDedupStore();
    expect(deregisterSecret(store, 'v1', 'nothere')).toBe(false);
  });

  it('getDedupEntriesForVault returns only vault entries', () => {
    const store = createDedupStore();
    registerSecret(store, 'v1', 'A', 'val1');
    registerSecret(store, 'v1', 'B', 'val2');
    registerSecret(store, 'v2', 'C', 'val3');
    const entries = getDedupEntriesForVault(store, 'v1');
    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.key).sort()).toEqual(['A', 'B']);
  });

  it('hashValue is deterministic', () => {
    expect(hashValue('hello')).toBe(hashValue('hello'));
    expect(hashValue('hello')).not.toBe(hashValue('world'));
  });
});
