import { createRotationStore, createRotationPolicy, getPolicyForVault, startRotation, completeRotation, cancelRotation, getRotationHistory } from './rotation';
import { createKeyStore, createKey, rotateKey } from '../keys/keys';
import { createSecretStore, setSecret, getSecret } from '../secrets/secrets';
import { createVault } from '../vault/vault';

describe('rotation integration', () => {
  const vaultId = 'vault-integration-1';
  const actor = 'admin@example.com';

  let rotationStore: ReturnType<typeof createRotationStore>;
  let keyStore: ReturnType<typeof createKeyStore>;
  let secretStore: ReturnType<typeof createSecretStore>;
  let vault: ReturnType<typeof createVault>;

  beforeEach(() => {
    rotationStore = createRotationStore();
    keyStore = createKeyStore();
    secretStore = createSecretStore();
    vault = createVault(vaultId, actor);
  });

  it('creates a rotation policy and starts a rotation cycle', () => {
    const policy = createRotationPolicy(rotationStore, vaultId, { intervalDays: 30, actor });
    expect(policy.vaultId).toBe(vaultId);
    expect(policy.intervalDays).toBe(30);

    const fetched = getPolicyForVault(rotationStore, vaultId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(policy.id);
  });

  it('starts and completes a rotation, updating key and secrets', () => {
    createRotationPolicy(rotationStore, vaultId, { intervalDays: 7, actor });

    const key = createKey(keyStore, vaultId, actor);
    setSecret(secretStore, vaultId, 'DB_URL', 'postgres://old', key.id, actor);

    const rotation = startRotation(rotationStore, vaultId, actor);
    expect(rotation.status).toBe('in_progress');

    const newKey = rotateKey(keyStore, vaultId, actor);
    setSecret(secretStore, vaultId, 'DB_URL', 'postgres://new', newKey.id, actor);

    const completed = completeRotation(rotationStore, rotation.id, actor);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();

    const secret = getSecret(secretStore, vaultId, 'DB_URL', actor);
    expect(secret?.value).toBe('postgres://new');
  });

  it('cancels an in-progress rotation', () => {
    createRotationPolicy(rotationStore, vaultId, { intervalDays: 14, actor });
    const rotation = startRotation(rotationStore, vaultId, actor);
    expect(rotation.status).toBe('in_progress');

    const cancelled = cancelRotation(rotationStore, rotation.id, actor);
    expect(cancelled.status).toBe('cancelled');
  });

  it('tracks full rotation history for a vault', () => {
    createRotationPolicy(rotationStore, vaultId, { intervalDays: 30, actor });

    const r1 = startRotation(rotationStore, vaultId, actor);
    completeRotation(rotationStore, r1.id, actor);

    const r2 = startRotation(rotationStore, vaultId, actor);
    cancelRotation(rotationStore, r2.id, actor);

    const history = getRotationHistory(rotationStore, vaultId);
    expect(history).toHaveLength(2);
    expect(history.map(r => r.status)).toEqual(expect.arrayContaining(['completed', 'cancelled']));
  });
});
