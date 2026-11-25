import React, { useEffect, useState, useCallback } from 'react';
import { Clock, RefreshCw, Lock, ArrowRight, Cable, Activity, ShieldAlert } from 'lucide-react';
import { DeviceTimelineResponse, LicenseTier, TimelineEvent, TimelineEventType } from '../types';
import { ResolvedFeatureGates } from '../services/licenseManager';
import { fetchDeviceTimeline } from '../services/timelineService';

interface DeviceTimelineTabProps {
  ip: string;
  mac?: string;
  tier: LicenseTier;
  featureGates: ResolvedFeatureGates;
  onRequirePro: (featureId: 'deviceTimelinePro', context?: string) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
}

const EVENT_FILTERS: Array<{ id: TimelineEventType | 'ALL'; ko: string; en: string }> = [
  { id: 'ALL', ko: '전체', en: 'All' },
  { id: 'ONLINE', ko: '온라인', en: 'Online' },
  { id: 'OFFLINE', ko: '오프라인', en: 'Offline' },
  { id: 'PORT_OPENED', ko: '포트 열림', en: 'Port Open' },
  { id: 'PORT_CLOSED', ko: '포트 닫힘', en: 'Port Closed' },
  { id: 'IP_CHANGED', ko: 'IP 변경', en: 'IP Move' },
  { id: 'SWITCH_PORT_MOVED', ko: '스위치 이동', en: 'Switch Hop' },
];

function formatTimelineDateTime(ts: number): string {
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  } catch {
    return '-';
  }
}

export const DeviceTimelineTab: React.FC<DeviceTimelineTabProps> = ({
  ip,
  mac,
  tier,
  featureGates,
  onRequirePro,
  theme,
  lang,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [filterType, setFilterType] = useState<TimelineEventType | 'ALL'>('ALL');
  const [data, setData] = useState<DeviceTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTimeline = useCallback(async () => {
    if (!ip && !mac) return;
    setIsLoading(true);
    const res = await fetchDeviceTimeline(ip, mac, filterType, 200);
    setData(res);
    setIsLoading(false);
  }, [ip, mac, filterType]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const cardCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#3d2711]'
      : theme === 'white'
      ? 'bg-slate-50 border-slate-200 text-slate-900'
      : 'bg-black/25 border-white/10 text-slate-100';

  const mutedCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const badgeStyle = (eventType: TimelineEvent['eventType']) => {
    if (eventType === 'ONLINE' || eventType === 'FIRST_SEEN') {
      return isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (eventType === 'OFFLINE' || eventType === 'PORT_CLOSED') {
      return isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (eventType === 'PORT_OPENED' || eventType === 'IP_CHANGED') {
      return isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (eventType === 'SWITCH_PORT_MOVED') {
      return isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
    return isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/10 text-slate-300 border-white/15';
  };

  return (
    <div className="space-y-4">
      {/* Header & Retention Summary */}
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${cardCls}`}>
        <div className="min-w-0">
          <div className="text-[11px] font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{isKo ? '접속·포트 변동 이력 타임라인' : 'Connection & Port Timeline'}</span>
          </div>
          <div className={`text-[10.5px] font-mono tabular-nums mt-0.5 truncate ${mutedCls}`}>
            {featureGates.isEnterprise
              ? isKo
                ? 'Enterprise 무제한 보존'
                : 'Enterprise Unlimited Retention'
              : featureGates.deviceTimelinePro
              ? isKo
                ? 'PRO 30일 보존 창'
                : 'PRO 30-Day Retention'
              : isKo
              ? 'Free 최근 24시간 / 최대 50건'
              : 'Free 24h Window / Max 50'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadTimeline()}
          disabled={isLoading}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
            isLight ? 'bg-white border-slate-300 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
          title={isKo ? '새로고침' : 'Refresh'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-1">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterType(f.id)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              filterType === f.id
                ? 'bg-sky-600 border-sky-500 text-white'
                : isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {isKo ? f.ko : f.en}
          </button>
        ))}
      </div>

      {/* Free Tier Truncation Prompt */}
      {(data?.truncatedByTier || tier === 'free') && !featureGates.deviceTimelinePro && (
        <div
          className={`p-3 rounded-xl border text-[11px] space-y-2 ${
            isLight ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/35 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-2 leading-snug">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {data?.truncatedByTier
                ? isKo
                  ? `전체 ${data.totalMatched}건 중 Free 한도(24시간/50건)만 표시됩니다. 30일·무제한 감사 이력은 PRO 이상에서 제공됩니다.`
                  : `Showing Free window (24h/50 events) out of ${data.totalMatched} total events. Upgrade to PRO+ for 30d/Unlimited audit history.`
                : isKo
                ? 'Free 에디션은 24시간/최대 50건까지만 열람됩니다. DHCP 이동·포트 개폐 장기 추적을 사용하려면 PRO로 업그레이드하세요.'
                : 'Free tier limits timeline queries to 24h/50 events. Upgrade to PRO for 30-day DHCP & port audit trails.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRequirePro('deviceTimelinePro', ip)}
            className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{isKo ? '30일 타임라인 DB 해금 (PRO)' : 'Unlock 30-Day Timeline (PRO)'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Timeline Content */}
      {isLoading ? (
        <div className={`p-6 rounded-xl border text-center text-xs flex items-center justify-center gap-2 ${cardCls}`}>
          <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
          <span>{isKo ? '이력 조회 중...' : 'Loading timeline events...'}</span>
        </div>
      ) : !data || data.events.length === 0 ? (
        <div className={`p-6 rounded-xl border text-center space-y-1.5 ${cardCls}`}>
          <Activity className="w-6 h-6 text-sky-500 mx-auto opacity-80" />
          <div className="text-xs font-bold">
            {isKo ? '기록된 변동 이력이 아직 없습니다' : 'No Recorded Timeline Events Yet'}
          </div>
          <p className={`text-[11px] leading-relaxed ${mutedCls}`}>
            {isKo
              ? '네트워크 스캔이 완료될 때마다 신규 접속, 오프라인 전환, 포트 변동 및 IP/스위치 이동 이력이 로컬 DB에 자동 기록됩니다.'
              : 'Events are automatically logged to the local timeline database whenever scans complete or switch ports change.'}
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border divide-y ${cardCls} ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
          {data.events.map((ev) => (
            <div key={ev.id} className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-1.5 py-0.5 rounded border text-[9.5px] font-mono font-bold ${badgeStyle(ev.eventType)}`}>
                  {ev.eventType}
                </span>
                <span className={`text-[10px] font-mono tabular-nums ${mutedCls}`}>
                  {formatTimelineDateTime(ev.timestampMs)}
                </span>
              </div>

              <div className="text-xs font-medium leading-snug flex items-start gap-1.5">
                {ev.eventType === 'SWITCH_PORT_MOVED' && (
                  <Cable className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                )}
                {(ev.eventType === 'PORT_OPENED' || ev.eventType === 'IP_CHANGED') && (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <span className="break-words">{ev.summary}</span>
              </div>

              <div className={`text-[10px] font-mono tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5 ${mutedCls}`}>
                <span>IP: {ev.ip}</span>
                {ev.previousIp && ev.previousIp !== ev.ip && <span>Prev: {ev.previousIp}</span>}
                {ev.mac && <span>MAC: {ev.mac}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
