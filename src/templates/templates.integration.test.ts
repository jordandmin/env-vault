import {
  createTemplateStore,
  createTemplate,
  applyTemplate,
  listTemplatesForVault,
  deleteTemplate,
} from './templates';
import { TemplateVariable } from './templates.types';

describe('templates integration', () => {
  it('full lifecycle: create, apply, list, delete', () => {
    const store = createTemplateStore();
    const vaultId = 'vault-integration';

    const variables: TemplateVariable[] = [
      { name: 'service', type: 'string', required: true },
      { name: 'env', type: 'string', required: true },
      { name: 'port', type: 'number', required: false, defaultValue: '5432' },
    ];

    const pattern = {
      DATABASE_URL: 'postgres://{{service}}_{{env}}:password@localhost:{{port}}/{{service}}_{{env}}',
      SERVICE_NAME: '{{service}}-{{env}}',
    };

    const tmpl = createTemplate(store, vaultId, 'devops', 'Service DB', 'DB URL template', variables, pattern);
    expect(tmpl.id).toBeTruthy();

    const result = applyTemplate(store, tmpl.id, { service: 'payments', env: 'prod' });
    expect(result.missingVariables).toHaveLength(0);
    expect(result.resolvedSecrets['DATABASE_URL']).toBe(
      'postgres://payments_prod:password@localhost:5432/payments_prod'
    );
    expect(result.resolvedSecrets['SERVICE_NAME']).toBe('payments-prod');

    const tmpl2 = createTemplate(store, vaultId, 'devops', 'Cache Config', 'Redis template', [
      { name: 'env', type: 'string', required: true },
    ], { REDIS_URL: 'redis://cache-{{env}}.internal:6379' });

    const listed = listTemplatesForVault(store, vaultId);
    expect(listed).toHaveLength(2);
    expect(listed.map(t => t.name)).toContain('Service DB');
    expect(listed.map(t => t.name)).toContain('Cache Config');

    deleteTemplate(store, tmpl.id);
    expect(listTemplatesForVault(store, vaultId)).toHaveLength(1);

    const missingResult = applyTemplate(store, tmpl.id, { service: 'payments', env: 'prod' });
    expect(missingResult.resolvedSecrets).toEqual({});
  });

  it('multiple vaults do not share templates', () => {
    const store = createTemplateStore();
    const vars: TemplateVariable[] = [{ name: 'x', type: 'string', required: true }];
    createTemplate(store, 'vault-a', 'alice', 'TA', '', vars, { KEY: '{{x}}' });
    createTemplate(store, 'vault-b', 'bob', 'TB', '', vars, { KEY: '{{x}}' });
    expect(listTemplatesForVault(store, 'vault-a')).toHaveLength(1);
    expect(listTemplatesForVault(store, 'vault-b')).toHaveLength(1);
  });
});
