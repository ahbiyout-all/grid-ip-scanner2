import {
  DiscoveredSubnetCandidate,
  InterfaceInfo,
  NetworkConfig,
  ScanResult,
  SubnetProfile,
} from '../types';

const PROFILES_STORAGE_KEY = 'grid_subnet_profiles_v1';
const ACTIVE_PROFILE_KEY = 'grid_active_subnet_profile_v1';
const SNAPSHOT_CACHE_KEY = 'grid_subnet_results_cache_v1';

export interface CachedSubnetScanState {
  results: Record<string, ScanResult>;
  hasStartedScan: boolean;
  activeCount: number;
  updatedAt: number;
}

export function normalizeSubnetBase(raw: string): string {
  const cleaned = (raw || '').trim().split('/')[0].replace(/\.+$/, '');
  const parts = cleaned.split('.');
  if (parts.length >= 3) {
    return parts.slice(0, 3).join('.');
  }
  return cleaned || '192.168.0';
}

export function normalizeVlanTag(raw?: string): string | undefined {
  const cleaned = (raw || '').trim();
  if (!cleaned) return undefined;
  const match = /(\d{1,4})/.exec(cleaned);
  if (match && cleaned.toLowerCase().includes('vlan')) {
    return `VLAN ${match[1]}`;
  }
  if (/^\d{1,4}$/.test(cleaned)) {
    return `VLAN ${cleaned}`;
  }
  return cleaned.slice(0, 24);
}

export function buildDefaultProfileFromConfig(
  config: NetworkConfig,
  iface?: InterfaceInfo | null
): SubnetProfile {
  const subnet = normalizeSubnetBase(config.subnet);
  return {
    id: `prof_${subnet.replace(/\./g, '_')}_${config.start}_${config.end}`,
    label: iface?.name ? iface.name.slice(0, 28) : `${subnet}.0/24`,
    subnet,
    start: config.start ?? 1,
    end: config.end ?? 254,
    cidr: iface?.cidr || `${subnet}.0/24`,
    gatewayIp: `${subnet}.1`,
    interfaceName: iface?.name,
    type: (iface?.type as SubnetProfile['type']) || 'physical',
    pinned: true,
    activeCount: 0,
    realConflictCount: 0,
    proxyArpCount: 0,
    intruderCount: 0,
  };
}

export function getStoredSubnetProfiles(
  fallbackConfig: NetworkConfig,
  localIface?: InterfaceInfo | null
): SubnetProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: SubnetProfile) => ({
          ...p,
          subnet: normalizeSubnetBase(p.subnet),
          start: Math.max(0, Math.min(255, Number(p.start ?? 1))),
          end: Math.max(0, Math.min(255, Number(p.end ?? 254))),
          activeCount: Number(p.activeCount ?? 0),
          realConflictCount: Number(p.realConflictCount ?? 0),
          proxyArpCount: Number(p.proxyArpCount ?? 0),
          intruderCount: Number(p.intruderCount ?? 0),
        }));
      }
    }
  } catch {
    // Ignore storage corruption
  }
  const initial = [buildDefaultProfileFromConfig(fallbackConfig, localIface)];
  saveSubnetProfiles(initial);
  return initial;
}

export function saveSubnetProfiles(profiles: SubnetProfile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage quota errors
  }
}

export function getActiveSubnetProfileId(profiles: SubnetProfile[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved && profiles.some((p) => p.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore
  }
  return profiles[0]?.id || '';
}

export function saveActiveSubnetProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // Ignore
  }
}

export function getAllCachedSubnetScans(): Record<string, CachedSubnetScanState> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, CachedSubnetScanState>;
      }
    }
  } catch {
    // Ignore
  }
  return {};
}

export function getCachedSubnetScan(profileId: string): CachedSubnetScanState | null {
  const all = getAllCachedSubnetScans();
  return all[profileId] || null;
}

export function saveCachedSubnetScan(
  profileId: string,
  state: CachedSubnetScanState
): void {
  if (!profileId) return;
  try {
    const all = getAllCachedSubnetScans();
    // Keep at most 12 subnet scan caches in localStorage to stay well below quota
    const next: Record<string, CachedSubnetScanState> = { ...all, [profileId]: state };
    const entries = Object.entries(next).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
    const trimmed = Object.fromEntries(entries.slice(0, 12));
    localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Best-effort trim retry if storage quota exceeded
    try {
      localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify({ [profileId]: state }));
    } catch {}
  }
}

export function removeCachedSubnetScan(profileId: string): void {
  try {
    const all = getAllCachedSubnetScans();
    if (all[profileId]) {
      delete all[profileId];
      localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(all));
    }
  } catch {
    // Ignore
  }
}

export function buildCandidatesFromInterfaces(
  interfaces: InterfaceInfo[]
): DiscoveredSubnetCandidate[] {
  const seen = new Set<string>();
  const out: DiscoveredSubnetCandidate[] = [];

  interfaces.forEach((iface) => {
    if (!iface.ip || !iface.subnet || iface.type === 'loopback' || iface.ip.startsWith('169.254.')) {
      return;
    }
    const subnet = normalizeSubnetBase(iface.subnet);
    const key = `${subnet}:1-254`;
    if (seen.has(key)) return;
    seen.add(key);

    const vlanMatch = /(?:vlan[\s_\-:]?(\d{1,4})|\.(\d{1,4})$)/i.exec(iface.name || '');
    const vid = vlanMatch ? vlanMatch[1] || vlanMatch[2] : '';

    out.push({
      id: `cand_${subnet.replace(/\./g, '_')}`,
      subnet,
      start: 1,
      end: 254,
      cidr: iface.cidr || `${subnet}.0/24`,
      gatewayIp: iface.ip.endsWith('.1') ? iface.ip : `${subnet}.1`,
      interfaceName: iface.name,
      interfaceIp: iface.ip,
      vlanHint: vid
        ? `VLAN ${vid}`
        : iface.type === 'virtual'
        ? 'Virtual Switch'
        : iface.type === 'vpn'
        ? 'VPN Tunnel'
        : undefined,
      type: iface.type,
      status: iface.status,
      isDefault: Boolean(iface.isDefault),
    });
  });

  return out;
}

export function summarizeSubnetResults(
  results: Record<string, ScanResult>,
  realConflictCount: number,
  proxyArpCount: number,
  intruderCount: number
): Pick<SubnetProfile, 'activeCount' | 'realConflictCount' | 'proxyArpCount' | 'intruderCount' | 'lastScannedAt'> {
  const activeCount = Object.values(results).filter((r) => r.status === 'active').length;
  return {
    activeCount,
    realConflictCount,
    proxyArpCount,
    intruderCount,
    lastScannedAt: Date.now(),
  };
}
