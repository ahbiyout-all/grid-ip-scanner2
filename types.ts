
export type IPStatus = 'idle' | 'scanning' | 'active' | 'inactive' | 'error';

export interface SoftTrustInfo {
  isSoftTrusted: boolean;
  reason: string;
  similarityScore: number;
  matchedPreviousIp?: string;
  matchedPreviousMac?: string;
  matchedSignature?: string;
  graceExpiresAt?: number;
}

export interface DeviceInfo {
  ip: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  webTitle?: string;
  os?: string;
  latency?: number;
  openPorts?: number[];
  lastSeen?: string;
  confidenceScore?: number;
  mdns?: string;
  upnp?: string;
  snmp?: string;
  customNickname?: string;
  notes?: string;
  isConflict?: boolean;
  conflictDetails?: string;
  isNewDevice?: boolean;
  softTrustInfo?: SoftTrustInfo;
}

export interface ScanResult {
  ip: string;
  status: IPStatus;
  device?: DeviceInfo;
  missCount?: number;
  isConflict?: boolean;
  conflictDetails?: string;
  isNewDevice?: boolean;
  softTrustInfo?: SoftTrustInfo;
}

export interface DeviceAlias {
  mac: string;
  ip?: string;
  nickname: string;
  notes?: string;
  updatedAt: string;
}

export type RemoteActionType = 'web' | 'web_ssl' | 'rdp' | 'ssh' | 'smb' | 'ping' | 'traceroute';

export interface RemoteActionResult {
  success: boolean;
  action: RemoteActionType;
  message: string;
  command?: string;
}

export interface WoLResult {
  success: boolean;
  mac: string;
  ip?: string;
  packetsSent: number;
  message: string;
}

export interface InterfaceInfo {
  name: string;
  ip: string;
  ipv6?: string;
  subnet: string;
  cidr?: string;
  mac?: string;
  status: 'up' | 'down';
  type: 'physical' | 'virtual' | 'loopback' | 'vpn' | 'other';
  mtu?: number;
  flags?: string[];
  isDefault?: boolean;
}

export interface NetworkConfig {
  subnet: string;
  start: number;
  end: number;
  timeout: number;
}

export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface LicenseFeatures {
  visualGrid: boolean;
  fastPing: boolean;
  ouiLookup: boolean;
  portScanDeep: boolean;
  diffCompare: boolean;
  autoMonitor: boolean;
  exportReport: boolean;
  multiSubnet: boolean;
}

export interface LicenseInfo {
  tier: LicenseTier;
  licensedTo?: string;
  licenseKey?: string;
  issuedAt?: string;
  expiresAt?: string;
  maxSubnets: number;
  features: LicenseFeatures;
}

export interface PortAuditItem {
  port: number;
  service: string;
  protocol: string;
  risk: 'safe' | 'low' | 'medium' | 'high';
  description: string;
  banner?: string;
}

export interface PortScanResult {
  ip: string;
  totalChecked: number;
  openPorts: PortAuditItem[];
  scanDurationMs: number;
}

export interface ScanSnapshot {
  id: string;
  timestamp: number;
  label: string;
  subnet: string;
  start: number;
  end: number;
  activeCount: number;
  results: Record<string, ScanResult>;
}

export type DiffStatus = 'new' | 'offline' | 'changed' | 'same';

export interface DiffItem {
  ip: string;
  diffStatus: DiffStatus;
  current?: ScanResult;
  previous?: ScanResult;
  changeDetails: string[];
}
