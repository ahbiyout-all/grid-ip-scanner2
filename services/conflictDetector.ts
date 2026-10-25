import { ScanResult, DeviceInfo, SoftTrustInfo } from '../types';

export interface ConflictInfo {
  ip: string;
  mac?: string;
  reason: string;
}

export interface IntruderAnalysisResult {
  intruders: ScanResult[];
  softTrusted: ScanResult[];
}

/**
 * Checks if a MAC address uses a Locally Administered / Private / Randomized MAC pattern.
 * IEEE 802 standard: Bit 1 of the 1st octet is 1 (e.g., x2, x6, xA, xE).
 */
export const isRandomizedMacAddress = (mac?: string): boolean => {
  const clean = cleanMacKey(mac);
  if (!clean || clean.length < 2) return false;
  const firstByte = parseInt(clean.substring(0, 2), 16);
  return (firstByte & 0x02) !== 0;
};

/**
 * Computes fingerprint similarity score between two devices.
 * Returns score between 0.0 and 1.0, along with match details.
 */
export const computeFingerprintSimilarity = (
  curDev?: DeviceInfo,
  refDev?: DeviceInfo
): { score: number; reason: string } => {
  if (!curDev || !refDev) return { score: 0, reason: '비교 정보 부족' };

  const curMac = cleanMacKey(curDev.mac);
  const refMac = cleanMacKey(refDev.mac);

  // 1. Exact MAC match
  if (curMac && refMac && curMac === refMac) {
    return { score: 1.0, reason: 'MAC 주소 일치 (100%)' };
  }

  // 2. Randomized MAC on same device/vendor or same OUI prefix
  const curOui = curMac ? curMac.substring(0, 6) : '';
  const refOui = refMac ? refMac.substring(0, 6) : '';
  const isRandom = isRandomizedMacAddress(curDev.mac) || isRandomizedMacAddress(refDev.mac);

  let score = 0;
  const matchReasons: string[] = [];

  // Hostname match (non-empty & valid)
  const curHost = (curDev.hostname || curDev.mdns || '').trim().toLowerCase();
  const refHost = (refDev.hostname || refDev.mdns || '').trim().toLowerCase();
  if (curHost && refHost && curHost !== 'unknown' && curHost === refHost) {
    score += 0.50;
    matchReasons.push(`호스트명 일치(${curDev.hostname})`);
  }

  // Vendor / OUI match
  const curVendor = (curDev.vendor || '').trim().toLowerCase();
  const refVendor = (refDev.vendor || '').trim().toLowerCase();
  if (curVendor && refVendor && curVendor !== 'unknown vendor' && curVendor === refVendor) {
    score += 0.35;
    matchReasons.push(`제조사 일치(${curDev.vendor})`);
  } else if (curOui && refOui && curOui === refOui) {
    score += 0.30;
    matchReasons.push(`OUI 제조사 옥텟 일치[${curOui}]`);
  }

  // Private / Randomized MAC pattern on familiar device
  if (isRandom && (score > 0 || (curVendor && refVendor))) {
    score += 0.15;
    matchReasons.push('무선 랜덤 MAC(Private Address) 패턴 감지');
  }

  // Cap score at 0.95 for non-exact MACs
  const finalScore = Math.min(0.95, score);
  const reasonText = matchReasons.length > 0 
    ? `식별자 핑거프린트 유사성 ${Math.round(finalScore * 100)}% (${matchReasons.join(', ')})`
    : '유사한 식별 패턴 미발견';

  return { score: finalScore, reason: reasonText };
};

/**
 * Detects IP address and MAC address conflicts across network scan results.
 */
