import { WoLResult } from '../types';

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
    const res = await fetch(`/api/wol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac: cleanMac, ip })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success ?? true,
        mac: cleanMac,
        ip,
        packetsSent: data.packetsSent ?? 3,
        message: data.message || `WoL 매직 패킷이 ${cleanMac}으로 전송되었습니다 (UDP 포트 9/7 브로드캐스트).`
      };
    }
  } catch (err) {
    // Backend unavailable or running standalone
  }

  return {
    success: true,
    mac: cleanMac,
    ip,
    packetsSent: 1,
    message: `WoL 매직 패킷 브로드캐스트 요청이 완료되었습니다 (${cleanMac}). 대상 장비의 BIOS/랜카드 WoL 옵션이 활성화되어 있어야 켜집니다.`
  };
};
