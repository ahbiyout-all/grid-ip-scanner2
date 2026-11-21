import React, { useEffect, useState } from 'react';
import {
  X,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Square,
  Lock,
  CheckCircle2,
  Radar,
  ArrowUpRight,
  Pencil,
  Check,
} from 'lucide-react';
import {
  DiscoveredSubnetCandidate,
  InterfaceInfo,
  MultiSubnetBatchState,
  SubnetProfile,
} from '../types';
import { ResolvedFeatureGates } from '../services/licenseManager';
import { discoverLocalSubnets } from '../services/nativeModulesService';
import {
  buildCandidatesFromInterfaces,
  normalizeSubnetBase,
  normalizeVlanTag,
} from '../services/multiSubnetManager';

interface MultiSubnetModalProps {
  isOpen: boolean;
  initialTab?: 'dashboard' | 'discover' | 'add';
  onClose: () => void;
  profiles: SubnetProfile[];
  activeProfileId: string;
  interfaces: InterfaceInfo[];
  batchState: MultiSubnetBatchState;
  featureGates: ResolvedFeatureGates;
  onSelectProfile: (profileId: string) => void;
  onAddProfile: (profile: Omit<SubnetProfile, 'id' | 'activeCount' | 'realConflictCount' | 'proxyArpCount' | 'intruderCount'>) => boolean;
  onUpdateProfile: (profileId: string, patch: Partial<Pick<SubnetProfile, 'label' | 'vlanId' | 'gatewayIp'>>) => void;
  onRemoveProfile: (profileId: string) => void;
  onToggleBatchSweep: () => void;
  onRequirePro: (featureId: 'multiSubnetUnlimited' | 'multiSubnetBatchSweep', context?: string) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

function isValidIpv4Address(raw: string): boolean {
  const parts = raw.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export const MultiSubnetModal: React.FC<MultiSubnetModalProps> = ({
  isOpen,
  initialTab = 'dashboard',
  onClose,
  profiles,
  activeProfileId,
  interfaces,
  batchState,
  featureGates,
  onSelectProfile,
  onAddProfile,
  onUpdateProfile,
  onRemoveProfile,
  onToggleBatchSweep,
  onRequirePro,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [tab, setTab] = useState<'dashboard' | 'discover' | 'add'>(initialTab);
  const [candidates, setCandidates] = useState<DiscoveredSubnetCandidate[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Add Form State
  const [label, setLabel] = useState('');
  const [subnetInput, setSubnetInput] = useState('192.168.10');
  const [startInput, setStartInput] = useState(1);
  const [endInput, setEndInput] = useState(254);
  const [vlanInput, setVlanInput] = useState('');
  const [gatewayInput, setGatewayInput] = useState('');
  const [formError, setFormError] = useState('');

  // Inline Profile Edit State
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editVlan, setEditVlan] = useState('');
  const [editGateway, setEditGateway] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setFormError('');
      setEditingProfileId(null);
      setEditError('');
    }
  }, [isOpen, initialTab]);

  const runDiscovery = async () => {
    setIsDiscovering(true);
    const remote = await discoverLocalSubnets();
    if (remote.length > 0) {
      setCandidates(remote);
    } else {
      setCandidates(buildCandidatesFromInterfaces(interfaces));
    }
    setIsDiscovering(false);
  };

