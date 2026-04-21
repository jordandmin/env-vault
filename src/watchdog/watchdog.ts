import { createAuditLog, recordEvent } from '../audit/audit';

export type WatchdogSeverity = 'info' | 'warn' | 'critical';

export interface WatchdogRule {
  id: string;
  vaultId: string;
  name: string;
  description: string;
  severity: WatchdogSeverity;
  condition: (context: WatchdogContext) => boolean;
  createdAt: number;
}

export interface WatchdogAlert {
  id: string;
  ruleId: string;
  vaultId: string;
  severity: WatchdogSeverity;
  message: string;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface WatchdogContext {
  vaultId: string;
  actor: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface WatchdogStore {
  rules: Map<string, WatchdogRule>;
  alerts: Map<string, WatchdogAlert>;
  audit: ReturnType<typeof createAuditLog>;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): number {
  return Date.now();
}

export function createWatchdogStore(): WatchdogStore {
  return {
    rules: new Map(),
    alerts: new Map(),
    audit: createAuditLog(),
  };
}

export function addRule(
  store: WatchdogStore,
  rule: Omit<WatchdogRule, 'id' | 'createdAt'>
): WatchdogRule {
  const newRule: WatchdogRule = { ...rule, id: generateId(), createdAt: now() };
  store.rules.set(newRule.id, newRule);
  return newRule;
}

export function removeRule(store: WatchdogStore, ruleId: string): boolean {
  return store.rules.delete(ruleId);
}

export function getRulesForVault(store: WatchdogStore, vaultId: string): WatchdogRule[] {
  return Array.from(store.rules.values()).filter((r) => r.vaultId === vaultId);
}

export function evaluate(
  store: WatchdogStore,
  context: WatchdogContext
): WatchdogAlert[] {
  const rules = getRulesForVault(store, context.vaultId);
  const triggered: WatchdogAlert[] = [];

  for (const rule of rules) {
    if (rule.condition(context)) {
      const alert: WatchdogAlert = {
        id: generateId(),
        ruleId: rule.id,
        vaultId: context.vaultId,
        severity: rule.severity,
        message: `Rule "${rule.name}" triggered by ${context.actor} performing ${context.action}`,
        triggeredAt: now(),
        acknowledged: false,
      };
      store.alerts.set(alert.id, alert);
      recordEvent(store.audit, {
        actor: context.actor,
        action: 'watchdog.alert',
        vaultId: context.vaultId,
        metadata: { ruleId: rule.id, severity: rule.severity },
      });
      triggered.push(alert);
    }
  }

  return triggered;
}

export function acknowledgeAlert(store: WatchdogStore, alertId: string): boolean {
  const alert = store.alerts.get(alertId);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
}

export function getAlertsForVault(
  store: WatchdogStore,
  vaultId: string,
  onlyUnacknowledged = false
): WatchdogAlert[] {
  return Array.from(store.alerts.values()).filter(
    (a) => a.vaultId === vaultId && (!onlyUnacknowledged || !a.acknowledged)
  );
}
