import { DeviceAlias } from '../types';

const STORAGE_KEY = 'grid_ip_scanner_aliases_v1';

export const normalizeMacKey = (mac?: string, ip?: string): string => {
  if (mac && mac.trim() && mac.trim().toLowerCase() !== 'unknown') {
    return mac.trim().toUpperCase().replace(/[:-]/g, ':');
  }
  if (ip && ip.trim()) {
    return `IP:${ip.trim()}`;
  }
  return '';
};

export const getStoredAliases = (): Record<string, DeviceAlias> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse stored aliases:', e);
  }
  return {};
};

export const saveDeviceAlias = (alias: DeviceAlias): void => {
  try {
    const all = getStoredAliases();
    const key = normalizeMacKey(alias.mac, alias.ip);
    if (!key) return;

    if (!alias.nickname && !alias.notes) {
      delete all[key];
    } else {
      all[key] = {
        ...alias,
        mac: key.startsWith('IP:') ? (alias.mac || '') : key,
        updatedAt: new Date().toISOString()
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Async sync to Go backend if available
    try {
      fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all)
      }).catch(() => {});
    } catch (_) {}
  } catch (e) {
    console.error('Failed to save alias:', e);
  }
};

export const removeDeviceAlias = (mac?: string, ip?: string): void => {
  try {
    const all = getStoredAliases();
    const key = normalizeMacKey(mac, ip);
    if (!key || !all[key]) return;

    delete all[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    try {
      fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all)
      }).catch(() => {});
    } catch (_) {}
  } catch (e) {
    console.error('Failed to remove alias:', e);
  }
};

export const getDeviceAlias = (mac?: string, ip?: string): DeviceAlias | undefined => {
  const all = getStoredAliases();
  const key = normalizeMacKey(mac, ip);
  if (key && all[key]) return all[key];

  // Try fallback by IP if MAC key was not found
  if (ip) {
    const ipKey = `IP:${ip.trim()}`;
    if (all[ipKey]) return all[ipKey];
  }
  return undefined;
};

export const syncAliasesWithBackend = async (): Promise<Record<string, DeviceAlias>> => {
  try {
    const res = await fetch('/api/aliases');
    if (res.ok) {
      const backendAliases: Record<string, DeviceAlias> = await res.json();
      if (backendAliases && typeof backendAliases === 'object') {
        const local = getStoredAliases();
        const merged = { ...backendAliases, ...local };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (_) {}
  return getStoredAliases();
};
