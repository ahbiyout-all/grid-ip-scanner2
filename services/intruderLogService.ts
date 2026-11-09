import { IntruderLogRecord } from '../types';

const STORAGE_KEY = 'grid_intruder_detection_logs';

/**
 * Retrieves all intruder detection logs from local storage
 */
export const getIntruderLogs = (): IntruderLogRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (e) {
    console.error('Failed to read intruder logs from localStorage:', e);
    return [];
  }
};

/**
 * Saves intruder detection logs to local storage
 */
export const saveIntruderLogs = (logs: IntruderLogRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    // Keep up to 200 logs
    const trimmed = logs.slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save intruder logs to localStorage:', e);
  }
};

/**
 * Adds a new intruder log record
 */
export const addIntruderLog = (
  entry: Omit<IntruderLogRecord, 'id' | 'timestamp' | 'dateStr'>
): IntruderLogRecord => {
  const current = getIntruderLogs();
  const now = new Date();
  const newRecord: IntruderLogRecord = {
    ...entry,
    id: `intruder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.getTime(),
    dateStr: now.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  saveIntruderLogs([newRecord, ...current]);
  return newRecord;
};

/**
 * Batch records multiple detected intruders (deduplicates against recent detections within 5 minutes)
 */
export const recordIntrudersFromDetection = (
  intruderList: any[],
  detectedBy: 'background_service' | 'tray_agent' | 'manual_scan' = 'background_service'
): IntruderLogRecord[] => {
  if (!intruderList || intruderList.length === 0) return [];

  const existingLogs = getIntruderLogs();
  const now = Date.now();
  const recentThresholdMs = 5 * 60 * 1000; // 5 minutes debounce for same IP+MAC
  const added: IntruderLogRecord[] = [];

  for (const item of intruderList) {
    const ip = item.ip || item.device?.ip;
    const mac = item.mac || item.device?.mac;
    if (!ip) continue;

    // Check if duplicate within last 5 minutes
    const isRecentDuplicate = existingLogs.some(
      log => log.ip === ip && (now - log.timestamp < recentThresholdMs)
    );

    if (!isRecentDuplicate) {
      const record = addIntruderLog({
        ip,
        mac: mac || '-',
        vendor: item.device?.vendor || item.vendor || '알 수 없는 제조사',
        hostname: item.device?.hostname || item.hostname || '-',
        detectedBy,
        openPorts: item.device?.openPorts || item.openPorts || [],
        status: 'new',
        notes: `24/7 침입 감시 모듈 자동 탐지`
      });
      added.push(record);
    }
  }

  return added;
};

/**
 * Updates the resolution status or notes of an intruder record
 */
export const updateIntruderLogStatus = (
  id: string,
  status: IntruderLogRecord['status'],
  notes?: string
): void => {
  const logs = getIntruderLogs();
  const updated = logs.map(item => {
    if (item.id === id) {
      return {
        ...item,
        status,
        notes: notes !== undefined ? notes : item.notes
      };
    }
    return item;
  });
  saveIntruderLogs(updated);
};

/**
 * Clears all intruder logs
 */
export const clearIntruderLogs = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear intruder logs:', e);
  }
};

/**
 * Exports intruder detection logs to a downloadable CSV file
 */
export const exportIntruderLogsCSV = (logs: IntruderLogRecord[]): void => {
  if (!logs || logs.length === 0) return;

  const headers = ['ID', '감지 일시', 'IP 주소', 'MAC 주소', '제조사', '호스트명', '열린 포트', '감지 주체', '처리 상태', '비고'];
  const rows = logs.map(l => [
    `"${l.id}"`,
    `"${l.dateStr}"`,
    `"${l.ip}"`,
    `"${l.mac || ''}"`,
    `"${(l.vendor || '').replace(/"/g, '""')}"`,
    `"${(l.hostname || '').replace(/"/g, '""')}"`,
    `"${(l.openPorts || []).join('; ')}"`,
    `"${l.detectedBy === 'background_service' ? '24/7 백그라운드 서비스' : l.detectedBy === 'tray_agent' ? '트레이 에이전트' : '수동 스캔'}"`,
    `"${l.status === 'new' ? '신규 감지' : l.status === 'trusted' ? '신뢰 승인' : l.status === 'blocked' ? '차단/격리' : '조사 중'}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GridIPScanner_Intruder_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
