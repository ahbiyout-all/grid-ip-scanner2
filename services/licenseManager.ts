import { LicenseInfo, LicenseTier, LicenseFeatures } from '../types';

export const DEFAULT_FREE_FEATURES: LicenseFeatures = {
  visualGrid: true,
  fastPing: true,
  ouiLookup: true,
  portScanDeep: false,
  diffCompare: false,
  autoMonitor: false,
  exportReport: false,
  multiSubnet: false,
  remoteBoot: false,
  intruderDetection: false,
};

export const PRO_FEATURES: LicenseFeatures = {
  visualGrid: true,
  fastPing: true,
  ouiLookup: true,
  portScanDeep: true,
  diffCompare: true,
  autoMonitor: true,
  exportReport: true,
  multiSubnet: false,
  remoteBoot: true,
  intruderDetection: true,
};

export const ENTERPRISE_FEATURES: LicenseFeatures = {
  visualGrid: true,
  fastPing: true,
  ouiLookup: true,
  portScanDeep: true,
  diffCompare: true,
  autoMonitor: true,
  exportReport: true,
  multiSubnet: true,
  remoteBoot: true,
  intruderDetection: true,
};

export interface ResolvedFeatureGates {
  isProOrHigher: boolean;
  isEnterprise: boolean;
  visualGrid: boolean;
  fastPing: boolean;
  ouiLookup: boolean;
  deepPortAudit: boolean;
  snapshotDiff: boolean;
  autoScheduler: boolean;
  autoReportArchive: boolean;
  reportAuditExport: boolean;
  reportExcelWorkbook: boolean;
  reportBrandingLogo: boolean;
  reportDiffCompare: boolean;
  remoteBootWoL: boolean;
  intruderGuard: boolean;
  multiSubnetUnlimited: boolean;
  maxSubnets: number;
}

export const resolveFeatureGates = (license: LicenseInfo): ResolvedFeatureGates => {
  const isEnterprise = license.tier === 'enterprise';
  const isProOrHigher = license.tier === 'pro' || isEnterprise;
  const f = license.features || DEFAULT_FREE_FEATURES;
  const diffAllowed = isProOrHigher && Boolean(f.diffCompare);
  const exportProAllowed = isProOrHigher && Boolean(f.exportReport);
  const schedulerAllowed = isProOrHigher && Boolean(f.autoMonitor);

  return {
    isProOrHigher,
    isEnterprise,
    visualGrid: Boolean(f.visualGrid ?? true),
    fastPing: Boolean(f.fastPing ?? true),
    ouiLookup: Boolean(f.ouiLookup ?? true),
    deepPortAudit: isProOrHigher && Boolean(f.portScanDeep),
    snapshotDiff: diffAllowed,
    autoScheduler: schedulerAllowed,
    autoReportArchive: schedulerAllowed && exportProAllowed,
    reportAuditExport: exportProAllowed,
    reportExcelWorkbook: true,
    reportBrandingLogo: exportProAllowed,
    reportDiffCompare: diffAllowed,
    remoteBootWoL: isProOrHigher && Boolean(f.remoteBoot),
    intruderGuard: isProOrHigher && Boolean(f.intruderDetection),
    multiSubnetUnlimited: isEnterprise && Boolean(f.multiSubnet),
    maxSubnets: license.maxSubnets || (isEnterprise ? 999 : isProOrHigher ? 5 : 1),
  };
};

export type EntitlementGateKey =
  | 'visualGrid'
  | 'ouiLookup'
  | 'basicExport'
  | 'autoScheduler'
  | 'snapshotDiff'
  | 'deepPortAudit'
  | 'reportAuditExport'
  | 'reportBrandingLogo'
  | 'intruderGuard'
  | 'remoteBootWoL';

export interface FeatureCatalogEntry {
  key: EntitlementGateKey;
  tier: 'free' | 'pro';
  labelKo: string;
  labelEn: string;
  scopeKo: string;
  scopeEn: string;
}

