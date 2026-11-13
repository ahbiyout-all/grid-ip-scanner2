
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

export type NameSourceType =
  | 'CUSTOM'
  | 'SMB'
  | 'NETBIOS'
  | 'MDNS'
  | 'WSD'
  | 'UPNP'
  | 'SNMP'
  | 'DNS'
  | 'WEB'
  | 'UNKNOWN';

export interface DeviceInfo {
  ip: string;
  mac?: string;
  vendor?: string;
  chipsetVendor?: string;
  realVendor?: string;
  vendorSource?: 'UPNP' | 'MDNS' | 'OUI' | 'HTTP' | 'SNMP' | string;
  realVendorConfidence?: number;
  chipsetConfidence?: number;
  confidenceScore?: number;
  priorityRank?: number;
  ouiBlockType?: 'MA-L' | 'MA-M' | 'MA-S' | 'LAA' | 'LAA-VM' | 'PRIVATE' | 'UNKNOWN' | string;
  ouiPrefix?: string;
  isRandomizedMac?: boolean;
  isChipsetOem?: boolean;
  deviceCategory?: string;
  classificationReasons?: { source: string; detail: string; weight: number }[];
  hostname?: string;
  nameSource?: NameSourceType;
  hostnameSources?: Record<string, string>;
  webTitle?: string;
  os?: string;
  latency?: number;
  openPorts?: number[];
  lastSeen?: string;
  mdns?: string;
  upnp?: string;
  snmp?: string;
  customNickname?: string;
  notes?: string;
  isConflict?: boolean;
  conflictDetails?: string;
  isNewDevice?: boolean;
  softTrustInfo?: SoftTrustInfo;
  deviceType?: string;
  deviceModel?: string;
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
  remoteBoot: boolean;
  intruderDetection: boolean;
}

export type LicenseType = 'lifetime' | 'annual' | 'trial' | 'free';

export interface LicenseInfo {
  tier: LicenseTier;
  licenseType?: LicenseType;
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
  category?: 'security_alert' | 'hardware_change' | 'network_change' | 'connectivity' | 'identical';
  current?: ScanResult;
  previous?: ScanResult;
  changeDetails: string[];
  macChanged?: boolean;
  portsAdded?: number[];
  portsRemoved?: number[];
  latencyDiffMs?: number;
  hostnameChanged?: boolean;
  vendorChanged?: boolean;
  hasSecurityRisk?: boolean;
}

export interface DiffAnalysisResult {
  baselineName?: string;
  targetName?: string;
  diffMap: Record<string, DiffStatus>;
  items: DiffItem[];
  summary: {
    newCount: number;
    offlineCount: number;
    changedCount: number;
    sameCount: number;
    securityAlertCount?: number;
    totalEvaluated: number;
  };
}

export type ScheduleInterval = 
  | '15m' 
  | '30m' 
  | 'hourly' 
  | 'every_2h' 
  | 'every_6h' 
  | 'every_12h' 
  | 'daily' 
  | 'weekly' 
  | 'custom';

export interface ScheduledScanRunRecord {
  id: string;
  scheduleId: string;
  scheduleName: string;
  timestamp: number;
  subnet: string;
  activeCount: number;
  totalCount: number;
  durationMs: number;
  snapshotId?: string;
  newDevicesCount?: number;
  offlineDevicesCount?: number;
  changedDevicesCount?: number;
  status: 'success' | 'failed' | 'aborted';
  errorMessage?: string;
}

export interface ScanSchedule {
  id: string;
  name: string;
  enabled: boolean;
  subnet: string;
  start: number;
  end: number;
  scanMode: 'fast' | 'standard' | 'precision';
  deepScan: boolean;
  intervalType: ScheduleInterval;
  intervalMinutes: number;
  autoSaveSnapshot: boolean;
  snapshotPrefix?: string;
  notifyOnCompletion: boolean;
  notifyOnChangesOnly: boolean;
  lastRun?: number;
  nextRun?: number;
  createdAt: number;
  updatedAt: number;
  totalRuns: number;
}

export interface NativeModulesStatus {
  probeEngine: boolean;
  portIocp: boolean;
  discovery: boolean;
  ouiTrie: boolean;
  bannerGrabber: boolean;
  pcapAnalyzer: boolean;
  fingerprintEngine: boolean;
  topologyGuard: boolean;
  npcapLoaded: boolean;
}

export interface NativeDiscoveryResult {
  hostname: string;
  modelName: string;
  manufacturer: string;
  workgroup: string;
  serviceType: string;
  protocolsDiscovered: number;
}

export interface NativeDeepBannerResult {
  serverHeader?: string;
  htmlTitle?: string;
  sshBanner?: string;
  rtspServer?: string;
  tlsSubject?: string;
  detectedProtocol: number;
}

export interface NativeOsDetectResult {
  ip: string;
  osName: string;
  ttl: number;
  supported: boolean;
}

export interface NativeArpSpoofResult {
  spoofingDetected: boolean;
  alert: string;
}

export interface NativeFingerprintResult {
  categoryCode: number;
  categoryName: string;
  detectedOS: string;
  hardwareModel: string;
  confidencePercent: number;
  riskLevel: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  vulnerabilityCount: number;
  vulnerabilities: string;
  recommendation: string;
}

export interface NativeTopologyGuardAlert {
  ip: string;
  deltaStatus: number;
  anomalyMask: number;
  similarityScore: number;
  isSoftTrusted: boolean;
  matchedPrevIp: string;
  reason: string;
}

export interface NativeTopologyGuardResult {
  engine: string;
  version: number;
  totalEvaluated: number;
  newCount: number;
  offlineCount: number;
  changedCount: number;
  sameCount: number;
  conflictCount: number;
  multiIpMacCount: number;
  laaRandomCount: number;
  virtualNicCount: number;
  hardIntruderCount: number;
  softTrustedCount: number;
  highRiskDeltaCount: number;
  elapsedMicroseconds: number;
  alerts: NativeTopologyGuardAlert[];
}

export interface IntruderLogRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  ip: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  detectedBy: 'background_service' | 'tray_agent' | 'manual_scan';
  openPorts?: number[];
  status: 'new' | 'investigating' | 'trusted' | 'blocked';
  notes?: string;
}

