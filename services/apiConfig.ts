/**
 * Grid IP Scanner2 - API Configuration & Helper
 * Automatically resolves API base URLs across:
 *   1. User-configured Custom / LAN Engine URL (localStorage)
 *   2. Android Capacitor Native APK (AndroidScanBridge -> MobileEngineServer on 127.0.0.1:3031+)
 *   3. Electron standalone file:// protocol (127.0.0.1:3031)
 *   4. Auto-detected local loopback Go/Mobile engine (http://127.0.0.1:3031) when static SPA returns HTML
 *   5. Same-origin Web / Vite / Express proxy
 */

export const CUSTOM_ENGINE_URL_STORAGE_KEY = 'grid_custom_engine_url';
const DEFAULT_LOCAL_ENGINE_ORIGIN = 'http://127.0.0.1:3031';

let autoDetectedEngineBaseUrl: string | null = null;

function normalizeBaseUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

export function getCustomEngineBaseUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeBaseUrl(window.localStorage.getItem(CUSTOM_ENGINE_URL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setCustomEngineBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeBaseUrl(url);
    if (normalized) {
      window.localStorage.setItem(CUSTOM_ENGINE_URL_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(CUSTOM_ENGINE_URL_STORAGE_KEY);
    }
  } catch {
    // ignore storage restrictions
  }
}

export function setAutoDetectedEngineBaseUrl(url: string | null): void {
  autoDetectedEngineBaseUrl = normalizeBaseUrl(url);
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  try {
    if (typeof win.AndroidScanBridge?.getApiBaseUrl === 'function') return true;
    if (typeof win.Capacitor?.isNativePlatform === 'function' && win.Capacitor.isNativePlatform()) {
      return true;
    }
    if (window.location.protocol === 'capacitor:') return true;
  } catch {
    // ignore
  }
  return false;
}

export function isMobileDeviceBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') || isCapacitorNative();
}

export function getNativeAndroidBridgeUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  try {
    if (typeof win.AndroidScanBridge?.getApiBaseUrl === 'function') {
      const bridged = normalizeBaseUrl(win.AndroidScanBridge.getApiBaseUrl());
      if (bridged) return bridged;
    }
    if (typeof win.__GRIDSCAN_API_BASE__ === 'string') {
      const injected = normalizeBaseUrl(win.__GRIDSCAN_API_BASE__);
      if (injected) return injected;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getResolvedEngineBaseUrl(): string {
  const custom = getCustomEngineBaseUrl();
  if (custom) return custom;

  const androidBridge = getNativeAndroidBridgeUrl();
  if (androidBridge) return androidBridge;

  if (autoDetectedEngineBaseUrl) return autoDetectedEngineBaseUrl;

  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:' || isCapacitorNative()) {
      return DEFAULT_LOCAL_ENGINE_ORIGIN;
    }
  }
  return '';
}

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getResolvedEngineBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
};

/**
 * Validates that a fetch response from /api/info is genuine JSON from the scan engine
 * rather than a static SPA fallback (index.html returned with HTTP 200).
 */
export async function parseEngineInfoResponse(res: Response): Promise<any | null> {
  if (!res.ok) return null;
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    return null;
  }
  try {
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('<')) return null;
    const data = JSON.parse(trimmed);
    if (data && typeof data === 'object' && ('ip' in data || 'interfaces' in data || 'subnet' in data)) {
      return data;
    }
  } catch {
    // non-JSON response
  }
  return null;
}

/**
 * Probes the current resolved API base URL for /api/info; if same-origin returns
 * HTML/404/offline, automatically falls back to probing local 127.0.0.1:3031.
 */
export async function probeEngineInfo(timeoutMs = 5000): Promise<{ data: any; baseUrl: string } | null> {
  const primaryBase = getResolvedEngineBaseUrl();
  const candidates: string[] = [primaryBase];
  if (primaryBase !== DEFAULT_LOCAL_ENGINE_ORIGIN) {
    candidates.push(DEFAULT_LOCAL_ENGINE_ORIGIN);
  }

  for (const base of candidates) {
    const targetUrl = base ? `${base}/api/info` : '/api/info';
    try {
      const res = await fetch(targetUrl, { signal: safeTimeout(timeoutMs) });
      const data = await parseEngineInfoResponse(res);
      if (data) {
        if (base === DEFAULT_LOCAL_ENGINE_ORIGIN && primaryBase === '') {
          setAutoDetectedEngineBaseUrl(DEFAULT_LOCAL_ENGINE_ORIGIN);
        }
        return { data, baseUrl: base };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Cross-browser / WebView-safe fetch timeout signal helper.
 * Falls back gracefully on older Electron/WebView engines lacking AbortSignal.timeout.
 */
export const safeTimeout = (ms: number): AbortSignal | undefined => {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, ms);
      return controller.signal;
    }
  } catch {
    // ignore
  }
  return undefined;
};
