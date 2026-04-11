export type TagColor =
  | "red"
  | "green"
  | "blue"
  | "yellow"
  | "purple"
  | "gray";

export interface Tag {
  id: string;
  vaultId: string;
  name: string;
  color: TagColor;
  createdAt: Date;
  createdBy: string;
}

export interface SecretTag {
  secretKey: string;
  vaultId: string;
  tagId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface TagStore {
  tags: Map<string, Tag>;
  secretTags: Map<string, SecretTag[]>;
}
