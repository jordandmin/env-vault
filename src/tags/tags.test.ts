import {
  createTagStore,
  createTag,
  deleteTag,
  assignTagToSecret,
  removeTagFromSecret,
  getTagsForSecret,
  getTagsForVault,
  getSecretsByTag,
} from "./tags";

describe("tags", () => {
  const vaultId = "vault-1";
  const actor = "user-1";

  describe("createTag", () => {
    it("creates a tag with correct fields", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "production", "red", actor);
      expect(tag.name).toBe("production");
      expect(tag.color).toBe("red");
      expect(tag.vaultId).toBe(vaultId);
      expect(tag.createdBy).toBe(actor);
      expect(tag.id).toBeTruthy();
    });

    it("trims tag name", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "  staging  ", "blue", actor);
      expect(tag.name).toBe("staging");
    });

    it("throws on empty name", () => {
      const store = createTagStore();
      expect(() => createTag(store, vaultId, "  ", "gray", actor)).toThrow(
        "must not be empty"
      );
    });

    it("throws on duplicate name within vault", () => {
      const store = createTagStore();
      createTag(store, vaultId, "env", "green", actor);
      expect(() => createTag(store, vaultId, "env", "blue", actor)).toThrow(
        'already exists'
      );
    });

    it("allows same name in different vaults", () => {
      const store = createTagStore();
      createTag(store, "vault-a", "env", "green", actor);
      expect(() => createTag(store, "vault-b", "env", "blue", actor)).not.toThrow();
    });
  });

  describe("deleteTag", () => {
    it("removes the tag and its associations", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "temp", "gray", actor);
      assignTagToSecret(store, vaultId, "MY_SECRET", tag.id, actor);
      deleteTag(store, tag.id);
      expect(getTagsForVault(store, vaultId)).toHaveLength(0);
      expect(getTagsForSecret(store, vaultId, "MY_SECRET")).toHaveLength(0);
    });

    it("throws when tag not found", () => {
      const store = createTagStore();
      expect(() => deleteTag(store, "nonexistent")).toThrow("Tag not found");
    });
  });

  describe("assignTagToSecret / removeTagFromSecret", () => {
    it("assigns and retrieves tags for a secret", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "critical", "red", actor);
      assignTagToSecret(store, vaultId, "DB_PASS", tag.id, actor);
      const tags = getTagsForSecret(store, vaultId, "DB_PASS");
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("critical");
    });

    it("is idempotent for duplicate assignment", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "info", "blue", actor);
      assignTagToSecret(store, vaultId, "API_KEY", tag.id, actor);
      assignTagToSecret(store, vaultId, "API_KEY", tag.id, actor);
      expect(getTagsForSecret(store, vaultId, "API_KEY")).toHaveLength(1);
    });

    it("removes a tag from a secret", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "removable", "yellow", actor);
      assignTagToSecret(store, vaultId, "TOKEN", tag.id, actor);
      removeTagFromSecret(store, vaultId, "TOKEN", tag.id);
      expect(getTagsForSecret(store, vaultId, "TOKEN")).toHaveLength(0);
    });
  });

  describe("getSecretsByTag", () => {
    it("returns all secrets with a given tag", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "shared", "purple", actor);
      assignTagToSecret(store, vaultId, "KEY_A", tag.id, actor);
      assignTagToSecret(store, vaultId, "KEY_B", tag.id, actor);
      const secrets = getSecretsByTag(store, vaultId, tag.id);
      expect(secrets).toContain("KEY_A");
      expect(secrets).toContain("KEY_B");
    });

    it("does not return secrets from other vaults", () => {
      const store = createTagStore();
      const tag = createTag(store, vaultId, "cross", "green", actor);
      assignTagToSecret(store, "other-vault", "LEAK", tag.id, actor);
      expect(getSecretsByTag(store, vaultId, tag.id)).toHaveLength(0);
    });
  });
});
