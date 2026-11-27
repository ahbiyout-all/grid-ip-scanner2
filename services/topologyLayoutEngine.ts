import {
  TopologyEdge,
  TopologyEdgeRelation,
  TopologyGraphPayload,
  TopologyNode,
} from '../types';

export type TopologyLayoutMode = 'hierarchical' | 'cluster' | 'radial';
export type TopologyTheme = 'dark' | 'gray' | 'white' | 'beige';

export interface Point2D {
  x: number;
  y: number;
}

export interface TopologyClusterBox {
  id: string;
  title: string;
  subtitle: string;
  kind: 'gateway' | 'switch' | 'vlan' | 'subnet' | 'tier';
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  nodeIps: string[];
  nodeCount: number;
  threatCount: number;
  avgLatencyMs?: number;
  collapsed: boolean;
}

export interface TopologyComputedLayout {
  mode: TopologyLayoutMode;
  posMap: Map<string, Point2D>;
  hiddenNodeIps: Set<string>;
  nodeToClusterId: Map<string, string>;
  clusters: TopologyClusterBox[];
  radialCenter?: Point2D;
  radialRingRadii?: number[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface LatencyHeatStyle {
  tier: 'fast' | 'normal' | 'elevated' | 'slow' | 'unknown';
  color: string;
  strokeWidth: number;
  label: string;
  badgeTextKo: string;
  badgeTextEn: string;
}

export function getLatencyHeatStyle(
  ms: number | undefined,
  isLight: boolean
): LatencyHeatStyle {
  if (ms === undefined || ms <= 0 || !Number.isFinite(ms)) {
    return {
      tier: 'unknown',
      color: isLight ? '#94a3b8' : '#475569',
      strokeWidth: 1.5,
      label: '—',
      badgeTextKo: '측정 없음',
      badgeTextEn: 'No RTT',
    };
  }
  if (ms < 15) {
    return {
      tier: 'fast',
      color: '#10b981',
      strokeWidth: 2.2,
      label: `${ms}ms`,
      badgeTextKo: '쾌적 (<15ms)',
      badgeTextEn: 'Nominal (<15ms)',
    };
  }
  if (ms < 60) {
    return {
      tier: 'normal',
      color: '#0ea5e9',
      strokeWidth: 2.5,
      label: `${ms}ms`,
      badgeTextKo: '보통 (15–59ms)',
      badgeTextEn: 'Normal (15–59ms)',
    };
  }
  if (ms < 150) {
    return {
      tier: 'elevated',
      color: '#f59e0b',
      strokeWidth: 3.0,
      label: `${ms}ms`,
      badgeTextKo: '지연 (60–149ms)',
      badgeTextEn: 'Elevated (60–149ms)',
    };
  }
  return {
    tier: 'slow',
    color: '#f43f5e',
    strokeWidth: 3.6,
    label: `${ms}ms`,
    badgeTextKo: '병목 (150ms+)',
    badgeTextEn: 'Bottleneck (150ms+)',
  };
}

export function getEdgeStrokeStyle(
  relation: TopologyEdgeRelation,
  isLight: boolean,
  targetLatencyMs?: number,
  heatmapEnabled?: boolean
): { stroke: string; strokeWidth: number; dash?: string; baseOpacity: number } {
  if (heatmapEnabled && typeof targetLatencyMs === 'number' && targetLatencyMs >= 0) {
    const heat = getLatencyHeatStyle(targetLatencyMs, isLight);
    const dash =
      relation === 'switch_uplink'
        ? '6 4'
        : relation === 'proxy_arp_alias'
        ? '5 4'
        : relation === 'soft_trust_link'
        ? '4 3'
        : undefined;
    return {
      stroke: heat.color,
      strokeWidth: heat.strokeWidth,
      dash,
      baseOpacity: 0.85,
    };
  }

  switch (relation) {
    case 'physical_port':
      return { stroke: '#06b6d4', strokeWidth: 2.1, baseOpacity: 0.88 };
    case 'switch_uplink':
      return { stroke: '#10b981', strokeWidth: 2.3, dash: '6 4', baseOpacity: 0.9 };
    case 'proxy_arp_alias':
      return { stroke: '#0ea5e9', strokeWidth: 2.0, dash: '5 4', baseOpacity: 0.85 };
    case 'conflict_alert':
      return { stroke: '#f43f5e', strokeWidth: 2.7, baseOpacity: 0.95 };
    case 'soft_trust_link':
      return { stroke: '#f59e0b', strokeWidth: 2.0, dash: '4 3', baseOpacity: 0.88 };
    case 'intruder_link':
      return { stroke: '#a855f7', strokeWidth: 2.4, baseOpacity: 0.95 };
    default:
      return {
        stroke: isLight ? '#94a3b8' : '#475569',
        strokeWidth: 1.6,
        baseOpacity: 0.55,
      };
  }
}

export function computeUplinkHighlightSet(
  targetIp: string | null,
  graph: TopologyGraphPayload
): { nodeIds: Set<string>; edgeIds: Set<string> } | null {
  if (!targetIp) return null;
  const nodeExists = graph.nodes.some((n) => n.ip === targetIp);
  if (!nodeExists) return null;

  const nodeIds = new Set<string>([targetIp]);
  const edgeIds = new Set<string>();

  const incomingByTo = new Map<string, TopologyEdge[]>();
  const outgoingByFrom = new Map<string, TopologyEdge[]>();
  graph.edges.forEach((e) => {
    const inList = incomingByTo.get(e.toIp) || [];
    inList.push(e);
    incomingByTo.set(e.toIp, inList);

    const outList = outgoingByFrom.get(e.fromIp) || [];
    outList.push(e);
    outgoingByFrom.set(e.fromIp, outList);
  });

  // Walk upward to Gateway / root
  const upQueue = [targetIp];
  const visitedUp = new Set<string>([targetIp]);
  while (upQueue.length > 0) {
    const cur = upQueue.shift()!;
    const parents = incomingByTo.get(cur) || [];
    parents.forEach((edge) => {
      edgeIds.add(edge.id);
      nodeIds.add(edge.fromIp);
      if (!visitedUp.has(edge.fromIp)) {
        visitedUp.add(edge.fromIp);
        upQueue.push(edge.fromIp);
      }
    });
  }

  // Also illuminate immediate downstream children (e.g. if hovering a Switch or Gateway)
  const children = outgoingByFrom.get(targetIp) || [];
  children.forEach((edge) => {
    edgeIds.add(edge.id);
    nodeIds.add(edge.toIp);
  });

  return { nodeIds, edgeIds };
}

function finalizeBounds(
  posMap: Map<string, Point2D>,
  clusters: TopologyClusterBox[],
  hiddenNodeIps: Set<string>,
  radialCenter?: Point2D,
  radialRingRadii?: number[]
): TopologyComputedLayout['bounds'] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  posMap.forEach((pt, ip) => {
    if (hiddenNodeIps.has(ip)) return;
    if (pt.x - 58 < minX) minX = pt.x - 58;
    if (pt.y - 44 < minY) minY = pt.y - 44;
    if (pt.x + 58 > maxX) maxX = pt.x + 58;
    if (pt.y + 48 > maxY) maxY = pt.y + 48;
  });

  clusters.forEach((c) => {
    if (c.x - 16 < minX) minX = c.x - 16;
    if (c.y - 16 < minY) minY = c.y - 16;
    if (c.x + c.width + 16 > maxX) maxX = c.x + c.width + 16;
    if (c.y + c.height + 16 > maxY) maxY = c.y + c.height + 16;
  });

  if (radialCenter && radialRingRadii && radialRingRadii.length > 0) {
    const outerR = radialRingRadii[radialRingRadii.length - 1] + 56;
    minX = Math.min(minX, radialCenter.x - outerR);
    minY = Math.min(minY, radialCenter.y - outerR);
    maxX = Math.max(maxX, radialCenter.x + outerR);
    maxY = Math.max(maxY, radialCenter.y + outerR);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 960, maxY: 480, width: 960, height: 480 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(320, maxX - minX),
    height: Math.max(240, maxY - minY),
  };
}

function buildClusterGroups(
  nodes: TopologyNode[],
  isKo: boolean
): Array<{
  id: string;
  title: string;
  subtitle: string;
  kind: TopologyClusterBox['kind'];
  nodes: TopologyNode[];
}> {
  const gatewayNodes = nodes.filter((n) => n.tier === 'gateway');
  const restNodes = nodes.filter((n) => n.tier !== 'gateway');

  const groups: Array<{
    id: string;
    title: string;
    subtitle: string;
    kind: TopologyClusterBox['kind'];
    nodes: TopologyNode[];
  }> = [];

  if (gatewayNodes.length > 0) {
    groups.push({
      id: 'cluster:gateway',
      title: isKo ? '코어 게이트웨이' : 'Core Gateway',
      subtitle: 'Tier 1 · L3 Edge',
      kind: 'gateway',
      nodes: gatewayNodes,
    });
  }

  const hasSwitches = restNodes.some((n) => n.isSwitch || Boolean(n.switchIp));
  const distinctSubnets = new Set(restNodes.map((n) => n.ip.split('.').slice(0, 3).join('.')));
  const distinctVlans = new Set(
    restNodes
      .map((n) => (n.vlanId ? `V${n.vlanId}` : n.vlanTag || ''))
      .filter(Boolean)
  );

  if (hasSwitches) {
    const bySwitch = new Map<string, TopologyNode[]>();
    const unmapped: TopologyNode[] = [];
    const switchMeta = new Map<string, TopologyNode>();

    restNodes.forEach((n) => {
      if (n.isSwitch) {
        switchMeta.set(n.ip, n);
        const list = bySwitch.get(n.ip) || [];
        list.unshift(n);
        bySwitch.set(n.ip, list);
      } else if (n.switchIp) {
        const list = bySwitch.get(n.switchIp) || [];
        list.push(n);
        bySwitch.set(n.switchIp, list);
      } else {
        unmapped.push(n);
      }
    });

    bySwitch.forEach((list, swIp) => {
      const swNode = switchMeta.get(swIp);
      const swLabel = swNode?.label || list.find((x) => x.switchName)?.switchName || swIp;
      groups.push({
        id: `cluster:sw:${swIp}`,
        title: swLabel,
        subtitle: `L2 Switch · ${swIp}`,
        kind: 'switch',
        nodes: list,
      });
    });

    if (unmapped.length > 0) {
      groups.push({
        id: 'cluster:unmapped',
        title: isKo ? '직결 L3 / 미매핑 호스트' : 'Direct L3 / Unmapped',
        subtitle: `${unmapped.length} nodes`,
        kind: 'tier',
        nodes: unmapped,
      });
    }
    return groups;
  }

  if (distinctVlans.size > 1) {
    const byVlan = new Map<string, TopologyNode[]>();
    restNodes.forEach((n) => {
      const key = n.vlanId ? `VLAN ${n.vlanId}` : n.vlanTag || (isKo ? '기본 망' : 'Default LAN');
      const list = byVlan.get(key) || [];
      list.push(n);
      byVlan.set(key, list);
    });
    byVlan.forEach((list, vlanName) => {
      groups.push({
        id: `cluster:vlan:${vlanName}`,
        title: vlanName,
        subtitle: isKo ? 'VLAN 세그먼트' : 'VLAN Segment',
        kind: 'vlan',
        nodes: list,
      });
    });
    return groups;
  }

  if (distinctSubnets.size > 1) {
    const bySubnet = new Map<string, TopologyNode[]>();
    restNodes.forEach((n) => {
      const sub = n.ip.split('.').slice(0, 3).join('.');
      const list = bySubnet.get(sub) || [];
      list.push(n);
      bySubnet.set(sub, list);
    });
    bySubnet.forEach((list, sub) => {
      groups.push({
        id: `cluster:sub:${sub}`,
        title: `${sub}.0/24`,
        subtitle: isKo ? '서브넷 블록' : 'Subnet Block',
        kind: 'subnet',
        nodes: list,
      });
    });
    return groups;
  }

  // Graceful Single-Subnet Grouping (Free & Unmapped L2): Infra / Security / Virtual / Endpoint IP Buckets
  const infraNodes = restNodes.filter((n) => n.tier === 'infra');
  const vmNodes = restNodes.filter((n) => n.tier === 'vm');
  const endpointNodes = restNodes.filter((n) => n.tier === 'endpoint');

  if (infraNodes.length > 0) {
    groups.push({
      id: 'cluster:infra',
      title: isKo ? '인프라 · 서버 · Proxy-ARP' : 'Infra · Servers · Proxy-ARP',
      subtitle: 'Tier 2 Infrastructure',
      kind: 'tier',
      nodes: infraNodes,
    });
  }
  if (vmNodes.length > 0) {
    groups.push({
      id: 'cluster:vm',
      title: isKo ? '가상화 · 컨테이너 (VM)' : 'Virtualization & Containers',
      subtitle: 'Virtual NIC / LAA-VM',
      kind: 'tier',
      nodes: vmNodes,
    });
  }

  if (endpointNodes.length > 0) {
    if (endpointNodes.length <= 28) {
      groups.push({
        id: 'cluster:endpoints',
        title: isKo ? '단말 워크스테이션 · IoT' : 'Endpoints & Workstations',
        subtitle: 'Tier 3 Hosts',
        kind: 'tier',
        nodes: endpointNodes,
      });
    } else {
      // Split large endpoint pools into readable quadrant IP ranges (.1–.63, .64–.127, .128–.191, .192–.254)
      const buckets: Array<{ id: string; label: string; list: TopologyNode[] }> = [
        { id: '0-63', label: '.1 – .63', list: [] },
        { id: '64-127', label: '.64 – .127', list: [] },
        { id: '128-191', label: '.128 – .191', list: [] },
        { id: '192-255', label: '.192 – .254', list: [] },
      ];
      endpointNodes.forEach((n) => {
        const lastOctet = Number(n.ip.split('.')[3] || 0);
        const idx = Math.min(3, Math.floor(lastOctet / 64));
        buckets[idx].list.push(n);
      });
      buckets.forEach((b) => {
        if (b.list.length > 0) {
          groups.push({
            id: `cluster:ep:${b.id}`,
            title: isKo ? `단말 대역 (${b.label})` : `Endpoints (${b.label})`,
            subtitle: 'IP Range Segment',
            kind: 'subnet',
            nodes: b.list,
          });
        }
      });
    }
  }

  return groups;
}

export function computeTopologyLayout(params: {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  gatewayIp: string;
  mode: TopologyLayoutMode;
  customPositions: Record<string, Point2D>;
  collapsedClusters: Set<string>;
  isKo: boolean;
}): TopologyComputedLayout {
  const { nodes, gatewayIp, mode, customPositions, collapsedClusters, isKo } = params;
  const posMap = new Map<string, Point2D>();
  const hiddenNodeIps = new Set<string>();
  const nodeToClusterId = new Map<string, string>();
  const clusters: TopologyClusterBox[] = [];

  if (nodes.length === 0) {
    return {
      mode,
      posMap,
      hiddenNodeIps,
      nodeToClusterId,
      clusters,
      bounds: { minX: 0, minY: 0, maxX: 960, maxY: 420, width: 960, height: 420 },
    };
  }

  if (mode === 'hierarchical') {
    const gwList = nodes.filter((n) => n.tier === 'gateway');
    const infraList = nodes.filter((n) => n.tier === 'infra');
    const endList = nodes.filter((n) => n.tier === 'endpoint' || n.tier === 'vm');

    const maxCount = Math.max(gwList.length, infraList.length, endList.length);
    const maxPerRow = maxCount > 70 ? 16 : 12;
    const nodeStepX = 96;
    const canvasWidth = Math.max(880, Math.min(maxCount, maxPerRow) * nodeStepX + 120);
    const rowSpacing = 92;
    let curY = 76;

    const placeTierRows = (tierNodes: TopologyNode[], gapAfter: number) => {
      if (tierNodes.length === 0) return;
      for (let i = 0; i < tierNodes.length; i += maxPerRow) {
        const chunk = tierNodes.slice(i, i + maxPerRow);
        const totalRowW = (chunk.length - 1) * nodeStepX;
        const startX = canvasWidth / 2 - totalRowW / 2;
        chunk.forEach((n, idx) => {
          const offsetY = chunk.length > 6 && idx % 2 === 1 ? 14 : 0;
          posMap.set(n.ip, {
            x: startX + idx * nodeStepX,
            y: curY + offsetY,
          });
        });
        curY += rowSpacing;
      }
      curY += gapAfter;
    };

    placeTierRows(gwList, 58);
    placeTierRows(infraList, 66);
    placeTierRows(endList, 20);
  } else if (mode === 'cluster') {
    const groups = buildClusterGroups(nodes, isKo);
    const gatewayGroup = groups.find((g) => g.kind === 'gateway');
    const childGroups = groups.filter((g) => g.kind !== 'gateway');

    const cellW = 104;
    const cellH = 84;
    const boxPadX = 24;
    const headerH = 44;
    const boxPadBottom = 20;
    const gapX = 36;
    const gapY = 44;

    // Measure each child cluster box first
    interface MeasuredBox {
      group: (typeof groups)[number];
      collapsed: boolean;
      width: number;
      height: number;
      cols: number;
    }

    const measuredChildren: MeasuredBox[] = childGroups.map((g) => {
      const collapsed = collapsedClusters.has(g.id);
      if (collapsed) {
        return {
          group: g,
          collapsed: true,
          width: 248,
          height: 82,
          cols: 1,
        };
      }
      const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(g.nodes.length * 1.4))));
      const rows = Math.max(1, Math.ceil(g.nodes.length / cols));
      return {
        group: g,
        collapsed: false,
        width: Math.max(240, cols * cellW + boxPadX * 2),
        height: headerH + rows * cellH + boxPadBottom,
        cols,
      };
    });

    // Arrange child cluster boxes into clean rows
    const maxRowWidth = Math.max(1060, Math.min(1600, measuredChildren.length * 290));
    const boxRows: MeasuredBox[][] = [];
    let currentRow: MeasuredBox[] = [];
    let currentW = 0;

    measuredChildren.forEach((mb) => {
      if (currentRow.length > 0 && currentW + gapX + mb.width > maxRowWidth) {
        boxRows.push(currentRow);
        currentRow = [mb];
        currentW = mb.width;
      } else {
        currentW += (currentRow.length > 0 ? gapX : 0) + mb.width;
        currentRow.push(mb);
      }
    });
    if (currentRow.length > 0) boxRows.push(currentRow);

    const widestRow = boxRows.reduce(
      (max, r) => Math.max(max, r.reduce((s, b, i) => s + b.width + (i > 0 ? gapX : 0), 0)),
      640
    );
    const centerAxisX = widestRow / 2 + 40;

    let curY = 40;

    if (gatewayGroup) {
      const gwWidth = Math.max(260, gatewayGroup.nodes.length * 120 + 60);
      const gwHeight = 116;
      const gwX = centerAxisX - gwWidth / 2;
      const gwY = curY;

      const gwThreats = gatewayGroup.nodes.filter(
        (n) => n.riskState === 'conflict' || n.riskState === 'intruder'
      ).length;
      const gwRtts = gatewayGroup.nodes
        .map((n) => n.latencyMs)
        .filter((v): v is number => v !== undefined && v > 0);
      const gwAvg =
        gwRtts.length > 0
          ? Math.round(gwRtts.reduce((a, b) => a + b, 0) / gwRtts.length)
          : undefined;

      clusters.push({
        id: gatewayGroup.id,
        title: gatewayGroup.title,
        subtitle: gatewayGroup.subtitle,
        kind: 'gateway',
        x: gwX,
        y: gwY,
        width: gwWidth,
        height: gwHeight,
        anchorX: gwX + gwWidth / 2,
        anchorY: gwY + gwHeight / 2,
        nodeIps: gatewayGroup.nodes.map((n) => n.ip),
        nodeCount: gatewayGroup.nodes.length,
        threatCount: gwThreats,
        avgLatencyMs: gwAvg,
        collapsed: false,
      });

      gatewayGroup.nodes.forEach((n, idx) => {
        nodeToClusterId.set(n.ip, gatewayGroup.id);
        const step = gwWidth / (gatewayGroup.nodes.length + 1);
        posMap.set(n.ip, {
          x: gwX + step * (idx + 1),
          y: gwY + 72,
        });
      });

      curY += gwHeight + 76;
    }

    boxRows.forEach((row) => {
      const rowW = row.reduce((s, b, i) => s + b.width + (i > 0 ? gapX : 0), 0);
      const rowMaxH = row.reduce((m, b) => Math.max(m, b.height), 0);
      let boxX = centerAxisX - rowW / 2;

      row.forEach((mb) => {
        const { group, collapsed, width, height, cols } = mb;
        const threats = group.nodes.filter(
          (n) => n.riskState === 'conflict' || n.riskState === 'intruder'
        ).length;
        const rtts = group.nodes
          .map((n) => n.latencyMs)
          .filter((v): v is number => v !== undefined && v > 0);
        const avgLatencyMs =
          rtts.length > 0
            ? Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length)
            : undefined;

        const anchorX = boxX + width / 2;
        const anchorY = curY + height / 2;

        clusters.push({
          id: group.id,
          title: group.title,
          subtitle: group.subtitle,
          kind: group.kind,
          x: boxX,
          y: curY,
          width,
          height,
          anchorX,
          anchorY,
          nodeIps: group.nodes.map((n) => n.ip),
          nodeCount: group.nodes.length,
          threatCount: threats,
          avgLatencyMs,
          collapsed,
        });

        group.nodes.forEach((n, idx) => {
          nodeToClusterId.set(n.ip, group.id);
          if (collapsed) {
            hiddenNodeIps.add(n.ip);
            posMap.set(n.ip, { x: anchorX, y: anchorY });
          } else {
            const col = idx % cols;
            const rowIdx = Math.floor(idx / cols);
            const itemsInThisRow = Math.min(cols, group.nodes.length - rowIdx * cols);
            const rowInnerW = itemsInThisRow * cellW;
            const rowStartX = boxX + (width - rowInnerW) / 2 + cellW / 2;
            posMap.set(n.ip, {
              x: rowStartX + col * cellW,
              y: curY + headerH + rowIdx * cellH + cellH / 2 - 4,
            });
          }
        });

        boxX += width + gapX;
      });

      curY += rowMaxH + gapY;
    });
  } else {
    // Radial concentric layout: Gateway center -> Infra/Switch ring -> Endpoints distributed by parent angle
    const cx = 540;
    const cy = 440;
    const gwNodes = nodes.filter((n) => n.tier === 'gateway');
    const infraNodes = nodes.filter((n) => n.tier === 'infra');
    const leafNodes = nodes.filter((n) => n.tier === 'endpoint' || n.tier === 'vm');

    if (gwNodes.length === 1) {
      posMap.set(gwNodes[0].ip, { x: cx, y: cy });
    } else {
      gwNodes.forEach((n, i) => {
        const ang = (i / Math.max(1, gwNodes.length)) * Math.PI * 2 - Math.PI / 2;
        posMap.set(n.ip, { x: cx + Math.cos(ang) * 44, y: cy + Math.sin(ang) * 44 });
      });
    }

    const ring1Radius = infraNodes.length > 10 ? 205 : 168;
    const infraAngleMap = new Map<string, number>();

    infraNodes.forEach((n, idx) => {
      const ang = (idx / Math.max(1, infraNodes.length)) * Math.PI * 2 - Math.PI / 2;
      infraAngleMap.set(n.ip, ang);
      posMap.set(n.ip, {
        x: cx + Math.cos(ang) * ring1Radius,
        y: cy + Math.sin(ang) * ring1Radius,
      });
    });

    // Sort leaf nodes so those sharing the same switch sit adjacent along their parent's sector
    const sortedLeaves = [...leafNodes].sort((a, b) => {
      const pa = a.switchIp || gatewayIp || '';
      const pb = b.switchIp || gatewayIp || '';
      if (pa !== pb) return pa.localeCompare(pb);
      return a.ip.localeCompare(b.ip);
    });

    const ringCapacities = [24, 36, 48, 60];
    const radialRingRadii: number[] = infraNodes.length > 0 ? [ring1Radius] : [];

    let placed = 0;
    let ringIdx = 0;
    while (placed < sortedLeaves.length) {
      const cap = ringCapacities[Math.min(ringIdx, ringCapacities.length - 1)];
      const slice = sortedLeaves.slice(placed, placed + cap);
      const radius =
        (infraNodes.length > 0 ? ring1Radius + 145 : 220) + ringIdx * 118;
      radialRingRadii.push(radius);

      slice.forEach((n, idx) => {
        // Subtle angular bias toward parent switch if present and on ring 1
        const baseAng = (idx / Math.max(1, slice.length)) * Math.PI * 2 - Math.PI / 2;
        const parentAng = n.switchIp ? infraAngleMap.get(n.switchIp) : undefined;
        const ang =
          parentAng !== undefined && slice.length <= 24
            ? parentAng + ((idx - slice.length / 2) * 0.14)
            : baseAng;

        posMap.set(n.ip, {
          x: cx + Math.cos(ang) * radius,
          y: cy + Math.sin(ang) * radius,
        });
      });

      placed += slice.length;
      ringIdx++;
    }

    // Apply user custom drags on top of radial positions
    Object.entries(customPositions).forEach(([ip, pt]) => {
      if (posMap.has(ip) && !hiddenNodeIps.has(ip)) {
        posMap.set(ip, pt);
      }
    });

    return {
      mode,
      posMap,
      hiddenNodeIps,
      nodeToClusterId,
      clusters,
      radialCenter: { x: cx, y: cy },
      radialRingRadii,
      bounds: finalizeBounds(posMap, clusters, hiddenNodeIps, { x: cx, y: cy }, radialRingRadii),
    };
  }

  // Apply custom drag overrides
  Object.entries(customPositions).forEach(([ip, pt]) => {
    if (posMap.has(ip) && !hiddenNodeIps.has(ip)) {
      posMap.set(ip, pt);
    }
  });

  return {
    mode,
    posMap,
    hiddenNodeIps,
    nodeToClusterId,
    clusters,
    bounds: finalizeBounds(posMap, clusters, hiddenNodeIps),
  };
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildStandaloneTopologySvg(params: {
  graph: TopologyGraphPayload;
  visibleNodes: TopologyNode[];
  layout: TopologyComputedLayout;
  theme: TopologyTheme;
  heatmapEnabled: boolean;
  isKo: boolean;
  selectedIp: string | null;
}): string {
  const { graph, visibleNodes, layout, theme, heatmapEnabled, isKo, selectedIp } = params;
  const isLight = theme === 'white' || theme === 'beige';

  const bgHex =
    theme === 'beige'
      ? '#fcf8f2'
      : theme === 'white'
      ? '#ffffff'
      : theme === 'gray'
      ? '#18181b'
      : '#090f1d';
  const surfaceHex =
    theme === 'beige'
      ? '#f3ead9'
      : theme === 'white'
      ? '#f8fafc'
      : theme === 'gray'
      ? '#27272a'
      : '#0f172a';
  const borderHex =
    theme === 'beige'
      ? '#d8c39d'
      : theme === 'white'
      ? '#cbd5e1'
      : theme === 'gray'
      ? '#3f3f46'
      : '#1e293b';
  const textHex =
    theme === 'beige' ? '#3d2711' : isLight ? '#0f172a' : '#f1f5f9';
  const mutedHex =
    theme === 'beige' ? '#7c6244' : isLight ? '#64748b' : '#94a3b8';

  const pad = 44;
  const headerH = 56;
  const footerH = 38;
  const worldW = Math.ceil(layout.bounds.width + pad * 2);
  const worldH = Math.ceil(layout.bounds.height + pad * 2 + headerH + footerH);
  const offsetX = -layout.bounds.minX + pad;
  const offsetY = -layout.bounds.minY + pad + headerH;

  const visibleIpSet = new Set(visibleNodes.map((n) => n.ip));
  const nodeByIp = new Map(graph.nodes.map((n) => [n.ip, n]));
  const clusterById = new Map(layout.clusters.map((c) => [c.id, c]));

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}" font-family="'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif">`
  );
  parts.push(`<rect width="${worldW}" height="${worldH}" fill="${bgHex}" />`);

  // Header strip
  const timestampStr = new Date().toLocaleString(isKo ? 'ko-KR' : 'en-US');
  const layoutLabel =
    layout.mode === 'cluster'
      ? isKo
        ? '스위치·VLAN 그룹형'
        : 'Cluster Layout'
      : layout.mode === 'radial'
      ? isKo
        ? '방사형 레이아웃'
        : 'Radial Layout'
      : isKo
      ? '3단 계층형'
      : 'Hierarchical Layout';
  parts.push(
    `<rect x="0" y="0" width="${worldW}" height="${headerH}" fill="${surfaceHex}" />`,
    `<line x1="0" y1="${headerH}" x2="${worldW}" y2="${headerH}" stroke="${borderHex}" stroke-width="1" />`,
    `<text x="20" y="24" font-size="14" font-weight="700" fill="${textHex}">Grid IP Scanner2 — ${escapeXml(
      graph.subnet
    )}.0 (${escapeXml(layoutLabel)})</text>`,
    `<text x="20" y="42" font-size="11" font-family="monospace" fill="${mutedHex}">Gateway: ${escapeXml(
      graph.gatewayIp
    )} · Nodes: ${visibleNodes.length} · ${escapeXml(timestampStr)}${
      heatmapEnabled ? ' · RTT Heatmap ON' : ''
    }</text>`
  );

  parts.push(`<g transform="translate(${offsetX}, ${offsetY})">`);

  // Radial guide rings
  if (layout.mode === 'radial' && layout.radialCenter && layout.radialRingRadii) {
    layout.radialRingRadii.forEach((r) => {
      parts.push(
        `<circle cx="${layout.radialCenter!.x}" cy="${layout.radialCenter!.y}" r="${r}" fill="none" stroke="${borderHex}" stroke-width="1" stroke-dasharray="4 6" opacity="0.7" />`
      );
    });
  }

  // Cluster boxes
  if (layout.mode === 'cluster') {
    layout.clusters.forEach((c) => {
      const stroke = c.threatCount > 0 ? '#f43f5e' : c.kind === 'switch' ? '#06b6d4' : borderHex;
      parts.push(
        `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="12" fill="${surfaceHex}" stroke="${stroke}" stroke-width="1.2" opacity="0.92" />`,
        `<text x="${c.x + 14}" y="${c.y + 21}" font-size="12" font-weight="700" fill="${textHex}">${escapeXml(
          c.title
        )}</text>`,
        `<text x="${c.x + 14}" y="${c.y + 36}" font-size="10" font-family="monospace" fill="${mutedHex}">${escapeXml(
          c.subtitle
        )} · ${c.nodeCount}${isKo ? '대' : ' nodes'}${
          c.avgLatencyMs ? ` · ~${c.avgLatencyMs}ms` : ''
        }</text>`
      );
    });
  }

  // Edges (deduplicated when collapsed)
  const seenClusterEdge = new Set<string>();
  graph.edges.forEach((edge) => {
    if (!visibleIpSet.has(edge.fromIp) || !visibleIpSet.has(edge.toIp)) return;

    const fromHidden = layout.hiddenNodeIps.has(edge.fromIp);
    const toHidden = layout.hiddenNodeIps.has(edge.toIp);
    const fromClusterId = layout.nodeToClusterId.get(edge.fromIp);
    const toClusterId = layout.nodeToClusterId.get(edge.toIp);
    if (fromHidden && toHidden && fromClusterId && fromClusterId === toClusterId) return;

    const p1 = fromHidden && fromClusterId
      ? (() => {
          const cl = clusterById.get(fromClusterId);
          return cl ? { x: cl.anchorX, y: cl.anchorY } : layout.posMap.get(edge.fromIp);
        })()
      : layout.posMap.get(edge.fromIp);
    const p2 = toHidden && toClusterId
      ? (() => {
          const cl = clusterById.get(toClusterId);
          return cl ? { x: cl.anchorX, y: cl.anchorY } : layout.posMap.get(edge.toIp);
        })()
      : layout.posMap.get(edge.toIp);

    if (!p1 || !p2) return;
    if (fromHidden || toHidden) {
      const ck = `${fromHidden ? fromClusterId : edge.fromIp}->${toHidden ? toClusterId : edge.toIp}`;
      if (seenClusterEdge.has(ck)) return;
      seenClusterEdge.add(ck);
    }

    const toNode = nodeByIp.get(edge.toIp);
    const style = getEdgeStrokeStyle(edge.relation, isLight, toNode?.latencyMs, heatmapEnabled);

    let d: string;
    if (layout.mode === 'radial') {
      d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    } else {
      const midY = (p1.y + p2.y) / 2;
      d = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }

    parts.push(
      `<path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${
        style.dash ? ` stroke-dasharray="${style.dash}"` : ''
      } opacity="${style.baseOpacity}" />`
    );
  });

  // Nodes
  visibleNodes.forEach((n) => {
    if (layout.hiddenNodeIps.has(n.ip)) return;
    const pt = layout.posMap.get(n.ip);
    if (!pt) return;

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

    const isSel = selectedIp === n.ip;
    const r = n.tier === 'gateway' ? 19 : n.isSwitch ? 16 : 12;
    const shortIp = n.ip.split('.').slice(-2).join('.');
    const shortLabel = (n.label || n.ip).slice(0, 16);

    parts.push(`<g transform="translate(${pt.x}, ${pt.y})">`);
    if (isSel) {
      parts.push(`<circle r="${r + 5}" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.7" />`);
    }
    if (n.tier === 'gateway') {
      parts.push(
        `<polygon points="0,-19 17,-9 17,9 0,19 -17,9 -17,-9" fill="${bgHex}" stroke="${stroke}" stroke-width="2.6" />`
      );
    } else if (n.isSwitch) {
      parts.push(
        `<rect x="-14" y="-14" width="28" height="28" rx="6" fill="${bgHex}" stroke="${stroke}" stroke-width="2.4" />`
      );
    } else {
      parts.push(
        `<circle r="${r}" fill="${bgHex}" stroke="${stroke}" stroke-width="2.2" />`
      );
    }

    parts.push(
      `<text y="${r + 14}" text-anchor="middle" font-size="10.5" font-family="monospace" font-weight="700" fill="${textHex}">.${escapeXml(
        n.ip.split('.')[3] || shortIp
      )}</text>`,
      `<text y="${r + 25}" text-anchor="middle" font-size="9" fill="${mutedHex}">${escapeXml(
        shortLabel
      )}${typeof n.latencyMs === 'number' && n.latencyMs >= 0 ? ` · ${n.latencyMs}ms` : ''}</text>`
    );
    parts.push('</g>');
  });

  parts.push('</g>');

  // Footer legend
  const footerY = worldH - footerH;
  const legendText = heatmapEnabled
    ? isKo
      ? 'RTT 히트맵: <15ms 쾌적(녹) · 15-59ms 보통(청) · 60-149ms 주의(황) · 150ms+ 병목(적)'
      : 'RTT Heatmap: <15ms Fast (Green) · 15-59ms Normal (Blue) · 60-149ms Elevated (Amber) · 150ms+ Slow (Red)'
    : isKo
    ? '육각형: 게이트웨이 · 사각: 스위치 · 실선: 업링크 · 청록: L2 포트 · 적색: 충돌 · 보라: 침입 의심'
    : 'Hex: Gateway · Square: Switch · Solid: Uplink · Cyan: L2 Port · Red: Conflict · Purple: Intruder';
  parts.push(
    `<rect x="0" y="${footerY}" width="${worldW}" height="${footerH}" fill="${surfaceHex}" />`,
    `<line x1="0" y1="${footerY}" x2="${worldW}" y2="${footerY}" stroke="${borderHex}" stroke-width="1" />`,
    `<text x="20" y="${footerY + 23}" font-size="10.5" font-family="monospace" fill="${mutedHex}">${escapeXml(
      legendText
    )}</text>`
  );

  parts.push('</svg>');
  return parts.join('\n');
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportTopologyAsSvg(
  svgMarkup: string,
  subnet: string,
  mode: TopologyLayoutMode
): void {
  const cleanSubnet = subnet.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(blob, `grid-topology-${cleanSubnet}-${mode}.svg`);
}

