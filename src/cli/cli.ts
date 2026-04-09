import { createVault, getSecret, setSecret, deleteSecret } from '../vault';
import { createAuditLog, recordEvent } from '../audit/audit';
import { createAccessStore, checkAccess } from '../access/access';

const audit = createAuditLog();
const accessStore = createAccessStore();

export interface CliContext {
  actor: string;
  vaultId: string;
}

export async function cliSetSecret(
  ctx: CliContext,
  key: string,
  value: string,
  password: string
): Promise<void> {
  const hasAccess = checkAccess(accessStore, ctx.vaultId, ctx.actor, 'write');
  if (!hasAccess) {
    throw new Error(`Actor '${ctx.actor}' does not have write access to vault '${ctx.vaultId}'`);
  }
  const vault = createVault(ctx.vaultId, password);
  await setSecret(vault, key, value);
  recordEvent(audit, {
    vaultId: ctx.vaultId,
    actor: ctx.actor,
    action: 'set',
    key,
    timestamp: new Date().toISOString(),
  });
  console.log(`Secret '${key}' set in vault '${ctx.vaultId}'.`);
}

export async function cliGetSecret(
  ctx: CliContext,
  key: string,
  password: string
): Promise<string | undefined> {
  const hasAccess = checkAccess(accessStore, ctx.vaultId, ctx.actor, 'read');
  if (!hasAccess) {
    throw new Error(`Actor '${ctx.actor}' does not have read access to vault '${ctx.vaultId}'`);
  }
  const vault = createVault(ctx.vaultId, password);
  const value = await getSecret(vault, key);
  recordEvent(audit, {
    vaultId: ctx.vaultId,
    actor: ctx.actor,
    action: 'get',
    key,
    timestamp: new Date().toISOString(),
  });
  return value;
}

export async function cliDeleteSecret(
  ctx: CliContext,
  key: string,
  password: string
): Promise<void> {
  const hasAccess = checkAccess(accessStore, ctx.vaultId, ctx.actor, 'write');
  if (!hasAccess) {
    throw new Error(`Actor '${ctx.actor}' does not have write access to vault '${ctx.vaultId}'`);
  }
  const vault = createVault(ctx.vaultId, password);
  await deleteSecret(vault, key);
  recordEvent(audit, {
    vaultId: ctx.vaultId,
    actor: ctx.actor,
    action: 'delete',
    key,
    timestamp: new Date().toISOString(),
  });
  console.log(`Secret '${key}' deleted from vault '${ctx.vaultId}'.`);
}
