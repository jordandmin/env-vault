import {
  createTokenStore,
  setPolicy,
  tokenizeSecret,
  detokenize,
  revokeToken,
  listTokensForVault,
} from './tokenize';

describe('tokenize integration', () => {
  it('full lifecycle: set policy → tokenize → detokenize → revoke → re-tokenize', () => {
    const store = createTokenStore();
    const vaultId = 'vault-integration';
    const secretKey = 'API_KEY';

    setPolicy(store, { vaultId, format: 'prefixed', prefix: 'ev', ttlSeconds: 3600 });

    const token = tokenizeSecret(store, vaultId, secretKey);
    expect(token.token.startsWith('ev_')).toBe(true);
    expect(token.expiresAt).toBeDefined();

    const found = detokenize(store, token.token);
    expect('error' in found).toBe(false);
    if (!('error' in found)) {
      expect(found.secretKey).toBe(secretKey);
    }

    revokeToken(store, token.token);
    expect(detokenize(store, token.token)).toEqual({ error: 'token_revoked' });

    // Re-tokenizing after revoke should create a new token
    const newToken = tokenizeSecret(store, vaultId, secretKey);
    expect(newToken.token).not.toBe(token.token);
    expect(detokenize(store, newToken.token)).not.toHaveProperty('error');
  });

  it('multiple secrets in same vault get distinct tokens', () => {
    const store = createTokenStore();
    const vaultId = 'vault-multi';
    setPolicy(store, { vaultId, format: 'opaque' });

    const keys = ['SECRET_A', 'SECRET_B', 'SECRET_C'];
    const tokens = keys.map((k) => tokenizeSecret(store, vaultId, k).token);
    const unique = new Set(tokens);
    expect(unique.size).toBe(3);

    const list = listTokensForVault(store, vaultId);
    expect(list).toHaveLength(3);
  });

  it('tokens are isolated across vaults', () => {
    const store = createTokenStore();
    const t1 = tokenizeSecret(store, 'vault-a', 'SHARED_KEY');
    const t2 = tokenizeSecret(store, 'vault-b', 'SHARED_KEY');
    expect(t1.token).not.toBe(t2.token);

    expect(listTokensForVault(store, 'vault-a')).toHaveLength(1);
    expect(listTokensForVault(store, 'vault-b')).toHaveLength(1);
  });
});
