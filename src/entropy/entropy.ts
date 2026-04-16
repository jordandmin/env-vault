import { createHash, randomBytes } from "crypto";

export interface EntropyStore {
  samples: Map<string, number[]>;
  policies: Map<string, EntropyPolicy>;
}

export interface EntropyPolicy {
  vaultId: string;
  minEntropy: number; // bits
  blockBelow: boolean;
}

export function createEntropyStore(): EntropyStore {
  return { samples: new Map(), policies: new Map() };
}

export function setEntropyPolicy(
  store: EntropyStore,
  policy: EntropyPolicy
): void {
  store.policies.set(policy.vaultId, policy);
}

export function getEntropyPolicy(
  store: EntropyStore,
  vaultId: string
): EntropyPolicy | undefined {
  return store.policies.get(vaultId);
}

/**
 * Shannon entropy in bits for a UTF-8 string.
 */
export function measureEntropy(value: string): number {
  if (value.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return parseFloat((entropy * value.length).toFixed(4));
}

export function checkEntropy(
  store: EntropyStore,
  vaultId: string,
  value: string
): { allowed: boolean; entropy: number; minEntropy: number } {
  const policy = store.policies.get(vaultId);
  const entropy = measureEntropy(value);
  if (!policy) return { allowed: true, entropy, minEntropy: 0 };
  const allowed = !policy.blockBelow || entropy >= policy.minEntropy;
  return { allowed, entropy, minEntropy: policy.minEntropy };
}

export function generateHighEntropySecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function recordSample(
  store: EntropyStore,
  vaultId: string,
  entropy: number
): void {
  const list = store.samples.get(vaultId) ?? [];
  list.push(entropy);
  store.samples.set(vaultId, list);
}

export function getEntropySamples(
  store: EntropyStore,
  vaultId: string
): number[] {
  return store.samples.get(vaultId) ?? [];
}
