export type TemplateVariableType = 'string' | 'number' | 'boolean' | 'secret';

export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface SecretTemplate {
  id: string;
  name: string;
  description: string;
  vaultId: string;
  createdBy: string;
  createdAt: number;
  variables: TemplateVariable[];
  pattern: Record<string, string>; // key -> template string with {{variable}} placeholders
}

export interface TemplateStore {
  templates: Record<string, SecretTemplate>;
}

export interface ApplyTemplateResult {
  templateId: string;
  resolvedSecrets: Record<string, string>;
  missingVariables: string[];
}
