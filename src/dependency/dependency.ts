import { DependencyStore, SecretDependency, DependencyGraph, DependencyDirection } from './dependency.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createDependencyStore(): DependencyStore {
  return { deps: new Map() };
}

function makeDepKey(vaultId: string, fromKey: string, toKey: string): string {
  return `${vaultId}::${fromKey}::${toKey}`;
}

export function addDependency(
  store: DependencyStore,
  vaultId: string,
  fromKey: string,
  toKey: string,
  direction: DependencyDirection = 'requires'
): SecretDependency {
  const key = makeDepKey(vaultId, fromKey, toKey);
  if (store.deps.has(key)) {
    return store.deps.get(key)!;
  }
  const dep: SecretDependency = {
    id: generateId(),
    vaultId,
    fromKey,
    toKey,
    direction,
    createdAt: now(),
  };
  store.deps.set(key, dep);
  return dep;
}

export function removeDependency(
  store: DependencyStore,
  vaultId: string,
  fromKey: string,
  toKey: string
): boolean {
  const key = makeDepKey(vaultId, fromKey, toKey);
  return store.deps.delete(key);
}

export function getDependenciesForKey(
  store: DependencyStore,
  vaultId: string,
  fromKey: string
): SecretDependency[] {
  return Array.from(store.deps.values()).filter(
    (d) => d.vaultId === vaultId && d.fromKey === fromKey
  );
}

export function getDependentsForKey(
  store: DependencyStore,
  vaultId: string,
  toKey: string
): SecretDependency[] {
  return Array.from(store.deps.values()).filter(
    (d) => d.vaultId === vaultId && d.toKey === toKey
  );
}

export function buildDependencyGraph(
  store: DependencyStore,
  vaultId: string
): DependencyGraph {
  const graph: DependencyGraph = {};
  for (const dep of store.deps.values()) {
    if (dep.vaultId !== vaultId) continue;
    if (!graph[dep.fromKey]) graph[dep.fromKey] = [];
    graph[dep.fromKey].push(dep.toKey);
  }
  return graph;
}

export function detectCycle(
  store: DependencyStore,
  vaultId: string
): string[] | null {
  const graph = buildDependencyGraph(store, vaultId);
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]): string[] | null {
    if (stack.has(node)) return [...path, node];
    if (visited.has(node)) return null;
    visited.add(node);
    stack.add(node);
    for (const neighbor of graph[node] ?? []) {
      const cycle = dfs(neighbor, [...path, node]);
      if (cycle) return cycle;
    }
    stack.delete(node);
    return null;
  }

  for (const node of Object.keys(graph)) {
    const cycle = dfs(node, []);
    if (cycle) return cycle;
  }
  return null;
}
