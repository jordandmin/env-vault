import {
  createDependencyStore,
  addDependency,
  removeDependency,
  getDependenciesForKey,
  getDependentsForKey,
  buildDependencyGraph,
  detectCycle,
} from './dependency';

describe('dependency', () => {
  it('adds a dependency and returns it', () => {
    const store = createDependencyStore();
    const dep = addDependency(store, 'v1', 'DB_URL', 'DB_PASS');
    expect(dep.fromKey).toBe('DB_URL');
    expect(dep.toKey).toBe('DB_PASS');
    expect(dep.direction).toBe('requires');
    expect(dep.id).toBeTruthy();
  });

  it('returns existing dep when adding duplicate', () => {
    const store = createDependencyStore();
    const a = addDependency(store, 'v1', 'A', 'B');
    const b = addDependency(store, 'v1', 'A', 'B');
    expect(a.id).toBe(b.id);
  });

  it('removes a dependency', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'B');
    const removed = removeDependency(store, 'v1', 'A', 'B');
    expect(removed).toBe(true);
    expect(getDependenciesForKey(store, 'v1', 'A')).toHaveLength(0);
  });

  it('returns false when removing non-existent dependency', () => {
    const store = createDependencyStore();
    expect(removeDependency(store, 'v1', 'X', 'Y')).toBe(false);
  });

  it('gets dependencies for a key', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'APP_KEY', 'DB_URL');
    addDependency(store, 'v1', 'APP_KEY', 'REDIS_URL');
    const deps = getDependenciesForKey(store, 'v1', 'APP_KEY');
    expect(deps).toHaveLength(2);
  });

  it('gets dependents for a key', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'SHARED');
    addDependency(store, 'v1', 'B', 'SHARED');
    const dependents = getDependentsForKey(store, 'v1', 'SHARED');
    expect(dependents.map((d) => d.fromKey).sort()).toEqual(['A', 'B']);
  });

  it('builds a dependency graph', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'B');
    addDependency(store, 'v1', 'A', 'C');
    addDependency(store, 'v1', 'B', 'C');
    const graph = buildDependencyGraph(store, 'v1');
    expect(graph['A'].sort()).toEqual(['B', 'C']);
    expect(graph['B']).toEqual(['C']);
  });

  it('detects no cycle in acyclic graph', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'B');
    addDependency(store, 'v1', 'B', 'C');
    expect(detectCycle(store, 'v1')).toBeNull();
  });

  it('detects a cycle', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'B');
    addDependency(store, 'v1', 'B', 'C');
    addDependency(store, 'v1', 'C', 'A');
    const cycle = detectCycle(store, 'v1');
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThan(0);
  });

  it('scopes dependencies by vaultId', () => {
    const store = createDependencyStore();
    addDependency(store, 'v1', 'A', 'B');
    addDependency(store, 'v2', 'A', 'B');
    expect(getDependenciesForKey(store, 'v1', 'A')).toHaveLength(1);
    expect(getDependenciesForKey(store, 'v2', 'A')).toHaveLength(1);
  });
});
