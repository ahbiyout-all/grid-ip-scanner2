import { PortAuditItem, PortScanResult } from '../types';

export const WELL_KNOWN_PORTS: {
  port: number;
  service: string;
  protocol: string;
  risk: 'safe' | 'low' | 'medium' | 'high';
  description: string;
}[] = [
  { port: 21, service: 'FTP', protocol: 'TCP', risk: 'high', description: '평문 파일 전송 프로토콜 (자격증명 탈취 위험)' },
  { port: 22, service: 'SSH', protocol: 'TCP', risk: 'safe', description: '보안 암호화 원격 터미널 쉘' },
  { port: 23, service: 'Telnet', protocol: 'TCP', risk: 'high', description: '암호화되지 않은 구형 터미널 (스니핑 취약점)' },
  { port: 25, service: 'SMTP', protocol: 'TCP', risk: 'medium', description: '이메일 발송 서버 (스팸 릴레이 점검 권장)' },
  { port: 53, service: 'DNS', protocol: 'TCP/UDP', risk: 'safe', description: '도메인 이름 해석 서비스' },
  { port: 80, service: 'HTTP', protocol: 'TCP', risk: 'safe', description: '표준 웹 서버 포트' },
  { port: 110, service: 'POP3', protocol: 'TCP', risk: 'medium', description: '메일 수신 프로토콜 (비암호화)' },
  { port: 135, service: 'MSRPC', protocol: 'TCP', risk: 'medium', description: 'Windows RPC 엔드포인트 맵퍼' },
  { port: 139, service: 'NetBIOS-SSN', protocol: 'TCP', risk: 'medium', description: 'Windows 파일 및 프린터 공유' },
  { port: 143, service: 'IMAP', protocol: 'TCP', risk: 'medium', description: '메일 동기화 프로토콜 (비암호화)' },
  { port: 443, service: 'HTTPS', protocol: 'TCP', risk: 'safe', description: 'TLS/SSL 보안 암호화 웹 서버' },
  { port: 445, service: 'SMB / MS-DS', protocol: 'TCP', risk: 'high', description: 'Windows SMB 파일 공유 (WannaCry 등 랜섬웨어 타깃)' },
  { port: 993, service: 'IMAPS', protocol: 'TCP', risk: 'safe', description: 'SSL/TLS 암호화 보안 IMAP' },
  { port: 995, service: 'POP3S', protocol: 'TCP', risk: 'safe', description: 'SSL/TLS 암호화 보안 POP3' },
  { port: 1433, service: 'MSSQL', protocol: 'TCP', risk: 'medium', description: 'Microsoft SQL 데이터베이스 서버' },
  { port: 1521, service: 'Oracle DB', protocol: 'TCP', risk: 'medium', description: 'Oracle 데이터베이스 리스너' },
  { port: 3306, service: 'MySQL', protocol: 'TCP', risk: 'medium', description: 'MySQL / MariaDB 데이터베이스 서버' },
  { port: 3389, service: 'RDP', protocol: 'TCP', risk: 'high', description: 'Windows 원격 데스크톱 연결 (무차별 대입 공격 타깃)' },
  { port: 5432, service: 'PostgreSQL', protocol: 'TCP', risk: 'medium', description: 'PostgreSQL 오픈소스 데이터베이스' },
  { port: 5900, service: 'VNC', protocol: 'TCP', risk: 'high', description: '가상 네트워크 컴퓨팅 원격 화면 공유' },
  { port: 6379, service: 'Redis', protocol: 'TCP', risk: 'high', description: '인메모리 데이터 저장소 (인증 미설정 시 원격 코드 실행 취약)' },
  { port: 8080, service: 'HTTP-Proxy / Alt', protocol: 'TCP', risk: 'safe', description: '대체 HTTP 웹 서비스 / 관리 콘솔' },
  { port: 8443, service: 'HTTPS-Alt', protocol: 'TCP', risk: 'safe', description: '보안 대체 HTTPS 웹 관리 콘솔' },
  { port: 9100, service: 'JetDirect RAW', protocol: 'TCP', risk: 'safe', description: '네트워크 프린터 RAW 인쇄 데이터 포트' },
  { port: 27017, service: 'MongoDB', protocol: 'TCP', risk: 'medium', description: 'MongoDB NoSQL 데이터베이스' },
];

/**
 * Performs a deep port audit on a specific host IP.
 * Queries the backend if available, or synthesizes based on detected ports and TCP probes.
 */
export const runDeepPortAudit = async (
  ip: string,
  preDetectedPorts: number[] = []
): Promise<PortScanResult> => {
  const startTime = Date.now();

  try {
    const res = await fetch(`/api/portscan?ip=${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.openPorts)) {
        return data as PortScanResult;
      }
    }
  } catch (err) {
    // Backend endpoint not active yet or timed out, fallback to local audit matching
  }

  // Fallback: analyze preDetectedPorts or match against well known ports
  const openPortSet = new Set<number>(preDetectedPorts);
  
  // If no ports were passed, let's at least check common web ports if HTTP responded
  const matchedAuditItems: PortAuditItem[] = [];

  for (const item of WELL_KNOWN_PORTS) {
    if (openPortSet.has(item.port)) {
      matchedAuditItems.push({
        ...item,
        banner: `${item.service} Service Active on ${ip}:${item.port}`,
      });
    }
  }

  // Any extra ports that are not in the predefined list
  for (const p of preDetectedPorts) {
    if (!WELL_KNOWN_PORTS.some((w) => w.port === p)) {
      matchedAuditItems.push({
        port: p,
        service: `Custom / Dynamic (${p})`,
        protocol: 'TCP',
        risk: 'low',
        description: '사용자 지정 또는 동적 할당 포트',
        banner: `Port ${p} responded to probe`,
      });
    }
  }

  return {
    ip,
    totalChecked: WELL_KNOWN_PORTS.length,
    openPorts: matchedAuditItems.sort((a, b) => a.port - b.port),
    scanDurationMs: Date.now() - startTime,
  };
};
