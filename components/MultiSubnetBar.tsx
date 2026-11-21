import React from 'react';
import { Layers, Plus, Play, Square, Lock, Network, Tag, X } from 'lucide-react';
import { MultiSubnetBatchState, SubnetProfile } from '../types';
import { ResolvedFeatureGates } from '../services/licenseManager';

interface MultiSubnetBarProps {
  profiles: SubnetProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onOpenAddDiscover: () => void;
  onOpenDashboard: () => void;
  onToggleBatchSweep: () => void;
  onHide?: () => void;
  batchState: MultiSubnetBatchState;
  featureGates: ResolvedFeatureGates;
  isScanning: boolean;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

interface VlanVisualMeta {
  isSegmented: boolean;
  tagLabel: string;
  numericId: string | null;
  colorIndex: number;
}

function getVlanVisualMeta(prof: SubnetProfile): VlanVisualMeta {
  const raw = (prof.vlanId || '').trim();
  const fallbackMatch = !raw
    ? /(?:vlan[\s_\-:]?(\d{1,4}))/i.exec(`${prof.interfaceName || ''} ${prof.label || ''}`)
    : null;
  const effectiveRaw = raw || (fallbackMatch ? `VLAN ${fallbackMatch[1]}` : '');

  if (!effectiveRaw) {
    return {
      isSegmented: false,
      tagLabel: '',
      numericId: null,
      colorIndex: 0,
    };
  }

  const numMatch = /(\d{1,4})/.exec(effectiveRaw);
  const numericId = numMatch ? numMatch[1] : null;
  const tagLabel = numericId && effectiveRaw.toLowerCase().includes('vlan')
    ? `VLAN ${numericId}`
    : numericId && /^\d{1,4}$/.test(effectiveRaw)
    ? `VLAN ${numericId}`
    : effectiveRaw;

  let hash = 0;
  for (let i = 0; i < tagLabel.length; i += 1) {
    hash = (hash * 31 + tagLabel.charCodeAt(i)) >>> 0;
  }
  const seed = numericId ? Number(numericId) : hash;

  return {
    isSegmented: true,
    tagLabel,
    numericId,
    colorIndex: Math.abs(seed) % 6,
  };
}

const VLAN_DARK_ACCENTS = [
  'text-cyan-300',
  'text-emerald-300',
  'text-amber-300',
  'text-violet-300',
  'text-rose-300',
  'text-sky-300',
] as const;

const VLAN_LIGHT_ACCENTS = [
  'text-cyan-700',
  'text-emerald-700',
  'text-amber-700',
  'text-violet-700',
  'text-rose-700',
  'text-sky-700',
] as const;

const VLAN_DOT_MARKERS = [
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-sky-400',
] as const;

export const MultiSubnetBar: React.FC<MultiSubnetBarProps> = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onOpenAddDiscover,
  onOpenDashboard,
  onToggleBatchSweep,
  onHide,
  batchState,
  featureGates,
  isScanning,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  const activeVlanMeta = activeProfile ? getVlanVisualMeta(activeProfile) : null;

  const barBg =
    theme === 'beige'
      ? 'bg-[#f6ede0] border-[#dcc7a1] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-slate-50 border-slate-200 text-slate-800'
      : theme === 'gray'
      ? 'bg-zinc-900/95 border-zinc-800 text-zinc-200'
      : 'bg-slate-950/90 border-slate-800/80 text-slate-200';

  const subtleBtnCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#d4be9c] text-[#4a341e] hover:bg-[#efe4d2]'
      : theme === 'white'
      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white';

  const dividerCls = isLight ? 'bg-slate-300' : 'bg-white/15';

