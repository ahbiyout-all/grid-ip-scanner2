import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Cable,
  Plus,
  Trash2,
  Play,
  ShieldCheck,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ScanResult,
  SnmpL2CredentialInput,
  SnmpL2MappingResult,
} from '../types';
import { ResolvedFeatureGates } from '../services/licenseManager';
import {
  deleteSnmpVaultCredential,
  fetchSnmpVaultSummaries,
  runSnmpL2Mapping,
  SnmpVaultEntrySummary,
} from '../services/snmpService';

interface SnmpSwitchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: Record<string, ScanResult>;
  featureGates: ResolvedFeatureGates;
  onRequirePro: (featureId: 'snmpL2Mapping' | 'variableCidrEnterprise', context?: string) => void;
  onApplyMappingResult: (result: SnmpL2MappingResult) => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  showToast: (msg: string) => void;
}

export const SnmpSwitchConfigModal: React.FC<SnmpSwitchConfigModalProps> = ({
  isOpen,
  onClose,
  results,
  featureGates,
  onRequirePro,
  onApplyMappingResult,
  theme,
  lang,
  showToast,
}) => {
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const [switches, setSwitches] = useState<SnmpL2CredentialInput[]>([
    { ip: '', name: '', version: 'v2c', community: 'public', saveInMemoryVault: true },
  ]);
  const [vaultEntries, setVaultEntries] = useState<SnmpVaultEntrySummary[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [lastResult, setLastResult] = useState<SnmpL2MappingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const suggestedSwitches = useMemo(() => {
    return Object.values(results)
      .filter((r) => {
        if (r.status !== 'active' || !r.device) return false;
        const text = `${r.device.vendor || ''} ${r.device.realVendor || ''} ${r.device.hostname || ''} ${r.device.deviceType || ''} ${r.device.snmp || ''}`.toLowerCase();
        return (
          text.includes('switch') ||
          text.includes('cisco') ||
          text.includes('aruba') ||
          text.includes('hp') ||
          text.includes('netgear') ||
          text.includes('ubiquiti') ||
          text.includes('dasan') ||
          text.includes('mikrotik') ||
          Boolean(r.device.snmp) ||
          r.ip.endsWith('.1') ||
          r.ip.endsWith('.254')
        );
      })
      .slice(0, 6);
  }, [results]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    void (async () => {
      const list = await fetchSnmpVaultSummaries();
      setVaultEntries(list);
      if (list.length > 0 && switches.length === 1 && !switches[0].ip) {
        setSwitches(
          list.map((e) => ({
            ip: e.ip,
            name: e.name || '',
            version: e.version === 'v3' ? 'v3' : 'v2c',
            community: '',
            saveInMemoryVault: true,
          }))
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const maxAllowed = featureGates.snmpL2MaxSwitches || 0;

  const handleAddRow = () => {
    if (switches.length >= Math.max(1, maxAllowed) && !featureGates.isEnterprise) {
      showToast(
        isKo
          ? `현재 에디션에서는 최대 ${maxAllowed}대 스위치를 동시 매핑할 수 있습니다 (Enterprise 무제한).`
          : `Current tier allows up to ${maxAllowed} switches simultaneously (Unlimited in Enterprise).`
      );
      return;
    }
    setSwitches((prev) => [
      ...prev,
      { ip: '', name: '', version: 'v2c', community: 'public', saveInMemoryVault: true },
    ]);
  };

  const handleSelectSuggestion = (ip: string, name?: string) => {
    setSwitches((prev) => {
      const existingIdx = prev.findIndex((s) => s.ip === ip);
      if (existingIdx >= 0) return prev;
      const emptyIdx = prev.findIndex((s) => !s.ip.trim());
      if (emptyIdx >= 0) {
        return prev.map((s, idx) => (idx === emptyIdx ? { ...s, ip, name: name || s.name } : s));
      }
      if (prev.length >= Math.max(1, maxAllowed) && !featureGates.isEnterprise) {
        return prev;
      }
      return [...prev, { ip, name: name || '', version: 'v2c', community: 'public', saveInMemoryVault: true }];
    });
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureGates.snmpL2Mapping) {
      onRequirePro('snmpL2Mapping');
      return;
    }

    const validList = switches.filter((s) => s.ip.trim().length > 0);
    if (validList.length === 0) {
      setErrorMsg(isKo ? '최소 1개 이상의 스위치 IP를 입력하세요.' : 'Enter at least one switch IP.');
      return;
    }

    setErrorMsg(null);
    setIsMapping(true);
    const result = await runSnmpL2Mapping(validList, results);
    setIsMapping(false);
    setLastResult(result);

    if (!result.success && result.error) {
      setErrorMsg(result.error);
      return;
    }

    const refreshedVault = await fetchSnmpVaultSummaries();
    setVaultEntries(refreshedVault);
    onApplyMappingResult(result);
    showToast(
      isKo
        ? `L2 스위치 매핑 완료 (${result.mappings.length}개 단말 포트 연결됨)`
        : `L2 switch mapping complete (${result.mappings.length} endpoint ports mapped)`
    );
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

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[88dvh] rounded-xl border shadow-2xl flex flex-col overflow-hidden ${surfaceCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${hairlineCls} flex items-center justify-between gap-3 shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              <Cable className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isKo ? 'SNMP 스위치 포트 · L2 물리 연결 매핑' : 'SNMP Switch Port & L2 Physical Mapping'}
              </h2>
              <p className={`text-[11px] font-mono tabular-nums ${mutedCls}`}>
                {isKo
                  ? `허용 스위치: ${featureGates.isEnterprise ? '무제한' : `최대 ${maxAllowed}대`} · BRIDGE-MIB / Q-BRIDGE / IF-MIB / LLDP`
                  : `Switch Quota: ${featureGates.isEnterprise ? 'Unlimited' : `Max ${maxAllowed}`} · BRIDGE / Q-BRIDGE / IF-MIB / LLDP`}
              </p>
            </div>
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
        <form onSubmit={handleRun} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Security Notice */}
          <div className={`px-3.5 py-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isKo
                ? '보안 원칙: SNMP 커뮤니티 문자열은 브라우저 저장소에 남기지 않으며 백엔드 메모리 볼트(RAM)에만 세션 동안 임시 보관됩니다.'
                : 'Security: SNMP community strings are never persisted to browser storage and remain strictly in backend RAM for this session.'}
            </span>
          </div>

          {/* Detected Infrastructure Suggestions */}
          {suggestedSwitches.length > 0 && (
            <div className="space-y-1.5">
              <span className={`text-[10.5px] font-bold uppercase tracking-wider ${mutedCls}`}>
                {isKo ? '스캔 결과에서 감지된 후보 스위치/게이트웨이 (클릭하여 추가)' : 'Suggested Infrastructure Nodes from Scan'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedSwitches.map((r) => (
                  <button
                    key={r.ip}
                    type="button"
                    onClick={() => handleSelectSuggestion(r.ip, r.device?.hostname || r.device?.realVendor || r.device?.vendor)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-mono tabular-nums cursor-pointer transition-colors ${
                      isLight ? 'bg-white border-slate-300 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    + {r.ip} {r.device?.hostname ? `(${r.device.hostname})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* In-memory Vault Entries */}
          {vaultEntries.length > 0 && (
            <div className={`p-3 rounded-lg border space-y-2 ${cardBgCls}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold">
                  {isKo ? `메모리 자격증명 볼트 (${vaultEntries.length}대 저장됨)` : `In-Memory Credential Vault (${vaultEntries.length})`}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const next = await deleteSnmpVaultCredential();
                    setVaultEntries(next);
                    showToast(isKo ? '세션 볼트가 초기화되었습니다.' : 'Session vault cleared.');
                  }}
                  className="text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  {isKo ? '전체 지우기' : 'Clear All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vaultEntries.map((v) => (
                  <span
                    key={v.ip}
                    className={`px-2 py-0.5 rounded border text-[10.5px] font-mono tabular-nums inline-flex items-center gap-1.5 ${
                      isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <span>{v.ip} ({v.version})</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = await deleteSnmpVaultCredential(v.ip);
                        setVaultEntries(next);
                      }}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Switch Rows */}
          <div className="space-y-2.5">
            {switches.map((sw, idx) => (
              <div key={idx} className={`p-3 rounded-lg border space-y-2.5 ${cardBgCls}`}>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10.5px] font-bold opacity-80">{isKo ? '스위치 관리 IP *' : 'Switch IP *'}</label>
                    <input
                      type="text"
                      value={sw.ip}
                      onChange={(e) =>
                        setSwitches((prev) => prev.map((row, i) => (i === idx ? { ...row, ip: e.target.value } : row)))
                      }
                      placeholder="192.168.0.2"
                      className={`w-full px-2.5 py-1.5 rounded border font-mono tabular-nums outline-none ${inputCls}`}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10.5px] font-bold opacity-80">{isKo ? '별칭 (선택)' : 'Switch Name'}</label>
                    <input
                      type="text"
                      value={sw.name || ''}
                      onChange={(e) =>
                        setSwitches((prev) => prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)))
                      }
                      placeholder="Core-SW-01"
                      className={`w-full px-2.5 py-1.5 rounded border outline-none ${inputCls}`}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10.5px] font-bold opacity-80">SNMP</label>
                    <select
                      value={sw.version}
                      onChange={(e) =>
                        setSwitches((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, version: e.target.value === 'v3' ? 'v3' : 'v2c' } : row
                          )
                        )
                      }
                      className={`w-full px-2 py-1.5 rounded border font-mono outline-none ${inputCls}`}
                    >
                      <option value="v2c">v2c</option>
                      <option value="v3">v3</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10.5px] font-bold opacity-80">
                      {sw.version === 'v2c' ? (isKo ? 'Read Community' : 'Community') : 'v3 Auth'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="password"
                        value={sw.community || ''}
                        onChange={(e) =>
                          setSwitches((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, community: e.target.value } : row))
                          )
                        }
                        placeholder={
                          vaultEntries.some((v) => v.ip === sw.ip.trim())
                            ? isKo
                              ? '(볼트 저장됨)'
                              : '(Vaulted)'
                            : 'public'
                        }
                        className={`w-full px-2.5 py-1.5 rounded border font-mono outline-none ${inputCls}`}
                      />
                      {switches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSwitches((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {sw.version === 'v3' && (
                  <p className="text-[10.5px] text-amber-500">
                    {isKo
                      ? '현재 내장 Go 엔진은 UDP 161 SNMPv2c FDB/LLDP/VLAN 워크를 기본 지원합니다. v3 USM은 프로파일 저장 시 안내 오류를 반환합니다.'
                      : 'The built-in pure-Go MIB walker supports SNMPv2c over UDP 161. Switch to v2c Read-Only community for live mapping.'}
                  </p>
                )}

                <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(sw.saveInMemoryVault)}
                    onChange={(e) =>
                      setSwitches((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, saveInMemoryVault: e.target.checked } : row))
                      )
                    }
                  />
                  <span className={mutedCls}>
                    {isKo ? '현재 세션 메모리 볼트에 읽기 전용 자격증명 보관' : 'Store read-only credential in session RAM vault'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'bg-white border-slate-300 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-sky-500" />
              <span>{isKo ? '스위치 추가' : 'Add Switch'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Last Mapping Results */}
          {lastResult && lastResult.switches.length > 0 && (
            <div className={`p-3.5 rounded-lg border space-y-2.5 ${cardBgCls}`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isKo
                      ? `스위치 수집 결과 (${lastResult.mappings.length}개 단말 매핑)`
                      : `Switch Summary (${lastResult.mappings.length} endpoints mapped)`}
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                {lastResult.switches.map((sw) => (
                  <div key={sw.switchIp} className={`p-2.5 rounded border text-[11px] ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10'}`}>
                    <div className="flex items-center justify-between font-mono tabular-nums font-bold">
                      <span>{sw.sysName || sw.switchIp} ({sw.switchIp})</span>
                      <span className={mutedCls}>{sw.durationMs}ms</span>
                    </div>
                    {sw.error ? (
                      <div className="text-rose-500 mt-1">{sw.error}</div>
                    ) : (
                      <div className={`mt-1 font-mono tabular-nums ${mutedCls}`}>
                        {isKo
                          ? `포트 ${sw.totalPorts}개 · MAC 매핑 ${sw.mappedMacCount}개 · 업링크 ${sw.uplinkPorts.length}개 · LLDP 이웃 ${sw.lldpNeighbors.length}개`
                          : `${sw.totalPorts} ports · ${sw.mappedMacCount} MACs · ${sw.uplinkPorts.length} uplinks · ${sw.lldpNeighbors.length} LLDP neighbors`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`pt-3 border-t ${hairlineCls} flex items-center justify-end gap-2`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer ${
                isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {isKo ? '닫기' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={isMapping}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {!featureGates.snmpL2Mapping ? (
                <Lock className="w-3.5 h-3.5" />
              ) : isMapping ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>
                {isMapping
                  ? isKo
                    ? 'SNMP MIB 수집 중...'
                    : 'Polling Switch MIBs...'
                  : featureGates.snmpL2Mapping
                  ? isKo
                    ? 'L2 매핑 스캔 실행'
                    : 'Run L2 Port Mapping'
                  : isKo
                  ? 'PRO 기능 해금 필요'
                  : 'Requires PRO'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
