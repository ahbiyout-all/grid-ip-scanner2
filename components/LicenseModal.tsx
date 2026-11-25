import React, { useEffect } from 'react';
import { X, Sparkles, ShieldAlert, HardDrive, RefreshCw, Key, Check } from 'lucide-react';
import { LicenseInfo } from '../types';
import {
  FEATURE_ENTITLEMENT_CATALOG,
  ResolvedFeatureGates,
  getTrialHistory,
} from '../services/licenseManager';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: LicenseInfo;
  featureGates: ResolvedFeatureGates;
  licenseKeyInput: string;
  setLicenseKeyInput: (val: string) => void;
  isLicenseBusy: boolean;
  onActivateLicense: () => void;
  onRefreshLease: () => void;
  onResetLicense: () => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  s: any;
  panelClass: string;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  license,
  featureGates,
  licenseKeyInput,
  setLicenseKeyInput,
  isLicenseBusy,
  onActivateLicense,
  onRefreshLease,
  onResetLicense,
  theme,
  lang,
  s,
  panelClass,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBeige = theme === 'beige';
  const isWhite = theme === 'white';

  return (
    <div
      data-modal-layer="license"
      className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg ${
          isBeige
            ? 'bg-[#fcf8f2] text-[#5c4a37]'
            : isWhite
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-zinc-900 text-zinc-100'
        } rounded-2xl shadow-2xl border ${panelClass} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center pb-3 border-b ${
            isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/10'
          }`}
        >
          <div className="flex items-center space-x-3">
            <img
              src="./logo.png"
              alt="Grid IP"
              className="w-10 h-10 object-cover rounded-xl border border-sky-500/40 shadow-sm shrink-0"
            />
            <div>
              <h3 className="font-black text-sm tracking-tight">{s.licenseTitle}</h3>
              <div className="text-[11px] opacity-60 font-mono">Grid IP Scanner2</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-50 transition-opacity cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs no-scrollbar">
          {/* Current Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              license.tier === 'enterprise'
                ? isWhite || isBeige
                  ? 'bg-purple-50 border-purple-200 text-purple-800'
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : license.tier === 'pro'
                ? isWhite || isBeige
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : isWhite
                ? 'bg-slate-100 border-slate-200 text-slate-800'
                : isBeige
                ? 'bg-[#f5ebd6] border-[#dcc7a1] text-[#4a3723]'
                : 'bg-white/5 border-white/10 text-zinc-300'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold opacity-60">{s.currentTier}</div>
              <div className="text-base font-black tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                <span>{license.tier.toUpperCase()} EDITION</span>
                <span className="text-[11px] font-medium opacity-75">
                  ·{' '}
                  {license.tier === 'free'
                    ? lang === 'ko'
                      ? '무료 커뮤니티'
                      : 'Free Community'
                    : license.licenseType === 'annual'
                    ? lang === 'ko'
                      ? '1년 정기 이용권'
                      : '1-Year Subscription'
                    : license.licenseType === 'trial'
                    ? lang === 'ko'
                      ? '30일 체험판'
                      : '30-Day Trial'
                    : lang === 'ko'
                    ? '영구 소장 정품'
                    : 'Lifetime License'}
                </span>
              </div>
              <div className="text-[11px] opacity-75 mt-1">
                {lang === 'ko' ? '등록 대상:' : 'Licensed to:'}{' '}
                <span className="font-bold">
                  {license.licensedTo || (lang === 'ko' ? '커뮤니티 사용자' : 'Community User')}
                </span>
              </div>
              {license.expiresAt ? (
                <div
                  className={`text-[11px] ${
                    isWhite || isBeige ? 'text-amber-700' : 'text-amber-400'
                  } font-bold mt-2 flex flex-wrap items-center gap-1.5 leading-none tabular-nums`}
                >
                  <span>
                    {lang === 'ko' ? '만료 예정일:' : 'Expires:'}{' '}
                    {new Date(license.expiresAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-[10px] font-black">
                    · D-
                    {Math.max(
                      0,
                      Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    )}
                    {lang === 'ko' ? '일 남음' : 'd left'}
                  </span>
                </div>
              ) : license.tier !== 'free' ? (
                <div
                  className={`text-[11px] ${
                    isWhite || isBeige ? 'text-emerald-700' : 'text-emerald-400'
                  } font-bold mt-2 flex items-center gap-1.5`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'ko'
                      ? '평생 영구 소장 (만료일 없음 & 평생 업데이트)'
                      : 'Lifetime Access (No expiration & Lifetime updates)'}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="p-2.5 rounded-full bg-current/10">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          {/* Feature Entitlement Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold tracking-tight opacity-85">
                {lang === 'ko' ? '에디션별 기능 권한 매트릭스' : 'Edition Feature Entitlement Matrix'}
              </span>
              <span className="font-mono tabular-nums text-[10.5px] opacity-70">
                {lang === 'ko' ? '서브넷 허용 한도:' : 'Max Subnets:'}{' '}
                <b className="text-sky-500">
                  {featureGates.maxSubnets === 999
                    ? lang === 'ko'
                      ? '무제한 (Enterprise)'
                      : 'Unlimited (Ent)'
                    : `${featureGates.maxSubnets}${lang === 'ko' ? '개 대역' : ' subnets'}`}
                </b>
              </span>
            </div>

            <div
              className={`rounded-xl border overflow-hidden divide-y ${
                isWhite
                  ? 'bg-slate-50 border-slate-200 divide-slate-200 text-slate-800'
                  : isBeige
                  ? 'bg-[#f5ebd6]/40 border-[#e6d0a7] divide-[#e6d0a7] text-[#3d2711]'
                  : 'bg-white/[0.03] border-white/10 divide-white/10'
              }`}
            >
              {FEATURE_ENTITLEMENT_CATALOG.map((entry) => {
                const isUnlocked =
                  entry.key === 'visualGrid'
                    ? featureGates.visualGrid
                    : entry.key === 'ouiLookup'
                    ? featureGates.ouiLookup
                    : entry.key === 'basicExport'
                    ? true
                    : entry.key === 'multiSubnetBasic'
                    ? featureGates.multiSubnetSwitch
                    : entry.key === 'topologyBasic'
                    ? featureGates.topologyMapBasic
                    : entry.key === 'packetInspectBasic'
                    ? featureGates.packetInspectBasic
                    : entry.key === 'multiSubnetBatchSweep'
                    ? featureGates.multiSubnetBatchSweep
                    : entry.key === 'topologySecurityPro'
                    ? featureGates.topologySecurityPro
                    : entry.key === 'autoScheduler'
                    ? featureGates.autoScheduler
                    : entry.key === 'snapshotDiff'
                    ? featureGates.snapshotDiff
                    : entry.key === 'deepPortAudit'
                    ? featureGates.deepPortAudit
                    : entry.key === 'reportAuditExport'
                    ? featureGates.reportAuditExport
                    : entry.key === 'reportExcelFullWorkbook'
                    ? featureGates.reportExcelFullWorkbook
                    : entry.key === 'reportBrandingLogo'
                    ? featureGates.reportBrandingLogo
                    : entry.key === 'intruderGuard'
                    ? featureGates.intruderGuard
                    : entry.key === 'variableCidrPro'
                    ? featureGates.variableCidrPro
                    : entry.key === 'deviceTimelinePro'
                    ? featureGates.deviceTimelinePro
                    : entry.key === 'snmpL2Mapping'
                    ? featureGates.snmpL2Mapping
                    : entry.key === 'batchOpsQueue'
                    ? featureGates.batchOpsQueue
                    : featureGates.remoteBootWoL;

                return (
                  <div
                    key={entry.key}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-[11.5px]"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">
                        {lang === 'ko' ? entry.labelKo : entry.labelEn}
                      </span>
                      <span className="text-[10.5px] opacity-55 shrink-0 font-mono">
                        · {lang === 'ko' ? entry.scopeKo : entry.scopeEn}
                      </span>
                    </div>
                    <span
                      className={`font-mono tabular-nums text-[10.5px] font-bold shrink-0 ${
                        isUnlocked
                          ? isWhite || isBeige
                            ? 'text-emerald-700'
                            : 'text-emerald-400'
                          : isWhite || isBeige
                          ? 'text-slate-500'
                          : 'text-zinc-500'
                      }`}
                    >
                      {isUnlocked
                        ? lang === 'ko'
                          ? '활성'
                          : 'Enabled'
                        : lang === 'ko'
                        ? 'PRO 잠김'
                        : 'PRO Locked'}
                    </span>
                  </div>
                );
              })}
              <div className="px-3 py-2 flex items-center justify-between gap-3 text-[11.5px]">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-medium truncate">
                    {lang === 'ko' ? '다중 서브넷 동시·무제한 확장' : 'Unlimited Multi-Subnet Expansion'}
                  </span>
                  <span className="text-[10.5px] opacity-55 shrink-0 font-mono">
                    · {lang === 'ko' ? 'Free 2 / PRO 5 / ENT 무제한' : 'Free 2 / PRO 5 / ENT Unlimited'}
                  </span>
                </div>
                <span
                  className={`font-mono tabular-nums text-[10.5px] font-bold shrink-0 ${
                    featureGates.multiSubnetUnlimited
                      ? isWhite || isBeige
                        ? 'text-purple-700'
                        : 'text-purple-400'
                      : featureGates.isProOrHigher
                      ? isWhite || isBeige
                        ? 'text-sky-700'
                        : 'text-sky-400'
                      : isWhite || isBeige
                      ? 'text-slate-600'
                      : 'text-zinc-300'
                  }`}
                >
                  {featureGates.multiSubnetUnlimited
                    ? lang === 'ko'
                      ? '무제한 (ENT)'
                      : 'Unlimited (ENT)'
                    : featureGates.isProOrHigher
                    ? lang === 'ko'
                      ? '최대 5개 대역'
                      : 'Up to 5'
                    : lang === 'ko'
                    ? '최대 2개 대역'
                    : 'Up to 2 Subnets'}
                </span>
              </div>
            </div>
          </div>

          {/* Clone / Tamper / Duplicate / Expiry Security Warning */}
          {(license.bindingStatus === 'clone_mismatch' ||
            license.bindingStatus === 'clock_tamper' ||
            license.bindingStatus === 'duplicate_seat' ||
            license.bindingStatus === 'lease_expired' ||
            license.bindingStatus === 'signature_invalid' ||
            license.bindingStatus === 'revoked') && (
            <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-xs tracking-tight">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  {license.bindingStatus === 'clone_mismatch'
                    ? lang === 'ko'
                      ? '복제 매체 / 다른 하드웨어 감지 (Pro 잠김)'
                      : 'Cloned Media / Hardware Mismatch'
                    : license.bindingStatus === 'clock_tamper'
                    ? lang === 'ko'
                      ? '시스템 시계 역행 탐지 (Pro 잠김)'
                      : 'System Clock Rollback Detected'
                    : license.bindingStatus === 'duplicate_seat'
                    ? lang === 'ko'
                      ? 'LAN 동일 라이선스 동시 실행 감지 (Pro 잠김)'
                      : 'Duplicate LAN Seat Conflict'
                    : license.bindingStatus === 'lease_expired'
                    ? lang === 'ko'
                      ? '오프라인 유예 임대 만료'
                      : 'Offline Lease Expired'
                    : lang === 'ko'
                    ? '서명 검증 실패 / 무효화된 키'
                    : 'Invalid Signature or Revoked Key'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {license.bindingReason || license.lastError}
              </p>
            </div>
          )}

          {/* USB Hardware Binding & Hybrid Lease Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isWhite
                ? 'bg-slate-50 border-slate-200 text-slate-800'
                : isBeige
                ? 'bg-[#f5ebd6]/40 border-[#e6d0a7] text-[#3d2711]'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {lang === 'ko'
                    ? '포터블 USB 물리 바인딩 & 하이브리드 보안'
                    : 'Portable USB Binding & Hybrid Verification'}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold ${
                  license.signatureVerified
                    ? 'text-emerald-500'
                    : license.tier !== 'free'
                    ? 'text-amber-500'
                    : 'opacity-60'
                }`}
              >
                {license.signatureVerified
                  ? 'Ed25519 Verified'
                  : license.licenseType === 'trial'
                  ? 'Hardware Sealed Trial'
                  : lang === 'ko'
                  ? '미인증'
                  : 'Unverified'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div
                className={`p-2 rounded-lg border ${
                  isWhite || isBeige ? 'bg-white border-slate-200' : 'bg-black/25 border-white/5'
                }`}
              >
                <div className="text-[10px] opacity-60 font-bold">
                  {lang === 'ko' ? '실행 매체 유형' : 'Execution Media'}
                </div>
                <div className="font-bold mt-0.5 truncate">
                  {license.boundMediaType === 'removable_usb'
                    ? lang === 'ko'
                      ? '정품 USB 드라이브'
                      : 'Removable USB Drive'
                    : license.boundMediaType === 'network_share'
                    ? lang === 'ko'
                      ? '네트워크 공유 (제한)'
                      : 'Network Share (Restricted)'
                    : lang === 'ko'
                    ? '로컬 PC 디스크'
                    : 'Fixed PC Disk'}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isWhite || isBeige ? 'bg-white border-slate-200' : 'bg-black/25 border-white/5'
                }`}
              >
                <div className="text-[10px] opacity-60 font-bold">
                  {lang === 'ko' ? '장치 지문 해시' : 'Hardware Fingerprint'}
                </div>
                <div className="font-mono font-bold mt-0.5 truncate text-sky-500">
                  {license.bindingHashShort || license.binding?.fingerprintShort || '-'}
                  {license.boundDeviceLabel || license.binding?.deviceLabel
                    ? ` · ${license.boundDeviceLabel || license.binding?.deviceLabel}`
                    : ''}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isWhite || isBeige ? 'bg-white border-slate-200' : 'bg-black/25 border-white/5'
                }`}
              >
                <div className="text-[10px] opacity-60 font-bold">
                  {lang === 'ko' ? '인증 모드' : 'Auth Mode'}
                </div>
                <div className="font-bold mt-0.5">
                  {license.hybridMode === 'online_verified'
                    ? lang === 'ko'
                      ? '온라인 좌석 인증됨'
                      : 'Online Seat Verified'
                    : license.hybridMode === 'offline_grace'
                    ? lang === 'ko'
                      ? `오프라인 유예${license.offlineGraceDaysLeft ? ` (${license.offlineGraceDaysLeft}일 남음)` : ''}`
                      : `Offline Grace${license.offlineGraceDaysLeft ? ` (${license.offlineGraceDaysLeft}d left)` : ''}`
                    : license.hybridMode === 'local_sealed'
                    ? lang === 'ko'
                      ? '로컬 AES-GCM 봉인'
                      : 'AES-GCM Sealed Offline'
                    : lang === 'ko'
                    ? '미활성'
                    : 'Inactive'}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isWhite || isBeige ? 'bg-white border-slate-200' : 'bg-black/25 border-white/5'
                }`}
              >
                <div className="text-[10px] opacity-60 font-bold">
                  {lang === 'ko' ? '물리 시리얼 보호' : 'Physical Serial Guard'}
                </div>
                <div
                  className={`font-bold mt-0.5 ${
                    license.hasHardwareSerial ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {license.hasHardwareSerial
                    ? lang === 'ko'
                      ? '컨트롤러 시리얼 확인됨'
                      : 'Controller Serial Verified'
                    : lang === 'ko'
                    ? '시리얼 미지원 (24h 유예 상한)'
                    : 'No HW Serial (24h Cap)'}
                </div>
              </div>
            </div>

            {(license.tier !== 'free' ||
              license.bindingStatus === 'clone_mismatch' ||
              license.bindingStatus === 'lease_expired') && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  onClick={onRefreshLease}
                  disabled={isLicenseBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 font-bold text-[10.5px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLicenseBusy ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ko' ? '온라인 좌석 · 무결성 갱신' : 'Refresh Seat & Integrity'}</span>
                </button>
                <button
                  onClick={onResetLicense}
                  disabled={isLicenseBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10.5px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {lang === 'ko' ? 'USB 바인딩 해제 / 다른 USB로 이전' : 'Unbind USB / Transfer Seat'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* License Activation Form */}
          <div
            className={`p-4 rounded-xl border ${
              isBeige
                ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]'
                : isWhite
                ? 'bg-amber-50/60 border-amber-200 text-slate-800'
                : 'bg-white/5 border-white/10'
            } space-y-3`}
          >
            <label className="text-[11px] font-bold opacity-85 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {lang === 'ko'
                  ? 'Ed25519 서명 라이선스 키 입력 및 USB 바인딩'
                  : 'Enter Ed25519 Signed License Key'}
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="GSCAN.<PAYLOAD>.<SIGNATURE> / GRID-PRO-TRIAL-2026"
                className={`flex-1 ${
                  isWhite
                    ? 'bg-white border border-slate-300 text-slate-900'
                    : isBeige
                    ? 'bg-white border border-[#d4be9c] text-[#3d2711]'
                    : 'bg-black/40 border border-white/10 text-white'
                } rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-amber-400 transition-colors`}
              />
              <button
                onClick={onActivateLicense}
                disabled={isLicenseBusy}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isLicenseBusy ? '...' : s.activateBtn}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {license.trialUsed || getTrialHistory().used ? (
                <span className={`text-[10.5px] font-semibold ${isWhite || isBeige ? 'text-amber-700' : 'text-amber-400/90'}`}>
                  {lang === 'ko'
                    ? '이 장치의 30일 체험판 이용 완료 (정품 Ed25519 서명 키 필요)'
                    : '30-Day Trial used on this device (Requires Ed25519 key)'}
                </span>
              ) : (
                <button
                  onClick={() => setLicenseKeyInput('GRID-PRO-TRIAL-2026')}
                  className="text-[10.5px] text-sky-500 hover:underline font-semibold cursor-pointer"
                >
                  {lang === 'ko'
                    ? '30일 하드웨어 바인딩 체험 키 입력 (GRID-PRO-TRIAL-2026)'
                    : 'Fill 30-Day Hardware Trial Key (GRID-PRO-TRIAL-2026)'}
                </button>
              )}
              {license.tier !== 'free' && (
                <button
                  onClick={onResetLicense}
                  disabled={isLicenseBusy}
                  className="text-[10.5px] text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {lang === 'ko' ? '무료 버전으로 초기화' : 'Reset to Free Community'}
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer"
        >
          {s.done || 'Done'}
        </button>
      </div>
    </div>
  );
};
