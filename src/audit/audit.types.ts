export type AuditAction =
  | 'vault.create'
  | 'vault.open'
  | 'secret.set'
  | 'secret.get'
  | 'secret.delete'
  | 'vault.export'
  | 'vault.import';

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  action: AuditAction;
  actor: string;
  vaultId: string;
  meta?: Record<string, string | number | boolean>;
}

export interface AuditLog {
  vaultId: string;
  entries: AuditEntry[];
}
