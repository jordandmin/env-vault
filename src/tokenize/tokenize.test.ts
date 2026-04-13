import {
  createTokenStore,
  setPolicy,
  getPolicyForVault,
  tokenizeSecret,
  detokenize,
  revokeToken,
  listTokensForVault,
} from './tokenize';

describe('tokenize', () => {
  const vaultId = 'vault-1';
  const secretKey = 'DB_PASSWORD';

  it('creates a token store', () => {
    const store = createTokenStore();
    expect(store.tokens.size).toBe(0);
    expect(store.policies.size).toBe(0);
  });

  it('sets and retrieves a policy', () => {
    const store = createTokenStore();
    const policy = setPolicy(store, { vaultId, format: 'prefixed', prefix: 'env' });
    expect(policy.vaultId).toBe(vaultId);
    expect(policy.format).toBe('prefixed');
    const retrieved = getPolicyForVault(store, vaultId);
    expect(retrieved).toEqual(policy);
  });

  it('tokenizes a secret and returns consistent token', () => {
    const store = createTokenStore();
    const t1 = tokenizeSecret(store, vaultId, secretKey);
    const t2 = tokenizeSecret(store, vaultId, secretKey);
    expect(t1.token).toBe(t2.token);
    expect(t1.vaultId).toBe(vaultId);
    expect(t1.secretKey).toBe(secretKey);
  });

  it('generates prefixed token when policy is set', () => {
    const store = createTokenStore();
    setPolicy(store, { vaultId, format: 'prefixed', prefix: 'myapp' });
    const t = tokenizeSecret(store, vaultId, secretKey);
    expect(t.token.startsWith('myapp_')).toBe(true);
  });

  it('generates uuid token when policy format is uuid', () => {
    const store = createTokenStore();
    setPolicy(store, { vaultId, format: 'uuid' });
    const t = tokenizeSecret(store, vaultId, secretKey);
    expect(t.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('detokenizes a valid token', () => {
    const store = createTokenStore();
    const t = tokenizeSecret(store, vaultId, secretKey);
    const result = detokenize(store, t.token);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.secretKey).toBe(secretKey);
    }
  });

  it('returns error for unknown token', () => {
    const store = createTokenStore();
    const result = detokenize(store, 'nonexistent');
    expect(result).toEqual({ error: 'token_not_found' });
  });

  it('revokes a token', () => {
    const store = createTokenStore();
    const t = tokenizeSecret(store, vaultId, secretKey);
    const revoked = revokeToken(store, t.token);
    expect(revoked).toBe(true);
    const result = detokenize(store, t.token);
    expect(result).toEqual({ error: 'token_revoked' });
  });

  it('returns false when revoking non-existent token', () => {
    const store = createTokenStore();
    expect(revokeToken(store, 'ghost')).toBe(false);
  });

  it('lists active tokens for a vault', () => {
    const store = createTokenStore();
    const t1 = tokenizeSecret(store, vaultId, 'KEY_A');
    const t2 = tokenizeSecret(store, vaultId, 'KEY_B');
    revokeToken(store, t2.token);
    const list = listTokensForVault(store, vaultId);
    expect(list).toHaveLength(1);
    expect(list[0].token).toBe(t1.token);
  });

  it('respects ttl expiry', () => {
    const store = createTokenStore();
    setPolicy(store, { vaultId, format: 'opaque', ttlSeconds: -1 });
    const t = tokenizeSecret(store, vaultId, 'EXPIRED_KEY');
    const result = detokenize(store, t.token);
    expect(result).toEqual({ error: 'token_expired' });
  });
});