export const FEATURE_ENTITLEMENT_CATALOG: FeatureCatalogEntry[] = [
  {
    key: 'visualGrid',
    tier: 'free',
    labelKo: '16×16 시각화 그리드 & 고속 스캔',
    labelEn: '16×16 Visual Grid & Fast Scan',
    scopeKo: 'Community 기본 제공',
    scopeEn: 'Included in Free',
  },
  {
    key: 'ouiLookup',
    tier: 'free',
    labelKo: '9만 건 OUI 제조사 · 장치 식별',
    labelEn: '90k OUI Vendor & Device Classifier',
    scopeKo: 'Community 기본 제공',
    scopeEn: 'Included in Free',
  },
  {
    key: 'basicExport',
    tier: 'free',
    labelKo: '기본 내보내기 (PDF · 엑셀 그리드 .xls · CSV · JSON · MD · HTML)',
    labelEn: 'Basic Export (PDF · Excel Grid .xls · CSV · JSON · MD · HTML)',
    scopeKo: 'Community 기본 제공',
    scopeEn: 'Included in Free',
  },
  {
    key: 'autoScheduler',
    tier: 'pro',
    labelKo: '정기 자동 스케줄러 & 자동 리포트 저장',
    labelEn: 'Recurring Scan Scheduler & Auto Archive',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'snapshotDiff',
    tier: 'pro',
    labelKo: '스냅샷 비교 (Diff · 1:1 스튜디오 · 비교 리포트)',
    labelEn: 'Snapshot Diff (Engine · 1:1 Studio · Diff Report)',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'deepPortAudit',
    tier: 'pro',
    labelKo: '심층 포트 정밀 보안 감사',
    labelEn: 'Deep Port Security Audit',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'reportAuditExport',
    tier: 'pro',
    labelKo: '정밀 보안 감사 보고서 (PDF · HTML)',
    labelEn: 'Security Audit Reports (PDF · HTML)',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'reportBrandingLogo',
    tier: 'pro',
    labelKo: '리포트 화이트라벨 브랜딩 & 로고 업로드',
    labelEn: 'White-Label Report Branding & Logo',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'intruderGuard',
    tier: 'pro',
    labelKo: '낯선 기기 감시 & Soft Trust 침입 탐지',
    labelEn: 'Intruder Watch & Soft Trust Guard',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
  {
    key: 'remoteBootWoL',
    tier: 'pro',
    labelKo: '원격 부팅 (Wake-on-LAN)',
    labelEn: 'Remote Boot (Wake-on-LAN)',
    scopeKo: 'PRO 이상',
    scopeEn: 'PRO+',
  },
];

const STORAGE_KEY = 'grid_ip_scanner_license_v2';
const TRIAL_HISTORY_KEY = 'grid_ip_scanner_trial_history_v1';

/**
 * Grid IP Scanner2 Official Ed25519 SPKI Public Key
 * Private signing key is NEVER embedded in client or desktop binaries.
 */
export const GRID_ED25519_PUBLIC_KEY = 'MCowBQYDK2VwAyEAi8D7v5wK1y3bH0pX9aG8v4T2q1F6j3K5n8M2L0P9wQE=';

const REVOKED_LICENSE_KEYS = new Set<string>([
  'REFUNDED-KEY-EXAMPLE-001',
  'REVOKED-SAMPLE-001',
]);

export const isKeyRevoked = (key?: string): boolean => {
  if (!key) return false;
  return REVOKED_LICENSE_KEYS.has(key.trim().toUpperCase());
};

export interface TrialHistoryInfo {
  used: boolean;
  activatedAt?: string;
  expiresAt?: string;
}

export const buildFreeLicense = (overrides?: Partial<LicenseInfo>): LicenseInfo => ({
  tier: 'free',
  licenseType: 'free',
  licensedTo: 'Community User',
  maxSubnets: 1,
  features: { ...DEFAULT_FREE_FEATURES },
  bindingStatus: 'unlicensed',
  hybridMode: 'unverified',
  signatureVerified: false,
  backendAuthoritative: false,
  ...overrides,
});

export const getTrialHistory = (): TrialHistoryInfo => {
  try {
    const raw = localStorage.getItem(TRIAL_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.used) {
        return parsed as TrialHistoryInfo;
      }
    }
  } catch (e) {
    console.warn('Failed to parse trial history:', e);
  }
  return { used: false };
};

