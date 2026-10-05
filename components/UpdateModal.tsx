import React from 'react';
import { 
  X, RefreshCw, ExternalLink, CheckCircle2, Sparkles, ArrowRight
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
      <div className={`w-full max-w-xl ${t.bg} ${t.text} rounded-2xl shadow-2xl border ${t.border} p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}>
        
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

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={onRefreshCheck}
              disabled={isChecking}
              title="GitHub Releases 실시간 재확인"
              className={`px-3 py-1.5 border rounded-lg text-[11px] font-black uppercase transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm ${
                theme === 'beige'
                  ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-400'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>업데이트 확인</span>
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

      </div>
    </div>
  );
};
