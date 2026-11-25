import {
  DeviceAlias,
  InterfaceInfo,
  NetworkConfig,
  ScanResult,
  SnmpL2MappingResult,
  TopologyEdge,
  TopologyGraphPayload,
  TopologyNode,
  TopologyNodeTier,
  TopologyRiskState,
} from '../types';
import { compareIpv4 } from './cidrUtils';
import { ConflictInfo, isConflictAlert } from './conflictDetector';

const INFRA_KEYWORDS = [
  'cisco',
  'hpe',
  'hewlett',
  'aruba',
  'fortinet',
  'juniper',
  'palo alto',
  'ahnlab',
  'genians',
  'iptime',
  'efm',
  'mikrotik',
  'ubiquiti',
  'unifi',
  'dasan',
  'netgear',
  'tp-link',
  'asus',
  'gateway',
  'router',
  'switch',
  'firewall',
  'nas',
  'synology',
  'qnap',
];

const VM_KEYWORDS = [
  'vmware',
  'virtualbox',
  'qemu',
  'kvm',
  'docker',
  'hyper-v',
  'parallels',
  'virtual',
  'proxmox',
];

export function detectSubnetGatewayIp(
  subnet: string,
  results: Record<string, ScanResult>,
  explicitGatewayIp?: string
): string {
  if (explicitGatewayIp && explicitGatewayIp.startsWith(`${subnet}.`)) {
    return explicitGatewayIp;
  }
  const dot1 = `${subnet}.1`;
  const dot254 = `${subnet}.254`;
  const dot253 = `${subnet}.253`;
  if (results[dot1]?.status === 'active') return dot1;
  if (results[dot254]?.status === 'active') return dot254;
  if (results[dot253]?.status === 'active') return dot253;
  return dot1;
}

function resolveTier(
  ip: string,
  gatewayIp: string,
  vendor: string,
  hostname: string,
  deviceType: string,
  isProxyArp: boolean,
  isLaaVm: boolean
): TopologyNodeTier {
  if (ip === gatewayIp) return 'gateway';
  const haystack = `${vendor} ${hostname} ${deviceType}`.toLowerCase();
  if (isProxyArp || INFRA_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return 'infra';
  }
  if (isLaaVm || VM_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return 'vm';
  }
  return 'endpoint';
}

