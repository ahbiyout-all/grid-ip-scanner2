import React from 'react';
import { Minus, Plus, Type } from 'lucide-react';

export const TEXT_SCALE_MIN = 85;
export const TEXT_SCALE_MAX = 130;
export const TEXT_SCALE_STEP = 5;
export const TEXT_SCALE_DEFAULT = 100;
export const TEXT_SCALE_STORAGE_KEY = 'grid_ui_text_scale_pct_v1';
export const LEGACY_PROFILE_TEXT_SCALE_KEY = 'grid_profile_text_scale';

export function clampTextScalePct(value: number): number {
  if (!Number.isFinite(value)) return TEXT_SCALE_DEFAULT;
  const rounded = Math.round(value / TEXT_SCALE_STEP) * TEXT_SCALE_STEP;
  return Math.max(TEXT_SCALE_MIN, Math.min(TEXT_SCALE_MAX, rounded));
}

export function loadStoredTextScalePct(): number {
  try {
    const raw = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= TEXT_SCALE_MIN && parsed <= TEXT_SCALE_MAX) {
        return clampTextScalePct(parsed);
      }
    }
    const legacy = localStorage.getItem(LEGACY_PROFILE_TEXT_SCALE_KEY);
    if (legacy === 'large') {
      const migrated = 115;
      try {
        localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(migrated));
      } catch {}
      return migrated;
    }
  } catch {}
  return TEXT_SCALE_DEFAULT;
}

export function saveStoredTextScalePct(pct: number): void {
  try {
    localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(clampTextScalePct(pct)));
  } catch {}
}

export interface TextScaleControlProps {
  scalePct: number;
  onChange: (nextPct: number) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  variant?: 'header' | 'mobile' | 'inspector';
}

export const TextScaleControl: React.FC<TextScaleControlProps> = ({
  scalePct,
  onChange,
  theme,
  lang,
  variant = 'header',
}) => {
  const isDefault = scalePct === TEXT_SCALE_DEFAULT;
  const canDecrease = scalePct > TEXT_SCALE_MIN;
  const canIncrease = scalePct < TEXT_SCALE_MAX;

  const containerCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]'
      : theme === 'white'
      ? 'bg-white border-slate-300 text-slate-800 shadow-xs'
      : 'bg-black/25 border-white/10 text-zinc-200';

  const hoverBtnCls =
    theme === 'beige'
      ? 'hover:bg-[#efe2c9] active:bg-[#e6d0a7]'
      : theme === 'white'
      ? 'hover:bg-slate-100 active:bg-slate-200'
      : 'hover:bg-white/10 active:bg-white/15';

  const dividerCls =
    theme === 'beige'
      ? 'border-[#e6d0a7]'
      : theme === 'white'
      ? 'border-slate-200'
      : 'border-white/10';

  const readoutActiveCls =
    !isDefault
      ? theme === 'beige' || theme === 'white'
        ? 'text-sky-700 bg-sky-500/15 font-black'
        : 'text-sky-400 bg-sky-500/15 font-black'
      : 'font-bold opacity-85 hover:opacity-100';

  const isMobile = variant === 'mobile';
  const btnPadding = isMobile ? 'px-1.5 py-0.5' : 'px-1.5 py-1';
  const readoutPadding = isMobile ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]';

  const decreaseTitle =
    lang === 'ko'
      ? `글자 축소 (${TEXT_SCALE_MIN}%~${TEXT_SCALE_MAX}%, 단축키 Ctrl+-)`
      : `Decrease text size (${TEXT_SCALE_MIN}%–${TEXT_SCALE_MAX}%, Ctrl+-)`;
  const increaseTitle =
    lang === 'ko'
      ? `글자 확대 (${TEXT_SCALE_MIN}%~${TEXT_SCALE_MAX}%, 단축키 Ctrl++)`
      : `Increase text size (${TEXT_SCALE_MIN}%–${TEXT_SCALE_MAX}%, Ctrl++)`;
  const resetTitle = isDefault
    ? lang === 'ko'
      ? '현재 기본 배율 100% (단축키 Ctrl+0)'
      : 'Default text scale 100% (Ctrl+0)'
    : lang === 'ko'
    ? `클릭하여 100% 기본 배율로 초기화 (단축키 Ctrl+0)`
    : `Click to reset text scale to 100% (Ctrl+0)`;

  return (
    <div
      role="group"
      aria-label={lang === 'ko' ? '전체 UI 글자 배율 조절' : 'UI Text Scale Control'}
      className={`ui-scale-reset inline-flex items-center rounded-lg border overflow-hidden select-none whitespace-nowrap shrink-0 ${containerCls}`}
    >
      {!isMobile && (
        <span
          className={`pl-2 pr-1 flex items-center opacity-60 shrink-0`}
          aria-hidden="true"
          title={lang === 'ko' ? '글자 크기 배율' : 'Text Scale'}
        >
          <Type className="w-3 h-3" />
        </span>
      )}

      <button
        type="button"
        disabled={!canDecrease}
        onClick={() => onChange(clampTextScalePct(scalePct - TEXT_SCALE_STEP))}
        title={decreaseTitle}
        aria-label={lang === 'ko' ? '글자 크기 축소' : 'Decrease text size'}
        className={`${btnPadding} flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 ${
          canDecrease ? `cursor-pointer ${hoverBtnCls}` : 'opacity-30 cursor-not-allowed'
        }`}
      >
        <Minus className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (!isDefault) onChange(TEXT_SCALE_DEFAULT);
        }}
        title={resetTitle}
        aria-label={resetTitle}
        className={`${readoutPadding} border-x ${dividerCls} font-mono tabular-nums tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 ${
          !isDefault ? `cursor-pointer ${readoutActiveCls}` : `cursor-default ${readoutActiveCls}`
        }`}
      >
        {scalePct}%
      </button>

      <button
        type="button"
        disabled={!canIncrease}
        onClick={() => onChange(clampTextScalePct(scalePct + TEXT_SCALE_STEP))}
        title={increaseTitle}
        aria-label={lang === 'ko' ? '글자 크기 확대' : 'Increase text size'}
        className={`${btnPadding} flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 ${
          canIncrease ? `cursor-pointer ${hoverBtnCls}` : 'opacity-30 cursor-not-allowed'
        }`}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
