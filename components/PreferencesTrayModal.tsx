import React, { useEffect, useState } from 'react';
import {
  Settings,
  X,
  Monitor,
  Shield,
  ShieldAlert,
  Power,
  Zap,
  Network,
  ShieldCheck,
  Key,
  Cpu,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Clock,
  Play,
  Pause,
  Trash2,
  Activity,
  Camera,
} from 'lucide-react';
import {
  clearTrayEventsLog,
  executeWindowsUtility,
  sendTrayTestNotification,
} from '../services/nativeModulesService';
import type {
  TrayAlertPolicy,
  TrayEventRecord,
  TrayRuntimeSnapshot,
  WindowsServiceRuntimeState,
} from '../types';

interface PreferencesTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  closeToTray: boolean;
  onToggleCloseToTray: (next: boolean) => void;
  isAutoStartEnabled: boolean;
  onSetAutoStartEnabled: (enabled: boolean) => void;
  isWindowsServiceInstalled: boolean;
  windowsServiceState: WindowsServiceRuntimeState;
  onSetWindowsServiceStatus: (installed: boolean, state: WindowsServiceRuntimeState) => void;
  intruderWatchMode: boolean;
  onToggleIntruderWatch: () => void;
  schedulerPaused: boolean;
  activeScheduleCount: number;
  onToggleSchedulerPaused: () => void;
  onRunScheduleNow: () => void;
  onOpenScheduler: () => void;
  onQuickBackgroundScan: () => void;
  trayRuntime: TrayRuntimeSnapshot | null;
  trayPolicy: TrayAlertPolicy;
  onUpdateTrayPolicy: (next: TrayAlertPolicy) => void;
  trayEvents: TrayEventRecord[];
  onRefreshTrayState: () => void;
  onClearTrayEventsLocal: () => void;
  onMinimizeToTray: () => void;
  onOpenIntruderLog: () => void;
  onExitApplication: () => void;
  onElevateAdmin: () => void;
  isElevating: boolean;
  onOpenNativeDiagnostics: () => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  panelClass: string;
  textMutedClass: string;
  showToast: (msg: string) => void;
  mobileNotchOffset?: number;
  onChangeMobileNotchOffset?: (px: number) => void;
}