export function buildClientTopologyGraph(params: {
  config: NetworkConfig;
  results: Record<string, ScanResult>;
  detectedConflicts: Map<string, ConflictInfo>;
  detectedIntruders: Array<{ ip: string }>;
  softTrustedDevices: Array<{ ip: string; similarityScore?: number }>;
  aliases: Record<string, DeviceAlias>;
  localIpInfo?: { ip: string; subnet: string } | null;
  vlanTag?: string;
  explicitGatewayIp?: string;
  snmpL2Map?: SnmpL2MappingResult | null;
}): TopologyGraphPayload {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const {
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
  } = params;

  const gatewayIp = detectSubnetGatewayIp(config.subnet, results, explicitGatewayIp);
  const intruderSet = new Set(detectedIntruders.map((d) => d.ip));
  const softTrustMap = new Map(softTrustedDevices.map((d) => [d.ip, d]));

  const activeItems = Object.values(results).filter((r) => r.status === 'active');
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  const hasGatewayActive = activeItems.some((item) => item.ip === gatewayIp);
  if (!hasGatewayActive && activeItems.length > 0 && gatewayIp) {
    nodes.push({
      id: gatewayIp,
      ip: gatewayIp,
      label: 'Gateway / L3 Router',
      tier: 'gateway',
      riskState: 'normal',
      openPortCount: 0,
      vlanTag,
      isActive: false,
    });
  }

  const switchIps = new Set<string>((snmpL2Map?.switches || []).map((sw) => sw.switchIp));
  const nodeByIp = new Map<string, TopologyNode>();
  nodes.forEach((n) => nodeByIp.set(n.ip, n));

  activeItems
    .sort((a, b) => compareIpv4(a.ip, b.ip))
    .forEach((item) => {
      const dev = item.device;
      const conflict = detectedConflicts.get(item.ip);
      const isProxyArp = Boolean(conflict?.isGatewayProxyArp);
      const isRealConflict = Boolean(isConflictAlert(conflict));
      const isSoftTrust = softTrustMap.has(item.ip);
      const isIntruder = intruderSet.has(item.ip);

      let riskState: TopologyRiskState = 'normal';
      let reason = '';
      if (isRealConflict) {
        riskState = 'conflict';
        reason = conflict?.reason || 'IP/MAC conflict detected';
      } else if (isProxyArp) {
        riskState = 'proxy_arp';
        reason = conflict?.reason || 'Benign Gateway/Infra Proxy-ARP';
      } else if (isSoftTrust) {
        riskState = 'soft_trust';
        const sim = softTrustMap.get(item.ip)?.similarityScore;
        reason = sim ? `Soft-Trust LAA Grace (${sim}%)` : 'Soft-Trust LAA Grace';
      } else if (isIntruder) {
        riskState = 'intruder';
        reason = 'Unrecognized Host (Intruder Watch)';
      }

      const macClean = (dev?.mac || '').replace(/[:\-]/g, '').toUpperCase();
      const alias =
        (macClean && aliases[macClean]) || aliases[item.ip];
      const displayLabel =
        alias?.nickname ||
        (dev?.hostname && dev.hostname !== 'Unknown' ? dev.hostname : '') ||
        dev?.realVendor ||
        dev?.vendor ||
        item.ip;

      const l2Mapping = snmpL2Map?.hostMapByIp?.[item.ip];
      const isSwitch = switchIps.has(item.ip);
      const isLaaVm = dev?.ouiBlockType === 'LAA-VM';
      const resolvedTier = isSwitch && item.ip !== gatewayIp
        ? 'infra'
        : resolveTier(
            item.ip,
            gatewayIp,
            dev?.realVendor || dev?.vendor || '',
            dev?.hostname || '',
            dev?.deviceType || '',
            isProxyArp,
            isLaaVm
          );

      const node: TopologyNode = {
        id: item.ip,
        ip: item.ip,
        label: displayLabel,
        mac: dev?.mac,
        vendor: dev?.realVendor || dev?.vendor,
        deviceType: dev?.deviceType,
        tier: resolvedTier,
        riskState,
        latencyMs: dev?.latency,
        openPorts: dev?.openPorts,
        openPortCount: dev?.openPorts?.length || 0,
        reason,
        vlanTag,
        isHost: localIpInfo?.ip === item.ip,
        isActive: true,
        isSwitch,
        switchIp: l2Mapping?.switchIp || dev?.switchIp,
        switchName: l2Mapping?.switchName || dev?.switchName,
        switchPort: l2Mapping?.portName || dev?.switchPort,
        vlanId: l2Mapping?.vlanId ?? dev?.switchVlanId,
        speedMbps: l2Mapping?.speedMbps ?? dev?.switchPortSpeedMbps,
        isUplink: l2Mapping?.isUplink ?? dev?.isUplink,
      };
      nodes.push(node);
      nodeByIp.set(item.ip, node);
    });

  // Ensure every polled SNMP L2 switch exists in the graph and is linked up to the gateway
  (snmpL2Map?.switches || []).forEach((sw) => {
    if (!sw.switchIp) return;
    let swNode = nodeByIp.get(sw.switchIp);
    if (!swNode) {
      swNode = {
        id: sw.switchIp,
        ip: sw.switchIp,
        label: sw.sysName || `Switch ${sw.switchIp}`,
        deviceType: 'L2 Switch',
        tier: sw.switchIp === gatewayIp ? 'gateway' : 'infra',
        riskState: sw.error ? 'conflict' : 'normal',
        reason: sw.error ? `SNMP: ${sw.error}` : `${sw.mappedMacCount} MACs · ${sw.totalPorts} ports`,
        openPortCount: 0,
        vlanTag,
        isActive: !sw.error,
        isSwitch: true,
      };
      nodes.push(swNode);
      nodeByIp.set(sw.switchIp, swNode);
    } else {
      swNode.isSwitch = true;
      if (sw.sysName && swNode.label === sw.switchIp) {
        swNode.label = sw.sysName;
      }
      if (swNode.tier !== 'gateway') {
        swNode.tier = 'infra';
      }
    }

    if (sw.switchIp !== gatewayIp && gatewayIp) {
      edges.push({
        id: `${gatewayIp}->${sw.switchIp}:switch_uplink`,
        fromIp: gatewayIp,
        toIp: sw.switchIp,
        relation: 'switch_uplink',
        switchIp: sw.switchIp,
        isUplink: true,
        label: sw.uplinkPorts?.length ? `Uplink (${sw.uplinkPorts[0]})` : 'Switch Uplink',
      });
    }
  });

  // Connect endpoints & non-switch infra nodes (L2 physical port if mapped, else gateway L3 uplink)
  nodes.forEach((node) => {
    if (node.ip === gatewayIp || node.isSwitch) return;
    if (node.switchIp && node.switchPort && nodeByIp.has(node.switchIp) && node.switchIp !== node.ip) {
      edges.push({
        id: `${node.switchIp}->${node.ip}:l2`,
        fromIp: node.switchIp,
        toIp: node.ip,
        relation: 'physical_port',
        switchIp: node.switchIp,
        switchPort: node.switchPort,
        vlanId: node.vlanId,
        speedMbps: node.speedMbps,
        isUplink: node.isUplink,
        label: `${node.switchPort}${node.vlanId ? ` · V${node.vlanId}` : ''}`,
      });
      return;
    }

    if (gatewayIp) {
      const relation =
        node.riskState === 'proxy_arp'
          ? 'proxy_arp_alias'
          : node.riskState === 'conflict'
          ? 'conflict_alert'
          : node.riskState === 'soft_trust'
          ? 'soft_trust_link'
          : node.riskState === 'intruder'
          ? 'intruder_link'
          : 'uplink';

      edges.push({
        id: `${gatewayIp}->${node.ip}`,
        fromIp: gatewayIp,
        toIp: node.ip,
        relation,
        label:
          relation === 'proxy_arp_alias'
            ? 'Proxy-ARP'
            : relation === 'conflict_alert'
            ? 'Conflict'
            : relation === 'soft_trust_link'
            ? 'Soft Trust'
            : relation === 'intruder_link'
            ? 'Intruder'
            : undefined,
      });
    }
  });

  const elapsedUs = Math.max(
    10,
    Math.round(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) * 1000)
  );

  return {
    subnet: config.subnet,
    vlanTag,
    gatewayIp,
    nodes,
    edges,
    engine: 'client_topology_correlator',
    elapsedMicroseconds: elapsedUs,
  };
}

