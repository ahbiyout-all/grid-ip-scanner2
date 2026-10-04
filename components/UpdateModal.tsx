import React, { useState } from 'react';
import { 
  X, Download, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, 
  Smartphone, Monitor, Package, Sparkles, ShieldCheck, ArrowRight
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
  const [activeTab, setActiveTab] = useState<'download' | 'changelog'>('download');

  if (!isOpen) return null;

  const hasUpdate = updateInfo?.hasUpdate ?? false;
  const latestVer = updateInfo?.latestVersion || CURRENT_APP_VERSION;

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
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl ${t.bg} ${t.text} rounded-2xl shadow-2xl border ${t.border} p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}>
        
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
                  실시간 자동 업데이트 센터
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                  hasUpdate 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-white/10 text-zinc-300'
                }`}>
                  {hasUpdate ? `v${latestVer} 업데이트 발견` : '최신 버전 유지 중'}
                </span>
              </div>
              <p className="text-[11px] opacity-70 truncate font-mono">
                저장소: {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={onRefreshCheck}
              disabled={isChecking}
              title="GitHub Releases 실시간 재확인"
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 transition-all"
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
                {hasUpdate ? '새로운 버전으로 즉시 업데이트할 수 있습니다!' : '현재 시스템이 최신 공식 릴리즈를 사용하고 있습니다.'}
              </div>
              <div className="text-[11px] opacity-75 mt-0.5 flex items-center gap-2 font-mono">
                <span>현재: <b>v{CURRENT_APP_VERSION}</b></span>
                <ArrowRight className="w-3 h-3 opacity-50" />
                <span>최신: <b className="text-emerald-400">v{latestVer}</b></span>
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
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 transition-all"
          >
            <span>GitHub 릴리즈 보기</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 pb-1 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('download')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'download' ? t.btnActive : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>플랫폼별 설치 파일 (PC / Android APK)</span>
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'changelog' ? t.btnActive : 'opacity-60 hover:opacity-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>패치 노트 & 변경점</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-3 no-scrollbar min-h-0">
          
          {/* TAB 1: Platform Downloads (PC .exe, Installer, Android APK) */}
          {activeTab === 'download' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Windows Portable .exe */}
                <div className={`p-4 rounded-xl border ${t.card} flex flex-col justify-between space-y-3 hover:border-sky-500/40 transition-all group`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sky-400 font-black text-xs uppercase">
                        <Monitor className="w-4 h-4" />
                        <span>Windows 무설치 포터블</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
                        .exe
                      </span>
                    </div>
                    <p className="text-[11px] opacity-75 mt-1.5 leading-snug">
                      설치 없이 다운로드 즉시 실행. USB 휴대가 가능한 단일 실행 파일.
                    </p>
                  </div>
                  <a
                    href={updateInfo?.portableExeUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-center text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Grid IP Scanner2 v{latestVer}.exe</span>
                  </a>
                </div>

                {/* 2. Windows Official Installer */}
                <div className={`p-4 rounded-xl border ${t.card} flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all group`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-emerald-400 font-black text-xs uppercase">
                        <Package className="w-4 h-4" />
                        <span>Windows 정식 인스톨러</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                        Setup.exe
                      </span>
                    </div>
                    <p className="text-[11px] opacity-75 mt-1.5 leading-snug">
                      Inno Setup 기반. 제어판 등록, 방화벽 자동 예외, 256x256 바탕화면 아이콘 자동 설치.
                    </p>
                  </div>
                  <a
                    href={updateInfo?.installerExeUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Grid_IP_Scanner2_v{latestVer}_Setup.exe</span>
                  </a>
                </div>

                {/* 3. Android Mobile APK */}
                <div className={`p-4 rounded-xl border ${t.card} flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-all group sm:col-span-2`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 text-purple-400 font-black text-xs uppercase">
                        <Smartphone className="w-4 h-4" />
                        <span>Android 스마트폰 설치 파일 (APK)</span>
                      </div>
                      <p className="text-[11px] opacity-75 mt-1 leading-snug">
                        갤럭시 등 안드로이드 스마트폰에 직접 설치 가능한 네이티브 APK 패키지입니다.
                      </p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-mono w-fit">
                      Android 8.0+
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={updateInfo?.androidApkUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-center text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Grid_IP_Scanner2_v{latestVer}.apk 다운로드</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Automated One-Click Script Notice */}
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-[10.5px] opacity-80 flex items-center justify-between">
                <span>💡 <b>Windows 자동 업데이트 스크립트</b>: 프로젝트 루트의 <code>scripts\auto-update.bat</code>를 실행하면 최신 버전을 자동으로 내려받습니다.</span>
              </div>
            </div>
          )}

          {/* TAB 2: Changelog / Release Notes */}
          {activeTab === 'changelog' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-black text-xs text-sky-400 uppercase">
                    {updateInfo?.releaseTitle || `Grid IP Scanner2 v${latestVer}`}
                  </div>
                  {updateInfo?.publishedAt && (
                    <span className="text-[10px] mono opacity-60">
                      {new Date(updateInfo.publishedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-[11px] leading-relaxed opacity-85 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto no-scrollbar border-t border-white/5 pt-2">
                  {updateInfo?.releaseNotes || '릴리즈 변경 내역이 제공되지 않았습니다.'}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="text-[10px] opacity-60 font-mono">
            {isChecking ? 'GitHub 릴리즈 상태 점검 중...' : `현재 설치된 버전: v${CURRENT_APP_VERSION}`}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-md shrink-0"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
