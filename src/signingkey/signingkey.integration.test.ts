import {
  createSigningKeyStore,
  createSigningKey,
  revokeSigningKey,
  signPayload,
  verifyPayload,
  setPolicy,
} from './signingkey';

describe('signingkey integration', () => {
  it('full lifecycle: create policy, sign, rotate key, verify with old key', () => {
    const store = createSigningKeyStore();
    const vaultId = 'vault-int';

    setPolicy(store, { vaultId, algorithm: 'HMAC-SHA256', rotationIntervalDays: 60 });

    const key1 = createSigningKey(store, vaultId);
    const result1 = signPayload(store, vaultId, 'payload-v1');
    expect(result1.keyId).toBe(key1.id);
    expect(verifyPayload(store, result1.keyId, 'payload-v1', result1.signature)).toBe(true);

    // Rotate: revoke old key and create new one
    revokeSigningKey(store, key1.id);
    const key2 = createSigningKey(store, vaultId);
    expect(key2.id).not.toBe(key1.id);

    const result2 = signPayload(store, vaultId, 'payload-v2');
    expect(result2.keyId).toBe(key2.id);
    expect(verifyPayload(store, result2.keyId, 'payload-v2', result2.signature)).toBe(true);

    // Old signature still verifiable with old key id
    expect(verifyPayload(store, key1.id, 'payload-v1', result1.signature)).toBe(true);

    // Cross-key verification fails
    expect(verifyPayload(store, key2.id, 'payload-v1', result1.signature)).toBe(false);
  });

  it('multiple vaults have independent keys', () => {
    const store = createSigningKeyStore();
    createSigningKey(store, 'vault-a');
    createSigningKey(store, 'vault-b');

    const resA = signPayload(store, 'vault-a', 'data');
    const resB = signPayload(store, 'vault-b', 'data');

    expect(resA.keyId).not.toBe(resB.keyId);
    expect(verifyPayload(store, resA.keyId, 'data', resA.signature)).toBe(true);
    expect(verifyPayload(store, resB.keyId, 'data', resB.signature)).toBe(true);
    // Cross-vault verification should fail
    expect(verifyPayload(store, resA.keyId, 'data', resB.signature)).toBe(false);
  });
});
