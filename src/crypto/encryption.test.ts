import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  EncryptedPayload,
} from './encryption';

const TEST_PASSWORD = 'super-secret-master-password';
const TEST_VALUE = 'DATABASE_URL=postgres://user:pass@localhost:5432/mydb';

describe('encryption', () => {
  it('should encrypt and decrypt a value correctly', () => {
    const payload = encrypt(TEST_VALUE, TEST_PASSWORD);
    const result = decrypt(payload, TEST_PASSWORD);
    expect(result).toBe(TEST_VALUE);
  });

  it('should produce different ciphertexts for the same input', () => {
    const payload1 = encrypt(TEST_VALUE, TEST_PASSWORD);
    const payload2 = encrypt(TEST_VALUE, TEST_PASSWORD);
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
    expect(payload1.iv).not.toBe(payload2.iv);
    expect(payload1.salt).not.toBe(payload2.salt);
  });

  it('should throw when decrypting with wrong password', () => {
    const payload = encrypt(TEST_VALUE, TEST_PASSWORD);
    expect(() => decrypt(payload, 'wrong-password')).toThrow();
  });

  it('should throw when ciphertext is tampered', () => {
    const payload = encrypt(TEST_VALUE, TEST_PASSWORD);
    const tampered: EncryptedPayload = {
      ...payload,
      ciphertext: payload.ciphertext.slice(0, -2) + 'ff',
    };
    expect(() => decrypt(tampered, TEST_PASSWORD)).toThrow();
  });

  it('should serialize and deserialize payload correctly', () => {
    const payload = encrypt(TEST_VALUE, TEST_PASSWORD);
    const serialized = serializePayload(payload);
    expect(typeof serialized).toBe('string');
    const deserialized = deserializePayload(serialized);
    expect(deserialized).toEqual(payload);
  });

  it('should round-trip serialize → decrypt successfully', () => {
    const payload = encrypt(TEST_VALUE, TEST_PASSWORD);
    const serialized = serializePayload(payload);
    const deserialized = deserializePayload(serialized);
    const result = decrypt(deserialized, TEST_PASSWORD);
    expect(result).toBe(TEST_VALUE);
  });
});
