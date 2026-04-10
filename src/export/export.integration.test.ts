import { createVault } from '../vault';
import { createSecretStore, setSecret } from '../secrets';
import { exportVaultToJson, exportVaultToDotenv, importFromDotenv } from './export';

describe('export integration', () => {
  const vaultId = 'vault-export-int';
  const masterPassword = 'integration-test-pass';

  let secretStore: ReturnType<typeof createSecretStore>;

  beforeEach(() => {
    secretStore = createSecretStore();
  });

  it('exports secrets to JSON and round-trips correctly', async () => {
    await setSecret(secretStore, vaultId, 'DB_HOST', 'localhost', masterPassword, 'actor-1');
    await setSecret(secretStore, vaultId, 'DB_PORT', '5432', masterPassword, 'actor-1');

    const json = await exportVaultToJson(secretStore, vaultId, masterPassword);
    const parsed = JSON.parse(json);

    expect(parsed.vaultId).toBe(vaultId);
    expect(parsed.secrets).toHaveProperty('DB_HOST', 'localhost');
    expect(parsed.secrets).toHaveProperty('DB_PORT', '5432');
    expect(typeof parsed.exportedAt).toBe('string');
  });

  it('exports secrets to dotenv format', async () => {
    await setSecret(secretStore, vaultId, 'API_KEY', 'secret-key-123', masterPassword, 'actor-1');
    await setSecret(secretStore, vaultId, 'NODE_ENV', 'production', masterPassword, 'actor-1');

    const dotenv = await exportVaultToDotenv(secretStore, vaultId, masterPassword);

    expect(dotenv).toContain('API_KEY=secret-key-123');
    expect(dotenv).toContain('NODE_ENV=production');
  });

  it('imports from dotenv and stores secrets', async () => {
    const dotenvContent = 'IMPORTED_KEY=hello\nANOTHER_VAR=world\n';

    await importFromDotenv(secretStore, vaultId, dotenvContent, masterPassword, 'actor-import');

    const { getSecret } = await import('../secrets');
    const val1 = await getSecret(secretStore, vaultId, 'IMPORTED_KEY', masterPassword);
    const val2 = await getSecret(secretStore, vaultId, 'ANOTHER_VAR', masterPassword);

    expect(val1).toBe('hello');
    expect(val2).toBe('world');
  });

  it('handles empty vault export gracefully', async () => {
    const json = await exportVaultToJson(secretStore, 'empty-vault', masterPassword);
    const parsed = JSON.parse(json);

    expect(parsed.vaultId).toBe('empty-vault');
    expect(parsed.secrets).toEqual({});
  });

  it('dotenv import skips blank lines and comments', async () => {
    const dotenvContent = '# This is a comment\n\nCLEAN_VAR=value\n  \n';

    await importFromDotenv(secretStore, vaultId, dotenvContent, masterPassword, 'actor-2');

    const { getSecret } = await import('../secrets');
    const val = await getSecret(secretStore, vaultId, 'CLEAN_VAR', masterPassword);
    expect(val).toBe('value');
  });
});
