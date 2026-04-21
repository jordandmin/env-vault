import { createReconcileStore, reconcile, getLastResult } from './reconcile';

function makeSecretStore(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getAll: () => new Map(data),
    set: (k: string, v: string) => { data.set(k, v); },
    delete: (k: string) => { data.delete(k); },
    has: (k: string) => data.has(k),
  };
}

describe('reconcile', () => {
  it('creates a reconcile store with empty last result', () => {
    const store = createReconcileStore();
    expect(store.results).toBeInstanceOf(Map);
    expect(store.results.size).toBe(0);
  });

  it('returns null for getLastResult when no reconcile has run', () => {
    const store = createReconcileStore();
    const result = getLastResult(store, 'vault-1');
    expect(result).toBeNull();
  });

  it('detects added keys during reconcile', () => {
    const store = createReconcileStore();
    const desired = new Map([['KEY_A', 'val1'], ['KEY_B', 'val2']]);
    const actual = new Map<string, string>();
    const result = reconcile(store, 'vault-1', desired, actual);
    expect(result.added).toEqual(['KEY_A', 'KEY_B'].sort());
    expect(result.removed).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });

  it('detects removed keys during reconcile', () => {
    const store = createReconcileStore();
    const desired = new Map<string, string>();
    const actual = new Map([['OLD_KEY', 'old']]);
    const result = reconcile(store, 'vault-1', desired, actual);
    expect(result.removed).toEqual(['OLD_KEY']);
    expect(result.added).toHaveLength(0);
  });

  it('detects updated keys during reconcile', () => {
    const store = createReconcileStore();
    const desired = new Map([['KEY_A', 'new_val']]);
    const actual = new Map([['KEY_A', 'old_val']]);
    const result = reconcile(store, 'vault-1', desired, actual);
    expect(result.updated).toEqual(['KEY_A']);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it('handles mixed diff correctly', () => {
    const store = createReconcileStore();
    const desired = new Map([['KEY_A', 'v1'], ['KEY_C', 'v3']]);
    const actual = new Map([['KEY_A', 'old'], ['KEY_B', 'v2']]);
    const result = reconcile(store, 'vault-1', desired, actual);
    expect(result.added).toEqual(['KEY_C']);
    expect(result.removed).toEqual(['KEY_B']);
    expect(result.updated).toEqual(['KEY_A']);
  });

  it('persists last result per vault', () => {
    const store = createReconcileStore();
    const desired = new Map([['X', '1']]);
    const actual = new Map<string, string>();
    reconcile(store, 'vault-1', desired, actual);
    const last = getLastResult(store, 'vault-1');
    expect(last).not.toBeNull();
    expect(last!.added).toEqual(['X']);
  });

  it('stores separate results per vault', () => {
    const store = createReconcileStore();
    reconcile(store, 'vault-1', new Map([['A', '1']]), new Map());
    reconcile(store, 'vault-2', new Map([['B', '2'], ['C', '3']]), new Map());
    expect(getLastResult(store, 'vault-1')!.added).toEqual(['A']);
    expect(getLastResult(store, 'vault-2')!.added.sort()).toEqual(['B', 'C']);
  });

  it('records timestamp on each reconcile result', () => {
    const store = createReconcileStore();
    const before = Date.now();
    reconcile(store, 'vault-1', new Map(), new Map());
    const after = Date.now();
    const last = getLastResult(store, 'vault-1')!;
    expect(last.reconciledAt).toBeGreaterThanOrEqual(before);
    expect(last.reconciledAt).toBeLessThanOrEqual(after);
  });

  it('returns no diff when desired equals actual', () => {
    const store = createReconcileStore();
    const state = new Map([['KEY', 'value']]);
    const result = reconcile(store, 'vault-1', state, new Map(state));
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });
});
