import { SecretTemplate, TemplateStore, TemplateVariable, ApplyTemplateResult } from './templates.types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createTemplateStore(): TemplateStore {
  return { templates: {} };
}

export function createTemplate(
  store: TemplateStore,
  vaultId: string,
  createdBy: string,
  name: string,
  description: string,
  variables: TemplateVariable[],
  pattern: Record<string, string>
): SecretTemplate {
  const id = generateId();
  const template: SecretTemplate = {
    id,
    name,
    description,
    vaultId,
    createdBy,
    createdAt: Date.now(),
    variables,
    pattern,
  };
  store.templates[id] = template;
  return template;
}

export function getTemplate(store: TemplateStore, templateId: string): SecretTemplate | undefined {
  return store.templates[templateId];
}

export function listTemplatesForVault(store: TemplateStore, vaultId: string): SecretTemplate[] {
  return Object.values(store.templates).filter(t => t.vaultId === vaultId);
}

export function deleteTemplate(store: TemplateStore, templateId: string): boolean {
  if (!store.templates[templateId]) return false;
  delete store.templates[templateId];
  return true;
}

export function applyTemplate(
  store: TemplateStore,
  templateId: string,
  variables: Record<string, string>
): ApplyTemplateResult {
  const template = store.templates[templateId];
  if (!template) {
    return { templateId, resolvedSecrets: {}, missingVariables: [] };
  }

  const missingVariables: string[] = [];
  for (const variable of template.variables) {
    if (variable.required && !(variable.name in variables) && variable.defaultValue === undefined) {
      missingVariables.push(variable.name);
    }
  }

  const resolvedSecrets: Record<string, string> = {};
  if (missingVariables.length === 0) {
    for (const [key, tmpl] of Object.entries(template.pattern)) {
      resolvedSecrets[key] = tmpl.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
        const variable = template.variables.find(v => v.name === varName);
        return variables[varName] ?? variable?.defaultValue ?? '';
      });
    }
  }

  return { templateId, resolvedSecrets, missingVariables };
}
