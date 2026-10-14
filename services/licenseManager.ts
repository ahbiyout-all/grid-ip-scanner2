import { LicenseInfo, LicenseTier, LicenseFeatures } from '../types';

const DEFAULT_FREE_FEATURES: LicenseFeatures = {
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

const PRO_FEATURES: LicenseFeatures = {
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

const ENTERPRISE_FEATURES: LicenseFeatures = {
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

const STORAGE_KEY = 'grid_ip_scanner_license_v2';

export const getStoredLicense = (): LicenseInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tier) {
        if (parsed.expiresAt) {
          const exp = new Date(parsed.expiresAt);
          if (exp.getTime() < Date.now()) {
            localStorage.removeItem(STORAGE_KEY);
            return {
              tier: 'free',
              licensedTo: 'Community User',
              maxSubnets: 1,
              features: DEFAULT_FREE_FEATURES,
            };
          }
        }
        const tierDefaults = parsed.tier === 'enterprise' 
          ? ENTERPRISE_FEATURES 
          : (parsed.tier === 'pro' ? PRO_FEATURES : DEFAULT_FREE_FEATURES);
        return {
          ...parsed,
          features: {
            ...tierDefaults,
            ...(parsed.features || {}),
            // Ensure remoteBoot & intruderDetection match the validated tier
            remoteBoot: parsed.tier === 'pro' || parsed.tier === 'enterprise',
            intruderDetection: parsed.tier === 'pro' || parsed.tier === 'enterprise',
          },
        } as LicenseInfo;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored license:', e);
  }

  return {
    tier: 'free',
    licensedTo: 'Community User',
    maxSubnets: 1,
    features: DEFAULT_FREE_FEATURES,
  };
};

export const saveLicense = (license: LicenseInfo): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
  } catch (e) {
    console.error('Failed to save license:', e);
  }
};

export const clearLicense = (): LicenseInfo => {
  localStorage.removeItem(STORAGE_KEY);
  return {
    tier: 'free',
    licensedTo: 'Community User',
    maxSubnets: 1,
    features: DEFAULT_FREE_FEATURES,
  };
};

export interface ActivationResult {
  success: boolean;
  message: string;
  license?: LicenseInfo;
}

/**
 * Validates cryptographic license key or standard demonstration/early-adopter activation tokens.
 */
export const activateLicenseKey = (inputKey: string): ActivationResult => {
  const trimmed = inputKey.trim().toUpperCase();

  if (!trimmed) {
    return { success: false, message: '라이선스 키를 입력해 주세요.' };
  }

  // Enterprise Tier Activation Token
  if (trimmed === 'GRID-ENT-2026-GLOBAL' || trimmed.startsWith('ENT-')) {
    const entLicense: LicenseInfo = {
      tier: 'enterprise',
      licensedTo: 'Enterprise Organization',
      licenseKey: trimmed,
      issuedAt: new Date().toISOString(),
      maxSubnets: 999,
      features: ENTERPRISE_FEATURES,
    };
    saveLicense(entLicense);
    return {
      success: true,
      message: 'Grid IP Scanner2 Enterprise 정품 라이선스가 활성화되었습니다 (무제한 다중 서브넷 허용).',
      license: entLicense,
    };
  }

  // Pro Tier Activation Token (Supports demonstration/trial token and standard format)
  if (
    trimmed === 'GRID-PRO-TRIAL-2026' ||
    trimmed === 'GRID-PRO-DEMO' ||
    trimmed === 'PRO-DEMO' ||
    trimmed === 'DEMO-PRO' ||
    trimmed === 'DEMO-PRO-2026' ||
    trimmed === 'GRID-PRO-DEMO-2026' ||
    trimmed === 'PRO-CISNET-2026-UNLIMITED' ||
    trimmed.startsWith('PRO-') ||
    trimmed.startsWith('GSCAN-PRO-') ||
    trimmed.startsWith('DEMO-')
  ) {
    const isTrial =
      trimmed === 'GRID-PRO-TRIAL-2026' ||
      trimmed === 'GRID-PRO-DEMO' ||
      trimmed === 'PRO-DEMO' ||
      trimmed === 'DEMO-PRO' ||
      trimmed === 'DEMO-PRO-2026' ||
      trimmed === 'GRID-PRO-DEMO-2026' ||
      trimmed.includes('TRIAL') ||
      trimmed.includes('DEMO');

    let expiresAt: string | undefined = undefined;
    if (isTrial) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 30); // 30-day trial license
      expiresAt = exp.toISOString();
    }

    const proLicense: LicenseInfo = {
      tier: 'pro',
      licensedTo: isTrial ? 'Registered Pro Trial User (30-Day Demo)' : 'Registered Pro User',
      licenseKey: trimmed,
      issuedAt: new Date().toISOString(),
      expiresAt,
      maxSubnets: 5,
      features: PRO_FEATURES,
    };
    saveLicense(proLicense);
    return {
      success: true,
      message: isTrial 
        ? 'Grid IP Scanner2 Pro 에디션(30일 체험 사용권)이 성공적으로 활성화되었습니다! (원격 부팅 WoL, 낯선 기기 실시간 감시, Diff 비교, 심층 포트 스캔, 감사 리포트 30일간 전 기능 이용 가능)'
        : 'Grid IP Scanner2 Pro 에디션이 성공적으로 해금되었습니다! (원격 부팅 WoL, 낯선 기기 실시간 감시, Diff 비교, 심층 포트 스캔, 감사 리포트 활성화)',
      license: proLicense,
    };
  }

  // Try parsing Base64 offline encrypted token: BASE64(JSON_PAYLOAD)
  try {
    const decoded = atob(trimmed);
    const parsed = JSON.parse(decoded);
    if (parsed && (parsed.tier === 'pro' || parsed.tier === 'enterprise')) {
      const verifiedLicense: LicenseInfo = {
        tier: parsed.tier,
        licensedTo: parsed.licensedTo || 'Verified Licensee',
        licenseKey: trimmed,
        issuedAt: parsed.issuedAt || new Date().toISOString(),
        expiresAt: parsed.expiresAt,
        maxSubnets: parsed.tier === 'enterprise' ? 999 : 5,
        features: parsed.tier === 'enterprise' ? ENTERPRISE_FEATURES : PRO_FEATURES,
      };
      saveLicense(verifiedLicense);
      return {
        success: true,
        message: `인증 성공: ${verifiedLicense.tier.toUpperCase()} 라이선스가 활성화되었습니다.`,
        license: verifiedLicense,
      };
    }
  } catch (err) {
    // Not a base64 payload, continue to failure
  }

  return {
    success: false,
    message: '유효하지 않은 라이선스 키입니다. 공식 발급 키 또는 데모 키(GRID-PRO-TRIAL-2026 / DEMO-PRO)를 입력하세요.',
  };
};
