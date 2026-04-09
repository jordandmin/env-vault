import { cliSetSecret, cliGetSecret, cliDeleteSecret, CliContext } from './cli';
import { createAccessStore, grantAccess } from '../access/access';
import * as accessModule from '../access/access';

const mockAccessStore = createAccessStore();

beforeEach(() => {
  jest.spyOn(accessModule, 'createAccessStore').mockReturnValue(mockAccessStore);
  jest.spyOn(accessModule, 'checkAccess').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const ctx: CliContext = { actor: 'alice', vaultId: 'vault-1' };
const password = 'super-secret-password';

describe('cliSetSecret', () => {
  it('should set a secret without throwing when access is granted', async () => {
    await expect(cliSetSecret(ctx, 'API_KEY', 'abc123', password)).resolves.not.toThrow();
  });

  it('should throw when access is denied', async () => {
    jest.spyOn(accessModule, 'checkAccess').mockReturnValue(false);
    await expect(cliSetSecret(ctx, 'API_KEY', 'abc123', password)).rejects.toThrow(
      "Actor 'alice' does not have write access to vault 'vault-1'"
    );
  });
});

describe('cliGetSecret', () => {
  it('should retrieve a secret that was previously set', async () => {
    await cliSetSecret(ctx, 'DB_PASS', 'hunter2', password);
    const value = await cliGetSecret(ctx, 'DB_PASS', password);
    expect(value).toBe('hunter2');
  });

  it('should throw when read access is denied', async () => {
    jest.spyOn(accessModule, 'checkAccess').mockReturnValue(false);
    await expect(cliGetSecret(ctx, 'DB_PASS', password)).rejects.toThrow(
      "Actor 'alice' does not have read access to vault 'vault-1'"
    );
  });
});

describe('cliDeleteSecret', () => {
  it('should delete a secret without throwing when access is granted', async () => {
    await cliSetSecret(ctx, 'TOKEN', 'xyz', password);
    await expect(cliDeleteSecret(ctx, 'TOKEN', password)).resolves.not.toThrow();
  });

  it('should throw when write access is denied', async () => {
    jest.spyOn(accessModule, 'checkAccess').mockReturnValue(false);
    await expect(cliDeleteSecret(ctx, 'TOKEN', password)).rejects.toThrow(
      "Actor 'alice' does not have write access to vault 'vault-1'"
    );
  });
});
