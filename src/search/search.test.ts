import { searchSecrets, searchByKeyPattern } from './search';
import { SecretStore } from '../secrets/secrets.types';

function makeStore(): SecretStore {
  const now = new Date('2024-01-15T10:00:00Z');
  const later = new Date('2024-02-01T10:00:00Z');
  return {
    secrets: {
      'vault1:DB_PASSWORD': {
        encryptedValue: 'enc1',
        metadata: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          createdBy: 'alice',
          version: 1,
          tags: ['db', 'prod'],
        },
      },
      'vault1:API_KEY': {
        encryptedValue: 'enc2',
        metadata: {
          createdAt: later.toISOString(),
          updatedAt: later.toISOString(),
          createdBy: 'bob',
          version: 1,
          tags: ['api'],
        },
      },
      'vault2:SECRET_TOKEN': {
        encryptedValue: 'enc3',
        metadata: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          createdBy: 'alice',
          version: 2,
          tags: ['api', 'prod'],
        },
      },
    },
  };
}

describe('searchSecrets', () => {
  it('filters by vaultId', () => {
    const results = searchSecrets(makeStore(), { vaultId: 'vault1' });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.vaultId === 'vault1')).toBe(true);
  });

  it('filters by partial key match', () => {
    const results = searchSecrets(makeStore(), { key: 'KEY' });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('API_KEY');
  });

  it('filters by tags (all must match)', () => {
    const results = searchSecrets(makeStore(), { tags: ['api', 'prod'] });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('SECRET_TOKEN');
  });

  it('filters by actor', () => {
    const results = searchSecrets(makeStore(), { actor: 'alice' });
    expect(results).toHaveLength(2);
  });

  it('filters by createdAfter', () => {
    const results = searchSecrets(makeStore(), {
      createdAfter: new Date('2024-01-20T00:00:00Z'),
    });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('API_KEY');
  });

  it('returns all secrets when query is empty', () => {
    const results = searchSecrets(makeStore(), {});
    expect(results).toHaveLength(3);
  });
});

describe('searchByKeyPattern', () => {
  it('matches keys by regex pattern', () => {
    const results = searchByKeyPattern(makeStore(), 'vault1', /^DB_/);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('DB_PASSWORD');
  });

  it('returns empty array when no match', () => {
    const results = searchByKeyPattern(makeStore(), 'vault1', /^MISSING/);
    expect(results).toHaveLength(0);
  });
});
