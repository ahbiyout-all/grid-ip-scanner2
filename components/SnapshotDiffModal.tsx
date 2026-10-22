import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Camera,
  ArrowRightLeft,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Monitor,
  Trash2,
  Edit2,
  Clock,
  Wifi,
  WifiOff,
  Server,
  Zap,
} from 'lucide-react';
import { ScanSnapshot, ScanResult, DiffStatus, DiffItem } from '../types';
import { computeSnapshotDiff, exportDiffToCSV, updateSnapshotLabel, deleteSnapshot } from '../services/diffEngine';
import { getDeviceAlias } from '../services/deviceAliasManager';

interface SnapshotDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: ScanSnapshot[];
  onSnapshotsChange: (updated: ScanSnapshot[]) => void;
  currentResults: Record<string, ScanResult>;
  currentSubnet: string;
  onSaveCurrentSnapshot: (customLabel?: string) => void;
  onSelectIp?: (ip: string) => void;
  theme: 'dark' | 'gray' | 'beige' | 'light';
  s: any;
  showToast: (msg: string) => void;
}

export const SnapshotDiffModal: React.FC<SnapshotDiffModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onSnapshotsChange,
  currentResults,
  currentSubnet,
  onSaveCurrentSnapshot,
  onSelectIp,
  theme,
  s,
  showToast,
}) => {
  // Source A (Before) and Source B (After) selection
  // 'live' means current active scan results
  const [sourceAId, setSourceAId] = useState<string>(() => {
    return snapshots.length > 0 ? snapshots[0].id : 'live';
  });
  const [sourceBId, setSourceBId] = useState<string>('live');

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'all' | 'changes' | 'new' | 'offline' | 'changed' | 'security' | 'same'>('changes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Snapshot label editing state
  const [editingSnapId, setEditingSnapId] = useState<string | null>(null);
  const [editLabelInput, setEditLabelInput] = useState('');
  const [newSnapLabelInput, setNewSnapLabelInput] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  // Resolve results dataset for Source A and Source B
  const resolveDataset = (id: string): { label: string; results: Record<string, ScanResult>; timestamp?: number; count: number } => {
    if (id === 'live') {
      const activeCount = Object.values(currentResults || {}).filter((r) => r.status === 'active').length;
      return {
        label: `현재 실시간 스캔 (${currentSubnet}.0/24, ${activeCount}대 온라인)`,
        results: currentResults || {},
        timestamp: Date.now(),
        count: activeCount,
      };
    }
    const found = snapshots.find((s) => s.id === id);
    if (found) {
      return {
        label: found.label,
        results: found.results,
        timestamp: found.timestamp,
        count: found.activeCount,
      };
    }
    return {
      label: '알 수 없는 스냅샷',
      results: {},
      count: 0,
    };
  };

  const dataA = useMemo(() => resolveDataset(sourceAId), [sourceAId, snapshots, currentResults, currentSubnet]);
  const dataB = useMemo(() => resolveDataset(sourceBId), [sourceBId, snapshots, currentResults, currentSubnet]);

  // Compute comprehensive diff between Source A (Before) and Source B (After)
  const diffResult = useMemo(() => {
    return computeSnapshotDiff(dataB.results, dataA.results, dataB.label, dataA.label);
  }, [dataA, dataB]);

  // Swap Source A and Source B
  const handleSwapSources = () => {
    setSourceAId(sourceBId);
    setSourceBId(sourceAId);
  };

  // Filter items based on activeTab and searchTerm
  const filteredItems = useMemo(() => {
    return diffResult.items.filter((item) => {
      // Tab filter
      if (activeTab === 'changes' && item.diffStatus === 'same') return false;
      if (activeTab === 'new' && item.diffStatus !== 'new') return false;
      if (activeTab === 'offline' && item.diffStatus !== 'offline') return false;
      if (activeTab === 'changed' && item.diffStatus !== 'changed') return false;
      if (activeTab === 'security' && !item.hasSecurityRisk) return false;
      if (activeTab === 'same' && item.diffStatus !== 'same') return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const curDev = item.current?.device;
        const prevDev = item.previous?.device;

        const matchIp = item.ip.toLowerCase().includes(query);
        const matchCurMac = curDev?.mac?.toLowerCase().includes(query);
        const matchPrevMac = prevDev?.mac?.toLowerCase().includes(query);
        const matchCurHost = curDev?.hostname?.toLowerCase().includes(query);
        const matchPrevHost = prevDev?.hostname?.toLowerCase().includes(query);
        const matchCurVendor = curDev?.vendor?.toLowerCase().includes(query);
        const matchPrevVendor = prevDev?.vendor?.toLowerCase().includes(query);
        const matchDetail = item.changeDetails.some((d) => d.toLowerCase().includes(query));
        const alias = getDeviceAlias(curDev?.mac || prevDev?.mac, item.ip);
        const matchAlias = alias?.nickname?.toLowerCase().includes(query) || alias?.notes?.toLowerCase().includes(query);

        if (!matchIp && !matchCurMac && !matchPrevMac && !matchCurHost && !matchPrevHost && !matchCurVendor && !matchPrevVendor && !matchDetail && !matchAlias) {
          return false;
        }
      }

      return true;
    });
  }, [diffResult.items, activeTab, searchTerm]);

  // Rename a snapshot
  const handleStartRename = (snap: ScanSnapshot) => {
    setEditingSnapId(snap.id);
    setEditLabelInput(snap.label);
  };

  const handleSaveRename = (id: string) => {
    if (editLabelInput.trim()) {
      const updated = updateSnapshotLabel(id, editLabelInput.trim());
      onSnapshotsChange(updated);
      showToast('스냅샷 이름이 변경되었습니다.');
    }
    setEditingSnapId(null);
  };

  // Delete a snapshot
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSnapshot(id);
    onSnapshotsChange(updated);
    if (sourceAId === id) {
      setSourceAId(updated.length > 0 ? updated[0].id : 'live');
    }
    if (sourceBId === id) {
      setSourceBId('live');
    }
    showToast('스냅샷이 삭제되었습니다.');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const filename = `GridIPScanner2_Diff_${dataA.label.slice(0, 15).replace(/[^a-zA-Z0-9가-힣]/g, '_')}_vs_${dataB.label.slice(0, 15).replace(/[^a-zA-Z0-9가-힣]/g, '_')}.csv`;
    exportDiffToCSV(diffResult, filename);
    showToast('스냅샷 비교 분석 CSV가 다운로드되었습니다.');
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = [
      `=== Grid IP Scanner2 스냅샷 비교 분석 요약 ===`,
      `[기준점 A]: ${dataA.label} (${dataA.timestamp ? new Date(dataA.timestamp).toLocaleString() : 'Live'})`,
      `[비교점 B]: ${dataB.label} (${dataB.timestamp ? new Date(dataB.timestamp).toLocaleString() : 'Live'})`,
      `--------------------------------------------------`,
      `• 신규 접속 (+NEW): ${diffResult.summary.newCount}대`,
      `• 오프라인 이탈 (-OFF): ${diffResult.summary.offlineCount}대`,
      `• 식별자/포트 변동 (!CHG): ${diffResult.summary.changedCount}대`,
      `• 보안 주의 경보 (⚠️ ALERT): ${diffResult.summary.securityAlertCount || 0}건`,
      `• 동일 유지 (=SAME): ${diffResult.summary.sameCount}대`,
      `• 전체 대조 노드: ${diffResult.summary.totalEvaluated}개`,
      `--------------------------------------------------`,
      `[주요 변동 내역 (${diffResult.items.filter((i) => i.diffStatus !== 'same').length}건)]:`,
      ...diffResult.items
        .filter((i) => i.diffStatus !== 'same')
        .map((i) => `[${i.ip}] [${i.diffStatus.toUpperCase()}] ${i.changeDetails.join(' | ')}`),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast('비교 분석 요약이 클립보드에 복사되었습니다.');
  };

  // Save live scan as snapshot
  const handleSaveSnapshotConfirm = () => {
    onSaveCurrentSnapshot(newSnapLabelInput.trim() || undefined);
    setNewSnapLabelInput('');
    setShowSavePrompt(false);
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const isBeige = theme === 'beige';

  // Base styling classes
  const modalBg = isBeige ? 'bg-[#fcf7ee] text-[#3d2711]' : isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-800';
  const borderCol = isBeige ? 'border-[#e4d2b7]' : isDark ? 'border-zinc-800' : 'border-slate-200';
  const cardBg = isBeige ? 'bg-[#f5ecdd] border-[#e2cfb4]' : isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200';
  const headerBg = isBeige ? 'bg-[#f1e4d0] border-[#ddc6a7]' : isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-slate-100 border-slate-200';

  const totalChanges = diffResult.summary.newCount + diffResult.summary.offlineCount + diffResult.summary.changedCount;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${modalBg} ${borderCol} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">스냅샷 비교 스튜디오 (Snapshot Diff Studio)</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  DEEP DIFF v2
                </span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5">
                두 시점 간의 신규 접속 단말, 오프라인 이탈, MAC 주소 충돌 및 개방 포트 변동을 1:1로 정밀 대조합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavePrompt(!showSavePrompt)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="현재 스캔 상태를 새 스냅샷으로 즉시 저장"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>새 스냅샷 저장</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Snapshot Save Prompt Bar */}
        {showSavePrompt && (
          <div className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 bg-indigo-500/10 border-indigo-500/30 text-xs animate-in slide-in-from-top-2`}>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-bold shrink-0 text-indigo-400">스냅샷 메모/라벨:</span>
              <input
                type="text"
                placeholder={`예: 정기점검 전, 신규AP 교체 후 (${currentSubnet}.0/24)`}
                value={newSnapLabelInput}
                onChange={(e) => setNewSnapLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshotConfirm()}
                className={`flex-1 max-w-md px-2.5 py-1 rounded border text-xs outline-none ${
                  isBeige ? 'bg-white border-[#d8c09a]' : isDark ? 'bg-black/40 border-zinc-700 text-white' : 'bg-white border-slate-300'
                }`}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleSaveSnapshotConfirm}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs shadow cursor-pointer"
              >
                저장 완료
              </button>
              <button
                onClick={() => setShowSavePrompt(false)}
                className="px-2.5 py-1 bg-black/10 dark:bg-white/10 hover:opacity-80 rounded text-xs cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Main Controls: Source A (Before) ➔ Source B (After) Selection */}
        <div className={`p-4 border-b ${cardBg} space-y-3`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Compare Selectors Box */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
              {/* Source A (Before) */}
              <div className="flex-1 min-w-[240px] max-w-sm">
                <div className="flex items-center justify-between mb-1 text-[11px] font-bold opacity-75">
                  <span className="flex items-center gap-1 text-sky-500">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    기준점 [A] (Before / 과거 기준)
                  </span>
                  {dataA.timestamp && (
                    <span className="text-[10px] opacity-60 font-mono">
                      {new Date(dataA.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <select
                  value={sourceAId}
                  onChange={(e) => setSourceAId(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all ${
                    isBeige
                      ? 'bg-white border-[#d8c09a] text-[#3d2711]'
                      : isDark
                      ? 'bg-zinc-950 border-zinc-700 text-zinc-100'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="live">⚡ 현재 실시간 스캔 결과 (Live)</option>
                  <optgroup label="저장된 스냅샷 목록">
                    {snapshots.map((snap) => (
                      <option key={snap.id} value={snap.id}>
                        📸 {snap.label} ({snap.activeCount}대 온라인)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Swap Button */}
              <button
                onClick={handleSwapSources}
                className="self-end mb-0.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-indigo-600 hover:text-white border border-current border-opacity-15 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="기준점(A)과 비교대상(B)을 서로 맞바꿉니다"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>

              {/* Source B (After) */}
              <div className="flex-1 min-w-[240px] max-w-sm">
                <div className="flex items-center justify-between mb-1 text-[11px] font-bold opacity-75">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    대조 대상 [B] (After / 비교 시점)
                  </span>
                  {dataB.timestamp && (
                    <span className="text-[10px] opacity-60 font-mono">
                      {new Date(dataB.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <select
                  value={sourceBId}
                  onChange={(e) => setSourceBId(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all ${
                    isBeige
                      ? 'bg-white border-[#d8c09a] text-[#3d2711]'
                      : isDark
                      ? 'bg-zinc-950 border-zinc-700 text-zinc-100'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="live">⚡ 현재 실시간 스캔 결과 (Live)</option>
                  <optgroup label="저장된 스냅샷 목록">
                    {snapshots.map((snap) => (
                      <option key={snap.id} value={snap.id}>
                        📸 {snap.label} ({snap.activeCount}대 온라인)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Export & Action Utility Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-center">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                title="비교 분석 상세 내역을 CSV 파일로 다운로드합니다"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>CSV 내보내기</span>
              </button>

              <button
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                title="보고용 텍스트 요약을 클립보드에 복사합니다"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                <span>{isCopied ? '복사됨' : '요약 복사'}</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            <button
              onClick={() => setActiveTab('changes')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'changes'
                  ? 'ring-2 ring-indigo-500 bg-indigo-500/15 border-indigo-500 shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'
              }`}
            >
              <div className="text-[10px] font-bold opacity-70 uppercase tracking-tight">총 변동 장치</div>
              <div className="text-lg font-black text-indigo-400 mono mt-0.5">{totalChanges}대</div>
              <div className="text-[9px] opacity-60">변동 감지된 모든 노드</div>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'new'
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/15 border-emerald-500 shadow-sm'
                  : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
              }`}
            >
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">+ 신규 접속 (NEW)</div>
              <div className="text-lg font-black text-emerald-500 mono mt-0.5">+{diffResult.summary.newCount}대</div>
              <div className="text-[9px] opacity-60">새로 온라인 등장</div>
            </button>

            <button
              onClick={() => setActiveTab('offline')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'offline'
                  ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500 shadow-sm'
                  : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
              }`}
            >
              <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">- 오프라인 이탈 (OFF)</div>
              <div className="text-lg font-black text-rose-500 mono mt-0.5">-{diffResult.summary.offlineCount}대</div>
              <div className="text-[9px] opacity-60">전원차단 / 연결 끊김</div>
            </button>

            <button
              onClick={() => setActiveTab('changed')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'changed'
                  ? 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500 shadow-sm'
                  : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
              }`}
            >
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">! 속성/포트 변동 (CHG)</div>
              <div className="text-lg font-black text-amber-500 mono mt-0.5">{diffResult.summary.changedCount}대</div>
              <div className="text-[9px] opacity-60">MAC, 포트, 호스트명, RTT</div>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'ring-2 ring-red-500 bg-red-500/20 border-red-500 shadow-sm'
                  : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
              }`}
            >
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-tight flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                보안 경보 (ALERTS)
              </div>
              <div className="text-lg font-black text-red-500 mono mt-0.5">{diffResult.summary.securityAlertCount || 0}건</div>
              <div className="text-[9px] opacity-60">MAC변경 / 위험포트 개방</div>
            </button>

            <button
              onClick={() => setActiveTab('same')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'same'
                  ? 'ring-2 ring-sky-500 bg-sky-500/15 border-sky-500 shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'
              }`}
            >
              <div className="text-[10px] font-bold opacity-70 uppercase tracking-tight">= 상태 유지 (SAME)</div>
              <div className="text-lg font-black text-sky-400 mono mt-0.5">{diffResult.summary.sameCount}대</div>
              <div className="text-[9px] opacity-60">변동 없는 정상 노드</div>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Header */}
        <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${headerBg}`}>
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('changes')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'changes' ? 'bg-indigo-600 text-white shadow' : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              변동 사항만 ({totalChanges})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'security' ? 'bg-red-600 text-white shadow' : 'text-red-400 hover:bg-red-500/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              보안 경보 ({diffResult.summary.securityAlertCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'new' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-500 hover:bg-emerald-500/10'
              }`}
            >
              +신규 ({diffResult.summary.newCount})
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'offline' ? 'bg-rose-600 text-white shadow' : 'text-rose-500 hover:bg-rose-500/10'
              }`}
            >
              -오프라인 ({diffResult.summary.offlineCount})
            </button>
            <button
              onClick={() => setActiveTab('changed')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'changed' ? 'bg-amber-600 text-white shadow' : 'text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              !속성변동 ({diffResult.summary.changedCount})
            </button>
            <button
              onClick={() => setActiveTab('same')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'same' ? 'bg-sky-600 text-white shadow' : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              동일 유지 ({diffResult.summary.sameCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-zinc-700 text-white shadow' : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              전체 대조 ({diffResult.summary.totalEvaluated})
            </button>
          </div>

          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="IP, MAC, 호스트명, 포트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1 rounded-lg border text-xs outline-none transition-all ${
                isBeige ? 'bg-white border-[#d8c09a]' : isDark ? 'bg-black/40 border-zinc-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Subtle Guidance Strip */}
        <div className="px-4 py-1.5 bg-black/5 dark:bg-white/5 border-b border-current border-opacity-5 flex items-center justify-between text-[10.5px] opacity-75">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">💡</span>
            <span>
              <strong>판정 기준:</strong> MAC 주소(ARP 충돌), 호스트명, 포트 개방/차단 변동 시에만 <span className="font-bold text-amber-500">!CHG(변동)</span> 판정되며, 사용자 별칭(별명/메모)이나 단순 핑 지연 편차는 변동 판정에 영향을 주지 않습니다.
            </span>
          </div>
        </div>

        {/* Side-by-Side 1:1 Comparison Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-2 opacity-60">
              <div className="text-3xl">🎯</div>
              <div className="text-sm font-bold">선택하신 조건에 해당하는 장치 변동이 없습니다.</div>
              <p className="text-xs">상단 필터 탭을 변경하거나 검색어를 재설정하세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-current border-opacity-10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10.5px] font-black uppercase tracking-wider ${headerBg} opacity-85`}>
                    <th className="py-2.5 px-3 w-[140px]">IP 주소 / 상태</th>
                    <th className="py-2.5 px-3 w-[30%]">
                      <div className="flex items-center gap-1.5 text-sky-500 font-black">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span>[A] 기준점 (Before)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 w-[30%]">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-black">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>[B] 비교 시점 (After)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3">변동 상세 및 진단 (Diff Analysis)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current divide-opacity-10">
                  {filteredItems.map((item) => {
                    const prevDev = item.previous?.device;
                    const curDev = item.current?.device;
                    const isPrevActive = item.previous?.status === 'active';
                    const isCurActive = item.current?.status === 'active';

                    // Visual badge style based on diffStatus
                    const badge = {
                      new: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: '+NEW 신규' },
                      offline: { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', text: '-OFF 오프라인' },
                      changed: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: '!CHG 변동' },
                      same: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', text: '=SAME 동일' },
                    }[item.diffStatus];

                    return (
                      <tr
                        key={item.ip}
                        className={`transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          item.hasSecurityRisk
                            ? 'bg-red-500/10'
                            : item.diffStatus === 'new'
                            ? 'bg-emerald-500/5'
                            : item.diffStatus === 'offline'
                            ? 'bg-rose-500/5'
                            : item.diffStatus === 'changed'
                            ? 'bg-amber-500/5'
                            : ''
                        }`}
                      >
                        {/* Column 1: IP & Status */}
                        <td className="py-2.5 px-3 align-top font-mono">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (onSelectIp) {
                                  onSelectIp(item.ip);
                                  onClose();
                                }
                              }}
                              className="font-black text-xs hover:underline text-indigo-400 text-left cursor-pointer"
                              title="메인 그리드에서 이 노드 상세정보 확인"
                            >
                              {item.ip}
                            </button>
                            {item.hasSecurityRisk && (
                              <span title="보안 위험 경보" className="text-red-500 animate-pulse">
                                ⚠️
                              </span>
                            )}
                          </div>
                          {(() => {
                            const devAlias = getDeviceAlias(curDev?.mac || prevDev?.mac, item.ip);
                            if (!devAlias?.nickname) return null;
                            return (
                              <div
                                className="mt-1 text-[10px] text-amber-500 font-bold flex items-center gap-1 truncate max-w-[130px]"
                                title={`사용자 정의 별칭: ${devAlias.nickname}${devAlias.notes ? ` (${devAlias.notes})` : ''}`}
                              >
                                <span>🏷️</span>
                                <span className="truncate">{devAlias.nickname}</span>
                              </div>
                            );
                          })()}
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Before [A] */}
                        <td className="py-2.5 px-3 align-top">
                          {isPrevActive ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="font-bold text-xs">{prevDev?.vendor || '제조사 미확인'}</span>
                                {prevDev?.latency ? (
                                  <span className="text-[10px] opacity-60 font-mono">({prevDev.latency}ms)</span>
                                ) : null}
                              </div>
                              <div className="text-[11px] opacity-80 truncate" title={prevDev?.hostname}>
                                {prevDev?.hostname ? `호스트: ${prevDev.hostname}` : '호스트명 없음'}
                              </div>
                              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                MAC: {prevDev?.mac || 'Unknown'}
                              </div>
                              {prevDev?.openPorts && prevDev.openPorts.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {prevDev.openPorts.slice(0, 5).map((p) => (
                                    <span
                                      key={p}
                                      className="px-1 py-0.2 rounded text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {prevDev.openPorts.length > 5 && (
                                    <span className="text-[9px] opacity-60">+{prevDev.openPorts.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 opacity-40 text-xs italic">
                              <WifiOff className="w-3.5 h-3.5" />
                              <span>미응답 (오프라인)</span>
                            </div>
                          )}
                        </td>

                        {/* Column 3: After [B] */}
                        <td className="py-2.5 px-3 align-top">
                          {isCurActive ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="font-bold text-xs">{curDev?.vendor || '제조사 미확인'}</span>
                                {curDev?.latency ? (
                                  <span className="text-[10px] opacity-60 font-mono">({curDev.latency}ms)</span>
                                ) : null}
                              </div>
                              <div className="text-[11px] opacity-80 truncate" title={curDev?.hostname}>
                                {curDev?.hostname ? `호스트: ${curDev.hostname}` : '호스트명 없음'}
                              </div>
                              <div
                                className={`text-[10px] font-mono ${
                                  item.macChanged
                                    ? 'text-red-500 font-black bg-red-500/15 px-1 rounded inline-block'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                MAC: {curDev?.mac || 'Unknown'}
                              </div>
                              {curDev?.openPorts && curDev.openPorts.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {curDev.openPorts.slice(0, 5).map((p) => {
                                    const isNewlyAdded = item.portsAdded?.includes(p);
                                    return (
                                      <span
                                        key={p}
                                        className={`px-1 py-0.2 rounded text-[9px] font-mono border ${
                                          isNewlyAdded
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold animate-pulse'
                                            : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                        }`}
                                      >
                                        {isNewlyAdded ? `+${p}` : p}
                                      </span>
                                    );
                                  })}
                                  {curDev.openPorts.length > 5 && (
                                    <span className="text-[9px] opacity-60">+{curDev.openPorts.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 opacity-40 text-xs italic">
                              <WifiOff className="w-3.5 h-3.5" />
                              <span>미응답 (오프라인)</span>
                            </div>
                          )}
                        </td>

                        {/* Column 4: Change Details & Insights */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="space-y-1">
                            {item.changeDetails.map((detail, idx) => {
                              const isAlert = detail.includes('⚠️') || detail.includes('보안') || detail.includes('MAC');
                              const isAddedPort = detail.includes('신규 개방 포트');
                              const isLatency = detail.includes('지연시간');

                              return (
                                <div
                                  key={idx}
                                  className={`text-[11px] leading-snug flex items-start gap-1.5 ${
                                    isAlert
                                      ? 'text-red-400 font-bold'
                                      : isAddedPort
                                      ? 'text-amber-400 font-bold'
                                      : isLatency
                                      ? 'text-sky-400'
                                      : 'opacity-90'
                                  }`}
                                >
                                  <span className="shrink-0">•</span>
                                  <span>{detail}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Snapshot Management Drawer (Bottom Bar) */}
        <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${headerBg}`}>
          <div className="flex items-center gap-2">
            <span className="font-bold opacity-70">보관된 스냅샷 목록 ({snapshots.length}개):</span>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl py-0.5">
              {snapshots.slice(0, 5).map((snap) => (
                <div
                  key={snap.id}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] shrink-0 ${
                    sourceAId === snap.id || sourceBId === snap.id
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold'
                      : 'border-current border-opacity-15 bg-black/5 dark:bg-white/5 opacity-80'
                  }`}
                >
                  {editingSnapId === snap.id ? (
                    <input
                      type="text"
                      value={editLabelInput}
                      onChange={(e) => setEditLabelInput(e.target.value)}
                      onBlur={() => handleSaveRename(snap.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(snap.id)}
                      className="w-24 px-1 py-0.2 bg-black/50 text-white rounded text-[10px] outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate max-w-[120px]" title={snap.label}>
                      {snap.label}
                    </span>
                  )}
                  <button
                    onClick={() => handleStartRename(snap)}
                    className="p-0.5 opacity-60 hover:opacity-100"
                    title="이름 변경"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                    className="p-0.5 opacity-60 hover:opacity-100 text-red-400"
                    title="스냅샷 삭제"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {snapshots.length > 5 && (
                <span className="text-[10px] opacity-60">외 {snapshots.length - 5}개</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-current border-opacity-20 hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
