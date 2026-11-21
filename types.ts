
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

export type StorageMediaType = 'removable_usb' | 'fixed_disk' | 'network_share' | 'unknown';

export type StorageBindingStatus =
  | 'unlicensed'
  | 'verified_usb'
  | 'verified_fixed_pc'
  | 'clone_mismatch'
  | 'clock_tamper'
  | 'lease_expired'
  | 'duplicate_seat'
  | 'signature_invalid'
  | 'revoked';

export interface DuplicateSeatConflict {
  detected: boolean;
  conflictHost?: string;
  conflictIp?: string;
  detectedAt?: string;
  message?: string;
}

export interface StorageBindingSnapshot {
  mediaType: StorageMediaType;
  deviceLabel?: string;
  busType?: string;
  vendorId?: string;
  productId?: string;
  hasHardwareSerial: boolean;
  fingerprintHash?: string;
  fingerprintShort?: string;
  strictOnlineCapHours?: number;
}

export interface LicenseInfo {
  tier: LicenseTier;
  licenseType?: LicenseType;
  licensedTo?: string;
  licenseKey?: string;
  licenseId?: string;
  issuedAt?: string;
  expiresAt?: string;
  maxSubnets: number;
  features: LicenseFeatures;
  bindingStatus?: StorageBindingStatus;
  bindingReason?: string;
  boundMediaType?: StorageMediaType;
  boundDeviceLabel?: string;
  bindingHashShort?: string;
  hasHardwareSerial?: boolean;
  leaseIssuedAt?: string;
  leaseExpiresAt?: string;
  offlineGraceDaysLeft?: number;
  hybridMode?: 'online_verified' | 'offline_grace' | 'local_sealed' | 'unverified';
  signatureVerified?: boolean;
  duplicateConflict?: DuplicateSeatConflict;
  backendAuthoritative?: boolean;
  trialUsed?: boolean;
  trialActivatedAt?: string;
  lastError?: string;
  binding?: StorageBindingSnapshot;
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
  autoReportIds?: string[];
  newDevicesCount?: number;
  offlineDevicesCount?: number;
  changedDevicesCount?: number;
  status: 'success' | 'failed' | 'aborted';
  errorMessage?: string;
}

export type AutoExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'markdown' | 'html';

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
  autoExportEnabled?: boolean;
  autoExportFormats?: AutoExportFormat[];
  autoExportOnChangesOnly?: boolean;
  autoDownloadFile?: boolean;
  lastRun?: number;
  nextRun?: number;
  createdAt: number;
  updatedAt: number;
  totalRuns: number;
}

export type ReportScope = 'summary' | 'active' | 'search' | 'all' | 'audit' | 'diff';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html_grid' | 'html_audit' | 'json' | 'markdown';
export type ReportColumnKey =
  | 'ip'
  | 'status'
  | 'mac'
  | 'vendor'
  | 'chipsetVendor'
  | 'hostname'
  | 'nameSource'
  | 'latency'
  | 'openPorts'
  | 'deviceType'
  | 'os'
  | 'aliasNotes'
  | 'riskLevel';
export type ReportSortKey = 'ip' | 'status' | 'hostname' | 'latency' | 'ports' | 'risk';

export interface ReportBrandingConfig {
  reportTitle: string;
  reportSubtitle: string;
  organizationName: string;
  auditorName: string;
  classificationLabel: string;
  footerNote: string;
  logoDataUrl?: string;
  accentColor?: string;
}

export interface ReportConfig {
  scope: ReportScope;
  format: ReportFormat;
  sortBy: ReportSortKey;
  sortDir: 'asc' | 'desc';
  selectedColumns: ReportColumnKey[];
  baselineSnapshotId?: string | null;
  includeInactiveInExcel?: boolean;
  includeDiffSection?: boolean;
}