export const recordTrialUsage = (expiresAt?: string, activatedAt?: string): void => {
  try {
    const info: TrialHistoryInfo = {
      used: true,
      activatedAt: activatedAt || new Date().toISOString(),
      expiresAt,
    };
    localStorage.setItem(TRIAL_HISTORY_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('Failed to record trial usage:', e);
  }
};

export const normalizeAuthoritativeLicense = (raw: any): LicenseInfo => {
  if (!raw || typeof raw !== 'object') {
    return buildFreeLicense();
  }

  const tier: LicenseTier =
    raw.tier === 'enterprise' || raw.tier === 'pro' ? raw.tier : 'free';
  const tierFeatures =
    tier === 'enterprise'
      ? ENTERPRISE_FEATURES
      : tier === 'pro'
      ? PRO_FEATURES
      : DEFAULT_FREE_FEATURES;

  const isPaidActive =
    tier !== 'free' &&
    raw.backendAuthoritative === true &&
    (raw.bindingStatus === 'verified_usb' || raw.bindingStatus === 'verified_fixed_pc' || !raw.bindingStatus);

  const effectiveTier: LicenseTier = isPaidActive ? tier : 'free';
  const effectiveFeatures =
    effectiveTier === 'enterprise'
      ? ENTERPRISE_FEATURES
      : effectiveTier === 'pro'
      ? PRO_FEATURES
      : DEFAULT_FREE_FEATURES;

  if (raw.trialUsed) {
    recordTrialUsage(raw.expiresAt, raw.trialActivatedAt);
  }

  return {
    tier: effectiveTier,
    licenseType: effectiveTier === 'free' ? 'free' : raw.licenseType || 'lifetime',
    licensedTo: raw.licensedTo || (effectiveTier === 'free' ? 'Community User' : 'Verified Licensee'),
    licenseKey: raw.licenseKey,
    licenseId: raw.licenseId,
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
    maxSubnets: effectiveTier === 'enterprise' ? 999 : effectiveTier === 'pro' ? 5 : 1,
    features: {
      ...tierFeatures,
      ...effectiveFeatures,
      remoteBoot: effectiveTier === 'pro' || effectiveTier === 'enterprise',
      intruderDetection: effectiveTier === 'pro' || effectiveTier === 'enterprise',
    },
    bindingStatus: raw.bindingStatus || (effectiveTier === 'free' ? 'unlicensed' : 'verified_fixed_pc'),
    bindingReason: raw.bindingReason,
    boundMediaType: raw.boundMediaType,
    boundDeviceLabel: raw.boundDeviceLabel,
    bindingHashShort: raw.bindingHashShort,
    hasHardwareSerial: raw.hasHardwareSerial,
    leaseIssuedAt: raw.leaseIssuedAt,
    leaseExpiresAt: raw.leaseExpiresAt,
    offlineGraceDaysLeft: raw.offlineGraceDaysLeft,
    hybridMode: raw.hybridMode || 'unverified',
    signatureVerified: Boolean(raw.signatureVerified),
    duplicateConflict: raw.duplicateConflict,
    backendAuthoritative: Boolean(raw.backendAuthoritative),
    trialUsed: Boolean(raw.trialUsed),
    trialActivatedAt: raw.trialActivatedAt,
    lastError: raw.lastError,
    binding: raw.binding,
  };
};

/**
 * Initial safe state before backend /api/license/status handshake completes.
 * Never grants unverified Pro/Enterprise access solely from mutable localStorage.
 */
export const getStoredLicense = (): LicenseInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tier === 'free') {
        return normalizeAuthoritativeLicense(parsed);
      }
    }
  } catch {
    // ignore parse failure
  }
  return buildFreeLicense();
};

export const saveLicense = (license: LicenseInfo): void => {
  try {
    // Cache display/diagnostic state; runtime authority always re-verifies with Go backend on mount
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tier: license.tier,
      bindingStatus: license.bindingStatus,
      boundDeviceLabel: license.boundDeviceLabel,
      updatedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Failed to cache license metadata:', e);
  }
};

export const clearLicense = (): LicenseInfo => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear license cache:', e);
  }
  return buildFreeLicense();
};

export interface ActivationResult {
  success: boolean;
  message: string;
  license?: LicenseInfo;
}

