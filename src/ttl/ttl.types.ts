export interface TtlPolicy {
  id: string;
  vaultId: string;
  secretKey: string;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
  createdBy: string;
}

export interface TtlStore {
  policies: Map<string, TtlPolicy>;
}

export type CreateTtlPolicyInput = {
  vaultId: string;
  secretKey: string;
  ttlMs: number;
  createdBy: string;
};
