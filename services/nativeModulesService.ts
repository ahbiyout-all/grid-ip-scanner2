/**
 * Grid IP Scanner2 - Native Modules Service
 * High-performance client bridge for the 6 roadmap native DLL modules:
 *   1. grid_probe_engine.dll  (Async ICMP & L2 SendARP sweep)
 *   2. grid_port_iocp.dll     (IOCP high-concurrency port scanner)
 *   3. grid_discovery.dll     (mDNS, SSDP, LLMNR, NetBIOS multicast discovery)
 *   4. grid_oui_trie.dll      (In-memory Radix-Trie OUI search engine)
 *   5. grid_banner_grabber.dll(HTTP, SSH, RTSP, TLS deep banner grabber)
 *   6. grid_pcap_analyzer.dll (Npcap kernel packet capture & OS fingerprinting)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import {
  NativeModulesStatus,
  NativeDiscoveryResult,
  NativeDeepBannerResult,
  NativeOsDetectResult,
  NativeArpSpoofResult,
  NativeFingerprintResult,
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
