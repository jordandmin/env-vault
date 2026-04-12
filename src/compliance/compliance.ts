import {
  ComplianceContext,
  ComplianceFramework,
  ComplianceReport,
  ComplianceRule,
  ComplianceStatus,
  ComplianceStore,
} from './compliance.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const RULES: ComplianceRule[] = [
  {
    id: 'audit-log',
    framework: 'SOC2',
    name: 'Audit Logging',
    description: 'All actions must be logged',
    check: (ctx) => ctx.hasAuditLog,
  },
  {
    id: 'encryption-at-rest',
    framework: 'SOC2',
    name: 'Encryption at Rest',
    description: 'Secrets must be encrypted',
    check: (ctx) => ctx.hasEncryption,
  },
  {
    id: 'access-control',
    framework: 'HIPAA',
    name: 'Access Control',
    description: 'Access must be controlled and restricted',
    check: (ctx) => ctx.hasAccessControl,
  },
  {
    id: 'key-rotation',
    framework: 'PCI-DSS',
    name: 'Key Rotation',
    description: 'Encryption keys must be rotated regularly',
    check: (ctx) => ctx.hasKeyRotation,
  },
  {
    id: 'data-retention',
    framework: 'GDPR',
    name: 'Data Retention',
    description: 'Data retention must not exceed 365 days',
    check: (ctx) => ctx.retentionDays <= 365,
  },
  {
    id: 'mfa',
    framework: 'SOC2',
    name: 'Multi-Factor Authentication',
    description: 'MFA must be enabled for vault access',
    check: (ctx) => ctx.mfaEnabled,
  },
];

export function createComplianceStore(): ComplianceStore {
  return { reports: new Map() };
}

export function runComplianceCheck(
  store: ComplianceStore,
  framework: ComplianceFramework,
  context: ComplianceContext
): ComplianceReport {
  const frameworkRules = RULES.filter((r) => r.framework === framework);
  const passedRules: string[] = [];
  const failedRules: string[] = [];

  for (const rule of frameworkRules) {
    if (rule.check(context)) {
      passedRules.push(rule.id);
    } else {
      failedRules.push(rule.id);
    }
  }

  const status: ComplianceStatus =
    failedRules.length === 0 ? 'compliant' : 'non-compliant';

  const report: ComplianceReport = {
    id: generateId(),
    vaultId: context.vaultId,
    framework,
    status,
    passedRules,
    failedRules,
    generatedAt: Date.now(),
  };

  store.reports.set(report.id, report);
  return report;
}

export function getReportsForVault(
  store: ComplianceStore,
  vaultId: string
): ComplianceReport[] {
  return Array.from(store.reports.values()).filter(
    (r) => r.vaultId === vaultId
  );
}

export function getLatestReport(
  store: ComplianceStore,
  vaultId: string,
  framework: ComplianceFramework
): ComplianceReport | undefined {
  return getReportsForVault(store, vaultId)
    .filter((r) => r.framework === framework)
    .sort((a, b) => b.generatedAt - a.generatedAt)[0];
}

export function listAvailableRules(framework: ComplianceFramework): ComplianceRule[] {
  return RULES.filter((r) => r.framework === framework);
}
