import { ScanSchedule, ScheduleInterval, ScheduledScanRunRecord } from '../types';

const SCHEDULES_STORAGE_KEY = 'grid_ip_scanner_schedules_v1';
const HISTORY_STORAGE_KEY = 'grid_ip_scanner_schedule_history_v1';

export const INTERVAL_PRESETS: { type: ScheduleInterval; minutes: number; labelKo: string; labelEn: string }[] = [
  { type: '15m', minutes: 15, labelKo: '15분마다 (실시간 집중 감시)', labelEn: 'Every 15 min (Intensive)' },
  { type: '30m', minutes: 30, labelKo: '30분마다 (정기 체크)', labelEn: 'Every 30 min (Regular)' },
  { type: 'hourly', minutes: 60, labelKo: '1시간마다 (권장 주기)', labelEn: 'Hourly (Recommended)' },
  { type: 'every_2h', minutes: 120, labelKo: '2시간마다', labelEn: 'Every 2 Hours' },
  { type: 'every_6h', minutes: 360, labelKo: '6시간마다 (근무 교대/주기)', labelEn: 'Every 6 Hours (Shift)' },
  { type: 'every_12h', minutes: 720, labelKo: '12시간마다 (반나절)', labelEn: 'Every 12 Hours (Half-day)' },
  { type: 'daily', minutes: 1440, labelKo: '매일 (24시간 주기 야간점검)', labelEn: 'Daily (24h Routine)' },
  { type: 'weekly', minutes: 10080, labelKo: '매주 (정기 점검)', labelEn: 'Weekly (Scheduled Audit)' },
  { type: 'custom', minutes: 60, labelKo: '사용자 지정 분/시간', labelEn: 'Custom Interval' },
];

export const getIntervalMinutes = (type: ScheduleInterval, customMinutes?: number): number => {
  if (type === 'custom' && customMinutes && customMinutes > 0) {
    return Math.max(1, Math.round(customMinutes));
  }
  const match = INTERVAL_PRESETS.find(p => p.type === type);
  return match ? match.minutes : 60;
};

export const formatIntervalLabel = (
  type: ScheduleInterval,
  intervalMinutes: number,
  lang: 'ko' | 'en' = 'ko'
): string => {
  if (type === 'custom') {
    if (intervalMinutes % 1440 === 0) {
      const days = intervalMinutes / 1440;
      return lang === 'ko' ? `${days}일마다 (사용자 지정)` : `Every ${days} days (Custom)`;
    }
    if (intervalMinutes % 60 === 0) {
      const hours = intervalMinutes / 60;
      return lang === 'ko' ? `${hours}시간마다 (사용자 지정)` : `Every ${hours} hours (Custom)`;
    }
    return lang === 'ko' ? `${intervalMinutes}분마다 (사용자 지정)` : `Every ${intervalMinutes} min (Custom)`;
  }
  const match = INTERVAL_PRESETS.find(p => p.type === type);
  if (!match) return `${intervalMinutes}m`;
  return lang === 'ko' ? match.labelKo : match.labelEn;
};

export const calculateNextRunTime = (intervalMinutes: number, fromTime?: number): number => {
  const base = fromTime || Date.now();
  return base + intervalMinutes * 60 * 1000;
};

export const formatCountdown = (nextRun?: number, lang: 'ko' | 'en' = 'ko'): string => {
  if (!nextRun) return lang === 'ko' ? '대기 중' : 'Pending';
  const diff = nextRun - Date.now();
  if (diff <= 0) return lang === 'ko' ? '실행 예정 (지금)' : 'Due now';

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return lang === 'ko'
      ? `${days}일 ${hours}시간 후`
      : `in ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return lang === 'ko'
      ? `${hours}시간 ${minutes}분 후`
      : `in ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return lang === 'ko'
      ? `${minutes}분 ${seconds}초 후`
      : `in ${minutes}m ${seconds}s`;
  }
  return lang === 'ko' ? `${seconds}초 후` : `in ${seconds}s`;
};

export const getSchedules = (): ScanSchedule[] => {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load scan schedules from localStorage:', e);
  }
  return [];
};

