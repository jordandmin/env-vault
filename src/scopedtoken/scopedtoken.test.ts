import {
  createScopedTokenStore,
  issueToken,
  revokeToken,
  validateToken,
  getTokensForVault,
  getActiveTokensForVault,
} from './scopedtoken';

describe('scopedtoken', () => {
  const vaultId = 'vault-1';
  const createdBy = 'user-1';

  it('issues a token with given scopes', () => {
    const store = createScopedTokenStore();
    const token = issueToken(store, { vaultId, scopes: ['read'], createdBy });
    expect(token.active).toBe(true);
    expect(token.scopes).toContain('read');
    expect(token.token).toBeTruthy();
  });

  it('throws when no scopes provided', () => {
    const store = createScopedTokenStore();
    expect(() => issueToken(store, { vaultId, scopes: [], createdBy })).toThrow();
  });

  it('validates a token with correct scope', () => {
    const store = createScopedTokenStore();
    const issued = issueToken(store, { vaultId, scopes: ['read', 'write'], createdBy });
    const result = validateToken(store, issued.token, 'read');
    expect(result.valid).toBe(true);
    expect(result.token?.id).toBe(issued.id);
  });

  it('rejects token with insufficient scope', () => {
    const store = createScopedTokenStore();
    const issued = issueToken(store, { vaultId, scopes: ['read'], createdBy });
    const result = validateToken(store, issued.token, 'write');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_scope');
  });

  it('rejects unknown token', () => {
    const store = createScopedTokenStore();
    const result = validateToken(store, 'nonexistent', 'read');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_not_found');
  });

  it('rejects revoked token', () => {
    const store = createScopedTokenStore();
    const issued = issueToken(store, { vaultId, scopes: ['read'], createdBy });
    revokeToken(store, issued.id);
    const result = validateToken(store, issued.token, 'read');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_revoked');
  });

  it('rejects expired token', () => {
    const store = createScopedTokenStore();
    const issued = issueToken(store, { vaultId, scopes: ['read'], createdBy, expiresAt: Date.now() - 1000 });
    const result = validateToken(store, issued.token, 'read');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_expired');
  });

  it('lists tokens for vault', () => {
    const store = createScopedTokenStore();
    issueToken(store, { vaultId, scopes: ['read'], createdBy });
    issueToken(store, { vaultId, scopes: ['write'], createdBy });
    issueToken(store, { vaultId: 'vault-2', scopes: ['admin'], createdBy });
    expect(getTokensForVault(store, vaultId)).toHaveLength(2);
  });

  it('lists only active tokens for vault', () => {
    const store = createScopedTokenStore();
    const t1 = issueToken(store, { vaultId, scopes: ['read'], createdBy });
    issueToken(store, { vaultId, scopes: ['write'], createdBy });
    revokeToken(store, t1.id);
    expect(getActiveTokensForVault(store, vaultId)).toHaveLength(1);
  });
});
