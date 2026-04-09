import { Vault } from './vault';

const TEST_PASSWORD = 'super-secret-password';
const TEST_USER = 'alice@example.com';

describe('Vault', () => {
  let vault: Vault;

  beforeEach(() => {
    vault = new Vault('test-vault', TEST_USER);
  });

  it('should initialize with correct metadata', () => {
    const meta = vault.getMetadata();
    expect(meta.name).toBe('test-vault');
    expect(meta.createdBy).toBe(TEST_USER);
    expect(meta.version).toBe(1);
  });

  it('should set and retrieve a secret', async () => {
    await vault.setSecret('DB_PASSWORD', 'hunter2', TEST_PASSWORD, TEST_USER);
    const value = await vault.getSecret('DB_PASSWORD', TEST_PASSWORD);
    expect(value).toBe('hunter2');
  });

  it('should return null for missing key', async () => {
    const value = await vault.getSecret('NONEXISTENT', TEST_PASSWORD);
    expect(value).toBeNull();
  });

  it('should list all keys', async () => {
    await vault.setSecret('KEY_A', 'value-a', TEST_PASSWORD, TEST_USER);
    await vault.setSecret('KEY_B', 'value-b', TEST_PASSWORD, TEST_USER);
    expect(vault.listKeys()).toEqual(expect.arrayContaining(['KEY_A', 'KEY_B']));
    expect(vault.listKeys()).toHaveLength(2);
  });

  it('should delete a secret', async () => {
    await vault.setSecret('TEMP_KEY', 'temp-value', TEST_PASSWORD, TEST_USER);
    expect(vault.deleteSecret('TEMP_KEY')).toBe(true);
    expect(vault.listKeys()).not.toContain('TEMP_KEY');
  });

  it('should return false when deleting nonexistent key', () => {
    expect(vault.deleteSecret('GHOST')).toBe(false);
  });

  it('should increment version on mutations', async () => {
    const initialVersion = vault.getMetadata().version;
    await vault.setSecret('API_KEY', 'abc123', TEST_PASSWORD, TEST_USER);
    expect(vault.getMetadata().version).toBe(initialVersion + 1);
  });

  it('should serialize and deserialize correctly', async () => {
    await vault.setSecret('RESTORE_ME', 'restored-value', TEST_PASSWORD, TEST_USER);
    const json = vault.toJSON() as any;
    const restored = Vault.fromJSON(json);
    const value = await restored.getSecret('RESTORE_ME', TEST_PASSWORD);
    expect(value).toBe('restored-value');
  });
});
