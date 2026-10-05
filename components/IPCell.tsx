
import React from 'react';
import { Monitor, Smartphone, Server, Laptop, Camera, Zap, Printer, Tablet, HelpCircle, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import { IPStatus, DeviceInfo, DiffStatus } from '../types';

interface IPCellProps {
  ip: string;
  status: IPStatus;
  device?: DeviceInfo;
  onClick: (ip: string) => void;
  isSelected: boolean;
  isHost?: boolean;
  theme: 'beige' | 'dark' | 'gray';
  s: any;
  index: number;
  diffStatus?: DiffStatus;
}

const IPCell: React.FC<IPCellProps> = ({ ip, status, device, onClick, isSelected, isHost, theme, s, index, diffStatus }) => {
  const lastOctet = ip.split('.').pop();
  
  // Calculate grid position (0-15 for both col and row) based on visual array index
  const col = index % 16;
  const row = Math.floor(index / 16);
  
  const isTopHalf = row < 8;
  const isLeftEdge = col < 4;
  const isRightEdge = col > 11;
  
  const getStatusBase = () => {
    const isDark = theme !== 'beige';
    
    // In Diff Mode, highlight diff anomalies
    if (diffStatus) {
      if (diffStatus === 'new') {
        return isSelected
          ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.7)] z-20 ring-2 ring-emerald-400'
          : 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse';
      }
      if (diffStatus === 'offline') {
        return isSelected
          ? 'bg-rose-600/80 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.7)] z-20'
          : 'bg-rose-500/20 border-rose-500/40 opacity-70';
      }
      if (diffStatus === 'changed') {
        return isSelected
          ? 'bg-amber-500 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)] z-20'
          : 'bg-amber-500/30 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
      }
      if (diffStatus === 'same') {
        return isDark ? 'bg-zinc-900/40 border-zinc-800/40 opacity-40' : 'bg-slate-100/60 border-slate-200/50 opacity-40';
      }
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
    if (status === 'active') return theme === 'beige' ? 'text-emerald-800 font-black' : 'text-emerald-300 font-black';
    if (status === 'scanning') return 'text-amber-300 font-black';
    if (theme === 'beige') return 'text-[#3b2a1a] font-bold';
    if (theme === 'dark') return 'text-zinc-200 font-bold';
    return 'text-slate-100 font-bold';
  };

  const getDeviceIcon = () => {
    if (!device) return null;
    const hostname = (device.hostname || '').toLowerCase();
    const vendor = (device.vendor || '').toLowerCase();
    const iconClass = "w-3 h-3 md:w-4 md:h-4 opacity-80";
    
    // 포트 기반 또는 명칭 기반 아이콘 결정
    if (hostname.includes('printer') || vendor.includes('printer') || vendor.includes('epson') || vendor.includes('canon') || vendor.includes('brother')) return <Printer className={iconClass} />;
    if (hostname.includes('ipad') || hostname.includes('tablet')) return <Tablet className={iconClass} />;
    if (hostname.includes('iphone') || hostname.includes('phone') || hostname.includes('mobile') || vendor.includes('samsung') || vendor.includes('apple')) return <Smartphone className={iconClass} />;
    if (hostname.includes('laptop') || hostname.includes('computer') || vendor.includes('dell') || vendor.includes('intel')) return <Laptop className={iconClass} />;
    if (hostname.includes('server') || (device.openPorts?.includes(22) && device.openPorts?.length > 0)) return <Server className={iconClass} />;
    
    return <Monitor className={iconClass} />;
  };

  const getTooltipTheme = () => {
    switch(theme) {
      case 'beige': return 'bg-[#f5ebd6] border-[#e6d0a7] text-[#5c4a37] shadow-2xl';
      case 'dark': return 'bg-neutral-900 border-neutral-700 text-neutral-100 shadow-2xl';
      default: return 'bg-zinc-800 border-zinc-700 text-zinc-50 shadow-2xl';
    }
  };

  return (
    <div
      onClick={() => onClick(ip)}
      className={`
        relative aspect-square cursor-pointer transition-all duration-150 border-[0.5px]
        flex items-center justify-center group
        ${getStatusBase()}
        ${isSelected ? 'scale-110 rounded-md border-[2px]' : 'rounded-[2px] hover:z-50 hover:scale-125'}
        ${isHost ? 'ring-2 ring-sky-400 ring-offset-1 z-10' : ''}
      `}
    >
      {isHost && (
        <>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border border-white z-20 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          <span className="absolute bottom-0.5 right-0.5 text-[6px] font-black text-sky-500 opacity-80 select-none">YOU</span>
        </>
      )}

      {/* Diff Status Indicator Badge */}
      {diffStatus === 'new' && (
        <span className="absolute -top-1 -left-1 px-1 py-0.2 bg-emerald-500 text-white rounded text-[7px] font-black tracking-tighter shadow-md z-20 animate-bounce">
          +NEW
        </span>
      )}
      {diffStatus === 'offline' && (
        <span className="absolute -top-1 -left-1 px-1 py-0.2 bg-rose-600 text-white rounded text-[7px] font-black tracking-tighter shadow-md z-20">
          -OFF
        </span>
      )}
      {diffStatus === 'changed' && (
        <span className="absolute -top-1 -left-1 px-1 py-0.2 bg-amber-500 text-black rounded text-[7px] font-black tracking-tighter shadow-md z-20">
          !CHG
        </span>
      )}

      {/* 장비 아이콘 (활성 장비일 경우 중앙에 작게 표시) */}
      {(status === 'active' || (status === 'scanning' && device)) && (
        <>
          <div className="absolute top-1 left-1 pointer-events-none opacity-40">
             {getDeviceIcon()}
          </div>
          {status === 'active' && <div className="absolute inset-0 bg-emerald-500/5 animate-[pulse_3s_infinite] pointer-events-none rounded-inherit" />}
        </>
      )}

      <span className={`
        text-[11px] md:text-[13px] font-black mono tracking-tight leading-none select-none z-10
        ${getTextColor()}
        drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
      `}>
        {lastOctet}
      </span>

      {/* 툴팁 (Hover) */}
      {(status === 'active' || (status === 'scanning' && device)) && device && (
        <div className={`
          pointer-events-none absolute 
          ${isLeftEdge ? 'left-0' : isRightEdge ? 'right-0' : 'left-1/2 -translate-x-1/2'}
          ${isTopHalf ? 'top-full mt-3' : 'bottom-full mb-3'}
          hidden group-hover:flex flex-col w-48 p-3 rounded-lg border z-[100]
          transition-all duration-300 opacity-0 group-hover:opacity-100
          ${getTooltipTheme()}
        `}>
          <div className="text-[11px] font-black border-b border-current border-opacity-10 pb-2 mb-2 flex justify-between items-center">
            <span className="truncate">{ip}</span>
            <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">{s.networkIdentity}</span>
              <div className="text-[10px] font-black flex items-center gap-2 mt-0.5">
                <span className="truncate text-sky-500">{device.hostname || s.deviceTypes.generic}</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">{s.macInfo}</span>
              <span className="text-[9px] font-bold truncate">{device.vendor || 'Unknown'}</span>
            </div>

            {device.openPorts && device.openPorts.length > 0 && (
              <div className="flex flex-col pt-1 border-t border-current border-opacity-5">
                <span className="text-[8px] uppercase font-black opacity-40 tracking-wider">{s.listeningPorts}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                   {device.openPorts.map(p => (
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
