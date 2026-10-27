import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  X, 
  Check, 
  Download, 
  Camera, 
  Bell, 
  BellRing, 
  Zap, 
  Layers, 
  HelpCircle,
  Activity,
  History,
  Sparkles,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { ScanSchedule, ScheduleInterval, ScheduledScanRunRecord, NetworkConfig } from '../types';
import { 
  INTERVAL_PRESETS, 
  formatIntervalLabel, 
  formatCountdown, 
  getSchedules, 
  saveSchedule, 
  deleteSchedule, 
  toggleSchedule, 
  getScheduleHistory, 
  clearScheduleHistory, 
  exportScheduleHistoryCSV,
  calculateNextRunTime
} from '../services/schedulerService';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: NetworkConfig;
  currentDeepScan: boolean;
  currentScanMode: 'fast' | 'standard' | 'precision';
  isScanning: boolean;
  lang: 'ko' | 'en';
  onTriggerScanNow: (schedule: ScanSchedule) => void;
  onViewSnapshot?: (snapshotId: string) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentDeepScan,
  currentScanMode,
  isScanning,
  lang,
  onTriggerScanNow,
  onViewSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'edit' | 'history'>('schedules');
  const [schedules, setSchedules] = useState<ScanSchedule[]>([]);
  const [history, setHistory] = useState<ScheduledScanRunRecord[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subnet, setSubnet] = useState(currentConfig.subnet || '192.168.0');
  const [start, setStart] = useState(currentConfig.start || 1);
  const [end, setEnd] = useState(currentConfig.end || 254);
  const [scanMode, setScanMode] = useState<'fast' | 'standard' | 'precision'>(currentScanMode || 'fast');
  const [deepScan, setDeepScan] = useState(currentDeepScan || false);
  const [intervalType, setIntervalType] = useState<ScheduleInterval>('hourly');
  const [customMinutes, setCustomMinutes] = useState<number>(60);
  const [autoSaveSnapshot, setAutoSaveSnapshot] = useState(true);
  const [snapshotPrefix, setSnapshotPrefix] = useState('[Auto-Sched]');
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(true);
  const [notifyOnChangesOnly, setNotifyOnChangesOnly] = useState(false);

  // Ticker for live countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Load schedules and history on open
  useEffect(() => {
    if (isOpen) {
      setSchedules(getSchedules());
      setHistory(getScheduleHistory());
    }
  }, [isOpen]);

  const refreshData = () => {
    setSchedules(getSchedules());
    setHistory(getScheduleHistory());
  };

  const resetForm = () => {
    setEditingScheduleId(null);
    setName('');
    setSubnet(currentConfig.subnet || '192.168.0');
    setStart(currentConfig.start || 1);
    setEnd(currentConfig.end || 254);
    setScanMode(currentScanMode || 'fast');
    setDeepScan(currentDeepScan || false);
    setIntervalType('hourly');
    setCustomMinutes(60);
    setAutoSaveSnapshot(true);
    setSnapshotPrefix('[Auto-Sched]');
    setNotifyOnCompletion(true);
    setNotifyOnChangesOnly(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setName(lang === 'ko' ? `${currentConfig.subnet || '192.168.0'} 1시간 정기 자동 스캔` : `${currentConfig.subnet || '192.168.0'} Hourly Routine Scan`);
    setActiveTab('edit');
  };

  const handleOpenEdit = (sched: ScanSchedule) => {
    setEditingScheduleId(sched.id);
    setName(sched.name);
    setSubnet(sched.subnet);
    setStart(sched.start);
    setEnd(sched.end);
    setScanMode(sched.scanMode);
    setDeepScan(sched.deepScan);
    setIntervalType(sched.intervalType);
    setCustomMinutes(sched.intervalMinutes);
    setAutoSaveSnapshot(sched.autoSaveSnapshot);
    setSnapshotPrefix(sched.snapshotPrefix || '[Auto-Sched]');
    setNotifyOnCompletion(sched.notifyOnCompletion);
    setNotifyOnChangesOnly(sched.notifyOnChangesOnly);
    setActiveTab('edit');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subnet.trim()) return;

    saveSchedule({
      id: editingScheduleId || undefined,
      name: name.trim() || `${subnet}.0/24 ${lang === 'ko' ? '자동 스케줄' : 'Schedule'}`,
      subnet: subnet.trim(),
      start: Number(start) || 1,
      end: Number(end) || 254,
      scanMode,
      deepScan,
      intervalType,
      intervalMinutes: customMinutes,
      autoSaveSnapshot,
      snapshotPrefix: snapshotPrefix.trim() || '[Auto-Sched]',
      notifyOnCompletion,
      notifyOnChangesOnly,
    });

    refreshData();
    resetForm();
    setActiveTab('schedules');
  };

  const handleToggle = (id: string) => {
    toggleSchedule(id);
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'ko' ? '해당 스케줄을 삭제하시겠습니까?' : 'Delete this schedule?')) {
      deleteSchedule(id);
      refreshData();
    }
  };

  const handleClearHistory = () => {
    if (confirm(lang === 'ko' ? '모든 스케줄 실행 기록을 삭제하시겠습니까?' : 'Clear all schedule run history?')) {
      clearScheduleHistory();
      refreshData();
    }
  };

  if (!isOpen) return null;

  const activeCount = schedules.filter(s => s.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {lang === 'ko' ? '네트워크 정기 자동 스케줄러' : 'Automated Network Scan Scheduler'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 border border-cyan-600/40 text-cyan-300">
                  {activeCount} {lang === 'ko' ? '개 활성' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'ko' 
                  ? '지정된 주기(1시간, 6시간, 매일 등)마다 자동으로 대역을 스캔하고 스냅샷을 보관합니다.'
                  : 'Automatically execute recurring network scans at custom intervals and archive snapshots.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 bg-slate-900/90 border-b border-slate-800 text-sm">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition ${
                activeTab === 'schedules'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{lang === 'ko' ? '스케줄 목록' : 'Schedules'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300">
                {schedules.length}
              </span>
            </button>

            <button
              onClick={() => {
                if (activeTab !== 'edit') handleOpenCreate();
              }}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition ${
                activeTab === 'edit'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{editingScheduleId ? (lang === 'ko' ? '스케줄 수정' : 'Edit Schedule') : (lang === 'ko' ? '새 스케줄 등록' : 'New Schedule')}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition ${
                activeTab === 'history'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{lang === 'ko' ? '자동 실행 기록' : 'Run History'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300">
                {history.length}
              </span>
            </button>
          </div>

          {activeTab === 'schedules' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ko' ? '스케줄 추가' : 'Add Schedule'}</span>
            </button>
          )}

          {activeTab === 'history' && history.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportScheduleHistoryCSV(history, lang)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ko' ? 'CSV 내보내기' : 'Export CSV'}</span>
              </button>
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ko' ? '기록 비우기' : 'Clear'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: Schedules List */}
          {activeTab === 'schedules' && (
            <div className="space-y-3">
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-3">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">
                    {lang === 'ko' ? '등록된 자동 스캔 스케줄이 없습니다.' : 'No automated scan schedules yet.'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mb-4">
                    {lang === 'ko'
                      ? '1시간마다, 매일 특정 주기마다 백그라운드에서 자동으로 서브넷을 탐색하고 스냅샷을 저장하도록 예약해보세요.'
                      : 'Configure recurring scans to automatically discover devices and save snapshots at regular intervals.'}
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'ko' ? '첫 스케줄 만들기' : 'Create First Schedule'}</span>
                  </button>
                </div>
              ) : (
                schedules.map((sched) => {
                  const countdownText = sched.enabled 
                    ? formatCountdown(sched.nextRun, lang) 
                    : (lang === 'ko' ? '비활성화됨' : 'Disabled');

                  return (
                    <div 
                      key={sched.id}
                      className={`p-4 rounded-xl border transition-all ${
                        sched.enabled 
                          ? 'bg-slate-950/60 border-slate-700/80 hover:border-cyan-500/50 shadow-md shadow-black/20' 
                          : 'bg-slate-950/30 border-slate-800/60 opacity-65'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{sched.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-cyan-300 border border-slate-700">
                              {sched.subnet}.{sched.start}~{sched.end}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                              {formatIntervalLabel(sched.intervalType, sched.intervalMinutes, lang)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              sched.scanMode === 'fast' ? 'bg-amber-950/60 text-amber-300' :
                              sched.scanMode === 'precision' ? 'bg-purple-950/60 text-purple-300' :
                              'bg-blue-950/60 text-blue-300'
                            }`}>
                              {sched.scanMode.toUpperCase()} {sched.deepScan ? '+DEEP' : ''}
                            </span>
                          </div>

                          {/* Meta & Features Row */}
                          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{lang === 'ko' ? '다음 실행:' : 'Next run:'}</span>
                              <span className={`font-medium ${sched.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {countdownText}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{lang === 'ko' ? '누적 실행:' : 'Runs:'}</span>
                              <span className="text-slate-300 font-mono">{sched.totalRuns || 0}회</span>
                            </div>
                            {sched.lastRun && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">{lang === 'ko' ? '최근:' : 'Last:'}</span>
                                <span className="text-slate-300">{new Date(sched.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                            {sched.autoSaveSnapshot && (
                              <span className="flex items-center gap-1 text-[11px] text-teal-400 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-800/30">
                                <Camera className="w-3 h-3" />
                                <span>{sched.snapshotPrefix}</span>
                              </span>
                            )}
                            {sched.notifyOnCompletion && (
                              <span className="flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/30">
                                <Bell className="w-3 h-3" />
                                <span>{sched.notifyOnChangesOnly ? (lang === 'ko' ? '변동시 알림' : 'On Changes') : (lang === 'ko' ? '알림' : 'Notify')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggle(sched.id)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                              sched.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                            title={sched.enabled ? (lang === 'ko' ? '스케줄 활성화됨' : 'Schedule Active') : (lang === 'ko' ? '스케줄 일시정지' : 'Schedule Paused')}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                sched.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Run Now Button */}
                          <button
                            type="button"
                            onClick={() => onTriggerScanNow(sched)}
                            disabled={isScanning}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition disabled:opacity-40"
                            title={lang === 'ko' ? '지금 즉시 스케줄 스캔 실행' : 'Trigger this scan now'}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{lang === 'ko' ? '즉시 실행' : 'Run'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sched)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                            title={lang === 'ko' ? '수정' : 'Edit'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(sched.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                            title={lang === 'ko' ? '삭제' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Edit / Create Form */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'ko' ? '기본 정보 및 스캔 타겟' : 'General & Target Network'}</span>
                </h3>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'ko' ? '스케줄 이름' : 'Schedule Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ko' ? '예: 본사 3층 네트워크 1시간 정기 점검' : 'e.g. Office Subnet Hourly Scan'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Subnet & Range */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {lang === 'ko' ? '서브넷 (Subnet)' : 'Subnet'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={subnet}
                        onChange={(e) => setSubnet(e.target.value)}
                        placeholder="192.168.0"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSubnet(currentConfig.subnet || '192.168.0');
                          setStart(currentConfig.start || 1);
                          setEnd(currentConfig.end || 254);
                        }}
                        className="px-2.5 py-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title={lang === 'ko' ? '현재 스캐너 대역 복사' : 'Copy current scanner subnet'}
                      >
                        {lang === 'ko' ? '현재값 복사' : 'Current'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {lang === 'ko' ? '시작 IP 오프셋' : 'Start Offset'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={254}
                      value={start}
                      onChange={(e) => setStart(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {lang === 'ko' ? '종료 IP 오프셋' : 'End Offset'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={254}
                      value={end}
                      onChange={(e) => setEnd(parseInt(e.target.value) || 254)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>

                {/* Scan Mode & Deep Scan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {lang === 'ko' ? '스캔 모드' : 'Scan Mode'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['fast', 'standard', 'precision'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setScanMode(m)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                            scanMode === m
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {m === 'fast' ? (lang === 'ko' ? '고속' : 'Fast') :
                           m === 'standard' ? (lang === 'ko' ? '표준' : 'Standard') :
                           (lang === 'ko' ? '정밀' : 'Precision')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                      <input
                        type="checkbox"
                        checked={deepScan}
                        onChange={(e) => setDeepScan(e.target.checked)}
                        className="rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-medium text-slate-200">
                          {lang === 'ko' ? '정밀 포트 스캔 (Deep Port Scan)' : 'Deep Port Scan Audit'}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {lang === 'ko' ? '기기별 주요 12개 서비스 포트 개방 여부 동시 점검' : 'Check top service ports'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Recurring Interval Configuration */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lang === 'ko' ? '자동 반복 주기 설정' : 'Recurring Interval'}</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERVAL_PRESETS.map((preset) => (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => {
                        setIntervalType(preset.type);
                        if (preset.type !== 'custom') {
                          setCustomMinutes(preset.minutes);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-medium text-left border transition ${
                        intervalType === preset.type
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div>{lang === 'ko' ? preset.labelKo : preset.labelEn}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {preset.type === 'custom' ? (lang === 'ko' ? '분/시간 직접입력' : 'Custom') : `${preset.minutes} min`}
                      </div>
                    </button>
                  ))}
                </div>

                {intervalType === 'custom' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 animate-fade-in">
                    <label className="text-xs text-slate-300 whitespace-nowrap">
                      {lang === 'ko' ? '반복 주기 (분 단위):' : 'Interval in minutes:'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={43200}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-28 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs text-slate-400">
                      {customMinutes >= 60 
                        ? `≈ ${(customMinutes / 60).toFixed(1)} ${lang === 'ko' ? '시간마다' : 'hours'}` 
                        : `${customMinutes} ${lang === 'ko' ? '분마다' : 'minutes'}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Automated Actions & Snapshot Storage */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'ko' ? '자동 저장 및 알림 옵션' : 'Auto-Save & Notifications'}</span>
                </h3>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSaveSnapshot}
                      onChange={(e) => setAutoSaveSnapshot(e.target.checked)}
                      className="mt-0.5 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-medium text-slate-200">
                        {lang === 'ko' ? '스캔 완료 시 스냅샷 자동 저장 (Snapshot Archive)' : 'Automatically save scan snapshots to history'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'ko' 
                          ? '정기 스캔 결과를 로컬 스냅샷으로 영구 보관하여 [스냅샷 비교] 모드에서 과거 기록과 언제든 비교/분석할 수 있습니다.'
                          : 'Store results as local snapshots so you can compare network states over time.'}
                      </p>
                    </div>
                  </label>

                  {autoSaveSnapshot && (
                    <div className="flex items-center gap-2 pl-6">
                      <label className="text-xs text-slate-400">
                        {lang === 'ko' ? '스냅샷 라벨 접두어:' : 'Snapshot Prefix:'}
                      </label>
                      <input
                        type="text"
                        value={snapshotPrefix}
                        onChange={(e) => setSnapshotPrefix(e.target.value)}
                        placeholder="[Auto-Sched]"
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono w-44"
                      />
                    </div>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={notifyOnCompletion}
                      onChange={(e) => setNotifyOnCompletion(e.target.checked)}
                      className="mt-0.5 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-medium text-slate-200">
                        {lang === 'ko' ? '시스템 / 브라우저 알림 전송' : 'Send system / browser notifications'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'ko' ? '정기 스캔이 완료되었을 때 토스트 및 바탕화면 알림을 띄웁니다.' : 'Show toast and desktop notification upon completion.'}
                      </p>
                    </div>
                  </label>

                  {notifyOnCompletion && (
                    <div className="pl-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyOnChangesOnly}
                          onChange={(e) => setNotifyOnChangesOnly(e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-600 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-slate-300">
                          {lang === 'ko' ? '네트워크 변동(신규 접속 또는 오프라인 발생)이 있을 때만 알림' : 'Only notify when network changes (new/offline devices) are detected'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('schedules')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  {lang === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingScheduleId ? (lang === 'ko' ? '스케줄 저장' : 'Save Changes') : (lang === 'ko' ? '새 스케줄 등록' : 'Create Schedule')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: History & Logs */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <div className="p-3 rounded-xl bg-slate-800 text-slate-400 mb-2">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">
                    {lang === 'ko' ? '실행 기록이 없습니다.' : 'No execution logs recorded yet.'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'ko' ? '스케줄이 실행되면 여기에 자동 스캔 결과 및 스냅샷 내역이 기록됩니다.' : 'Automated scan runs and generated snapshots will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">{lang === 'ko' ? '실행 시각' : 'Time'}</th>
                        <th className="py-2.5 px-3">{lang === 'ko' ? '스케줄 이름' : 'Schedule'}</th>
                        <th className="py-2.5 px-3">{lang === 'ko' ? '서브넷' : 'Subnet'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'ko' ? '활성 장비' : 'Active'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'ko' ? '변동 사항' : 'Changes'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'ko' ? '소요 시간' : 'Duration'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'ko' ? '스냅샷' : 'Snapshot'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'ko' ? '상태' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white truncate max-w-[140px]">
                            {item.scheduleName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300">
                            {item.subnet}.0/24
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                            {item.activeCount} <span className="text-[11px] font-normal text-slate-500">/ {item.totalCount}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {(item.newDevicesCount || 0) > 0 || (item.offlineDevicesCount || 0) > 0 ? (
                              <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                                {(item.newDevicesCount || 0) > 0 && (
                                  <span className="text-emerald-400 font-bold">+{item.newDevicesCount}</span>
                                )}
                                {(item.offlineDevicesCount || 0) > 0 && (
                                  <span className="text-rose-400 font-bold">-{item.offlineDevicesCount}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {(item.durationMs / 1000).toFixed(1)}s
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.snapshotId ? (
                              <button
                                type="button"
                                onClick={() => onViewSnapshot?.(item.snapshotId!)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-800/40 transition"
                              >
                                <Camera className="w-3 h-3" />
                                <span>{lang === 'ko' ? '스냅샷 보기' : 'View'}</span>
                              </button>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              item.status === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40' :
                              item.status === 'aborted' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40' :
                              'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>
              {lang === 'ko' 
                ? '스케줄러 백그라운드 엔진 가동 중 (브라우저 또는 앱 실행 상태 유지)' 
                : 'Scheduler engine active in background while app is running'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {lang === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
