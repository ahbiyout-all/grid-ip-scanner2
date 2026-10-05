/**
 * Grid IP Scanner2 - Real-Time GitHub Releases Auto-Update Engine
 * Repository: AhBiYout/grid-ip-scanner2
 * 
 * Automatically queries official GitHub Releases API, performs Semantic Version
 * comparison, and resolves download URLs for Windows (.exe / Setup.exe),
 * Android (.apk), and Mobile Web/PWA bundles.
 */

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
  type: 'portable_exe' | 'installer_exe' | 'android_apk' | 'pwa_zip' | 'other';
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  assets: ReleaseAsset[];
  portableExeUrl?: string;
  installerExeUrl?: string;
  androidApkUrl?: string;
  pwaZipUrl?: string;
}

export const CURRENT_APP_VERSION = '2.3.2';
export const GITHUB_REPO_OWNER = 'AhBiYout';
export const GITHUB_REPO_NAME = 'grid-ip-scanner2';
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

/**
 * Compare two Semantic Versions: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').trim();
  const clean2 = v2.replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Categorize GitHub release asset by filename
 */
function categorizeAsset(filename: string): ReleaseAsset['type'] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.apk')) return 'android_apk';
  if (lower.includes('setup') && lower.endsWith('.exe')) return 'installer_exe';
  if (lower.endsWith('.exe')) return 'portable_exe';
  if (lower.endsWith('.zip') || lower.endsWith('.tar.gz')) return 'pwa_zip';
  return 'other';
}

/**
 * Check GitHub Releases for newer version
 * @param manual If true, ignores cache and forces API request
 */
export async function checkGitHubRelease(manual: boolean = false): Promise<{
  hasUpdate: boolean;
  updateInfo: UpdateInfo | null;
  error?: string;
}> {
  const cacheKey = 'grid_update_cache';
  const lastCheckKey = 'grid_update_last_check';
  const THROTTLE_MS = 1000 * 60 * 60; // 1 hour throttle for automatic background checks

  // Background throttle check (avoid GitHub 60 req/hr anonymous rate limit)
  if (!manual) {
    const lastCheck = localStorage.getItem(lastCheckKey);
    const cached = localStorage.getItem(cacheKey);
    if (lastCheck && cached) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < THROTTLE_MS) {
        try {
          const parsed: UpdateInfo = JSON.parse(cached);
          const hasUpdate = compareSemVer(parsed.latestVersion, CURRENT_APP_VERSION) > 0;
          return { hasUpdate, updateInfo: { ...parsed, hasUpdate, currentVersion: CURRENT_APP_VERSION } };
        } catch (e) {
          // ignore cache error and re-fetch
        }
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(GITHUB_API_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      // Repository has no releases yet
      return {
        hasUpdate: false,
        updateInfo: {
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          hasUpdate: false,
          releaseTitle: `Grid IP Scanner2 v${CURRENT_APP_VERSION} (최신 버전)`,
          releaseNotes: '현재 사용 중인 버전이 최신 공식 빌드입니다.',
          publishedAt: new Date().toISOString(),
          htmlUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
          assets: []
        }
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API 응답 오류 (${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    const latestTag = (data.tag_name || '').replace(/^v/i, '').trim();
    const hasUpdate = compareSemVer(latestTag, CURRENT_APP_VERSION) > 0;

    const assets: ReleaseAsset[] = (data.assets || []).map((a: any) => ({
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
      contentType: a.content_type,
      type: categorizeAsset(a.name)
    }));

    const portableExe = assets.find(a => a.type === 'portable_exe');
    const installerExe = assets.find(a => a.type === 'installer_exe');
    const androidApk = assets.find(a => a.type === 'android_apk');
    const pwaZip = assets.find(a => a.type === 'pwa_zip');

    const updateInfo: UpdateInfo = {
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestTag || CURRENT_APP_VERSION,
      hasUpdate,
      releaseTitle: data.name || `Grid IP Scanner2 v${latestTag}`,
      releaseNotes: data.body || '릴리즈 변경 내역이 제공되지 않았습니다.',
      publishedAt: data.published_at || new Date().toISOString(),
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`,
      assets,
      portableExeUrl: portableExe?.downloadUrl,
      installerExeUrl: installerExe?.downloadUrl,
      androidApkUrl: androidApk?.downloadUrl,
      pwaZipUrl: pwaZip?.downloadUrl
    };

    localStorage.setItem(lastCheckKey, Date.now().toString());
    localStorage.setItem(cacheKey, JSON.stringify(updateInfo));

    return { hasUpdate, updateInfo };
  } catch (err: any) {
    console.warn('⚠️ GitHub Update Check failed:', err.message);
    return {
      hasUpdate: false,
      updateInfo: null,
      error: err.name === 'AbortError' ? '네트워크 요청 시간 초과' : err.message
    };
  }
}