export interface AutoGeneratedReportRecord {
  id: string;
  scheduleId: string;
  scheduleName: string;
  runRecordId?: string;
  createdAt: number;
  subnet: string;
  format: AutoExportFormat;
  scope: ReportScope;
  filename: string;
  mimeType: string;
  activeCount: number;
  totalCount: number;
  newCount?: number;
  offlineCount?: number;
  changedCount?: number;
  contentText?: string;
  summaryNote?: string;
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
  proxyArpInfoCount: number;
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

export type TrayOperationalMode = 'standby' | 'watching' | 'scanning' | 'alert';
export type WindowsServiceRuntimeState = 'running' | 'stopped' | 'not_installed' | 'unknown';

export interface TrayAlertPolicy {
  notifyOnIntruder: boolean;
  notifyOnIpConflict: boolean;
  notifyOnMassOffline: boolean;
  massOfflineMinCount: number;
  massOfflineDropPercent: number;
  dedupCooldownMinutes: number;
  dndEnabled: boolean;
  dndUntilMs: number;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  silentBoot: boolean;
}

export interface TrayScheduleSummary {
  id: string;
  name: string;
  enabled: boolean;
  subnet: string;
  start: number;
  end: number;
  intervalMinutes: number;
  nextRunMs?: number;
  lastRunMs?: number;
  autoSaveSnapshot?: boolean;
}

export interface TrayEventRecord {
  id: string;
  timestampMs: number;
  type: 'intruder' | 'ip_conflict' | 'mass_offline' | 'scheduler' | 'system' | string;
  severity: 'critical' | 'warning' | 'info' | string;
  title: string;
  message: string;
  ip?: string;
  mac?: string;
  notified: boolean;
  suppressedBy?: '' | 'cooldown' | 'dnd' | 'rule_off' | string;
  source?: string;
}

export interface TrayPendingAction {
  id: string;
  action:
    | 'quick_scan'
    | 'toggle_watch'
    | 'toggle_scheduler_pause'
    | 'run_schedule_now'
    | 'toggle_dnd'
    | 'open_intruder_log'
    | 'open_scheduler'
    | string;
  payload?: string;
  timestampMs: number;
}

export interface TrayRuntimeSnapshot {
  mode: TrayOperationalMode;
  watchEnabled: boolean;
  watchIntervalSeconds: number;
  schedulerPaused: boolean;
  activeScheduleCount: number;
  nextScheduleName?: string;
  nextScheduleAtMs?: number;
  isScanning: boolean;
  scanProgressPercent: number;
  activeDeviceCount: number;
  intruderCount: number;
  conflictCount: number;
  lastScanAtMs?: number;
  statusMessage: string;
  subnet: string;
  startIp: number;
  endIp: number;
  windowConnected: boolean;
  runningInTrayMode: boolean;
  runningAsService: boolean;
  serviceState: WindowsServiceRuntimeState;
  autoStartEnabled: boolean;
  dndActive: boolean;
  policy: TrayAlertPolicy;
  schedules?: TrayScheduleSummary[];
  recentEvents: TrayEventRecord[];
  pendingActions?: TrayPendingAction[];
  trustedKeysCount: number;
  lastAutonomousSweepMs?: number;
}

export interface SubnetProfile {
  id: string;
  label: string;
  subnet: string;
  start: number;
  end: number;
  vlanId?: string;
  cidr?: string;
  gatewayIp?: string;
  interfaceName?: string;
  type?: 'physical' | 'virtual' | 'vpn' | 'custom' | 'other';
  pinned?: boolean;
  lastScannedAt?: number;
  activeCount: number;
  realConflictCount: number;
  proxyArpCount: number;
  intruderCount: number;
}

export interface DiscoveredSubnetCandidate {
  id: string;
  subnet: string;
  start: number;
  end: number;
  cidr: string;
  gatewayIp: string;
  interfaceName: string;
  interfaceIp: string;
  vlanHint?: string;
  type: 'physical' | 'virtual' | 'loopback' | 'vpn' | 'other' | string;
  status: 'up' | 'down' | string;
  isDefault: boolean;
}

export interface MultiSubnetBatchState {
  isRunning: boolean;
  queueIds: string[];
  completedIds: string[];
  currentProfileId: string | null;
  startedAt: number | null;
}

export interface PacketInspectionResult {
  ip: string;
  ttl: number;
  estimatedInitialTtl: number;
  estimatedHops: number;
  tcpHandshakeMs: number;
  tcpProbePort: number;
  tcpWindowHint: number;
  osGuess: string;
  confidence: number;
  sampleCount: number;
  rttMinMs: number;
  rttAvgMs: number;
  rttMaxMs: number;
  jitterMs: number;
  arpConsistent: boolean;
  liveMac: string;
  spoofAlert?: string;
  npcapAvailable: boolean;
  capturedVia: string;
}

export type TopologyNodeTier = 'gateway' | 'infra' | 'endpoint' | 'vm';
export type TopologyEdgeRelation =
  | 'uplink'
  | 'proxy_arp_alias'
  | 'conflict_alert'
  | 'soft_trust_link'
  | 'intruder_link';

export type TopologyRiskState = 'normal' | 'conflict' | 'proxy_arp' | 'soft_trust' | 'intruder';

export interface TopologyNode {
  id: string;
  ip: string;
  label: string;
  mac?: string;
  vendor?: string;
  deviceType?: string;
  tier: TopologyNodeTier;
  riskState: TopologyRiskState;
  latencyMs?: number;
  openPorts?: number[];
  openPortCount: number;
  anomalyMask?: number;
  reason?: string;
  vlanTag?: string;
  isHost?: boolean;
  isActive?: boolean;
}

export interface TopologyEdge {
  id: string;
  fromIp: string;
  toIp: string;
  relation: TopologyEdgeRelation;
  label?: string;
}

export interface TopologyGraphPayload {
  subnet: string;
  vlanTag?: string;
  gatewayIp: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  engine: string;
  elapsedMicroseconds: number;
  summary?: NativeTopologyGuardResult | null;
}


