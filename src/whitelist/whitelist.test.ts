import {
  createWhitelistStore,
  addToWhitelist,
  removeFromWhitelist,
  getWhitelistForVault,
  isKeyWhitelisted,
} from "./whitelist";

describe("whitelist", () => {
  it("creates an empty store", () => {
    const store = createWhitelistStore();
    expect(store.entries.size).toBe(0);
  });

  it("adds an entry and retrieves it", () => {
    const store = createWhitelistStore();
    const entry = addToWhitelist(store, "vault-1", "DB_*", "alice", "DB vars");
    expect(entry.id).toBeDefined();
    expect(entry.vaultId).toBe("vault-1");
    expect(entry.pattern).toBe("DB_*");
    expect(entry.createdBy).toBe("alice");
    expect(entry.description).toBe("DB vars");
  });

  it("removes an entry", () => {
    const store = createWhitelistStore();
    const entry = addToWhitelist(store, "vault-1", "API_KEY", "alice");
    const removed = removeFromWhitelist(store, entry.id);
    expect(removed).toBe(true);
    expect(store.entries.has(entry.id)).toBe(false);
  });

  it("returns false when removing non-existent entry", () => {
    const store = createWhitelistStore();
    expect(removeFromWhitelist(store, "no-such-id")).toBe(false);
  });

  it("gets whitelist entries scoped to vault", () => {
    const store = createWhitelistStore();
    addToWhitelist(store, "vault-1", "A_*", "alice");
    addToWhitelist(store, "vault-2", "B_*", "bob");
    const v1 = getWhitelistForVault(store, "vault-1");
    expect(v1).toHaveLength(1);
    expect(v1[0].pattern).toBe("A_*");
  });

  it("allows all keys when no whitelist entries exist", () => {
    const store = createWhitelistStore();
    expect(isKeyWhitelisted(store, "vault-1", "ANY_KEY")).toBe(true);
  });

  it("matches exact key pattern", () => {
    const store = createWhitelistStore();
    addToWhitelist(store, "vault-1", "SECRET_KEY", "alice");
    expect(isKeyWhitelisted(store, "vault-1", "SECRET_KEY")).toBe(true);
    expect(isKeyWhitelisted(store, "vault-1", "OTHER_KEY")).toBe(false);
  });

  it("matches prefix wildcard pattern", () => {
    const store = createWhitelistStore();
    addToWhitelist(store, "vault-1", "DB_*", "alice");
    expect(isKeyWhitelisted(store, "vault-1", "DB_HOST")).toBe(true);
    expect(isKeyWhitelisted(store, "vault-1", "DB_PASS")).toBe(true);
    expect(isKeyWhitelisted(store, "vault-1", "API_KEY")).toBe(false);
  });

  it("matches suffix wildcard pattern", () => {
    const store = createWhitelistStore();
    addToWhitelist(store, "vault-1", "*_SECRET", "alice");
    expect(isKeyWhitelisted(store, "vault-1", "AWS_SECRET")).toBe(true);
    expect(isKeyWhitelisted(store, "vault-1", "DB_HOST")).toBe(false);
  });

  it("matches global wildcard", () => {
    const store = createWhitelistStore();
    addToWhitelist(store, "vault-1", "*", "alice");
    expect(isKeyWhitelisted(store, "vault-1", "ANYTHING")).toBe(true);
  });
});
