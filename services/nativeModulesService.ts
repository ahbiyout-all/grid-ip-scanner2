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
} from '../types';

/**
 * Checks the runtime presence and loading status of all 6 native DLL modules.
 */
export async function fetchNativeModulesStatus(): Promise<NativeModulesStatus> {
  try {
    const res = await fetch('/api/native-modules', {
      signal: AbortSignal.timeout(3000),
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
      `/api/discovery?ip=${encodeURIComponent(ip)}&timeout=${timeoutMs}`,
      { signal: AbortSignal.timeout(timeoutMs + 500) }
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
      `/api/banner-grab?ip=${encodeURIComponent(ip)}&port=${port}&timeout=${timeoutMs}`,
      { signal: AbortSignal.timeout(timeoutMs + 500) }
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
      `/api/os-detect?ip=${encodeURIComponent(ip)}&timeout=${timeoutMs}`,
      { signal: AbortSignal.timeout(timeoutMs + 500) }
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
      `/api/arp-spoof-check?ip=${encodeURIComponent(ip)}&mac=${encodeURIComponent(expectedMac)}`,
      { signal: AbortSignal.timeout(1500) }
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
    const res = await fetch('/api/fingerprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(2000),
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
  current: TopologyGuardHostPayload[];
  baseline: TopologyGuardHostPayload[];
}): Promise<NativeTopologyGuardResult | null> {
  try {
    const res = await fetch('/api/topology-guard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000),
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
        // Match private IPv4 address formats: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
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

/**
 * Triggers legacy Windows OS network utility endpoints (ipconfig /flushdns, ncpa.cpl, firewall, autostart registry, windows service).
 */
export async function executeWindowsUtility(
  action: 'flushdns' | 'ncpa.cpl' | 'firewall' | 'autostart' | 'service-status' | 'service-install' | 'service-stop',
  enable?: boolean
): Promise<{ success: boolean; message: string; enabled?: boolean; installed?: boolean }> {
  try {
    let url = `/api/windows-util?action=${action}`;
    if (enable !== undefined) {
      url += `&enable=${enable}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore network error
  }
  return { success: false, message: 'Windows 유틸리티 실행 중 오류가 발생했습니다.' };
}


