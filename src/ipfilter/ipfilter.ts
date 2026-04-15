import { IpFilterStore, IpFilterPolicy, IpFilterAction, IpFilterCheckResult } from './ipfilter.types';

function now(): number {
  return Date.now();
}

export function createIpFilterStore(): IpFilterStore {
  return { policies: new Map() };
}

export function setIpFilterPolicy(
  store: IpFilterStore,
  vaultId: string,
  action: IpFilterAction,
  ranges: string[]
): IpFilterPolicy {
  const existing = store.policies.get(vaultId);
  const policy: IpFilterPolicy = {
    vaultId,
    action,
    ranges: [...ranges],
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  store.policies.set(vaultId, policy);
  return policy;
}

export function getIpFilterPolicy(
  store: IpFilterStore,
  vaultId: string
): IpFilterPolicy | null {
  return store.policies.get(vaultId) ?? null;
}

export function removeIpFilterPolicy(
  store: IpFilterStore,
  vaultId: string
): boolean {
  return store.policies.delete(vaultId);
}

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [base, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(base) & mask);
}

export function checkIpAccess(
  store: IpFilterStore,
  vaultId: string,
  ip: string
): IpFilterCheckResult {
  const policy = store.policies.get(vaultId) ?? null;
  if (!policy) {
    return { allowed: true, matchedRange: null, policy: null };
  }
  const matched = policy.ranges.find((range) => isIpInCidr(ip, range)) ?? null;
  const inList = matched !== null;
  const allowed = policy.action === 'allow' ? inList : !inList;
  return { allowed, matchedRange: matched, policy };
}
