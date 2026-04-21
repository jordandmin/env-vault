import {
  createWatchdogStore,
  addRule,
  removeRule,
  getRulesForVault,
  evaluate,
  acknowledgeAlert,
  getAlertsForVault,
} from './watchdog';

const VAULT_ID = 'vault-1';
const ACTOR = 'user-alice';

function makeStore() {
  return createWatchdogStore();
}

describe('watchdog', () => {
  it('creates an empty store', () => {
    const store = makeStore();
    expect(store.rules.size).toBe(0);
    expect(store.alerts.size).toBe(0);
  });

  it('adds and retrieves rules for a vault', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'High frequency access',
      description: 'Triggers on delete action',
      severity: 'warn',
      condition: (ctx) => ctx.action === 'secret.delete',
    });
    const rules = getRulesForVault(store, VAULT_ID);
    expect(rules).toHaveLength(1);
    expect(rules[0].name).toBe('High frequency access');
  });

  it('removes a rule', () => {
    const store = makeStore();
    const rule = addRule(store, {
      vaultId: VAULT_ID,
      name: 'Test rule',
      description: '',
      severity: 'info',
      condition: () => true,
    });
    expect(removeRule(store, rule.id)).toBe(true);
    expect(getRulesForVault(store, VAULT_ID)).toHaveLength(0);
  });

  it('evaluates rules and creates alerts when condition is met', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'Delete watcher',
      description: 'Alert on delete',
      severity: 'critical',
      condition: (ctx) => ctx.action === 'secret.delete',
    });

    const alerts = evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'secret.delete' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].acknowledged).toBe(false);
  });

  it('does not create alerts when condition is not met', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'Delete watcher',
      description: '',
      severity: 'warn',
      condition: (ctx) => ctx.action === 'secret.delete',
    });

    const alerts = evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'secret.read' });
    expect(alerts).toHaveLength(0);
  });

  it('acknowledges an alert', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'Always fires',
      description: '',
      severity: 'info',
      condition: () => true,
    });
    const [alert] = evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'any' });
    expect(acknowledgeAlert(store, alert.id)).toBe(true);
    expect(store.alerts.get(alert.id)?.acknowledged).toBe(true);
  });

  it('returns false when acknowledging unknown alert', () => {
    const store = makeStore();
    expect(acknowledgeAlert(store, 'nonexistent')).toBe(false);
  });

  it('filters unacknowledged alerts', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'Always fires',
      description: '',
      severity: 'info',
      condition: () => true,
    });
    evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'any' });
    evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'any' });

    const allAlerts = getAlertsForVault(store, VAULT_ID);
    expect(allAlerts).toHaveLength(2);

    acknowledgeAlert(store, allAlerts[0].id);
    const unacked = getAlertsForVault(store, VAULT_ID, true);
    expect(unacked).toHaveLength(1);
  });

  it('records audit events on alert trigger', () => {
    const store = makeStore();
    addRule(store, {
      vaultId: VAULT_ID,
      name: 'Audit rule',
      description: '',
      severity: 'warn',
      condition: () => true,
    });
    evaluate(store, { vaultId: VAULT_ID, actor: ACTOR, action: 'secret.write' });
    expect(store.audit.entries.length).toBeGreaterThan(0);
    expect(store.audit.entries[0].action).toBe('watchdog.alert');
  });
});
