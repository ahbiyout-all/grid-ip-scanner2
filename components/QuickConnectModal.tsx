import React, { useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Terminal,
  Globe,
  Shield,
  Cpu,
  Play,
  Copy,
  Check,
  Database,
  HardDrive,
  Server,
  Camera,
  Printer,
  Mail,
  Radio,
  Monitor,
  Network,
} from 'lucide-react';
import { copyTextToClipboard } from '../services/clipboard';
import { getApiUrl, safeTimeout } from '../services/apiConfig';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  port: number;
  theme: string;
  lang: 'ko' | 'en';
  showToast: (msg: string) => void;
}

interface ProtocolSuggestion {
  name: string;
  scheme: string;
  badgeLabel: string;
  defaultPort: number;
  descriptionKo: string;
  descriptionEn: string;
  icon: React.ReactNode;
  badgeBg: string;
  getUrl: (host: string, port: number) => string;
}

const formatHostForUrl = (rawIp: string): string => {
  const trimmed = rawIp.trim();
  if (!trimmed) return '127.0.0.1';
  if (trimmed.includes(':') && !trimmed.startsWith('[')) {
    return `[${trimmed}]`;
  }
  return trimmed;
};

const isSafeHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getSuggestionsForPort = (port: number): ProtocolSuggestion[] => {
  switch (port) {
    case 21:
      return [
        {
          name: 'FTP (File Transfer Protocol)',
          scheme: 'ftp',
          badgeLabel: 'FTP',
          defaultPort: 21,
          descriptionKo: '파일 전송 프로토콜 (NAS 및 서버 스토리지)',
          descriptionEn: 'File transfer protocol for storage / NAS',
          icon: <HardDrive className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          getUrl: (host) => `ftp://${host}:21`,
        },
        {
          name: 'FTPS (FTP over TLS)',
          scheme: 'ftps',
          badgeLabel: 'FTPS',
          defaultPort: 21,
          descriptionKo: 'TLS 암호화 파일 전송 프로토콜',
          descriptionEn: 'TLS-encrypted file transfer protocol',
          icon: <Shield className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host) => `ftps://${host}:21`,
        },
      ];
    case 22:
      return [
        {
          name: 'SSH (Secure Shell)',
          scheme: 'ssh',
          badgeLabel: 'SSH',
          defaultPort: 22,
          descriptionKo: '안전한 원격 터미널 및 명령줄 관리',
          descriptionEn: 'Secure remote command-line administration',
          icon: <Terminal className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          getUrl: (host) => `ssh://${host}:22`,
        },
        {
          name: 'SFTP / SCP (File Transfer)',
          scheme: 'sftp',
          badgeLabel: 'SFTP',
          defaultPort: 22,
          descriptionKo: 'SSH 기반 암호화 파일 전송 및 탐색',
          descriptionEn: 'SSH secure encrypted file transfer',
          icon: <HardDrive className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host) => `sftp://${host}:22`,
        },
      ];
    case 23:
      return [
        {
          name: 'Telnet (Legacy Shell)',
          scheme: 'telnet',
          badgeLabel: 'TELNET',
          defaultPort: 23,
          descriptionKo: '비암호화 원격 터미널 (구형 라우터/장비)',
          descriptionEn: 'Unencrypted legacy remote terminal',
          icon: <Terminal className="w-5 h-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          getUrl: (host) => `telnet://${host}:23`,
        },
      ];
    case 25:
    case 587:
      return [
        {
          name: `SMTP Mail Server (Port ${port})`,
          scheme: 'smtp',
          badgeLabel: 'SMTP',
          defaultPort: port,
          descriptionKo: '이메일 발송 및 메일 릴레이 서버 점검',
          descriptionEn: 'Outgoing mail transfer & SMTP relay service',
          icon: <Mail className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          getUrl: (host, p) => `smtp://${host}:${p}`,
        },
      ];
    case 53:
      return [
        {
          name: 'DNS (Domain Name System)',
          scheme: 'dns',
          badgeLabel: 'DNS',
          defaultPort: 53,
          descriptionKo: '로컬/내부 도메인 이름 해석(DNS) 서비스',
          descriptionEn: 'Domain name resolution service (TCP/UDP)',
          icon: <Network className="w-5 h-5 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
          getUrl: (host) => `dns://${host}:53`,
        },
      ];
    case 80:
      return [
        {
          name: 'HTTP (Web Browser)',
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: 80,
          descriptionKo: '기본 웹 인터페이스 및 라우터 설정 페이지',
          descriptionEn: 'Standard web interface and router setup',
          icon: <Globe className="w-5 h-5 text-blue-400" />,
          badgeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
          getUrl: (host) => `http://${host}`,
        },
      ];
    case 110:
    case 995:
      return [
        {
          name: port === 995 ? 'POP3S (Secure Mail)' : 'POP3 (Mail Retrieval)',
          scheme: port === 995 ? 'pop3s' : 'pop3',
          badgeLabel: port === 995 ? 'POP3S' : 'POP3',
          defaultPort: port,
          descriptionKo: '이메일 수신 프로토콜 서비스',
          descriptionEn: 'Mail retrieval protocol service',
          icon: <Mail className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host, p) => `${p === 995 ? 'pop3s' : 'pop3'}://${host}:${p}`,
        },
      ];
    case 135:
      return [
        {
          name: 'MSRPC (Windows RPC Endpoint)',
          scheme: 'ncacn_ip_tcp',
          badgeLabel: 'RPC',
          defaultPort: 135,
          descriptionKo: 'Windows 원격 프로시저 호출(WMI/DCOM) 엔드포인트',
          descriptionEn: 'Windows RPC endpoint mapper (WMI / DCOM)',
          icon: <Server className="w-5 h-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
          getUrl: (host) => `tcp://${host}:135`,
        },
      ];
    case 139:
    case 445:
      return [
        {
          name: 'SMB / Windows File Share',
          scheme: 'smb',
          badgeLabel: 'SMB',
          defaultPort: port,
          descriptionKo: '윈도우 공유 폴더 및 네트워크 드라이브 (\\\\IP)',
          descriptionEn: 'Windows File Sharing and Network Drive',
          icon: <Server className="w-5 h-5 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
          getUrl: (host) => `smb://${host}`,
        },
      ];
    case 143:
    case 993:
      return [
        {
          name: port === 993 ? 'IMAPS (Secure Mail)' : 'IMAP (Mail Sync)',
          scheme: port === 993 ? 'imaps' : 'imap',
          badgeLabel: port === 993 ? 'IMAPS' : 'IMAP',
          defaultPort: port,
          descriptionKo: '이메일 폴더 동기화 프로토콜 서비스',
          descriptionEn: 'Mail synchronization protocol service',
          icon: <Mail className="w-5 h-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
          getUrl: (host, p) => `${p === 993 ? 'imaps' : 'imap'}://${host}:${p}`,
        },
      ];
    case 443:
      return [
        {
          name: 'HTTPS (Secure Web Console)',
          scheme: 'https',
          badgeLabel: 'HTTPS',
          defaultPort: 443,
          descriptionKo: '암호화된 보안 웹 콘솔 및 대시보드',
          descriptionEn: 'Encrypted secure web console & dashboard',
          icon: <Shield className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host) => `https://${host}`,
        },
      ];
    case 554:
      return [
        {
          name: 'RTSP (IP Camera / Media Stream)',
          scheme: 'rtsp',
          badgeLabel: 'RTSP',
          defaultPort: 554,
          descriptionKo: 'CCTV·NVR 실시간 영상 스트리밍 (VLC/FFmpeg)',
          descriptionEn: 'IP camera / NVR live media stream (VLC / FFmpeg)',
          icon: <Camera className="w-5 h-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          getUrl: (host) => `rtsp://${host}:554`,
        },
        {
          name: 'HTTP Camera Admin UI',
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: 80,
          descriptionKo: '카메라 기본 웹 설정 페이지 열기 (Port 80)',
          descriptionEn: 'Open camera default web management page',
          icon: <Globe className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host) => `http://${host}`,
        },
      ];
    case 631:
      return [
        {
          name: 'IPP / CUPS Web Interface',
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: 631,
          descriptionKo: '네트워크 프린터·CUPS 인쇄 대기열 웹 관리 콘솔',
          descriptionEn: 'CUPS / IPP printer web management console',
          icon: <Printer className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host) => `http://${host}:631`,
        },
        {
          name: 'IPP (Internet Printing Protocol)',
          scheme: 'ipp',
          badgeLabel: 'IPP',
          defaultPort: 631,
          descriptionKo: 'OS 프린터 추가용 IPP 네트워크 인쇄 URI',
          descriptionEn: 'Internet Printing Protocol URI for OS printer setup',
          icon: <Printer className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          getUrl: (host) => `ipp://${host}:631/ipp/print`,
        },
      ];
    case 1433:
      return [
        {
          name: 'Microsoft SQL Server (MSSQL)',
          scheme: 'mssql',
          badgeLabel: 'MSSQL',
          defaultPort: 1433,
          descriptionKo: 'MSSQL 데이터베이스 엔진 연결 문자열',
          descriptionEn: 'Microsoft SQL Server database port',
          icon: <Database className="w-5 h-5 text-red-400" />,
          badgeBg: 'bg-red-500/20 border-red-500/40 text-red-300',
          getUrl: (host) => `sqlserver://${host}:1433`,
        },
      ];
    case 1521:
      return [
        {
          name: 'Oracle Database Listener',
          scheme: 'oracle',
          badgeLabel: 'ORACLE',
          defaultPort: 1521,
          descriptionKo: 'Oracle DB TNS 리스너 연결 포트',
          descriptionEn: 'Oracle Database TNS listener port',
          icon: <Database className="w-5 h-5 text-orange-400" />,
          badgeBg: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
          getUrl: (host) => `oracle://${host}:1521`,
        },
      ];
    case 1883:
    case 8883:
      return [
        {
          name: port === 8883 ? 'MQTTS (Secure IoT Broker)' : 'MQTT (IoT Message Broker)',
          scheme: port === 8883 ? 'mqtts' : 'mqtt',
          badgeLabel: port === 8883 ? 'MQTTS' : 'MQTT',
          defaultPort: port,
          descriptionKo: '스마트홈·센서 IoT 메시지 브로커 (MQTT Explorer 등)',
          descriptionEn: 'IoT & smart home pub/sub message broker',
          icon: <Radio className="w-5 h-5 text-purple-400" />,
          badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
          getUrl: (host, p) => `${p === 8883 ? 'mqtts' : 'mqtt'}://${host}:${p}`,
        },
      ];
    case 3306:
      return [
        {
          name: 'MySQL / MariaDB Database',
          scheme: 'mysql',
          badgeLabel: 'MYSQL',
          defaultPort: 3306,
          descriptionKo: 'MySQL / MariaDB 데이터베이스 서버',
          descriptionEn: 'MySQL / MariaDB database server port',
          icon: <Database className="w-5 h-5 text-orange-400" />,
          badgeBg: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
          getUrl: (host) => `mysql://${host}:3306`,
        },
      ];
    case 3389:
      return [
        {
          name: 'RDP (Remote Desktop)',
          scheme: 'rdp',
          badgeLabel: 'RDP',
          defaultPort: 3389,
          descriptionKo: 'Windows 원격 데스크톱 연결 세션 (mstsc.exe)',
          descriptionEn: 'Microsoft Windows Remote Desktop session',
          icon: <Monitor className="w-5 h-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
          getUrl: (host) => `rdp://full%20address=s:${host}:3389`,
        },
      ];
    case 5432:
      return [
        {
          name: 'PostgreSQL Database',
          scheme: 'postgresql',
          badgeLabel: 'PGSQL',
          defaultPort: 5432,
          descriptionKo: 'PostgreSQL 데이터베이스 서버',
          descriptionEn: 'PostgreSQL database server port',
          icon: <Database className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host) => `postgresql://${host}:5432`,
        },
      ];
    case 5900:
      return [
        {
          name: 'VNC (Remote Framebuffer)',
          scheme: 'vnc',
          badgeLabel: 'VNC',
          defaultPort: 5900,
          descriptionKo: 'VNC 원격 데스크톱 화면 공유 (RealVNC / TigerVNC)',
          descriptionEn: 'VNC remote desktop screen sharing client',
          icon: <Monitor className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host) => `vnc://${host}:5900`,
        },
      ];
    case 6379:
      return [
        {
          name: 'Redis In-Memory DB',
          scheme: 'redis',
          badgeLabel: 'REDIS',
          defaultPort: 6379,
          descriptionKo: 'Redis 캐시 및 인메모리 스토리지',
          descriptionEn: 'Redis cache and in-memory data store',
          icon: <Database className="w-5 h-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          getUrl: (host) => `redis://${host}:6379`,
        },
      ];
    case 8443:
      return [
        {
          name: 'HTTPS Web Console (Port 8443)',
          scheme: 'https',
          badgeLabel: 'HTTPS',
          defaultPort: 8443,
          descriptionKo: '대체 보안 HTTPS 관리자 웹 콘솔 (포트 8443)',
          descriptionEn: 'Alternate secure HTTPS admin console (port 8443)',
          icon: <Shield className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host, p) => `https://${host}:${p}`,
        },
        {
          name: 'HTTP Web App (Port 8443)',
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: 8443,
          descriptionKo: '비암호화 대체 웹 서비스 확인 (포트 8443)',
          descriptionEn: 'Unencrypted fallback HTTP web check (port 8443)',
          icon: <Globe className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host, p) => `http://${host}:${p}`,
        },
      ];
    case 9100:
      return [
        {
          name: 'JetDirect RAW Print Socket',
          scheme: 'socket',
          badgeLabel: 'RAW',
          defaultPort: 9100,
          descriptionKo: '네트워크 프린터 AppSocket/JetDirect RAW 인쇄 포트',
          descriptionEn: 'Network printer AppSocket / JetDirect RAW printing',
          icon: <Printer className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          getUrl: (host) => `socket://${host}:9100`,
        },
        {
          name: 'Printer Web Admin (Port 80)',
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: 80,
          descriptionKo: '프린터 내장 웹 관리 페이지(EWS) 열기',
          descriptionEn: 'Open printer embedded web server (EWS)',
          icon: <Globe className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host) => `http://${host}`,
        },
      ];
    case 27017:
      return [
        {
          name: 'MongoDB Database',
          scheme: 'mongodb',
          badgeLabel: 'MONGO',
          defaultPort: 27017,
          descriptionKo: 'MongoDB NoSQL 데이터베이스 연결 URI',
          descriptionEn: 'MongoDB NoSQL database connection URI',
          icon: <Database className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          getUrl: (host) => `mongodb://${host}:27017`,
        },
      ];
    case 5000:
    case 8000:
    case 8080:
    case 8899:
    case 9000:
    case 37777:
      return [
        {
          name:
            port === 37777 || port === 8899
              ? `Camera / NVR Web Console (Port ${port})`
              : `HTTP Web App (Port ${port})`,
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: port,
          descriptionKo:
            port === 37777 || port === 8899
              ? `CCTV·NVR·ONVIF 장치 웹/관리 인터페이스 (포트 ${port})`
              : `사용자 지정 웹 서비스 및 API 대시보드 (포트 ${port})`,
          descriptionEn:
            port === 37777 || port === 8899
              ? `CCTV / NVR / ONVIF device web interface (port ${port})`
              : `Custom web service & API console (port ${port})`,
          icon:
            port === 37777 || port === 8899 ? (
              <Camera className="w-5 h-5 text-emerald-400" />
            ) : (
              <Globe className="w-5 h-5 text-emerald-400" />
            ),
          badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          getUrl: (host, p) => `http://${host}:${p}`,
        },
        {
          name: `HTTPS Web App (Port ${port})`,
          scheme: 'https',
          badgeLabel: 'HTTPS',
          defaultPort: port,
          descriptionKo: `보안 사용자 지정 웹 서비스 (포트 ${port})`,
          descriptionEn: `Secure custom web service (port ${port})`,
          icon: <Shield className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host, p) => `https://${host}:${p}`,
        },
      ];
    default:
      return [
        {
          name: `HTTP (Port ${port})`,
          scheme: 'http',
          badgeLabel: 'HTTP',
          defaultPort: port,
          descriptionKo: `HTTP 웹 서비스 연결 (포트 ${port})`,
          descriptionEn: `HTTP web service connection (port ${port})`,
          icon: <Globe className="w-5 h-5 text-sky-400" />,
          badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          getUrl: (host, p) => `http://${host}:${p}`,
        },
        {
          name: `HTTPS (Port ${port})`,
          scheme: 'https',
          badgeLabel: 'HTTPS',
          defaultPort: port,
          descriptionKo: `보안 HTTPS 웹 서비스 연결 (포트 ${port})`,
          descriptionEn: `Secure HTTPS web service connection (port ${port})`,
          icon: <Shield className="w-5 h-5 text-teal-400" />,
          badgeBg: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
          getUrl: (host, p) => `https://${host}:${p}`,
        },
        {
          name: `TCP Socket (Port ${port})`,
          scheme: 'tcp',
          badgeLabel: 'TCP',
          defaultPort: port,
          descriptionKo: `원격 TCP 소켓 URI 복사 (포트 ${port})`,
          descriptionEn: `Copy remote TCP socket URI (port ${port})`,
          icon: <Cpu className="w-5 h-5 text-indigo-400" />,
          badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
          getUrl: (host, p) => `tcp://${host}:${p}`,
        },
      ];
  }
};

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  ip,
  port,
  theme,
  lang,
  showToast,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCopiedIndex(null);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, [isOpen, ip, port]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanIp = ip.trim() || '127.0.0.1';
  const safeHost = formatHostForUrl(cleanIp);
  const safePort = Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 80;
  const suggestions = getSuggestionsForPort(safePort);

  const markCopiedWithTimeout = (idx: number) => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    setCopiedIndex(idx);
    copyTimerRef.current = setTimeout(() => {
      setCopiedIndex(null);
      copyTimerRef.current = null;
    }, 2000);
  };

  const handleCopyLink = async (url: string, idx: number, customSuccessMsg?: string) => {
    const ok = await copyTextToClipboard(url);
    if (ok) {
      markCopiedWithTimeout(idx);
      showToast(
        customSuccessMsg ||
          (lang === 'ko'
            ? '🔗 연결 주소가 클립보드에 복사되었습니다.'
            : '🔗 Connection URI copied to clipboard.')
      );
    } else {
      showToast(
        lang === 'ko'
          ? '⚠️ 클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.'
          : '⚠️ Failed to copy URI. Please check clipboard permissions.'
      );
    }
  };

  const handleLaunch = async (suggestion: ProtocolSuggestion, idx: number) => {
    const url = suggestion.getUrl(safeHost, safePort);
    if (suggestion.scheme === 'http' || suggestion.scheme === 'https') {
      if (!isSafeHttpUrl(url)) {
        showToast(
          lang === 'ko'
            ? '⚠️ 유효하지 않은 웹 연결 주소입니다.'
            : '⚠️ Invalid web connection URL.'
        );
        return;
      }
      try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(
          lang === 'ko'
            ? `🌐 ${suggestion.name} 연결을 엽니다: ${url}`
            : `🌐 Opening ${suggestion.name}: ${url}`
        );
      } catch {
        await handleCopyLink(
          url,
          idx,
          lang === 'ko'
            ? `📋 새 탭 열기가 차단되어 주소를 복사했습니다: ${url}`
            : `📋 Popup blocked — copied URL instead: ${url}`
        );
      }
      return;
    }

    if (suggestion.scheme === 'rdp' || suggestion.scheme === 'ssh' || suggestion.scheme === 'smb') {
      try {
        const res = await fetch(
          getApiUrl(
            `/api/remote-action?action=${encodeURIComponent(suggestion.scheme)}&ip=${encodeURIComponent(cleanIp)}&port=${safePort}`
          ),
          { method: 'POST', signal: safeTimeout(2000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            showToast(
              data.message ||
                (lang === 'ko'
                  ? `🚀 ${suggestion.name} 클라이언트를 실행합니다.`
                  : `🚀 Launching ${suggestion.name} client.`)
            );
            return;
          }
        }
      } catch {
        // Backend unavailable (pure web/preview mode) — fall back safely below
      }

      if (suggestion.scheme === 'rdp') {
        try {
          const rdpTarget = safePort !== 3389 ? `${cleanIp}:${safePort}` : cleanIp;
          const rdpContent = `full address:s:${rdpTarget}\r\nprompt for credentials:i:1\r\nadministrative session:i:1\r\n`;
          const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `connect_${cleanIp.replace(/[^a-zA-Z0-9_-]/g, '_')}.rdp`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          showToast(
            lang === 'ko'
              ? `🖥️ 원격 데스크톱(.rdp) 연결 파일을 다운로드했습니다 (${rdpTarget}).`
              : `🖥️ Downloaded .rdp connection file (${rdpTarget}).`
          );
          return;
        } catch {
          // Fall through to clipboard URI copy
        }
      }

      if (suggestion.scheme === 'smb') {
        const uncPath = `\\\\${cleanIp}`;
        await handleCopyLink(
          uncPath,
          idx,
          lang === 'ko'
            ? `📁 SMB 공유 폴더 경로(${uncPath})가 복사되었습니다. 파일 탐색기에 붙여넣으세요.`
            : `📁 SMB path (${uncPath}) copied. Paste it into File Explorer.`
        );
        return;
      }
    }

    await handleCopyLink(
      url,
      idx,
      lang === 'ko'
        ? `📋 ${suggestion.name} URI가 복사되었습니다. 터미널이나 클라이언트에서 실행하세요.`
        : `📋 ${suggestion.name} URI copied. Paste it into your client or terminal.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 mobile-notch-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-connect-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          theme === 'beige'
            ? 'bg-[#fcf8f2] border-[#e2cca7] text-[#3d2711]'
            : theme === 'white'
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            theme === 'beige'
              ? 'border-[#e2cca7] bg-[#f5ebd6]/60'
              : theme === 'white'
              ? 'border-slate-100 bg-slate-50'
              : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-black font-mono">
              {safePort}
            </div>
            <div>
              <h3 id="quick-connect-title" className="font-black text-sm tracking-tight flex items-center gap-2">
                <span>{lang === 'ko' ? '빠른 연결 (Quick Connect)' : 'Quick Connect'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-400 font-bold">
                  Port {safePort}
                </span>
              </h3>
              <p
                className={`text-[11px] font-mono opacity-75 ${
                  theme === 'white' || theme === 'beige' ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {cleanIp}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ko' ? '빠른 연결 창 닫기' : 'Close Quick Connect'}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              theme === 'white' || theme === 'beige'
                ? 'hover:bg-slate-200/60 text-slate-600'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 overflow-y-auto">
          <p
            className={`text-[11.5px] leading-relaxed ${
              theme === 'white' || theme === 'beige' ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {lang === 'ko'
              ? `포트 ${safePort}번에서 자주 사용되는 권장 프로토콜 및 연결 방식을 선택하세요.`
              : `Select a recommended protocol or connection method commonly used on port ${safePort}.`}
          </p>

          <div className="space-y-2.5">
            {suggestions.map((sug, idx) => {
              const url = sug.getUrl(safeHost, safePort);
              const isWeb = sug.scheme === 'http' || sug.scheme === 'https';
              const isCopied = copiedIndex === idx;

              return (
                <div
                  key={sug.name}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    theme === 'beige'
                      ? 'bg-[#f5ebd6]/40 border-[#e2cca7] hover:bg-[#f5ebd6]'
                      : theme === 'white'
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${sug.badgeBg}`}
                    >
                      {sug.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm truncate flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border shrink-0 ${sug.badgeBg}`}
                        >
                          {sug.badgeLabel}
                        </span>
                        <span className="truncate">{sug.name}</span>
                      </div>
                      <div
                        className={`text-[10.5px] opacity-75 truncate mt-0.5 ${
                          theme === 'white' || theme === 'beige' ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {lang === 'ko' ? sug.descriptionKo : sug.descriptionEn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(url, idx)}
                      title={lang === 'ko' ? '주소 복사' : 'Copy URI'}
                      aria-label={lang === 'ko' ? `${sug.name} 주소 복사` : `Copy ${sug.name} URI`}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        theme === 'white' || theme === 'beige'
                          ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                          : 'border-slate-600 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunch(sug, idx)}
                      className={`px-3.5 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                        isWeb
                          ? 'bg-sky-500 hover:bg-sky-400 text-black'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isWeb ? (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          <span>{lang === 'ko' ? '웹 열기' : 'Open'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>{lang === 'ko' ? '실행/복사' : 'Copy URI'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-[11px] opacity-75 ${
            theme === 'beige'
              ? 'border-[#e2cca7] bg-[#f5ebd6]/40'
              : theme === 'white'
              ? 'border-slate-100 bg-slate-50'
              : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <span className="font-mono">
            Target: {cleanIp}:{safePort}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold hover:underline cursor-pointer"
          >
            {lang === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
