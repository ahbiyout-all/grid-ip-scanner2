
import React from 'react';
import { Monitor, Smartphone, Server, Laptop, Camera, Zap, Printer, Tablet, HelpCircle, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import { IPStatus, DeviceInfo, DiffStatus } from '../types';

interface IPCellProps {
  ip: string;
  status: IPStatus;
  device?: DeviceInfo;
  onClick: (ip: string) => void;
  onDoubleClick?: (ip: string, device?: DeviceInfo) => void;
  isSelected: boolean;
  isHost?: boolean;
  theme: 'beige' | 'dark' | 'gray';
  s: any;
  index: number;
  diffStatus?: DiffStatus;
  isConflict?: boolean;
  conflictDetails?: string;
  isNewIntruder?: boolean;
  isSoftTrust?: boolean;
  customNickname?: string;
  baselineDevice?: DeviceInfo;
  diffFilter?: 'all' | 'new' | 'offline' | 'changed' | 'same';
  isDiffMode?: boolean;
  baselineColor?: 'sky' | 'indigo' | 'teal' | 'slate';
}

const IPCell: React.FC<IPCellProps> = ({ 
  ip, 
  status, 
  device, 
  onClick, 
  onDoubleClick,
  isSelected, 
  isHost, 
  theme, 
  s, 
  index, 
  diffStatus,
  isConflict,
  conflictDetails,
  isNewIntruder,
  isSoftTrust,
  customNickname,
  baselineDevice,
  diffFilter,
  isDiffMode,
  baselineColor = 'sky'
}) => {
  const lastOctet = ip.split('.').pop();
  
  // Calculate grid position (0-15 for both col and row) based on visual array index
  const col = index % 16;
  const row = Math.floor(index / 16);
  
  const isTopHalf = row < 8;
  const isLeftEdge = col < 4;
  const isRightEdge = col > 11;
  
  const displayDevice = device || baselineDevice;
  const isFilteredOut = Boolean(diffFilter && diffFilter !== 'all' && diffFilter !== diffStatus);

  const getStatusBase = () => {
    const isDark = theme !== 'beige';
    
    // In Diff Mode, highlight diff anomalies with unmistakable, high-contrast color differences
    if (diffStatus) {
      if (diffStatus === 'new') {
        return isSelected
          ? (isDark 
              ? 'bg-emerald-500 border-emerald-200 text-white shadow-[0_0_24px_rgba(16,185,129,0.95)] z-20 ring-2 ring-emerald-300'
              : 'bg-emerald-600 border-emerald-800 text-white shadow-[0_0_20px_rgba(16,185,129,0.85)] z-20 ring-2 ring-emerald-500')
          : (isDark
              ? 'bg-emerald-500/35 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.55)] ring-1 ring-emerald-400/80 animate-pulse hover:bg-emerald-500/50 hover:shadow-[0_0_18px_rgba(16,185,129,0.85)]'
              : 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-[0_0_9px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/70 hover:bg-emerald-200');
      }
      if (diffStatus === 'offline') {
        return isSelected
          ? (isDark 
              ? 'bg-rose-600 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.95)] z-20 ring-2 ring-rose-300'
              : 'bg-rose-600 border-rose-800 text-white shadow-[0_0_20px_rgba(244,63,94,0.85)] z-20 ring-2 ring-rose-500')
          : (isDark
              ? 'bg-rose-600/35 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.55)] ring-1 ring-rose-400/80 hover:bg-rose-600/50 hover:shadow-[0_0_18px_rgba(244,63,94,0.85)]'
              : 'bg-rose-100 border-rose-600 text-rose-950 shadow-[0_0_9px_rgba(244,63,94,0.4)] ring-1 ring-rose-500/70 hover:bg-rose-200');
      }
      if (diffStatus === 'changed') {
        return isSelected
          ? (isDark 
              ? 'bg-amber-500 border-amber-200 text-black shadow-[0_0_24px_rgba(245,158,11,0.95)] z-20 ring-2 ring-amber-300'
              : 'bg-amber-500 border-amber-800 text-black shadow-[0_0_20px_rgba(245,158,11,0.85)] z-20 ring-2 ring-amber-500')
          : (isDark
              ? 'bg-amber-500/35 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.55)] ring-1 ring-amber-400/80 animate-pulse hover:bg-amber-500/50 hover:shadow-[0_0_18px_rgba(245,158,11,0.85)]'
              : 'bg-amber-100 border-amber-600 text-amber-950 shadow-[0_0_9px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/70 hover:bg-amber-200');
      }
      if (diffStatus === 'same') {
        const bColor = baselineColor || 'sky';
        if (bColor === 'sky') {
          return isSelected
            ? (isDark 
                ? 'bg-sky-500 border-sky-100 text-black shadow-[0_0_24px_rgba(14,165,233,0.95)] z-20 ring-2 ring-sky-300 font-black'
                : 'bg-sky-600 border-sky-800 text-white shadow-[0_0_20px_rgba(14,165,233,0.85)] z-20 ring-2 ring-sky-500')
            : (isDark 
                ? 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-[0_0_12px_rgba(14,165,233,0.4)] ring-1 ring-sky-400/70 hover:bg-sky-500/40 hover:shadow-[0_0_18px_rgba(14,165,233,0.7)]' 
                : 'bg-sky-100 border-sky-500 text-sky-950 shadow-[0_0_8px_rgba(14,165,233,0.3)] ring-1 ring-sky-400/60 hover:bg-sky-200');
        }
        if (bColor === 'indigo') {
          return isSelected
            ? (isDark 
                ? 'bg-indigo-500 border-indigo-100 text-white shadow-[0_0_24px_rgba(99,102,241,0.95)] z-20 ring-2 ring-indigo-300 font-black'
                : 'bg-indigo-600 border-indigo-800 text-white shadow-[0_0_20px_rgba(99,102,241,0.85)] z-20 ring-2 ring-indigo-500')
            : (isDark 
                ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/70 hover:bg-indigo-500/45 hover:shadow-[0_0_18px_rgba(99,102,241,0.7)]' 
                : 'bg-indigo-100 border-indigo-500 text-indigo-950 shadow-[0_0_8px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/60 hover:bg-indigo-200');
        }
        if (bColor === 'teal') {
          return isSelected
            ? (isDark 
                ? 'bg-teal-500 border-teal-100 text-black shadow-[0_0_24px_rgba(20,184,166,0.95)] z-20 ring-2 ring-teal-300 font-black'
                : 'bg-teal-600 border-teal-800 text-white shadow-[0_0_20px_rgba(20,184,166,0.85)] z-20 ring-2 ring-teal-500')
            : (isDark 
                ? 'bg-teal-500/25 border-teal-400 text-teal-100 shadow-[0_0_12px_rgba(20,184,166,0.4)] ring-1 ring-teal-400/70 hover:bg-teal-500/40 hover:shadow-[0_0_18px_rgba(20,184,166,0.7)]' 
                : 'bg-teal-100 border-teal-500 text-teal-950 shadow-[0_0_8px_rgba(20,184,166,0.3)] ring-1 ring-teal-400/60 hover:bg-teal-200');
        }
        // slate (distinct metallic steel slate, sharp contrast from empty cells)
        return isSelected
          ? (isDark 
              ? 'bg-slate-500 border-slate-200 text-white shadow-[0_0_20px_rgba(148,163,184,0.9)] z-20 ring-2 ring-slate-300 font-black'
              : 'bg-slate-600 border-slate-800 text-white shadow-[0_0_15px_rgba(100,116,139,0.7)] z-20 ring-2 ring-slate-400 font-black')
          : (isDark 
              ? 'bg-slate-700/60 border-slate-400 text-slate-100 shadow-[0_0_10px_rgba(148,163,184,0.35)] ring-1 ring-slate-400/70 hover:bg-slate-700/80' 
              : 'bg-slate-200 border-slate-500 text-slate-900 shadow-[0_0_8px_rgba(100,116,139,0.25)] ring-1 ring-slate-400/60 hover:bg-slate-300');
      }
    }

    if (isDiffMode) {
      // In Diff mode, empty/inactive nodes recede into the background
      return isDark 
        ? 'bg-zinc-950/25 border-zinc-800/20 opacity-20 hover:opacity-60' 
        : 'bg-[#f7efe3]/30 border-[#e8dacb]/30 opacity-25 hover:opacity-60';
    }

    switch (status) {
      case 'active': 
        return isSelected 
          ? 'bg-sky-500 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.5)] z-20' 
          : isDark 
            ? 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30'
            : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
      case 'scanning': 
        return isDark 
          ? 'bg-amber-500/40 border-amber-500/60 animate-[pulse_0.8s_infinite] shadow-[0_0_12px_rgba(245,158,11,0.4)] z-10'
          : 'bg-amber-100 border-amber-500 animate-[pulse_0.8s_infinite]';
      case 'inactive': 
        return isDark 
          ? 'bg-slate-900/40 border-slate-700/30 opacity-70 hover:opacity-100'
          : 'bg-slate-200/60 border-slate-300 opacity-80 hover:opacity-100';
      default: 
        return isDark 
          ? 'bg-zinc-800/60 border-zinc-700/50'
          : 'bg-slate-200 border-slate-300';
    }
  };

  const getTextColor = () => {
    if (isSelected) return 'text-white font-black';

    // In Diff Mode, give distinct, high-contrast text colors matching the diff status
    if (diffStatus) {
      if (diffStatus === 'new') {
        return theme === 'beige' ? 'text-emerald-950 font-black' : 'text-emerald-200 font-black';
      }
      if (diffStatus === 'offline') {
        return theme === 'beige' ? 'text-rose-950 font-black' : 'text-rose-200 font-black';
      }
      if (diffStatus === 'changed') {
        return theme === 'beige' ? 'text-amber-950 font-black' : 'text-amber-200 font-black';
      }
      if (diffStatus === 'same') {
        const bColor = baselineColor || 'sky';
        if (bColor === 'sky') return theme === 'beige' ? 'text-sky-950 font-black' : 'text-sky-300 font-black';
        if (bColor === 'indigo') return theme === 'beige' ? 'text-indigo-950 font-black' : 'text-indigo-300 font-black';
        if (bColor === 'teal') return theme === 'beige' ? 'text-teal-950 font-black' : 'text-teal-300 font-black';
        return theme === 'beige' ? 'text-[#3d2711] font-black' : 'text-slate-100 font-black';
      }
    }

    if (status === 'active') return theme === 'beige' ? 'text-emerald-800 font-black' : 'text-emerald-300 font-black';
    if (status === 'scanning') return 'text-amber-300 font-black';
    if (theme === 'beige') return 'text-[#3b2a1a] font-bold';
    if (theme === 'dark') return 'text-zinc-200 font-bold';
    return 'text-slate-100 font-bold';
  };

  const getDeviceIcon = () => {
    if (!displayDevice) return null;
    const hostname = (displayDevice.hostname || '').toLowerCase();
    const vendor = (displayDevice.vendor || '').toLowerCase();
    const iconClass = "w-3 h-3 md:w-4 md:h-4 opacity-80";
    
    // 포트 기반 또는 명칭 기반 아이콘 결정
    if (hostname.includes('printer') || vendor.includes('printer') || vendor.includes('epson') || vendor.includes('canon') || vendor.includes('brother')) return <Printer className={iconClass} />;
    if (hostname.includes('ipad') || hostname.includes('tablet')) return <Tablet className={iconClass} />;
    if (hostname.includes('iphone') || hostname.includes('phone') || hostname.includes('mobile') || vendor.includes('samsung') || vendor.includes('apple')) return <Smartphone className={iconClass} />;
    if (hostname.includes('laptop') || hostname.includes('computer') || vendor.includes('dell') || vendor.includes('intel')) return <Laptop className={iconClass} />;
    if (hostname.includes('server') || (displayDevice.openPorts?.includes(22) && displayDevice.openPorts?.length > 0)) return <Server className={iconClass} />;
    
    return <Monitor className={iconClass} />;
  };

  const getTooltipTheme = () => {
    switch(theme) {
      case 'beige': return 'bg-[#f5ebd6] border-[#e6d0a7] text-[#5c4a37] shadow-2xl';
      case 'dark': return 'bg-neutral-900 border-neutral-700 text-neutral-100 shadow-2xl';
      default: return 'bg-zinc-800 border-zinc-700 text-zinc-50 shadow-2xl';
    }
  };

  const showTooltip = Boolean((status === 'active' || (status === 'scanning' && device) || (diffStatus && displayDevice)) && displayDevice);

  return (
    <div
      onClick={() => onClick(ip)}
      onDoubleClick={() => onDoubleClick && onDoubleClick(ip, displayDevice)}
      className={`
        relative aspect-square cursor-pointer transition-all duration-150 border-[0.5px]
        flex items-center justify-center group
        ${getStatusBase()}
        ${isSelected ? 'scale-110 rounded-md border-[2px]' : 'rounded-[2px] hover:z-50 hover:scale-125'}
        ${isHost ? 'ring-2 ring-sky-400 ring-offset-1 z-10' : ''}
        ${isFilteredOut ? 'opacity-20 grayscale scale-95' : ''}
      `}
    >
      {isHost && (
        <>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border border-white z-20 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          <span className="absolute bottom-0.5 right-0.5 text-[6px] font-black text-sky-500 opacity-80 select-none">YOU</span>
        </>
      )}

      {/* Diff Status Indicator Badges with Striking Distinct Colors */}
      {diffStatus === 'new' && (
        <>
          <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 bg-emerald-500 text-white rounded text-[7px] font-black tracking-tighter shadow-[0_0_12px_rgba(16,185,129,0.9)] z-20 animate-bounce flex items-center gap-0.5 border border-white/60 ring-2 ring-emerald-300/60">
            <span className="text-[6px]">✚</span>{s.lang === 'ko' ? '신규' : 'NEW'}
          </span>
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping z-20" />
        </>
      )}
      {diffStatus === 'offline' && (
        <>
          <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 bg-rose-600 text-white rounded text-[7px] font-black tracking-tighter shadow-[0_0_8px_rgba(244,63,94,0.8)] z-20 flex items-center gap-0.5 border border-white/60">
            <span className="text-[6px]">━</span>{s.lang === 'ko' ? '이탈' : 'OFF'}
          </span>
          {/* Diagonal indicator slash for disconnected nodes */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <div className="w-full h-[1.5px] bg-rose-500 rotate-45 transform" />
          </div>
        </>
      )}
      {diffStatus === 'changed' && (
        <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 bg-amber-500 text-black rounded text-[7px] font-black tracking-tighter shadow-[0_0_10px_rgba(245,158,11,0.9)] z-20 animate-pulse flex items-center gap-0.5 border border-black/40">
          <span className="text-[6px]">▲</span>{s.lang === 'ko' ? '변동' : 'CHG'}
        </span>
      )}
      {diffStatus === 'same' && (() => {
        const bColor = baselineColor || 'sky';
        const badgeClasses = {
          sky: 'bg-sky-500 text-black border-sky-200 shadow-[0_0_8px_rgba(14,165,233,0.7)]',
          indigo: 'bg-indigo-600 text-white border-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.7)]',
          teal: 'bg-teal-500 text-black border-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.7)]',
          slate: 'bg-slate-600 text-white border-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
        }[bColor];

        return (
          <>
            <span className={`absolute -top-1.5 -left-1.5 px-1 py-0.2 rounded text-[7px] font-black tracking-tighter z-20 flex items-center gap-0.5 border ${badgeClasses}`}>
              <span className="text-[6px]">=</span>{s.lang === 'ko' ? '기준' : 'BASE'}
            </span>
            <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full z-20 ${
              bColor === 'sky' ? 'bg-sky-400' :
              bColor === 'indigo' ? 'bg-indigo-400' :
              bColor === 'teal' ? 'bg-teal-400' : 'bg-slate-400'
            }`} />
          </>
        );
      })()}

      {/* IP Conflict Warning Badge */}
      {isConflict && (
        <span 
          title={conflictDetails || "IP 충돌 의심"}
          className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-rose-600 text-white rounded-full text-[8px] font-black tracking-tighter shadow-[0_0_10px_rgba(244,63,94,0.9)] z-30 animate-pulse border border-white"
        >
          ⚠️
        </span>
      )}

      {/* New Intruder / Unknown Device Badge (Normal scan mode) */}
      {isNewIntruder && !diffStatus && (
        <span 
          title="새로 감지된 낯선 기기"
          className="absolute -top-1 -left-1 px-1 py-0.2 bg-purple-600 text-white rounded text-[7px] font-black tracking-tighter shadow-[0_0_8px_rgba(168,85,247,0.8)] z-20 animate-bounce"
        >
          🚨NEW
        </span>
      )}

      {/* Soft Trust Grace Period Badge */}
      {isSoftTrust && !isNewIntruder && !diffStatus && (
        <span 
          title="식별자 변동 유예 중인 소프트 신뢰 기기"
          className="absolute -top-1 -left-1 px-1 py-0.2 bg-amber-500 text-black rounded text-[7px] font-black tracking-tighter shadow-[0_0_8px_rgba(245,158,11,0.8)] z-20"
        >
          🛡️SOFT
        </span>
      )}

      {/* Custom Nickname indicator dot */}
      {customNickname && (
        <div 
          title={`별칭: ${customNickname}`}
          className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-black/40 z-20 shadow-sm"
        />
      )}

      {/* 장비 아이콘 (활성 장비 또는 스냅샷 오프라인 장비일 경우 표시) */}
      {(status === 'active' || (status === 'scanning' && device) || (diffStatus === 'offline' && baselineDevice)) && (
        <>
          <div className={`absolute top-1 left-1 pointer-events-none ${diffStatus === 'offline' ? 'opacity-30 text-rose-400' : 'opacity-40'}`}>
             {getDeviceIcon()}
          </div>
          {status === 'active' && !diffStatus && <div className="absolute inset-0 bg-emerald-500/5 animate-[pulse_3s_infinite] pointer-events-none rounded-inherit" />}
        </>
      )}

      <span className={`
        text-[11px] md:text-[13px] font-black mono tracking-tight leading-none select-none z-10
        ${getTextColor()}
        drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
      `}>
        {lastOctet}
      </span>

      {/* 툴팁 (Hover) - 활성 장비 및 스냅샷 비교 상태 노드 모두 상세 툴팁 지원 */}
      {showTooltip && displayDevice && (
        <div className={`
          pointer-events-none absolute 
          ${isLeftEdge ? 'left-0' : isRightEdge ? 'right-0' : 'left-1/2 -translate-x-1/2'}
          ${isTopHalf ? 'top-full mt-3' : 'bottom-full mb-3'}
          hidden group-hover:flex flex-col w-52 p-3 rounded-xl border z-[100]
          transition-all duration-300 opacity-0 group-hover:opacity-100
          ${getTooltipTheme()}
        `}>
          <div className="text-[11px] font-black border-b border-current border-opacity-10 pb-2 mb-2 flex justify-between items-center">
            <span className="truncate">{ip}</span>
            <div className={`w-2.5 h-2.5 rounded-full ${
              diffStatus === 'new' ? 'bg-emerald-500 animate-pulse' :
              diffStatus === 'offline' ? 'bg-rose-500' :
              diffStatus === 'changed' ? 'bg-amber-500 animate-ping' :
              isConflict ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'
            }`} />
          </div>
          
          <div className="space-y-2">
            {/* Diff Comparison Color Header Banner */}
            {diffStatus && (
              <div className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center justify-between border ${
                diffStatus === 'new' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                diffStatus === 'offline' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                diffStatus === 'changed' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-slate-500/20 text-slate-300 border-slate-500/40'
              }`}>
                <span>
                  {diffStatus === 'new' && '🟢 스냅샷 비교: +신규 노드'}
                  {diffStatus === 'offline' && '🔴 스냅샷 비교: -연결 끊김'}
                  {diffStatus === 'changed' && '🟠 스냅샷 비교: !식별자 변동'}
                  {diffStatus === 'same' && '⚪ 스냅샷 비교: =상태 일치'}
                </span>
                <span className="text-[8px] uppercase opacity-80">
                  {diffStatus === 'offline' ? 'Offline' : diffStatus.toUpperCase()}
                </span>
              </div>
            )}

            {customNickname && (
              <div className="flex flex-col bg-amber-500/15 p-1 rounded border border-amber-500/30">
                <span className="text-[8px] uppercase font-black text-amber-500 tracking-wider">🏷️ 사용자 지정 별칭</span>
                <span className="text-[10px] font-black truncate text-amber-400 mt-0.5">{customNickname}</span>
              </div>
            )}

            {isConflict && (
              <div className="flex flex-col bg-rose-500/20 p-1 rounded border border-rose-500/40">
                <span className="text-[8px] uppercase font-black text-rose-400 tracking-wider">⚠️ IP 충돌 주의</span>
                <span className="text-[9px] font-bold text-rose-300 leading-tight mt-0.5">{conflictDetails || "동일 IP 다중 응답 감지"}</span>
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">
                {diffStatus === 'offline' ? '이전 기준 식별명' : s.networkIdentity}
              </span>
              <div className="text-[10px] font-black flex items-center gap-2 mt-0.5">
                <span className={`truncate ${diffStatus === 'offline' ? 'text-rose-400 line-through opacity-80' : 'text-sky-500'}`}>
                  {displayDevice.hostname || s.deviceTypes.generic}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">
                {diffStatus === 'offline' ? '이전 제조사 및 MAC' : s.macInfo}
              </span>
              <span className="text-[9px] font-bold truncate">{displayDevice.vendor || 'Unknown'}</span>
              {displayDevice.mac && (
                <span className="text-[8px] font-mono opacity-60 truncate">{displayDevice.mac}</span>
              )}
            </div>

            {displayDevice.openPorts && displayDevice.openPorts.length > 0 && (
              <div className="flex flex-col pt-1 border-t border-current border-opacity-5">
                <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">{s.listeningPorts}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                   {displayDevice.openPorts.map(p => (
                     <span key={p} className="text-[8px] font-bold bg-current bg-opacity-10 px-1 rounded">{p}</span>
                   ))}
                </div>
              </div>
            )}
          </div>

          {/* Tooltip Arrow */}
          <div className={`
            absolute w-0 h-0 
            ${isLeftEdge ? 'left-4' : isRightEdge ? 'right-4' : 'left-1/2 -translate-x-1/2'}
            ${isTopHalf ? 'bottom-full border-b-[6px]' : 'top-full border-t-[6px]'}
            border-l-[6px] border-l-transparent 
            border-r-[6px] border-r-transparent 
            ${isTopHalf 
              ? (theme === 'beige' ? 'border-b-[#f5ebd6]' : theme === 'dark' ? 'border-b-neutral-900' : 'border-b-zinc-800')
              : (theme === 'beige' ? 'border-t-[#f5ebd6]' : theme === 'dark' ? 'border-t-neutral-900' : 'border-t-zinc-800')
            }
          `} />
        </div>
      )}
    </div>
  );
};

export default React.memo(IPCell);
