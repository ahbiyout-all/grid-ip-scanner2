import { WoLResult } from '../types';
import { getApiUrl } from './apiConfig';

export const isValidMacAddress = (mac: string): boolean => {
  if (!mac) return false;
  const clean = mac.replace(/[:-]/g, '');
  return clean.length === 12 && /^[0-9A-Fa-f]{12}$/.test(clean);
};

export const sendWakeOnLanPacket = async (mac: string, ip?: string): Promise<WoLResult> => {
  const cleanMac = (mac || '').trim().toUpperCase();
  if (!isValidMacAddress(cleanMac)) {
    return {
      success: false,
      mac: cleanMac,
      ip,
      packetsSent: 0,
      message: `유효하지 않은 MAC 주소 형식입니다: "${mac}". 올바른 12자리 16진수 MAC 주소가 필요합니다.`
    };
  }

  try {
    const res = await fetch(getApiUrl(`/api/wol`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac: cleanMac, ip })
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success !== false) {
      return {
        success: true,
        mac: cleanMac,
        ip,
        packetsSent: data?.packetsSent ?? 3,
        message: data?.message || `WoL 매직 패킷이 ${cleanMac}으로 전송되었습니다 (UDP 포트 9/7 브로드캐스트).`
      };
    }

    return {
      success: false,
      mac: cleanMac,
      ip,
      packetsSent: 0,
      message: data?.error || data?.message || `WoL 매직 패킷 전송에 실패했습니다 (HTTP ${res.status}).`
    };
  } catch (err: any) {
    return {
      success: false,
      mac: cleanMac,
      ip,
      packetsSent: 0,
      message: `백엔드 WoL 브로드캐스트 엔진에 연결할 수 없습니다 (${err?.message || 'Network Error'}).`
    };
  }
};
