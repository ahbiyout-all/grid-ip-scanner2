import React, { useEffect, useState } from 'react';
import {
  X,
  Smartphone,
  Server,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import {
  getCustomEngineBaseUrl,
  setCustomEngineBaseUrl,
  setAutoDetectedEngineBaseUrl,
  parseEngineInfoResponse,
  safeTimeout,
  isCapacitorNative,
  isMobileDeviceBrowser,
} from '../services/apiConfig';
import { CURRENT_APP_VERSION, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../services/updateChecker';

interface EngineConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (infoData: any) => void;
  lastErrorReason?: string;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  showToast: (msg: string) => void;
}

export const EngineConnectModal: React.FC<EngineConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  lastErrorReason,
  theme,
  lang,
  showToast,
}) => {
  const [engineUrl, setEngineUrl] = useState<string>(() => getCustomEngineBaseUrl() || 'http://127.0.0.1:3031');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEngineUrl(getCustomEngineBaseUrl() || 'http://127.0.0.1:3031');
    setTestResult(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isKo = lang === 'ko';
  const isBeige = theme === 'beige';
  const isWhite = theme === 'white';
  const isNativeApp = isCapacitorNative();
  const isMobile = isMobileDeviceBrowser();
  const isHttpsPublicWeb =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    !isNativeApp &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

  const modalBg = isBeige
    ? 'bg-[#fcf8f2] border-[#d4be9c] text-[#2a1a0a]'
    : isWhite
    ? 'bg-white border-slate-300 text-slate-900'
    : 'bg-slate-900 border-slate-700 text-slate-100';

  const cardBg = isBeige
    ? 'bg-[#f5ebd6]/70 border-[#e6d0a7]'
    : isWhite
    ? 'bg-slate-50 border-slate-200'
    : 'bg-slate-950/70 border-slate-800';

  const inputBg = isBeige
    ? 'bg-white border-[#d4be9c] text-[#2a1a0a]'
    : isWhite
    ? 'bg-white border-slate-300 text-slate-900'
    : 'bg-slate-950 border-slate-700 text-slate-100';

  const apkDownloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

  const handleTestAndConnect = async (overrideUrl?: string) => {
    const raw = (overrideUrl ?? engineUrl).trim().replace(/\/+$/, '');
    if (!raw) {
      setCustomEngineBaseUrl(null);
      setAutoDetectedEngineBaseUrl(null);
      setTestResult({
        ok: true,
        msg: isKo ? '기본 자동 감지 모드로 초기화되었습니다.' : 'Reset to automatic endpoint detection.',
      });
      return;
    }

    const normalized = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${normalized}/api/info`, { signal: safeTimeout(4000) });
      const data = await parseEngineInfoResponse(res);
      if (data) {
        setCustomEngineBaseUrl(normalized);
        setAutoDetectedEngineBaseUrl(normalized);
        setTestResult({
          ok: true,
          msg: isKo
            ? `엔진 연결 성공 (${data.computerName || normalized} · ${data.subnet || 'LAN'})`
            : `Connected to engine (${data.computerName || normalized} · ${data.subnet || 'LAN'})`,
        });
        onConnected(data);
        showToast(
          isKo
            ? `✅ 스캔 엔진 연결됨: ${normalized}`
            : `✅ Connected to scan engine: ${normalized}`
        );
        setTimeout(() => onClose(), 500);
      } else {
        setTestResult({
          ok: false,
          msg: isKo
            ? '응답이 올바른 스캔 엔진 JSON이 아닙니다. URL과 포트를 확인하세요.'
            : 'Response is not valid scan engine JSON. Check URL and port.',
        });
      }
    } catch (err: any) {
      const mixedContentHint =
        isHttpsPublicWeb && normalized.startsWith('http://') && !normalized.includes('127.0.0.1') && !normalized.includes('localhost')
          ? isKo
            ? ' (HTTPS 웹페이지에서는 브라우저 보안상 사설 HTTP IP 연결이 차단될 수 있습니다. 동일 Wi-Fi의 http://<PC-IP>:3000 으로 직접 접속하거나 Android APK를 사용하세요.)'
            : ' (HTTPS pages block mixed-content HTTP LAN requests. Open http://<PC-IP>:3000 directly or use the Android APK.)'
          : '';
      setTestResult({
        ok: false,
        msg:
          (isKo ? `연결 실패: ${err?.message || '응답 없음'}` : `Connection failed: ${err?.message || 'No response'}`) +
          mixedContentHint,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDefault = () => {
    setCustomEngineBaseUrl(null);
    setAutoDetectedEngineBaseUrl(null);
    setEngineUrl('http://127.0.0.1:3031');
    setTestResult({
      ok: true,
      msg: isKo ? '기본 연결 설정으로 복원되었습니다.' : 'Restored default connection settings.',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm mobile-notch-modal"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              {isMobile ? <Smartphone className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">
                {isKo ? '모바일 · 로컬 스캔 엔진 연결 설정' : 'Mobile & Local Scan Engine Connection'}
              </h2>
              <p className="text-[11px] opacity-70">
                {isKo
                  ? '브라우저 보안 제약 우회 및 LAN 스캔 엔진 연동'
                  : 'Connect local Android / Go LAN scanning engine'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-current/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {lastErrorReason && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="leading-relaxed">{lastErrorReason}</div>
            </div>
          )}

          {isHttpsPublicWeb && (
            <div className={`p-3.5 rounded-xl border space-y-2 ${cardBg}`}>
              <div className="flex items-center gap-2 font-black text-sky-400">
                <Wifi className="w-4 h-4 shrink-0" />
                <span>
                  {isKo
                    ? '웹사이트(*.ai.studio)에서 모바일 Wi-Fi 직접 스캔이 안 되는 이유'
                    : 'Why public HTTPS web pages cannot scan your Wi-Fi directly'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-85">
                {isKo
                  ? '모바일 웹 브라우저(Chrome/Safari)는 보안 정책상 로컬 Wi-Fi(192.168.x.x) ARP/ICMP 패킷 전송을 차단하며, 클라우드 웹서버는 사용자 스마트폰의 사설 Wi-Fi 망에 접근할 수 없습니다.'
                  : 'Mobile browsers block raw ARP/ICMP LAN scanning from public HTTPS pages, and cloud web servers cannot reach your phone’s private Wi-Fi network.'}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>
                    {isKo
                      ? `Android APK 설치 (v${CURRENT_APP_VERSION} 내장 엔진)`
                      : `Download Android APK (v${CURRENT_APP_VERSION})`}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[10px] opacity-70 leading-relaxed">
                {isKo
                  ? '또는 동일 Wi-Fi의 PC에서 Grid IP Scanner2를 실행한 뒤 모바일 브라우저에서 http://<PC-IP>:3000 (또는 --lan 옵션으로 3031 포트)에 접속하면 PC 엔진을 통해 스캔할 수 있습니다.'
                  : 'Or run Grid IP Scanner2 on a PC on the same Wi-Fi and open http://<PC-IP>:3000 from your phone browser.'}
              </p>
            </div>
          )}

          <div className={`p-3.5 rounded-xl border space-y-2.5 ${cardBg}`}>
            <label className="block text-[11px] font-black uppercase tracking-wider opacity-80">
              {isKo ? '엔진 주소 (로컬 / LAN Go 서버)' : 'Engine Base URL (Local / LAN Go Server)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={engineUrl}
                onChange={(e) => setEngineUrl(e.target.value)}
                placeholder="http://127.0.0.1:3031 or http://192.168.0.24:3031"
                className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
              />
              <button
                type="button"
                onClick={() => handleTestAndConnect()}
                disabled={testing}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isKo ? '연결 테스트' : 'Connect'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEngineUrl('http://127.0.0.1:3031');
                  void handleTestAndConnect('http://127.0.0.1:3031');
                }}
                className="px-2.5 py-1 rounded-md border border-current/15 hover:bg-current/10 text-[10px] font-bold cursor-pointer"
              >
                127.0.0.1:3031
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-2.5 py-1 rounded-md border border-current/15 hover:bg-current/10 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isKo ? '자동 감지 초기화' : 'Reset Auto'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                  testResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
              >
                {testResult.msg}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-current/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-current/20 hover:bg-current/10 text-xs font-bold cursor-pointer"
          >
            {isKo ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
