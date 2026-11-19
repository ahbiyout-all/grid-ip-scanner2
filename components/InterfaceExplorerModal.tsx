import React from 'react';
import {
  X,
  Search,
  Wifi,
  Cable,
  Box,
  Shield,
  RotateCcw,
  Network,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { InterfaceInfo } from '../types';
import { copyTextToClipboard } from '../services/clipboard';

export type InterfaceFilterType = 'all' | 'up' | 'physical' | 'virtual' | 'vpn' | 'has_ipv4';

export interface InterfaceStatsSummary {
  total: number;
  active: number;
  physical: number;
  virtual: number;
  vpn: number;
  hasIpv4: number;
}

interface InterfaceExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  interfaces: InterfaceInfo[];
  filteredInterfaces: InterfaceInfo[];
  interfaceFilter: InterfaceFilterType;
  setInterfaceFilter: (filter: InterfaceFilterType) => void;
  interfaceSearch: string;
  setInterfaceSearch: (val: string) => void;
  interfaceStats: InterfaceStatsSummary;
  localIpInfo: { ip: string; subnet: string; computerName?: string } | null;
  onSelectInterface: (iface: InterfaceInfo) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  s: any;
  panelClass: string;
  showToast: (msg: string) => void;
}

export const InterfaceExplorerModal: React.FC<InterfaceExplorerModalProps> = ({
  isOpen,
  onClose,
  interfaces,
  filteredInterfaces,
  interfaceFilter,
  setInterfaceFilter,
  interfaceSearch,
  setInterfaceSearch,
  interfaceStats,
  localIpInfo,
  onSelectInterface,
  theme,
  lang,
  s,
  panelClass,
  showToast,
}) => {
  if (!isOpen) return null;

  const isBeige = theme === 'beige';
  const isWhite = theme === 'white';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl ${
          isBeige
            ? 'bg-[#fcf8f2] text-[#5c4a37]'
            : isWhite
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-zinc-900 text-zinc-100'
        } rounded-2xl shadow-2xl border ${panelClass} p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex justify-between items-start pb-3 border-b ${
          isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/10'
        }`}>
          <div className="flex items-center space-x-3">
            <img
              src="./logo.png"
              alt="Grid IP"
              className="w-11 h-11 rounded-xl object-cover border border-sky-500/40 shadow-md shrink-0"
            />
            <div>
              <h3 className="font-black text-base tracking-tight flex items-center gap-2">
                <span>{s.networkAdapters}</span>
                <span className="text-xs font-mono tabular-nums opacity-70">· {interfaces.length}</span>
              </h3>
              <p className="text-[11px] opacity-70">{s.networkAdaptersDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={interfaceSearch}
              onChange={(e) => setInterfaceSearch(e.target.value)}
              placeholder={s.filterSearchPlaceholder}
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium outline-none transition-all ${
                isBeige
                  ? 'bg-white border border-[#dfceb0] focus:border-amber-600'
                  : isWhite
                  ? 'bg-slate-50 border border-slate-300 focus:border-sky-500 text-slate-900'
                  : 'bg-black/40 border border-white/10 focus:border-sky-500 text-zinc-100'
              }`}
            />
            {interfaceSearch && (
              <button
                onClick={() => setInterfaceSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(
              [
                { key: 'all', label: s.allAdapters, count: interfaceStats.total },
                { key: 'up', label: s.activeOnly, count: interfaceStats.active },
                { key: 'physical', label: s.physicalOnly, count: interfaceStats.physical },
                { key: 'virtual', label: s.virtualOnly, count: interfaceStats.virtual },
                { key: 'vpn', label: s.vpnOnly, count: interfaceStats.vpn },
                { key: 'has_ipv4', label: s.withIpv4, count: interfaceStats.hasIpv4 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setInterfaceFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  interfaceFilter === tab.key
                    ? 'bg-sky-500 text-white shadow-sm'
                    : isBeige
                    ? 'bg-[#f0e4cf] hover:bg-[#e6d8c0] text-[#5c4a37]'
                    : isWhite
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono tabular-nums opacity-75">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Adapter Cards List */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar max-h-[50vh]">
          {filteredInterfaces.length > 0 ? (
            filteredInterfaces.map((iface, idx) => {
              const isCurrentTarget =
                localIpInfo?.subnet === iface.subnet && iface.ip && localIpInfo?.ip === iface.ip;
              const isWireless =
                iface.name.toLowerCase().includes('wi-fi') ||
                iface.name.toLowerCase().includes('wlan') ||
                iface.name.toLowerCase().includes('무선');

              return (
                <div
                  key={`${iface.name}-${iface.ip}-${idx}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrentTarget
                      ? 'bg-sky-500/10 border-sky-500/50 shadow-sm ring-1 ring-sky-500/30'
                      : isBeige
                      ? 'bg-white border-[#dfceb0] hover:border-amber-500/50'
                      : isWhite
                      ? 'bg-slate-50 border-slate-200 hover:border-sky-400/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b ${
                    isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          iface.status === 'up'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/50'
                        }`}
                      >
                        {iface.type === 'physical' ? (
                          isWireless ? (
                            <Wifi className="w-4 h-4" />
                          ) : (
                            <Cable className="w-4 h-4" />
                          )
                        ) : iface.type === 'virtual' ? (
                          <Box className="w-4 h-4" />
                        ) : iface.type === 'vpn' ? (
                          <Shield className="w-4 h-4" />
                        ) : iface.type === 'loopback' ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <Network className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm tracking-tight truncate" title={iface.name}>
                            {iface.name}
                          </span>
                          {iface.isDefault && (
                            <span className="text-[10px] font-bold text-amber-500 font-mono">
                              · Default Gateway
                            </span>
                          )}
                          {isCurrentTarget && (
                            <span className="text-[10px] font-bold text-sky-500 font-mono">
                              · Active Target
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-75">
                          <span className={iface.status === 'up' ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
                            {iface.status === 'up' ? s.statusUp : s.statusDown}
                          </span>
                          <span>·</span>
                          <span className="font-medium">
                            {iface.type === 'physical'
                              ? isWireless
                                ? 'Wi-Fi'
                                : lang === 'ko'
                                ? '이더넷 유선'
                                : 'Ethernet'
                              : iface.type === 'virtual'
                              ? lang === 'ko'
                                ? '가상 (VM/Docker)'
                                : 'Virtual'
                              : iface.type === 'vpn'
                              ? 'VPN'
                              : iface.type === 'loopback'
                              ? 'Loopback'
                              : lang === 'ko'
                              ? '기타'
                              : 'Other'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {iface.ip ? (
                        <button
                          onClick={() => onSelectInterface(iface)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                            isCurrentTarget
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isCurrentTarget ? (lang === 'ko' ? '현재 선택됨' : 'Selected') : s.setAsScanTarget}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium opacity-50">
                          {lang === 'ko' ? 'IP 미할당' : 'No IPv4'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2.5 text-[11px]">
                    <div className={`p-2 rounded-lg space-y-0.5 ${isWhite || isBeige ? 'bg-black/5' : 'bg-black/20'}`}>
                      <div className="text-[10px] opacity-60 font-bold">IPv4 / CIDR</div>
                      <div className="flex items-center justify-between font-mono tabular-nums font-bold">
                        <span className="text-sky-500 truncate">{iface.cidr || iface.ip || '-'}</span>
                        {iface.ip && (
                          <button
                            onClick={() => {
                              copyTextToClipboard(iface.ip).then((ok) => {
                                showToast(
                                  ok
                                    ? lang === 'ko'
                                      ? `${iface.ip} 복사되었습니다.`
                                      : `Copied ${iface.ip}`
                                    : lang === 'ko'
                                    ? '클립보드 복사에 실패했습니다.'
                                    : 'Failed to copy to clipboard.'
                                );
                              });
                            }}
                            className="p-1 hover:opacity-100 opacity-60 cursor-pointer"
                            title="Copy IP"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg space-y-0.5 ${isWhite || isBeige ? 'bg-black/5' : 'bg-black/20'}`}>
                      <div className="text-[10px] opacity-60 font-bold">Subnet Range</div>
                      <div className="font-mono tabular-nums font-bold">
                        {iface.subnet ? `${iface.subnet}.0/24` : '-'}
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg space-y-0.5 ${isWhite || isBeige ? 'bg-black/5' : 'bg-black/20'}`}>
                      <div className="text-[10px] opacity-60 font-bold">Hardware MAC</div>
                      <div className="flex items-center justify-between font-mono tabular-nums font-bold">
                        <span className="truncate">{iface.mac || '-'}</span>
                        {iface.mac && (
                          <button
                            onClick={() => {
                              copyTextToClipboard(iface.mac!).then((ok) => {
                                showToast(
                                  ok
                                    ? lang === 'ko'
                                      ? `${iface.mac} 복사되었습니다.`
                                      : `Copied ${iface.mac}`
                                    : lang === 'ko'
                                    ? '클립보드 복사에 실패했습니다.'
                                    : 'Failed to copy to clipboard.'
                                );
                              });
                            }}
                            className="p-1 hover:opacity-100 opacity-60 cursor-pointer"
                            title="Copy MAC"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {iface.ipv6 && (
                      <div className={`p-2 rounded-lg space-y-0.5 sm:col-span-2 ${isWhite || isBeige ? 'bg-black/5' : 'bg-black/20'}`}>
                        <div className="text-[10px] opacity-60 font-bold">IPv6 Address</div>
                        <div className="flex items-center justify-between font-mono font-bold text-emerald-500 text-[10px] truncate">
                          <span className="truncate">{iface.ipv6}</span>
                          <button
                            onClick={() => {
                              copyTextToClipboard(iface.ipv6!).then((ok) => {
                                showToast(
                                  ok
                                    ? lang === 'ko'
                                      ? `${iface.ipv6} 복사되었습니다.`
                                      : `Copied ${iface.ipv6}`
                                    : lang === 'ko'
                                    ? '클립보드 복사에 실패했습니다.'
                                    : 'Failed to copy to clipboard.'
                                );
                              });
                            }}
                            className="p-1 hover:opacity-100 opacity-60 shrink-0 cursor-pointer"
                            title="Copy IPv6"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`p-2 rounded-lg space-y-0.5 ${isWhite || isBeige ? 'bg-black/5' : 'bg-black/20'}`}>
                      <div className="text-[10px] opacity-60 font-bold">
                        {s.mtuLabel} / {s.flagsLabel}
                      </div>
                      <div className="font-mono tabular-nums text-[10px] truncate opacity-80">
                        MTU: {iface.mtu || '-'} · {iface.flags?.slice(0, 3).join(', ') || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3 rounded-2xl bg-black/10 border border-white/10">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto opacity-75" />
              <div className="font-bold text-sm">{s.noMatchingAdapters}</div>
              <button
                onClick={() => {
                  setInterfaceFilter('all');
                  setInterfaceSearch('');
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ko' ? '필터 및 검색어 전체 초기화' : 'Reset Filters & Search'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex items-center justify-between ${
          isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/10'
        }`}>
          <div className="text-[11px] opacity-65 tabular-nums">
            {s.adapterCountSummary
              .replace('{total}', String(interfaceStats.total))
              .replace('{active}', String(interfaceStats.active))
              .replace('{physical}', String(interfaceStats.physical))
              .replace('{virtual}', String(interfaceStats.virtual))}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
          >
            {s.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