export const saveSchedule = (
  data: Partial<ScanSchedule> & { name: string; subnet: string }
): ScanSchedule => {
  const schedules = getSchedules();
  const now = Date.now();
  const minutes = getIntervalMinutes(data.intervalType || 'hourly', data.intervalMinutes);

  let target: ScanSchedule;
  const existingIndex = schedules.findIndex(s => s.id === data.id);

  if (existingIndex >= 0) {
    const current = schedules[existingIndex];
    target = {
      ...current,
      ...data,
      intervalMinutes: minutes,
      updatedAt: now,
      // If toggled or interval changed, recalculate nextRun
      nextRun: data.enabled !== false 
        ? (current.enabled ? (data.nextRun || calculateNextRunTime(minutes, current.lastRun || now)) : calculateNextRunTime(minutes, now))
        : undefined,
    };
    schedules[existingIndex] = target;
  } else {
    target = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim() || `스케줄 ${data.subnet}.0/24`,
      enabled: data.enabled !== false,
      subnet: data.subnet.trim() || '192.168.0',
      start: typeof data.start === 'number' ? data.start : 1,
      end: typeof data.end === 'number' ? data.end : 254,
      scanMode: data.scanMode || 'fast',
      deepScan: data.deepScan || false,
      intervalType: data.intervalType || 'hourly',
      intervalMinutes: minutes,
      autoSaveSnapshot: data.autoSaveSnapshot !== false,
      snapshotPrefix: data.snapshotPrefix?.trim() || '[Auto-Sched]',
      notifyOnCompletion: data.notifyOnCompletion !== false,
      notifyOnChangesOnly: data.notifyOnChangesOnly || false,
      createdAt: now,
      updatedAt: now,
      totalRuns: 0,
      nextRun: data.enabled !== false ? calculateNextRunTime(minutes, now) : undefined,
    };
    schedules.unshift(target);
  }

  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to save schedule to localStorage:', e);
  }

  return target;
};

export const deleteSchedule = (id: string): ScanSchedule[] => {
  const schedules = getSchedules().filter(s => s.id !== id);
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to delete schedule from localStorage:', e);
  }
  return schedules;
};

export const toggleSchedule = (id: string, forceEnabled?: boolean): ScanSchedule | null => {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return null;

  const nextState = typeof forceEnabled === 'boolean' ? forceEnabled : !schedule.enabled;
  schedule.enabled = nextState;
  schedule.updatedAt = Date.now();
  if (nextState) {
    schedule.nextRun = calculateNextRunTime(schedule.intervalMinutes, Date.now());
  } else {
    schedule.nextRun = undefined;
  }

  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to toggle schedule:', e);
  }

  return schedule;
};

export const recordScheduleRunCompletion = (
  id: string,
  runTimestamp: number = Date.now()
): ScanSchedule | null => {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return null;

  schedule.lastRun = runTimestamp;
  schedule.totalRuns = (schedule.totalRuns || 0) + 1;
  schedule.updatedAt = Date.now();
  if (schedule.enabled) {
    schedule.nextRun = calculateNextRunTime(schedule.intervalMinutes, runTimestamp);
  }

  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to update schedule run state:', e);
  }

  return schedule;
};

export const getScheduleHistory = (): ScheduledScanRunRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load schedule history:', e);
  }
  return [];
};

export const addHistoryRecord = (
  record: Omit<ScheduledScanRunRecord, 'id' | 'timestamp'>
): ScheduledScanRunRecord => {
  const history = getScheduleHistory();
  const newRecord: ScheduledScanRunRecord = {
    ...record,
    id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  // Keep last 100 history run records
  const updated = [newRecord, ...history].slice(0, 100);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save schedule history record:', e);
  }

  return newRecord;
};

export const clearScheduleHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear schedule history:', e);
  }
};

export const exportScheduleHistoryCSV = (history: ScheduledScanRunRecord[], lang: 'ko' | 'en' = 'ko'): void => {
  const headers = [
    lang === 'ko' ? '기록ID' : 'Run ID',
    lang === 'ko' ? '실행시각' : 'Timestamp',
    lang === 'ko' ? '스케줄명' : 'Schedule Name',
    lang === 'ko' ? '대상서브넷' : 'Target Subnet',
    lang === 'ko' ? '활성장치수' : 'Active Devices',
    lang === 'ko' ? '전체검사수' : 'Total Targets',
    lang === 'ko' ? '소요시간(초)' : 'Duration(s)',
    lang === 'ko' ? '신규장치' : 'New Devices',
    lang === 'ko' ? '오프라인장치' : 'Offline Devices',
    lang === 'ko' ? '변동장치' : 'Changed Devices',
    lang === 'ko' ? '스냅샷ID' : 'Snapshot ID',
    lang === 'ko' ? '상태' : 'Status',
    lang === 'ko' ? '메시지' : 'Message',
  ];

  const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

  const rows = history.map(item => [
    item.id,
    new Date(item.timestamp).toLocaleString(),
    escapeCsv(item.scheduleName),
    escapeCsv(`${item.subnet}.0/24`),
    item.activeCount,
    item.totalCount,
    (item.durationMs / 1000).toFixed(1),
    item.newDevicesCount ?? 0,
    item.offlineDevicesCount ?? 0,
    item.changedDevicesCount ?? 0,
    escapeCsv(item.snapshotId || '-'),
    item.status.toUpperCase(),
    escapeCsv(item.errorMessage || 'OK'),
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GridIPScanner2_Schedule_History_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
