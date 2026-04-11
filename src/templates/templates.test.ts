import {
  createTemplateStore,
  createTemplate,
  getTemplate,
  listTemplatesForVault,
  deleteTemplate,
  applyTemplate,
} from './templates';
import { TemplateVariable } from './templates.types';

const variables: TemplateVariable[] = [
  { name: 'env', type: 'string', required: true, description: 'Environment name' },
  { name: 'region', type: 'string', required: false, defaultValue: 'us-east-1' },
];

const pattern = {
  DB_HOST: 'db.{{env}}.{{region}}.example.com',
  DB_NAME: 'myapp_{{env}}',
};

describe('templates', () => {
  it('creates a template store', () => {
    const store = createTemplateStore();
    expect(store.templates).toEqual({});
  });

  it('creates and retrieves a template', () => {
    const store = createTemplateStore();
    const tmpl = createTemplate(store, 'v1', 'alice', 'DB Config', 'Database config template', variables, pattern);
    expect(tmpl.name).toBe('DB Config');
    expect(tmpl.vaultId).toBe('v1');
    expect(getTemplate(store, tmpl.id)).toBe(tmpl);
  });

  it('returns undefined for missing template', () => {
    const store = createTemplateStore();
    expect(getTemplate(store, 'nonexistent')).toBeUndefined();
  });

  it('lists templates for a vault', () => {
    const store = createTemplateStore();
    createTemplate(store, 'v1', 'alice', 'T1', '', variables, pattern);
    createTemplate(store, 'v1', 'alice', 'T2', '', variables, pattern);
    createTemplate(store, 'v2', 'bob', 'T3', '', variables, pattern);
    expect(listTemplatesForVault(store, 'v1')).toHaveLength(2);
    expect(listTemplatesForVault(store, 'v2')).toHaveLength(1);
  });

  it('deletes a template', () => {
    const store = createTemplateStore();
    const tmpl = createTemplate(store, 'v1', 'alice', 'T1', '', variables, pattern);
    expect(deleteTemplate(store, tmpl.id)).toBe(true);
    expect(getTemplate(store, tmpl.id)).toBeUndefined();
    expect(deleteTemplate(store, tmpl.id)).toBe(false);
  });

  it('applies template with all variables provided', () => {
    const store = createTemplateStore();
    const tmpl = createTemplate(store, 'v1', 'alice', 'T1', '', variables, pattern);
    const result = applyTemplate(store, tmpl.id, { env: 'prod', region: 'eu-west-1' });
    expect(result.missingVariables).toHaveLength(0);
    expect(result.resolvedSecrets['DB_HOST']).toBe('db.prod.eu-west-1.example.com');
    expect(result.resolvedSecrets['DB_NAME']).toBe('myapp_prod');
  });

  it('uses default values when optional variable is omitted', () => {
    const store = createTemplateStore();
    const tmpl = createTemplate(store, 'v1', 'alice', 'T1', '', variables, pattern);
    const result = applyTemplate(store, tmpl.id, { env: 'staging' });
    expect(result.missingVariables).toHaveLength(0);
    expect(result.resolvedSecrets['DB_HOST']).toBe('db.staging.us-east-1.example.com');
  });

  it('reports missing required variables', () => {
    const store = createTemplateStore();
    const tmpl = createTemplate(store, 'v1', 'alice', 'T1', '', variables, pattern);
    const result = applyTemplate(store, tmpl.id, {});
    expect(result.missingVariables).toContain('env');
    expect(result.resolvedSecrets).toEqual({});
  });

  it('returns empty result for unknown template', () => {
    const store = createTemplateStore();
    const result = applyTemplate(store, 'ghost', { env: 'prod' });
    expect(result.resolvedSecrets).toEqual({});
    expect(result.missingVariables).toHaveLength(0);
  });
});
