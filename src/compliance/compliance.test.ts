import {
  createComplianceStore,
  runComplianceCheck,
  getReportsForVault,
  getLatestReport,
  listAvailableRules,
} from './compliance';
import { ComplianceContext } from './compliance.types';

const fullyCompliantContext: ComplianceContext = {
  vaultId: 'vault-1',
  hasAuditLog: true,
  hasEncryption: true,
  hasAccessControl: true,
  hasKeyRotation: true,
  retentionDays: 90,
  mfaEnabled: true,
};

describe('createComplianceStore', () => {
  it('creates an empty store', () => {
    const store = createComplianceStore();
    expect(store.reports.size).toBe(0);
  });
});

describe('runComplianceCheck', () => {
  it('returns compliant for SOC2 when all rules pass', () => {
    const store = createComplianceStore();
    const report = runComplianceCheck(store, 'SOC2', fullyCompliantContext);
    expect(report.status).toBe('compliant');
    expect(report.failedRules).toHaveLength(0);
    expect(report.passedRules.length).toBeGreaterThan(0);
  });

  it('returns non-compliant when a rule fails', () => {
    const store = createComplianceStore();
    const ctx: ComplianceContext = { ...fullyCompliantContext, hasAuditLog: false };
    const report = runComplianceCheck(store, 'SOC2', ctx);
    expect(report.status).toBe('non-compliant');
    expect(report.failedRules).toContain('audit-log');
  });

  it('stores the report in the store', () => {
    const store = createComplianceStore();
    const report = runComplianceCheck(store, 'GDPR', fullyCompliantContext);
    expect(store.reports.has(report.id)).toBe(true);
  });

  it('checks GDPR data retention rule', () => {
    const store = createComplianceStore();
    const ctx: ComplianceContext = { ...fullyCompliantContext, retentionDays: 400 };
    const report = runComplianceCheck(store, 'GDPR', ctx);
    expect(report.failedRules).toContain('data-retention');
  });

  it('assigns correct vaultId and framework to report', () => {
    const store = createComplianceStore();
    const report = runComplianceCheck(store, 'PCI-DSS', fullyCompliantContext);
    expect(report.vaultId).toBe('vault-1');
    expect(report.framework).toBe('PCI-DSS');
  });
});

describe('getReportsForVault', () => {
  it('returns only reports for the given vault', () => {
    const store = createComplianceStore();
    runComplianceCheck(store, 'SOC2', fullyCompliantContext);
    runComplianceCheck(store, 'SOC2', { ...fullyCompliantContext, vaultId: 'vault-2' });
    const reports = getReportsForVault(store, 'vault-1');
    expect(reports).toHaveLength(1);
    expect(reports[0].vaultId).toBe('vault-1');
  });
});

describe('getLatestReport', () => {
  it('returns the most recently generated report', async () => {
    const store = createComplianceStore();
    runComplianceCheck(store, 'SOC2', fullyCompliantContext);
    await new Promise((r) => setTimeout(r, 5));
    const second = runComplianceCheck(store, 'SOC2', fullyCompliantContext);
    const latest = getLatestReport(store, 'vault-1', 'SOC2');
    expect(latest?.id).toBe(second.id);
  });

  it('returns undefined when no report exists', () => {
    const store = createComplianceStore();
    expect(getLatestReport(store, 'vault-x', 'SOC2')).toBeUndefined();
  });
});

describe('listAvailableRules', () => {
  it('returns rules for the specified framework', () => {
    const rules = listAvailableRules('SOC2');
    expect(rules.every((r) => r.framework === 'SOC2')).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
});
