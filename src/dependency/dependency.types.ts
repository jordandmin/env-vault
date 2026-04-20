export type DependencyDirection = 'requires' | 'suggests';

export interface SecretDependency {
  id: string;
  vaultId: string;
  fromKey: string;
  toKey: string;
  direction: DependencyDirection;
  createdAt: number;
}

export interface DependencyStore {
  deps: Map<string, SecretDependency>;
}

export type DependencyGraph = Record<string, string[]>;
