import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckSquare,
  Square,
  Cable,
  Zap,
  SearchX,
  RefreshCw,
  AlertTriangle,
  BellRing,
} from 'lucide-react';
import { DeviceAlias, DeviceInfo, ScanResult } from '../types';
import { compareIpv4 } from '../services/cidrUtils';
import { ConflictInfo, isConflictAlert } from '../services/conflictDetector';
import { normalizeMacKey } from '../services/deviceAliasManager';

interface DeviceTableViewProps {
  ips: string[];
  results: Record<string, ScanResult>;
  selectedIp: string | null;
  onSelectIp: (ip: string) => void;
  onDoubleClickIp?: (ip: string, device?: DeviceInfo) => void;
  onQuickConnectPort: (ip: string, port: number) => void;
  selectedBatchIps: Set<string>;
  onToggleBatchIp: (ip: string) => void;
  onSetBatchIps: (next: Set<string>) => void;
  aliases: Record<string, DeviceAlias>;
  detectedConflicts: Map<string, ConflictInfo>;
  detectedIntruders: Array<{ ip: string }>;
  isScanning: boolean;
  hasStartedScan: boolean;
  searchTerm: string;
  onClearSearch?: () => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

type TableSortCol = 'ip' | 'status' | 'host' | 'vendor' | 'rtt' | 'switch' | 'ports';
type QuickStatusFilter = 'all' | 'active' | 'with_ports' | 'l2_mapped';

export const DeviceTableView: React.FC<DeviceTableViewProps> = ({
  ips,
  results,
  selectedIp,
  onSelectIp,
  onDoubleClickIp,
  onQuickConnectPort,
  selectedBatchIps,
  onToggleBatchIp,
  onSetBatchIps,
  aliases,
  detectedConflicts,
  detectedIntruders,
  isScanning,
  hasStartedScan,
  searchTerm,
  onClearSearch,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [sortCol, setSortCol] = useState<TableSortCol>('ip');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [quickFilter, setQuickFilter] = useState<QuickStatusFilter>('all');

  const intruderSet = useMemo(() => new Set(detectedIntruders.map((d) => d.ip)), [detectedIntruders]);

  const rows = useMemo(() => {
    const filtered = ips.filter((ip) => {
      const r = results[ip];
      if (!r) return false;
      if (quickFilter === 'active' && r.status !== 'active') return false;
      if (quickFilter === 'with_ports' && (!r.device?.openPorts || r.device.openPorts.length === 0)) return false;
      if (quickFilter === 'l2_mapped' && !r.device?.switchPort) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const ra = results[a];
      const rb = results[b];
      const da = ra?.device;
      const db = rb?.device;
      let cmp = 0;

      if (sortCol === 'ip') {
        cmp = compareIpv4(a, b);
      } else if (sortCol === 'status') {
        const rank = (s?: string) => (s === 'active' ? 0 : s === 'scanning' ? 1 : s === 'inactive' ? 2 : 3);
        cmp = rank(ra?.status) - rank(rb?.status) || compareIpv4(a, b);
      } else if (sortCol === 'host') {
        const ha = (da?.hostname || '').toLowerCase();
        const hb = (db?.hostname || '').toLowerCase();
        cmp = ha.localeCompare(hb) || compareIpv4(a, b);
      } else if (sortCol === 'vendor') {
        const va = (da?.realVendor || da?.vendor || '').toLowerCase();
        const vb = (db?.realVendor || db?.vendor || '').toLowerCase();
        cmp = va.localeCompare(vb) || compareIpv4(a, b);
      } else if (sortCol === 'rtt') {
        const la = ra?.status === 'active' && da?.latency !== undefined ? da.latency : Number.MAX_SAFE_INTEGER;
        const lb = rb?.status === 'active' && db?.latency !== undefined ? db.latency : Number.MAX_SAFE_INTEGER;
        cmp = la - lb || compareIpv4(a, b);
      } else if (sortCol === 'switch') {
        const sa = da?.switchPort ? `${da.switchName || da.switchIp || ''} ${da.switchPort}` : 'zzz';
        const sb = db?.switchPort ? `${db.switchName || db.switchIp || ''} ${db.switchPort}` : 'zzz';
        cmp = sa.localeCompare(sb) || compareIpv4(a, b);
      } else if (sortCol === 'ports') {
        const pa = da?.openPorts?.length || 0;
        const pb = db?.openPorts?.length || 0;
        cmp = pb - pa || compareIpv4(a, b);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [ips, results, quickFilter, sortCol, sortDir]);

  const toggleSort = (col: TableSortCol) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const allVisibleSelected = rows.length > 0 && rows.every((ip) => selectedBatchIps.has(ip));

  const handleToggleAllVisible = () => {
    const next = new Set(selectedBatchIps);
    if (allVisibleSelected) {
      rows.forEach((ip) => next.delete(ip));
    } else {
      rows.forEach((ip) => next.add(ip));
    }
    onSetBatchIps(next);
  };

  const handleSelectActive = () => {
    const next = new Set(selectedBatchIps);
    rows.forEach((ip) => {
      if (results[ip]?.status === 'active') next.add(ip);
    });
    onSetBatchIps(next);
  };

  const handleSelectWithMac = () => {
    const next = new Set(selectedBatchIps);
    rows.forEach((ip) => {
      const mac = results[ip]?.device?.mac;
      if (mac && mac !== 'Unknown') next.add(ip);
    });
    onSetBatchIps(next);
  };

  const surfaceCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#dcc7a1] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-white border-slate-200 text-slate-900'
      : theme === 'gray'
      ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
      : 'bg-slate-900/90 border-slate-800 text-slate-100';

  const headerRowCls =
    theme === 'beige'
      ? 'bg-[#f6ede0] border-[#dcc7a1] text-[#5c4a37]'
      : theme === 'white'
      ? 'bg-slate-50 border-slate-200 text-slate-600'
      : theme === 'gray'
      ? 'bg-zinc-950/90 border-zinc-800 text-zinc-400'
      : 'bg-slate-950/95 border-slate-800 text-slate-400';

  const hairlineCls =
    theme === 'beige'
      ? 'border-[#e6d5b8]'
      : theme === 'white'
      ? 'border-slate-200'
      : theme === 'gray'
      ? 'border-zinc-800'
      : 'border-slate-800';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const subtleBtnCls =
    theme === 'beige'
      ? 'bg-white border-[#d4be9c] text-[#4a341e] hover:bg-[#efe4d2]'
      : theme === 'white'
      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10';

  const activeTotal = useMemo(() => ips.filter((ip) => results[ip]?.status === 'active').length, [ips, results]);
  const mappedTotal = useMemo(() => ips.filter((ip) => Boolean(results[ip]?.device?.switchPort)).length, [ips, results]);

  // Empty state (never scanned and no results)
  if (ips.length === 0 && !isScanning) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`max-w-md w-full p-6 rounded-xl border text-center space-y-2 ${surfaceCls}`}>
          <SearchX className="w-8 h-8 text-sky-500 mx-auto" />
          <h3 className="text-sm font-bold">
            {searchTerm
              ? isKo
                ? '검색 조건에 일치하는 단말이 없습니다'
                : 'No Matching Devices Found'
              : isKo
              ? '스캔된 IP 대상이 없습니다'
              : 'No Scanned IP Targets'}
          </h3>
          <p className={`text-xs ${mutedCls}`}>
            {searchTerm
              ? isKo
                ? `"${searchTerm}" 필터와 일치하는 장비가 없습니다.`
                : `No hosts matched "${searchTerm}".`
              : isKo
              ? '좌측 사이드바에서 서브넷 또는 CIDR(/23, /22, /20)을 입력하고 스캔을 시작하세요.'
              : 'Enter a subnet or CIDR (/23, /22, /20) in the sidebar and start scanning.'}
          </p>
          {searchTerm && onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="mt-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
            >
              {isKo ? '검색 필터 초기화' : 'Clear Filter'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 md:p-4 gap-2.5 overflow-hidden">
      {/* Top Action & Filter Bar */}
      <div className={`px-3.5 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 shrink-0 ${surfaceCls}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', labelKo: `표시 (${ips.length})`, labelEn: `Shown (${ips.length})` },
              { id: 'active', labelKo: `활성 (${activeTotal})`, labelEn: `Active (${activeTotal})` },
              { id: 'with_ports', labelKo: '포트 열림', labelEn: 'Open Ports' },
              { id: 'l2_mapped', labelKo: `L2 매핑 (${mappedTotal})`, labelEn: `L2 Mapped (${mappedTotal})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuickFilter(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono tabular-nums cursor-pointer transition-colors ${
                quickFilter === f.id ? 'bg-sky-600 text-white' : `${subtleBtnCls} border`
              }`}
            >
              {isKo ? f.labelKo : f.labelEn}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleSelectActive}
            className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${subtleBtnCls}`}
          >
            {isKo ? '활성 장비 전체 선택' : 'Select Active'}
          </button>
          <button
            type="button"
            onClick={handleSelectWithMac}
            className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${subtleBtnCls}`}
          >
            {isKo ? 'MAC 보유 선택' : 'Select w/ MAC'}
          </button>
          {selectedBatchIps.size > 0 && (
            <button
              type="button"
              onClick={() => onSetBatchIps(new Set())}
              className={`px-2.5 py-1 rounded border text-[11px] font-bold text-rose-500 cursor-pointer ${subtleBtnCls}`}
            >
              {isKo ? `선택 해제 (${selectedBatchIps.size})` : `Clear (${selectedBatchIps.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Dense Virtualized-Feel Scrollable Table */}
      <div className={`flex-1 rounded-xl border overflow-auto min-h-0 ${surfaceCls}`}>
        {isScanning && !hasStartedScan && rows.length === 0 ? (
          <div className="h-48 flex items-center justify-center gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
            <span>{isKo ? '네트워크 대역을 스캔하는 중입니다...' : 'Scanning subnet targets...'}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-xs p-4 text-center">
            <p className={mutedCls}>
              {isKo ? '선택한 테이블 필터 조건에 해당하는 장비가 없습니다.' : 'No devices match this table filter.'}
            </p>
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className="px-3 py-1 rounded bg-sky-600 text-white font-bold cursor-pointer"
            >
              {isKo ? '전체 보기' : 'Show All'}
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className={`sticky top-0 z-10 border-b text-[10.5px] font-bold uppercase tracking-wider ${headerRowCls}`}>
              <tr>
                <th className="w-9 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={handleToggleAllVisible}
                    aria-label={isKo ? '표시된 행 모두 선택' : 'Select all visible rows'}
                    className="flex items-center justify-center cursor-pointer hover:text-sky-500"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-500" />
                    ) : (
                      <Square className="w-4 h-4 opacity-60" />
                    )}
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('ip')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>IP</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>{isKo ? '상태' : 'Status'}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('host')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>{isKo ? '호스트명 / 별칭' : 'Hostname / Alias'}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('vendor')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>{isKo ? 'MAC · 제조사' : 'MAC · Vendor'}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap text-right">
                  <button type="button" onClick={() => toggleSort('rtt')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>RTT</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('switch')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>{isKo ? 'L2 스위치 포트' : 'L2 Switch Port'}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
                <th className="px-2.5 py-2.5 whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('ports')} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-500">
                    <span>{isKo ? '개방 포트 (빠른 연결)' : 'Open Ports'}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${hairlineCls}`}>
              {rows.map((ip) => {
                const res = results[ip];
                const dev = res?.device;
                const isSelectedRow = selectedIp === ip;
                const isBatchChecked = selectedBatchIps.has(ip);
                const key = normalizeMacKey(dev?.mac, ip);
                const alias = (key && aliases[key]) || aliases[`IP:${ip}`];
                const conflict = detectedConflicts.get(ip);
                const hasRealConflict = isConflictAlert(conflict);
                const isIntruder = intruderSet.has(ip);

                const statusLabel =
                  res?.status === 'active'
                    ? isKo
                      ? '활성'
                      : 'ACTIVE'
                    : res?.status === 'scanning'
                    ? isKo
                      ? '스캔중'
                      : 'SCAN'
                    : res?.status === 'inactive'
                    ? isKo
                      ? '비활성'
                      : 'OFF'
                    : isKo
                    ? '대기'
                    : 'IDLE';

                return (
                  <tr
                    key={ip}
                    onClick={() => onSelectIp(ip)}
                    onDoubleClick={() => onDoubleClickIp && onDoubleClickIp(ip, dev)}
                    className={`h-[calc(2.5rem*var(--ui-text-scale))] transition-colors cursor-pointer ${
                      isSelectedRow
                        ? isLight
                          ? 'bg-sky-50'
                          : 'bg-sky-500/15'
                        : isLight
                        ? 'hover:bg-slate-50'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td
                      className="px-3 py-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBatchIp(ip);
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Select ${ip}`}
                        className="flex items-center justify-center cursor-pointer"
                      >
                        {isBatchChecked ? (
                          <CheckSquare className="w-4 h-4 text-sky-500" />
                        ) : (
                          <Square className="w-4 h-4 opacity-40 hover:opacity-80" />
                        )}
                      </button>
                    </td>

                    <td className="px-2.5 py-1.5 font-mono tabular-nums font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={res?.status === 'active' ? 'text-sky-500' : mutedCls}>{ip}</span>
                        {hasRealConflict && (
                          <span title={conflict?.reason}>
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          </span>
                        )}
                        {isIntruder && (
                          <span title={isKo ? '신규 낯선 기기' : 'New unrecognized host'}>
                            <BellRing className="w-3.5 h-3.5 text-purple-400" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          res?.status === 'active'
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-500/15 text-emerald-400'
                            : res?.status === 'scanning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : isLight
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>

                    <td className="px-2.5 py-1.5 max-w-[230px] truncate">
                      {alias?.nickname ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-amber-500 truncate">{alias.nickname}</span>
                          {dev?.hostname && (
                            <span className={`text-[10.5px] font-mono truncate ${mutedCls}`}>({dev.hostname})</span>
                          )}
                        </div>
                      ) : (
                        <span className={dev?.hostname ? 'font-medium' : mutedCls}>{dev?.hostname || '-'}</span>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5 max-w-[270px] truncate">
                      {dev?.mac ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono tabular-nums text-[11px]">{dev.mac}</span>
                          <span className={`truncate text-[11px] ${mutedCls}`}>
                            {dev.realVendor || dev.vendor || ''}
                          </span>
                        </div>
                      ) : (
                        <span className={mutedCls}>-</span>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {res?.status === 'active' && dev?.latency !== undefined ? (
                        <span>{dev.latency}ms</span>
                      ) : (
                        <span className={mutedCls}>-</span>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      {dev?.switchPort ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[11px] text-cyan-500 font-semibold">
                          <Cable className="w-3 h-3 shrink-0" />
                          <span>
                            {dev.switchName || dev.switchIp} · {dev.switchPort}
                            {dev.switchVlanId ? ` · V${dev.switchVlanId}` : ''}
                          </span>
                        </span>
                      ) : (
                        <span className={mutedCls}>-</span>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5">
                      {dev?.openPorts && dev.openPorts.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {dev.openPorts.slice(0, 6).map((port) => (
                            <button
                              key={port}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickConnectPort(ip, port);
                              }}
                              title={isKo ? `포트 ${port} 빠른 연결` : `Quick connect port ${port}`}
                              className={`px-1.5 py-0.5 rounded border font-mono tabular-nums text-[10.5px] font-bold inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                                isLight
                                  ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                                  : 'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25'
                              }`}
                            >
                              <span>{port}</span>
                              <Zap className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ))}
                          {dev.openPorts.length > 6 && (
                            <span className={`font-mono text-[10px] ${mutedCls}`}>
                              +{dev.openPorts.length - 6}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={mutedCls}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
