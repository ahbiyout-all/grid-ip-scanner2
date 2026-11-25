import React from 'react';
import { Layers, Table, Grid } from 'lucide-react';
import { CIDRScanPlan, ScanResult } from '../types';

interface CidrBlockBarProps {
  plan: CIDRScanPlan;
  activeBlockIndex: number;
  onSelectBlock: (index: number) => void;
  results: Record<string, ScanResult>;
  viewMode: 'grid' | 'table' | 'topology' | 'diff';
  onSwitchViewMode: (mode: 'grid' | 'table') => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

export const CidrBlockBar: React.FC<CidrBlockBarProps> = ({
  plan,
  activeBlockIndex,
  onSelectBlock,
  results,
  viewMode,
  onSwitchViewMode,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const barCls =
    theme === 'beige'
      ? 'bg-[#f6ede0] border-[#dcc7a1] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-slate-50 border-slate-200 text-slate-900'
      : theme === 'gray'
      ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
      : 'bg-slate-950/90 border-slate-800 text-slate-100';

  const subtleBtnCls =
    theme === 'beige'
      ? 'bg-white border-[#d4be9c] text-[#4a341e] hover:bg-[#efe4d2]'
      : theme === 'white'
      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  return (
    <div className={`w-full border-b px-3 lg:px-6 py-1.5 flex items-center justify-between gap-2 shrink-0 ${barCls}`}>
      <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 text-[11px] font-bold shrink-0 whitespace-nowrap">
          <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="font-mono tabular-nums">{plan.normalizedCidr}</span>
          <span className={`font-mono tabular-nums text-[10px] ${mutedCls}`}>
            ({plan.totalHosts.toLocaleString()} {isKo ? '호스트' : 'hosts'} · {plan.blocks.length}{' '}
            {isKo ? '블록' : 'blocks'})
          </span>
        </div>

        <span aria-hidden="true" className={`w-px h-4 shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/15'}`} />

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {plan.blocks.map((blk) => {
            const isActive = blk.index === activeBlockIndex;
            let activeInBlk = 0;
            for (let i = blk.start; i <= blk.end; i++) {
              if (results[`${blk.subnet}.${i}`]?.status === 'active') {
                activeInBlk += 1;
              }
            }
            return (
              <button
                key={blk.index}
                type="button"
                onClick={() => {
                  onSelectBlock(blk.index);
                  if (viewMode === 'table') {
                    onSwitchViewMode('grid');
                  }
                }}
                title={`${blk.label} (${activeInBlk}/${blk.hostCount})`}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-mono tabular-nums flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-sky-600 border-sky-700 text-white font-bold'
                      : 'bg-sky-500/20 border-sky-400/60 text-sky-300 font-bold'
                    : subtleBtnCls
                }`}
              >
                <span>{blk.subnet}.x</span>
                <span className={isActive && isLight ? 'text-sky-100' : 'opacity-70'}>
                  {activeInBlk}/{blk.hostCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {viewMode === 'table' ? (
          <button
            type="button"
            onClick={() => onSwitchViewMode('grid')}
            className={`px-2.5 py-1 rounded border text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${subtleBtnCls}`}
          >
            <Grid className="w-3.5 h-3.5 text-sky-500" />
            <span>{isKo ? '16×16 세그먼트 그리드' : '16×16 Block Grid'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSwitchViewMode('table')}
            className={`px-2.5 py-1 rounded border text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${subtleBtnCls}`}
          >
            <Table className="w-3.5 h-3.5 text-sky-500" />
            <span>
              {isKo
                ? `전체 테이블 (${plan.totalHosts.toLocaleString()})`
                : `Full Table (${plan.totalHosts.toLocaleString()})`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
