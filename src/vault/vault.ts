import { encrypt, decrypt, serializePayload, deserializePayload, deriveKey } from '../crypto/encryption';
import { VaultEntry, VaultMetadata } from './vault.types';

export class Vault {
  private entries: Map<string, VaultEntry> = new Map();
  private metadata: VaultMetadata;

  constructor(name: string, createdBy: string) {
    this.metadata = {
      name,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  async setSecret(key: string, value: string, password: string, setBy: string): Promise<void> {
    const derivedKey = await deriveKey(password);
    const payload = await encrypt(value, derivedKey.key);
    const serialized = serializePayload(payload);

    this.entries.set(key, {
      key,
      encryptedValue: serialized,
      salt: derivedKey.salt,
      setBy,
      setAt: new Date().toISOString(),
    });

    this.metadata.updatedAt = new Date().toISOString();
    this.metadata.version += 1;
  }

  async getSecret(key: string, password: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;

    const derivedKey = await deriveKey(password, entry.salt);
    const payload = deserializePayload(entry.encryptedValue);
    return decrypt(payload, derivedKey.key);
  }

  deleteSecret(key: string): boolean {
    const existed = this.entries.has(key);
    if (existed) {
      this.entries.delete(key);
      this.metadata.updatedAt = new Date().toISOString();
      this.metadata.version += 1;
    }
    return existed;
  }

  listKeys(): string[] {
    return Array.from(this.entries.keys());
  }

  getMetadata(): VaultMetadata {
    return { ...this.metadata };
  }

  toJSON(): object {
    return {
      metadata: this.metadata,
      entries: Object.fromEntries(this.entries),
    };
  }

  static fromJSON(data: { metadata: VaultMetadata; entries: Record<string, VaultEntry> }): Vault {
    const vault = new Vault(data.metadata.name, data.metadata.createdBy);
    vault.metadata = data.metadata;
    vault.entries = new Map(Object.entries(data.entries));
    return vault;
  }
}