export const analyzeNetworkConflicts = (
  currentResults: Record<string, ScanResult>,
  baselineResults?: Record<string, ScanResult>
): Map<string, ConflictInfo> => {
  const conflicts = new Map<string, ConflictInfo>();

  // 1. Check against Baseline / Previous scan for IP takeover / MAC changes
  if (baselineResults) {
    Object.entries(currentResults).forEach(([ip, cur]) => {
      if (cur.status !== 'active' || !cur.device) return;

      const base = baselineResults[ip];
      if (base && base.status === 'active' && base.device) {
        const curMac = (cur.device.mac || '').trim().toUpperCase();
        const baseMac = (base.device.mac || '').trim().toUpperCase();

        if (curMac && baseMac && curMac !== baseMac && curMac !== 'UNKNOWN' && baseMac !== 'UNKNOWN') {
          conflicts.set(ip, {
            ip,
            mac: curMac,
            reason: `IP 충돌 의심: 기존 점유 기기(${baseMac}, ${base.device.vendor || '알 수 없음'})와 다른 신규 MAC(${curMac}, ${cur.device.vendor || '알 수 없음'})이 동일 IP를 점유 중입니다.`
          });
        }
      }
    });
  }

  // 2. Check for duplicate MAC addresses across different active IPs in current scan
  const macToIps = new Map<string, string[]>();
  Object.entries(currentResults).forEach(([ip, item]) => {
    if (item.status !== 'active' || !item.device?.mac) return;
    const mac = item.device.mac.trim().toUpperCase();
    if (!mac || mac === 'UNKNOWN' || mac === '00:00:00:00:00:00' || mac === 'FF:FF:FF:FF:FF:FF') return;

    const list = macToIps.get(mac) || [];
    list.push(ip);
    macToIps.set(mac, list);
  });

  macToIps.forEach((ips, mac) => {
    if (ips.length > 1) {
      ips.forEach(ip => {
        if (!conflicts.has(ip)) {
          conflicts.set(ip, {
            ip,
            mac,
            reason: `동일 MAC 다중 IP 감지: MAC [${mac}] 기기가 ${ips.length}개의 IP(${ips.join(', ')})를 동시에 점유하고 있습니다 (Proxy ARP 또는 고정 IP 충돌 가능성).`
          });
        }
      });
    }
  });

  return conflicts;
};

/**
 * Cleans and normalizes MAC address strings to 12 uppercase hexadecimal characters without delimiters.
 */
export const cleanMacKey = (mac?: string): string => {
  if (!mac) return '';
  const cleaned = mac.toUpperCase().replace(/[^A-F0-9]/g, '');
  if (cleaned.length !== 12 || cleaned === '000000000000' || cleaned === 'FFFFFFFFFFFF') {
    return '';
  }
  return cleaned;
};

/**
 * Checks for new/unknown devices that are active in currentResults but not in the trusted/baseline set.
 * Incorporates Fingerprint Similarity Verification and Soft Trust Grace Period for familiar IPs/devices.
 */
