import { ScanResult, ScanSnapshot, DiffStatus, DiffItem, DiffAnalysisResult } from '../types';

const SNAPSHOTS_KEY = 'grid_ip_scanner_snapshots_v2';

export const getSavedSnapshots = (): ScanSnapshot[] => {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load snapshots:', e);
  }
  return [];
};

export const saveSnapshot = (
  subnet: string,
  start: number,
  end: number,
  results: Record<string, ScanResult>,
  customLabel?: string
): ScanSnapshot => {
  const snapshots = getSavedSnapshots();
  const activeCount = Object.values(results).filter((r) => r.status === 'active').length;
  const now = new Date();

  const newSnapshot: ScanSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: Date.now(),
    label: customLabel || `${subnet}.0/24 (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
    subnet,
    start,
    end,
    activeCount,
    results: JSON.parse(JSON.stringify(results)), // deep clone
  };

  // Keep last 25 snapshots (expanded from 15)
  const updated = [newSnapshot, ...snapshots].slice(0, 25);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save snapshot to localStorage:', e);
  }

  return newSnapshot;
};

export const updateSnapshotLabel = (id: string, newLabel: string): ScanSnapshot[] => {
  const snapshots = getSavedSnapshots().map((s) => {
    if (s.id === id) {
      return { ...s, label: newLabel.trim() || s.label };
    }
    return s;
  });
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to update snapshot label:', e);
  }
  return snapshots;
};

export const deleteSnapshot = (id: string): ScanSnapshot[] => {
  const snapshots = getSavedSnapshots().filter((s) => s.id !== id);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to update snapshots after delete:', e);
  }
  return snapshots;
};

export const clearAllSnapshots = (): ScanSnapshot[] => {
  try {
    localStorage.removeItem(SNAPSHOTS_KEY);
  } catch (e) {
    console.error('Failed to clear snapshots:', e);
  }
  return [];
};

const HIGH_RISK_PORTS = [21, 22, 23, 80, 445, 1433, 3306, 3389, 5900, 6379, 8080];

/**
 * Deep Diff Engine:
 * Computes deep differences between Target (e.g. Current or Snapshot B) and Baseline (e.g. Snapshot A).
 * Compares: Active/Offline status, MAC address (conflict/spoofing), Open Ports (added/removed/high-risk),
 * Hostname/Vendor changes, and RTT Latency deviation.
 */
export const computeSnapshotDiff = (
  targetResults: Record<string, ScanResult>,
  baselineResults: Record<string, ScanResult>,
  targetLabel = '현재 스캔 (Live)',
  baselineLabel = '기준 스냅샷 (Baseline)'
): DiffAnalysisResult => {
  const diffMap: Record<string, DiffStatus> = {};
  const items: DiffItem[] = [];

  const allIps = new Set<string>([
    ...Object.keys(targetResults || {}),
    ...Object.keys(baselineResults || {}),
  ]);

  let newCount = 0;
  let offlineCount = 0;
  let changedCount = 0;
  let sameCount = 0;
  let securityAlertCount = 0;

  allIps.forEach((ip) => {
    const cur = targetResults ? targetResults[ip] : undefined;
    const prev = baselineResults ? baselineResults[ip] : undefined;

    const curActive = cur && cur.status === 'active';
    const prevActive = prev && prev.status === 'active';

    if (curActive && !prevActive) {
      // 1. Newly connected device (+NEW)
      diffMap[ip] = 'new';
      newCount++;

      const ports = cur?.device?.openPorts || [];
      const hasCriticalPort = ports.some((p) => HIGH_RISK_PORTS.includes(p));
      if (hasCriticalPort) securityAlertCount++;

      const details: string[] = [
        `새로운 활성 장치 감지: ${cur?.device?.vendor || '제조사 미확인'} (${cur?.device?.hostname || '호스트명 없음'})`,
        `MAC 주소: ${cur?.device?.mac || 'N/A'}`,
      ];
      if (ports.length > 0) {
        details.push(`개방 포트: [${ports.join(', ')}]${hasCriticalPort ? ' ⚠️ 취약점 주의 포트 포함' : ''}`);
      }
      if (cur?.device?.latency) {
        details.push(`응답 지연시간: ${cur.device.latency}ms`);
      }

      items.push({
        ip,
        diffStatus: 'new',
        category: hasCriticalPort ? 'security_alert' : 'connectivity',
        current: cur,
        previous: prev,
        changeDetails: details,
        hasSecurityRisk: hasCriticalPort,
      });
    } else if (!curActive && prevActive) {
      // 2. Device went offline / disconnected (-OFF)
      diffMap[ip] = 'offline';
      offlineCount++;

      items.push({
        ip,
        diffStatus: 'offline',
        category: 'connectivity',
        current: cur,
        previous: prev,
        changeDetails: [
          `장치가 오프라인으로 전환됨 (기존: ${prev?.device?.hostname || prev?.device?.vendor || '장치'})`,
          `이전 MAC 주소: ${prev?.device?.mac || 'N/A'}`,
          ...(prev?.device?.openPorts?.length ? [`이전 운영 포트: [${prev.device.openPorts.join(', ')}]`] : []),
        ],
      });
    } else if (curActive && prevActive) {
      // 3. Both active: check for attribute, port, MAC, and latency changes
      const changes: string[] = [];
      const curDev = cur?.device;
      const prevDev = prev?.device;

      const curMac = curDev?.mac;
      const prevMac = prevDev?.mac;
      const curHost = curDev?.hostname;
      const prevHost = prevDev?.hostname;
      const curVendor = curDev?.vendor;
      const prevVendor = prevDev?.vendor;

      let macChanged = false;
      let hostnameChanged = false;
      let vendorChanged = false;
      let hasSecurityRisk = false;

      // Normalize MAC helper: strips colons, hyphens, and whitespace
      const cleanMac = (m?: string) => (m && m !== 'Unknown' && m !== 'N/A' ? m.replace(/[:-]/g, '').toUpperCase().trim() : '');
      const normCurMac = cleanMac(curMac);
      const normPrevMac = cleanMac(prevMac);

      // Normalize Hostname helper: strips .local, whitespace, and ignores generic placeholders
      const cleanHost = (h?: string) => {
        if (!h || h === 'Unknown' || h === 'Unknown Device' || h === 'Hidden Node' || h === '-') return '';
        return h.replace(/\.local$/i, '').trim().toLowerCase();
      };
      const normCurHost = cleanHost(curHost);
      const normPrevHost = cleanHost(prevHost);

      // Normalize Vendor helper
      const cleanVendor = (v?: string) => {
        if (!v || v === 'Unknown' || v === 'Unknown Vendor' || v === '-') return '';
        return v.trim().toLowerCase();
      };
      const normCurVendor = cleanVendor(curVendor);
      const normPrevVendor = cleanVendor(prevVendor);

      // 3.1. MAC Address changed (Critical Security Event: IP Conflict or ARP Spoofing)
      if (normCurMac && normPrevMac && normCurMac !== normPrevMac) {
        macChanged = true;
        hasSecurityRisk = true;
        securityAlertCount++;
        changes.push(`⚠️ MAC 주소 변동 감지! [${prevMac}] ➔ [${curMac}] (IP 충돌 또는 장비 교체/ARP 스푸핑 의심)`);
      }

      // 3.2. Hostname changed (only if both are valid non-placeholder names)
      if (normCurHost && normPrevHost && normCurHost !== normPrevHost) {
        hostnameChanged = true;
        changes.push(`호스트명 변경: [${prevHost}] ➔ [${curHost}]`);
      }

      // 3.3. Vendor changed
      if (normCurVendor && normPrevVendor && normCurVendor !== normPrevVendor) {
        vendorChanged = true;
        changes.push(`제조사 식별 변동: [${prevVendor}] ➔ [${curVendor}]`);
      }

      // 3.4. Open Ports diff analysis
      const curPorts = curDev?.openPorts || [];
      const prevPorts = prevDev?.openPorts || [];
      const portsAdded = curPorts.filter((p) => !prevPorts.includes(p));
      const portsRemoved = prevPorts.filter((p) => !curPorts.includes(p));

      if (portsAdded.length > 0) {
        const addedHighRisk = portsAdded.filter((p) => HIGH_RISK_PORTS.includes(p));
        if (addedHighRisk.length > 0) {
          hasSecurityRisk = true;
          securityAlertCount++;
          changes.push(`🛡️ ⚠️ 보안 취약 포트 신규 개방! +[${addedHighRisk.join(', ')}] (주의 요망)`);
        }
        changes.push(`신규 개방 포트: +[${portsAdded.join(', ')}]`);
      }

      if (portsRemoved.length > 0) {
        changes.push(`차단/종료된 포트: -[${portsRemoved.join(', ')}]`);
      }

      const portChanged = portsAdded.length > 0 || portsRemoved.length > 0;
      const isIdentityOrPortChanged = macChanged || hostnameChanged || vendorChanged || portChanged;

      // 3.5. Latency deviation (supplementary performance metric, NOT standalone changed trigger)
      const curLatency = curDev?.latency || 0;
      const prevLatency = prevDev?.latency || 0;
      const latencyDiffMs = curLatency - prevLatency;
      if (isIdentityOrPortChanged && curLatency > 0 && prevLatency > 0 && Math.abs(latencyDiffMs) >= 50) {
        changes.push(
          `응답 지연시간 변동: ${prevLatency}ms ➔ ${curLatency}ms (${latencyDiffMs > 0 ? `+${latencyDiffMs}ms 지연` : `${latencyDiffMs}ms 개선`})`
        );
      }

      if (isIdentityOrPortChanged) {
        diffMap[ip] = 'changed';
        changedCount++;

        let category: DiffItem['category'] = 'network_change';
        if (hasSecurityRisk) {
          category = 'security_alert';
        } else if (macChanged || vendorChanged) {
          category = 'hardware_change';
        }

        items.push({
          ip,
          diffStatus: 'changed',
          category,
          current: cur,
          previous: prev,
          changeDetails: changes,
          macChanged,
          portsAdded: portsAdded.length > 0 ? portsAdded : undefined,
          portsRemoved: portsRemoved.length > 0 ? portsRemoved : undefined,
          latencyDiffMs: Math.abs(latencyDiffMs) >= 30 ? latencyDiffMs : undefined,
          hostnameChanged,
          vendorChanged,
          hasSecurityRisk,
        });
      } else {
        // Both active and identical: Real baseline device maintained without change
        diffMap[ip] = 'same';
        sameCount++;
        items.push({
          ip,
          diffStatus: 'same',
          category: 'identical',
          current: cur,
          previous: prev,
          changeDetails: ['기준 스냅샷과 동일하게 정상 온라인 운영 중인 장비입니다.'],
        });
      }
    } else {
      // Both inactive: unassigned/empty IP slot in both baseline and current scan
      // Do NOT set diffMap[ip] or increment sameCount to keep the grid clean and distinguish active devices!
    }
  });

  // Sort items: Security alerts first, then changed, new, offline, and sorted by IP
  items.sort((a, b) => {
    const priority = (item: DiffItem) => {
      if (item.hasSecurityRisk) return 0;
      if (item.diffStatus === 'changed') return 1;
      if (item.diffStatus === 'new') return 2;
      if (item.diffStatus === 'offline') return 3;
      return 4;
    };
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    const numA = parseInt(a.ip.split('.').pop() || '0', 10);
    const numB = parseInt(b.ip.split('.').pop() || '0', 10);
    return numA - numB;
  });

  return {
    baselineName: baselineLabel,
    targetName: targetLabel,
    diffMap,
    items,
    summary: {
      newCount,
      offlineCount,
      changedCount,
      sameCount,
      securityAlertCount,
      totalEvaluated: allIps.size,
    },
  };
};

/**
 * Exports snapshot diff analysis to CSV spreadsheet format.
 */
export const exportDiffToCSV = (diffResult: DiffAnalysisResult, filename?: string): void => {
  const headers = [
    'IP Address',
    'Diff Status',
    'Category',
    'Before Status',
    'Before MAC',
    'Before Hostname',
    'Before Vendor',
    'Before Open Ports',
    'Before RTT',
    'After Status',
    'After MAC',
    'After Hostname',
    'After Vendor',
    'After Open Ports',
    'After RTT',
    'Change Details',
  ];

  const rows = diffResult.items.map((item) => {
    const prevDev = item.previous?.device;
    const curDev = item.current?.device;

    const escapeCsv = (str: string | undefined) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      item.ip,
      item.diffStatus.toUpperCase(),
      item.category || 'general',
      item.previous?.status || 'inactive',
      escapeCsv(prevDev?.mac),
      escapeCsv(prevDev?.hostname),
      escapeCsv(prevDev?.vendor),
      escapeCsv(prevDev?.openPorts?.join(', ')),
      prevDev?.latency ? `${prevDev.latency}ms` : '-',
      item.current?.status || 'inactive',
      escapeCsv(curDev?.mac),
      escapeCsv(curDev?.hostname),
      escapeCsv(curDev?.vendor),
      escapeCsv(curDev?.openPorts?.join(', ')),
      curDev?.latency ? `${curDev.latency}ms` : '-',
      escapeCsv(item.changeDetails.join(' | ')),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `GridIPScanner2_Diff_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
