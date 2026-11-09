import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Shield, ShieldAlert, Activity, Monitor, ChevronDown, Check, Power, Bell, BellRing, RefreshCw } from 'lucide-react';

export interface TrayStatusIndicatorProps {
  intruderWatchMode: boolean;
  onToggleIntruderWatch: () => void;
  isScanning: boolean;
  onToggleScan?: () => void;
  intruderCount?: number;
  statusMessage?: string;
  lang: 'ko' | 'en';
  theme?: 'dark' | 'gray' | 'white' | 'beige';
  isWindowsDesktop?: boolean;
  onMinimizeToTray?: () => void;
  onOpenIntruderLog?: () => void;
  onExitApplication?: () => void;
  compact?: boolean;
  align?: 'left' | 'right' | 'auto';
}

export const TrayStatusIndicator: React.FC<TrayStatusIndicatorProps> = ({
  intruderWatchMode,
  onToggleIntruderWatch,
  isScanning,
  onToggleScan,
  intruderCount = 0,
  statusMessage,
  lang,
  theme = 'dark',
  isWindowsDesktop = true,
  onMinimizeToTray,
  onOpenIntruderLog,
  onExitApplication,
  compact = false,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasElectron, setHasElectron] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setHasElectron(true);
    }
  }, []);

  const calculateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 280;
      let left = rect.left;
      if (align === 'right' || left + menuWidth > window.innerWidth - 12) {
        left = Math.max(12, rect.right - menuWidth);
      }
      const topPos = rect.bottom + 6;
      const maxTop = window.innerHeight - 420;
      return {
        top: Math.max(12, Math.min(topPos, maxTop > 50 ? maxTop : topPos)),
        left: Math.max(12, left)
      };
    }
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      const coords = calculateCoords();
      if (coords) setMenuCoords(coords);

      const handleResizeOrScroll = () => {
        const updated = calculateCoords();
        if (updated) setMenuCoords(updated);
      };

      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, true);
      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll, true);
      };
    }
  }, [isOpen, align]);

  // Synchronize real-time status to Electron tray tooltips whenever props change
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.updateTrayStatus) {
      (window as any).electronAPI.updateTrayStatus({
        intruderWatch: intruderWatchMode,
        isScanning,
        intruderCount,
        statusMessage
      });
    }
  }, [intruderWatchMode, isScanning, intruderCount, statusMessage]);

  // Check if statusMessage indicates an active intruder threat or detection
  const hasThreatInStatus = Boolean(
    statusMessage && 
    (statusMessage.includes('낯선 기기') || statusMessage.includes('intruder') || statusMessage.includes('감지') || statusMessage.includes('Threat')) &&
    !statusMessage.includes('0대') && !statusMessage.includes('0 intruder') && !statusMessage.includes('Clear') && !statusMessage.includes('정상')
  );

  const hasActiveThreat = intruderCount > 0 || hasThreatInStatus;

  // Status computation for visual indicator (Pulsing green for idle watch, pulsing red for active threats)
  const getStatusConfig = () => {
    // 1. Active Threat Detected (Pulsing Red)
    if (hasActiveThreat) {
      return {
        bg: 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/20 animate-pulse',
        badgeBg: 'bg-rose-500 text-white',
        pulseBg: 'bg-rose-400',
        ringBg: 'bg-rose-500',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />,
        label: lang === 'ko' ? `🚨 낯선 기기 감지 (${intruderCount || 1})` : `🚨 Threats (${intruderCount || 1})`,
        statusText: lang === 'ko' ? '🚨 미확인 기기 접근 감지됨' : '🚨 Active Threat Detected'
      };
    }
    // 2. Grid Network Scan Active (Spinning Amber)
    if (isScanning) {
      return {
        bg: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10',
        badgeBg: 'bg-amber-500 text-zinc-950',
        pulseBg: 'bg-amber-400',
        ringBg: 'bg-amber-400',
        icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
        label: lang === 'ko' ? '⚡ 스캔 가동 중' : '⚡ Scan Active',
        statusText: lang === 'ko' ? '실시간 스캔 진행 중' : 'Scanning Network'
      };
    }
    // 3. 24/7 Intruder Watch Active - Idle / Clean (Pulsing Green)
    if (intruderWatchMode) {
      return {
        bg: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10',
        badgeBg: 'bg-emerald-500 text-zinc-950',
        pulseBg: 'bg-emerald-400',
        ringBg: 'bg-emerald-400',
        icon: <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />,
        label: lang === 'ko' ? '🚨 24/7 감시 활성' : '🚨 24/7 Watch Active',
        statusText: lang === 'ko' ? '🟢 24시간 무인 침입 감시 중 (정상)' : '🟢 24/7 Watch Active (Idle)'
      };
    }
    // 4. Standby / Watch Mode Disabled (Zinc / Gray)
    return {
      bg: 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 border-zinc-700/60',
      badgeBg: 'bg-zinc-600 text-zinc-200',
      pulseBg: 'bg-zinc-500',
      ringBg: 'bg-zinc-500',
      icon: <Bell className="w-3.5 h-3.5 text-zinc-400" />,
      label: lang === 'ko' ? '📌 트레이 대기' : '📌 Tray Standby',
      statusText: lang === 'ko' ? '백그라운드 감시 비활성' : 'Watch Mode Disabled'
    };
  };

  const config = getStatusConfig();

  // Helper to extract progress percentage if available in scan message
  const scanPercentMatch = statusMessage?.match(/(\d+)%/);
  const scanPercent = scanPercentMatch ? parseInt(scanPercentMatch[1], 10) : null;

  // Helper for Theme-aware Styling (Dark / Gray / White / Beige)
  const getThemeClasses = () => {
    switch (theme) {
      case 'white':
        return {
          menuBg: 'bg-white text-slate-900 border-slate-300 shadow-2xl',
          headerTitle: 'text-slate-900',
          headerSub: 'text-slate-500',
          headerIconBg: 'bg-slate-100 text-sky-600 border-slate-200',
          divider: 'border-slate-200',
          cardBg: 'bg-slate-50 border-slate-200 text-slate-800',
          bannerBg: 'bg-sky-50/90 border-sky-200 text-sky-950',
          bannerInner: 'bg-white p-2 rounded-md border border-sky-200 text-slate-800',
          subText: 'text-slate-500',
          tooltipBg: 'bg-white/95 text-slate-900 border-sky-400 shadow-2xl',
          tooltipArrow: 'border-b-white',
          toggleWatchInactive: 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200',
          toggleScanInactive: 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
        };
      case 'beige':
        return {
          menuBg: 'bg-[#fcf8f2] text-[#5c4a37] border-[#e6d0a7] shadow-2xl',
          headerTitle: 'text-[#5c4a37]',
          headerSub: 'text-[#8c7355]',
          headerIconBg: 'bg-[#f5ebd6] text-[#b8860b] border-[#e6d0a7]',
          divider: 'border-[#e6d0a7]',
          cardBg: 'bg-[#f5ebd6]/60 border-[#e6d0a7] text-[#5c4a37]',
          bannerBg: 'bg-[#f5ebd6] border-[#d8be91] text-[#5c4a37]',
          bannerInner: 'bg-[#fcf8f2] p-2 rounded-md border border-[#e6d0a7] text-[#5c4a37]',
          subText: 'text-[#8c7355]',
          tooltipBg: 'bg-[#fcf8f2]/95 text-[#5c4a37] border-[#d8be91] shadow-2xl',
          tooltipArrow: 'border-b-[#fcf8f2]',
          toggleWatchInactive: 'bg-[#f5ebd6] border-[#e6d0a7] text-[#5c4a37] hover:bg-[#ebd9b8]',
          toggleScanInactive: 'bg-[#f5ebd6] border-[#d8be91] text-[#7a5c37] hover:bg-[#ebd9b8]'
        };
      case 'gray':
        return {
          menuBg: 'bg-slate-900 text-slate-100 border-slate-700/80 shadow-2xl',
          headerTitle: 'text-slate-100',
          headerSub: 'text-slate-400',
          headerIconBg: 'bg-slate-800 text-sky-400 border-slate-700',
          divider: 'border-slate-800',
          cardBg: 'bg-slate-950/70 border-slate-800 text-slate-200',
          bannerBg: 'bg-sky-950/40 border-sky-500/30 text-sky-200',
          bannerInner: 'bg-slate-950/80 p-2 rounded-md border border-sky-500/20 text-slate-100',
          subText: 'text-slate-400',
          tooltipBg: 'bg-slate-950/95 text-slate-100 border-sky-500/40 shadow-2xl',
          tooltipArrow: 'border-b-slate-950',
          toggleWatchInactive: 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700',
          toggleScanInactive: 'bg-sky-950/40 border-sky-500/30 text-sky-300 hover:bg-sky-900/40'
        };
      case 'dark':
      default:
        return {
          menuBg: 'bg-zinc-900 text-zinc-100 border-zinc-700/80 shadow-2xl',
          headerTitle: 'text-zinc-100',
          headerSub: 'text-zinc-400',
          headerIconBg: 'bg-zinc-800 text-cyan-400 border-zinc-700',
          divider: 'border-zinc-800',
          cardBg: 'bg-zinc-950/60 border-zinc-800 text-zinc-200',
          bannerBg: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200',
          bannerInner: 'bg-zinc-950/60 p-2 rounded-md border border-cyan-500/20 text-zinc-100',
          subText: 'text-zinc-400',
          tooltipBg: 'bg-zinc-950/95 text-zinc-100 border-cyan-500/40 shadow-2xl',
          tooltipArrow: 'border-b-zinc-950',
          toggleWatchInactive: 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700',
          toggleScanInactive: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
        };
    }
  };

  const tm = getThemeClasses();

  return (
    <div 
      className="relative inline-block text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Status Indicator Badge */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          setIsHovered(false);
        }}
        className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] tracking-tight transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap shrink-0 ${config.bg}`}
        title={
          statusMessage
            ? `${statusMessage} • ${lang === 'ko' ? '클릭 시 트레이 메뉴' : 'Click for Tray Menu'}`
            : (lang === 'ko' ? '시스템 트레이 상태 및 24/7 침입 감시 제어' : 'System Tray Status & 24/7 Intruder Watch Control')
        }
      >
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          {(intruderWatchMode || isScanning || hasActiveThreat) && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ringBg}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseBg}`} />
        </span>
        {config.icon}
        {!compact && <span>{config.label}</span>}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Hover Tooltip: Displays Scan Progress or Intruder Timestamp on Badge Hover */}
      {isHovered && !isOpen && statusMessage && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-2.5 rounded-xl backdrop-blur-md border text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150 z-50 ${tm.tooltipBg}`}>
          <div className={`flex items-center justify-between pb-1.5 border-b text-[10px] uppercase font-black tracking-wider text-cyan-500 dark:text-cyan-400 ${tm.divider}`}>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>{lang === 'ko' ? '트레이 실시간 툴팁' : 'Live Tray Tooltip'}</span>
            </span>
            <span className={`text-[9px] font-normal ${tm.subText}`}>
              {lang === 'ko' ? '클릭 시 메뉴' : 'Click to open'}
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className={`font-semibold text-[11px] break-words ${tm.headerTitle}`}>
              {statusMessage}
            </div>

            {/* Mini Progress Bar in Hover Tooltip if scanning */}
            {isScanning && scanPercent !== null && (
              <div className="w-full bg-zinc-800/30 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, scanPercent))}%` }}
                />
              </div>
            )}
          </div>

          <div className={`mt-2 pt-1 border-t text-[9.5px] flex items-center justify-between ${tm.divider} ${tm.subText}`}>
            <span>
              {hasActiveThreat
                ? (lang === 'ko' ? '🚨 침입 위협 감지됨' : '🚨 Active Threat Detected')
                : isScanning
                ? (lang === 'ko' ? '⚡ 그리드 스캔 진행' : '⚡ Scanning Network')
                : (lang === 'ko' ? '🟢 24/7 무인 침입 감시 (정상)' : '🟢 24/7 Watch Active (Idle)')}
            </span>
            <span className="text-cyan-500 dark:text-cyan-400 font-mono text-[9px]">{hasElectron ? 'OS Tray Sync' : 'App Tray'}</span>
          </div>
          {/* Arrow pointing up towards the badge */}
          <div className={`absolute bottom-full ${align === 'right' ? 'right-4' : 'left-4'} mb-[-1px] border-4 border-transparent ${tm.tooltipArrow}`} />
        </div>
      )}

      {/* Popover Context Menu - Fixed Portal Overlay appended directly to document.body */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9990]" onClick={() => setIsOpen(false)} />
          <div 
            style={menuCoords ? { top: `${menuCoords.top}px`, left: `${menuCoords.left}px` } : { top: '60px', left: '16px' }}
            className={`fixed w-[280px] max-w-[calc(100vw-1.5rem)] rounded-xl border backdrop-blur-md z-[9999] p-3.5 space-y-3 animate-in zoom-in-95 duration-150 text-xs shadow-2xl ${tm.menuBg}`}
          >
            {/* Header Status Bar */}
            <div className={`flex items-center justify-between pb-2.5 border-b ${tm.divider}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${tm.headerIconBg}`}>
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className={`font-bold ${tm.headerTitle}`}>
                    {lang === 'ko' ? '시스템 트레이 상태' : 'System Tray Status'}
                  </div>
                  <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${tm.headerSub}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasElectron ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                    <span>{hasElectron ? (lang === 'ko' ? 'Electron 트레이 연동됨' : 'Electron Tray Connected') : (lang === 'ko' ? '트레이 에뮬레이터 가동' : 'Tray Engine Active')}</span>
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg}`}>
                {config.statusText}
              </span>
            </div>

            {/* Real-time Status / Tooltip Message Display in Tray Menu */}
            {statusMessage && (
              <div className={`p-2.5 rounded-lg border text-[11px] flex flex-col gap-1.5 shadow-sm ${tm.bannerBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-500 dark:text-cyan-400 font-bold text-[10px] uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0 animate-pulse" />
                    <span>
                      {isScanning
                        ? (lang === 'ko' ? '⚡ 실시간 스캔 진행률 툴팁' : '⚡ Current Scan Progress Tooltip')
                        : intruderCount > 0
                        ? (lang === 'ko' ? '🚨 낯선 기기 감시 알림 툴팁' : '🚨 Intruder Detection Alert Tooltip')
                        : (lang === 'ko' ? '💬 트레이 메뉴 실시간 툴팁' : '💬 Live Tray Menu Tooltip')}
                    </span>
                  </div>
                  {isScanning && scanPercent !== null && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40">
                      {scanPercent}%
                    </span>
                  )}
                </div>

                <div className={`font-semibold break-words text-[11.5px] ${tm.bannerInner}`}>
                  {statusMessage}
                </div>

                {/* Visual Progress Bar inside tray menu */}
                {isScanning && scanPercent !== null && (
                  <div className="w-full bg-zinc-800/20 rounded-full h-1.5 overflow-hidden mt-0.5">
                    <div 
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, scanPercent))}%` }}
                    />
                  </div>
                )}

                <div className={`text-[9.5px] flex items-center gap-1 mt-0.5 ${tm.subText}`}>
                  <Check className="w-3 h-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
                  <span>
                    {lang === 'ko'
                      ? 'Windows 작업표시줄 트레이 아이콘에 표시되는 동일한 툴팁입니다.'
                      : 'Synced directly with the Windows taskbar tray tooltip.'}
                  </span>
                </div>
              </div>
            )}

            {/* Status Summary Items */}
            <div className={`space-y-2 p-2.5 rounded-lg border text-[11px] ${tm.cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={tm.subText}>{lang === 'ko' ? '24/7 침입 감시' : '24/7 Watch'}:</span>
                <span className={`font-bold ${intruderWatchMode ? 'text-emerald-500 dark:text-emerald-400' : tm.subText}`}>
                  {intruderWatchMode ? (lang === 'ko' ? '🟢 활성화됨' : '🟢 Active') : (lang === 'ko' ? '⚪ 비활성화' : '⚪ Disabled')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={tm.subText}>{lang === 'ko' ? '그리드 스캔 상태' : 'Scan Engine'}:</span>
                <span className={`font-bold ${isScanning ? 'text-amber-500 dark:text-amber-400' : tm.headerTitle}`}>
                  {isScanning ? (lang === 'ko' ? '⚡ 탐색 중...' : '⚡ Scanning...') : (lang === 'ko' ? '💤 대기 (Idle)' : '💤 Idle')}
                </span>
              </div>
              {intruderCount > 0 && (
                <div className={`flex items-center justify-between text-rose-500 dark:text-rose-400 font-bold border-t pt-1.5 ${tm.divider}`}>
                  <span>{lang === 'ko' ? '감지된 미확인 기기' : 'Intruders Found'}:</span>
                  <span>{intruderCount} {lang === 'ko' ? '대' : 'devs'}</span>
                </div>
              )}
              {statusMessage && (
                <div className={`flex items-center justify-between text-cyan-500 dark:text-cyan-300 font-medium border-t pt-1.5 ${tm.divider}`}>
                  <span className={tm.subText}>
                    {isScanning
                      ? (lang === 'ko' ? '스캔 진척' : 'Scan Progress')
                      : (lang === 'ko' ? '최신 기록' : 'Latest Record')}:
                  </span>
                  <span className="truncate max-w-[150px] text-right font-mono text-[10.5px]">{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Quick Interactive Toggles directly from System Tray */}
            <div className={`space-y-2 pt-1 border-t ${tm.divider}`}>
              <div className={`text-[10px] uppercase font-black tracking-wider px-0.5 ${tm.subText}`}>
                {lang === 'ko' ? '⚡ 퀵 백그라운드 토글 제어' : '⚡ Quick Tray Toggles'}
              </div>

              {/* 1. Enable Intruder Watch Toggle Switch */}
              <button
                onClick={() => {
                  onToggleIntruderWatch();
                }}
                className={`w-full py-2.5 px-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                  intruderWatchMode
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                    : tm.toggleWatchInactive
                }`}
                title={lang === 'ko' ? '24/7 낯선 기기 무인 감시 모드 켜기/끄기' : 'Enable or Disable 24/7 Intruder Watch Mode'}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${intruderWatchMode ? 'text-emerald-500 dark:text-emerald-400' : tm.subText}`} />
                  <div>
                    <div className="text-[11.5px] font-bold">
                      {lang === 'ko' ? '🚨 24/7 침입 감시 (Enable Intruder Watch)' : '🚨 Enable 24/7 Intruder Watch'}
                    </div>
                    <div className={`text-[9.5px] font-normal ${tm.subText}`}>
                      {intruderWatchMode
                        ? (lang === 'ko' ? '무인 감시 알림 가동 중' : 'Automated Background Watch Active')
                        : (lang === 'ko' ? '클릭 시 무인 감시 활성화' : 'Click to enable automated watch')}
                    </div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${intruderWatchMode ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${intruderWatchMode ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </button>

              {/* 2. Toggle Scan Mode (Start / Stop Grid Scan) Switch */}
              {onToggleScan && (
                <button
                  onClick={() => {
                    onToggleScan();
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                    isScanning
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10'
                      : tm.toggleScanInactive
                  }`}
                  title={lang === 'ko' ? '그리드 스캔 시작 또는 중지' : 'Toggle Grid Scan Mode (Start / Stop)'}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'text-amber-500 dark:text-amber-400 animate-spin' : 'text-cyan-500 dark:text-cyan-400'}`} />
                    <div>
                      <div className="text-[11.5px] font-bold">
                        {isScanning
                          ? (lang === 'ko' ? '⏹️ 그리드 스캔 중지 (Stop Scan)' : '⏹️ Stop Grid Scan')
                          : (lang === 'ko' ? '⚡ 그리드 스캔 시작 (Toggle Scan Mode)' : '⚡ Toggle Scan Mode (Start Scan)')}
                      </div>
                      <div className={`text-[9.5px] font-normal ${tm.subText}`}>
                        {isScanning
                          ? (lang === 'ko' ? '클릭 시 현재 진행 중인 스캔 중단' : 'Click to abort current scan')
                          : (lang === 'ko' ? '클릭 시 네트워크 탐색 즉시 시작' : 'Click to initiate network discovery')}
                      </div>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${isScanning ? 'bg-amber-500' : 'bg-cyan-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${isScanning ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
              )}
            </div>

            {/* Show Intruder Log Button */}
            {onOpenIntruderLog && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenIntruderLog();
                }}
                className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'ko' ? '📜 낯선 기기 감시 로그 열기' : '📜 Show Intruder Log'}</span>
              </button>
            )}

            {/* Direct Minimize to Tray Action */}
            {onMinimizeToTray && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onMinimizeToTray();
                }}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ko' ? '📌 즉시 시스템 트레이로 최소화' : '📌 Minimize to Tray Now'}</span>
              </button>
            )}

            {/* Exit Application Action */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onExitApplication) {
                  onExitApplication();
                } else if (typeof window !== 'undefined' && (window as any).electronAPI?.exitApplication) {
                  (window as any).electronAPI.exitApplication();
                }
              }}
              className="w-full py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 active:scale-98 text-red-300 border border-red-500/30 font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              title={lang === 'ko' ? '백그라운드 서비스 및 앱 완전 종료' : 'Exit Application & Terminate Background Service'}
            >
              <Power className="w-3.5 h-3.5 text-red-400" />
              <span>{lang === 'ko' ? '🛑 애플리케이션 완전 종료 (Exit Application)' : '🛑 Exit Application'}</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
