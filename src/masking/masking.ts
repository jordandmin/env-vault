/**
 * Secret value masking — redacts sensitive values for display/logging.
 */

export type MaskMode = "full" | "partial" | "hash";

export interface MaskPolicy {
  vaultId: string;
  mode: MaskMode;
  /** Number of trailing chars to reveal when mode is 'partial' */
  revealCount?: number;
}

export interface MaskingStore {
  policies: Map<string, MaskPolicy>;
}

export function createMaskingStore(): MaskingStore {
  return { policies: new Map() };
}

export function setMaskPolicy(
  store: MaskingStore,
  policy: MaskPolicy
): MaskPolicy {
  store.policies.set(policy.vaultId, policy);
  return policy;
}

export function getMaskPolicy(
  store: MaskingStore,
  vaultId: string
): MaskPolicy | undefined {
  return store.policies.get(vaultId);
}

export function maskValue(
  value: string,
  policy: MaskPolicy
): string {
  if (value.length === 0) return value;

  switch (policy.mode) {
    case "full":
      return "*".repeat(Math.min(value.length, 8));

    case "partial": {
      const reveal = Math.min(policy.revealCount ?? 4, value.length);
      const hidden = value.length - reveal;
      return "*".repeat(hidden) + value.slice(-reveal);
    }

    case "hash": {
      // Deterministic but non-reversible hex digest (simple djb2)
      let h = 5381;
      for (let i = 0; i < value.length; i++) {
        h = ((h << 5) + h) ^ value.charCodeAt(i);
        h = h >>> 0;
      }
      return `[hash:${h.toString(16).padStart(8, "0")}]`;
    }

    default:
      return "*".repeat(8);
  }
}

export function maskRecord(
  record: Record<string, string>,
  policy: MaskPolicy
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = maskValue(value, policy);
  }
  return result;
}
