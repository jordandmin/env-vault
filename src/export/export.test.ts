import {
  exportVaultToJson,
  exportVaultToDotenv,
  importFromDotenv,
} from './export';
import { SecretEntry } from '../secrets/secrets.types';
import { AuditEntry } from '../audit/audit.types';

const mockSecrets: SecretEntry[] = [
  { id: 's1', vaultId: 'v1', key: 'DB_HOST', value: 'localhost', createdAt: '', updatedAt: '', createdBy: 'alice' },
  { id: 's2', vaultId: 'v1', key: 'DB_PASS', value: 'secret123', createdAt: '', updatedAt: '', createdBy: 'alice' },
  { id: 's3', vaultId: 'v2', key: 'API_KEY', value: 'key-xyz', createdAt: '', updatedAt: '', createdBy: 'bob' },
  { id: 's4', vaultId: 'v1', key: 'OLD_KEY', value: 'old', createdAt: '', updatedAt: '', createdBy: 'alice', deletedAt: '2024-01-01' },
];

const mockAudit: AuditEntry[] = [
  { id: 'a1', vaultId: 'v1', action: 'set', actor: 'alice', timestamp: '', metadata: {} },
];

describe('exportVaultToJson', () => {
  it('exports only secrets for the given vault', () => {
    const result = exportVaultToJson('v1', 'alice', mockSecrets);
    expect(result.secrets).toHaveLength(2);
    expect(result.secrets.map((s) => s.key)).toContain('DB_HOST');
  });

  it('excludes deleted secrets', () => {
    const result = exportVaultToJson('v1', 'alice', mockSecrets);
    expect(result.secrets.map((s) => s.key)).not.toContain('OLD_KEY');
  });

  it('redacts values when redactValues is true', () => {
    const result = exportVaultToJson('v1', 'alice', mockSecrets, [], { redactValues: true });
    result.secrets.forEach((s) => expect(s.value).toBeUndefined());
  });

  it('includes audit log when requested', () => {
    const result = exportVaultToJson('v1', 'alice', mockSecrets, mockAudit, { includeAuditLog: true });
    expect(result.auditLog).toEqual(mockAudit);
  });

  it('omits audit log by default', () => {
    const result = exportVaultToJson('v1', 'alice', mockSecrets);
    expect(result.auditLog).toBeUndefined();
  });
});

describe('exportVaultToDotenv', () => {
  it('produces dotenv formatted output', () => {
    const result = exportVaultToDotenv('v1', mockSecrets);
    expect(result).toContain('DB_HOST=localhost');
    expect(result).toContain('DB_PASS=secret123');
    expect(result).not.toContain('API_KEY');
  });
});

describe('importFromDotenv', () => {
  it('parses key=value pairs', () => {
    const input = 'DB_HOST=localhost\nDB_PASS=secret123';
    const result = importFromDotenv('v1', input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ key: 'DB_HOST', value: 'localhost' });
  });

  it('ignores comment lines', () => {
    const input = '# comment\nKEY=val';
    const result = importFromDotenv('v1', input);
    expect(result).toHaveLength(1);
  });

  it('handles values containing equals signs', () => {
    const input = 'TOKEN=abc=def=';
    const result = importFromDotenv('v1', input);
    expect(result[0].value).toBe('abc=def=');
  });
});
