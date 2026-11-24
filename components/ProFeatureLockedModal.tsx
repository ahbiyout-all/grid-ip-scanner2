import React, { useEffect } from 'react';
import {
  Lock,
  Key,
  X,
  Power,
  ShieldAlert,
  Clock,
  Archive,
  GitCompare,
  FileText,
  FileSpreadsheet,
  Palette,
  BellRing,
  Network,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import { LicenseInfo } from '../types';

export type ProLockedFeatureId =
  | 'remoteBootWoL'
  | 'deepPortAudit'
  | 'autoScheduler'
  | 'autoReportArchive'
  | 'snapshotDiff'
  | 'reportDiffCompare'
  | 'reportAuditExport'
  | 'reportExcelFullWorkbook'
  | 'reportBrandingLogo'
  | 'intruderGuard'
  | 'multiSubnetUnlimited'
  | 'multiSubnetBatchSweep'
  | 'topologySecurityPro';

export interface ProFeatureLockSpec {
  id: ProLockedFeatureId;
  requiredTier: 'pro' | 'enterprise';
  categoryKo: string;
  categoryEn: string;
  featureNameKo: string;
  featureNameEn: string;
  valuePropKo: string;
  valuePropEn: string;
  highlightsKo: string[];
  highlightsEn: string[];
}

export const PRO_FEATURE_LOCK_CATALOG: Record<ProLockedFeatureId, ProFeatureLockSpec> = {
  remoteBootWoL: {
    id: 'remoteBootWoL',
    requiredTier: 'pro',
    categoryKo: '원격 전원 제어',
    categoryEn: 'Remote Power Control',
    featureNameKo: '원격 부팅 (Wake-on-LAN)',
    featureNameEn: 'Remote Boot (Wake-on-LAN)',
    valuePropKo:
      '오프라인 상태의 PC·서버 MAC 주소를 대상으로 UDP 매직 패킷을 즉시 브로드캐스트하여 원격지에서 전원을 켤 수 있습니다.',
    valuePropEn:
      'Broadcast UDP Magic Packets directly to offline workstations and servers by MAC address to power them on remotely.',
    highlightsKo: [
      'UDP 9 / 7 포트 표준 Magic Packet 즉시 발송',
      '이전 기준 스냅샷의 MAC 기록을 활용한 오프라인 장비 깨우기',
      '장치 상세 패널 원클릭 원격 부팅 연동',
    ],
    highlightsEn: [
      'Instant Magic Packet broadcast over UDP ports 9 & 7',
      'Wake offline devices using baseline snapshot MAC history',
      'One-click remote boot trigger inside Device Inspector',
    ],
  },
  deepPortAudit: {
    id: 'deepPortAudit',
    requiredTier: 'pro',
    categoryKo: '심층 보안 진단',
    categoryEn: 'Deep Security Audit',
    featureNameKo: '심층 포트 정밀 보안 감사',
    featureNameEn: 'Deep Port Security Audit',
    valuePropKo:
      '대상 호스트의 주요 서비스 포트를 정밀 프로빙하고 배너·프로토콜·취약 노출 위험도(CVSS/리스크 등급)와 권고 조치를 자동 산출합니다.',
    valuePropEn:
      'Probe target host service ports in depth, extract banners, and calculate exposure risk levels with actionable remediation advice.',
    highlightsKo: [
      'Telnet·FTP·SMB·RDP·Redis 등 고위험 포트 집중 점검',
      '네이티브 IOCP 고속 포트 프로빙 및 서비스 배너 분석',
      '위험 점수 산출 및 장치별 보안 권고 사항 생성',
    ],
    highlightsEn: [
      'Inspect high-risk ports including Telnet, FTP, SMB, RDP, and Redis',
      'Native IOCP high-speed port probing with service banner grabbing',
      'Automated risk scoring and per-device hardening recommendations',
    ],
  },
  autoScheduler: {
    id: 'autoScheduler',
    requiredTier: 'pro',
    categoryKo: '정기 자동화',
    categoryEn: 'Scan Automation',
    featureNameKo: '정기 자동 스캔 스케줄러',
    featureNameEn: 'Recurring Scan Scheduler',
    valuePropKo:
      '지정한 주기(분·시간·일간)마다 서브넷 스캔을 백그라운드에서 무인 실행하고 기준 스냅샷 캡처와 변동 감지를 자동화합니다.',
    valuePropEn:
      'Run unattended subnet scans on custom intervals in the background with automated snapshot capture and change tracking.',
    highlightsKo: [
      '대역별 다중 반복 스케줄 등록 및 백그라운드 자동 실행',
      '스캔 완료 시 자동 스냅샷 저장 및 변경 감지 알림',
      '스케줄 실행 이력 추적 및 CSV 이력 내보내기',
    ],
    highlightsEn: [
      'Configure multiple recurring schedules per subnet range',
      'Automatic baseline snapshot capture and delta alerting',
      'Execution run history log with CSV audit export',
    ],
  },
  autoReportArchive: {
    id: 'autoReportArchive',
    requiredTier: 'pro',
    categoryKo: '자동 아카이브',
    categoryEn: 'Automated Archiving',
    featureNameKo: '정기 스캔 자동 리포트 저장',
    featureNameEn: 'Automated Report Archiving',
    valuePropKo:
      '예약 스캔이 완료될 때마다 Excel·JSON·Markdown·HTML 리포트를 자동 생성하여 감사 이력 보관함에 누적 저장합니다.',
    valuePropEn:
      'Automatically generate and archive Excel, JSON, Markdown, and HTML reports whenever a scheduled scan finishes.',
    highlightsKo: [
      '신규·변경 기기 발생 시에만 조건부 자동 리포트 생성 지원',
      '리포트 센터 아카이브 탭에서 이력 즉시 열람 및 재다운로드',
      '스케줄별 다중 포맷 동시 저장 지원',
    ],
    highlightsEn: [
      'Conditional archiving triggered only when topology changes occur',
      'Browse, preview, and re-download archived reports anytime',
      'Simultaneous multi-format report generation per schedule',
    ],
  },
  snapshotDiff: {
    id: 'snapshotDiff',
    requiredTier: 'pro',
    categoryKo: '변화 추적 엔진',
    categoryEn: 'Topology Diff Engine',
    featureNameKo: '스냅샷 비교 & 1:1 대조 스튜디오',
    featureNameEn: 'Snapshot Diff & 1:1 Comparison Studio',
    valuePropKo:
      '과거 기준 스냅샷과 현재 네트워크 상태를 대조하여 신규(+NEW)·이탈(-OFF)·MAC/포트 변경(!CHG) 장치를 한눈에 식별합니다.',
    valuePropEn:
      'Compare live network scans against historical baselines to pinpoint new (+NEW), offline (-OFF), and modified (!CHG) hosts.',
    highlightsKo: [
      '실시간 그리드 Diff 오버레이 및 기준 스냅샷 즉시 전환',
      '두 시점 간 1:1 나란히 대조 스튜디오 테이블 제공',
      '포트 개방·MAC 변조·호스트명 변동 세부 내역 추적',
    ],
    highlightsEn: [
      'Real-time grid Diff overlay with instant baseline switching',
      'Dedicated 1:1 side-by-side comparison studio table',
      'Track port openings, MAC shifts, and hostname mutations',
    ],
  },
  reportDiffCompare: {
    id: 'reportDiffCompare',
    requiredTier: 'pro',
    categoryKo: '비교 보고서',
    categoryEn: 'Comparison Reporting',
    featureNameKo: '스냅샷 변화 비교 리포트',
    featureNameEn: 'Snapshot Diff Comparison Report',
    valuePropKo:
      '기준 스냅샷 대비 신규 접속·오프라인 이탈·MAC/포트 변경 내역을 정리한 감사 대응용 비교 보고서를 생성합니다.',
    valuePropEn:
      'Generate audit-ready comparison reports detailing newly joined, departed, and altered devices against a baseline snapshot.',
    highlightsKo: [
      '리포트 내 신규·변동·이탈 요약 및 상세 대조 섹션 포함',
      '원하는 시점의 기준 스냅샷 선택 및 즉시 미리보기',
      'PDF·HTML·Excel·Markdown 등 다양한 포맷으로 출력',
    ],
    highlightsEn: [
      'Includes delta summary counts and itemized change breakdowns',
      'Choose any saved baseline snapshot with live preview',
      'Export across PDF, printable HTML, Excel, and Markdown',
    ],
  },
  reportAuditExport: {
    id: 'reportAuditExport',
    requiredTier: 'pro',
    categoryKo: '보안 감사 보고서',
    categoryEn: 'Security Audit Reporting',
    featureNameKo: '정밀 보안 감사 보고서 (PDF / HTML)',
    featureNameEn: 'Security Audit Report (PDF / HTML)',
    valuePropKo:
      '위험 포트 노출 현황, LAA 랜덤 MAC 식별, 리스크 점수 및 보안 권고 사항을 포함한 공식 제출용 보안 감사 문서를 출력합니다.',
    valuePropEn:
      'Produce executive security audit documents covering risky open ports, randomized MACs, risk scores, and remediation steps.',
    highlightsKo: [
      'A4 인쇄 최적화 보안 감사 PDF 및 대화형 HTML 보고서',
      '고위험 포트·미등록 기기 우선 정렬 및 리스크 요약 제공',
      '기관 보안 점검 및 정기 감사 증빙 자료로 즉시 활용',
    ],
    highlightsEn: [
      'A4 print-ready security audit PDF and standalone HTML reports',
      'Highlights high-risk ports and remediation priorities first',
      'Ready for compliance reviews and periodic security audits',
    ],
  },
  reportExcelFullWorkbook: {
    id: 'reportExcelFullWorkbook',
    requiredTier: 'pro',
    categoryKo: '전체 보고서 엑셀',
    categoryEn: 'Full Excel Workbook',
    featureNameKo: '전체 보고서 엑셀 통합문서 (5시트 풀 워크북)',
    featureNameEn: 'Full Report Excel Workbook (5-Sheet)',
    valuePropKo:
      'Free 버전은 16×16 바둑판 그리드 시트만 생성되며, 요약 KPI·제조사 점유율·전체 장비 인벤토리·보안 감사·스냅샷 Diff까지 포함된 전체 보고서 엑셀 통합문서는 PRO 이상에서 제공됩니다.',
    valuePropEn:
      'Free tier generates the 16×16 visual IP grid worksheet only. Upgrade to PRO to export the complete 5-sheet Excel report including Summary KPIs, Device Inventory, Security Audit, and Snapshot Diff.',
    highlightsKo: [
      '1_Summary · 2_Grid_16x16 · 3_Device_Inventory · 4_Security_Audit · 5_Snapshot_Diff 전체 시트 생성',
      '제조사 분포, 지연시간 수치 셀, 취약 포트 권고 조치 일괄 수록',
      '기준 스냅샷 선택 시 5번째 Diff 비교 워크시트 자동 포함',
    ],
    highlightsEn: [
      'Exports 1_Summary, 2_Grid_16x16, 3_Device_Inventory, 4_Security_Audit & 5_Snapshot_Diff',
      'Includes vendor analytics, numeric latency columns, and security remediation notes',
      'Automatically appends Snapshot Diff worksheet when a baseline is selected',
    ],
  },
  reportBrandingLogo: {
    id: 'reportBrandingLogo',
    requiredTier: 'pro',
    categoryKo: '화이트라벨 브랜딩',
    categoryEn: 'White-Label Branding',
    featureNameKo: '보고서 화이트라벨 브랜딩 & 로고 업로드',
    featureNameEn: 'White-Label Report Branding & Logo',
    valuePropKo:
      '고객사나 소속 기관의 로고 이미지, 보고서 제목, 발행 부서명, 포인트 컬러 및 기밀 면책 문구를 모든 보고서에 반영합니다.',
    valuePropEn:
      'Customize report titles, organization names, accent colors, footer disclaimers, and upload your own logo for client-ready deliverables.',
    highlightsKo: [
      'PNG/JPG/WEBP/GIF 기업 로고 업로드 및 A4 헤더 실시간 반영',
      '기관명·담당자·보고서 제목 및 기밀 등급 바닥글 커스터마이징',
      'PDF·HTML·Excel 출력물 전체에 일관된 브랜드 서식 적용',
    ],
    highlightsEn: [
      'Upload custom PNG/JPG/WEBP/GIF logos rendered in A4 headers',
      'Configure organization name, custom title, and disclaimer footer',
      'Consistent branding applied across PDF, HTML, and Excel outputs',
    ],
  },
  intruderGuard: {
    id: 'intruderGuard',
    requiredTier: 'pro',
    categoryKo: '실시간 침입 탐지',
    categoryEn: 'Intruder Watch Guard',
    featureNameKo: '낯선 기기 실시간 감시 & Soft Trust',
    featureNameEn: 'Intruder Watch & Soft Trust Guard',
    valuePropKo:
      '신뢰 목록에 없는 미등록 기기나 MAC 변조 단말이 네트워크에 접속하면 즉시 경보 및 데스크톱/트레이 알림을 발생시킵니다.',
    valuePropEn:
      'Continuously monitor for unrecognized devices or MAC changes and trigger immediate visual and system tray alerts.',
    highlightsKo: [
      '신규 미등록 기기 접속 시 즉시 경고 및 침입 이력 기록',
      'LAA 랜덤 MAC 전환 기기를 유사도로 판별하는 Soft Trust 유예',
      '게이트웨이 Proxy-ARP 오탐 자동 분리 및 신뢰 장치 일괄 등록',
    ],
    highlightsEn: [
      'Immediate alerts and audit logging for unrecognized network hosts',
      'Soft Trust correlation for devices rotating randomized LAA MACs',
      'Filters benign gateway Proxy-ARP responses to reduce false alarms',
    ],
  },
  multiSubnetUnlimited: {
    id: 'multiSubnetUnlimited',
    requiredTier: 'enterprise',
    categoryKo: '다중 대역 확장',
    categoryEn: 'Multi-Subnet Scale',
    featureNameKo: '무제한 다중 서브넷 관리',
    featureNameEn: 'Unlimited Multi-Subnet Management',
    valuePropKo:
      '기본 제공 2개 대역을 넘어 여러 VLAN 및 지사 서브넷 프로파일을 확장하고 통합 관리할 수 있습니다.',
    valuePropEn:
      'Expand beyond the 2-subnet Free quota to manage and monitor multiple VLANs and branch network profiles.',
    highlightsKo: [
      'Free 2개 / PRO 최대 5개 서브넷, Enterprise 무제한 대역 지원',
      '멀티 VLAN 환경 고속 전환 및 통합 모니터링',
      '대규모 사내망·데이터센터 IP 자산 전수 조사',
    ],
    highlightsEn: [
      'Supports 2 subnets in Free, 5 in PRO, and unlimited in Enterprise',
      'Rapid profile switching across multi-VLAN environments',
      'Designed for campus, enterprise, and data-center IP audits',
    ],
  },
  multiSubnetBatchSweep: {
    id: 'multiSubnetBatchSweep',
    requiredTier: 'pro',
    categoryKo: '다중 대역 일괄 관제',
    categoryEn: 'Multi-Subnet Batch Sweep',
    featureNameKo: '다중 서브넷 순차 일괄 스캔 & 통합 이상 징후 대시보드',
    featureNameEn: 'Multi-Subnet Batch Sweep & Unified Anomaly Dashboard',
    valuePropKo:
      '등록된 모든 서브넷 및 VLAN 프로파일을 원클릭으로 순차 일괄 스캔하고 전체 대역의 IP 충돌·침입 의심 노드를 단일 대시보드에서 통합 관제합니다.',
    valuePropEn:
      'Sequentially sweep all registered subnets and VLANs in one click and triage cross-subnet conflicts and anomalies in a unified dashboard.',
    highlightsKo: [
      '등록 대역 전체 무인 순차 스캔 큐 (PRO 5개 / ENT 무제한)',
      '전 서브넷 합산 Active · IP 충돌 · Proxy-ARP · 침입 의심 KPI 집계',
      '대역별 스캔 캐시 즉시 전환 및 원클릭 장애 대역 포커스',
    ],
    highlightsEn: [
      'Unattended sequential sweep queue across all registered subnets',
      'Aggregated Active, Conflict, Proxy-ARP, and Intruder KPIs across VLANs',
      'Instant cached grid switching with one-click drill-down',
    ],
  },
  topologySecurityPro: {
    id: 'topologySecurityPro',
    requiredTier: 'pro',
    categoryKo: '토폴로지 보안 상관분석',
    categoryEn: 'Topology Security Correlation',
    featureNameKo: '토폴로지 보안 상관분석 & 상시 ARP 스푸핑 가드',
    featureNameEn: 'Topology Security Correlation & Continuous ARP Spoof Guard',
    valuePropKo:
      '네이티브 토폴로지 가드(v2.6)와 L2 ARP 검증 엔진을 결합해 LAA 랜덤 MAC 유예 추적, Proxy-ARP 분리, 실시간 ARP 스푸핑 연속 감시를 수행합니다.',
    valuePropEn:
      'Combine native Topology Guard with L2 ARP verification for LAA MAC identity tracking, Proxy-ARP isolation, and continuous ARP spoof guarding.',
    highlightsKo: [
      '네이티브 C DLL 기반 IP-MAC 충돌 & Gateway 상관분석 오버레이',
      '단일 호스트 상시 패킷/ARP 스푸핑 무결성 연속 모니터링',
      'Soft-Trust 유사도 점수 및 토폴로지 위협 필터 자동 강조',
    ],
    highlightsEn: [
      'Native C DLL correlation overlay for IP-MAC conflicts and Gateway paths',
      'Continuous L2 ARP spoofing & packet integrity guard',
      'Soft-Trust similarity correlation with topology threat highlighting',
    ],
  },
};

function renderFeatureIcon(id: ProLockedFeatureId, className: string) {
  switch (id) {
    case 'remoteBootWoL':
      return <Power className={className} />;
    case 'deepPortAudit':
      return <ShieldAlert className={className} />;
    case 'autoScheduler':
      return <Clock className={className} />;
    case 'autoReportArchive':
      return <Archive className={className} />;
    case 'snapshotDiff':
    case 'reportDiffCompare':
      return <GitCompare className={className} />;
    case 'reportAuditExport':
      return <FileText className={className} />;
    case 'reportExcelFullWorkbook':
      return <FileSpreadsheet className={className} />;
    case 'reportBrandingLogo':
      return <Palette className={className} />;
    case 'intruderGuard':
      return <BellRing className={className} />;
    case 'multiSubnetUnlimited':
      return <Network className={className} />;
    case 'multiSubnetBatchSweep':
      return <Layers className={className} />;
    case 'topologySecurityPro':
      return <ShieldAlert className={className} />;
  }
}

interface ProFeatureLockedModalProps {
  isOpen: boolean;
  featureId: ProLockedFeatureId | null;
  customContext?: string;
  currentTier: LicenseInfo['tier'];
  theme: 'dark' | 'gray' | 'white' | 'beige';
  lang: 'ko' | 'en';
  onClose: () => void;
  onActivatePro: () => void;
}

export const ProFeatureLockedModal: React.FC<ProFeatureLockedModalProps> = ({
  isOpen,
  featureId,
  customContext,
  currentTier,
  theme,
  lang,
  onClose,
  onActivatePro,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !featureId) return null;

  const spec = PRO_FEATURE_LOCK_CATALOG[featureId];
  const isKo = lang === 'ko';
  const isLight = theme === 'white' || theme === 'beige';

  const surfaceCls =
    theme === 'beige'
      ? 'bg-[#fcf8f2] text-[#4a3723] border-[#dcc7a1]'
      : theme === 'white'
      ? 'bg-white text-slate-900 border-slate-200'
      : theme === 'gray'
      ? 'bg-zinc-900 text-zinc-100 border-zinc-700'
      : 'bg-slate-900 text-slate-100 border-slate-800';

  const hairlineBorderCls =
    theme === 'beige'
      ? 'border-[#e6d5b8]'
      : theme === 'white'
      ? 'border-slate-200'
      : theme === 'gray'
      ? 'border-zinc-800'
      : 'border-slate-800';

  const subtlePanelBgCls =
    theme === 'beige'
      ? 'bg-[#f6ede0]'
      : theme === 'white'
      ? 'bg-slate-50'
      : theme === 'gray'
      ? 'bg-zinc-950/60'
      : 'bg-slate-950/60';

  const mutedTextCls =
    theme === 'beige'
      ? 'text-[#7c6244]'
      : theme === 'white'
      ? 'text-slate-600'
      : 'text-slate-400';

  const secondaryBtnCls =
    theme === 'beige'
      ? 'border-[#d6be96] text-[#5c4a37] hover:bg-[#f2e4ce]'
      : theme === 'white'
      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
      : 'border-slate-700 text-slate-300 hover:bg-slate-800';

  const currentTierLabel =
    currentTier === 'enterprise'
      ? 'Enterprise'
      : currentTier === 'pro'
      ? 'PRO'
      : isKo
      ? 'Free (커뮤니티)'
      : 'Free (Community)';

  const requiredTierLabel =
    spec.requiredTier === 'enterprise' ? 'Enterprise' : 'PRO Edition';

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-locked-modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${surfaceCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${hairlineBorderCls} flex items-start justify-between gap-4`}>
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {renderFeatureIcon(spec.id, 'w-5 h-5')}
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-medium flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                <Lock className="w-3 h-3 shrink-0" />
                <span>{isKo ? spec.categoryKo : spec.categoryEn}</span>
                <span aria-hidden="true">·</span>
                <span>{isKo ? `${requiredTierLabel} 전용` : `${requiredTierLabel} Required`}</span>
              </div>
              <h2
                id="pro-locked-modal-title"
                className="text-base font-bold leading-snug tracking-tight mt-1 text-balance"
              >
                {isKo ? spec.featureNameKo : spec.featureNameEn}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isKo ? '닫기' : 'Close'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${mutedTextCls} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <p className={`text-[13px] leading-relaxed ${mutedTextCls}`}>
              {isKo ? spec.valuePropKo : spec.valuePropEn}
            </p>
            {customContext && (
              <div className={`text-xs font-mono tabular-nums ${mutedTextCls}`}>
                {isKo ? '요청 대상: ' : 'Target: '}
                <span className={isLight ? 'text-slate-900 font-semibold' : 'text-slate-200 font-semibold'}>
                  {customContext}
                </span>
              </div>
            )}
          </div>

          {/* Single-elevation hairline highlight list */}
          <div className={`rounded-lg border ${hairlineBorderCls} ${subtlePanelBgCls} divide-y ${hairlineBorderCls}`}>
            {(isKo ? spec.highlightsKo : spec.highlightsEn).map((line, idx) => (
              <div key={idx} className="px-3.5 py-2.5 flex items-start gap-2.5 text-xs leading-relaxed">
                <Check
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    isLight ? 'text-emerald-600' : 'text-emerald-400'
                  }`}
                />
                <span>{line}</span>
              </div>
            ))}
          </div>

          {/* Concise unboxed license comparison metadata */}
          <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums ${mutedTextCls}`}>
            <span>
              {isKo ? '현재 등급: ' : 'Current: '}
              <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{currentTierLabel}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isKo ? '해금 조건: ' : 'Requires: '}
              <strong className={isLight ? 'text-amber-700' : 'text-amber-400'}>{requiredTierLabel}</strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${hairlineBorderCls} flex items-center justify-end gap-2.5`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${secondaryBtnCls}`}
          >
            {isKo ? '닫기' : 'Maybe Later'}
          </button>
          <button
            type="button"
            onClick={onActivatePro}
            className={`px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
              theme === 'beige'
                ? 'focus-visible:ring-offset-[#fcf8f2]'
                : theme === 'white'
                ? 'focus-visible:ring-offset-white'
                : 'focus-visible:ring-offset-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span>
              {spec.requiredTier === 'enterprise'
                ? isKo
                  ? 'Enterprise 활성화'
                  : 'Activate Enterprise'
                : isKo
                ? 'PRO 활성화'
                : 'Activate Pro'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
