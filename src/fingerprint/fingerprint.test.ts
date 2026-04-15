import {
  createFingerprintStore,
  setPolicy,
  getPolicy,
  recordFingerprint,
  getFingerprint,
  verifyFingerprint,
  listFingerprintsForVault,
  computeFingerprint,
} from './fingerprint';

describe('fingerprint', () => {
  const vaultId = 'vault-1';
  const secretKey = 'DB_PASSWORD';
  const value = 'super-secret-123';

  test('createFingerprintStore returns empty store', () => {
    const store = createFingerprintStore();
    expect(store.policies.size).toBe(0);
    expect(store.records.size).toBe(0);
  });

  test('setPolicy and getPolicy round-trip', () => {
    const store = createFingerprintStore();
    setPolicy(store, { vaultId, fields: [secretKey], algorithm: 'sha256', includeMetadata: false });
    const policy = getPolicy(store, vaultId);
    expect(policy).toBeDefined();
    expect(policy?.algorithm).toBe('sha256');
  });

  test('computeFingerprint produces consistent hex digest', () => {
    const a = computeFingerprint('hello', 'sha256');
    const b = computeFingerprint('hello', 'sha256');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  test('computeFingerprint differs by algorithm', () => {
    const a = computeFingerprint('hello', 'sha256');
    const b = computeFingerprint('hello', 'sha512');
    expect(a).not.toBe(b);
  });

  test('recordFingerprint stores a record', () => {
    const store = createFingerprintStore();
    const record = recordFingerprint(store, vaultId, secretKey, value);
    expect(record.vaultId).toBe(vaultId);
    expect(record.secretKey).toBe(secretKey);
    expect(record.fingerprint).toBeTruthy();
    expect(record.computedAt).toBeGreaterThan(0);
  });

  test('getFingerprint retrieves stored record', () => {
    const store = createFingerprintStore();
    recordFingerprint(store, vaultId, secretKey, value);
    const record = getFingerprint(store, vaultId, secretKey);
    expect(record).toBeDefined();
    expect(record?.secretKey).toBe(secretKey);
  });

  test('verifyFingerprint returns true for matching value', () => {
    const store = createFingerprintStore();
    recordFingerprint(store, vaultId, secretKey, value);
    expect(verifyFingerprint(store, vaultId, secretKey, value)).toBe(true);
  });

  test('verifyFingerprint returns false for changed value', () => {
    const store = createFingerprintStore();
    recordFingerprint(store, vaultId, secretKey, value);
    expect(verifyFingerprint(store, vaultId, secretKey, 'wrong-value')).toBe(false);
  });

  test('verifyFingerprint returns false when no record exists', () => {
    const store = createFingerprintStore();
    expect(verifyFingerprint(store, vaultId, secretKey, value)).toBe(false);
  });

  test('recordFingerprint uses policy algorithm when set', () => {
    const store = createFingerprintStore();
    setPolicy(store, { vaultId, fields: [], algorithm: 'sha512', includeMetadata: false });
    const record = recordFingerprint(store, vaultId, secretKey, value);
    expect(record.algorithm).toBe('sha512');
    expect(record.fingerprint).toMatch(/^[a-f0-9]{128}$/);
  });

  test('listFingerprintsForVault returns only matching vault records', () => {
    const store = createFingerprintStore();
    recordFingerprint(store, vaultId, 'KEY_A', 'val-a');
    recordFingerprint(store, vaultId, 'KEY_B', 'val-b');
    recordFingerprint(store, 'vault-2', 'KEY_C', 'val-c');
    const list = listFingerprintsForVault(store, vaultId);
    expect(list).toHaveLength(2);
    expect(list.every(r => r.vaultId === vaultId)).toBe(true);
  });

  test('includeMetadata affects fingerprint', () => {
    const store = createFingerprintStore();
    setPolicy(store, { vaultId, fields: [], algorithm: 'sha256', includeMetadata: true });
    recordFingerprint(store, vaultId, secretKey, value, { env: 'prod' });
    expect(verifyFingerprint(store, vaultId, secretKey, value, { env: 'prod' })).toBe(true);
    expect(verifyFingerprint(store, vaultId, secretKey, value, { env: 'staging' })).toBe(false);
  });
});
