import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Power,
  Activity,
  Terminal,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { BatchQueueActionType, BatchQueueJob } from '../types';
import { ResolvedFeatureGates } from '../services/licenseManager';
import {
  cancelBatchJob,
  createBatchJob,
  getBatchJob,
  listBatchJobs,
  retryBatchJob,
} from '../services/batchQueueService';

export interface BatchTargetInput {
  ip: string;
  mac?: string;
  hostname?: string;
  openPorts?: number[];
}

interface BatchQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargets: BatchTargetInput[];
  initialAction?: BatchQueueActionType;
  featureGates: ResolvedFeatureGates;
  onRequirePro: (featureId: 'batchOpsQueue', context?: string) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  showToast: (msg: string) => void;
}

export const BatchQueueDrawer: React.FC<BatchQueueDrawerProps> = ({
  isOpen,
  onClose,
  initialTargets,
  initialAction = 'batch_wol',
  featureGates,
  onRequirePro,
  theme,
  lang,
  showToast,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [action, setAction] = useState<BatchQueueActionType>(initialAction);
  const [concurrency, setConcurrency] = useState<number>(2);
  const [delayMs, setDelayMs] = useState<number>(300);
  const [verifyWake, setVerifyWake] = useState<boolean>(true);
  const [verifyDelaySec, setVerifyDelaySec] = useState<number>(8);
  const [probePort, setProbePort] = useState<number>(80);

  const [activeJob, setActiveJob] = useState<BatchQueueJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<BatchQueueJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAction(initialAction);
      setErrorMsg(null);
      void (async () => {
        const jobs = await listBatchJobs();
        setRecentJobs(jobs);
      })();
    }
  }, [isOpen, initialAction]);

  // Poll active job status every 600ms while queued or running
  useEffect(() => {
    if (!isOpen || !activeJob) return;
    if (activeJob.status !== 'queued' && activeJob.status !== 'running') return;

    const timer = setInterval(async () => {
      const updated = await getBatchJob(activeJob.id);
      if (updated) {
        setActiveJob(updated);
        if (updated.status !== 'queued' && updated.status !== 'running') {
          const all = await listBatchJobs();
          setRecentJobs(all);
        }
      }
    }, 600);

    return () => clearInterval(timer);
  }, [isOpen, activeJob]);

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

  const maxAllowed = featureGates.batchQueueMaxTargets || 0;
  const exceedsQuota = !featureGates.isEnterprise && initialTargets.length > maxAllowed;

  const wolEligibleCount = useMemo(
    () => initialTargets.filter((t) => t.mac && t.mac !== 'Unknown').length,
    [initialTargets]
  );

  if (!isOpen) return null;

  const handleStartJob = async () => {
    if (!featureGates.batchOpsQueue) {
      onRequirePro('batchOpsQueue', `${initialTargets.length} targets`);
      return;
    }
    if (initialTargets.length === 0) {
      setErrorMsg(isKo ? '실행할 대상 단말을 1대 이상 선택하세요.' : 'Select at least one target device.');
      return;
    }
    if (exceedsQuota) {
      setErrorMsg(
        isKo
          ? `PRO 에디션은 한 번에 최대 ${maxAllowed}대까지 일괄 제어할 수 있습니다 (Enterprise 무제한).`
          : `PRO edition supports up to ${maxAllowed} targets per batch job (Unlimited in Enterprise).`
      );
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const created = await createBatchJob({
        action,
        label: `${action.toUpperCase()} (${initialTargets.length})`,
        concurrency,
        delayMs,
        verifyWake: action === 'batch_wol' ? verifyWake : false,
        verifyDelaySec: action === 'batch_wol' ? verifyDelaySec : undefined,
        targets: initialTargets.map((t) => ({
          ip: t.ip,
          mac: t.mac,
          hostname: t.hostname,
          port: action === 'batch_remote_probe' ? probePort : undefined,
        })),
      });
      setActiveJob(created);
      const jobs = await listBatchJobs();
      setRecentJobs(jobs);
    } catch (err) {
      setErrorMsg((err as Error)?.message || 'Batch job start failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbort = async () => {
    if (!activeJob) return;
    const updated = await cancelBatchJob(activeJob.id);
    if (updated) {
      setActiveJob(updated);
      showToast(isKo ? '배치 작업이 중단되었습니다.' : 'Batch job aborted.');
    }
  };

  const handleRetryFailed = async () => {
    if (!activeJob) return;
    try {
      const retried = await retryBatchJob(activeJob.id);
      setActiveJob(retried);
    } catch (err) {
      setErrorMsg((err as Error)?.message || 'Failed to retry batch job');
    }
  };

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

  const cardBgCls =
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

  const isRunning = activeJob && (activeJob.status === 'queued' || activeJob.status === 'running');
  const progressPct = activeJob && activeJob.totalTargets > 0
    ? Math.round((activeJob.completedCount / activeJob.totalTargets) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl h-full border-l shadow-2xl flex flex-col overflow-hidden mobile-notch-panel ${surfaceCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${hairlineCls} flex items-center justify-between gap-3 shrink-0`}>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
              <Power className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{isKo ? '다중 단말 일괄 WoL · 원격 제어 큐' : 'Batch WoL & Remote Control Queue'}</span>
            </h2>
            <p className={`text-[11px] font-mono tabular-nums mt-0.5 ${mutedCls}`}>
              {isKo
                ? `선택 대상: ${initialTargets.length}대 · 한도: ${featureGates.isEnterprise ? '무제한' : `최대 ${maxAllowed}대`}`
                : `Selected: ${initialTargets.length} targets · Quota: ${featureGates.isEnterprise ? 'Unlimited' : `Max ${maxAllowed}`}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isKo ? '닫기' : 'Close'}
            className={`p-1.5 rounded-lg cursor-pointer ${mutedCls} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Phase 1: Dry-Run Pre-Execution Setup */}
          {!activeJob && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'batch_wol', ko: '일괄 WoL 깨우기', en: 'Batch WoL', icon: Power },
                    { id: 'batch_ping', ko: '배치 Ping 점검', en: 'Batch Ping', icon: Activity },
                    { id: 'batch_remote_probe', ko: '포트 응답 프로브', en: 'Port Probe', icon: Terminal },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = action === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAction(item.id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                        active
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : `${cardBgCls} hover:border-sky-500/50`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{isKo ? item.ko : item.en}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pacing & Safety Controls */}
              <div className={`p-3.5 rounded-lg border space-y-3 text-xs ${cardBgCls}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold opacity-80">
                      {isKo ? '동시 작업 워커 (1~4)' : 'Concurrency (1–4)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={concurrency}
                      onChange={(e) => setConcurrency(Math.max(1, Math.min(4, Number(e.target.value) || 1)))}
                      className={`w-full px-2.5 py-1.5 rounded border font-mono tabular-nums ${inputCls}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold opacity-80">
                      {isKo ? '요청 지연 간격 (ms)' : 'Delay Pacing (ms)'}
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={2000}
                      step={50}
                      value={delayMs}
                      onChange={(e) => setDelayMs(Math.max(100, Math.min(2000, Number(e.target.value) || 250)))}
                      className={`w-full px-2.5 py-1.5 rounded border font-mono tabular-nums ${inputCls}`}
                    />
                  </div>
                </div>

                {action === 'batch_wol' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={verifyWake}
                        onChange={(e) => setVerifyWake(e.target.checked)}
                      />
                      <span>{isKo ? 'WoL 후 기상 Ping 재검증' : 'Verify online via Ping after WoL'}</span>
                    </label>
                    {verifyWake && (
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <span className={mutedCls}>{isKo ? '대기(초):' : 'Wait(s):'}</span>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={verifyDelaySec}
                          onChange={(e) => setVerifyDelaySec(Math.max(2, Math.min(30, Number(e.target.value) || 8)))}
                          className={`w-16 px-2 py-1 rounded border text-center ${inputCls}`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {action === 'batch_remote_probe' && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-bold opacity-80">{isKo ? '대상 TCP 포트:' : 'Target TCP Port:'}</span>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={probePort}
                      onChange={(e) => setProbePort(Math.max(1, Math.min(65535, Number(e.target.value) || 80)))}
                      className={`w-28 px-2.5 py-1 rounded border font-mono tabular-nums ${inputCls}`}
                    />
                  </div>
                )}
              </div>

              {/* Dry-Run Target Preview */}
              <div className={`rounded-lg border overflow-hidden ${cardBgCls}`}>
                <div className={`px-3.5 py-2 border-b ${hairlineCls} flex items-center justify-between text-[11px] font-bold`}>
                  <span>{isKo ? `실행 전 대상 요약 (${initialTargets.length}대)` : `Dry-Run Target Review (${initialTargets.length})`}</span>
                  {action === 'batch_wol' && (
                    <span className="font-mono tabular-nums text-amber-500">
                      {isKo ? `MAC 유효 ${wolEligibleCount}/${initialTargets.length}` : `Valid MAC ${wolEligibleCount}/${initialTargets.length}`}
                    </span>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-current/10">
                  {initialTargets.length === 0 ? (
                    <div className={`p-4 text-xs text-center ${mutedCls}`}>
                      {isKo ? '테이블 또는 그리드에서 대상 장비를 선택해주세요.' : 'Select devices from the table or grid first.'}
                    </div>
                  ) : (
                    initialTargets.map((t) => (
                      <div key={t.ip} className="px-3.5 py-2 flex items-center justify-between text-xs font-mono tabular-nums">
                        <div className="min-w-0 truncate">
                          <span className="font-bold">{t.ip}</span>
                          {t.hostname && <span className={`ml-2 font-sans ${mutedCls}`}>{t.hostname}</span>}
                        </div>
                        <span className={`text-[11px] shrink-0 ${t.mac && t.mac !== 'Unknown' ? mutedCls : 'text-amber-500'}`}>
                          {t.mac || (action === 'batch_wol' ? (isKo ? 'MAC 없음(건너뜀)' : 'No MAC (Skip)') : '-')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Phase 2: Live Running or Completed Job View */}
          {activeJob && (
            <div className="space-y-3">
              <div className={`p-3.5 rounded-lg border space-y-2.5 ${cardBgCls}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold">{activeJob.label}</div>
                    <div className={`text-[11px] font-mono tabular-nums ${mutedCls}`}>
                      {activeJob.status.toUpperCase()} · {activeJob.completedCount}/{activeJob.totalTargets} ({progressPct}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isRunning ? (
                      <button
                        type="button"
                        onClick={() => void handleAbort()}
                        className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>{isKo ? '중단 (Abort)' : 'Abort'}</span>
                      </button>
                    ) : (
                      <>
                        {activeJob.failedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleRetryFailed()}
                            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isKo ? `실패 재시도 (${activeJob.failedCount})` : `Retry Failed (${activeJob.failedCount})`}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveJob(null)}
                          className={`px-3 py-1.5 rounded border text-xs font-bold cursor-pointer ${
                            isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/15 hover:bg-white/10'
                          }`}
                        >
                          {isKo ? '새 작업 설정' : 'New Job'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-500/20">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeJob.status === 'cancelled'
                        ? 'bg-amber-500'
                        : activeJob.failedCount > 0 && !isRunning
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums">
                  <span className="text-emerald-500 font-bold">OK: {activeJob.successCount}</span>
                  <span className="text-rose-500 font-bold">FAIL: {activeJob.failedCount}</span>
                </div>
              </div>

              {/* Per-Target Status Table */}
              <div className={`rounded-lg border overflow-hidden ${cardBgCls}`}>
                <div className="max-h-80 overflow-y-auto divide-y divide-current/10">
                  {activeJob.targets.map((t) => (
                    <div key={t.id} className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-mono tabular-nums font-bold">{t.ip}</div>
                        <div className={`text-[10.5px] truncate ${mutedCls}`}>{t.message || t.hostname || t.mac || '-'}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          t.status === 'verified_online' || t.status === 'success'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : t.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-500'
                            : t.status === 'running'
                            ? 'bg-sky-500/15 text-sky-500'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Recent Jobs History */}
          {recentJobs.length > 0 && !activeJob && (
            <div className="space-y-1.5 pt-2">
              <div className={`text-[10.5px] font-bold uppercase tracking-wider ${mutedCls}`}>
                {isKo ? '최근 배치 큐 작업 이력' : 'Recent Batch Queue Jobs'}
              </div>
              <div className={`rounded-lg border divide-y divide-current/10 ${cardBgCls}`}>
                {recentJobs.slice(0, 5).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setActiveJob(j)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-left text-xs hover:bg-white/5 cursor-pointer"
                  >
                    <span className="font-bold truncate">{j.label}</span>
                    <span className="font-mono tabular-nums text-[10.5px] flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{j.successCount}/{j.totalTargets}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t ${hairlineCls} flex items-center justify-end gap-2 shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer ${
              isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/15 hover:bg-white/10'
            }`}
          >
            {isKo ? '닫기' : 'Close'}
          </button>
          {!activeJob && (
            <button
              type="button"
              disabled={isSubmitting || initialTargets.length === 0}
              onClick={() => void handleStartJob()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {!featureGates.batchOpsQueue ? (
                <Lock className="w-3.5 h-3.5" />
              ) : isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>
                {featureGates.batchOpsQueue
                  ? isKo
                    ? `확인 후 일괄 실행 (${initialTargets.length}대)`
                    : `Execute Batch (${initialTargets.length})`
                  : isKo
                  ? 'PRO 기능 해금 필요'
                  : 'Requires PRO'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
