import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, 
  X, 
  Search, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Filter, 
  Clock, 
  Activity, 
  Shield, 
  Monitor, 
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { IntruderLogRecord } from '../types';
import { 
  getIntruderLogs, 
  updateIntruderLogStatus, 
  clearIntruderLogs, 
  exportIntruderLogsCSV 
} from '../services/intruderLogService';
import { copyTextToClipboard } from '../services/clipboard';

interface IntruderLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ko' | 'en';
  theme?: string;
  onTrustDevice?: (macOrIp: string) => void;
}

export const IntruderLogModal: React.FC<IntruderLogModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme = 'dark',
  onTrustDevice
}) => {
  const [logs, setLogs] = useState<IntruderLogRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'investigating' | 'trusted' | 'blocked'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Reload logs whenever modal opens and listen for Escape
  useEffect(() => {
    if (isOpen) {
      setLogs(getIntruderLogs());
      setConfirmClear(false);
    } else {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    }
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const refreshLogs = () => {
    setLogs(getIntruderLogs());
  };

  const handleCopy = async (ip: string) => {
    const ok = await copyTextToClipboard(ip);
    if (ok) {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopiedIp(ip);
      copyTimerRef.current = setTimeout(() => {
        setCopiedIp(null);
        copyTimerRef.current = null;
      }, 2000);
    }
  };

  const handleStatusChange = (id: string, newStatus: IntruderLogRecord['status']) => {
    updateIntruderLogStatus(id, newStatus);
    refreshLogs();
  };

  const handleTrust = (log: IntruderLogRecord) => {
    handleStatusChange(log.id, 'trusted');
    if (onTrustDevice) {
      if (log.mac && log.mac !== '-') {
        onTrustDevice(log.mac);
      } else {
        onTrustDevice(log.ip);
      }
    }
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setConfirmClear(true);
      clearTimerRef.current = setTimeout(() => {
        setConfirmClear(false);
        clearTimerRef.current = null;
      }, 4000);
      return;
    }
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    clearIntruderLogs();
    setLogs([]);
    setConfirmClear(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        log.ip.toLowerCase().includes(term) ||
        (log.mac && log.mac.toLowerCase().includes(term)) ||
        (log.vendor && log.vendor.toLowerCase().includes(term)) ||
        (log.hostname && log.hostname.toLowerCase().includes(term)) ||
        (log.notes && log.notes.toLowerCase().includes(term))
      );
    });
  }, [logs, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = logs.length;
    const newCount = logs.filter(l => l.status === 'new').length;
    const trustedCount = logs.filter(l => l.status === 'trusted').length;
    const blockedCount = logs.filter(l => l.status === 'blocked').length;
    const latest = logs[0]?.dateStr || '-';
    return { total, newCount, trustedCount, blockedCount, latest };
  }, [logs]);

  if (!isOpen) return null;

  const isDark = theme !== 'white' && theme !== 'beige';
  const dividerCol = theme === 'beige' ? 'border-[#d4be9c]' : theme === 'white' ? 'border-slate-200' : 'border-zinc-700/60';
  const cardSurface = theme === 'beige' ? 'bg-[#f4e8d2] border-[#d4be9c]' : theme === 'white' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/40 border-zinc-800';
  const mutedText = theme === 'beige' ? 'text-[#6c543c]' : theme === 'white' ? 'text-slate-500' : 'text-zinc-400';
  const primaryText = theme === 'beige' ? 'text-[#2c1d0e]' : theme === 'white' ? 'text-slate-900' : 'text-zinc-100';
  const secondaryText = theme === 'beige' ? 'text-[#4f3a25]' : theme === 'white' ? 'text-slate-700' : 'text-zinc-300';
  const toolbarSurface = theme === 'beige' ? 'bg-[#f1e4cc] border-[#d4be9c]' : theme === 'white' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950/60 border-zinc-800';

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${
          theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37] border-[#d4be9c]' :
          theme === 'white' ? 'bg-white text-slate-900 border-slate-200' :
          'bg-zinc-900 text-zinc-100 border-zinc-700/80'
        } animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${dividerCol} shrink-0`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-lg tracking-tight ${primaryText}`}>
                  {lang === 'ko' ? '24/7 낯선 기기 감시 로그 기록' : '24/7 Intruder Detection History'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 font-bold font-mono ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                  {stats.total} {lang === 'ko' ? '건 기록됨' : 'Logged'}
                </span>
              </div>
              <p className={`text-xs ${mutedText} mt-0.5`}>
                {lang === 'ko'
                  ? '무인 백그라운드 서비스 및 트레이 에이전트가 24시간 실시간 감지한 미확인 침입 기기 이력'
                  : 'Full history of unknown device intrusions captured by 24/7 background service & tray agent'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-100' : 'hover:bg-black/5 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b ${dividerCol} shrink-0 text-xs`}>
          <div className={`p-3 rounded-xl border flex items-center justify-between ${cardSurface}`}>
            <div>
              <div className={`text-[10px] uppercase font-bold ${mutedText}`}>{lang === 'ko' ? '총 감지 기록' : 'Total Logs'}</div>
              <div className={`text-lg font-black ${primaryText}`}>{stats.total}</div>
            </div>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-rose-950/30 border-rose-500/30' : 'bg-rose-50 border-rose-200'
          }`}>
            <div>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{lang === 'ko' ? '신규 미조치' : 'New Unresolved'}</div>
              <div className={`text-lg font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{stats.newCount}</div>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{lang === 'ko' ? '신뢰 승인됨' : 'Trusted'}</div>
              <div className={`text-lg font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.trustedCount}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`p-3 rounded-xl border flex items-center justify-between ${cardSurface}`}>
            <div>
              <div className={`text-[10px] uppercase font-bold ${mutedText}`}>{lang === 'ko' ? '최근 감지 시각' : 'Latest Event'}</div>
              <div className={`text-xs font-bold truncate max-w-[110px] ${isDark ? 'text-cyan-300' : 'text-sky-700'}`} title={stats.latest}>
                {stats.latest}
              </div>
            </div>
            <Clock className="w-4 h-4 text-cyan-500" />
          </div>
        </div>

        {/* Filter and Action Toolbar */}
        <div className={`p-4 border-b ${dividerCol} flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs`}>
          {/* Status Tabs */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${toolbarSurface}`}>
            {(['all', 'new', 'trusted', 'blocked'] as const).map(tab => {
              const label = tab === 'all'
                ? (lang === 'ko' ? '전체' : 'All')
                : tab === 'new'
                ? (lang === 'ko' ? '🚨 신규' : '🚨 New')
                : tab === 'trusted'
                ? (lang === 'ko' ? '🛡️ 신뢰' : '🛡️ Trusted')
                : (lang === 'ko' ? '⛔ 차단' : '⛔ Blocked');
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative min-w-[160px] sm:min-w-[220px]">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={lang === 'ko' ? 'IP, MAC, 제조사 검색...' : 'Search IP, MAC, Vendor...'}
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-rose-500/50 ${
                  theme === 'beige'
                    ? 'bg-white border-[#c8ae95] text-[#2c1d0e] placeholder-[#8f7458]'
                    : theme === 'white'
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                }`}
              />
            </div>

            <button
              onClick={() => exportIntruderLogsCSV(filteredLogs)}
              disabled={filteredLogs.length === 0}
              className={`px-2.5 py-1.5 rounded-lg disabled:opacity-40 border font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
              }`}
              title={lang === 'ko' ? 'CSV 스프레드시트로 내보내기' : 'Export to CSV'}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'ko' ? 'CSV 내보내기' : 'Export'}</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={logs.length === 0}
              className={`px-2.5 py-1.5 rounded-lg disabled:opacity-40 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border ${
                confirmClear
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 animate-pulse'
                  : isDark
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
              }`}
              title={lang === 'ko' ? '전체 로그 비우기' : 'Clear All Logs'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className={confirmClear ? 'inline' : 'hidden sm:inline'}>
                {confirmClear
                  ? (lang === 'ko' ? '확인: 삭제' : 'Confirm Clear')
                  : (lang === 'ko' ? '기록 비우기' : 'Clear')}
              </span>
            </button>
          </div>
        </div>

        {/* Log List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <Shield className="w-6 h-6" />
              </div>
              <div className={`font-bold text-sm ${primaryText}`}>
                {lang === 'ko' ? '감지된 침입/낯선 기기가 없습니다' : 'No Intrusions Detected'}
              </div>
              <p className={`${mutedText} text-xs max-w-md mx-auto`}>
                {lang === 'ko'
                  ? '24/7 Windows 백그라운드 서비스 및 트레이 에이전트가 로컬 서브넷을 정상적으로 무인 감시 중입니다.'
                  : 'The 24/7 background service is actively monitoring the network. All active devices match your trusted baseline.'}
              </p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isNew = log.status === 'new';
              const isTrusted = log.status === 'trusted';
              const isBlocked = log.status === 'blocked';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isNew
                      ? isDark ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/50' : 'bg-rose-50/90 border-rose-300 shadow-xs'
                      : isTrusted
                      ? isDark ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-300'
                      : isBlocked
                      ? isDark ? 'bg-red-950/30 border-red-500/50' : 'bg-red-50 border-red-300'
                      : cardSurface
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Device Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight flex items-center gap-1 border ${
                          isNew
                            ? isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-100 text-rose-800 border-rose-300'
                            : isTrusted
                            ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isBlocked
                            ? isDark ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-red-100 text-red-800 border-red-300'
                            : isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {isNew ? '🚨 신규 미확인' : isTrusted ? '🛡️ 신뢰 등록됨' : isBlocked ? '⛔ 차단 조치' : '🔍 조사 중'}
                        </span>

                        {/* IP Address */}
                        <span className={`font-mono font-black text-sm ${primaryText} flex items-center gap-1`}>
                          <span>{log.ip}</span>
                          <button
                            onClick={() => handleCopy(log.ip)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200' : 'hover:bg-black/5 text-slate-500 hover:text-slate-900'
                            }`}
                            title={lang === 'ko' ? 'IP 복사' : 'Copy IP'}
                          >
                            {copiedIp === log.ip ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>

                        {/* Detection Source Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-sky-100 text-sky-800 border-sky-300'
                        }`}>
                          {log.detectedBy === 'background_service'
                            ? (lang === 'ko' ? '24/7 서비스 감지' : 'Service Auto')
                            : log.detectedBy === 'tray_agent'
                            ? (lang === 'ko' ? '트레이 에이전트' : 'Tray Agent')
                            : (lang === 'ko' ? '수동 스캔' : 'Manual')}
                        </span>

                        {/* Timestamp */}
                        <span className={`text-[11px] ${mutedText} flex items-center gap-1 font-mono`}>
                          <Clock className="w-3 h-3 opacity-75" />
                          <span>{log.dateStr}</span>
                        </span>
                      </div>

                      {/* Hardware / Vendor & Ports Info */}
                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${mutedText} text-[11.5px]`}>
                        <div>
                          <span className="opacity-75 font-medium">MAC: </span>
                          <span className={`font-mono ${secondaryText}`}>{log.mac || '-'}</span>
                        </div>
                        <div>
                          <span className="opacity-75 font-medium">{lang === 'ko' ? '제조사' : 'Vendor'}: </span>
                          <span className={`font-bold ${primaryText}`}>{log.vendor || '-'}</span>
                        </div>
                        {log.hostname && log.hostname !== '-' && (
                          <div>
                            <span className="opacity-75 font-medium">{lang === 'ko' ? '호스트' : 'Host'}: </span>
                            <span className={secondaryText}>{log.hostname}</span>
                          </div>
                        )}
                        {log.openPorts && log.openPorts.length > 0 && (
                          <div>
                            <span className="opacity-75 font-medium">{lang === 'ko' ? '포트' : 'Ports'}: </span>
                            <span className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-700 font-bold'}`}>{log.openPorts.slice(0, 5).join(', ')}{log.openPorts.length > 5 ? ` +${log.openPorts.length - 5}` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Resolution Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {!isTrusted && (
                        <button
                          onClick={() => handleTrust(log)}
                          className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isDark
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                          }`}
                          title={lang === 'ko' ? '신뢰할 수 있는 기기로 등록' : 'Trust this device'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{lang === 'ko' ? '신뢰 기기 등록' : 'Trust'}</span>
                        </button>
                      )}

                      {!isBlocked && (
                        <button
                          onClick={() => handleStatusChange(log.id, 'blocked')}
                          className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isDark
                              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30'
                              : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300'
                          }`}
                          title={lang === 'ko' ? '차단/경고 상태로 표기' : 'Mark as blocked'}
                        >
                          <span>{lang === 'ko' ? '차단' : 'Block'}</span>
                        </button>
                      )}

                      {isTrusted && (
                        <button
                          onClick={() => handleStatusChange(log.id, 'new')}
                          className={`px-2 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title={lang === 'ko' ? '신규 상태로 되돌리기' : 'Revert to new'}
                        >
                          <RefreshCw className="w-3 h-3 opacity-80" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${dividerCol} flex items-center justify-between shrink-0 text-xs`}>
          <div className={`text-[11px] ${mutedText} flex items-center gap-1.5`}>
            <Monitor className="w-3.5 h-3.5 text-cyan-500" />
            <span>{lang === 'ko' ? '24/7 서비스와 트레이 에이전트 간 실시간 동기화됨' : 'Synchronized with 24/7 Background Service & Tray Agent'}</span>
          </div>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            {lang === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
