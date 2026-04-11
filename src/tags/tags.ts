import { Tag, TagColor, TagStore, SecretTag } from "./tags.types";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createTagStore(): TagStore {
  return {
    tags: new Map(),
    secretTags: new Map(),
  };
}

export function createTag(
  store: TagStore,
  vaultId: string,
  name: string,
  color: TagColor,
  createdBy: string
): Tag {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name must not be empty");

  const existing = [...store.tags.values()].find(
    (t) => t.vaultId === vaultId && t.name === trimmed
  );
  if (existing) throw new Error(`Tag "${trimmed}" already exists in vault`);

  const tag: Tag = {
    id: generateId(),
    vaultId,
    name: trimmed,
    color,
    createdAt: new Date(),
    createdBy,
  };
  store.tags.set(tag.id, tag);
  return tag;
}

export function deleteTag(store: TagStore, tagId: string): void {
  if (!store.tags.has(tagId)) throw new Error(`Tag not found: ${tagId}`);
  store.tags.delete(tagId);
  // Remove all secret associations for this tag
  for (const [key, entries] of store.secretTags.entries()) {
    const filtered = entries.filter((e) => e.tagId !== tagId);
    if (filtered.length === 0) store.secretTags.delete(key);
    else store.secretTags.set(key, filtered);
  }
}

export function assignTagToSecret(
  store: TagStore,
  vaultId: string,
  secretKey: string,
  tagId: string,
  assignedBy: string
): void {
  if (!store.tags.has(tagId)) throw new Error(`Tag not found: ${tagId}`);
  const storeKey = `${vaultId}:${secretKey}`;
  const current = store.secretTags.get(storeKey) ?? [];
  if (current.some((e) => e.tagId === tagId)) return; // already assigned
  const entry: SecretTag = {
    secretKey,
    vaultId,
    tagId,
    assignedAt: new Date(),
    assignedBy,
  };
  store.secretTags.set(storeKey, [...current, entry]);
}

export function removeTagFromSecret(
  store: TagStore,
  vaultId: string,
  secretKey: string,
  tagId: string
): void {
  const storeKey = `${vaultId}:${secretKey}`;
  const current = store.secretTags.get(storeKey) ?? [];
  const filtered = current.filter((e) => e.tagId !== tagId);
  if (filtered.length === 0) store.secretTags.delete(storeKey);
  else store.secretTags.set(storeKey, filtered);
}

export function getTagsForSecret(
  store: TagStore,
  vaultId: string,
  secretKey: string
): Tag[] {
  const storeKey = `${vaultId}:${secretKey}`;
  const entries = store.secretTags.get(storeKey) ?? [];
  return entries
    .map((e) => store.tags.get(e.tagId))
    .filter((t): t is Tag => t !== undefined);
}

export function getTagsForVault(store: TagStore, vaultId: string): Tag[] {
  return [...store.tags.values()].filter((t) => t.vaultId === vaultId);
}

export function getSecretsByTag(
  store: TagStore,
  vaultId: string,
  tagId: string
): string[] {
  const results: string[] = [];
  for (const [storeKey, entries] of store.secretTags.entries()) {
    if (!storeKey.startsWith(`${vaultId}:`)) continue;
    if (entries.some((e) => e.tagId === tagId)) {
      const secretKey = storeKey.slice(vaultId.length + 1);
      results.push(secretKey);
    }
  }
  return results;
}