  return (
    <div className={`w-full border-b px-3 lg:px-6 py-1.5 flex items-center justify-between gap-2 shrink-0 ${barBg}`}>
      {/* Left: Active VLAN Visual Indicator + Subnet / VLAN Profile Switcher Tabs */}
      <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold tracking-wider opacity-75 shrink-0 mr-0.5 whitespace-nowrap">
          <Network className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span>{isKo ? '서브넷·VLAN' : 'Subnets'}</span>
          <span className="font-mono tabular-nums">
            ({profiles.length}/{featureGates.maxSubnets === 999 ? '∞' : featureGates.maxSubnets})
          </span>
        </div>

        {/* Dedicated Active Profile VLAN Tag Indicator */}
        {activeProfile && activeVlanMeta && (
          <button
            type="button"
            onClick={onOpenDashboard}
            title={
              activeVlanMeta.isSegmented
                ? isKo
                  ? `현재 활성 세그먼트: ${activeVlanMeta.tagLabel} (${activeProfile.subnet}.0/24) · 클릭하여 VLAN 대시보드 열기`
                  : `Active VLAN Segment: ${activeVlanMeta.tagLabel} (${activeProfile.subnet}.0/24) · Click to manage`
                : isKo
                ? `현재 대역(${activeProfile.subnet}.0/24)은 VLAN 태그 미지정(Native) 상태입니다 · 클릭하여 설정`
                : `Active subnet (${activeProfile.subnet}.0/24) is untagged (Native LAN) · Click to configure`
            }
            className={`px-2 py-1 rounded-md border text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
              activeVlanMeta.isSegmented
                ? isLight
                  ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'
                  : 'bg-white/[0.06] border-white/15 text-slate-100 hover:bg-white/10'
                : subtleBtnCls
            }`}
          >
            <Tag
              className={`w-3 h-3 shrink-0 ${
                activeVlanMeta.isSegmented
                  ? isLight
                    ? VLAN_LIGHT_ACCENTS[activeVlanMeta.colorIndex]
                    : VLAN_DARK_ACCENTS[activeVlanMeta.colorIndex]
                  : 'opacity-55'
              }`}
            />
            <span className="text-[10px] opacity-65">
              {isKo ? '활성 태그' : 'Active Tag'}
            </span>
            <span aria-hidden="true" className={`w-px h-3 ${dividerCls}`} />
            {activeVlanMeta.isSegmented ? (
              <span
                className={`font-mono tabular-nums font-bold ${
                  isLight
                    ? VLAN_LIGHT_ACCENTS[activeVlanMeta.colorIndex]
                    : VLAN_DARK_ACCENTS[activeVlanMeta.colorIndex]
                }`}
              >
                {activeVlanMeta.tagLabel}
              </span>
            ) : (
              <span className="font-mono text-[10px] opacity-70">
                {isKo ? 'Untagged' : 'Untagged'}
              </span>
            )}
          </button>
        )}

        <span aria-hidden="true" className={`hidden sm:inline-block w-px h-4 mx-0.5 shrink-0 ${dividerCls}`} />

        {profiles.map((prof) => {
          const isActive = prof.id === activeProfileId;
          const isBatchCurrent = batchState.isRunning && batchState.currentProfileId === prof.id;
          const totalRange = Math.max(1, prof.end - prof.start + 1);
          const vlanMeta = getVlanVisualMeta(prof);
          const vlanAccentText = isActive && isLight
            ? 'text-white'
            : isLight
            ? VLAN_LIGHT_ACCENTS[vlanMeta.colorIndex]
            : VLAN_DARK_ACCENTS[vlanMeta.colorIndex];

          return (
            <button
              key={prof.id}
              type="button"
              disabled={isScanning && !isActive && !batchState.isRunning}
              onClick={() => onSelectProfile(prof.id)}
              title={`${prof.label} · ${prof.subnet}.${prof.start}-${prof.end}${
                vlanMeta.isSegmented ? ` · ${vlanMeta.tagLabel}` : ' · Untagged'
              }`}
              className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
                isActive
                  ? isLight
                    ? 'bg-sky-600 border-sky-700 text-white font-bold shadow-xs'
                    : 'bg-sky-500/20 border-sky-400/60 text-sky-300 font-bold'
                  : subtleBtnCls
              }`}
            >
              <span className="font-mono tabular-nums font-bold">{prof.subnet}</span>

              {vlanMeta.isSegmented && (
                <>
                  <span
                    aria-hidden="true"
                    className={`w-px h-3 ${isActive && isLight ? 'bg-white/35' : dividerCls}`}
                  />
                  <span className={`inline-flex items-center gap-1 font-mono tabular-nums text-[10px] font-bold ${vlanAccentText}`}>
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-xs shrink-0 ${
                        isActive && isLight ? 'bg-white' : VLAN_DOT_MARKERS[vlanMeta.colorIndex]
                      }`}
                    />
                    <span>{vlanMeta.tagLabel}</span>
                  </span>
                </>
              )}

              <span aria-hidden="true" className="opacity-40">·</span>
              <span className={`font-mono tabular-nums text-[10px] ${isActive && isLight ? 'text-sky-100' : 'opacity-75'}`}>
                {isBatchCurrent ? 'SCAN' : `${prof.activeCount}/${totalRange}`}
              </span>
              {prof.realConflictCount > 0 && (
                <span className={`font-mono tabular-nums text-[10px] font-bold ${isActive && isLight ? 'text-rose-200' : 'text-rose-400'}`}>
                  !{prof.realConflictCount}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenAddDiscover}
          className={`px-2 py-1 rounded-md border text-[10.5px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors cursor-pointer ${subtleBtnCls}`}
          title={isKo ? '서브넷 또는 VLAN 프로파일 추가/자동 탐색' : 'Add or auto-discover Subnet / VLAN profile'}
        >
          <Plus className="w-3 h-3 text-sky-500 shrink-0" />
          <span>{isKo ? '대역 추가' : 'Add Subnet'}</span>
        </button>
      </div>

      {/* Right: Unified Dashboard & Batch Sweep Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenDashboard}
          className={`px-2.5 py-1 rounded-md border text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${subtleBtnCls}`}
          title={isKo ? '다중 서브넷 & VLAN 통합 대시보드 열기' : 'Open Multi-Subnet & VLAN Unified Dashboard'}
        >
          <Layers className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden sm:inline">{isKo ? '통합 대시보드' : 'Dashboard'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleBatchSweep}
          className={`px-2.5 py-1 rounded-md border text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
            batchState.isRunning
              ? 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
              : !featureGates.multiSubnetBatchSweep
              ? isLight
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-amber-500/10 border-amber-500/35 text-amber-300 hover:bg-amber-500/20'
              : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
          }`}
          title={
            batchState.isRunning
              ? isKo
                ? '일괄 순차 스캔 중지'
                : 'Stop sequential batch sweep'
              : featureGates.multiSubnetBatchSweep
              ? isKo
                ? '등록된 모든 서브넷/VLAN 순차 일괄 스캔 시작'
                : 'Run sequential sweep across all saved subnets'
              : isKo
              ? '다중 서브넷 순차 일괄 스캔은 PRO 이상 전용 기능입니다'
              : 'Multi-subnet batch sweep requires PRO+'
          }
        >
          {batchState.isRunning ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span className="font-mono tabular-nums">
                {batchState.completedIds.length + 1}/{batchState.queueIds.length}
              </span>
            </>
          ) : !featureGates.multiSubnetBatchSweep ? (
            <>
              <Lock className="w-3 h-3" />
              <span className="hidden md:inline">{isKo ? '일괄 스캔' : 'Batch'}</span>
              <span className="font-mono text-[9.5px] font-black">PRO</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>{isKo ? '일괄 스캔' : 'Batch Sweep'}</span>
            </>
          )}
        </button>

        {onHide && !batchState.isRunning && (
          <button
            type="button"
            onClick={onHide}
            className={`p-1 rounded-md border transition-colors cursor-pointer shrink-0 ${subtleBtnCls}`}
            title={isKo ? '다중 서브넷 & VLAN 바 숨기기' : 'Hide Multi-Subnet & VLAN bar'}
            aria-label={isKo ? '다중 서브넷 & VLAN 바 숨기기' : 'Hide Multi-Subnet & VLAN bar'}
          >
            <X className="w-3.5 h-3.5 opacity-75" />
          </button>
        )}
      </div>
    </div>
  );
};
