export type GeoRegion =
  | 'us-east'
  | 'us-west'
  | 'eu-west'
  | 'eu-central'
  | 'ap-southeast'
  | 'ap-northeast';

export interface GeoPolicy {
  vaultId: string;
  allowedRegions: GeoRegion[];
  denyRegions: GeoRegion[];
  fallbackBehavior: 'allow' | 'deny';
  createdAt: number;
  updatedAt: number;
}

export interface GeoCheckResult {
  allowed: boolean;
  region: GeoRegion | null;
  reason: string;
}

export interface GeoStore {
  policies: Map<string, GeoPolicy>;
}
