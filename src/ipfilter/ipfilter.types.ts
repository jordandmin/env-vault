export type IpFilterAction = 'allow' | 'deny';

export interface IpFilterPolicy {
  vaultId: string;
  action: IpFilterAction;
  ranges: string[];
  createdAt: number;
  updatedAt: number;
}

export interface IpFilterStore {
  policies: Map<string, IpFilterPolicy>;
}

export interface IpFilterCheckResult {
  allowed: boolean;
  matchedRange: string | null;
  policy: IpFilterPolicy | null;
}
