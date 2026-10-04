import { ScanResult, ScanSnapshot, DiffStatus, DiffItem } from '../types';

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

  // Keep last 15 snapshots
  const updated = [newSnapshot, ...snapshots].slice(0, 15);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save snapshot to localStorage:', e);
  }

  return newSnapshot;
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

export interface DiffAnalysisResult {
  diffMap: Record<string, DiffStatus>;
  items: DiffItem[];
  summary: {
    newCount: number;
    offlineCount: number;
    changedCount: number;
    sameCount: number;
    totalEvaluated: number;
  };
}

/**
 * Computes difference between Current scan state and a Baseline snapshot.
 */
export const computeSnapshotDiff = (
  currentResults: Record<string, ScanResult>,
  baselineResults: Record<string, ScanResult>
): DiffAnalysisResult => {
  const diffMap: Record<string, DiffStatus> = {};
  const items: DiffItem[] = [];

  const allIps = new Set<string>([
    ...Object.keys(currentResults),
    ...Object.keys(baselineResults),
  ]);

  let newCount = 0;
  let offlineCount = 0;
  let changedCount = 0;
  let sameCount = 0;

  allIps.forEach((ip) => {
    const cur = currentResults[ip];
    const prev = baselineResults[ip];

    const curActive = cur && cur.status === 'active';
    const prevActive = prev && prev.status === 'active';

    if (curActive && !prevActive) {
      // Newly connected device
      diffMap[ip] = 'new';
      newCount++;
      items.push({
        ip,
        diffStatus: 'new',
        current: cur,
        previous: prev,
        changeDetails: [
          `새로운 활성 장치 감지: ${cur?.device?.vendor || '제조사 미확인'} (${cur?.device?.hostname || '호스트명 없음'})`,
          `MAC 주소: ${cur?.device?.mac || 'N/A'}`,
        ],
      });
    } else if (!curActive && prevActive) {
      // Device went offline / disconnected
      diffMap[ip] = 'offline';
      offlineCount++;
      items.push({
        ip,
        diffStatus: 'offline',
        current: cur,
        previous: prev,
        changeDetails: [
          `장치가 오프라인으로 전환됨 (기존: ${prev?.device?.hostname || prev?.device?.vendor || '장치'})`,
          `이전 MAC: ${prev?.device?.mac || 'N/A'}`,
        ],
      });
    } else if (curActive && prevActive) {
      // Both active: check for changes (MAC change is critical: IP conflict / spoofing)
      const changes: string[] = [];
      const curMac = cur?.device?.mac;
      const prevMac = prev?.device?.mac;
      const curHost = cur?.device?.hostname;
      const prevHost = prev?.device?.hostname;

      if (curMac && prevMac && curMac !== prevMac) {
        changes.push(`⚠️ MAC 주소 변경 감지! [${prevMac}] ➔ [${curMac}] (IP 충돌 또는 장비 교체 의심)`);
      }
      if (curHost && prevHost && curHost !== prevHost) {
        changes.push(`호스트명 변경: [${prevHost}] ➔ [${curHost}]`);
      }

      if (changes.length > 0) {
        diffMap[ip] = 'changed';
        changedCount++;
        items.push({
          ip,
          diffStatus: 'changed',
          current: cur,
          previous: prev,
          changeDetails: changes,
        });
      } else {
        diffMap[ip] = 'same';
        sameCount++;
      }
    } else {
      diffMap[ip] = 'same';
    }
  });

  return {
    diffMap,
    items,
    summary: {
      newCount,
      offlineCount,
      changedCount,
      sameCount,
      totalEvaluated: allIps.size,
    },
  };
};
