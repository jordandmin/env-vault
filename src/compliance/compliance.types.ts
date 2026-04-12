export type ComplianceFramework = 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI-DSS';

export type ComplianceStatus = 'compliant' | 'non-compliant' | 'pending';

export interface ComplianceRule {
  id: string;
  framework: ComplianceFramework;
  name: string;
  description: string;
  check: (context: ComplianceContext) => boolean;
}

export interface ComplianceContext {
  vaultId: string;
  hasAuditLog: boolean;
  hasEncryption: boolean;
  hasAccessControl: boolean;
  hasKeyRotation: boolean;
  retentionDays: number;
  mfaEnabled: boolean;
}

export interface ComplianceReport {
  id: string;
  vaultId: string;
  framework: ComplianceFramework;
  status: ComplianceStatus;
  passedRules: string[];
  failedRules: string[];
  generatedAt: number;
}

export interface ComplianceStore {
  reports: Map<string, ComplianceReport>;
}