/**
 * Legacy synchronous shortcut disabled: prevents forged prefix/unsigned Base64 activation.
 */
export const activateLicenseKey = (_inputKey: string): ActivationResult => {
  return {
    success: false,
    message: '하드웨어 USB 바인딩 및 Ed25519 서명 검증은 백엔드 보안 엔진(/api/license/activate)을 통해 수행되어야 합니다.',
    license: buildFreeLicense(),
  };
};

export type ApiUrlResolver = (path: string) => string;

export const fetchAuthoritativeLicenseStatus = async (
  resolveUrl: ApiUrlResolver
): Promise<LicenseInfo | null> => {
  try {
    const res = await fetch(resolveUrl('/api/license/status'), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const normalized = normalizeAuthoritativeLicense(data);
    saveLicense(normalized);
    return normalized;
  } catch (err) {
    console.warn('Failed to fetch authoritative license status:', err);
    return null;
  }
};

export const activateLicenseViaBackend = async (
  inputKey: string,
  resolveUrl: ApiUrlResolver
): Promise<ActivationResult> => {
  const trimmed = inputKey.trim();
  if (!trimmed) {
    return { success: false, message: '라이선스 키를 입력해 주세요.' };
  }

  if (isKeyRevoked(trimmed)) {
    return {
      success: false,
      message: '환불 처리되었거나 무효화된 라이선스 키입니다. 정품 키를 재구입해 주세요.',
      license: buildFreeLicense({ bindingStatus: 'revoked' }),
    };
  }

  try {
    const res = await fetch(resolveUrl('/api/license/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: trimmed }),
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      return {
        success: false,
        message: `HTTP ${res.status} — 백엔드 라이선스 검증 응답을 해석할 수 없습니다.`,
      };
    }
    const normalized = data.license ? normalizeAuthoritativeLicense(data.license) : buildFreeLicense();
    if (data.license || res.ok) {
      saveLicense(normalized);
    }

    return {
      success: Boolean(data.success) && res.ok,
      message: data.message || (res.ok ? '라이선스가 활성화되었습니다.' : `HTTP ${res.status} — 라이선스 서명 또는 USB 바인딩 검증에 실패했습니다.`),
      license: normalized,
    };
  } catch (err) {
    console.warn('Backend license activation request failed:', err);
    return {
      success: false,
      message: '백엔드 보안 검증 엔진에 연결할 수 없습니다. 로컬 엔진 실행 상태를 확인해 주세요.',
    };
  }
};

export const refreshLicenseLeaseViaBackend = async (
  resolveUrl: ApiUrlResolver
): Promise<ActivationResult> => {
  try {
    const res = await fetch(resolveUrl('/api/license/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      return {
        success: false,
        message: `HTTP ${res.status} — 라이선스 갱신 응답을 해석할 수 없습니다.`,
      };
    }
    const normalized = data.license ? normalizeAuthoritativeLicense(data.license) : buildFreeLicense();
    if (data.license || res.ok) {
      saveLicense(normalized);
    }
    return {
      success: Boolean(data.success) && res.ok,
      message: data.message || (res.ok ? '라이선스 상태 갱신 완료' : `HTTP ${res.status} — 라이선스 상태 갱신 실패`),
      license: normalized,
    };
  } catch (err) {
    console.warn('Backend lease refresh failed:', err);
    return {
      success: false,
      message: '온라인 좌석 갱신 중 통신 오류가 발생했습니다.',
    };
  }
};

export const deactivateLicenseViaBackend = async (
  resolveUrl: ApiUrlResolver
): Promise<ActivationResult> => {
  clearLicense();
  try {
    const res = await fetch(resolveUrl('/api/license/deactivate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => null);
    const normalized = data?.license ? normalizeAuthoritativeLicense(data.license) : buildFreeLicense();
    saveLicense(normalized);
    return {
      success: data ? Boolean(data.success ?? res.ok) : res.ok,
      message: data?.message || 'USB/단말기 라이선스 바인딩이 해제되었습니다.',
      license: normalized,
    };
  } catch (err) {
    console.warn('Backend deactivate failed:', err);
    return {
      success: true,
      message: '로컬 라이선스 캐시가 초기화되었습니다.',
      license: buildFreeLicense(),
    };
  }
};
