import { randomUUID } from 'crypto';
import { AuditAction, AuditEntry, AuditLog } from './audit.types';

export function createAuditLog(vaultId: string): AuditLog {
  return { vaultId, entries: [] };
}

export function recordEvent(
  log: AuditLog,
  action: AuditAction,
  actor: string,
  meta?: AuditEntry['meta']
): AuditEntry {
  const entry: AuditEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    actor,
    vaultId: log.vaultId,
    ...(meta !== undefined && { meta }),
  };
  log.entries.push(entry);
  return entry;
}

export function getEntriesByActor(
  log: AuditLog,
  actor: string
): AuditEntry[] {
  return log.entries.filter((e) => e.actor === actor);
}

export function getEntriesByAction(
  log: AuditLog,
  action: AuditAction
): AuditEntry[] {
  return log.entries.filter((e) => e.action === action);
}

export function getEntriesAfter(
  log: AuditLog,
  since: Date
): AuditEntry[] {
  return log.entries.filter(
    (e) => new Date(e.timestamp) > since
  );
}

export function serializeAuditLog(log: AuditLog): string {
  return JSON.stringify(log, null, 2);
}

export function deserializeAuditLog(raw: string): AuditLog {
  const parsed = JSON.parse(raw) as AuditLog;
  if (!parsed.vaultId || !Array.isArray(parsed.entries)) {
    throw new Error('Invalid audit log format');
  }
  return parsed;
}
