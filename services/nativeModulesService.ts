/**
 * Grid IP Scanner2 - Native Modules Service
 * High-performance client bridge for the 8 specialized native DLL modules:
 *   1. grid_probe_engine.dll     (Async ICMP & L2 SendARP sweep)
 *   2. grid_port_iocp.dll        (IOCP high-concurrency port scanner)
 *   3. grid_discovery.dll        (mDNS, SSDP, LLMNR, NetBIOS multicast discovery)
 *   4. grid_oui_trie.dll         (In-memory Radix-Trie OUI search engine)
 *   5. grid_banner_grabber.dll   (HTTP, SSH, RTSP, TLS deep banner grabber)
 *   6. grid_pcap_analyzer.dll    (Npcap kernel packet capture & OS fingerprinting)
 *   7. grid_fingerprint_engine.dll (AI heuristic device fingerprinting & security scoring)
 *   8. grid_topology_guard.dll   (Sub-millisecond topology diff, conflict hash & LAA guard)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import {
  NativeModulesStatus,
  NativeDiscoveryResult,
  NativeDeepBannerResult,
  NativeOsDetectResult,
  NativeArpSpoofResult,
  NativeFingerprintResult,
  NativeTopologyGuardResult,
  PacketInspectionResult,
  DiscoveredSubnetCandidate,
  TopologyGraphPayload,
} from '../types';
import { getApiUrl, safeTimeout } from './apiConfig';

/**
 * Checks the runtime presence and loading status of all 6 native DLL modules.
 */
