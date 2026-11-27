import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Box,
  Cable,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Disc,
  Download,
  GitFork,
  Layers,
  LocateFixed,
  Lock,
  Map as MapIcon,
  Maximize2,
  Monitor,
  Move,
  RefreshCw,
  RotateCcw,
  Router,
  Search,
  Server,
  ShieldAlert,
  X,
  ZoomIn,
  ZoomOut,
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
import {
  buildStandaloneTopologySvg,
  computeTopologyLayout,
  computeUplinkHighlightSet,
  exportMinimapAsPng,
  exportTopologyAsPng,
  exportTopologyAsSvg,
  getEdgeStrokeStyle,
  getLatencyHeatStyle,
  Point2D,
  TopologyLayoutMode,
} from '../services/topologyLayoutEngine';

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

interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;

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

  // Core topology modes & filters (Free-tier available)
  const [layoutMode, setLayoutMode] = useState<TopologyLayoutMode>('hierarchical');
  const [filterMode, setFilterMode] = useState<EdgeFilterMode>('all');
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedMatchIdx, setFocusedMatchIdx] = useState<number>(0);

  // Interactive camera & user manipulation state
  const [camera, setCamera] = useState<CameraState>({ panX: 0, panY: 0, zoom: 1 });
  const [customPositionsByKey, setCustomPositionsByKey] = useState<
    Record<string, Record<string, Point2D>>
  >({});
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(() => new Set());

  // Hover, mobile inspection & UI panels
  const [hoveredIp, setHoveredIp] = useState<string | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileFocusedIp, setMobileFocusedIp] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showNodeDrawer, setShowNodeDrawer] = useState<boolean>(false);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isExportingMinimap, setIsExportingMinimap] = useState<boolean>(false);
  const [isMinimapDragging, setIsMinimapDragging] = useState<boolean>(false);

  // PRO native correlation overlay
  const [isAnalyzingNative, setIsAnalyzingNative] = useState(false);
  const [nativeOverlay, setNativeOverlay] = useState<TopologyGraphPayload | null>(null);

  // Viewport sizing & gesture refs
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const minimapSvgRef = useRef<SVGSVGElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 920,
    height: 520,
  });

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragSessionRef = useRef<
    | {
        kind: 'pan';
        startX: number;
        startY: number;
        origPanX: number;
        origPanY: number;
      }
    | {
        kind: 'node';
        ip: string;
        startX: number;
        startY: number;
        origPos: Point2D;
        moved: boolean;
      }
    | {
        kind: 'pinch';
        initialDist: number;
        initialZoom: number;
        initialPanX: number;
        initialPanY: number;
        midX: number;
        midY: number;
      }
    | null
  >(null);
  const [minimapSize, setMinimapSize] = useState<{ width: number; height: number }>({
    width: 176,
    height: 112,
  });
  const minimapDragRef = useRef<
    | {
        mode: 'window';
        startClientX: number;
        startClientY: number;
        origPanX: number;
        origPanY: number;
        scale: number;
        zoom: number;
      }
    | {
        mode: 'jump';
      }
    | null
  >(null);
  const lastTapRef = useRef<{ ip: string; ts: number } | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const flashExportFeedback = useCallback((msg: string) => {
    setExportFeedback(msg);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setExportFeedback(null);
      feedbackTimerRef.current = null;
    }, 2200);
  }, []);

  const layoutKey = `${config.subnet}:${vlanTag || 'default'}:${layoutMode}`;
  const customPositions = customPositionsByKey[layoutKey] || {};
  const hasCustomPositions = Object.keys(customPositions).length > 0;

  useEffect(() => {
    setNativeOverlay(null);
    setMobileFocusedIp(null);
    setHoveredIp(null);
  }, [config.subnet, vlanTag]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 20 && height > 20) {
          setViewportSize({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = minimapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 20 && height > 20) {
          setMinimapSize({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showMinimap]);

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

  const filteredNodeSet = useMemo(
    () => new Set(filteredNodes.map((n) => n.ip)),
    [filteredNodes]
  );

  const layout = useMemo(
    () =>
      computeTopologyLayout({
        nodes: filteredNodes,
        edges: graph.edges,
        gatewayIp: graph.gatewayIp,
        mode: layoutMode,
        customPositions,
        collapsedClusters,
        isKo,
      }),
    [
      filteredNodes,
      graph.edges,
      graph.gatewayIp,
      layoutMode,
      customPositions,
      collapsedClusters,
      isKo,
    ]
  );

  // Search matching across IP, MAC, label, vendor, switch, ports
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchedNodeIps = useMemo(() => {
    if (!normalizedQuery) return [];
    return filteredNodes
      .filter((n) => {
        const portsStr = (n.openPorts || []).join(',');
        const haystack = [
          n.ip,
          n.mac || '',
          n.label || '',
          n.vendor || '',
          n.deviceType || '',
          n.switchName || '',
          n.switchPort || '',
          n.vlanId ? `v${n.vlanId}` : '',
          portsStr,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .map((n) => n.ip);
  }, [filteredNodes, normalizedQuery]);

  const matchedIpSet = useMemo(() => new Set(matchedNodeIps), [matchedNodeIps]);

  useEffect(() => {
    setFocusedMatchIdx(0);
  }, [normalizedQuery]);

  // Fit graph inside viewport cleanly
  const fitToScreen = useCallback(() => {
    const vw = viewportSize.width;
    const vh = viewportSize.height;
    if (vw < 40 || vh < 40) return;

    const padX = vw < 640 ? 28 : 56;
    const padY = vw < 640 ? 44 : 64;
    const bw = Math.max(200, layout.bounds.width);
    const bh = Math.max(160, layout.bounds.height);
    const scaleX = (vw - padX * 2) / bw;
    const scaleY = (vh - padY * 2) / bh;
    const targetZoom = Math.max(MIN_ZOOM, Math.min(1.25, Math.min(scaleX, scaleY)));

    const centerX = layout.bounds.minX + bw / 2;
    const centerY = layout.bounds.minY + bh / 2;
    setCamera({
      zoom: targetZoom,
      panX: vw / 2 - centerX * targetZoom,
      panY: vh / 2 - centerY * targetZoom,
    });
  }, [layout.bounds, viewportSize]);

  // Auto-fit on subnet/layout/filter changes or initial graph arrival
  const autoFitSignature = `${config.subnet}:${vlanTag || ''}:${layoutMode}:${filterMode}:${graph.nodes.length > 0 ? 'has' : 'empty'}`;
  const lastFitSigRef = useRef<string>('');
  useEffect(() => {
    if (graph.nodes.length === 0) return;
    if (lastFitSigRef.current !== autoFitSignature) {
      lastFitSigRef.current = autoFitSignature;
      fitToScreen();
    }
  }, [autoFitSignature, fitToScreen, graph.nodes.length]);

  const centerCameraOnPoint = useCallback(
    (pt: Point2D, targetZoom?: number) => {
      const z = targetZoom ?? Math.max(camera.zoom, 0.95);
      setCamera({
        zoom: z,
        panX: viewportSize.width / 2 - pt.x * z,
        panY: viewportSize.height / 2 - pt.y * z,
      });
    },
    [camera.zoom, viewportSize]
  );

  const resetViewToCenter = useCallback(() => {
    const centerX = layout.bounds.minX + layout.bounds.width / 2;
    const centerY = layout.bounds.minY + layout.bounds.height / 2;
    setCamera((prev) => ({
      ...prev,
      panX: viewportSize.width / 2 - centerX * prev.zoom,
      panY: viewportSize.height / 2 - centerY * prev.zoom,
    }));
  }, [layout.bounds, viewportSize]);

  const focusNodeByIp = useCallback(
    (ip: string) => {
      const clusterId = layout.nodeToClusterId.get(ip);
      if (clusterId && collapsedClusters.has(clusterId)) {
        setCollapsedClusters((prev) => {
          const next = new Set(prev);
          next.delete(clusterId);
          return next;
        });
      }
      const pt = layout.posMap.get(ip);
      if (pt) {
        centerCameraOnPoint(pt);
      }
    },
    [collapsedClusters, layout.nodeToClusterId, layout.posMap, centerCameraOnPoint]
  );

  const handleStepMatch = (delta: number) => {
    if (matchedNodeIps.length === 0) return;
    const nextIdx =
      (focusedMatchIdx + delta + matchedNodeIps.length) % matchedNodeIps.length;
    setFocusedMatchIdx(nextIdx);
    const targetIp = matchedNodeIps[nextIdx];
    focusNodeByIp(targetIp);
    setMobileFocusedIp(targetIp);
  };

  // Highlight path on hover (desktop) or selection (selectedIp / mobileFocusedIp)
  const activeHighlightIp = hoveredIp || mobileFocusedIp || selectedIp;
  const highlightSet = useMemo(
    () => computeUplinkHighlightSet(activeHighlightIp, graph),
    [activeHighlightIp, graph]
  );

  // Zoom anchored at viewport center or pointer
  const applyZoomAt = useCallback(
    (nextZoomRaw: number, anchorX?: number, anchorY?: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoomRaw));
      const ax = anchorX ?? viewportSize.width / 2;
      const ay = anchorY ?? viewportSize.height / 2;
      setCamera((prev) => {
        const worldX = (ax - prev.panX) / prev.zoom;
        const worldY = (ay - prev.panY) / prev.zoom;
        return {
          zoom: clamped,
          panX: ax - worldX * clamped,
          panY: ay - worldY * clamped,
        };
      });
    },
    [viewportSize]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    const ax = rect ? e.clientX - rect.left : viewportSize.width / 2;
    const ay = rect ? e.clientY - rect.top : viewportSize.height / 2;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    applyZoomAt(camera.zoom * factor, ax, ay);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only ignore interactive UI overlay buttons
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-topology-ui="true"]')) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture error
    }

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const rect = viewportRef.current?.getBoundingClientRect();
      const midX = ((pts[0].x + pts[1].x) / 2) - (rect?.left || 0);
      const midY = ((pts[0].y + pts[1].y) / 2) - (rect?.top || 0);
      dragSessionRef.current = {
        kind: 'pinch',
        initialDist: Math.max(10, Math.hypot(dx, dy)),
        initialZoom: camera.zoom,
        initialPanX: camera.panX,
        initialPanY: camera.panY,
        midX,
        midY,
      };
      return;
    }

    if (activePointersRef.current.size === 1) {
      dragSessionRef.current = {
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: camera.panX,
        origPanY: camera.panY,
      };
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, ip: string) => {
    e.stopPropagation();
    const pt = layout.posMap.get(ip);
    if (!pt) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (activePointersRef.current.size === 1) {
      dragSessionRef.current = {
        kind: 'node',
        ip,
        startX: e.clientX,
        startY: e.clientY,
        origPos: { ...pt },
        moved: false,
      };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const session = dragSessionRef.current;
    if (!session) return;

    if (session.kind === 'pinch' && activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const dist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const nextZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, session.initialZoom * (dist / session.initialDist))
      );
      const worldX = (session.midX - session.initialPanX) / session.initialZoom;
      const worldY = (session.midY - session.initialPanY) / session.initialZoom;
      setCamera({
        zoom: nextZoom,
        panX: session.midX - worldX * nextZoom,
        panY: session.midY - worldY * nextZoom,
      });
      return;
    }

    if (session.kind === 'pan') {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      setCamera((prev) => ({
        ...prev,
        panX: session.origPanX + dx,
        panY: session.origPanY + dy,
      }));
      return;
    }

    if (session.kind === 'node') {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      if (!session.moved && Math.hypot(dx, dy) < 5) {
        return;
      }
      session.moved = true;
      setHoveredIp(null);
      const nextPos: Point2D = {
        x: session.origPos.x + dx / camera.zoom,
        y: session.origPos.y + dy / camera.zoom,
      };
      setCustomPositionsByKey((prev) => ({
        ...prev,
        [layoutKey]: {
          ...(prev[layoutKey] || {}),
          [session.ip]: nextPos,
        },
      }));
    }
  };

  const handleNodeActivate = (ip: string) => {
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobileViewport) {
      const now = Date.now();
      const isDoubleTap =
        lastTapRef.current &&
        lastTapRef.current.ip === ip &&
        now - lastTapRef.current.ts < 350;
      lastTapRef.current = { ip, ts: now };
      setMobileFocusedIp(ip);
      if (isDoubleTap) {
        onSelectIp(ip);
      }
      return;
    }
    onSelectIp(ip);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (session && session.kind === 'node' && !session.moved) {
      handleNodeActivate(session.ip);
    }

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      dragSessionRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleToggleClusterCollapse = (clusterId: string) => {
    setCollapsedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  const handleResetCustomPositions = () => {
    setCustomPositionsByKey((prev) => {
      const copy = { ...prev };
      delete copy[layoutKey];
      return copy;
    });
  };

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

  const handleExportSvg = () => {
    const markup = buildStandaloneTopologySvg({
      graph,
      visibleNodes: filteredNodes,
      layout,
      theme,
      heatmapEnabled,
      isKo,
      selectedIp,
    });
    exportTopologyAsSvg(markup, config.subnet, layoutMode);
    flashExportFeedback(isKo ? 'SVG 저장됨' : 'SVG saved');
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    const markup = buildStandaloneTopologySvg({
      graph,
      visibleNodes: filteredNodes,
      layout,
      theme,
      heatmapEnabled,
      isKo,
      selectedIp,
    });
    const ok = await exportTopologyAsPng(markup, config.subnet, layoutMode);
    setIsExportingPng(false);
    if (ok) {
      flashExportFeedback(isKo ? 'PNG 저장됨' : 'PNG saved');
    }
  };

  const handleDownloadMinimap = async () => {
    const svgEl = minimapSvgRef.current;
    if (!svgEl) return;
    setIsExportingMinimap(true);
    const ok = await exportMinimapAsPng({
      svgElement: svgEl,
      width: minimapTransform.miniW,
      height: minimapTransform.miniH,
      theme,
      subnet: config.subnet,
      mode: layoutMode,
      zoomPct: Math.round(camera.zoom * 100),
      isKo,
    });
    setIsExportingMinimap(false);
    if (ok) {
      flashExportFeedback(isKo ? '미니맵 PNG 저장됨' : 'Minimap PNG saved');
    }
  };

  // Exact world <-> minimap pixel projection (matches SVG 1:1 with zero aspect distortion)
  const minimapTransform = useMemo(() => {
    const padWorld = 32;
    const worldMinX = layout.bounds.minX - padWorld;
    const worldMinY = layout.bounds.minY - padWorld;
    const worldW = Math.max(1, layout.bounds.width + padWorld * 2);
    const worldH = Math.max(1, layout.bounds.height + padWorld * 2);
    const miniW = Math.max(80, minimapSize.width);
    const miniH = Math.max(60, minimapSize.height);
    const scale = Math.min(miniW / worldW, miniH / worldH);
    const offsetX = (miniW - worldW * scale) / 2;
    const offsetY = (miniH - worldH * scale) / 2;
    return { worldMinX, worldMinY, worldW, worldH, miniW, miniH, scale, offsetX, offsetY };
  }, [layout.bounds, minimapSize]);

  const minimapViewWindow = useMemo(() => {
    const { worldMinX, worldMinY, scale, offsetX, offsetY } = minimapTransform;
    const viewWorldLeft = -camera.panX / camera.zoom;
    const viewWorldTop = -camera.panY / camera.zoom;
    const viewWorldW = viewportSize.width / camera.zoom;
    const viewWorldH = viewportSize.height / camera.zoom;
    return {
      x: offsetX + (viewWorldLeft - worldMinX) * scale,
      y: offsetY + (viewWorldTop - worldMinY) * scale,
      w: Math.max(14, viewWorldW * scale),
      h: Math.max(10, viewWorldH * scale),
    };
  }, [minimapTransform, camera, viewportSize]);

  // Clamp panned camera so the main viewport never gets lost off-graph when navigating via minimap
  const clampCameraToMinimapBounds = useCallback(
    (panX: number, panY: number, zoom: number) => {
      const { worldMinX, worldMinY, worldW, worldH } = minimapTransform;
      const viewCenterX = (viewportSize.width / 2 - panX) / zoom;
      const viewCenterY = (viewportSize.height / 2 - panY) / zoom;
      const clampedCenterX = Math.max(worldMinX, Math.min(worldMinX + worldW, viewCenterX));
      const clampedCenterY = Math.max(worldMinY, Math.min(worldMinY + worldH, viewCenterY));
      return {
        panX: viewportSize.width / 2 - clampedCenterX * zoom,
        panY: viewportSize.height / 2 - clampedCenterY * zoom,
        zoom,
      };
    },
    [minimapTransform, viewportSize]
  );

  const jumpCameraToMinimapClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const el = minimapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const mx = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const my = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const { worldMinX, worldMinY, worldW, worldH, scale, offsetX, offsetY } = minimapTransform;
      const rawWorldX = worldMinX + (mx - offsetX) / scale;
      const rawWorldY = worldMinY + (my - offsetY) / scale;
      const worldX = Math.max(worldMinX, Math.min(worldMinX + worldW, rawWorldX));
      const worldY = Math.max(worldMinY, Math.min(worldMinY + worldH, rawWorldY));
      centerCameraOnPoint({ x: worldX, y: worldY }, camera.zoom);
    },
    [minimapTransform, centerCameraOnPoint, camera.zoom]
  );

  const applyMinimapDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const session = minimapDragRef.current;
      if (!session) return;
      if (session.mode === 'window') {
        const dx = clientX - session.startClientX;
        const dy = clientY - session.startClientY;
        const dWorldX = dx / session.scale;
        const dWorldY = dy / session.scale;
        const nextPanX = session.origPanX - dWorldX * session.zoom;
        const nextPanY = session.origPanY - dWorldY * session.zoom;
        setCamera(clampCameraToMinimapBounds(nextPanX, nextPanY, session.zoom));
      } else {
        jumpCameraToMinimapClientPos(clientX, clientY);
      }
    },
    [clampCameraToMinimapBounds, jumpCameraToMinimapClientPos]
  );

  // Global pointer tracking fallback during minimap view-window drag so fast drags never drop
  useEffect(() => {
    if (!isMinimapDragging) return;

    const onWinPointerMove = (ev: PointerEvent) => {
      applyMinimapDragMove(ev.clientX, ev.clientY);
    };

    const endDrag = () => {
      minimapDragRef.current = null;
      setIsMinimapDragging(false);
    };

    window.addEventListener('pointermove', onWinPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onWinPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [isMinimapDragging, applyMinimapDragMove]);

  const surfaceCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#dcc7a1] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-white border-slate-200 text-slate-900'
      : theme === 'gray'
      ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
      : 'bg-slate-900/95 border-slate-800 text-slate-100';

  const floatingSurfaceCls =
    theme === 'beige'
      ? 'bg-[#f8f1e4]/95 border-[#d8c198] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-white/95 border-slate-200 text-slate-900'
      : theme === 'gray'
      ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100'
      : 'bg-slate-950/92 border-slate-800 text-slate-100';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const canvasBgCls =
    theme === 'beige'
      ? 'bg-[#f6efe2]'
      : theme === 'white'
      ? 'bg-slate-50'
      : theme === 'gray'
      ? 'bg-zinc-950'
      : 'bg-[#070d19]';

  const nodeByIp = useMemo(() => new Map(graph.nodes.map((n) => [n.ip, n])), [graph.nodes]);
  const clusterById = useMemo(
    () => new Map(layout.clusters.map((c) => [c.id, c])),
    [layout.clusters]
  );

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

  const anomalyCount = graph.nodes.filter(
    (n) => n.riskState === 'conflict' || n.riskState === 'intruder'
  ).length;
  const proxyCount = graph.nodes.filter((n) => n.riskState === 'proxy_arp').length;
  const l2MappedCount = graph.nodes.filter((n) => Boolean(n.switchPort)).length;

  const hasMultiBlockSubnet = useMemo(() => {
    const thirds = new Set(graph.nodes.map((n) => n.ip.split('.').slice(0, 3).join('.')));
    return thirds.size > 1;
  }, [graph.nodes]);

  const hoveredNode = hoveredIp ? nodeByIp.get(hoveredIp) || null : null;
  const mobileFocusedNode = mobileFocusedIp ? nodeByIp.get(mobileFocusedIp) || null : null;

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
      borderCls = isLight ? 'border-rose-400 bg-rose-50' : 'border-rose-500/70 bg-rose-950/30';
    } else if (node.riskState === 'intruder') {
      borderCls = isLight
        ? 'border-purple-400 bg-purple-50'
        : 'border-purple-500/70 bg-purple-950/30';
    } else if (node.riskState === 'proxy_arp') {
      borderCls = isLight ? 'border-sky-400 bg-sky-50' : 'border-sky-500/60 bg-sky-950/30';
    } else if (node.riskState === 'soft_trust') {
      borderCls = isLight ? 'border-amber-400 bg-amber-50' : 'border-amber-500/60 bg-amber-950/30';
    } else if (node.tier === 'gateway') {
      borderCls = isLight
        ? 'border-emerald-400 bg-emerald-50/70'
        : 'border-emerald-500/50 bg-emerald-950/25';
    }

    return (
      <button
        key={node.ip}
        type="button"
        onClick={() => {
          focusNodeByIp(node.ip);
          handleNodeActivate(node.ip);
        }}
        className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer min-w-[164px] max-w-[210px] ${borderCls} ${
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
          {typeof node.latencyMs === 'number' && node.latencyMs >= 0 && (
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
      </button>
    );
  };

  if (graph.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`max-w-md w-full p-6 rounded-xl border text-center space-y-3 ${surfaceCls}`}>
          <NetworkIcon className="w-8 h-8 text-sky-500 mx-auto" />
          <h3 className="text-sm font-bold">
            {isKo ? '표시할 토폴로지 노드가 없습니다' : 'No Topology Nodes to Visualize'}
          </h3>
          <p className={`text-xs leading-relaxed ${mutedCls}`}>
            {isKo
              ? '서브넷 스캔을 먼저 실행하면 게이트웨이, 스위치, 단말 간 계층·그룹·방사형 토폴로지와 지연시간 히트맵을 시각화합니다.'
              : 'Run a subnet scan to visualize hierarchical, cluster, and radial network topology along with RTT heatmaps and uplink path tracing.'}
          </p>
          <button
            type="button"
            disabled={isScanning}
            onClick={onStartScan}
            className="px-4 py-2.5 min-h-[44px] rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isKo ? '현재 대역 스캔 시작' : 'Start Subnet Scan'}
          </button>
        </div>
      </div>
    );
  }

  // Deduplicated edges for collapsed clusters
  const renderedEdges: Array<{
    key: string;
    p1: Point2D;
    p2: Point2D;
    fromIp: string;
    toIp: string;
    edgeId: string;
    relation: (typeof graph.edges)[number]['relation'];
    toLatencyMs?: number;
    label?: string;
  }> = [];
  const seenClusterPairs = new Set<string>();

  graph.edges.forEach((edge) => {
    if (!filteredNodeSet.has(edge.fromIp) || !filteredNodeSet.has(edge.toIp)) return;
    const fromHidden = layout.hiddenNodeIps.has(edge.fromIp);
    const toHidden = layout.hiddenNodeIps.has(edge.toIp);
    const fromCid = layout.nodeToClusterId.get(edge.fromIp);
    const toCid = layout.nodeToClusterId.get(edge.toIp);
    if (fromHidden && toHidden && fromCid && fromCid === toCid) return;

    const p1 =
      fromHidden && fromCid
        ? (() => {
            const cl = clusterById.get(fromCid);
            return cl ? { x: cl.anchorX, y: cl.anchorY } : layout.posMap.get(edge.fromIp);
          })()
        : layout.posMap.get(edge.fromIp);
    const p2 =
      toHidden && toCid
        ? (() => {
            const cl = clusterById.get(toCid);
            return cl ? { x: cl.anchorX, y: cl.anchorY } : layout.posMap.get(edge.toIp);
          })()
        : layout.posMap.get(edge.toIp);

    if (!p1 || !p2) return;
    if (fromHidden || toHidden) {
      const ck = `${fromHidden ? fromCid : edge.fromIp}->${toHidden ? toCid : edge.toIp}`;
      if (seenClusterPairs.has(ck)) return;
      seenClusterPairs.add(ck);
    }

    renderedEdges.push({
      key: edge.id,
      p1,
      p2,
      fromIp: edge.fromIp,
      toIp: edge.toIp,
      edgeId: edge.id,
      relation: edge.relation,
      toLatencyMs: nodeByIp.get(edge.toIp)?.latencyMs,
      label: edge.label,
    });
  });

  const zoomPct = Math.round(camera.zoom * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 md:p-3 gap-2 overflow-hidden">
      {/* Compact Unified Toolbar */}
      <div
        data-topology-ui="true"
        className={`px-2.5 md:px-3.5 py-2 rounded-lg border flex flex-col gap-2 shrink-0 ${surfaceCls}`}
      >
        {/* Row 1: Layout Switcher, Search, Primary Visualization Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* 3-Mode Layout Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-current/15 overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                {
                  id: 'hierarchical' as TopologyLayoutMode,
                  labelKo: '계층형',
                  labelEn: 'Hierarchy',
                  icon: <GitFork className="w-3.5 h-3.5 shrink-0" />,
                },
                {
                  id: 'cluster' as TopologyLayoutMode,
                  labelKo: '스위치·VLAN 그룹',
                  labelEn: 'Cluster',
                  icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
                },
                {
                  id: 'radial' as TopologyLayoutMode,
                  labelKo: '방사형',
                  labelEn: 'Radial',
                  icon: <Disc className="w-3.5 h-3.5 shrink-0" />,
                },
              ]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLayoutMode(m.id)}
                className={`px-2.5 py-1.5 min-h-[36px] md:min-h-0 rounded-md text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  layoutMode === m.id
                    ? 'bg-sky-600 text-white'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                {m.icon}
                <span>{isKo ? m.labelKo : m.labelEn}</span>
              </button>
            ))}
          </div>

          {/* Search Input + Jump */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px] max-w-xs">
            <div className="relative flex-1 min-w-0">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${mutedCls}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matchedNodeIps.length > 0) {
                    e.preventDefault();
                    handleStepMatch(e.shiftKey ? -1 : 1);
                  } else if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                placeholder={isKo ? 'IP · MAC · 호스트 · 포트 검색' : 'Search IP, MAC, host, port'}
                className={`w-full pl-8 pr-7 py-1.5 min-h-[36px] md:min-h-0 rounded-md border text-[11px] font-mono bg-transparent outline-none focus:border-sky-500 ${
                  isLight ? 'border-slate-300' : 'border-slate-700'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 cursor-pointer"
                  title={isKo ? '검색 초기화' : 'Clear search'}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {normalizedQuery && (
              <div className="flex items-center gap-0.5 shrink-0 font-mono tabular-nums text-[10.5px]">
                <span className={`px-1 ${matchedNodeIps.length > 0 ? 'text-sky-400 font-bold' : mutedCls}`}>
                  {matchedNodeIps.length > 0
                    ? `${focusedMatchIdx + 1}/${matchedNodeIps.length}`
                    : '0'}
                </span>
                <button
                  type="button"
                  disabled={matchedNodeIps.length === 0}
                  onClick={() => handleStepMatch(-1)}
                  className="p-1.5 rounded border border-current/15 hover:border-sky-500/60 disabled:opacity-35 cursor-pointer"
                  title={isKo ? '이전 일치 노드' : 'Previous match'}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={matchedNodeIps.length === 0}
                  onClick={() => handleStepMatch(1)}
                  className="p-1.5 rounded border border-current/15 hover:border-sky-500/60 disabled:opacity-35 cursor-pointer"
                  title={isKo ? '다음 일치 노드' : 'Next match'}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Right Quick Actions: Heatmap, Export SVG/PNG, Mobile More Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setHeatmapEnabled((v) => !v)}
              className={`px-2.5 py-1.5 min-h-[36px] md:min-h-0 rounded-md border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                heatmapEnabled
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-current/20 opacity-80 hover:opacity-100'
              }`}
              title={
                isKo
                  ? '응답 지연시간(RTT ms) 기반 링크/노드 색상 히트맵'
                  : 'Toggle RTT latency heatmap'
              }
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>{isKo ? 'RTT 히트맵' : 'RTT Heatmap'}</span>
            </button>

            <div className="flex items-center border rounded-md border-current/20 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={handleExportSvg}
                className="px-2 py-1.5 min-h-[36px] md:min-h-0 text-[11px] font-bold flex items-center gap-1 hover:bg-sky-500/15 cursor-pointer whitespace-nowrap"
                title={isKo ? '벡터 SVG 이미지로 내보내기' : 'Export vector SVG'}
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>SVG</span>
              </button>
              <span className="w-px h-4 bg-current opacity-15" aria-hidden="true" />
              <button
                type="button"
                disabled={isExportingPng}
                onClick={handleExportPng}
                className="px-2 py-1.5 min-h-[36px] md:min-h-0 text-[11px] font-bold hover:bg-sky-500/15 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title={isKo ? '고해상도 PNG 이미지로 내보내기' : 'Export 2x PNG'}
              >
                {isExportingPng ? '...' : 'PNG'}
              </button>
            </div>

            {exportFeedback && (
              <span className="text-[10.5px] font-mono font-bold text-emerald-500 whitespace-nowrap">
                {exportFeedback}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowMobileControls((v) => !v)}
              className="md:hidden px-2 py-1.5 min-h-[36px] rounded-md border border-current/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>{isKo ? '필터·PRO' : 'More'}</span>
              {showMobileControls ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Edge Filters + SNMP L2 & Native Security Guard */}
        <div
          className={`${
            showMobileControls ? 'flex' : 'hidden md:flex'
          } items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-current/10`}
        >
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'all', labelKo: `전체 (${graph.nodes.length})`, labelEn: `All (${graph.nodes.length})` },
                { id: 'threats', labelKo: `위협·충돌 (${anomalyCount})`, labelEn: `Threats (${anomalyCount})` },
                { id: 'proxy_arp', labelKo: `Proxy-ARP (${proxyCount})`, labelEn: `Proxy-ARP (${proxyCount})` },
                { id: 'soft_trust', labelKo: '유예·신뢰', labelEn: 'Soft-Trust' },
                { id: 'l2_mapped', labelKo: `L2 포트 (${l2MappedCount})`, labelEn: `L2 Ports (${l2MappedCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id)}
                className={`px-2 py-1 rounded text-[11px] font-bold font-mono tabular-nums cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  filterMode === f.id
                    ? 'bg-sky-600/90 text-white'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {isKo ? f.labelKo : f.labelEn}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
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
                  <Cable className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3 h-3 shrink-0" />
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 ${
                featureGates.topologySecurityPro
                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                  : isLight
                  ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                  : 'bg-amber-500/10 border border-amber-500/35 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              {featureGates.topologySecurityPro ? (
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isAnalyzingNative ? 'animate-spin' : ''}`} />
              ) : (
                <Lock className="w-3 h-3 shrink-0" />
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
      </div>

      {/* Main Interactive Topology Canvas (Focal Anchor) */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className={`flex-1 min-h-[280px] rounded-xl border relative overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing ${canvasBgCls} ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(rgba(15,23,42,0.08) 1px, transparent 1px)'
            : 'radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        {/* Top-left Clean Unboxed Telemetry Metadata */}
        <div
          data-topology-ui="true"
          className={`absolute top-2.5 left-3 z-20 pointer-events-none flex items-center gap-2 flex-wrap text-[10.5px] font-mono tabular-nums px-2 py-1 rounded-md backdrop-blur-sm ${
            isLight ? 'bg-white/75 text-slate-700' : 'bg-slate-950/65 text-slate-300'
          }`}
        >
          <span>
            L3 GW <strong className="text-emerald-500">{graph.gatewayIp}</strong>
          </span>
          {vlanTag && (
            <>
              <span aria-hidden="true">·</span>
              <span>{vlanTag}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {filteredNodes.length}/{graph.nodes.length} {isKo ? '노드' : 'nodes'}
          </span>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline opacity-75">
            {graph.engine} · {graph.elapsedMicroseconds}µs
          </span>
        </div>

        {/* World Transform Layer */}
        <div
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.zoom})`,
          }}
        >
          <svg
            width={Math.max(1200, layout.bounds.maxX + 400)}
            height={Math.max(900, layout.bounds.maxY + 400)}
            className="overflow-visible ui-scale-reset"
          >
            {/* Radial Concentric Guides */}
            {layoutMode === 'radial' && layout.radialCenter && layout.radialRingRadii && (
              <g pointerEvents="none">
                {layout.radialRingRadii.map((r, i) => (
                  <circle
                    key={`ring-${i}`}
                    cx={layout.radialCenter!.x}
                    cy={layout.radialCenter!.y}
                    r={r}
                    fill="none"
                    stroke={isLight ? '#cbd5e1' : '#1e293b'}
                    strokeWidth={1.2}
                    strokeDasharray="4 6"
                  />
                ))}
              </g>
            )}

            {/* Cluster Boundary Containers */}
            {layoutMode === 'cluster' &&
              layout.clusters.map((cluster) => {
                const isCollapsed = cluster.collapsed;
                const boxBg =
                  theme === 'beige'
                    ? '#f5ecdc'
                    : theme === 'white'
                    ? '#ffffff'
                    : theme === 'gray'
                    ? '#202024'
                    : '#0c1425';
                const boxStroke =
                  cluster.threatCount > 0
                    ? '#f43f5e'
                    : cluster.kind === 'switch'
                    ? '#06b6d4'
                    : cluster.kind === 'gateway'
                    ? '#10b981'
                    : isLight
                    ? '#cbd5e1'
                    : '#1e293b';

                return (
                  <g key={cluster.id}>
                    <rect
                      x={cluster.x}
                      y={cluster.y}
                      width={cluster.width}
                      height={cluster.height}
                      rx={12}
                      fill={boxBg}
                      fillOpacity={0.86}
                      stroke={boxStroke}
                      strokeWidth={isCollapsed ? 1.8 : 1.2}
                    />
                    {/* Interactive Cluster Header (Collapse / Expand) */}
                    {cluster.kind !== 'gateway' ? (
                      <g
                        className="cursor-pointer"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleClusterCollapse(cluster.id);
                        }}
                      >
                        <rect
                          x={cluster.x + 1}
                          y={cluster.y + 1}
                          width={cluster.width - 2}
                          height={40}
                          rx={11}
                          fill="transparent"
                        />
                        <text
                          x={cluster.x + 14}
                          y={cluster.y + 19}
                          fontSize="11.5"
                          fontWeight="700"
                          fill={isLight ? '#0f172a' : '#f1f5f9'}
                        >
                          {isCollapsed ? '+ ' : '− '}
                          {cluster.title.slice(0, 26)}
                        </text>
                        <text
                          x={cluster.x + 14}
                          y={cluster.y + 34}
                          fontSize="9.5"
                          fontFamily="monospace"
                          fill={isLight ? '#64748b' : '#94a3b8'}
                        >
                          {cluster.subtitle} · {cluster.nodeCount}
                          {isKo ? '대' : ' nodes'}
                          {cluster.avgLatencyMs ? ` · ~${cluster.avgLatencyMs}ms` : ''}
                          {cluster.threatCount > 0 ? ` · ${cluster.threatCount} !` : ''}
                        </text>
                        {isCollapsed && (
                          <text
                            x={cluster.anchorX}
                            y={cluster.y + 62}
                            textAnchor="middle"
                            fontSize="10.5"
                            fontFamily="monospace"
                            fontWeight="700"
                            fill="#38bdf8"
                          >
                            {isKo ? '클릭하여 펼치기' : 'Click to expand'}
                          </text>
                        )}
                      </g>
                    ) : (
                      <g pointerEvents="none">
                        <text
                          x={cluster.x + 14}
                          y={cluster.y + 19}
                          fontSize="11"
                          fontWeight="700"
                          fill="#10b981"
                        >
                          {cluster.title}
                        </text>
                        <text
                          x={cluster.x + cluster.width - 14}
                          y={cluster.y + 19}
                          textAnchor="end"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fill={isLight ? '#64748b' : '#94a3b8'}
                        >
                          {cluster.subtitle}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Edges */}
            {renderedEdges.map((edge) => {
              const style = getEdgeStrokeStyle(
                edge.relation,
                isLight,
                edge.toLatencyMs,
                heatmapEnabled
              );

              const inPath = highlightSet ? highlightSet.edgeIds.has(edge.edgeId) : false;
              const searchActive = Boolean(normalizedQuery);
              const inSearch =
                !searchActive ||
                matchedIpSet.has(edge.fromIp) ||
                matchedIpSet.has(edge.toIp);

              let opacity = style.baseOpacity;
              if (highlightSet) {
                opacity = inPath ? 1 : 0.14;
              } else if (searchActive) {
                opacity = inSearch ? 0.92 : 0.14;
              }

              let d: string;
              if (layoutMode === 'radial') {
                d = `M ${edge.p1.x} ${edge.p1.y} L ${edge.p2.x} ${edge.p2.y}`;
              } else {
                const midY = (edge.p1.y + edge.p2.y) / 2;
                d = `M ${edge.p1.x} ${edge.p1.y} C ${edge.p1.x} ${midY}, ${edge.p2.x} ${midY}, ${edge.p2.x} ${edge.p2.y}`;
              }

              const midLabelX = (edge.p1.x + edge.p2.x) / 2;
              const midLabelY = (edge.p1.y + edge.p2.y) / 2;

              return (
                <g key={edge.key}>
                  <path
                    d={d}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={inPath ? style.strokeWidth + 1.4 : style.strokeWidth}
                    strokeDasharray={style.dash}
                    opacity={opacity}
                    strokeLinecap="round"
                  />
                  {inPath && (edge.label || (heatmapEnabled && typeof edge.toLatencyMs === 'number' && edge.toLatencyMs >= 0)) && (
                    <text
                      x={midLabelX}
                      y={midLabelY - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="700"
                      fill={isLight ? '#0f172a' : '#f8fafc'}
                      pointerEvents="none"
                    >
                      {heatmapEnabled && typeof edge.toLatencyMs === 'number' && edge.toLatencyMs >= 0
                        ? `${edge.toLatencyMs}ms${edge.label ? ` · ${edge.label}` : ''}`
                        : edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((n) => {
              if (layout.hiddenNodeIps.has(n.ip)) return null;
              const pt = layout.posMap.get(n.ip);
              if (!pt) return null;

              const isSel = selectedIp === n.ip || mobileFocusedIp === n.ip;
              const isHov = hoveredIp === n.ip;
              const isMatch = matchedIpSet.has(n.ip);
              const isFocusedMatch =
                matchedNodeIps.length > 0 && matchedNodeIps[focusedMatchIdx] === n.ip;

              const inPath = highlightSet ? highlightSet.nodeIds.has(n.ip) : true;
              const inSearch = !normalizedQuery || isMatch;

              let nodeOpacity = 1;
              if (highlightSet && !inPath) nodeOpacity = 0.22;
              else if (normalizedQuery && !inSearch) nodeOpacity = 0.2;

              const fill =
                theme === 'beige'
                  ? '#fcf8f2'
                  : isLight
                  ? '#ffffff'
                  : theme === 'gray'
                  ? '#18181b'
                  : '#0f172a';
              let stroke = isLight ? '#64748b' : '#38bdf8';
              if (n.tier === 'gateway') stroke = '#10b981';
              if (n.isSwitch && n.tier !== 'gateway') stroke = '#06b6d4';
              if (n.riskState === 'conflict') stroke = '#f43f5e';
              if (n.riskState === 'proxy_arp') stroke = '#0ea5e9';
              if (n.riskState === 'soft_trust') stroke = '#f59e0b';
              if (n.riskState === 'intruder') stroke = '#a855f7';

              if (heatmapEnabled && typeof n.latencyMs === 'number' && n.latencyMs >= 0 && n.riskState === 'normal') {
                stroke = getLatencyHeatStyle(n.latencyMs, isLight).color;
              }

              const r = n.tier === 'gateway' ? 19 : n.isSwitch ? 16 : isSel ? 14 : 12;
              const shortIpLabel = hasMultiBlockSubnet
                ? n.ip.split('.').slice(-2).join('.')
                : `.${n.ip.split('.')[3]}`;
              const shortHost =
                n.label && n.label !== n.ip
                  ? n.label.length > 13
                    ? `${n.label.slice(0, 12)}…`
                    : n.label
                  : '';

              return (
                <g
                  key={n.ip}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  opacity={nodeOpacity}
                  className="cursor-pointer"
                  onPointerDown={(e) => handleNodePointerDown(e, n.ip)}
                  onPointerEnter={(e) => {
                    if (dragSessionRef.current) return;
                    const rect = viewportRef.current?.getBoundingClientRect();
                    setHoveredIp(n.ip);
                    if (rect) {
                      setHoverScreenPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onPointerMove={(e) => {
                    if (dragSessionRef.current || hoveredIp !== n.ip) return;
                    const rect = viewportRef.current?.getBoundingClientRect();
                    if (rect) {
                      setHoverScreenPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onPointerLeave={() => {
                    if (hoveredIp === n.ip) {
                      setHoveredIp(null);
                    }
                  }}
                >
                  {/* Invisible generous touch/pointer hit circle */}
                  <circle r={Math.max(22, r + 8)} fill="transparent" />

                  {(isSel || isFocusedMatch || isMatch) && (
                    <circle
                      r={r + (isFocusedMatch ? 8 : 5)}
                      fill="none"
                      stroke={isFocusedMatch ? '#f59e0b' : '#38bdf8'}
                      strokeWidth={isFocusedMatch ? 2.5 : 1.8}
                      strokeDasharray={isMatch && !isSel ? '3 2' : undefined}
                      opacity={0.9}
                    />
                  )}

                  {n.tier === 'gateway' ? (
                    <polygon
                      points="0,-20 18,-10 18,10 0,20 -18,10 -18,-10"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSel || isHov ? 3.2 : 2.5}
                    />
                  ) : n.isSwitch ? (
                    <rect
                      x={-15}
                      y={-15}
                      width={30}
                      height={30}
                      rx={6}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSel || isHov ? 3.2 : 2.3}
                    />
                  ) : (
                    <circle
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSel || isHov ? 3.2 : 2.1}
                    />
                  )}

                  {/* Local Scanner Host Marker */}
                  {n.isHost && (
                    <circle cx={r - 2} cy={-r + 2} r={4} fill="#10b981" stroke={fill} strokeWidth={1.2} />
                  )}

                  {/* Center Glyph Text */}
                  <text
                    y={3.5}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="700"
                    fill={stroke}
                    pointerEvents="none"
                  >
                    {n.tier === 'gateway'
                      ? 'GW'
                      : n.isSwitch
                      ? 'SW'
                      : n.tier === 'vm'
                      ? 'VM'
                      : n.openPortCount > 0
                      ? `${n.openPortCount}p`
                      : ''}
                  </text>

                  {/* IP & Latency Caption */}
                  <text
                    y={r + 13}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontFamily="monospace"
                    fontWeight="700"
                    fill={isLight ? '#0f172a' : '#f1f5f9'}
                    pointerEvents="none"
                  >
                    {shortIpLabel}
                  </text>
                  {(shortHost || (heatmapEnabled && typeof n.latencyMs === 'number' && n.latencyMs >= 0)) && (
                    <text
                      y={r + 24}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fill={
                        heatmapEnabled && typeof n.latencyMs === 'number' && n.latencyMs >= 0
                          ? getLatencyHeatStyle(n.latencyMs, isLight).color
                          : isLight
                          ? '#64748b'
                          : '#94a3b8'
                      }
                      pointerEvents="none"
                    >
                      {heatmapEnabled && typeof n.latencyMs === 'number' && n.latencyMs >= 0
                        ? `${n.latencyMs}ms${shortHost ? ` · ${shortHost}` : ''}`
                        : shortHost}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Desktop Floating Hover Tooltip */}
        {hoveredNode && hoverScreenPos && (
          <div
            data-topology-ui="true"
            className={`hidden md:block absolute z-30 pointer-events-none w-64 p-3 rounded-lg border shadow-xl backdrop-blur-md text-xs ${floatingSurfaceCls}`}
            style={{
              left: Math.min(Math.max(12, hoverScreenPos.x + 16), Math.max(12, viewportSize.width - 272)),
              top: Math.min(Math.max(12, hoverScreenPos.y + 14), Math.max(12, viewportSize.height - 175)),
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums font-bold text-[12.5px]">
                {hoveredNode.ip}
              </span>
              {typeof hoveredNode.latencyMs === 'number' && hoveredNode.latencyMs >= 0 && (
                <span
                  className="font-mono tabular-nums text-[11px] font-bold"
                  style={{ color: getLatencyHeatStyle(hoveredNode.latencyMs, isLight).color }}
                >
                  {hoveredNode.latencyMs}ms
                </span>
              )}
            </div>
            <div className="font-semibold truncate mt-0.5">{hoveredNode.label}</div>
            <div className={`text-[10.5px] font-mono tabular-nums mt-1 space-y-0.5 ${mutedCls}`}>
              <div>MAC: {hoveredNode.mac || (hoveredNode.isActive === false ? 'Inferred GW' : '—')}</div>
              {hoveredNode.vendor && <div className="truncate">Vendor: {hoveredNode.vendor}</div>}
              {hoveredNode.switchPort && (
                <div className="text-cyan-500 font-bold truncate">
                  {hoveredNode.switchName || hoveredNode.switchIp} · {hoveredNode.switchPort}
                  {hoveredNode.vlanId ? ` · V${hoveredNode.vlanId}` : ''}
                </div>
              )}
              {hoveredNode.openPorts && hoveredNode.openPorts.length > 0 && (
                <div className="truncate">
                  Ports: {hoveredNode.openPorts.slice(0, 6).join(', ')}
                  {hoveredNode.openPorts.length > 6 ? ` +${hoveredNode.openPorts.length - 6}` : ''}
                </div>
              )}
              {hoveredNode.reason && (
                <div className="text-amber-500 font-semibold truncate">{hoveredNode.reason}</div>
              )}
            </div>
          </div>
        )}

        {/* Bottom-Left Camera Controls + Legend Popover */}
        <div
          data-topology-ui="true"
          className={`absolute left-3 z-20 flex flex-col items-start gap-2 transition-all ${
            showMinimap ? 'bottom-[170px] sm:bottom-3' : 'bottom-3'
          }`}
        >
          {showLegend && (
            <div className={`p-3 rounded-lg border shadow-lg backdrop-blur-md text-[10.5px] space-y-1.5 max-w-[270px] ${floatingSurfaceCls}`}>
              <div className="font-bold">
                {heatmapEnabled
                  ? isKo
                    ? 'RTT 지연시간 히트맵 범례'
                    : 'RTT Latency Heatmap Legend'
                  : isKo
                  ? '토폴로지 범례'
                  : 'Topology Legend'}
              </div>
              {heatmapEnabled ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono tabular-nums">
                  <span className="text-emerald-500">━ &lt;15ms {isKo ? '쾌적' : 'Fast'}</span>
                  <span className="text-sky-500">━ 15–59ms {isKo ? '보통' : 'Normal'}</span>
                  <span className="text-amber-500">━ 60–149ms {isKo ? '지연' : 'Slow'}</span>
                  <span className="text-rose-500">━ 150ms+ {isKo ? '병목' : 'High'}</span>
                </div>
              ) : (
                <div className={`grid grid-cols-2 gap-x-3 gap-y-1 font-mono ${mutedCls}`}>
                  <span>⬡ Gateway (L3)</span>
                  <span className="text-cyan-500">▢ Switch / L2</span>
                  <span className="text-emerald-500">┄ Switch Uplink</span>
                  <span className="text-rose-500">━ Conflict</span>
                  <span className="text-sky-500">┄ Proxy-ARP</span>
                  <span className="text-purple-400">━ Intruder</span>
                </div>
              )}
              <div className={`text-[10px] pt-1 border-t border-current/10 ${mutedCls}`}>
                {isKo
                  ? '배경 드래그: 이동 · 노드 드래그: 재배치 · 휠/핀치: 확대'
                  : 'Drag bg: Pan · Drag node: Move · Wheel/Pinch: Zoom'}
              </div>
            </div>
          )}

          <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-md backdrop-blur-md ${floatingSurfaceCls}`}>
            <button
              type="button"
              onClick={() => applyZoomAt(camera.zoom / 1.18)}
              className="p-2 md:p-1.5 rounded hover:bg-current/10 cursor-pointer"
              title={isKo ? '축소' : 'Zoom Out'}
            >
              <ZoomOut className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums font-bold px-1.5 min-w-[44px] text-center">
              {zoomPct}%
            </span>
            <button
              type="button"
              onClick={() => applyZoomAt(camera.zoom * 1.18)}
              className="p-2 md:p-1.5 rounded hover:bg-current/10 cursor-pointer"
              title={isKo ? '확대' : 'Zoom In'}
            >
              <ZoomIn className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
            <span className="w-px h-4 bg-current opacity-15" aria-hidden="true" />
            <button
              type="button"
              onClick={fitToScreen}
              className="px-2 py-1.5 md:py-1 rounded hover:bg-current/10 cursor-pointer text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
              title={isKo ? '전체 화면 맞춤' : 'Fit to Screen'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isKo ? '맞춤' : 'Fit'}</span>
            </button>
            {hasCustomPositions && (
              <button
                type="button"
                onClick={handleResetCustomPositions}
                className="px-2 py-1.5 md:py-1 rounded hover:bg-amber-500/15 text-amber-500 cursor-pointer text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                title={isKo ? '수동 이동한 노드 위치 초기화' : 'Reset custom node positions'}
              >
                <Move className="w-3.5 h-3.5" />
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <span className="w-px h-4 bg-current opacity-15" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              className={`px-2 py-1.5 md:py-1 rounded cursor-pointer text-[11px] font-bold whitespace-nowrap ${
                showLegend ? 'bg-sky-600 text-white' : 'hover:bg-current/10'
              }`}
            >
              {isKo ? '범례' : 'Key'}
            </button>
          </div>
        </div>

        {/* Bottom-Right Interactive Minimap Overlay */}
        <div
          data-topology-ui="true"
          className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5"
        >
          {showMinimap ? (
            <div className={`p-1.5 rounded-lg border shadow-lg backdrop-blur-md ${floatingSurfaceCls}`}>
              <div className="flex items-center justify-between gap-1.5 px-1 pb-1 text-[10px] font-mono">
                <div className="flex items-center gap-1 min-w-0">
                  <MapIcon className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="font-bold opacity-85 truncate">{isKo ? '미니맵' : 'Minimap'}</span>
                  <span className="opacity-55 tabular-nums shrink-0">{zoomPct}%</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={fitToScreen}
                    className="px-1.5 py-0.5 rounded opacity-70 hover:opacity-100 hover:bg-current/10 cursor-pointer text-[9.5px] font-semibold whitespace-nowrap transition-colors"
                    title={isKo ? '전체 맞춤 (더블클릭)' : 'Fit Graph (Double-click)'}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMinimap(false)}
                    className="p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                    title={isKo ? '미니맵 닫기' : 'Hide minimap'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div
                ref={minimapRef}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  fitToScreen();
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  const factor = e.deltaY < 0 ? 1.12 : 0.89;
                  applyZoomAt(camera.zoom * factor);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const el = minimapRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const mx = e.clientX - rect.left;
                  const my = e.clientY - rect.top;

                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Window-level pointer listeners handle fallback automatically
                  }

                  const hitPad = 4;
                  const insideWindow =
                    mx >= minimapViewWindow.x - hitPad &&
                    mx <= minimapViewWindow.x + minimapViewWindow.w + hitPad &&
                    my >= minimapViewWindow.y - hitPad &&
                    my <= minimapViewWindow.y + minimapViewWindow.h + hitPad;

                  if (insideWindow) {
                    minimapDragRef.current = {
                      mode: 'window',
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origPanX: camera.panX,
                      origPanY: camera.panY,
                      scale: minimapTransform.scale,
                      zoom: camera.zoom,
                    };
                  } else {
                    minimapDragRef.current = { mode: 'jump' };
                    jumpCameraToMinimapClientPos(e.clientX, e.clientY);
                  }
                  setIsMinimapDragging(true);
                }}
                onPointerMove={(e) => {
                  if (!minimapDragRef.current) return;
                  e.stopPropagation();
                  applyMinimapDragMove(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  minimapDragRef.current = null;
                  setIsMinimapDragging(false);
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // Ignore
                  }
                }}
                onPointerCancel={(e) => {
                  minimapDragRef.current = null;
                  setIsMinimapDragging(false);
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // Ignore
                  }
                }}
                className={`relative w-56 h-24 sm:w-60 sm:h-28 rounded border overflow-hidden select-none touch-none ${
                  isMinimapDragging ? 'cursor-grabbing' : 'cursor-crosshair'
                } ${
                  isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
                }`}
                title={
                  isKo
                    ? '파란 뷰 창을 드래그해 이동 · 빈 곳 클릭 시 즉시 점프 · 더블클릭 시 맞춤'
                    : 'Drag view window to pan · Click to jump · Double-click to fit'
                }
              >
                <svg
                  ref={minimapSvgRef}
                  width={minimapTransform.miniW}
                  height={minimapTransform.miniH}
                  viewBox={`0 0 ${minimapTransform.miniW} ${minimapTransform.miniH}`}
                  className="w-full h-full block"
                >
                  <defs>
                    <mask id="topology-minimap-scrim">
                      <rect
                        x={0}
                        y={0}
                        width={minimapTransform.miniW}
                        height={minimapTransform.miniH}
                        fill="#ffffff"
                      />
                      <rect
                        x={minimapViewWindow.x}
                        y={minimapViewWindow.y}
                        width={minimapViewWindow.w}
                        height={minimapViewWindow.h}
                        rx={2}
                        fill="#000000"
                      />
                    </mask>
                  </defs>

                  <g
                    transform={`translate(${minimapTransform.offsetX}, ${minimapTransform.offsetY}) scale(${minimapTransform.scale}) translate(${-minimapTransform.worldMinX}, ${-minimapTransform.worldMinY})`}
                    pointerEvents="none"
                  >
                    {layoutMode === 'radial' && layout.radialCenter && layout.radialRingRadii && (
                      <g>
                        {layout.radialRingRadii.map((r, i) => (
                          <circle
                            key={`mini-ring-${i}`}
                            cx={layout.radialCenter!.x}
                            cy={layout.radialCenter!.y}
                            r={r}
                            fill="none"
                            stroke={isLight ? '#cbd5e1' : '#1e293b'}
                            strokeWidth={1 / minimapTransform.scale}
                          />
                        ))}
                      </g>
                    )}

                    {layoutMode === 'cluster' &&
                      layout.clusters.map((c) => (
                        <rect
                          key={`mini-c-${c.id}`}
                          x={c.x}
                          y={c.y}
                          width={c.width}
                          height={c.height}
                          rx={8}
                          fill={isLight ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.7)'}
                          stroke={
                            c.threatCount > 0
                              ? '#f43f5e'
                              : isLight
                              ? '#94a3b8'
                              : '#334155'
                          }
                          strokeWidth={1 / minimapTransform.scale}
                        />
                      ))}

                    {renderedEdges.length <= 800 &&
                      renderedEdges.map((edge) => (
                        <line
                          key={`mini-e-${edge.key}`}
                          x1={edge.p1.x}
                          y1={edge.p1.y}
                          x2={edge.p2.x}
                          y2={edge.p2.y}
                          stroke={isLight ? '#cbd5e1' : '#1e293b'}
                          strokeWidth={0.8 / minimapTransform.scale}
                          opacity={0.7}
                        />
                      ))}

                    {filteredNodes.map((n) => {
                      if (layout.hiddenNodeIps.has(n.ip)) return null;
                      const pt = layout.posMap.get(n.ip);
                      if (!pt) return null;
                      let fill = '#38bdf8';
                      let rPx = 2.1;
                      if (n.tier === 'gateway') {
                        fill = '#10b981';
                        rPx = 3.4;
                      } else if (n.riskState === 'conflict') {
                        fill = '#f43f5e';
                        rPx = 3.0;
                      } else if (n.riskState === 'intruder') {
                        fill = '#a855f7';
                        rPx = 3.0;
                      } else if (n.isSwitch) {
                        fill = '#06b6d4';
                        rPx = 2.8;
                      } else if (matchedIpSet.has(n.ip) || selectedIp === n.ip) {
                        fill = '#f59e0b';
                        rPx = 3.0;
                      }
                      return (
                        <circle
                          key={`mini-${n.ip}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={rPx / minimapTransform.scale}
                          fill={fill}
                        />
                      );
                    })}
                  </g>

                  {/* Dimmed scrim outside the active view window */}
                  <rect
                    x={0}
                    y={0}
                    width={minimapTransform.miniW}
                    height={minimapTransform.miniH}
                    fill={isLight ? 'rgba(15,23,42,0.16)' : 'rgba(2,6,23,0.52)'}
                    mask="url(#topology-minimap-scrim)"
                    pointerEvents="none"
                  />

                  {/* Draggable View Window Frame */}
                  <rect
                    data-testid="minimap-view-window"
                    x={minimapViewWindow.x}
                    y={minimapViewWindow.y}
                    width={minimapViewWindow.w}
                    height={minimapViewWindow.h}
                    rx={2}
                    fill={isMinimapDragging ? 'rgba(56,189,248,0.20)' : 'rgba(56,189,248,0.09)'}
                    stroke="#38bdf8"
                    strokeWidth={isMinimapDragging ? 2.1 : 1.6}
                    className={isMinimapDragging ? 'cursor-grabbing' : 'cursor-grab'}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      try {
                        minimapRef.current?.setPointerCapture(e.pointerId);
                      } catch {
                        // Window-level pointer listeners handle fallback automatically
                      }
                      minimapDragRef.current = {
                        mode: 'window',
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        origPanX: camera.panX,
                        origPanY: camera.panY,
                        scale: minimapTransform.scale,
                        zoom: camera.zoom,
                      };
                      setIsMinimapDragging(true);
                    }}
                  />
                </svg>
              </div>
              <div className="pt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetViewToCenter}
                  className="px-2 py-1 rounded border border-current/15 hover:border-sky-500/60 hover:bg-sky-500/10 text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap transition-colors shrink-0"
                  aria-label={isKo ? '중앙 초기화' : 'Reset Center'}
                  title={isKo ? '토폴로지 캔버스 원점 중앙으로 즉시 재설정' : 'Recenter the main topology canvas to the origin'}
                >
                  <LocateFixed className="w-3 h-3 shrink-0 text-sky-500" />
                  <span>{isKo ? '중앙 초기화' : 'Reset Center'}</span>
                </button>
                <button
                  type="button"
                  disabled={isExportingMinimap}
                  onClick={handleDownloadMinimap}
                  className="flex-1 px-2 py-1 rounded border border-current/15 hover:border-sky-500/60 hover:bg-sky-500/10 text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
                  aria-label={isKo ? '미니맵 PNG 다운로드' : 'Download Minimap'}
                  title={isKo ? '현재 미니맵 탐색 상태를 PNG로 저장' : 'Save current minimap navigation snapshot as PNG'}
                >
                  <Download className="w-3 h-3 shrink-0 text-sky-500" />
                  <span>
                    {isExportingMinimap
                      ? isKo
                        ? '저장 중...'
                        : 'Saving...'
                      : isKo
                      ? '미니맵 다운로드'
                      : 'Download Minimap'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMinimap(true)}
              className={`p-2.5 md:p-2 rounded-lg border shadow-md backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-[11px] font-bold ${floatingSurfaceCls}`}
              title={isKo ? '미니맵 열기' : 'Show Minimap'}
            >
              <MapIcon className="w-4 h-4 md:w-3.5 md:h-3.5 text-sky-500" />
              <span className="hidden sm:inline">{isKo ? '미니맵' : 'Minimap'}</span>
            </button>
          )}
        </div>

        {/* Mobile Tap Bottom Preview Sheet (avoids immediately blocking map with full-screen drawer) */}
        {mobileFocusedNode && (
          <div
            data-topology-ui="true"
            className={`md:hidden absolute bottom-16 left-3 right-3 z-30 p-3 rounded-xl border shadow-2xl backdrop-blur-md ${floatingSurfaceCls}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums font-bold text-sm">
                    {mobileFocusedNode.ip}
                  </span>
                  {typeof mobileFocusedNode.latencyMs === 'number' && mobileFocusedNode.latencyMs >= 0 && (
                    <span
                      className="font-mono tabular-nums text-xs font-bold"
                      style={{
                        color: getLatencyHeatStyle(mobileFocusedNode.latencyMs, isLight).color,
                      }}
                    >
                      {mobileFocusedNode.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold truncate">{mobileFocusedNode.label}</div>
                <div className={`text-[11px] font-mono tabular-nums truncate mt-0.5 ${mutedCls}`}>
                  {mobileFocusedNode.mac || 'No MAC'}
                  {mobileFocusedNode.vendor ? ` · ${mobileFocusedNode.vendor}` : ''}
                  {mobileFocusedNode.switchPort
                    ? ` · ${mobileFocusedNode.switchName || mobileFocusedNode.switchIp} (${mobileFocusedNode.switchPort})`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileFocusedIp(null)}
                className="p-2 rounded-lg hover:bg-current/10 cursor-pointer shrink-0"
                title={isKo ? '닫기' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectIp(mobileFocusedNode.ip)}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isKo ? '장치 프로필 상세 보기' : 'Open Device Profile'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Tiered Node Directory Drawer */}
      <div
        data-topology-ui="true"
        className={`rounded-lg border shrink-0 overflow-hidden ${surfaceCls}`}
      >
        <button
          type="button"
          onClick={() => setShowNodeDrawer((v) => !v)}
          className="w-full px-3.5 py-2 flex items-center justify-between gap-2 text-xs font-bold cursor-pointer hover:bg-current/5"
        >
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>
              {isKo
                ? `계층별 노드 목록 (${filteredNodes.length})`
                : `Tiered Node Directory (${filteredNodes.length})`}
            </span>
          </div>
          {showNodeDrawer ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 shrink-0" />
          )}
        </button>

        {showNodeDrawer && (
          <div className="max-h-60 overflow-y-auto p-3 pt-1 border-t border-current/10 space-y-3">
            {tieredNodes.gateway.length > 0 && (
              <div className="space-y-1.5">
                <div className={`text-[10.5px] font-bold flex items-center gap-1.5 ${mutedCls}`}>
                  <Router className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isKo ? 'Tier 1 · 게이트웨이 / 코어 라우터' : 'Tier 1 · Gateway / Core'}</span>
                </div>
                <div className="flex flex-wrap gap-2">{tieredNodes.gateway.map(renderNodeCard)}</div>
              </div>
            )}

            {tieredNodes.infra.length > 0 && (
              <div className="space-y-1.5">
                <div className={`text-[10.5px] font-bold flex items-center gap-1.5 ${mutedCls}`}>
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isKo ? 'Tier 2 · 인프라 / 스위치 / Proxy-ARP' : 'Tier 2 · Infrastructure & Switches'}</span>
                </div>
                <div className="flex flex-wrap gap-2">{tieredNodes.infra.map(renderNodeCard)}</div>
              </div>
            )}

            {(tieredNodes.endpoint.length > 0 || tieredNodes.vm.length > 0) && (
              <div className="space-y-1.5">
                <div className={`text-[10.5px] font-bold flex items-center gap-1.5 ${mutedCls}`}>
                  <Monitor className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isKo
                      ? `Tier 3 · 단말 호스트 & 가상화 (${tieredNodes.endpoint.length + tieredNodes.vm.length})`
                      : `Tier 3 · Endpoints & Virtual (${tieredNodes.endpoint.length + tieredNodes.vm.length})`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...tieredNodes.endpoint, ...tieredNodes.vm].map(renderNodeCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Local alias to keep icon import clean
const NetworkIcon = GitFork;
