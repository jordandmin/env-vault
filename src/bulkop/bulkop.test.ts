import { describe, it, expect, beforeEach } from 'vitest';
import { createSecretStore, setSecret } from '../secrets/secrets';
import {
  createBulkOpStore,
  bulkSet,
  bulkGet,
  bulkDelete,
  BulkOpStore,
} from './bulkop';

let store: BulkOpStore;

beforeEach(() => {
  store = createBulkOpStore(createSecretStore());
});

describe('bulkSet', () => {
  it('sets multiple secrets and reports success', () => {
    const result = bulkSet(
      store,
      [
        { vaultId: 'v1', key: 'DB_HOST', value: 'localhost' },
        { vaultId: 'v1', key: 'DB_PORT', value: '5432' },
      ],
      'alice'
    );
    expect(result.succeeded).toEqual(['DB_HOST', 'DB_PORT']);
    expect(result.failed).toHaveLength(0);
  });

  it('reports failure for invalid entries without aborting others', () => {
    const result = bulkSet(
      store,
      [
        { vaultId: 'v1', key: '', value: 'oops' },
        { vaultId: 'v1', key: 'VALID_KEY', value: 'ok' },
      ],
      'alice'
    );
    expect(result.succeeded).toContain('VALID_KEY');
    expect(result.failed.some((f) => f.key === '')).toBe(true);
  });
});

describe('bulkGet', () => {
  it('retrieves multiple secrets at once', () => {
    setSecret(store.secrets, 'v1', 'FOO', 'bar', 'alice');
    setSecret(store.secrets, 'v1', 'BAZ', 'qux', 'alice');
    const result = bulkGet(store, 'v1', ['FOO', 'BAZ', 'MISSING']);
    expect(result['FOO']).toBe('bar');
    expect(result['BAZ']).toBe('qux');
    expect(result['MISSING']).toBeUndefined();
  });
});

describe('bulkDelete', () => {
  it('deletes multiple secrets and reports success', () => {
    setSecret(store.secrets, 'v1', 'A', '1', 'alice');
    setSecret(store.secrets, 'v1', 'B', '2', 'alice');
    const result = bulkDelete(store, 'v1', ['A', 'B'], 'alice');
    expect(result.succeeded).toEqual(['A', 'B']);
    expect(result.failed).toHaveLength(0);
    expect(bulkGet(store, 'v1', ['A', 'B'])).toEqual({ A: undefined, B: undefined });
  });

  it('reports failure for non-existent keys', () => {
    const result = bulkDelete(store, 'v1', ['GHOST'], 'alice');
    expect(result.failed.some((f) => f.key === 'GHOST')).toBe(true);
  });
});