export function mergeNativeTopologyOverlay(
  clientGraph: TopologyGraphPayload,
  nativeGraph: TopologyGraphPayload | null
): TopologyGraphPayload {
  if (!nativeGraph || !Array.isArray(nativeGraph.nodes) || nativeGraph.subnet !== clientGraph.subnet) {
    return clientGraph;
  }
  const nativeNodeMap = new Map(nativeGraph.nodes.map((n) => [n.ip, n]));
  const mergedNodes: TopologyNode[] = clientGraph.nodes.map((node) => {
    const nat = nativeNodeMap.get(node.ip);
    if (!nat) return node;
    return {
      ...node,
      tier: nat.tier || node.tier,
      riskState:
        node.riskState === 'normal' && nat.riskState !== 'normal'
          ? nat.riskState
          : node.riskState,
      anomalyMask: nat.anomalyMask ?? node.anomalyMask,
      reason: nat.reason || node.reason,
    };
  });

  const edgeMap = new Map(nativeGraph.edges.map((e) => [e.id, e]));
  const mergedEdges: TopologyEdge[] = clientGraph.edges.map((edge) => {
    const nat = edgeMap.get(edge.id);
    if (!nat) return edge;
    return {
      ...edge,
      relation:
        edge.relation === 'uplink' && nat.relation !== 'uplink'
          ? nat.relation
          : edge.relation,
      label: edge.label || nat.label,
    };
  });

  return {
    ...clientGraph,
    nodes: mergedNodes,
    edges: mergedEdges,
    engine: nativeGraph.engine || clientGraph.engine,
    elapsedMicroseconds: nativeGraph.elapsedMicroseconds || clientGraph.elapsedMicroseconds,
    summary: nativeGraph.summary ?? clientGraph.summary,
  };
}
