import { execSync } from 'child_process';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli/cli.js');

function runCli(args: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, { encoding: 'utf-8' });
    return { stdout, stderr: '', status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      status: err.status ?? 1,
    };
  }
}

describe('CLI integration', () => {
  it('shows help when no arguments provided', () => {
    const result = runCli('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/usage/i);
  });

  it('returns non-zero exit code for unknown command', () => {
    const result = runCli('unknown-command');
    expect(result.status).not.toBe(0);
  });

  it('vault init creates a new vault', () => {
    const result = runCli('vault init --name test-vault --actor alice');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/created|initialized/i);
  });

  it('vault set and get round-trip', () => {
    const vaultId = 'cli-test-vault';
    const setResult = runCli(`vault set --vault ${vaultId} --key DB_URL --value postgres://localhost/test --actor alice --password secret`);
    expect(setResult.status).toBe(0);

    const getResult = runCli(`vault get --vault ${vaultId} --key DB_URL --actor alice --password secret`);
    expect(getResult.status).toBe(0);
    expect(getResult.stdout).toContain('postgres://localhost/test');
  });

  it('vault get returns error for missing key', () => {
    const result = runCli('vault get --vault nonexistent-vault --key MISSING_KEY --actor alice --password secret');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not found|error/i);
  });
});