  useEffect(() => {
    if (isOpen && tab === 'discover') {
      runDiscovery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const surfaceCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] text-[#4a3723] border-[#dcc7a1]'
      : theme === 'white'
      ? 'bg-white text-slate-900 border-slate-200'
      : theme === 'gray'
      ? 'bg-zinc-900 text-zinc-100 border-zinc-700'
      : 'bg-slate-900 text-slate-100 border-slate-800';

  const hairlineCls =
    theme === 'beige'
      ? 'border-[#e6d5b8]'
      : theme === 'white'
      ? 'border-slate-200'
      : theme === 'gray'
      ? 'border-zinc-800'
      : 'border-slate-800';

  const subtleCardCls =
    theme === 'beige'
      ? 'bg-[#f6ede0] border-[#e0cea8]'
      : theme === 'white'
      ? 'bg-slate-50 border-slate-200'
      : 'bg-slate-950/60 border-slate-800';

  const inputCls =
    theme === 'beige'
      ? 'bg-white border-[#d4be9c] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-white border-slate-300 text-slate-900'
      : 'bg-black/40 border-slate-700 text-white';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const totalActive = profiles.reduce((acc, p) => acc + p.activeCount, 0);
  const totalConflicts = profiles.reduce((acc, p) => acc + p.realConflictCount, 0);
  const totalProxyArp = profiles.reduce((acc, p) => acc + p.proxyArpCount, 0);
  const totalIntruders = profiles.reduce((acc, p) => acc + p.intruderCount, 0);

  const canAddMore = profiles.length < featureGates.maxSubnets;

  const handleAddCandidate = (c: DiscoveredSubnetCandidate) => {
    if (!canAddMore) {
      onRequirePro('multiSubnetUnlimited', `${c.subnet}.0/24`);
      return;
    }
    const ok = onAddProfile({
      label: c.interfaceName || `${c.subnet}.0/24`,
      subnet: c.subnet,
      start: c.start,
      end: c.end,
      cidr: c.cidr,
      gatewayIp: c.gatewayIp,
      interfaceName: c.interfaceName,
      vlanId: normalizeVlanTag(c.vlanHint),
      type: c.type === 'virtual' || c.type === 'vpn' || c.type === 'physical' ? c.type : 'other',
      pinned: true,
    });
    if (ok) {
      setTab('dashboard');
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddMore) {
      onRequirePro('multiSubnetUnlimited', subnetInput);
      return;
    }
    const base = normalizeSubnetBase(subnetInput);
    const octets = base.split('.');
    if (
      octets.length !== 3 ||
      !octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) >= 0 && Number(o) <= 255)
    ) {
      setFormError(isKo ? '유효한 3옥텟 IPv4 대역을 입력하세요 (예: 192.168.10)' : 'Enter valid 3-octet IPv4 prefix (e.g. 192.168.10)');
      return;
    }
    if (!Number.isFinite(startInput) || !Number.isFinite(endInput)) {
      setFormError(isKo ? '시작/종료 IP 호스트 번호를 0~255 사이 숫자로 입력하세요.' : 'Enter numeric start/end host values between 0 and 255.');
      return;
    }
    const sIp = Math.max(0, Math.min(255, Math.round(startInput)));
    const eIp = Math.max(0, Math.min(255, Math.round(endInput)));
    if (sIp > eIp) {
      setFormError(isKo ? '시작 IP가 종료 IP보다 클 수 없습니다.' : 'Start IP cannot exceed End IP.');
      return;
    }
    const gwRaw = gatewayInput.trim();
    if (gwRaw && !isValidIpv4Address(gwRaw)) {
      setFormError(isKo ? '게이트웨이 IP 형식이 올바르지 않습니다 (예: 192.168.10.1).' : 'Invalid gateway IPv4 address (e.g. 192.168.10.1).');
      return;
    }
    const gw = gwRaw || `${base}.1`;
    const ok = onAddProfile({
      label: label.trim() || `${base}.0/24`,
      subnet: base,
      start: sIp,
      end: eIp,
      cidr: `${base}.0/24`,
      gatewayIp: gw,
      vlanId: normalizeVlanTag(vlanInput),
      type: 'custom',
      pinned: true,
    });
    if (ok) {
      setLabel('');
      setVlanInput('');
      setGatewayInput('');
      setFormError('');
      setTab('dashboard');
    }
  };

  const startEditingProfile = (prof: SubnetProfile) => {
    setEditingProfileId(prof.id);
    setEditLabel(prof.label);
    setEditVlan(prof.vlanId || '');
    setEditGateway(prof.gatewayIp || '');
    setEditError('');
  };

  const commitEditingProfile = (prof: SubnetProfile) => {
    const trimmedGw = editGateway.trim();
    if (trimmedGw && !isValidIpv4Address(trimmedGw)) {
      setEditError(isKo ? '유효한 IPv4 게이트웨이 주소를 입력하세요.' : 'Enter a valid IPv4 gateway address.');
      return;
    }
    onUpdateProfile(prof.id, {
      label: editLabel.trim() || prof.label,
      vlanId: normalizeVlanTag(editVlan),
      gatewayIp: trimmedGw || `${prof.subnet}.1`,
    });
    setEditingProfileId(null);
    setEditError('');
  };

  return (
    <div
      className="fixed inset-0 z-[245] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[88dvh] rounded-xl border shadow-2xl flex flex-col overflow-hidden ${surfaceCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${hairlineCls} flex items-center justify-between gap-3 shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isKo ? '다중 서브넷 · VLAN 통합 대시보드' : 'Multi-Subnet & VLAN Unified Dashboard'}
              </h2>
              <p className={`text-[11px] font-mono tabular-nums ${mutedCls}`}>
                {isKo
                  ? `허용 대역: ${profiles.length}/${featureGates.maxSubnets === 999 ? '무제한' : featureGates.maxSubnets} · 대역별 캐시 자동 보존`
                  : `Quota: ${profiles.length}/${featureGates.maxSubnets === 999 ? 'Unlimited' : featureGates.maxSubnets} subnets · Per-subnet cache preserved`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mutedCls} hover:opacity-80`}
            aria-label={isKo ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`px-5 py-2.5 border-b ${hairlineCls} flex items-center justify-between gap-2 flex-wrap shrink-0`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                tab === 'dashboard'
                  ? 'bg-sky-600 text-white'
                  : `${subtleCardCls} border hover:opacity-85`
              }`}
            >
              {isKo ? '통합 대시보드' : 'Unified Summary'}
            </button>
            <button
              type="button"
              onClick={() => setTab('discover')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                tab === 'discover'
                  ? 'bg-sky-600 text-white'
                  : `${subtleCardCls} border hover:opacity-85`
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>{isKo ? 'NIC · VLAN 자동 탐색' : 'Auto-Discover NIC/VLAN'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('add')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                tab === 'add'
                  ? 'bg-sky-600 text-white'
                  : `${subtleCardCls} border hover:opacity-85`
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isKo ? '수동 대역 추가' : 'Add Custom Subnet'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!featureGates.multiSubnetBatchSweep) {
                onRequirePro('multiSubnetBatchSweep');
                return;
              }
              onToggleBatchSweep();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              batchState.isRunning
                ? 'bg-rose-600 border-rose-500 text-white'
                : !featureGates.multiSubnetBatchSweep
                ? isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
            }`}
          >
            {batchState.isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isKo
                    ? `일괄 스캔 중지 (${batchState.completedIds.length + 1}/${batchState.queueIds.length})`
                    : `Stop Sweep (${batchState.completedIds.length + 1}/${batchState.queueIds.length})`}
                </span>
              </>
            ) : !featureGates.multiSubnetBatchSweep ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{isKo ? '전체 대역 순차 일괄 스캔 (PRO+)' : 'Sequential Batch Sweep (PRO+)'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isKo ? '전체 대역 순차 일괄 스캔' : 'Run Batch Sweep'}</span>
              </>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {tab === 'dashboard' && (
            <>
              {/* Cross-Subnet Aggregated Metric Strip (max 5 KPIs, flat single elevation) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className={`p-3 rounded-lg border ${subtleCardCls}`}>
                  <div className={`text-[10.5px] font-medium ${mutedCls}`}>
                    {isKo ? '등록된 대역/VLAN' : 'Subnets / VLANs'}
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums mt-1">
                    {profiles.length}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${subtleCardCls}`}>
                  <div className={`text-[10.5px] font-medium ${mutedCls}`}>
                    {isKo ? '총 활성 호스트' : 'Total Active'}
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums mt-1 text-emerald-500">
                    {totalActive}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${subtleCardCls}`}>
                  <div className={`text-[10.5px] font-medium ${mutedCls}`}>
                    {isKo ? '실제 IP 충돌' : 'Real Conflicts'}
                  </div>
                  <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${totalConflicts > 0 ? 'text-rose-500' : ''}`}>
                    {totalConflicts}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${subtleCardCls}`}>
                  <div className={`text-[10.5px] font-medium ${mutedCls}`}>
                    {isKo ? 'Proxy-ARP (정상)' : 'Proxy-ARP (Info)'}
                  </div>
                  <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${totalProxyArp > 0 ? 'text-sky-500' : ''}`}>
                    {totalProxyArp}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${subtleCardCls}`}>
                  <div className={`text-[10.5px] font-medium ${mutedCls}`}>
                    {isKo ? '미등록 침입 의심' : 'Intruders'}
                  </div>
                  <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${totalIntruders > 0 ? 'text-purple-400' : ''}`}>
                    {totalIntruders}
                  </div>
                </div>
              </div>

              {/* Profiles Summary Table */}
              <div className={`rounded-lg border ${hairlineCls} overflow-x-auto`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b ${hairlineCls} ${subtleCardCls} text-[10.5px] uppercase tracking-wider`}>
                      <th className="py-2.5 px-3 font-bold">{isKo ? '프로파일 / VLAN' : 'Profile / VLAN'}</th>
                      <th className="py-2.5 px-3 font-bold">{isKo ? '서브넷 범위' : 'Range'}</th>
                      <th className="py-2.5 px-3 font-bold text-right">{isKo ? '활성' : 'Active'}</th>
                      <th className="py-2.5 px-3 font-bold text-right">{isKo ? '충돌 · 침입' : 'Alerts'}</th>
                      <th className="py-2.5 px-3 font-bold text-right">{isKo ? '최근 스캔' : 'Last Scan'}</th>
                      <th className="py-2.5 px-3 font-bold text-right">{isKo ? '작업' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${hairlineCls}`}>
                    {profiles.map((prof) => {
                      const isActive = prof.id === activeProfileId;
                      const isEditing = editingProfileId === prof.id;
                      return (
                        <tr
                          key={prof.id}
                          className={`transition-colors ${
                            isActive
                              ? isLight
                                ? 'bg-sky-50/80'
                                : 'bg-sky-500/10'
                              : isLight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <div className="space-y-1.5 min-w-[200px]">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    placeholder={isKo ? '프로파일 별칭' : 'Profile Label'}
                                    className={`flex-1 min-w-0 px-2 py-1 rounded border text-[11px] outline-none ${inputCls}`}
                                  />
                                  <input
                                    type="text"
                                    value={editVlan}
                                    onChange={(e) => setEditVlan(e.target.value)}
                                    placeholder="VLAN 20"
                                    className={`w-20 px-2 py-1 rounded border text-[11px] font-mono outline-none ${inputCls}`}
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={editGateway}
                                  onChange={(e) => setEditGateway(e.target.value)}
                                  placeholder={`${prof.subnet}.1`}
                                  className={`w-full px-2 py-1 rounded border text-[10.5px] font-mono tabular-nums outline-none ${inputCls}`}
                                />
                                {editError && (
                                  <div className="text-[10px] font-bold text-rose-500">{editError}</div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="font-bold flex items-center gap-1.5">
                                  <span>{prof.label}</span>
                                  {prof.vlanId && (
                                    <span className={`font-mono text-[10.5px] ${mutedCls}`}>
                                      · {prof.vlanId}
                                    </span>
                                  )}
                                </div>
                                {prof.gatewayIp && (
                                  <div className={`text-[10.5px] font-mono tabular-nums ${mutedCls}`}>
                                    GW {prof.gatewayIp}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums">
                            {prof.subnet}.{prof.start}-{prof.end}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-500">
                            {prof.activeCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <span className={prof.realConflictCount > 0 ? 'text-rose-500 font-bold' : mutedCls}>
                              {prof.realConflictCount}
                            </span>
                            <span className="opacity-40 mx-1">/</span>
                            <span className={prof.intruderCount > 0 ? 'text-purple-400 font-bold' : mutedCls}>
                              {prof.intruderCount}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono tabular-nums text-[11px] ${mutedCls}`}>
                            {prof.lastScannedAt
                              ? new Date(prof.lastScannedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => commitEditingProfile(prof)}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title={isKo ? '저장' : 'Save'}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{isKo ? '저장' : 'Save'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProfileId(null);
                                      setEditError('');
                                    }}
                                    className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer ${subtleCardCls}`}
                                  >
                                    {isKo ? '취소' : 'Cancel'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProfile(prof.id);
                                      onClose();
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                                      isActive
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                                    }`}
                                  >
                                    {isActive ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>{isKo ? '현재 작업중' : 'Active'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <ArrowUpRight className="w-3 h-3" />
                                        <span>{isKo ? '전환' : 'Switch'}</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditingProfile(prof)}
                                    className={`p-1.5 rounded border transition-colors cursor-pointer ${subtleCardCls} hover:opacity-80`}
                                    title={isKo ? 'VLAN · 별칭 · 게이트웨이 편집' : 'Edit VLAN / Label / Gateway'}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {profiles.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveProfile(prof.id)}
                                      className="p-1.5 rounded text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                                      title={isKo ? '프로파일 제거' : 'Remove profile'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'discover' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs ${mutedCls}`}>
                  {isKo
                    ? '로컬 NIC · VLAN 어댑터 · 가상 스위치 · VPN 터널에서 탐색된 서브넷 목록입니다.'
                    : 'Subnets automatically detected from local NICs, VLAN interfaces, virtual switches, and VPN tunnels.'}
                </p>
                <button
                  type="button"
                  onClick={runDiscovery}
                  disabled={isDiscovering}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${subtleCardCls}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                  <span>{isKo ? '다시 탐색' : 'Refresh'}</span>
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className={`p-8 rounded-lg border text-center text-xs ${subtleCardCls} ${mutedCls}`}>
                  {isDiscovering
                    ? isKo
                      ? '로컬 인터페이스 대역 탐색 중...'
                      : 'Discovering local subnet interfaces...'
                    : isKo
                    ? '감지된 추가 IPv4 대역이 없습니다. 수동 추가 탭을 이용해 주세요.'
                    : 'No additional IPv4 subnets detected. Use the manual add tab.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidates.map((cand) => {
                    const alreadyAdded = profiles.some(
                      (p) => p.subnet === cand.subnet && p.start === cand.start && p.end === cand.end
                    );
                    return (
                      <div
                        key={cand.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 ${subtleCardCls}`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <span className="truncate">{cand.interfaceName}</span>
                            {cand.vlanHint && (
                              <span className={`font-mono text-[10.5px] ${mutedCls}`}>
                                · {cand.vlanHint}
                              </span>
                            )}
                          </div>
                          <div className="font-mono tabular-nums text-xs font-bold text-sky-500">
                            {cand.subnet}.{cand.start}-{cand.end} ({cand.cidr})
                          </div>
                          <div className={`text-[10.5px] font-mono tabular-nums ${mutedCls}`}>
                            Host {cand.interfaceIp} · GW {cand.gatewayIp} · {cand.status.toUpperCase()}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddCandidate(cand)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 ${
                            alreadyAdded
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                              : !canAddMore
                              ? 'bg-amber-500 text-black'
                              : 'bg-sky-600 hover:bg-sky-500 text-white'
                          }`}
                        >
                          {alreadyAdded
                            ? isKo
                              ? '등록됨'
                              : 'Added'
                            : !canAddMore
                            ? isKo
                              ? '확장 (PRO)'
                              : 'Expand'
                            : isKo
                            ? '추가'
                            : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'add' && (
            <form onSubmit={handleCreateCustom} className={`p-4 rounded-lg border space-y-3.5 ${subtleCardCls}`}>
              {!canAddMore && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs flex items-center justify-between gap-2">
                  <span>
                    {isKo
                      ? `현재 티어(${featureGates.maxSubnets}개 대역 한도)에 도달했습니다. PRO(5개) 또는 Enterprise(무제한)로 확장할 수 있습니다.`
                      : `Subnet limit (${featureGates.maxSubnets}) reached for your tier. Upgrade to PRO (5) or Enterprise (Unlimited).`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRequirePro('multiSubnetUnlimited')}
                    className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    {isKo ? '업그레이드' : 'Upgrade'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? '대역 별칭 (Label)' : 'Profile Label'}</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={isKo ? '예: 본사 IoT VLAN 20' : 'e.g. Corp IoT VLAN 20'}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${inputCls}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? 'VLAN ID (선택)' : 'VLAN Tag (Optional)'}</label>
                  <input
                    type="text"
                    value={vlanInput}
                    onChange={(e) => setVlanInput(e.target.value)}
                    placeholder="VLAN 20"
                    className={`w-full px-3 py-2 rounded-lg border font-mono outline-none ${inputCls}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? '서브넷 3옥텟 *' : 'Subnet Prefix *'}</label>
                  <input
                    type="text"
                    value={subnetInput}
                    onChange={(e) => setSubnetInput(e.target.value)}
                    placeholder="192.168.10"
                    className={`w-full px-3 py-2 rounded-lg border font-mono tabular-nums outline-none ${inputCls}`}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? '게이트웨이 IP (선택)' : 'Gateway IP (Optional)'}</label>
                  <input
                    type="text"
                    value={gatewayInput}
                    onChange={(e) => setGatewayInput(e.target.value)}
                    placeholder="192.168.10.1"
                    className={`w-full px-3 py-2 rounded-lg border font-mono tabular-nums outline-none ${inputCls}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? '시작 호스트 (0-255)' : 'Start Host (0-255)'}</label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={startInput}
                    onChange={(e) => setStartInput(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border font-mono tabular-nums outline-none ${inputCls}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold opacity-80">{isKo ? '종료 호스트 (0-255)' : 'End Host (0-255)'}</label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={endInput}
                    onChange={(e) => setEndInput(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border font-mono tabular-nums outline-none ${inputCls}`}
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
                >
                  {isKo ? '서브넷 프로파일 저장' : 'Save Subnet Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
