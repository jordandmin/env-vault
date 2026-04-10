import { VaultEntry } from '../vault/vault.types';
import { SecretEntry } from '../secrets/secrets.types';
import { AuditEntry } from '../audit/audit.types';

export interface ExportOptions {
  includeAuditLog?: boolean;
  redactValues?: boolean;
  format?: 'json' | 'dotenv';
}

export interface ExportPayload {
  vaultId: string;
  exportedAt: string;
  exportedBy: string;
  secrets: Array<{ key: string; value?: string }>;
  auditLog?: AuditEntry[];
}

export function exportVaultToJson(
  vaultId: string,
  exportedBy: string,
  secrets: SecretEntry[],
  auditEntries: AuditEntry[] = [],
  options: ExportOptions = {}
): ExportPayload {
  const { includeAuditLog = false, redactValues = false } = options;

  const exportedSecrets = secrets
    .filter((s) => s.vaultId === vaultId && !s.deletedAt)
    .map((s) => ({
      key: s.key,
      ...(redactValues ? {} : { value: s.value }),
    }));

  return {
    vaultId,
    exportedAt: new Date().toISOString(),
    exportedBy,
    secrets: exportedSecrets,
    ...(includeAuditLog ? { auditLog: auditEntries } : {}),
  };
}

export function exportVaultToDotenv(
  vaultId: string,
  secrets: SecretEntry[]
): string {
  return secrets
    .filter((s) => s.vaultId === vaultId && !s.deletedAt)
    .map((s) => `${s.key}=${s.value}`)
    .join('\n');
}

export function importFromDotenv(
  vaultId: string,
  dotenvContent: string
): Array<{ key: string; value: string }> {
  return dotenvContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) return null;
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();
      return key ? { key, value } : null;
    })
    .filter((entry): entry is { key: string; value: string } => entry !== null);
}
