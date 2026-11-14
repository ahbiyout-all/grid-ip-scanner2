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
