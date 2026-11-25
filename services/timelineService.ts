import {
  DeviceTimelineResponse,
  ScanResult,
  TimelineEvent,
  TimelineEventType,
} from '../types';
import { getApiUrl } from './apiConfig';

export async function fetchDeviceTimeline(
  ip: string,
  mac?: string,
  eventType?: TimelineEventType | 'ALL',
  limit = 200
): Promise<DeviceTimelineResponse | null> {
  try {
    const params = new URLSearchParams();
    if (ip) params.set('ip', ip);
    if (mac) params.set('mac', mac);
    if (eventType && eventType !== 'ALL') params.set('eventType', eventType);
    params.set('limit', String(limit));
    const res = await fetch(getApiUrl(`/api/timeline/device?${params.toString()}`), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data as DeviceTimelineResponse;
  } catch (err) {
    console.warn('fetchDeviceTimeline failed:', err);
    return null;
  }
}

export async function fetchRecentTimelineEvents(
  eventType?: TimelineEventType | 'ALL',
  limit = 150
): Promise<{ events: TimelineEvent[]; truncatedByTier: boolean; totalMatched: number } | null> {
  try {
    const params = new URLSearchParams();
    if (eventType && eventType !== 'ALL') params.set('eventType', eventType);
    params.set('limit', String(limit));
    const res = await fetch(getApiUrl(`/api/timeline/recent?${params.toString()}`), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('fetchRecentTimelineEvents failed:', err);
    return null;
  }
}

export async function ingestTimelineScanResults(results: Record<string, ScanResult>): Promise<number> {
  try {
    const payload = Object.values(results)
      .filter((r) => r.status === 'active' || r.status === 'inactive')
      .map((r) => ({
        ip: r.ip,
        alive: r.status === 'active',
        latency: r.device?.latency ?? 0,
        mac: r.device?.mac ?? '',
        vendor: r.device?.vendor ?? '',
        realVendor: r.device?.realVendor ?? '',
        hostname: r.device?.hostname ?? '',
        openPorts: r.device?.openPorts ?? [],
      }));
    if (payload.length === 0) return 0;
    const res = await fetch(getApiUrl('/api/timeline/ingest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: payload }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data?.emittedEvents || 0);
  } catch (err) {
    console.warn('ingestTimelineScanResults failed:', err);
    return 0;
  }
}

export async function pruneTimelineEvents(olderThanDays: number): Promise<{ success: boolean; removed: number; remaining: number }> {
  try {
    const res = await fetch(getApiUrl('/api/timeline/prune'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ olderThanDays }),
    });
    const data = await res.json();
    return {
      success: Boolean(data?.success),
      removed: Number(data?.removed || 0),
      remaining: Number(data?.remaining || 0),
    };
  } catch {
    return { success: false, removed: 0, remaining: 0 };
  }
}