export async function fetchNativeModulesStatus(): Promise<NativeModulesStatus> {
  try {
    const res = await fetch(getApiUrl('/api/native-modules'), {
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      return (await res.json()) as NativeModulesStatus;
    }
  } catch {
    // Backend offline or fallback
  }

  return {
    probeEngine: false,
    portIocp: false,
    discovery: false,
    ouiTrie: false,
    bannerGrabber: false,
    pcapAnalyzer: false,
    fingerprintEngine: false,
    topologyGuard: false,
    npcapLoaded: false,
  };
}

/**
 * Executes deep multi-protocol discovery (mDNS, SSDP, LLMNR, NetBIOS) for a host.
 */
export async function fetchDeepDiscovery(
  ip: string,
  timeoutMs = 800
): Promise<NativeDiscoveryResult | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/discovery?ip=${encodeURIComponent(ip)}&timeout=${timeoutMs}`),
      { signal: safeTimeout(timeoutMs + 500) }
    );
    if (res.ok) {
      return (await res.json()) as NativeDiscoveryResult;
    }
  } catch {
    // Ignore network error
  }
  return null;
}

/**
 * Grabs service banner & metadata for a specific IP and port (HTTP, SSH, RTSP, TLS).
 */
export async function fetchDeepBannerGrab(
  ip: string,
  port = 80,
  timeoutMs = 1000
): Promise<NativeDeepBannerResult | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/banner-grab?ip=${encodeURIComponent(ip)}&port=${port}&timeout=${timeoutMs}`),
      { signal: safeTimeout(timeoutMs + 500) }
    );
    if (res.ok) {
      return (await res.json()) as NativeDeepBannerResult;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Performs TCP SYN-ACK and ICMP TTL OS fingerprinting.
 */
export async function detectHostOS(
  ip: string,
  timeoutMs = 800
): Promise<NativeOsDetectResult | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/os-detect?ip=${encodeURIComponent(ip)}&timeout=${timeoutMs}`),
      { signal: safeTimeout(timeoutMs + 500) }
    );
    if (res.ok) {
      return (await res.json()) as NativeOsDetectResult;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Checks for potential ARP Spoofing / IP collision anomalies.
 */
export async function checkArpSpoofing(
  ip: string,
  expectedMac: string
): Promise<NativeArpSpoofResult | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/arp-spoof-check?ip=${encodeURIComponent(ip)}&mac=${encodeURIComponent(expectedMac)}`),
      { signal: safeTimeout(1500) }
    );
    if (res.ok) {
      return (await res.json()) as NativeArpSpoofResult;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Analyzes host fingerprint and computes security posture using grid_fingerprint_engine.dll.
 */
export async function fetchDeviceFingerprint(params: {
  ip: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  workgroup?: string;
  serverHeader?: string;
  ttl?: number;
  openPorts?: number[];
}): Promise<NativeFingerprintResult | null> {
  try {
    const res = await fetch(getApiUrl('/api/fingerprint'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: safeTimeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        return data.result as NativeFingerprintResult;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export interface TopologyGuardHostPayload {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  openPorts?: number[];
  isTrusted?: boolean;
}

/**
 * Runs sub-millisecond subnet topology diff, conflict hash, Proxy-ARP & LAA Random MAC Guard via grid_topology_guard.dll.
 */
export async function analyzeNativeTopologyGuard(params: {
  gatewayIp?: string;
  current: TopologyGuardHostPayload[];
  baseline: TopologyGuardHostPayload[];
}): Promise<NativeTopologyGuardResult | null> {
  try {
    const res = await fetch(getApiUrl('/api/topology-guard'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        return data.result as NativeTopologyGuardResult;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Inspects packet telemetry (TTL, Hops, TCP SYN-ACK RTT, Jitter, OS Guess, L2 ARP consistency)
 * via grid_pcap_analyzer.dll (v2.6.2+) with seamless Go socket fallback.
 */
export async function inspectHostPackets(params: {
  ip: string;
  expectedMac?: string;
  port?: number;
  timeoutMs?: number;
}): Promise<{ result: PacketInspectionResult; native: boolean } | null> {
  try {
    const res = await fetch(getApiUrl('/api/packet-inspect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: params.ip,
        expectedMac: params.expectedMac || '',
        port: params.port || 0,
        timeoutMs: params.timeoutMs || 700,
      }),
      signal: safeTimeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.result) {
        return {
          result: data.result as PacketInspectionResult,
          native: Boolean(data.native),
        };
      }
    }
  } catch {
    // Graceful client fallback handled cleanly by callers
  }
  return null;
}

/**
 * Auto-discovers local NIC / VLAN / VPN subnet candidates from backend interfaces.
 */
export async function discoverLocalSubnets(): Promise<DiscoveredSubnetCandidate[]> {
  try {
    const res = await fetch(getApiUrl('/api/subnets/discover'), {
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.candidates)) {
        return data.candidates as DiscoveredSubnetCandidate[];
      }
    }
  } catch {
    // Offline/preview fallback handled via local interfaces list
  }
  return [];
}

/**
 * Builds and correlates interactive Topology Map Graph via native grid_topology_guard.dll + Go builder.
 */
export async function fetchNativeTopologyMap(params: {
  subnet: string;
  vlanTag?: string;
  gatewayIp?: string;
  current: Array<{
    ip: string;
    mac?: string;
    hostname?: string;
    vendor?: string;
    deviceType?: string;
    latency?: number;
    openPorts?: number[];
    isTrusted?: boolean;
    isHost?: boolean;
    isGateway?: boolean;
    isProxyArp?: boolean;
    isConflict?: boolean;
    isSoftTrust?: boolean;
    isIntruder?: boolean;
    vlanTag?: string;
  }>;
  baseline: TopologyGuardHostPayload[];
}): Promise<TopologyGraphPayload | null> {
  try {
    const res = await fetch(getApiUrl('/api/topology-map'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: safeTimeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.nodes)) {
        return data as TopologyGraphPayload;
      }
    }
  } catch {
    // Client-side topology builder remains authoritative fallback
  }
  return null;
}

/**
 * Resolves local Wi-Fi IP address in mobile/web browser using WebRTC candidate sniffing.
 */
export async function getClientLocalIP(): Promise<{ ip: string; subnet: string } | null> {
  return new Promise((resolve) => {
    try {
      const rtc = new RTCPeerConnection({ iceServers: [] });
      rtc.createDataChannel('wifi-detect');
      rtc.createOffer()
        .then((offer) => rtc.setLocalDescription(offer))
        .catch(() => resolve(null));

      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          try { rtc.close(); } catch (_) {}
          resolve(null);
        }
      }, 2000);

      rtc.onicecandidate = (event) => {
        if (!event || !event.candidate || done) return;
        const candidate = event.candidate.candidate;
        const ipv4Match = candidate.match(/\b(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/);
        if (ipv4Match) {
          const fullIP = ipv4Match[1];
          const parts = fullIP.split('.');
          if (parts.length === 4 && fullIP !== '127.0.0.1') {
            done = true;
            clearTimeout(timer);
            try { rtc.close(); } catch (_) {}
            const subnet = parts.slice(0, 3).join('.');
            resolve({ ip: fullIP, subnet });
          }
        }
      };
    } catch {
      resolve(null);
    }
  });
}

import type {
  TrayAlertPolicy,
  TrayEventRecord,
  TrayRuntimeSnapshot,
  TrayScheduleSummary,
  WindowsServiceRuntimeState,
} from '../types';

export const DEFAULT_TRAY_ALERT_POLICY: TrayAlertPolicy = {
  notifyOnIntruder: true,
  notifyOnIpConflict: true,
  notifyOnMassOffline: true,
  massOfflineMinCount: 3,
  massOfflineDropPercent: 30,
  dedupCooldownMinutes: 5,
  dndEnabled: false,
  dndUntilMs: 0,
  quietHoursEnabled: false,
  quietStart: '23:00',
  quietEnd: '07:00',
  silentBoot: false,
};

/**
 * Triggers legacy Windows OS network utility endpoints (ipconfig /flushdns, ncpa.cpl, firewall, autostart registry, windows service).
 */
export async function executeWindowsUtility(
  action: 'flushdns' | 'ncpa.cpl' | 'firewall' | 'autostart' | 'service-status' | 'service-install' | 'service-stop',
  enable?: boolean
): Promise<{
  success: boolean;
  message: string;
  enabled?: boolean;
  installed?: boolean;
  running?: boolean;
  serviceState?: WindowsServiceRuntimeState;
  error?: string;
}> {
  try {
    let url = getApiUrl(`/api/windows-util?action=${action}`);
    if (enable !== undefined) {
      url += `&enable=${enable}`;
    }
    const isReadOnly = action === 'service-status' || (action === 'autostart' && enable === undefined);
    const res = await fetch(url, {
      method: isReadOnly ? 'GET' : 'POST',
      signal: safeTimeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore network error
  }
  return { success: false, message: 'Windows 유틸리티 실행 중 오류가 발생했습니다.' };
}

export async function fetchTrayRuntimeState(options?: {
  consumeActions?: boolean;
  refresh?: boolean;
}): Promise<TrayRuntimeSnapshot | null> {
  try {
    const params = new URLSearchParams();
    if (options?.consumeActions) params.set('consumeActions', '1');
    if (options?.refresh) params.set('refresh', '1');
    const qs = params.toString();
    const res = await fetch(getApiUrl(`/api/tray/state${qs ? `?${qs}` : ''}`), {
      signal: safeTimeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.state) {
        return data.state as TrayRuntimeSnapshot;
      }
    }
  } catch {
    // Go backend unavailable or preview mode
  }
  return null;
}

export async function syncTrayRuntimeState(payload: {
  watchEnabled?: boolean;
  schedulerPaused?: boolean;
  isScanning?: boolean;
  scanProgressPercent?: number;
  activeDeviceCount?: number;
  intruderCount?: number;
  conflictCount?: number;
  statusMessage?: string;
  subnet?: string;
  startIp?: number;
  endIp?: number;
  trustedKeys?: string[];
  schedules?: TrayScheduleSummary[];
  consumeActions?: boolean;
}): Promise<TrayRuntimeSnapshot | null> {
  try {
    const { consumeActions, ...body } = payload;
    const url = getApiUrl(`/api/tray/state${consumeActions ? '?consumeActions=1' : ''}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: safeTimeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.state) {
        return data.state as TrayRuntimeSnapshot;
      }
    }
  } catch {
    // Ignore network error
  }
  return null;
}

export async function updateTrayAlertPolicy(policy: TrayAlertPolicy): Promise<TrayRuntimeSnapshot | null> {
  try {
    const res = await fetch(getApiUrl('/api/tray/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.state) {
        return data.state as TrayRuntimeSnapshot;
      }
    }
  } catch {
    // Ignore network error
  }
  return null;
}

export async function triggerTrayAction(
  action:
    | 'quick_scan'
    | 'toggle_watch'
    | 'toggle_scheduler_pause'
    | 'run_schedule_now'
    | 'toggle_dnd'
    | 'dnd_30m'
    | 'open_intruder_log'
    | 'open_scheduler',
  payload?: string
): Promise<{ success: boolean; message?: string; state?: TrayRuntimeSnapshot }> {
  try {
    const res = await fetch(getApiUrl('/api/tray/action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload: payload || '' }),
      signal: safeTimeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore
  }
  return { success: false };
}

export async function reportTrayEvents(
  events: Array<{
    type: 'intruder' | 'ip_conflict' | 'mass_offline' | 'scheduler' | 'system';
    severity: 'critical' | 'warning' | 'info';
    dedupKey: string;
    title: string;
    message: string;
    ip?: string;
    mac?: string;
  }>
): Promise<TrayEventRecord[]> {
  if (!events.length) return [];
  try {
    const res = await fetch(getApiUrl('/api/tray/report-events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.recorded)) {
        return data.recorded as TrayEventRecord[];
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function clearTrayEventsLog(): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/tray/events'), {
      method: 'DELETE',
      signal: safeTimeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTrayTestNotification(params?: {
  severity?: 'critical' | 'warning' | 'info';
  title?: string;
  message?: string;
}): Promise<{ success: boolean; notified?: boolean; event?: TrayEventRecord }> {
  try {
    const res = await fetch(getApiUrl('/api/tray/test-notify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
      signal: safeTimeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore
  }
  return { success: false };
}
