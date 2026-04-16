import {
  createPresignStore,
  issuePresignedToken,
  validatePresignedToken,
  revokePresignedToken,
  listPresignedTokens,
} from './presign';

const SECRET = 'test-secret-key';

describe('presign', () => {
  it('issues a presigned token with correct fields', () => {
    const store = createPresignStore(SECRET);
    const token = issuePresignedToken(store, 'vault1', 'DB_PASS', 'actor1', 60_000);
    expect(token.vaultId).toBe('vault1');
    expect(token.key).toBe('DB_PASS');
    expect(token.actorId).toBe('actor1');
    expect(token.signature).toBeTruthy();
    expect(token.expiresAt).toBeGreaterThan(Date.now());
  });

  it('validates a valid token', () => {
    const store = createPresignStore(SECRET);
    const token = issuePresignedToken(store, 'vault1', 'API_KEY', 'actor1', 60_000);
    const result = validatePresignedToken(store, token.id);
    expect(result.valid).toBe(true);
    expect(result.token?.id).toBe(token.id);
  });

  it('rejects an unknown token', () => {
    const store = createPresignStore(SECRET);
    const result = validatePresignedToken(store, 'nonexistent');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  it('rejects an expired token', () => {
    const store = createPresignStore(SECRET);
    const token = issuePresignedToken(store, 'vault1', 'KEY', 'actor1', -1);
    const result = validatePresignedToken(store, token.id);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects a tampered signature', () => {
    const store = createPresignStore(SECRET);
    const token = issuePresignedToken(store, 'vault1', 'KEY', 'actor1', 60_000);
    store.tokens.get(token.id)!.signature = 'tampered';
    const result = validatePresignedToken(store, token.id);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_signature');
  });

  it('revokes a token', () => {
    const store = createPresignStore(SECRET);
    const token = issuePresignedToken(store, 'vault1', 'KEY', 'actor1', 60_000);
    expect(revokePresignedToken(store, token.id)).toBe(true);
    expect(validatePresignedToken(store, token.id).valid).toBe(false);
  });

  it('lists tokens for a vault', () => {
    const store = createPresignStore(SECRET);
    issuePresignedToken(store, 'vault1', 'K1', 'actor1', 60_000);
    issuePresignedToken(store, 'vault1', 'K2', 'actor2', 60_000);
    issuePresignedToken(store, 'vault2', 'K3', 'actor3', 60_000);
    expect(listPresignedTokens(store, 'vault1')).toHaveLength(2);
    expect(listPresignedTokens(store, 'vault2')).toHaveLength(1);
  });
});
