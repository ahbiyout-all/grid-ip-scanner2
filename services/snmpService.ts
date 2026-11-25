import { ScanResult, SnmpL2CredentialInput, SnmpL2MappingResult } from '../types';
import { getApiUrl } from './apiConfig';

export interface SnmpVaultEntrySummary {
  ip: string;
  name?: string;
  version: 'v2c' | 'v3' | string;
  hasCredential: boolean;
  updatedAtMs: number;
}

export async function fetchSnmpVaultSummaries(): Promise<SnmpVaultEntrySummary[]> {
  try {
    const res = await fetch(getApiUrl('/api/snmp/vault'), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

export async function saveSnmpVaultCredential(cred: SnmpL2CredentialInput): Promise<SnmpVaultEntrySummary[]> {
  const res = await fetch(getApiUrl('/api/snmp/vault'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cred),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to save switch credential in vault');
  }
  return Array.isArray(data.entries) ? data.entries : [];
}

export async function deleteSnmpVaultCredential(ip?: string): Promise<SnmpVaultEntrySummary[]> {
  const url = ip ? `/api/snmp/vault?ip=${encodeURIComponent(ip)}` : '/api/snmp/vault';
  const res = await fetch(getApiUrl(url), { method: 'DELETE' });
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.entries) ? data.entries : [];
}

export async function runSnmpL2Mapping(
  switches: SnmpL2CredentialInput[],
  results: Record<string, ScanResult>
): Promise<SnmpL2MappingResult> {
  const hosts = Object.values(results)
    .filter((r) => r.status === 'active' && r.device?.mac)
    .map((r) => ({
      ip: r.ip,
      mac: r.device?.mac || '',
      hostname: r.device?.hostname || r.device?.customNickname || '',
      vendor: r.device?.realVendor || r.device?.vendor || '',
      deviceType: r.device?.deviceType || '',
    }));

  const res = await fetch(getApiUrl('/api/snmp/l2-map'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ switches, hosts }),
  });

  const data = (await res.json().catch(() => null)) as SnmpL2MappingResult | null;
  if (!data) {
    return {
      success: false,
      mappedAtMs: Date.now(),
      switches: [],
      mappings: [],
      hostMapByIp: {},
      error: `HTTP ${res.status} — Failed to parse SNMP L2 mapping response.`,
    };
  }
  return data;
}
