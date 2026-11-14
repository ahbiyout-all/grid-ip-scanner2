/**
 * Grid IP Scanner2 - API Configuration & Helper
 * Automatically handles API base URL resolution for Web, Vite proxy, and Electron file:// protocol.
 */

export const getApiUrl = (path: string): string => {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // In standalone Electron / desktop file:// protocol, target local Go backend on port 3031
    return `http://127.0.0.1:3031${path}`;
  }
  return path;
};

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
