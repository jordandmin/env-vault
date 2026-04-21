import {
  createChangelogStore,
  recordChange,
  getChangelogForVault,
  getChangelogByActor,
  getChangelogAfter,
  clearChangelog,
} from "./changelog";

describe("changelog", () => {
  const vaultA = "vault-a";
  const vaultB = "vault-b";
  const alice = "alice";
  const bob = "bob";

  it("creates an empty store", () => {
    const store = createChangelogStore();
    expect(store.entries.size).toBe(0);
  });

  it("records a change and returns the entry", () => {
    const store = createChangelogStore();
    const entry = recordChange(store, vaultA, alice, "secret.set", "DB_URL");
    expect(entry.id).toBeDefined();
    expect(entry.vaultId).toBe(vaultA);
    expect(entry.actor).toBe(alice);
    expect(entry.action).toBe("secret.set");
    expect(entry.targetKey).toBe("DB_URL");
    expect(typeof entry.timestamp).toBe("number");
  });

  it("stores metadata on the entry", () => {
    const store = createChangelogStore();
    const meta = { reason: "rotation" };
    const entry = recordChange(store, vaultA, alice, "key.rotated", undefined, meta);
    expect(entry.metadata).toEqual(meta);
  });

  it("retrieves changelog for a specific vault", () => {
    const store = createChangelogStore();
    recordChange(store, vaultA, alice, "secret.set", "KEY1");
    recordChange(store, vaultB, bob, "secret.set", "KEY2");
    recordChange(store, vaultA, bob, "member.added");
    const entries = getChangelogForVault(store, vaultA);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.vaultId === vaultA)).toBe(true);
  });

  it("returns entries sorted by timestamp ascending", () => {
    const store = createChangelogStore();
    recordChange(store, vaultA, alice, "secret.set");
    recordChange(store, vaultA, alice, "secret.delete");
    const entries = getChangelogForVault(store, vaultA);
    expect(entries[0].timestamp).toBeLessThanOrEqual(entries[1].timestamp);
  });

  it("retrieves changelog by actor across vaults", () => {
    const store = createChangelogStore();
    recordChange(store, vaultA, alice, "secret.set");
    recordChange(store, vaultB, alice, "vault.created");
    recordChange(store, vaultA, bob, "member.removed");
    const entries = getChangelogByActor(store, alice);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.actor === alice)).toBe(true);
  });

  it("filters entries after a given timestamp", () => {
    const store = createChangelogStore();
    const before = Date.now() - 1000;
    recordChange(store, vaultA, alice, "secret.set");
    const entries = getChangelogAfter(store, vaultA, before);
    expect(entries).toHaveLength(1);
  });

  it("returns empty array when no entries are after the timestamp", () => {
    const store = createChangelogStore();
    recordChange(store, vaultA, alice, "secret.set");
    const future = Date.now() + 100_000;
    const entries = getChangelogAfter(store, vaultA, future);
    expect(entries).toHaveLength(0);
  });

  it("clears changelog for a vault and returns count removed", () => {
    const store = createChangelogStore();
    recordChange(store, vaultA, alice, "secret.set");
    recordChange(store, vaultA, alice, "secret.delete");
    recordChange(store, vaultB, bob, "secret.set");
    const removed = clearChangelog(store, vaultA);
    expect(removed).toBe(2);
    expect(getChangelogForVault(store, vaultA)).toHaveLength(0);
    expect(getChangelogForVault(store, vaultB)).toHaveLength(1);
  });
});