export async function exportTopologyAsPng(
  svgMarkup: string,
  subnet: string,
  mode: TopologyLayoutMode
): Promise<boolean> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = svgUrl;
    });

    const natW = Math.max(320, img.naturalWidth || 1200);
    const natH = Math.max(240, img.naturalHeight || 720);
    const scale = Math.min(2, 4096 / Math.max(natW, natH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(natW * scale);
    canvas.height = Math.round(natH * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, natW, natH);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!pngBlob) return false;

    const cleanSubnet = subnet.replace(/[^a-zA-Z0-9._-]/g, '_');
    triggerBlobDownload(pngBlob, `grid-topology-${cleanSubnet}-${mode}.png`);
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function exportMinimapAsPng(params: {
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  theme: TopologyTheme;
  subnet: string;
  mode: TopologyLayoutMode;
  zoomPct: number;
  isKo: boolean;
}): Promise<boolean> {
  const { svgElement, width, height, theme, subnet, mode, zoomPct, isKo } = params;
  const isLight = theme === 'white' || theme === 'beige';

  const frameBgHex =
    theme === 'beige'
      ? '#f8f1e4'
      : theme === 'white'
      ? '#ffffff'
      : theme === 'gray'
      ? '#18181b'
      : '#0f172a';
  const mapBgHex = isLight ? '#f1f5f9' : '#020617';
  const borderHex =
    theme === 'beige'
      ? '#d8c198'
      : theme === 'white'
      ? '#cbd5e1'
      : theme === 'gray'
      ? '#3f3f46'
      : '#1e293b';
  const textHex = theme === 'beige' ? '#3d2711' : isLight ? '#0f172a' : '#f1f5f9';
  const mutedHex = theme === 'beige' ? '#7c6244' : isLight ? '#64748b' : '#94a3b8';

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const serializedSvg = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = svgUrl;
    });

    const scale = 3;
    const pad = 10;
    const headerH = 26;
    const totalW = Math.max(180, Math.round(width + pad * 2));
    const totalH = Math.max(120, Math.round(height + headerH + pad * 2));

    const canvas = document.createElement('canvas');
    canvas.width = totalW * scale;
    canvas.height = totalH * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.scale(scale, scale);

    // Outer frame background
    ctx.fillStyle = frameBgHex;
    ctx.fillRect(0, 0, totalW, totalH);

    // Navigation snapshot header caption
    const modeLabel =
      mode === 'cluster'
        ? isKo
          ? '그룹형'
          : 'Cluster'
        : mode === 'radial'
        ? isKo
          ? '방사형'
          : 'Radial'
        : isKo
        ? '계층형'
        : 'Hierarchy';
    ctx.fillStyle = textHex;
    ctx.font = '700 10.5px monospace';
    ctx.fillText(`Minimap · ${subnet}.0`, pad, 17);

    ctx.fillStyle = mutedHex;
    ctx.font = '600 9.5px monospace';
    const rightText = `${modeLabel} · ${zoomPct}%`;
    const rightWidth = ctx.measureText(rightText).width;
    ctx.fillText(rightText, totalW - pad - rightWidth, 17);

    // Minimap inner background + SVG view + border
    const mapX = pad;
    const mapY = headerH + 2;
    ctx.fillStyle = mapBgHex;
    ctx.fillRect(mapX, mapY, width, height);
    ctx.drawImage(img, mapX, mapY, width, height);

    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX + 0.5, mapY + 0.5, width - 1, height - 1);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!pngBlob) return false;

    const cleanSubnet = subnet.replace(/[^a-zA-Z0-9._-]/g, '_');
    triggerBlobDownload(pngBlob, `grid-minimap-${cleanSubnet}-${mode}.png`);
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
