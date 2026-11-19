import React, { useEffect } from 'react';
import {
  HelpCircle,
  X,
  Info,
  RefreshCw,
  ShieldCheck,
  Github,
  ExternalLink,
  Download,
  Package,
  Smartphone,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  UpdateInfo,
  CURRENT_APP_VERSION,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
} from '../services/updateChecker';

interface HelpUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpTab: 'guide' | 'update';
  setHelpTab: (tab: 'guide' | 'update') => void;
  updateInfo: UpdateInfo | null;
  isCheckingUpdate: boolean;
  onCheckUpdate: (openModal?: boolean) => void;
  onSyncPwaNow: () => void;
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  s: any;
  panelClass: string;
}

export const HelpUpdateModal: React.FC<HelpUpdateModalProps> = ({
  isOpen,
  onClose,
  helpTab,
  setHelpTab,
  updateInfo,
  isCheckingUpdate,
  onCheckUpdate,
  onSyncPwaNow,
  theme,
  lang,
  s,
  panelClass,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBeige = theme === 'beige';
  const isWhite = theme === 'white';
  const isLight = isBeige || isWhite;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl ${
          isBeige
            ? 'bg-[#fcf8f2] text-[#5c4a37]'
            : isWhite
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-zinc-900 text-zinc-100'
        } rounded-2xl shadow-2xl border ${panelClass} p-4 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-sky-500" />
            <h3 className="font-black text-sm tracking-tight">{s.helpTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-50 transition-opacity cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={`flex border-b shrink-0 gap-2 ${
            isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/10'
          }`}
        >
          <button
            onClick={() => setHelpTab('guide')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              helpTab === 'guide'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>{s.helpTabGuide || (lang === 'ko' ? '사용 안내 & 라이선스' : 'User Guide & License')}</span>
          </button>
          <button
            onClick={() => {
              setHelpTab('update');
              if (!updateInfo) {
                onCheckUpdate(false);
              }
            }}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${
              helpTab === 'update'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-sky-500' : ''}`} />
            <span>{s.helpTabUpdate || (lang === 'ko' ? 'GitHub 업데이트 확인' : 'GitHub Updates')}</span>
            {updateInfo?.hasUpdate && (
              <span className="text-[10px] font-mono font-bold text-emerald-500">· NEW</span>
            )}
          </button>
        </div>

        {/* Tab 1: User Guide & License */}
        {helpTab === 'guide' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar">
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left ${
                isBeige
                  ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-sky-50/70 border-sky-200 text-slate-800'
                  : 'bg-sky-500/10 border-sky-500/20'
              }`}
            >
              <img
                src="./logo.png"
                alt="Grid IP Scanner2"
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border border-sky-500/40 shadow-lg shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black tracking-tight">Grid IP Scanner2</h4>
                  <span className="text-xs font-mono font-bold text-sky-500 tabular-nums">
                    · v{CURRENT_APP_VERSION}
                  </span>
                </div>
                <p className="text-[11px] opacity-75 leading-snug">
                  {lang === 'ko'
                    ? '초고속 C-Class 네트워크 비주얼 탐색 및 9만 건 OUI 식별 엔진'
                    : 'High-speed C-Class visual network discovery & 90k+ OUI identification engine'}
                </p>
                <div className="text-[10.5px] opacity-65 flex items-center justify-center sm:justify-start gap-2 font-mono pt-0.5 flex-wrap">
                  <span>AhBiYout</span>
                  <span>·</span>
                  <span>GitHub: AhBiYout-all/grid-ip-scanner2</span>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isBeige
                  ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold">{s.helpLicenseTitle}</span>
              </div>
              <p className="opacity-90 whitespace-pre-line">{s.helpLicenseDesc}</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isBeige
                  ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-sky-500" />
                <span className="font-bold">{s.helpUsageTitle}</span>
              </div>
              <p className="opacity-90 whitespace-pre-line leading-relaxed">{s.helpUsageDesc}</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isBeige
                  ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Github className="w-4 h-4 text-sky-400" />
                  <span className="font-bold">{s.creatorContact}</span>
                </div>
                <span className="text-[10.5px] font-mono opacity-65">Open Source & Issues</span>
              </div>
              <div className="space-y-2.5 text-[11px] opacity-90">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {lang === 'ko' ? '개발자:' : 'Developer:'}{' '}
                    <span className="font-bold">AhBiYout</span>{' '}
                    <span className="text-[10px] font-mono opacity-60">(@AhBiYout-all)</span>
                  </span>
                  <a
                    href="https://github.com/AhBiYout-all/grid-ip-scanner2/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[10.5px] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? 'GitHub 이슈 문의' : 'GitHub Issues'}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                </div>
                <div className={`flex items-center justify-between pt-1 border-t ${
                  isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/5'
                }`}>
                  <span className="opacity-70">{lang === 'ko' ? '저장소:' : 'Repository:'}</span>
                  <a
                    href="https://github.com/AhBiYout-all/grid-ip-scanner2"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-500 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>github.com/AhBiYout-all/grid-ip-scanner2</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">{lang === 'ko' ? '블로그:' : 'Blog:'}</span>
                  <a
                    href="https://ahbiyoutvibe.blogspot.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-500 hover:underline font-bold"
                  >
                    ahbiyoutvibe.blogspot.com
                  </a>
                </div>
                <div className={`pt-2 border-t text-[10px] opacity-60 text-center font-mono ${
                  isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/5'
                }`}>
                  Copyright (c) 2025-2026 AhBiYout. All rights reserved.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Updates */}
        {helpTab === 'update' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar">
            <div
              className={`p-4 rounded-2xl border ${
                isBeige
                  ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-black/30 border-white/10'
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs">
                    {lang === 'ko' ? 'GitHub 릴리스 버전 상태' : 'GitHub Release Status'}
                  </span>
                </div>
                <button
                  onClick={() => onCheckUpdate(false)}
                  disabled={isCheckingUpdate}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 border border-sky-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>
                    {isCheckingUpdate
                      ? lang === 'ko'
                        ? '확인 중...'
                        : 'Checking...'
                      : lang === 'ko'
                      ? '실시간 점검'
                      : 'Check Now'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isBeige
                      ? 'bg-white border-[#e6d0a7] text-[#5c4a37]'
                      : isWhite
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="text-[10px] opacity-60 font-semibold">
                    {lang === 'ko' ? '현재 실행 버전' : 'Current Installed'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-base font-black font-mono tabular-nums text-sky-500">
                      v{CURRENT_APP_VERSION}
                    </span>
                    <span className="text-[10px] opacity-65 font-semibold">
                      · {lang === 'ko' ? '로컬' : 'Local'}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    updateInfo?.hasUpdate
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isBeige
                      ? 'bg-white border-[#e6d0a7] text-[#5c4a37]'
                      : isWhite
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="text-[10px] opacity-60 font-semibold">
                    {lang === 'ko' ? 'GitHub 최신 릴리스' : 'Latest Release'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-base font-black font-mono tabular-nums ${
                        updateInfo?.hasUpdate ? 'text-emerald-500' : ''
                      }`}
                    >
                      v{updateInfo?.latestVersion || CURRENT_APP_VERSION}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        updateInfo?.hasUpdate ? 'text-emerald-500' : 'text-sky-500'
                      }`}
                    >
                      ·{' '}
                      {updateInfo?.hasUpdate
                        ? lang === 'ko'
                          ? '업데이트 가능'
                          : 'Update Available'
                        : lang === 'ko'
                        ? '최신 상태'
                        : 'Up to Date'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {updateInfo?.hasUpdate ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-black text-xs text-emerald-500">
                      {lang === 'ko'
                        ? `새 정식 버전 (v${updateInfo.latestVersion}) 사용 가능`
                        : `New Release (v${updateInfo.latestVersion}) Available`}
                    </h4>
                    <p className="text-[11px] opacity-80 leading-snug">
                      {lang === 'ko'
                        ? '네트워크 탐지 엔진 및 보안 감사 기능이 강화되었습니다. 아래 배포 패키지 중 원하는 플랫폼을 선택하여 다운로드하세요.'
                        : 'Latest network engine updates and security improvements are available.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={
                      updateInfo.installerExeUrl ||
                      `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}_Setup.exe`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={`p-3 rounded-xl border flex items-center justify-between group transition-all cursor-pointer ${
                      isLight
                        ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-700'
                        : 'bg-sky-600/20 hover:bg-sky-600/30 border-sky-500/40 text-sky-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px]">Windows Setup</div>
                        <div className="text-[9.5px] opacity-70">인스톨러 (.exe)</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </a>

                  <a
                    href={
                      updateInfo.portableExeUrl ||
                      `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}_Portable.exe`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={`p-3 rounded-xl border flex items-center justify-between group transition-all cursor-pointer ${
                      isBeige
                        ? 'bg-white hover:bg-[#f5ebd6]/70 border-[#e6d0a7] text-[#5c4a37]'
                        : isWhite
                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className={`w-4 h-4 shrink-0 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                      <div className="text-left">
                        <div className="font-bold text-[11px]">Windows Portable</div>
                        <div className="text-[9.5px] opacity-70">단일 무설치 (.exe)</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </a>

                  <a
                    href={
                      updateInfo.androidApkUrl ||
                      `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}.apk`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={`p-3 rounded-xl border flex items-center justify-between group transition-all cursor-pointer ${
                      isLight
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-700'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px]">Android Mobile</div>
                        <div className="text-[9.5px] opacity-70">안드로이드 APK (.apk)</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </a>

                  <button
                    onClick={onSyncPwaNow}
                    className={`p-3 rounded-xl border flex items-center justify-between group transition-all cursor-pointer ${
                      isLight
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-800'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px]">PWA / Web 즉시 적용</div>
                        <div className="text-[9.5px] opacity-70">캐시 초기화 & 갱신</div>
                      </div>
                    </div>
                    <RefreshCw className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                {updateInfo.releaseNotes && (
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isBeige
                      ? 'bg-white border-[#e6d0a7]'
                      : isWhite
                      ? 'bg-white border-slate-200'
                      : 'bg-black/25 border-white/5'
                  }`}>
                    <div className={`flex items-center justify-between text-[10px] font-bold ${
                      isLight ? 'text-sky-700' : 'text-sky-400'
                    }`}>
                      <span>{lang === 'ko' ? '릴리스 변경 사항' : 'Release Notes'}</span>
                      <span className="font-mono opacity-70 font-normal">
                        {updateInfo.publishedAt
                          ? new Date(updateInfo.publishedAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <pre className={`text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto opacity-85 leading-relaxed no-scrollbar p-2 rounded-lg border ${
                      isBeige
                        ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#3d2711]'
                        : isWhite
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-black/20 border-white/5'
                    }`}>
                      {updateInfo.releaseNotes}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-emerald-500">
                    {lang === 'ko'
                      ? `현재 최신 버전(v${CURRENT_APP_VERSION})을 사용 중입니다.`
                      : `You are using the latest version (v${CURRENT_APP_VERSION}).`}
                  </h4>
                  <p className="text-[11px] opacity-75 leading-tight">
                    {lang === 'ko'
                      ? '공식 GitHub Releases 저장소와 일치하며 모든 스캔 엔진 및 OUI DB가 최신 상태입니다.'
                      : 'Synchronized with the official GitHub release repository.'}
                  </p>
                </div>
              </div>
            )}

            <div
              className={`p-4 rounded-xl border ${
                isBeige
                  ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]'
                  : isWhite
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white/5 border-white/5'
              } space-y-2 text-[11px]`}
            >
              <div className="font-bold text-[10.5px] opacity-70 mb-1">
                {lang === 'ko' ? '공식 GitHub 릴리스 배포 채널' : 'Official GitHub Channels'}
              </div>
              <div className={`flex items-center justify-between py-1 border-b ${
                isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/5'
              }`}>
                <span className="opacity-70">
                  {lang === 'ko' ? 'GitHub 릴리스:' : 'GitHub Releases:'}
                </span>
                <a
                  href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>releases/latest</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              </div>
              <div className={`flex items-center justify-between py-1 border-b ${
                isWhite ? 'border-slate-200' : isBeige ? 'border-[#e6d0a7]' : 'border-white/5'
              }`}>
                <span className="opacity-70">{lang === 'ko' ? '저장소:' : 'Repository:'}</span>
                <a
                  href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="opacity-70">{lang === 'ko' ? '블로그:' : 'Blog:'}</span>
                <a
                  href="https://ahbiyoutvibe.blogspot.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>ahbiyoutvibe.blogspot.com</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-all shadow-md flex-shrink-0 cursor-pointer"
        >
          {s.done || 'Done'}
        </button>
      </div>
    </div>
  );
};