export const findNewIntruderDevices = (
  currentResults: Record<string, ScanResult>,
  trustedMacsOrIps: Set<string>,
  historicalDevices?: Record<string, DeviceInfo>,
  gracePeriodDays: number = 7
): IntruderAnalysisResult => {
  const intruders: ScanResult[] = [];
  const softTrusted: ScanResult[] = [];

  const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Build comprehensive normalized set containing raw strings and cleaned MAC keys
  const normalizedTrusted = new Set<string>();
  trustedMacsOrIps.forEach(entry => {
    if (!entry) return;
    const cleanEntry = entry.trim().toUpperCase();
    normalizedTrusted.add(cleanEntry);
    const cleanM = cleanMacKey(cleanEntry);
    if (cleanM) normalizedTrusted.add(cleanM);
  });

  Object.values(currentResults).forEach(rawItem => {
    if (rawItem.status !== 'active' || !rawItem.device) return;

    // Clone item so we don't mutate original state directly without purpose
    const item: ScanResult = { ...rawItem, device: { ...rawItem.device } };
    const ip = item.ip;
    const mac = item.device?.mac ? item.device.mac.trim().toUpperCase() : '';
    const cleanM = cleanMacKey(mac);

    const isKnownIp = normalizedTrusted.has(ip);
    const isKnownMac = Boolean((cleanM && normalizedTrusted.has(cleanM)) || (mac && normalizedTrusted.has(mac)));

    // Case 1: Direct Hard Match -> Fully Trusted Device
    if (isKnownMac) {
      return;
    }

    // Case 2: Check Soft Trust Grace Period & Device Fingerprint Verification
    let softTrustMatch: SoftTrustInfo | null = null;

    // 2A. Check against historical record for this exact IP (Familiar IP returning with MAC/Fingerprint variation)
    if (historicalDevices && historicalDevices[ip]) {
      const refDev = historicalDevices[ip];
      const similarity = computeFingerprintSimilarity(item.device, refDev);

      // Check last seen activity timestamp within grace period
      const lastSeenTime = refDev.lastSeen ? new Date(refDev.lastSeen).getTime() : 0;
      const isWithinGraceWindow = lastSeenTime > 0 && (now - lastSeenTime <= gracePeriodMs);

      if (similarity.score >= 0.40 || isRandomizedMacAddress(mac) || isWithinGraceWindow) {
        softTrustMatch = {
          isSoftTrusted: true,
          reason: `기존 등록 IP(${ip})의 식별자 변동 유예: ${similarity.reason}${isWithinGraceWindow ? ' (최근 7일 유예 기간 이내)' : ''}`,
          similarityScore: Math.max(0.60, similarity.score),
          matchedPreviousIp: ip,
          matchedPreviousMac: refDev.mac,
          matchedSignature: `${refDev.vendor || '제조사'} / ${refDev.hostname || '호스트명'}`,
          graceExpiresAt: lastSeenTime > 0 ? lastSeenTime + gracePeriodMs : now + gracePeriodMs
        };
      }
    }

    // 2B. Check if IP itself is in trusted IP set (e.g. static IP allocation or known trusted IP slot)
    if (!softTrustMatch && isKnownIp) {
      const isRandom = isRandomizedMacAddress(mac);
      softTrustMatch = {
        isSoftTrusted: true,
        reason: `신뢰 등록 IP(${ip})에서 MAC 식별자 변동 감지${isRandom ? ' (무선 랜덤 MAC/Private Address 적용)' : ''} - 소프트 신뢰 유예 적용`,
        similarityScore: isRandom ? 0.85 : 0.70,
        matchedPreviousIp: ip,
        graceExpiresAt: now + gracePeriodMs
      };
    }

    // 2C. Check if device fingerprint matches a known trusted device on a DIFFERENT IP (DHCP IP Shift)
    if (!softTrustMatch && historicalDevices) {
      const curHost = (item.device?.hostname || item.device?.mdns || '').trim().toLowerCase();
      if (curHost && curHost !== 'unknown') {
        const matchedHist = Object.entries(historicalDevices).find(([refIp, refDev]) => {
          if (refIp === ip) return false;
          const refHost = (refDev.hostname || refDev.mdns || '').trim().toLowerCase();
          return refHost && refHost === curHost;
        });

        if (matchedHist) {
          const [prevIp, refDev] = matchedHist;
          softTrustMatch = {
            isSoftTrusted: true,
            reason: `기존 신뢰 기기 [${refDev.hostname || curHost}]의 DHCP IP 이동 감지 (${prevIp} -> ${ip}) - 소프트 신뢰 유예 적용`,
            similarityScore: 0.80,
            matchedPreviousIp: prevIp,
            matchedPreviousMac: refDev.mac,
            matchedSignature: `${refDev.vendor || '제조사'} / ${refDev.hostname || '호스트'}`,
            graceExpiresAt: now + gracePeriodMs
          };
        }
      }
    }

    // Assign Soft Trust Info or mark as Hard Intruder
    if (softTrustMatch) {
      item.softTrustInfo = softTrustMatch;
      if (item.device) item.device.softTrustInfo = softTrustMatch;
      softTrusted.push(item);
    } else {
      intruders.push(item);
    }
  });

  return { intruders, softTrusted };
};
