import React, { useEffect, useMemo, useState } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  ShieldAlert,
  Lock,
  Router,
  Server,
  Monitor,
  Box,
  Cable,
} from 'lucide-react';
import {
  DeviceAlias,
  NetworkConfig,
  ScanResult,
  SnmpL2MappingResult,
  TopologyGraphPayload,
  TopologyNode,
  TopologyNodeTier,
} from '../types';
import { ConflictInfo } from '../services/conflictDetector';
import { ResolvedFeatureGates } from '../services/licenseManager';
import {
  buildClientTopologyGraph,
  mergeNativeTopologyOverlay,
} from '../services/topologyGraphBuilder';
import { fetchNativeTopologyMap } from '../services/nativeModulesService';

interface TopologyMapViewProps {
  config: NetworkConfig;
  results: Record<string, ScanResult>;
  detectedConflicts: Map<string, ConflictInfo>;
  detectedIntruders: Array<{ ip: string; device?: any }>;
  softTrustedDevices: Array<{ ip: string; similarityScore?: number }>;
  aliases: Record<string, DeviceAlias>;
  localIpInfo?: { ip: string; subnet: string } | null;
  vlanTag?: string;
  explicitGatewayIp?: string;
  selectedIp: string | null;
  onSelectIp: (ip: string) => void;
  onStartScan: () => void;
  onRequirePro: (featureId: 'topologySecurityPro' | 'snmpL2Mapping', context?: string) => void;
  snmpL2Map?: SnmpL2MappingResult | null;
  onOpenSnmpConfig?: () => void;
  featureGates: ResolvedFeatureGates;
  isScanning: boolean;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

type EdgeFilterMode = 'all' | 'threats' | 'proxy_arp' | 'soft_trust' | 'l2_mapped';

export const TopologyMapView: React.FC<TopologyMapViewProps> = ({
  config,
  results,
  detectedConflicts,
  detectedIntruders,
  softTrustedDevices,
  aliases,
  localIpInfo,
  vlanTag,
  explicitGatewayIp,
  selectedIp,
  onSelectIp,
  onStartScan,
  onRequirePro,
  snmpL2Map,
  onOpenSnmpConfig,
  featureGates,
  isScanning,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [filterMode, setFilterMode] = useState<EdgeFilterMode>('all');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isAnalyzingNative, setIsAnalyzingNative] = useState(false);
  const [nativeOverlay, setNativeOverlay] = useState<TopologyGraphPayload | null>(null);

  useEffect(() => {
    setNativeOverlay(null);
  }, [config.subnet, vlanTag]);

  const clientGraph = useMemo(
    () =>
      buildClientTopologyGraph({
        config,
        results,
        detectedConflicts,
        detectedIntruders,
        softTrustedDevices,
        aliases,
        localIpInfo,
        vlanTag,
        explicitGatewayIp,
        snmpL2Map,
      }),
    [
      config,
      results,
      detectedConflicts,
      detectedIntruders,
      softTrustedDevices,
      aliases,
      localIpInfo,
      vlanTag,
      explicitGatewayIp,
      snmpL2Map,
    ]
  );

  const graph = useMemo(
    () => mergeNativeTopologyOverlay(clientGraph, nativeOverlay),
    [clientGraph, nativeOverlay]
  );

  const handleRunNativeGuard = async () => {
    if (!featureGates.topologySecurityPro) {
      onRequirePro('topologySecurityPro', `${config.subnet}.0/24`);
      return;
    }
    setIsAnalyzingNative(true);
    const current = graph.nodes
      .filter((n) => n.isActive !== false)
      .map((n) => ({
        ip: n.ip,
        mac: n.mac,
        hostname: n.label,
        vendor: n.vendor,
        deviceType: n.deviceType,
        latency: n.latencyMs,
        openPorts: n.openPorts || [],
        isHost: n.isHost,
        isGateway: n.tier === 'gateway',
        isProxyArp: n.riskState === 'proxy_arp',
        isConflict: n.riskState === 'conflict',
        isSoftTrust: n.riskState === 'soft_trust',
        isIntruder: n.riskState === 'intruder',
        vlanTag: n.vlanTag,
      }));
    const overlay = await fetchNativeTopologyMap({
      subnet: config.subnet,
      vlanTag,
      gatewayIp: graph.gatewayIp,
      current,
      baseline: [],
    });
    if (overlay) {
      setNativeOverlay(overlay);
    }
    setIsAnalyzingNative(false);
  };

  const filteredNodes = useMemo(() => {
    if (filterMode === 'all') return graph.nodes;
    return graph.nodes.filter((n) => {
      if (n.tier === 'gateway') return true;
      if (filterMode === 'threats') {
        return n.riskState === 'conflict' || n.riskState === 'intruder';
      }
      if (filterMode === 'proxy_arp') {
        return n.riskState === 'proxy_arp';
      }
      if (filterMode === 'soft_trust') {
        return n.riskState === 'soft_trust';
      }
      if (filterMode === 'l2_mapped') {
        return Boolean(n.isSwitch || n.switchPort);
      }
      return true;
    });
  }, [graph.nodes, filterMode]);

  const tieredNodes = useMemo(() => {
    const groups: Record<TopologyNodeTier, TopologyNode[]> = {
      gateway: [],
      infra: [],
      endpoint: [],
      vm: [],
    };
    filteredNodes.forEach((n) => {
      groups[n.tier].push(n);
    });
    return groups;
  }, [filteredNodes]);

  // Compute deterministic hierarchical SVG node coordinates with multi-row wrapping for dense subnets
  const layout = useMemo(() => {
    const posMap = new Map<string, { x: number; y: number }>();
    const canvasWidth = 960;
    const maxPerRow = 14;
    const rowSpacing = 68;
    const rowCoords: Array<{ nodes: TopologyNode[]; y: number }> = [];
    let curY = 64;

    const pushWrappedTier = (tierList: TopologyNode[], tierGap: number) => {
      if (tierList.length === 0) return;
      for (let i = 0; i < tierList.length; i += maxPerRow) {
        rowCoords.push({ nodes: tierList.slice(i, i + maxPerRow), y: curY });
        curY += rowSpacing;
      }
      curY += tierGap;
    };

    pushWrappedTier(tieredNodes.gateway, 52);
    pushWrappedTier(tieredNodes.infra, 56);
    pushWrappedTier([...tieredNodes.endpoint, ...tieredNodes.vm], 0);

    rowCoords.forEach(({ nodes, y }) => {
      const count = nodes.length;
      nodes.forEach((n, idx) => {
        const x = count === 1 ? canvasWidth / 2 : ((idx + 1) / (count + 1)) * canvasWidth;
        posMap.set(n.ip, { x, y });
      });
    });

    const canvasHeight = Math.max(380, curY + 40);
    return { posMap, canvasWidth, canvasHeight };
  }, [tieredNodes]);

  const surfaceCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#dcc7a1] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-white border-slate-200 text-slate-900'
      : theme === 'gray'
      ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
      : 'bg-slate-900/90 border-slate-800 text-slate-100';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const anomalyCount = graph.nodes.filter(
    (n) => n.riskState === 'conflict' || n.riskState === 'intruder'
  ).length;
  const proxyCount = graph.nodes.filter((n) => n.riskState === 'proxy_arp').length;
  const l2MappedCount = graph.nodes.filter((n) => Boolean(n.switchPort)).length;
  const hasMultiBlockSubnet = useMemo(() => {
    const thirds = new Set(graph.nodes.map((n) => n.ip.split('.').slice(0, 3).join('.')));
    return thirds.size > 1;
  }, [graph.nodes]);

  const renderTierIcon = (tier: TopologyNodeTier, cls: string) => {
    if (tier === 'gateway') return <Router className={cls} />;
    if (tier === 'infra') return <Server className={cls} />;
    if (tier === 'vm') return <Box className={cls} />;
    return <Monitor className={cls} />;
  };

  const renderNodeCard = (node: TopologyNode) => {
    const isSel = selectedIp === node.ip;
    let borderCls = isLight
      ? 'border-slate-200 bg-white hover:border-sky-400'
      : 'border-slate-700/80 bg-slate-950/80 hover:border-sky-500/70';

    if (node.riskState === 'conflict') {
      borderCls = isLight
        ? 'border-rose-400 bg-rose-50'
        : 'border-rose-500/70 bg-rose-950/30';
    } else if (node.riskState === 'intruder') {
      borderCls = isLight
        ? 'border-purple-400 bg-purple-50'
        : 'border-purple-500/70 bg-purple-950/30';
    } else if (node.riskState === 'proxy_arp') {
      borderCls = isLight
        ? 'border-sky-400 bg-sky-50'
        : 'border-sky-500/60 bg-sky-950/30';
    } else if (node.riskState === 'soft_trust') {
      borderCls = isLight
        ? 'border-amber-400 bg-amber-50'
        : 'border-amber-500/60 bg-amber-950/30';
    } else if (node.tier === 'gateway') {
      borderCls = isLight
        ? 'border-emerald-400 bg-emerald-50/70'
        : 'border-emerald-500/50 bg-emerald-950/25';
    }

    return (
      <button
        key={node.ip}
        type="button"
        onClick={() => onSelectIp(node.ip)}
        className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer min-w-[168px] max-w-[205px] ${borderCls} ${
          isSel ? 'ring-2 ring-sky-400' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {renderTierIcon(
              node.tier,
              `w-3.5 h-3.5 shrink-0 ${
                node.riskState === 'conflict'
                  ? 'text-rose-500'
                  : node.riskState === 'proxy_arp'
                  ? 'text-sky-500'
                  : node.tier === 'gateway'
                  ? 'text-emerald-500'
                  : 'text-sky-400'
              }`
            )}
            <span className="font-mono tabular-nums text-[11.5px] font-bold truncate">
              {node.ip}
            </span>
          </div>
          {node.latencyMs !== undefined && node.latencyMs > 0 && (
            <span className={`font-mono tabular-nums text-[10px] shrink-0 ${mutedCls}`}>
              {node.latencyMs}ms
            </span>
          )}
        </div>

        <div className="text-[11px] font-semibold truncate mt-1">{node.label}</div>

        <div className={`text-[10px] font-mono tabular-nums truncate mt-0.5 flex items-center gap-1 ${mutedCls}`}>
          <span>{node.mac || (node.isActive === false ? 'Inferred GW' : 'No MAC')}</span>
          {node.openPortCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{node.openPortCount}p</span>
            </>
          )}
        </div>

        {node.switchPort && (
          <div className="text-[10px] font-mono tabular-nums mt-1 truncate text-cyan-500 font-bold flex items-center gap-1">
            <Cable className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {node.switchName || node.switchIp} · {node.switchPort}
              {node.vlanId ? ` · V${node.vlanId}` : ''}
            </span>
          </div>
        )}

        {node.riskState !== 'normal' && (
          <div
            className={`text-[10px] font-bold mt-1 truncate ${
              node.riskState === 'conflict'
                ? 'text-rose-500'
                : node.riskState === 'intruder'
                ? 'text-purple-400'
                : node.riskState === 'proxy_arp'
                ? 'text-sky-500'
                : 'text-amber-500'
            }`}
          >
            {node.riskState === 'conflict'
              ? isKo
                ? 'IP/MAC 충돌 의심'
                : 'Conflict Alert'
              : node.riskState === 'intruder'
              ? isKo
                ? '미등록 침입 의심'
                : 'Intruder Alert'
              : node.riskState === 'proxy_arp'
              ? 'Proxy-ARP (Info)'
              : isKo
              ? 'Soft-Trust 유예'
              : 'Soft-Trust Grace'}
          </div>
        )}
      </button>
    );
  };

  if (graph.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`max-w-md w-full p-6 rounded-xl border text-center space-y-3 ${surfaceCls}`}>
          <Network className="w-8 h-8 text-sky-500 mx-auto" />
          <h3 className="text-sm font-bold">
            {isKo ? '표시할 토폴로지 노드가 없습니다' : 'No Topology Nodes to Visualize'}
          </h3>
          <p className={`text-xs leading-relaxed ${mutedCls}`}>
            {isKo
              ? '서브넷 스캔을 먼저 실행하면 게이트웨이, 인프라 장비, 단말 노드 간 계층 연결과 Proxy-ARP·충돌 경보를 시각화합니다.'
              : 'Run a subnet scan to visualize hierarchical gateway, infrastructure, and endpoint links along with Proxy-ARP and conflict alerts.'}
          </p>
          <button
            type="button"
            disabled={isScanning}
            onClick={onStartScan}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isKo ? '현재 대역 스캔 시작' : 'Start Subnet Scan'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 md:p-4 gap-3 overflow-hidden">
      {/* Top Toolbar */}
      <div className={`px-3.5 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 shrink-0 ${surfaceCls}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', labelKo: `전체 (${graph.nodes.length})`, labelEn: `All (${graph.nodes.length})` },
              { id: 'threats', labelKo: `위협·충돌 (${anomalyCount})`, labelEn: `Threats (${anomalyCount})` },
              { id: 'proxy_arp', labelKo: `Proxy-ARP (${proxyCount})`, labelEn: `Proxy-ARP (${proxyCount})` },
              { id: 'soft_trust', labelKo: '유예·신뢰', labelEn: 'Soft-Trust' },
              { id: 'l2_mapped', labelKo: `L2 매핑 (${l2MappedCount})`, labelEn: `L2 Ports (${l2MappedCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono tabular-nums cursor-pointer transition-colors ${
                filterMode === f.id
                  ? 'bg-sky-600 text-white'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isKo ? f.labelKo : f.labelEn}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10.5px] font-mono tabular-nums ${mutedCls}`}>
            {graph.engine} · {graph.elapsedMicroseconds}µs
          </span>

          <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 border-current/15">
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.max(70, z - 15))}
              className="p-1 hover:opacity-75 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10.5px] font-mono tabular-nums px-1">{zoomPercent}%</span>
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.min(130, z + 15))}
              className="p-1 hover:opacity-75 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              className="p-1 hover:opacity-75 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {onOpenSnmpConfig && (
            <button
              type="button"
              onClick={() => {
                if (!featureGates.snmpL2Mapping) {
                  onRequirePro('snmpL2Mapping', `${config.subnet}.0/24`);
                  return;
                }
                onOpenSnmpConfig();
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border ${
                featureGates.snmpL2Mapping
                  ? isLight
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                    : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                  : isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  : 'bg-amber-500/10 border-amber-500/35 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              {featureGates.snmpL2Mapping ? (
                <Cable className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              <span>
                {featureGates.snmpL2Mapping
                  ? isKo
                    ? 'L2 스위치 매핑 (SNMP)'
                    : 'L2 Switch Map (SNMP)'
                  : isKo
                  ? 'L2 스위치 매핑 (PRO)'
                  : 'L2 Switch Map (PRO)'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRunNativeGuard}
            disabled={isAnalyzingNative}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              featureGates.topologySecurityPro
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : isLight
                ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-amber-500/10 border border-amber-500/35 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {featureGates.topologySecurityPro ? (
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingNative ? 'animate-spin' : ''}`} />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            <span>
              {featureGates.topologySecurityPro
                ? isKo
                  ? '네이티브 상관분석'
                  : 'Native Guard Sync'
                : isKo
                ? '보안 상관분석 · 스푸핑 가드 (PRO)'
                : 'Security Correlation & Guard (PRO)'}
            </span>
          </button>
        </div>
      </div>

      {/* Hierarchical Canvas */}
      <div className={`flex-1 rounded-xl border overflow-auto p-4 relative ${surfaceCls}`}>
        <div
          className="space-y-6 mx-auto origin-top transition-transform duration-150"
          style={{
            transform: `scale(${zoomPercent / 100})`,
            minWidth: '680px',
            maxWidth: '1080px',
          }}
        >
          {/* SVG Topology Relation Diagram */}
          <div className={`rounded-lg border p-3 relative ${isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-black/25 border-white/10'}`}>
            <div className="flex items-center justify-between text-[10.5px] font-mono tabular-nums mb-2">
              <span className={mutedCls}>
                L3 Gateway: <strong className="text-emerald-500">{graph.gatewayIp}</strong>
                {vlanTag ? ` · ${vlanTag}` : ''}
              </span>
              <span className={mutedCls}>
                {isKo
                  ? '실선: 업링크 · 청록: L2 포트 · 에메랄드 점선: 스위치 업링크 · 적색: 충돌'
                  : 'Solid: Uplink · Cyan: L2 Port · Emerald Dash: Switch Uplink · Red: Conflict'}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`}
              className="w-full select-none ui-scale-reset"
              style={{ height: `${Math.max(256, Math.round(layout.canvasHeight * 0.6))}px` }}
            >
              {graph.edges.map((edge) => {
                const p1 = layout.posMap.get(edge.fromIp);
                const p2 = layout.posMap.get(edge.toIp);
                if (!p1 || !p2) return null;
                const midY = (p1.y + p2.y) / 2;
                const d = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
                let stroke = isLight ? '#94a3b8' : '#334155';
                let dash = '';
                let sw = 1.6;
                if (edge.relation === 'physical_port') {
                  stroke = '#06b6d4';
                  sw = 2.1;
                } else if (edge.relation === 'switch_uplink') {
                  stroke = '#10b981';
                  dash = '6 4';
                  sw = 2.2;
                } else if (edge.relation === 'proxy_arp_alias') {
                  stroke = '#0ea5e9';
                  dash = '5 4';
                  sw = 2;
                } else if (edge.relation === 'conflict_alert') {
                  stroke = '#f43f5e';
                  sw = 2.6;
                } else if (edge.relation === 'soft_trust_link') {
                  stroke = '#f59e0b';
                  dash = '4 3';
                  sw = 2;
                } else if (edge.relation === 'intruder_link') {
                  stroke = '#a855f7';
                  sw = 2.4;
                }
                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={sw}
                    strokeDasharray={dash || undefined}
                    opacity={edge.relation === 'uplink' ? 0.55 : 0.9}
                  />
                );
              })}

              {filteredNodes.map((n) => {
                const pt = layout.posMap.get(n.ip);
                if (!pt) return null;
                const isSel = selectedIp === n.ip;
                let fill = isLight ? '#ffffff' : '#0f172a';
                let stroke = isLight ? '#64748b' : '#38bdf8';
                if (n.tier === 'gateway') stroke = '#10b981';
                if (n.isSwitch && n.tier !== 'gateway') stroke = '#06b6d4';
                if (n.riskState === 'conflict') stroke = '#f43f5e';
                if (n.riskState === 'proxy_arp') stroke = '#0ea5e9';
                if (n.riskState === 'soft_trust') stroke = '#f59e0b';
                if (n.riskState === 'intruder') stroke = '#a855f7';

                const shortIpLabel = hasMultiBlockSubnet
                  ? n.ip.split('.').slice(-2).join('.')
                  : `.${n.ip.split('.')[3]}`;

                return (
                  <g
                    key={n.ip}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => onSelectIp(n.ip)}
                    className="cursor-pointer"
                  >
                    <circle
                      r={n.tier === 'gateway' ? 18 : n.isSwitch ? 15 : isSel ? 14 : 11}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSel ? 3.2 : 2}
                    />
                    <text
                      y={n.tier === 'gateway' ? 32 : 24}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="700"
                      fill={isLight ? '#1e293b' : '#e2e8f0'}
                    >
                      {shortIpLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Tiered Interactive Node Cards */}
          <div className="space-y-4">
            {tieredNodes.gateway.length > 0 && (
              <div className="space-y-2">
                <div className={`text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${mutedCls}`}>
                  <Router className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isKo ? 'Tier 1 · 게이트웨이 / 코어 라우터' : 'Tier 1 · Gateway / Core Router'}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {tieredNodes.gateway.map(renderNodeCard)}
                </div>
              </div>
            )}

            {tieredNodes.infra.length > 0 && (
              <div className="space-y-2">
                <div className={`text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${mutedCls}`}>
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isKo ? 'Tier 2 · 인프라 / Proxy-ARP / L3 스위치 · 스토리지' : 'Tier 2 · Infrastructure / Proxy-ARP / Storage'}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {tieredNodes.infra.map(renderNodeCard)}
                </div>
              </div>
            )}

            {(tieredNodes.endpoint.length > 0 || tieredNodes.vm.length > 0) && (
              <div className="space-y-2">
                <div className={`text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${mutedCls}`}>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isKo
                      ? `Tier 3 · 단말 호스트 & 가상화 노드 (${tieredNodes.endpoint.length + tieredNodes.vm.length})`
                      : `Tier 3 · Endpoints & Virtualized Nodes (${tieredNodes.endpoint.length + tieredNodes.vm.length})`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {[...tieredNodes.endpoint, ...tieredNodes.vm].map(renderNodeCard)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