export const PreferencesTrayModal: React.FC<PreferencesTrayModalProps> = ({
  isOpen,
  onClose,
  closeToTray,
  onToggleCloseToTray,
  isAutoStartEnabled,
  onSetAutoStartEnabled,
  isWindowsServiceInstalled,
  windowsServiceState,
  onSetWindowsServiceStatus,
  intruderWatchMode,
  onToggleIntruderWatch,
  schedulerPaused,
  activeScheduleCount,
  onToggleSchedulerPaused,
  onRunScheduleNow,
  onOpenScheduler,
  onQuickBackgroundScan,
  trayRuntime,
  trayPolicy,
  onUpdateTrayPolicy,
  trayEvents,
  onRefreshTrayState,
  onClearTrayEventsLocal,
  onMinimizeToTray,
  onOpenIntruderLog,
  onExitApplication,
  onElevateAdmin,
  isElevating,
  onOpenNativeDiagnostics,
  theme,
  lang,
  panelClass,
  textMutedClass,
  showToast,
  mobileNotchOffset = 0,
  onChangeMobileNotchOffset,
}) => {
  const [isLegacyToolsExpanded, setIsLegacyToolsExpanded] = useState(false);
  const [isTestingNotify, setIsTestingNotify] = useState(false);
  const [isUpdatingService, setIsUpdatingService] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBeige = theme === 'beige';
  const isWhite = theme === 'white';

  const dividerClass = isWhite
    ? 'border-slate-200'
    : isBeige
    ? 'border-[#e6d0a7]'
    : 'border-white/10';

  const subtleBtnClass = isWhite
    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
    : isBeige
    ? 'border-[#d4be9c] bg-[#fcf8f2] hover:bg-[#f0e2be] text-[#3d2711]'
    : 'border-white/15 hover:bg-white/10';

  const surfaceClass = isWhite
    ? 'bg-slate-50 border-slate-200 text-slate-900'
    : isBeige
    ? 'bg-[#f5ebd6]/55 border-[#e6d0a7] text-[#3d2711]'
    : 'bg-white/[0.03] border-white/10 text-zinc-100';

  const inputClass = isWhite
    ? 'bg-white border-slate-300 text-slate-900'
    : isBeige
    ? 'bg-[#fcf8f2] border-[#d4be9c] text-[#3d2711]'
    : 'bg-zinc-950 border-white/15 text-zinc-100';

  const currentMode = trayRuntime?.mode || (intruderWatchMode ? 'watching' : 'standby');
  const dndActive = Boolean(
    trayRuntime?.dndActive ||
      trayPolicy.dndEnabled ||
      (trayPolicy.dndUntilMs > 0 && trayPolicy.dndUntilMs > Date.now())
  );

  const modeSummary = (() => {
    switch (currentMode) {
      case 'alert':
        return {
          text: lang === 'ko' ? '침입·충돌 경고 활성' : 'Alert Active',
          color: 'text-rose-500',
        };
      case 'scanning':
        return {
          text:
            lang === 'ko'
              ? `백그라운드 스캔 중 (${trayRuntime?.scanProgressPercent ?? 0}%)`
              : `Scanning (${trayRuntime?.scanProgressPercent ?? 0}%)`,
          color: 'text-amber-500',
        };
      case 'watching':
        return {
          text: lang === 'ko' ? '24/7 무인 감시 가동 중' : '24/7 Watch Active',
          color: 'text-emerald-500',
        };
      default:
        return {
          text: lang === 'ko' ? '시스템 트레이 대기 중' : 'Tray Standby',
          color: isWhite || isBeige ? 'text-slate-600' : 'text-slate-400',
        };
    }
  })();

  const serviceStatusText = (() => {
    if (windowsServiceState === 'running') {
      return lang === 'ko' ? '실행 중 (Session 0)' : 'Running (Session 0)';
    }
    if (windowsServiceState === 'stopped' || isWindowsServiceInstalled) {
      return lang === 'ko' ? '설치됨 · 정지 상태' : 'Installed · Stopped';
    }
    return lang === 'ko' ? '미설치' : 'Not Installed';
  })();

  const handleTestNotification = async () => {
    setIsTestingNotify(true);
    try {
      const res = await sendTrayTestNotification({
        severity: 'warning',
        title: lang === 'ko' ? 'Grid IP Scanner2 트레이 알림 테스트' : 'Grid IP Scanner2 Tray Alert Test',
        message:
          lang === 'ko'
            ? '네이티브 시스템 트레이 풍선 알림 및 이벤트 기록이 정상 작동합니다.'
            : 'Native system tray balloon notification and event feed are active.',
      });
      if (res.success) {
        onRefreshTrayState();
        if (res.notified) {
          showToast(
            lang === 'ko'
              ? '🔔 Windows 트레이 테스트 알림을 전송했습니다.'
              : '🔔 Tray test notification dispatched.'
          );
        } else {
          showToast(
            lang === 'ko'
              ? '🔕 방해금지(DND) 적용 중: 알림은 무음 처리되고 이벤트 로그에만 기록되었습니다.'
              : '🔕 DND active: event logged silently without popup.'
          );
        }
      } else {
        showToast(
          lang === 'ko'
            ? '⚠️ Go 백엔드 트레이 엔진과 연결되지 않았습니다.'
            : '⚠️ Go tray engine is not reachable.'
        );
      }
    } finally {
      setIsTestingNotify(false);
    }
  };

  const toggleSnooze30m = () => {
    const isCurrentlySnoozed = trayPolicy.dndUntilMs > Date.now();
    onUpdateTrayPolicy({
      ...trayPolicy,
      dndEnabled: false,
      dndUntilMs: isCurrentlySnoozed ? 0 : Date.now() + 30 * 60 * 1000,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 mobile-notch-modal"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl ${
          isBeige
            ? 'bg-[#fcf8f2] text-[#5c4a37]'
            : isWhite
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-zinc-900 text-zinc-100'
        } rounded-2xl shadow-2xl border ${panelClass} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 shrink-0 ${dividerClass}`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-500 border border-cyan-500/30 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base tracking-tight truncate">
                {lang === 'ko' ? '시스템 트레이 · 서비스 · OS 알림 환경설정' : 'System Tray, Service & OS Alert Preferences'}
              </h3>
              <p className={`text-xs truncate ${textMutedClass}`}>
                {lang === 'ko'
                  ? 'Go 네이티브 트레이 배지, 무창 부팅(--tray), Windows 서비스 및 이벤트별 알림 제어'
                  : 'Go native tray badge, silent --tray boot, Windows service & event-driven OS alerts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${isWhite || isBeige ? 'hover:bg-black/10' : 'hover:bg-white/10'} opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs no-scrollbar">
          {onChangeMobileNotchOffset && (
            <section className={`md:hidden p-3.5 rounded-xl border space-y-2 ${surfaceClass}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-xs">
                    {lang === 'ko' ? '모바일 상단 카메라 홀 여백' : 'Mobile Top Camera Notch Margin'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400">{mobileNotchOffset}px</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 16, 28, 40].map((pxVal) => (
                  <button
                    key={pxVal}
                    type="button"
                    onClick={() => onChangeMobileNotchOffset(pxVal)}
                    className={`py-1.5 rounded-lg font-black text-[11px] border transition-all cursor-pointer ${
                      mobileNotchOffset === pxVal
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-xs'
                        : subtleBtnClass
                    }`}
                  >
                    {pxVal}px
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 1. Native Tray & Service Telemetry + Quick Actions */}
          <section className={`p-4 rounded-xl border space-y-3.5 ${surfaceClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="font-bold text-sm">
                  {lang === 'ko' ? '네이티브 트레이 & 백그라운드 상주' : 'Native Tray & Background Daemon'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                <span className={`font-bold ${modeSummary.color}`}>{modeSummary.text}</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className={textMutedClass}>
                  {lang === 'ko' ? '서비스:' : 'Service:'} {serviceStatusText}
                </span>
              </div>
            </div>

            {trayRuntime && (
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums py-2 border-y ${dividerClass}`}>
                <span>
                  {lang === 'ko' ? '대상:' : 'Subnet:'}{' '}
                  <strong>{trayRuntime.subnet || '192.168.0'}.0/24</strong>
                </span>
                <span>
                  {lang === 'ko' ? '활성:' : 'Active:'}{' '}
                  <strong>{trayRuntime.activeDeviceCount}</strong>
                </span>
                <span className={trayRuntime.intruderCount > 0 ? 'text-rose-500 font-bold' : ''}>
                  {lang === 'ko' ? '미확인:' : 'Intruders:'}{' '}
                  <strong>{trayRuntime.intruderCount}</strong>
                </span>
                <span className={trayRuntime.conflictCount > 0 ? 'text-amber-500 font-bold' : ''}>
                  {lang === 'ko' ? '충돌:' : 'Conflicts:'}{' '}
                  <strong>{trayRuntime.conflictCount}</strong>
                </span>
                {trayRuntime.lastScanAtMs ? (
                  <span className={textMutedClass}>
                    {lang === 'ko' ? '최근 스캔:' : 'Last:'}{' '}
                    {new Date(trayRuntime.lastScanAtMs).toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
            )}

            {/* Quick Action Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={onMinimizeToTray}
                className={`py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 ${isWhite || isBeige ? 'text-cyan-700' : 'text-cyan-300'} font-bold border border-cyan-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap`}
              >
                <Monitor className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ko' ? '트레이로 최소화' : 'Minimize Tray'}</span>
              </button>
              <button
                type="button"
                onClick={onQuickBackgroundScan}
                className={`py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 ${isWhite || isBeige ? 'text-emerald-700' : 'text-emerald-300'} font-bold border border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ko' ? '즉시 스캔' : 'Quick Scan'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenIntruderLog}
                className={`py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 ${isWhite || isBeige ? 'text-rose-700' : 'text-rose-300'} font-bold border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap`}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ko' ? '침입 로그' : 'Intruder Log'}</span>
              </button>
              <button
                type="button"
                onClick={onExitApplication}
                className={`py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 ${isWhite || isBeige ? 'text-red-700' : 'text-red-300'} font-bold border border-red-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap`}
              >
                <Power className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ko' ? '완전 종료' : 'Exit App'}</span>
              </button>
            </div>

            {/* Close to Tray Toggle */}
            <div className={`flex items-center justify-between pt-2.5 border-t ${dividerClass}`}>
              <div className="pr-3">
                <div className="font-bold">
                  {lang === 'ko' ? '창 닫기 시 트레이 최소화' : 'Close to System Tray'}
                </div>
                <div className={`text-[11px] ${textMutedClass}`}>
                  {lang === 'ko'
                    ? '메인 창을 닫아도 Go 백그라운드 감시와 스케줄러를 트레이에서 계속 가동합니다.'
                    : 'Keep Go background watch and scheduler running in tray when closing the window.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleCloseToTray(!closeToTray)}
                className={`w-10 h-5 rounded-full transition-all relative shrink-0 cursor-pointer ${
                  closeToTray ? 'bg-cyan-500' : isWhite || isBeige ? 'bg-slate-300' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    closeToTray ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Silent --tray Boot Autostart */}
            <div className={`flex items-center justify-between pt-2.5 border-t ${dividerClass}`}>
              <div className="pr-3">
                <div className="font-bold">
                  {lang === 'ko' ? 'Windows 부팅 시 창 없이 트레이로 조용히 시작 (--tray)' : 'Silent Boot to Tray on Windows Startup (--tray)'}
                </div>
                <div className={`text-[11px] ${textMutedClass}`}>
                  {lang === 'ko'
                    ? '로그인 시 창을 띄우지 않고 트레이 아이콘과 백그라운드 감시만 실행합니다 (HKCU\\Run).'
                    : 'Starts silently in system tray without opening the main browser window at login.'}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !isAutoStartEnabled;
                  const res = await executeWindowsUtility('autostart', next);
                  if (res.success && res.enabled !== undefined) {
                    onSetAutoStartEnabled(res.enabled);
                    onRefreshTrayState();
                  }
                  showToast(res.message);
                }}
                className={`w-10 h-5 rounded-full transition-all relative shrink-0 cursor-pointer ${
                  isAutoStartEnabled ? 'bg-emerald-500' : isWhite || isBeige ? 'bg-slate-300' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    isAutoStartEnabled ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 24/7 Background Service (Windows SCM) */}
            <div className={`flex items-center justify-between pt-2.5 border-t gap-3 ${dividerClass}`}>
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className={`w-3.5 h-3.5 ${windowsServiceState === 'running' ? 'text-cyan-500' : 'opacity-60'}`} />
                  <span>
                    {lang === 'ko' ? '24/7 Windows 백그라운드 서비스 (GridIPScannerService)' : '24/7 Windows Background Service'}
                  </span>
                </div>
                <div className={`text-[11px] ${textMutedClass}`}>
                  {lang === 'ko'
                    ? 'Windows SCM 네이티브 핸들러(--service)를 통해 로그아웃 상태에서도 Session 0 무인 감시를 유지합니다.'
                    : 'Native Windows SCM handler (--service) maintains Session 0 monitoring even when logged out.'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={isUpdatingService}
                  onClick={async () => {
                    setIsUpdatingService(true);
                    try {
                      const action = windowsServiceState === 'running' ? 'service-stop' : 'service-install';
                      const res = await executeWindowsUtility(action);
                      if (res.serviceState) {
                        onSetWindowsServiceStatus(Boolean(res.installed), res.serviceState);
                      } else if (res.installed !== undefined) {
                        onSetWindowsServiceStatus(res.installed, res.running ? 'running' : res.installed ? 'stopped' : 'not_installed');
                      }
                      onRefreshTrayState();
                      showToast(res.message || res.error || '');
                    } finally {
                      setIsUpdatingService(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer border whitespace-nowrap disabled:opacity-50 ${
                    windowsServiceState === 'running'
                      ? `bg-cyan-500/20 ${isWhite || isBeige ? 'text-cyan-700' : 'text-cyan-300'} border-cyan-500/40 hover:bg-cyan-500/30`
                      : subtleBtnClass
                  }`}
                >
                  {windowsServiceState === 'running'
                    ? lang === 'ko'
                      ? '실행 중 (중지)'
                      : 'Running (Stop)'
                    : windowsServiceState === 'stopped' || isWindowsServiceInstalled
                    ? lang === 'ko'
                      ? '정지됨 (시작)'
                      : 'Stopped (Start)'
                    : lang === 'ko'
                    ? '서비스 등록/시작'
                    : 'Register & Start'}
                </button>
              </div>
            </div>

            {/* 24/7 Intruder Watch Toggle */}
            <div className={`flex items-center justify-between pt-2.5 border-t ${dividerClass}`}>
              <div className="pr-3">
                <div className="font-bold">
                  {lang === 'ko' ? '24/7 낯선 기기 무인 감시 모드' : '24/7 Intruder Watch Mode'}
                </div>
                <div className={`text-[11px] ${textMutedClass}`}>
                  {lang === 'ko'
                    ? '창이 닫혀도 Go 백엔드가 주기적으로 서브넷을 점검해 이상 발생 시 OS 알림을 발송합니다.'
                    : 'Autonomous Go daemon periodically sweeps subnet and fires OS alerts on anomalies.'}
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleIntruderWatch}
                className={`w-10 h-5 rounded-full transition-all relative shrink-0 cursor-pointer ${
                  intruderWatchMode ? 'bg-rose-500' : isWhite || isBeige ? 'bg-slate-300' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    intruderWatchMode ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* 2. Tray Scheduler Control & Event-Driven OS Notification Policy */}
          <section className={`p-4 rounded-xl border space-y-3.5 ${surfaceClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-bold text-sm">
                  {lang === 'ko' ? '트레이 스케줄러 제어 & 이벤트 기반 OS 알림' : 'Tray Scheduler & Event-Based OS Notifications'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isTestingNotify}
                className="px-2.5 py-1 rounded-lg border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-500 font-bold text-[11px] cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {lang === 'ko' ? 'OS 알림 테스트' : 'Test OS Alert'}
              </button>
            </div>

            {/* Scheduler Quick Control Strip */}
            <div className={`flex flex-wrap items-center justify-between gap-2 py-2.5 border-y ${dividerClass}`}>
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-2">
                  <span>{lang === 'ko' ? '예약 스케줄러 실행 상태' : 'Recurring Scheduler State'}</span>
                  <span className={`font-mono tabular-nums text-[11px] ${schedulerPaused ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {schedulerPaused
                      ? lang === 'ko'
                        ? `일시정지 (${activeScheduleCount}개 대기)`
                        : `Paused (${activeScheduleCount})`
                      : lang === 'ko'
                      ? `활성 (${activeScheduleCount}개)`
                      : `Active (${activeScheduleCount})`}
                  </span>
                </div>
                <div className={`text-[11px] ${textMutedClass}`}>
                  {trayRuntime?.nextScheduleName && trayRuntime.nextScheduleAtMs
                    ? `${lang === 'ko' ? '다음 실행:' : 'Next:'} ${trayRuntime.nextScheduleName} (${new Date(trayRuntime.nextScheduleAtMs).toLocaleTimeString()})`
                    : lang === 'ko'
                    ? '트레이 우클릭 메뉴에서도 스케줄러 일시정지 및 즉시 실행이 가능합니다.'
                    : 'Also controllable directly from the Windows tray right-click menu.'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleSchedulerPaused}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    schedulerPaused
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500 hover:bg-emerald-500/25'
                      : 'bg-amber-500/15 border-amber-500/35 text-amber-500 hover:bg-amber-500/25'
                  }`}
                >
                  {schedulerPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{schedulerPaused ? (lang === 'ko' ? '재개' : 'Resume') : (lang === 'ko' ? '일시정지' : 'Pause')}</span>
                </button>
                <button
                  type="button"
                  onClick={onRunScheduleNow}
                  className="px-2.5 py-1.5 rounded-lg border border-sky-500/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  {lang === 'ko' ? '즉시 실행' : 'Run Now'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScheduler();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold text-[11px] cursor-pointer whitespace-nowrap ${subtleBtnClass}`}
                >
                  {lang === 'ko' ? '스케줄 관리' : 'Manage'}
                </button>
              </div>
            </div>

            {/* Event-Based Notification Rules */}
            <div className="space-y-2.5">
              <div className="font-bold text-[11.5px]">
                {lang === 'ko' ? '이벤트 기반 OS 알림 트리거' : 'Event-Based OS Alert Triggers'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer ${dividerClass}`}>
                  <span className="font-semibold">
                    {lang === 'ko' ? '신규 침입 기기' : 'New Intruder'}
                  </span>
                  <input
                    type="checkbox"
                    checked={trayPolicy.notifyOnIntruder}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, notifyOnIntruder: e.target.checked })}
                    className="accent-rose-500 cursor-pointer"
                  />
                </label>
                <label className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer ${dividerClass}`}>
                  <span className="font-semibold">
                    {lang === 'ko' ? 'IP/MAC 충돌' : 'IP/MAC Conflict'}
                  </span>
                  <input
                    type="checkbox"
                    checked={trayPolicy.notifyOnIpConflict}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, notifyOnIpConflict: e.target.checked })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </label>
                <label className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer ${dividerClass}`}>
                  <span className="font-semibold">
                    {lang === 'ko' ? '대량 오프라인' : 'Mass Offline'}
                  </span>
                  <input
                    type="checkbox"
                    checked={trayPolicy.notifyOnMassOffline}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, notifyOnMassOffline: e.target.checked })}
                    className="accent-cyan-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Thresholds & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-mono tabular-nums">
                <div>
                  <label className={`block text-[10.5px] mb-1 ${textMutedClass}`}>
                    {lang === 'ko' ? '오프라인 최소 감축(대)' : 'Offline Min Devices'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={250}
                    value={trayPolicy.massOfflineMinCount}
                    onChange={(e) =>
                      onUpdateTrayPolicy({
                        ...trayPolicy,
                        massOfflineMinCount: Math.max(1, Number(e.target.value) || 3),
                      })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10.5px] mb-1 ${textMutedClass}`}>
                    {lang === 'ko' ? '오프라인 급감 비율(%)' : 'Offline Drop (%)'}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={trayPolicy.massOfflineDropPercent}
                    onChange={(e) =>
                      onUpdateTrayPolicy({
                        ...trayPolicy,
                        massOfflineDropPercent: Math.min(100, Math.max(5, Number(e.target.value) || 30)),
                      })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10.5px] mb-1 ${textMutedClass}`}>
                    {lang === 'ko' ? '중복 알림 쿨다운' : 'Dedup Cooldown'}
                  </label>
                  <select
                    value={trayPolicy.dedupCooldownMinutes}
                    onChange={(e) =>
                      onUpdateTrayPolicy({
                        ...trayPolicy,
                        dedupCooldownMinutes: Number(e.target.value) || 5,
                      })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${inputClass}`}
                  >
                    <option value={1}>{lang === 'ko' ? '1분 (민감)' : '1 min'}</option>
                    <option value={5}>{lang === 'ko' ? '5분 (권장)' : '5 min (Rec)'}</option>
                    <option value={15}>{lang === 'ko' ? '15분' : '15 min'}</option>
                    <option value={30}>{lang === 'ko' ? '30분' : '30 min'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Do-Not-Disturb & Quiet Hours */}
            <div className={`pt-2.5 border-t space-y-2.5 ${dividerClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {dndActive ? (
                    <BellOff className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="font-bold">
                    {lang === 'ko' ? '방해금지(DND) 및 야간 무음 시간대' : 'Do Not Disturb (DND) & Quiet Hours'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSnooze30m}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                      trayPolicy.dndUntilMs > Date.now()
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                        : subtleBtnClass
                    }`}
                  >
                    {trayPolicy.dndUntilMs > Date.now()
                      ? lang === 'ko'
                        ? '30분 무음 해제'
                        : 'Cancel 30m DND'
                      : lang === 'ko'
                      ? '30분 무음'
                      : '30m Snooze'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTrayPolicy({
                        ...trayPolicy,
                        dndEnabled: !trayPolicy.dndEnabled,
                        dndUntilMs: 0,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                      trayPolicy.dndEnabled
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                        : subtleBtnClass
                    }`}
                  >
                    {trayPolicy.dndEnabled
                      ? lang === 'ko'
                        ? '상시 DND ON'
                        : 'DND ON'
                      : lang === 'ko'
                      ? '상시 DND OFF'
                      : 'DND OFF'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trayPolicy.quietHoursEnabled}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, quietHoursEnabled: e.target.checked })}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span>{lang === 'ko' ? '예약 야간 방해금지 시간대 사용' : 'Enable Scheduled Quiet Hours'}</span>
                </label>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <input
                    type="time"
                    value={trayPolicy.quietStart}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, quietStart: e.target.value })}
                    className={`px-2 py-1 rounded border text-[11px] ${inputClass}`}
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={trayPolicy.quietEnd}
                    onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, quietEnd: e.target.value })}
                    className={`px-2 py-1 rounded border text-[11px] ${inputClass}`}
                  />
                </div>
              </div>

              <label className={`flex items-center justify-between pt-1 cursor-pointer text-[11px] ${textMutedClass}`}>
                <span>
                  {lang === 'ko'
                    ? '부팅 시 트레이 조용한 시작(--tray) 풍선 알림 생략'
                    : 'Suppress startup balloon when launched via --tray'}
                </span>
                <input
                  type="checkbox"
                  checked={trayPolicy.silentBoot}
                  onChange={(e) => onUpdateTrayPolicy({ ...trayPolicy, silentBoot: e.target.checked })}
                  className="accent-cyan-500 cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* 3. Recent Background Tray Events Feed */}
          <section className={`p-4 rounded-xl border space-y-2.5 ${surfaceClass}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>{lang === 'ko' ? '백그라운드 트레이 감지 이벤트 기록' : 'Background Tray Event Feed'}</span>
                <span className={`font-mono tabular-nums text-[11px] ${textMutedClass}`}>
                  ({trayEvents.length})
                </span>
              </div>
              {trayEvents.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await clearTrayEventsLog();
                    onClearTrayEventsLocal();
                  }}
                  className={`text-[11px] font-bold ${isWhite || isBeige ? 'text-rose-600 hover:text-rose-700' : 'text-rose-400 hover:text-rose-300'} flex items-center gap-1 cursor-pointer`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{lang === 'ko' ? '기록 비우기' : 'Clear'}</span>
                </button>
              )}
            </div>

            {trayEvents.length === 0 ? (
              <div className={`py-4 text-center text-[11px] border-t ${dividerClass} ${textMutedClass}`}>
                {lang === 'ko'
                  ? '아직 기록된 트레이 이벤트가 없습니다. 상단 [OS 알림 테스트]를 누르거나 감시를 시작해 보세요.'
                  : 'No background tray events recorded yet. Click [Test OS Alert] or enable watch mode.'}
              </div>
            ) : (
              <div className={`divide-y max-h-44 overflow-y-auto pr-1 ${dividerClass}`}>
                {trayEvents.slice(0, 15).map((ev) => {
                  const sevClass =
                    ev.severity === 'critical'
                      ? 'text-rose-500'
                      : ev.severity === 'warning'
                      ? 'text-amber-500'
                      : 'text-emerald-500';
                  return (
                    <div key={ev.id} className="py-2 flex items-start justify-between gap-3 text-[11px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-bold">
                          <span className={sevClass}>{ev.title}</span>
                          {!ev.notified && ev.suppressedBy && (
                            <span className={`font-mono text-[10px] ${textMutedClass}`}>
                              · {ev.suppressedBy === 'dnd' ? 'DND 무음' : ev.suppressedBy === 'cooldown' ? '중복 억제' : '규칙 비활성'}
                            </span>
                          )}
                        </div>
                        <div className={`mt-0.5 break-words ${textMutedClass}`}>{ev.message}</div>
                      </div>
                      <span className={`font-mono tabular-nums text-[10px] shrink-0 ${textMutedClass}`}>
                        {new Date(ev.timestampMs).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Collapsible Section: Legacy Windows Utilities & Native Kernel Diagnostics */}
          <div className={`rounded-xl border overflow-hidden ${surfaceClass}`}>
            <button
              type="button"
              onClick={() => setIsLegacyToolsExpanded((prev) => !prev)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left ${isWhite || isBeige ? 'hover:bg-black/5' : 'hover:bg-white/5'} transition-colors cursor-pointer`}
              aria-expanded={isLegacyToolsExpanded}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-bold text-xs">
                    {lang === 'ko'
                      ? '고급 Windows 네트워크 유틸리티 & 커널 진단'
                      : 'Advanced Windows Network Utilities & Kernel Diagnostics'}
                  </div>
                  <div className={`text-[10.5px] ${textMutedClass}`}>
                    {lang === 'ko'
                      ? 'DNS 캐시 초기화, ncpa.cpl, 방화벽 규칙 복원, UAC 승격, C/Win32 진단'
                      : 'Flush DNS, ncpa.cpl, firewall rules, UAC relaunch, C/Win32 diagnostics'}
                  </div>
                </div>
              </div>
              {isLegacyToolsExpanded ? (
                <ChevronUp className="w-4 h-4 opacity-70 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 opacity-70 shrink-0" />
              )}
            </button>

            {isLegacyToolsExpanded && (
              <div className={`p-4 pt-2 space-y-3 border-t animate-in fade-in duration-150 ${dividerClass}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className={`p-3 rounded-lg border space-y-2 flex flex-col justify-between ${dividerClass}`}>
                    <div>
                      <div className="font-bold text-amber-500 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? 'DNS 캐시 초기화' : 'Flush DNS Cache'}</span>
                      </div>
                      <p className={`text-[10.5px] mt-1 ${textMutedClass}`}>
                        <code>ipconfig /flushdns</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await executeWindowsUtility('flushdns');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-bold border border-amber-500/30 transition-all cursor-pointer text-xs"
                    >
                      {lang === 'ko' ? 'DNS 캐시 초기화 실행' : 'Run Flush DNS'}
                    </button>
                  </div>

                  <div className={`p-3 rounded-lg border space-y-2 flex flex-col justify-between ${dividerClass}`}>
                    <div>
                      <div className="font-bold text-sky-500 flex items-center gap-1">
                        <Network className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '어댑터 제어판' : 'Adapter Panel'}</span>
                      </div>
                      <p className={`text-[10.5px] mt-1 ${textMutedClass}`}>
                        <code>control ncpa.cpl</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await executeWindowsUtility('ncpa.cpl');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-500 font-bold border border-sky-500/30 transition-all cursor-pointer text-xs"
                    >
                      {lang === 'ko' ? 'ncpa.cpl 제어판 열기' : 'Open ncpa.cpl'}
                    </button>
                  </div>

                  <div className={`p-3 rounded-lg border space-y-2 flex flex-col justify-between ${dividerClass}`}>
                    <div>
                      <div className="font-bold text-emerald-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '방화벽 규칙 복원' : 'Reset Firewall Rules'}</span>
                      </div>
                      <p className={`text-[10.5px] mt-1 ${textMutedClass}`}>
                        <code>netsh advfirewall</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await executeWindowsUtility('firewall');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold border border-emerald-500/30 transition-all cursor-pointer text-xs"
                    >
                      {lang === 'ko' ? '방화벽 예외 재등록' : 'Restore Firewall'}
                    </button>
                  </div>

                  <div className={`p-3 rounded-lg border space-y-2 flex flex-col justify-between ${dividerClass}`}>
                    <div>
                      <div className="font-bold text-purple-400 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '관리자 권한 재시작' : 'Relaunch as Admin'}</span>
                      </div>
                      <p className={`text-[10.5px] mt-1 ${textMutedClass}`}>
                        {lang === 'ko' ? 'RAW 소켓 / SendARP 권한 승격' : 'UAC elevation for L2 probes'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onElevateAdmin}
                      disabled={isElevating}
                      className="w-full py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold border border-purple-500/30 transition-all cursor-pointer disabled:opacity-50 text-xs"
                    >
                      {lang === 'ko' ? 'UAC 승인 재시작' : 'Relaunch UAC'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenNativeDiagnostics}
                  className="w-full py-2 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'ko' ? 'C/Win32 네이티브 가속 엔진 진단 콘솔 열기' : 'Open C/Win32 Engine Diagnostics'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex items-center justify-end shrink-0 ${dividerClass}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            {lang === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
