export type TokenFormat = 'uuid' | 'opaque' | 'prefixed';

export interface TokenPolicy {
  vaultId: string;
  format: TokenFormat;
  prefix?: string;
  ttlSeconds?: number;
  createdAt: number;
}

export interface Token {
  id: string;
  vaultId: string;
  secretKey: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
  revokedAt?: number;
}

export interface TokenStore {
  tokens: Map<string, Token>;         // token -> Token
  bySecret: Map<string, string>;      // vaultId:secretKey -> token
  policies: Map<string, TokenPolicy>; // vaultId -> TokenPolicy
}
