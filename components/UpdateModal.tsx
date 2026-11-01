import React from 'react';
import { 
  X, RefreshCw, ExternalLink, CheckCircle2, Sparkles, ArrowRight, Smartphone, Download, Globe, Zap, Package
} from 'lucide-react';
import { UpdateInfo, CURRENT_APP_VERSION, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../services/updateChecker';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  onRefreshCheck: () => void;
  theme: 'dark' | 'gray' | 'beige';
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking,
  onRefreshCheck,
  theme
}) => {
  if (!isOpen) return null;

  const hasUpdate = updateInfo?.hasUpdate ?? false;
  const latestVer = updateInfo?.latestVersion || CURRENT_APP_VERSION;

  const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform() === 'android'));
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile = isAndroid || isIOS || (typeof window !== 'undefined' && window.innerWidth < 768);

  const fallbackApkUrl = updateInfo?.androidApkUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${latestVer}/Grid_IP_Scanner2_v${latestVer}.apk`;
  const fallbackInstallerUrl = updateInfo?.installerExeUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${latestVer}/Grid_IP_Scanner2_v${latestVer}_Setup.exe`;

  const handleSyncPwaNow = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (_) {
      // ignore
    } finally {
      window.location.reload();
    }
  };

  const t = {
    dark: {
      bg: 'bg-zinc-900',
      border: 'border-zinc-800',
      card: 'bg-zinc-950/80 border-zinc-800',
      text: 'text-zinc-100',
      textMuted: 'text-zinc-400',
      accent: 'text-sky-400',
      btnActive: 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
    },
    gray: {
      bg: 'bg-[#2b2d31]',
      border: 'border-[#1e1f22]',
      card: 'bg-[#1e1f22] border-[#313338]',
      text: 'text-[#dbdee1]',
      textMuted: 'text-[#949ba4]',
      accent: 'text-[#5865f2]',
      btnActive: 'bg-[#5865f2] text-white shadow-lg shadow-[#5865f2]/20'
    },
    beige: {
      bg: 'bg-[#fcf8f2]',
      border: 'border-[#e6d0a7]',
      card: 'bg-[#f5ebd6]/60 border-[#e6d0a7]',
      text: 'text-[#5c4a37]',
      textMuted: 'text-[#9c8268]',
      accent: 'text-[#b45309]',
      btnActive: 'bg-[#b45309] text-white shadow-lg shadow-[#b45309]/20'
    }
  }[theme];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-xl ${t.bg} ${t.text} rounded-2xl shadow-2xl border ${t.border} p-4 sm:p-6 pb-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col`}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <img 
                src="./logo.png" 
                alt="Grid IP Scanner2" 
                className="w-12 h-12 rounded-xl object-contain p-1 bg-black/40 border-2 border-sky-500/30 shadow-md"
              />
              {hasUpdate && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-900"></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base uppercase tracking-tight truncate">
                  실시간 전자동 업데이트 센터
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                  hasUpdate 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-white/10 text-zinc-300'
                }`}>
                  {hasUpdate ? `v${latestVer} 업데이트 감지` : '최신 버전 유지 중'}
                </span>
              </div>
              <p className="text-[11px] opacity-70 truncate font-mono">
                저장소: {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={onRefreshCheck}
              disabled={isChecking}
              title="GitHub Releases 실시간 재확인"
              className={`px-3.5 py-1.5 border rounded-lg text-[11px] font-black uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                theme === 'beige'
                  ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-400 hover:shadow-[0_0_12px_rgba(56,189,248,0.35)]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isChecking ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span>업데이트 확인</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Hero Card */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          hasUpdate 
            ? 'bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-transparent border-emerald-500/30'
            : t.card
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${hasUpdate ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'} shrink-0`}>
              {hasUpdate ? <Sparkles className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide">
                {hasUpdate 
                  ? (isMobile ? '📱 모바일 맞춤형 신규 업데이트 패키지가 출시되었습니다!' : '새로운 정식 인스톨러 업데이트가 출시되었습니다!')
                  : '현재 시스템이 최신 공식 릴리즈를 사용하고 있습니다.'}
              </div>
              <div className="text-[11px] opacity-75 mt-0.5 flex items-center gap-2 font-mono">
                <span>현재 버전: <b>v{CURRENT_APP_VERSION}</b></span>
                <ArrowRight className="w-3 h-3 opacity-50" />
                <span>최신 버전: <b className="text-emerald-400">v{latestVer}</b></span>
                {updateInfo?.publishedAt && (
                  <span className="opacity-60 hidden sm:inline">
                    ({new Date(updateInfo.publishedAt).toLocaleDateString()})
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href={updateInfo?.htmlUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 transition-all text-sky-400 hover:text-sky-300"
          >
            <span>GitHub 릴리즈</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Action Cards for Mobile & Windows */}
        {hasUpdate && (
          <div className="space-y-2.5 shrink-0">
            {/* 1. Mobile Android APK Action Card (Android/Mobile Priority) */}
            {(isAndroid || isMobile) && (
              <div className="p-3.5 rounded-xl border bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 flex-wrap">
                      <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>📱 Android 모바일 APK 전자동 설치 패키지</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[8.5px] font-black uppercase">
                        모바일 권장
                      </span>
                    </div>
                    <div className="text-[10.5px] opacity-80 mt-0.5">
                      공식 서명된 APK(`Grid_IP_Scanner2_v{latestVer}.apk`)를 터치하여 전자동 다운로드 및 즉시 업데이트를 진행합니다.
                    </div>
                  </div>

                  <a
                    href={fallbackApkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Android APK 다운로드</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* 2. Mobile Web / PWA Instant Sync Card (PWA Priority) */}
            {isMobile && (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span>⚡ 모바일 웹 / PWA 최신 버전 전자동 즉시 동기화</span>
                    </div>
                    <div className="text-[10.5px] opacity-80 mt-0.5">
                      브라우저 및 PWA 스토리지 캐시를 원클릭 초기화하여 최신 웹 앱 번들을 즉시 동기화 적용합니다.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncPwaNow}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>PWA 최신 버전 즉시 동기화</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Official Windows Installer Download Action Card (Desktop Only) */}
            {!isMobile && (
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-sky-400" />
                      <span>💻 Windows 공식 인스톨러 (Setup.exe)</span>
                    </div>
                    <div className="text-[10.5px] opacity-80 mt-0.5">
                      Windows PC용 설치 프로그램(`Grid_IP_Scanner2_v{latestVer}_Setup.exe`) 내려받기.
                    </div>
                  </div>

                  <a
                    href={fallbackInstallerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0"
                  >
                    <span>Windows Setup.exe 다운로드</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Android APK for Desktop (Optional fallback) */}
            {!isMobile && fallbackApkUrl && (
              <div className="p-2.5 px-3.5 rounded-xl border border-white/5 bg-black/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-300">Android APK 패키지도 제공됨</span>
                </div>
                <a href={fallbackApkUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-sky-400 hover:underline">
                  APK 다운로드
                </a>
              </div>
            )}
          </div>
        )}

        {/* Patch Notes Preview */}
        {updateInfo?.releaseNotes && (
          <div className="flex-1 overflow-y-auto space-y-2 p-3.5 rounded-xl bg-black/20 border border-white/5 text-[11px]">
            <div className="font-bold text-zinc-300 flex items-center justify-between">
              <span>📋 릴리즈 패치 노트 (Release Notes)</span>
              <span className="text-[10px] opacity-50 font-mono">GitHub Releases SSOT</span>
            </div>
            <div className="opacity-80 whitespace-pre-line leading-relaxed font-mono text-[10.5px]">
              {updateInfo.releaseNotes}
            </div>
          </div>
        )}

        {/* Repository & Channel Info Footer */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 font-mono shrink-0">
          <div>
            <span>저장소: </span>
            <a 
              href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-sky-400 hover:underline font-bold"
            >
              github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
            </a>
          </div>
          <div>
            <span>개발자: <b className="text-zinc-200">AhBiYout</b> (네임스페이스: {GITHUB_REPO_OWNER})</span>
          </div>
        </div>

      </div>
    </div>
  );
};

