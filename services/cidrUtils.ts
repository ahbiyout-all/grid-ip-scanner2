import { CIDRBlock, CIDRScanPlan } from '../types';

export function ipv4ToInt(ip: string): number {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return 0;
  let val = 0;
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return 0;
    val = (val * 256 + n) >>> 0;
  }
  return val >>> 0;
}

export function intToIpv4(v: number): string {
  const u = v >>> 0;
  return `${(u >>> 24) & 255}.${(u >>> 16) & 255}.${(u >>> 8) & 255}.${u & 255}`;
}

export function compareIpv4(a: string, b: string): number {
  const ua = ipv4ToInt(a);
  const ub = ipv4ToInt(b);
  if (ua === ub) return a.localeCompare(b);
  return ua < ub ? -1 : 1;
}

export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255 && String(Number(p)) === p);
}

export function parseCidrOrRange(
  rawInput: string,
  startHint = 1,
  endHint = 254
): CIDRScanPlan | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    const [ipPart, prefixStr] = trimmed.split('/');
    if (!isValidIpv4(ipPart) || !/^\d{1,2}$/.test(prefixStr || '')) {
      return null;
    }
    const prefixLen = Number(prefixStr);
    if (prefixLen < 20 || prefixLen > 30) {
      return null;
    }
    const ipInt = ipv4ToInt(ipPart);
    const mask = prefixLen === 0 ? 0 : ((0xffffffff << (32 - prefixLen)) >>> 0);
    const netInt = (ipInt & mask) >>> 0;
    const hostSpan = Math.pow(2, 32 - prefixLen);
    const bcastInt = (netInt + hostSpan - 1) >>> 0;
    const firstUsable = (netInt + 1) >>> 0;
    const lastUsable = (bcastInt - 1) >>> 0;
    if (lastUsable < firstUsable) return null;

    const firstC = (firstUsable & 0xffffff00) >>> 0;
    const lastC = (lastUsable & 0xffffff00) >>> 0;
    const blocks: CIDRBlock[] = [];
    let idx = 0;
    for (let base = firstC; base <= lastC; base = (base + 256) >>> 0) {
      const bStart = base < firstUsable ? firstUsable - base : 0;
      const bEnd = ((base + 255) >>> 0) > lastUsable ? lastUsable - base : 255;
      if (bEnd < bStart) continue;
      const netStr = intToIpv4(base);
      const octs = netStr.split('.');
      const subnet = `${octs[0]}.${octs[1]}.${octs[2]}`;
      blocks.push({
        index: idx++,
        label: `${subnet}.${bStart}-${bEnd}`,
        subnet,
        start: bStart,
        end: bEnd,
        hostCount: bEnd - bStart + 1,
        networkIp: `${subnet}.0`,
        broadcastIp: `${subnet}.255`,
      });
    }

    return {
      normalizedCidr: `${intToIpv4(netInt)}/${prefixLen}`,
      prefixLen,
      networkIp: intToIpv4(netInt),
      broadcastIp: intToIpv4(bcastInt),
      totalHosts: lastUsable - firstUsable + 1,
      blocks,
    };
  }

  // Legacy 3-octet or 4-octet prefix
  const cleaned = trimmed.replace(/\.+$/, '');
  const parts = cleaned.split('.');
  const prefixParts = parts.length === 4 ? parts.slice(0, 3) : parts;
  if (prefixParts.length !== 3) return null;
  if (!prefixParts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
    return null;
  }
  const subnet = prefixParts.join('.');
  const s = Math.max(0, Math.min(255, Math.round(startHint)));
  const e = Math.max(0, Math.min(255, Math.round(endHint)));
  const start = Math.min(s, e);
  const end = Math.max(s, e);

  return {
    normalizedCidr: `${subnet}.0/24`,
    prefixLen: 24,
    networkIp: `${subnet}.0`,
    broadcastIp: `${subnet}.255`,
    totalHosts: end - start + 1,
    blocks: [
      {
        index: 0,
        label: `${subnet}.${start}-${end}`,
        subnet,
        start,
        end,
        hostCount: end - start + 1,
        networkIp: `${subnet}.0`,
        broadcastIp: `${subnet}.255`,
      },
    ],
  };
}

export function enumerateCidrIps(plan: CIDRScanPlan): string[] {
  const ips: string[] = [];
  for (const blk of plan.blocks) {
    for (let i = blk.start; i <= blk.end; i++) {
      ips.push(`${blk.subnet}.${i}`);
    }
  }
  return ips;
}

export function isCidrPrefixAllowed(
  prefixLen: number,
  maxCidrPrefix: number
): { allowed: boolean; requiredTier: 'pro' | 'enterprise' } {
  if (prefixLen >= maxCidrPrefix) {
    return { allowed: true, requiredTier: 'pro' };
  }
  return {
    allowed: false,
    requiredTier: prefixLen <= 21 ? 'enterprise' : 'pro',
  };
}
