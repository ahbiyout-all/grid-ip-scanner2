
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Activity, RefreshCw, X, Database, ShieldCheck, Wifi, Globe, Cpu, Box, Sun, Moon, Square, Zap, HardDrive, Info, AlertCircle, Terminal, MapPin, Cloud, CheckCircle2, Monitor, RotateCcw, ExternalLink, Download, CloudDownload, HelpCircle, Mail, Key, Sparkles, Layers, FileText, FileDown, BookmarkPlus, ArrowRightLeft, ShieldAlert, Package, Check, Network, Filter, Copy, Cable, Shield, Sliders, Github, Trash2, Camera, Power, Edit3, Tag, Bell, BellRing, AlertTriangle, Folder, Flame, ChevronDown, Clock, Calendar, Smartphone, ArrowRight, Move, Maximize2, Settings } from 'lucide-react';
import { IPStatus, DeviceInfo, ScanResult, NetworkConfig, InterfaceInfo, LicenseInfo, ScanSnapshot, PortAuditItem, PortScanResult, DiffStatus, DiffItem, DeviceAlias, RemoteActionType, ScanSchedule, ScheduledScanRunRecord } from './types';
import IPCell from './components/IPCell';
import { getStoredLicense, activateLicenseKey, clearLicense, getTrialHistory } from './services/licenseManager';
import { getSavedSnapshots, saveSnapshot, deleteSnapshot, computeSnapshotDiff } from './services/diffEngine';
import { runDeepPortAudit } from './services/portScanner';
import { generateProfessionalAuditReport, exportSecurityAuditReportToPDF, exportDeviceListToPDF } from './services/reportGenerator';
import { UpdateModal } from './components/UpdateModal';
import { SnapshotDiffModal } from './components/SnapshotDiffModal';
import { ScheduleModal } from './components/ScheduleModal';
import { NativeModulesModal } from './components/NativeModulesModal';
import { fetchNativeModulesStatus, getClientLocalIP, executeWindowsUtility } from './services/nativeModulesService';
import { NativeModulesStatus } from './types';
import { checkGitHubRelease, UpdateInfo, CURRENT_APP_VERSION, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from './services/updateChecker';
import { executeRemoteAction } from './services/remoteActionService';
import { sendWakeOnLanPacket } from './services/wolService';
import { getStoredAliases, saveDeviceAlias, removeDeviceAlias, getDeviceAlias, normalizeMacKey } from './services/deviceAliasManager';
import { analyzeNetworkConflicts, findNewIntruderDevices, ConflictInfo } from './services/conflictDetector';
import { getSchedules, recordScheduleRunCompletion, addHistoryRecord } from './services/schedulerService';
import { TrayStatusIndicator } from './components/TrayStatusIndicator';
import { IntruderLogModal } from './components/IntruderLogModal';
import { recordIntrudersFromDetection, getIntruderLogs } from './services/intruderLogService';
import { classifyDeviceHybrid, ClassificationEvidence, OUIBlockType } from './services/ouiClassifier';

export interface DeviceClassificationContext {
  ip?: string;
  hostname?: string;
  mdns?: string;
  webTitle?: string;
  upnp?: string;
  snmp?: string;
  mac?: string;
  httpHeaders?: string;
  realVendor?: string;
  chipsetVendor?: string;
  vendorSource?: string;
  ouiBlockType?: string;
  ouiPrefix?: string;
  isRandomizedMac?: boolean;
  lang?: 'ko' | 'en';
}

export interface DeviceClassification {
  type: string;
  os: string;
  model?: string;
  deviceCategory?: string;
  realVendor?: string;
  chipsetVendor?: string;
  vendorSource?: string;
  realVendorConfidence?: number;
  chipsetConfidence?: number;
  confidenceScore?: number;
  priorityRank?: number;
  ouiBlockType?: OUIBlockType | string;
  ouiPrefix?: string;
  isRandomizedMac?: boolean;
  isChipsetOem?: boolean;
  classificationReasons?: ClassificationEvidence[];
}

const classifyDevice = (
  vendor: string,
  openPorts: number[] = [],
  s: any,
  context?: DeviceClassificationContext
): DeviceClassification => {
  return classifyDeviceHybrid(vendor, openPorts, s, context);
};

const translations = {
  ko: {
    lang: "ko",
    hostPcInfo: "현재 PC 정보",
    computerName: "컴퓨터 이름",
    title: "GRID IP 스캐너2",
    adminMode: "관리자 모드 활성화",
    standardMode: "일반 모드 (권한 제한됨)",
    deepScan: "정밀 스캔",
    deepScanDesc: "포트 스캔을 포함하여 상세 정보를 수집합니다. 네트워크 환경에 따라 실제 장치가 아닌 '유령 노드'가 탐지될 수 있습니다.",
    scanDelay: "스캔 지연",
    timeout: "타임아웃",
    precisionMode: "정밀 모드",
    speedMode: "고속 모드",
    precisionDesc: "* 느리지만 꼼꼼하게 스캔합니다. (재시도 적용)",
    speedDesc: "* 빠르게 스캔합니다. 네트워크 부하가 발생할 수 있습니다.",
    interface: "인터페이스",
    subnet: "서브넷",
    start: "시작",
    end: "종료",
    stopScan: "스캔 중지",
    startScan: "그리드 스캔 시작",
    restartScan: "다시 스캔 시작",
    keepResults: "기존 결과 유지 (중첩 갱신)",
    author: "제작자",
    website: "웹사이트",
    blog: "블로그",
    github: "깃허브",
    securityNotice: "보안 공지",
    ouiDb: "OUI DB",
    records: "제조사 수",
    active: "활성",
    all: "전체",
    summary: "요약",
    found: "발견됨",
    history: "히스토리",
    searchPlaceholder: "IP, 제조사, 호스트명 검색...",
    scanning: "스캔 중...",
    complete: "완료",
    deviceProfile: "장치 프로필",
    profileFontScaleNormal: "글자 보통",
    profileFontScaleLarge: "글자 확대",
    profileFontScaleTooltip: "장치 프로필 글자 크기 전환 (보통 100% / 확대 115%)",
    networkIdentity: "네트워크 식별",
    technicalDetails: "기술 세부 정보",
    address: "주소",
    copyIpAddress: "IP 주소 복사",
    ipAddressCopied: "IP 주소가 클립보드에 복사되었습니다.",
    macInfo: "MAC 정보",
    vendor: "제조사",
    os: "운영체제",
    listeningPorts: "대기 포트",
    selectNode: "정보를 보려면 노드 선택",
    ouiMasterDb: "OUI 마스터 데이터베이스",
    activeSource: "활성 소스",
    ouiCapacity: "OUI 용량",
    vendors: "제조사",
    referenceData: "참조 데이터",
    done: "확인",
    securityNoticeTitle: "보안 및 안전 공지 (백신 오탐지 안내)",
    falsePositiveTitle: "백신 오탐지 안내 (AhnLab V3 · Windows Defender)",
    falsePositiveDesc: "본 프로그램은 초고속 서브넷 IP/포트 스캔을 수행하는 순수 네트워크 진단 유틸리티입니다. 짧은 시간 내 다수의 패킷을 전송하는 네트워크 스캔 특성 및 신규 빌드 바이너리로 인해 안랩 V3(Trojan/Win.Generic.C* 가진단) 또는 Windows Defender에서 '정찰 활동'으로 오해하여 오탐지(차단/격리)될 수 있습니다.",
    safeTool: "100% 안전한 진단 도구",
    safeToolDesc: "개인정보 탈취, 시스템 파괴, 백도어 등의 악성 행위가 일절 없는 IEEE 공인 9만건 OUI 기반 순수 네트워크 분석 소프트웨어입니다.",
    detectionReason: "안랩 V3 등 백신 오탐 원인",
    detectionReasonDesc: "AhnLab Smart Defense(ASD) 클라우드 평판 시스템에 아직 등록되지 않은 신규 바이너리가 대량 소켓 통신을 수행할 때 발생하는 전형적인 휴리스틱(Heuristic) 가진단 현상입니다.",
    solution: "해결 및 예외 등록 방법",
    solutionDesc: "V3 환경설정 > '검사 예외 설정'에 설치 폴더 또는 실행 파일(Grid_IP_Scanner2.exe)을 등록하시거나, 격리소에서 '복원 및 예외 처리'를 선택하시면 정상 실행됩니다.",
    understand: "확인 및 계속 사용",
    exportActive: "응답한 IP 저장",
    exportAll: "전체 스캔 결과 저장",
    exportGrid: "그리드 내보내기",
    exportExcelGrid: "엑셀 그리드 내보내기",
    noData: "내보낼 데이터가 없습니다.",
    ouiUpdateSuccess: "OUI 데이터베이스가 성공적으로 업데이트되었습니다.",
    ouiUpdateFail: "업데이트 실패: 서버 또는 데이터 파싱 오류",
    ouiNetworkError: "외부망 통신 실패: 인터넷 연결 또는 방화벽 설정을 확인해주세요.",
    ouiDownloading: "OUI 데이터(IEEE & Wireshark) 다운로드 및 검증 중...",
    ouiReady: "준비됨 (오프라인 내장)",
    ouiCacheActive: "최신 캐시 적용됨",
    ouiStatusOffline: "연결 끊김",
    ouiLocationLabel: "OUI DB 저장 경로",
    ouiSourceLabel: "데이터 소스",
    online: "온라인",
    offline: "오프라인",
    syncing: "동기화 중...",
    updateSuccess: "업데이트가 성공적으로 완료되었습니다.",
    updateError: "업데이트 중 오류가 발생했습니다.",
    scanModeLabel: "스캔 모드 (Scan Mode)",
    scanFast: "고속",
    scanStandard: "표준",
    scanPrecision: "정밀",
    scanFastDesc: "가장 빠른 속도로 스캔합니다. 방화벽이 없는 일반적인 내부망에 적합합니다. (지연 없음, 타임아웃 500ms)",
    scanStandardDesc: "속도와 정확도의 균형을 맞춥니다. 대부분의 네트워크 환경에 권장됩니다. (지연 10ms, 타임아웃 1000ms)",
    scanPrecisionDesc: "속도는 느리지만 방화벽을 우회하거나 응답이 느린 기기를 찾을 때 유용합니다. (지연 50ms, 타임아웃 2000ms)",
    ipAddress: "IP 주소",
    subnetTarget: "서브넷 타겟",
    version: "버전",
    autoUpdateIeee: "IEEE에서 자동 업데이트",
    uploadLocalOui: "로컬 OUI 파일 업로드",
    scanLimited: "일부 스캔 기능(MAC 주소 수집 등)이 제한될 수 있습니다. 전체 기능을 사용하려면 관리자 권한으로 실행하세요.",
    scanLimitedRelaunch: "일반 모드로 실행 중입니다. 클릭하면 관리자 권한으로 재시작합니다.",
    relaunchNotice: "관리자 권한으로 재실행 중입니다. Windows 사용자 계정 컨트롤(UAC) 창을 승인해주세요...",
    resetState: "스캔 상태 초기화",
    resetBtn: "초기화",
    stateResetComplete: "스캔 상태가 초기화되었습니다.",
    sortBy: "정렬 기준",
    sortByIp: "IP 주소",
    sortByStatus: "상태 (활성 우선)",
    sortByName: "이름 (제조사/호스트명)",
    ouiDescription1: "본 스캐너는 IEEE 공식 OUI 레지스트리 및 Wireshark Manuf OUI Database (최신 90,168건)를 기반으로 하드웨어 제조사를 식별합니다. 최신 다중 비트 마스크(/28 MA-M, /36 MA-S, 24비트 MA-L)를 완벽 지원하여 오프라인 폐쇄망 환경에서도 1ms 미만의 초고속으로 정확한 제조사를 판별합니다.",
    ouiDescription2: "IEEE & Wireshark OUI Master Database",
    ouiDescription3: "",
    deviceTypes: {
      printer: "네트워크 프린터",
      windows: "Windows PC",
      linux: "리눅스/서버",
      rdp: "원격 데스크톱",
      apple: "Apple 장치",
      appleMobile: "Apple 모바일",
      macos: "Mac (macOS)",
      mobile: "모바일 장치",
      network: "네트워크 장비",
      router: "공유기 / AP",
      nas: "NAS 서버",
      iot: "IoT / 스마트홈",
      cctv: "IP 카메라 / CCTV",
      vm: "가상머신 / 컨테이너",
      media: "스마트TV / 미디어",
      console: "게임 콘솔",
      hostMachine: "현재 사용 중인 PC (Host)",
      generic: "네트워크 노드"
    },
    csv: {
      reportTitle: "Grid Scan2 보고서",
      exportDate: "내보내기 날짜",
      totalActive: "총 활성 장치"
    },
    help: "도움말",
    mobileConnect: "모바일 연결",
    mobileConnectDesc: "스마트폰 카메라 QR 코드로 원격 제어 또는 모바일 단독 앱 안내",
    helpTitle: "Grid IP Scanner2 도움말 및 안내",
    helpTabGuide: "사용 안내 & 라이선스",
    helpTabUpdate: "GitHub 업데이트 확인",
    helpLicenseTitle: "1. 이중 라이선스 고지 (Dual Licensing Notice)",
    helpLicenseDesc: "Grid IP Scanner2는 오픈소스 라이선스(GPL v3)와 상용 라이선스(Proprietary Commercial License)의 [이중 라이선스 (Dual Licensing)] 정책을 채택하여 배포됩니다.\n\n[1. 이중 라이선스 모델 안내]\n• 커뮤니티 에디션 (무상 사용): 소스코드를 공개 및 기여해야 하는 카피레프트 의무(GPL v3) 하에 무상으로 자유롭게 사용할 수 있습니다.\n• 상업용 에디션 (유료 판매): 소스코드를 독점적으로 유지한 채 독자적인 상용 라이선스를 적용하여 상업적으로 패키징하고, 유료 솔루션으로 재배포 및 판매하고자 하는 경우 상용 라이선스(Commercial License)를 취득하여 법적 제약 없이 완전한 비즈니스 권리를 누릴 수 있습니다.\n\n[2. 법적 안전성 및 오픈소스 준수]\n• 본 프로그램의 독창적인 UI, 자체 고안된 네트워크 탐색 파이프라인 및 코어 기능은 개발자(AhBiYout)에게 독점적 저작권이 귀속됩니다.\n• 앱의 하부 구조를 이루는 오픈소스 라이브러리(React, Lucide React, Go runtime 등)는 허용형 라이선스(MIT License)를 준수합니다. MIT 라이선스는 상업적 재배포, 서브라이선스 발행 및 유료 판매권을 완전히 보장하므로, 향후 이를 패키징하여 상용 소프트웨어로 유료 판매하더라도 법적으로 어떠한 분쟁이나 문제가 발생하지 않는 완전무결한 법적 효력을 갖습니다.\n\n[3. 하드웨어 OUI 데이터베이스 귀속 및 엔진]\n• 하드웨어 제조사 매핑 데이터는 IEEE 공식 OUI 레지스트리(MA-L/M/S), Wireshark Manuf Automated Database 및 Ringmast4r OUI Master Database(MIT)를 기반으로 가공된 최신 90,168개 이상의 엔트리를 탑재하고 있습니다. 다중 비트 마스크(/28, /36) 및 24비트 OUI를 완벽 지원하며, 이중 미러링(Tiered Fallback)을 통해 상업용 패키징 유료 판매 과정에서 특허나 라이선스 충돌 요소가 일체 없습니다.\n\n[4. 보증의 부인 및 책임 제한 (Standard Disclaimer)]\n• 본 소프트웨어는 일체의 명시적 또는 묵시적 보증 없이 '있는 그대로(AS IS)' 제공됩니다. 저작권자는 본 프로그램의 사용 또는 탐색 결과로 인해 발생하는 어떠한 직·간접적 손해에 대해서도 법적 책임을 지지 않습니다.",
    helpUsageTitle: "2. 간단한 사용법 (Quick Guide)",
    helpUsageDesc: "• 인터페이스 선택: 왼쪽 설정 패널에서 스캔할 네트워크 인터페이스(이더넷, Wi-Fi 등)를 선택합니다.\n• 스캔 범위 설정: 서브넷 내에서 스캔을 진행할 시작 IP와 종료 IP 범위를 설정합니다.\n• 스캔 모드 조절: 환경에 맞춰 고속, 표준, 정밀 모드 중 하나를 선택합니다. 정밀 모드는 느리지만 더욱 정확하게 기기를 탐색할 수 있습니다.\n• 실시간 그리드 탐색: 스캔이 시작되면 그리드 셀(IPCell)이 실시간으로 상태를 반영합니다. 활성화된 녹색 셀을 클릭하여 세부 프로필(제조사, 열린 포트 목록, OS 식별 정보 등)을 확인할 수 있습니다.\n• 관리자 권한 활성화: MAC 주소 추출 및 더욱 정교한 OUI 하드웨어 식별을 활성화하기 위해 상단의 주황색 '일반 모드' 배지를 클릭하고, UAC(사용자 계정 컨트롤) 승인을 통해 관리자 권한으로 앱을 다시 시작하십시오.",
    creatorContact: "GitHub 저장소 및 이슈 문의 (GitHub & Issues)",
    creatorEmail: "GitHub Issues 문의",
    diffMode: "스냅샷 비교 (Diff)",
    gridMode: "그리드 뷰",
    saveSnapshot: "현재 스냅샷 저장",
    snapshotSaved: "현재 스캔 스냅샷이 저장되었습니다.",
    baselineSelect: "비교 기준 스냅샷 선택",
    noSnapshots: "저장된 스냅샷이 없습니다. 먼저 스캔 후 스냅샷을 저장하세요.",
    diffSummaryTitle: "스냅샷 비교 진단 요약",
    diffNewBadge: "신규 단말",
    diffGoneBadge: "오프라인 전환",
    diffChangedBadge: "장비 변경 (주의)",
    diffSameBadge: "기준 유지 (동일)",
    diffGuideBtn: "스냅샷 비교 사용법",
    diffSaveNewBtn: "📸 현재 상태 스냅샷 저장 (기준점 캡처)",
    diffDeleteBtn: "삭제",
    diffEmptyTitle: "저장된 비교 기준 스냅샷이 없습니다.",
    diffEmptyDesc: "네트워크가 정상일 때 스캔 후 [📸 현재 상태 스냅샷 저장]을 누르면 기준점이 생성됩니다. 이후 다시 스캔할 때 새로운 침입 기기나 꺼진 장비를 색상으로 자동 감지합니다.",
    deepPortAuditBtn: "심층 포트 정밀 진단 (Pro)",
    deepPortAuditing: "포트 정밀 분석 중...",
    deepPortAuditComplete: "심층 포트 분석 완료",
    exportAuditReportBtn: "보안 감사 보고서 (HTML/인쇄)",
    exportHubTitle: "내보내기 및 리포트",
    exportDropdownTitle: "내보내기 및 리포트",
    exportDropdownSubtitle: "PDF • Excel • CSV • HTML",
    exportSectionPdf: "고품질 PDF 문서 리포트",
    exportSectionData: "스프레드시트 및 원시 데이터",
    exportSectionWeb: "웹 대화형 및 보안 감사",
    exportSectionSnapshot: "네트워크 스냅샷",
    exportOpenModal: "PDF 리포트 센터 (모달 마법사)...",
    exportExcelXls: "Excel 스프레드시트 (.xls 그리드)",
    exportCsvActive: "CSV 내보내기 (온라인 활성 장비)",
    exportCsvAll: "CSV 내보내기 (전체 스캔 대역)",
    exportHtmlGrid: "인터랙티브 웹 HTML 그리드",
    exportHtmlAudit: "보안 감사 보고서 (HTML 즉시 인쇄)",
    exportSaveSnapshot: "현재 상태 스냅샷 저장 (기준점)",
    exportPdfHubBtn: "PDF 리포트 내보내기",
    exportPdfSearch: "현재 검색 결과 PDF",
    exportPdfActive: "온라인 활성 장비 PDF",
    exportPdfAudit: "정밀 보안 감사 보고서 PDF",
    exportPdfAll: "전체 스캔 대역 PDF",
    exportGeneratingPdf: "고해상도 PDF 문서를 생성하는 중입니다...",
    exportPdfSuccess: "PDF 문서가 성공적으로 다운로드되었습니다.",
    exportPdfModalTitle: "PDF 리포트 내보내기 센터",
    exportPdfModalDesc: "검색 결과, 활성 장비, 보안 감사 결과를 고품질 PDF 문서로 출력 및 저장합니다.",
    licenseManage: "라이선스 관리",
    licenseTitle: "Grid IP Scanner2 에디션 & 라이선스",
    licenseKeyPlaceholder: "라이선스 키 입력 (예: GRID-PRO-TRIAL-2026 / 30일 데모)",
    activateBtn: "라이선스 정품 인증",
    currentTier: "현재 에디션",
    licenseStatus: "라이선스 상태",
    installerDownloadBtn: "Windows 정식 인스톨러 배포 안내",
    networkAdapters: "네트워크 어댑터 탐색 및 필터",
    networkAdaptersDesc: "시스템의 모든 물리, 가상(VM/도커), VPN, 루프백 어댑터를 탐색하고 스캔 대역을 전환합니다.",
    allAdapters: "전체 어댑터",
    activeOnly: "활성 (UP)",
    physicalOnly: "물리 어댑터 (LAN/Wi-Fi)",
    virtualOnly: "가상 (VM/도커)",
    vpnOnly: "VPN/가상망",
    loopbackOnly: "루프백",
    withIpv4: "IPv4 할당됨",
    filterSearchPlaceholder: "어댑터 이름, IP, MAC, 서브넷 검색...",
    setAsScanTarget: "이 대역으로 스캔 설정",
    adapterDetails: "어댑터 상세 정보",
    adapterCountSummary: "총 {total}개 어댑터 감지 (활성: {active}개, 물리: {physical}개, 가상: {virtual}개)",
    noMatchingAdapters: "선택한 필터 조건에 일치하는 네트워크 어댑터가 없습니다.",
    statusUp: "연결됨 (UP)",
    statusDown: "연결 해제 / 비활성",
    typePhysical: "물리 어댑터 (Physical)",
    typeVirtual: "가상 어댑터 (Virtual)",
    typeLoopback: "루프백 (Loopback)",
    typeVpn: "VPN 가상망",
    typeOther: "기타 어댑터",
    flagsLabel: "시스템 플래그",
    mtuLabel: "MTU",
    openAdapterManager: "어댑터 전체 탐색 / 필터",
    adapterSubnetNotice: "어댑터 IPv4 서브넷이 스캔 대상으로 지정되었습니다.",
    quickRemoteActions: "원클릭 빠른 원격 접속",
    remoteWeb: "웹 관리자 (HTTP)",
    remoteWebSSL: "보안 웹 (HTTPS)",
    remoteRdp: "원격 데스크톱 (mstsc)",
    remoteSsh: "SSH 터미널",
    remoteSmb: "SMB 파일 공유 (\\\\IP)",
    remotePing: "콘솔 Ping",
    remoteTraceroute: "경로 추적 (Tracert)",
    wolTitle: "원격 부팅 (Wake-on-LAN)",
    wolSendBtn: "⚡ WoL 매직 패킷 전송",
    customNickname: "사용자 지정 별칭",
    customNotes: "관리자 메모",
    editNickname: "별칭 / 메모 편집",
    saveNickname: "별칭 저장",
    deleteNickname: "별칭 삭제",
    ipConflict: "IP 충돌 의심",
    intruderWatch: "낯선 기기 감시",
    intruderDetected: "신규 낯선 기기 감지",
    trustDevice: "신뢰 기기로 등록",
    filterConflict: "⚠️ 충돌 의심",
    filterIntruder: "🚨 낯선 기기",
    filterCustomAlias: "🏷️ 별칭 지정",
    scheduler: "정기 자동 스케줄러",
    schedulerBtn: "스케줄",
    schedulerDesc: "주기적인 자동 네트워크 스캔 및 스냅샷 보관",
    checkUpdate: "업데이트 확인",
    updateAvailable: "v{version} 업데이트",
    dllHub: "DLL 허브",
    clickToExpand: "클릭하여 펼치기",
    expanded: "펼쳐짐"
  },
  en: {
    lang: "en",
    quickRemoteActions: "Quick Remote Actions",
    remoteWeb: "Web Console (HTTP)",
    remoteWebSSL: "Secure Web (HTTPS)",
    remoteRdp: "Remote Desktop (RDP)",
    remoteSsh: "SSH Terminal",
    remoteSmb: "SMB Share (\\\\IP)",
    remotePing: "Ping Console",
    remoteTraceroute: "Traceroute Console",
    wolTitle: "Remote Boot (Wake-on-LAN)",
    wolSendBtn: "⚡ Send WoL Magic Packet",
    customNickname: "Custom Nickname",
    customNotes: "Admin Notes",
    editNickname: "Edit Alias / Notes",
    saveNickname: "Save Alias",
    deleteNickname: "Delete Alias",
    ipConflict: "IP Conflict Suspected",
    intruderWatch: "Intruder Watch Mode",
    intruderDetected: "New Unknown Device Detected",
    trustDevice: "Trust This Device",
    filterConflict: "⚠️ Conflicts",
    filterIntruder: "🚨 Intruders",
    filterCustomAlias: "🏷️ Aliased",
    hostPcInfo: "Host PC Info",
    computerName: "Computer Name",
    title: "GRID IP Scanner2",
    adminMode: "Admin Mode Active",
    standardMode: "Standard Mode (Limited)",
    deepScan: "Deep Scan",
    deepScanDesc: "Collects detailed info including port scans. May detect 'ghost nodes' depending on network security settings.",
    scanDelay: "Scan Delay",
    timeout: "Timeout",
    precisionMode: "Precision Mode",
    speedMode: "Speed Mode",
    precisionDesc: "* Slow but thorough scan. (Retries applied)",
    speedDesc: "* Fast scan. May cause network load.",
    interface: "Interface",
    subnet: "Subnet",
    start: "Start",
    end: "End",
    stopScan: "Stop Scan",
    startScan: "Start Grid Scan",
    restartScan: "Restart Scan",
    keepResults: "Keep Previous Results",
    author: "Author",
    website: "Website",
    blog: "Blog",
    github: "GitHub",
    securityNotice: "Security Notice",
    ouiDb: "OUI DB",
    records: "Records",
    active: "Active",
    all: "All",
    summary: "Summary",
    found: "Found",
    history: "History",
    searchPlaceholder: "Search IP, Vendor, Hostname...",
    scanning: "Scanning...",
    complete: "Complete",
    deviceProfile: "Device Profile",
    profileFontScaleNormal: "Normal Text",
    profileFontScaleLarge: "Large Text",
    profileFontScaleTooltip: "Toggle device profile text size (Normal 100% / Large 115%)",
    networkIdentity: "Network Identity",
    technicalDetails: "Technical Details",
    address: "Address",
    copyIpAddress: "Copy IP Address",
    ipAddressCopied: "IP address copied to clipboard.",
    macInfo: "MAC Info",
    vendor: "Vendor",
    os: "Operating Sys",
    listeningPorts: "Listening Ports",
    selectNode: "Select Node for Info",
    ouiMasterDb: "OUI Master Database",
    activeSource: "Active Source",
    ouiCapacity: "OUI Capacity",
    vendors: "Vendors",
    referenceData: "Reference Data",
    done: "Done",
    securityNoticeTitle: "Security & Safety Notice (Antivirus Notice)",
    falsePositiveTitle: "Antivirus False Positive Notice (AhnLab V3 / Defender)",
    falsePositiveDesc: "Due to high-speed IP/port scanning and newly compiled binary reputation, antivirus programs like AhnLab V3 (Trojan/Win.Generic.C*) or Windows Defender may heuristically flag this tool as suspicious reconnaissance.",
    safeTool: "100% Safe Diagnostic Tool",
    safeToolDesc: "Contains zero malicious code, backdoors, or telemetry. It is a genuine network scanner using official IEEE OUI databases.",
    detectionReason: "Reason for Detection",
    detectionReasonDesc: "Unsigned or self-signed new binaries performing high-speed socket scans trigger cloud reputation (AhnLab ASD) heuristic warnings.",
    solution: "How to Resolve",
    solutionDesc: "Add the installation directory or Grid_IP_Scanner2.exe to your antivirus exclusion list, or restore the file from quarantine.",
    understand: "I Understand & Continue",
    exportActive: "Save Responding IPs",
    exportAll: "Save All Scan Results",
    exportGrid: "Export Grid",
    exportExcelGrid: "Export Excel Grid",
    noData: "No data to export.",
    ouiUpdateSuccess: "OUI database updated successfully.",
    ouiUpdateFail: "Update failed: Server or data parse error",
    ouiNetworkError: "Network communication failed. Please check your internet or firewall settings.",
    ouiDownloading: "Downloading & verifying OUI data (IEEE & Wireshark)...",
    ouiReady: "Ready (Offline Embedded)",
    ouiCacheActive: "Latest Cache Active",
    ouiStatusOffline: "Disconnected",
    ouiLocationLabel: "OUI DB Location",
    ouiSourceLabel: "Data Source",
    online: "Online",
    offline: "Offline",
    syncing: "Syncing...",
    updateSuccess: "Update completed successfully.",
    updateError: "An error occurred during update.",
    scanModeLabel: "Scan Mode",
    scanFast: "Fast",
    scanStandard: "Standard",
    scanPrecision: "Precision",
    scanFastDesc: "Scans at maximum speed. Suitable for internal networks without firewalls. (No delay, 500ms timeout)",
    scanStandardDesc: "Balances speed and accuracy. Recommended for most network environments. (10ms delay, 1000ms timeout)",
    scanPrecisionDesc: "Slow speed but useful for bypassing firewalls or finding slow-responding devices. (50ms delay, 2000ms timeout)",
    ipAddress: "IP Address",
    subnetTarget: "Subnet Target",
    version: "Version",
    autoUpdateIeee: "Auto Update from IEEE",
    uploadLocalOui: "Upload Local OUI File",
    scanLimited: "Some scan features (like MAC address collection) may be limited. Run as administrator for full functionality.",
    scanLimitedRelaunch: "Running in standard mode. Some features are limited. Click to relaunch with administrator privileges.",
    relaunchNotice: "Relaunching with Administrator privileges. Please check and approve the Windows UAC (User Account Control) prompt...",
    resetState: "Reset Scan State",
    resetBtn: "Reset",
    stateResetComplete: "Scan state has been reset.",
    sortBy: "Sort By",
    sortByIp: "IP Address",
    sortByStatus: "Status (Active First)",
    sortByName: "Name (Vendor/Hostname)",
    ouiDescription1: "This scanner references the official IEEE OUI registry and the Wireshark Manuf OUI Database (90,168+ entries) to identify hardware vendors. It features built-in multi-bit mask support (/28 MA-M, /36 MA-S, 24-bit MA-L) and operates completely offline with ultra-fast 1ms lookup speed.",
    ouiDescription2: "IEEE & Wireshark OUI Master Database",
    ouiDescription3: "",
    deviceTypes: {
      printer: "Network Printer",
      windows: "Windows PC",
      linux: "Linux/Server",
      rdp: "Remote Desktop",
      apple: "Apple Device",
      appleMobile: "Apple Mobile",
      macos: "Mac (macOS)",
      mobile: "Mobile Device",
      network: "Network Equipment",
      router: "Router / AP",
      nas: "NAS Server",
      iot: "IoT / Smart Home",
      cctv: "IP Camera / CCTV",
      vm: "Virtual Machine / Container",
      media: "Smart TV / Media",
      console: "Game Console",
      hostMachine: "Current Host PC",
      generic: "Network Node"
    },
    csv: {
      reportTitle: "Grid Scan2 Report",
      exportDate: "Export Date",
      totalActive: "Total Active"
    },
    help: "Help",
    mobileConnect: "Mobile Connect",
    mobileConnectDesc: "Remote control via Smartphone QR Code or Mobile Standalone App Guide",
    helpTitle: "Grid IP Scanner2 Help & Documentation",
    helpTabGuide: "User Guide & License",
    helpTabUpdate: "GitHub Updates",
    helpLicenseTitle: "1. Dual Licensing Notice",
    helpLicenseDesc: "Grid IP Scanner2 is distributed under a [Dual Licensing] scheme, offering both an Open Source License (GPL v3) and a Proprietary Commercial License.\n\n[1. Dual Licensing Model]\n• Community Edition (Free Use): If you use, modify, and distribute the software for personal or open-source projects under the copyleft obligation of sharing your derivative source code under the same terms, the GNU GPL v3 license applies, allowing free usage.\n• Commercial Edition (Paid/Proprietary): If you wish to package, rename, distribute, or sell Grid IP Scanner2 as a proprietary commercial solution without any obligation to disclose your source code, you can obtain a \"Proprietary Commercial License.\" This legally guarantees your right to monetize, lease, and sell the software as a paid proprietary solution.\n\n[2. Legal Security & Upstream Compliance]\n• The user interface, proprietary scanning logic, and specialized pipeline are fully owned by the developer (AhBiYout), granting complete legal authority for commercialization.\n• Underlying third-party libraries (such as React, Lucide React, Go runtime, etc.) are licensed under the highly permissive MIT License. The MIT License explicitly and fully permits sublicensing, modification, commercial distribution, and paid resale. Therefore, integrating these components into a commercial package is 100% compliant and legally secure.\n\n[3. OUI Database Compliance & Engine]\n• The hardware vendor OUI database is processed and derived from the official IEEE OUI registry (MA-L/M/S), Wireshark Automated Manuf Database, and Ringmast4r OUI Master Database (MIT License), featuring 90,168+ entries. All multi-bit masks (/28, /36) and 24-bit OUIs are supported with robust tiered fallback mirroring, ensuring total compliance and zero legal conflict.\n\n[4. Standard Disclaimer of Warranty & Liability]\n• THIS SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM OR IN CONNECTION WITH THE SOFTWARE OR ITS USE.",
    helpUsageTitle: "2. Quick Guide",
    helpUsageDesc: "• Select Interface: In the left settings panel, select the network adapter/interface (Ethernet, Wi-Fi, etc.) to scan.\n• Configure Scan Range: Set the start and end IP address offsets in the selected subnet.\n• Choose Scan Mode: Select Fast, Standard, or Precision depending on your network conditions. Precision mode is slower but searches with much higher accuracy.\n• Real-Time Grid Nodes: The scanning progress is shown on the IPCell grid in real-time. Click any active (green) cell to view detailed node information (vendor, open ports, OS profiling) in the right sidebar.\n• Admin Elevation: To unlock full scanning features (including local MAC collection and OUI hardware matching), click the orange 'Standard Mode' badge at the top to elevate and restart with Administrator privileges.",
    creatorContact: "GitHub Repository & Issues Inquiry",
    creatorEmail: "GitHub Issues Inquiry",
    diffMode: "Snapshot Diff",
    gridMode: "Grid View",
    saveSnapshot: "Save Snapshot",
    snapshotSaved: "Current scan snapshot saved successfully.",
    baselineSelect: "Select Baseline Snapshot",
    noSnapshots: "No snapshots saved yet. Run a scan and save snapshot first.",
    diffSummaryTitle: "Snapshot Diff Analysis Summary",
    diffNewBadge: "New Devices",
    diffGoneBadge: "Went Offline",
    diffChangedBadge: "Modified (Alert)",
    diffSameBadge: "Baseline Preserved",
    diffGuideBtn: "How to use Snapshot Diff",
    diffSaveNewBtn: "📸 Capture Current State as Snapshot",
    diffDeleteBtn: "Delete",
    diffEmptyTitle: "No Baseline Snapshot Saved",
    diffEmptyDesc: "Scan your network when normal and click [📸 Capture Snapshot] to set a baseline. When you scan again, new rogue devices or offline nodes will be auto-highlighted.",
    deepPortAuditBtn: "Deep Port Security Audit (Pro)",
    deepPortAuditing: "Auditing ports...",
    deepPortAuditComplete: "Port audit completed",
    exportAuditReportBtn: "Security Audit Report (HTML/Print)",
    exportHubTitle: "Export & Reports",
    exportDropdownTitle: "Export & Reports",
    exportDropdownSubtitle: "PDF • Excel • CSV • HTML",
    exportSectionPdf: "High-Resolution PDF Reports",
    exportSectionData: "Spreadsheet & Raw Data",
    exportSectionWeb: "Web Interactive & Audit",
    exportSectionSnapshot: "Network Snapshot",
    exportOpenModal: "PDF Report Center (Open Wizard)...",
    exportExcelXls: "Excel Spreadsheet (.xls Grid)",
    exportCsvActive: "CSV Export (Online Active Devices)",
    exportCsvAll: "CSV Export (All Scanned Targets)",
    exportHtmlGrid: "Interactive Web HTML Grid",
    exportHtmlAudit: "Security Audit Report (HTML/Print)",
    exportSaveSnapshot: "Capture Current State as Snapshot",
    exportPdfHubBtn: "Export PDF Reports",
    exportPdfSearch: "Search Results PDF",
    exportPdfActive: "Active Devices PDF",
    exportPdfAudit: "Deep Security Audit PDF",
    exportPdfAll: "All Scanned Targets PDF",
    exportGeneratingPdf: "Generating professional PDF document...",
    exportPdfSuccess: "PDF document downloaded successfully.",
    exportPdfModalTitle: "PDF Report Export Center",
    exportPdfModalDesc: "Export search findings, active inventories, and security audit reports into high-resolution PDF documents.",
    licenseManage: "License Manager",
    licenseTitle: "Grid IP Scanner2 Edition & License",
    licenseKeyPlaceholder: "Enter License Key (e.g. GRID-PRO-TRIAL-2026 / 30-Day Demo)",
    activateBtn: "Activate License",
    currentTier: "Current Tier",
    licenseStatus: "License Status",
    installerDownloadBtn: "Windows Official Installer Guide",
    networkAdapters: "Network Adapters & Filter",
    networkAdaptersDesc: "Inspect all physical, virtual (VM/Docker), VPN, and loopback adapters and select scan subnet target.",
    allAdapters: "All Adapters",
    activeOnly: "Active (UP)",
    physicalOnly: "Physical (LAN/Wi-Fi)",
    virtualOnly: "Virtual (VM/Docker)",
    vpnOnly: "VPN / Tunnel",
    loopbackOnly: "Loopback",
    withIpv4: "Has IPv4",
    filterSearchPlaceholder: "Search adapter name, IP, MAC, subnet...",
    setAsScanTarget: "Set as Scan Target",
    adapterDetails: "Adapter Details",
    adapterCountSummary: "{total} total adapters detected ({active} active, {physical} physical, {virtual} virtual)",
    noMatchingAdapters: "No adapters match the selected filter.",
    statusUp: "Connected (UP)",
    statusDown: "Disconnected (DOWN)",
    typePhysical: "Physical Adapter",
    typeVirtual: "Virtual Adapter",
    typeLoopback: "Loopback Adapter",
    typeVpn: "VPN Network",
    typeOther: "Other Adapter",
    flagsLabel: "System Flags",
    mtuLabel: "MTU",
    openAdapterManager: "Explore Adapters / Filter",
    adapterSubnetNotice: "Adapter IPv4 subnet set as scan target.",
    scheduler: "Automated Scheduler",
    schedulerBtn: "Schedule",
    schedulerDesc: "Automated recurring network scans & snapshots",
    checkUpdate: "Check Updates",
    updateAvailable: "v{version} Update",
    dllHub: "DLL Hub",
    clickToExpand: "Click to expand",
    expanded: "Expanded"
  }
};

const DEFAULT_PREVIEW_INTERFACES: InterfaceInfo[] = [
  {
    name: '이더넷 (Ethernet GbE)',
    ip: '192.168.0.24',
    ipv6: 'fe80::4a5d:3eff:fe21:99a1',
    subnet: '192.168.0',
    cidr: '192.168.0.24/24',
    mac: '00:1A:2B:3C:4D:5E',
    status: 'up',
    type: 'physical',
    mtu: 1500,
    flags: ['UP', 'BROADCAST', 'MULTICAST'],
    isDefault: true
  },
  {
    name: 'Wi-Fi 6 무선 어댑터 (WLAN)',
    ip: '172.30.1.55',
    ipv6: 'fe80::10ca:99bb:77aa:1122',
    subnet: '172.30.1',
    cidr: '172.30.1.55/24',
    mac: 'F4:D4:88:AB:CD:EF',
    status: 'up',
    type: 'physical',
    mtu: 1500,
    flags: ['UP', 'BROADCAST', 'MULTICAST'],
    isDefault: false
  },
  {
    name: 'vEthernet (WSLg / Hyper-V)',
    ip: '172.24.112.1',
    subnet: '172.24.112',
    cidr: '172.24.112.1/20',
    mac: '00:15:5D:84:9A:10',
    status: 'up',
    type: 'virtual',
    mtu: 1500,
    flags: ['UP', 'BROADCAST', 'MULTICAST'],
    isDefault: false
  },
  {
    name: 'docker0 (Bridge Container)',
    ip: '172.17.0.1',
    subnet: '172.17.0',
    cidr: '172.17.0.1/16',
    mac: '02:42:AC:11:00:01',
    status: 'up',
    type: 'virtual',
    mtu: 1500,
    flags: ['UP', 'BROADCAST', 'MULTICAST'],
    isDefault: false
  },
  {
    name: 'Tailscale / WireGuard Tunnel',
    ip: '100.85.120.4',
    subnet: '100.85.120',
    cidr: '100.85.120.4/32',
    status: 'up',
    type: 'vpn',
    mtu: 1280,
    flags: ['UP', 'POINTTOPOINT', 'MULTICAST'],
    isDefault: false
  },
  {
    name: 'Loopback Pseudo-Interface 1',
    ip: '127.0.0.1',
    ipv6: '::1',
    subnet: '127.0.0',
    cidr: '127.0.0.1/8',
    status: 'up',
    type: 'loopback',
    mtu: 65536,
    flags: ['UP', 'LOOPBACK'],
    isDefault: false
  },
  {
    name: '블루투스 개인 영역 네트워크 (Bluetooth PAN)',
    ip: '',
    subnet: '',
    mac: '00:1A:7D:DA:71:09',
    status: 'down',
    type: 'physical',
    mtu: 1500,
    flags: ['DOWN', 'BROADCAST'],
    isDefault: false
  }
];

const App: React.FC = () => {
  const [config, setConfig] = useState<NetworkConfig>({
    subnet: '192.168.0',
    start: 1,
    end: 254,
    timeout: 800 
  });
  
  const [results, setResults] = useState<Record<string, ScanResult>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [registryMeta, setRegistryMeta] = useState({ 
    status: 'loading', 
    count: 0, 
    source: 'local', 
    isSyncing: false, 
    sourceName: '',
    cachePath: '',
    databaseLocation: ''
  });
  const [theme, setTheme] = useState<'dark' | 'gray' | 'white' | 'beige'>(() => {
    try {
      const saved = localStorage.getItem('grid_app_theme');
      if (saved === 'dark' || saved === 'gray' || saved === 'white' || saved === 'beige') return saved;
    } catch {}
    return 'gray';
  });

  const cycleTheme = () => {
    setTheme(prev => {
      let next: 'dark' | 'gray' | 'white' | 'beige';
      if (prev === 'dark') next = 'gray';
      else if (prev === 'gray') next = 'white';
      else if (prev === 'white') next = 'beige';
      else next = 'dark';
      try { localStorage.setItem('grid_app_theme', next); } catch {}
      return next;
    });
  };
  const [scanningIPs, setScanningIPs] = useState<Set<string>>(new Set());
  const [goEngineAlive, setGoEngineAlive] = useState(false);
  const [localIpInfo, setLocalIpInfo] = useState<{ip: string, subnet: string, computerName?: string} | null>(null);
  const [interfaces, setInterfaces] = useState<InterfaceInfo[]>(DEFAULT_PREVIEW_INTERFACES);
  const [interfaceFilter, setInterfaceFilter] = useState<'all' | 'up' | 'physical' | 'virtual' | 'vpn' | 'has_ipv4'>('physical');
  const [interfaceSearch, setInterfaceSearch] = useState('');
  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const [showSecurityNotice, setShowSecurityNotice] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'guide' | 'update'>('guide');
  const [deepScan, setDeepScan] = useState(false);
  const [mergeResults, setMergeResults] = useState(false);
  const [scanMode, setScanMode] = useState<'fast' | 'standard' | 'precision'>('fast');
  const [scanHistory, setScanHistory] = useState<{date: string, active: number, total: number}[]>([]);
  const [hasStartedScan, setHasStartedScan] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [processedIPs, setProcessedIPs] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState<'active' | 'all'>('active');
  const [lang, setLang] = useState<'ko' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('grid_app_lang');
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (_) {
      // fallback
    }
    return 'en'; // Default to English on first launch
  });

  useEffect(() => {
    try {
      localStorage.setItem('grid_app_lang', lang);
    } catch (_) {
      // ignore
    }
  }, [lang]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorPriorityMode, setVendorPriorityMode] = useState<'real' | 'oui' | 'auto'>('auto');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [isElevating, setIsElevating] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sortMode, setSortMode] = useState<'ip' | 'status' | 'name'>('ip');

  const cycleSortMode = () => {
    setSortMode(prev => {
      if (prev === 'ip') return 'status';
      if (prev === 'status') return 'name';
      return 'ip';
    });
  };

  // Device Profile Typography Scale ('normal': 100% / 'large': 115%)
  const [profileTextScale, setProfileTextScale] = useState<'normal' | 'large'>(() => {
    try {
      return (localStorage.getItem('grid_profile_text_scale') as 'normal' | 'large') || 'normal';
    } catch {
      return 'normal';
    }
  });

  // Grid Canvas Mode: 'fit' (Fit to screen) or 'scroll' (Comfortable min 560px with 2D horizontal/vertical scrollbars)
  const [gridCanvasMode, setGridCanvasMode] = useState<'fit' | 'scroll'>(() => {
    try {
      const saved = localStorage.getItem('grid_canvas_mode');
      if (saved === 'fit' || saved === 'scroll') return saved;
      if (typeof window !== 'undefined' && (window.innerHeight <= 520 || window.innerWidth <= 640)) {
        return 'scroll';
      }
    } catch {}
    return 'fit';
  });

  const toggleGridCanvasMode = () => {
    setGridCanvasMode(prev => {
      const next = prev === 'fit' ? 'scroll' : 'fit';
      try {
        localStorage.setItem('grid_canvas_mode', next);
      } catch {}
      showToast(next === 'scroll' 
        ? (lang === 'ko' ? '가로/세로 2D 스크롤 모드 활성화 (고선명 35px+ 셀 크기 보장)' : '2D Scroll Mode Enabled (Optimal Cell Size)')
        : (lang === 'ko' ? '화면 맞춤 모드 활성화 (전체 한 화면 표시)' : 'Fit Screen Mode Enabled'));
      return next;
    });
  };

  // Mobile Top Camera Notch Offset / Safe Area Screen Height Padding (0, 16, 28, 40)
  const [mobileNotchOffset, setMobileNotchOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('grid_mobile_notch_offset');
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const handleToggleNotchOffset = (val?: number) => {
    const nextVal = val !== undefined ? val : (mobileNotchOffset === 0 ? 16 : mobileNotchOffset === 16 ? 28 : mobileNotchOffset === 28 ? 40 : 0);
    setMobileNotchOffset(nextVal);
    try {
      localStorage.setItem('grid_mobile_notch_offset', String(nextVal));
    } catch (_) {}
    showToast(lang === 'ko' ? `상단 여백(카메라 홀 피함): ${nextVal}px` : `Top Notch Margin: ${nextVal}px`);
  };

  // License Management State (Feature Flag & Entitlements)
  const [license, setLicense] = useState<LicenseInfo>(getStoredLicense());
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Snapshots & Diff Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'diff'>('grid');
  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>(getSavedSnapshots());
  const [baselineSnapshotId, setBaselineSnapshotId] = useState<string | null>(null);
  const [showDiffGuide, setShowDiffGuide] = useState(false);
  const [showDiffStudioModal, setShowDiffStudioModal] = useState(false);
  const [diffFilter, setDiffFilter] = useState<'all' | 'new' | 'offline' | 'changed' | 'same'>('all');
  const [diffBaselineColor, setDiffBaselineColor] = useState<'sky' | 'indigo' | 'teal' | 'slate'>(() => {
    try {
      const saved = localStorage.getItem('grid_diff_baseline_color');
      if (saved === 'sky' || saved === 'indigo' || saved === 'teal' || saved === 'slate') return saved;
    } catch {
      // fallback
    }
    return 'sky';
  });

  useEffect(() => {
    try {
      localStorage.setItem('grid_diff_baseline_color', diffBaselineColor);
    } catch {
      // ignore
    }
  }, [diffBaselineColor]);

  // Deep Port Audit State
  const [isAuditingPorts, setIsAuditingPorts] = useState(false);
  const [portAuditResult, setPortAuditResult] = useState<PortScanResult | null>(null);

  // GitHub Real-Time Auto-Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Feature 3: Custom Device Nicknames & Notes
  const [aliases, setAliases] = useState<Record<string, DeviceAlias>>(getStoredAliases());
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasNicknameInput, setAliasNicknameInput] = useState('');
  const [aliasNotesInput, setAliasNotesInput] = useState('');

  // Feature 5: Intruder / Unknown Device Watch Mode
  const [intruderWatchMode, setIntruderWatchMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('grid_intruder_watch_mode') === 'true';
    } catch (_) { return false; }
  });
  const [trustedDevices, setTrustedDevices] = useState<Set<string>>(() => {
    try {
      const set = new Set<string>();
      const rawTrusted = localStorage.getItem('grid_trusted_devices');
      const rawKnown = localStorage.getItem('grid_known_devices');
      if (rawTrusted) JSON.parse(rawTrusted).forEach((item: string) => set.add(item));
      if (rawKnown) JSON.parse(rawKnown).forEach((item: string) => set.add(item));
      return set;
    } catch (_) { return new Set<string>(); }
  });

  // Feature 1 & 2: Quick Remote Actions & Wake-on-LAN Action Status
  const [isExecutingRemote, setIsExecutingRemote] = useState(false);
  const [isSendingWol, setIsSendingWol] = useState(false);

  // Feature 5: Real-time Intruder Detection Timestamp & Intruder Log Modal
  const [latestIntruderTimestamp, setLatestIntruderTimestamp] = useState<string | null>(() => {
    try {
      const logs = getIntruderLogs();
      if (logs.length > 0 && logs[0].timestamp) {
        return new Date(logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch (_) {}
    return null;
  });
  const [showIntruderLogModal, setShowIntruderLogModal] = useState(false);

  // Automated Recurring Scan Scheduler State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeScheduleCount, setActiveScheduleCount] = useState<number>(() => {
    try {
      return getSchedules().filter(s => s.enabled).length;
    } catch {
      return 0;
    }
  });

  // Native DLL Modules State
  const [showNativeModal, setShowNativeModal] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeModulesStatus | null>(null);

  // Windows Native Desktop Environment Guard (strictly false on Web browser, PWA, Android, iOS)
  const isWindowsDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
    const isWin = ua.includes('win') && !isMobile;
    const isElectron = !!(window as any).electron || ua.includes('electron');
    return (isWin || isElectron) && !window.matchMedia('(display-mode: standalone)').matches;
  }, []);

  const [closeToTray, setCloseToTray] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('grid_close_to_tray');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Synchronize close-to-tray setting with Electron main process and Go backend
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.setCloseToTray) {
      (window as any).electronAPI.setCloseToTray(closeToTray);
    }
    fetch(`/api/close-to-tray?enabled=${closeToTray}`, { method: 'POST' }).catch(() => {});
  }, [closeToTray]);

  const [showWindowsUtilModal, setShowWindowsUtilModal] = useState(false);
  const [isAutoStartEnabled, setIsAutoStartEnabled] = useState(false);
  const [isWindowsServiceInstalled, setIsWindowsServiceInstalled] = useState(false);
  const [showAllClassificationReasons, setShowAllClassificationReasons] = useState(false);
  useEffect(() => {
    setShowAllClassificationReasons(false);
  }, [selectedIp]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleMinimizeToTray = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.minimizeToTray) {
      (window as any).electronAPI.minimizeToTray();
      showToast(lang === 'ko' ? '📌 백그라운드 시스템 트레이로 최소화되었습니다.' : '📌 Minimized to background system tray.');
    } else {
      // Standalone Win32 / Webview mode: notify Go engine
      fetch('/api/tray-minimize', { method: 'POST' }).catch(() => {});
      showToast(
        lang === 'ko' 
          ? '📌 시스템 트레이로 최소화되었습니다. 창을 닫아도 24/7 침입 감시가 백그라운드에서 계속 상주 가동됩니다.' 
          : '📌 Minimized to system tray. 24/7 intruder watch remains active in background.'
      );
      try {
        if (window.opener || window.name === 'GridIPScannerApp' || window.history.length === 1) {
          window.close();
        }
      } catch (_) {}
    }
    setShowWindowsUtilModal(false);
  }, [lang, showToast]);

  const handleExitApplication = useCallback(async () => {
    if (isWindowsDesktop) {
      try {
        await executeWindowsUtility('service-stop');
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && (window as any).electronAPI?.exitApplication) {
      (window as any).electronAPI.exitApplication();
    } else {
      showToast(lang === 'ko' ? '🛑 백그라운드 서비스가 정지되었습니다.' : '🛑 Background service stopped.');
    }
  }, [isWindowsDesktop, lang, showToast]);

  // Initialize Windows-specific service & autostart status on startup
  useEffect(() => {
    if (isWindowsDesktop) {
      executeWindowsUtility('autostart').then(res => {
        if (res.enabled !== undefined) {
          setIsAutoStartEnabled(res.enabled);
        }
      }).catch(() => {});

      executeWindowsUtility('service-status').then(res => {
        if (res.installed !== undefined) {
          setIsWindowsServiceInstalled(res.installed);
        }
      }).catch(() => {});
    }
  }, [isWindowsDesktop]);

  // Register Electron Tray listeners (Intruder toggle & Intruder log modal) with Teardown
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const unsubs: Array<() => void> = [];
      if (api.onToggleIntruder) {
        const unsub = api.onToggleIntruder((val: boolean) => {
          setIntruderWatchMode(val);
          try { localStorage.setItem('grid_intruder_watch', String(val)); } catch (_) {}
          showToast(
            val
              ? (lang === 'ko' ? '🚨 트레이 24/7 침입 감시 활성화' : '🚨 Tray 24/7 Intruder Watch Enabled')
              : (lang === 'ko' ? '🚨 트레이 24/7 침입 감시 비활성화' : '🚨 Tray 24/7 Intruder Watch Disabled')
          );
        });
        if (typeof unsub === 'function') unsubs.push(unsub);
      }
      if (api.onOpenIntruderLog) {
        const unsub = api.onOpenIntruderLog(() => {
          setShowIntruderLogModal(true);
        });
        if (typeof unsub === 'function') unsubs.push(unsub);
      }
      return () => {
        unsubs.forEach(fn => fn());
      };
    }
  }, [lang, showToast]);

  // Quick Filter Tabs (all / active / conflict / intruder / soft_trust / alias)
  const [customFilterMode, setCustomFilterMode] = useState<'all' | 'active' | 'conflict' | 'intruder' | 'soft_trust' | 'alias'>('all');

  const baselineSnapshot = useMemo(() => {
    if (!baselineSnapshotId && snapshots.length > 0) {
      return snapshots[0];
    }
    return snapshots.find(s => s.id === baselineSnapshotId) || null;
  }, [snapshots, baselineSnapshotId]);

  // Comprehensive set of known devices (Trusted + Host PC + Aliased + Snapshots)
  const effectiveTrustedDevices = useMemo(() => {
    const combined = new Set<string>(trustedDevices);

    // 1. Host PC IP & Interfaces
    if (localIpInfo?.ip) combined.add(localIpInfo.ip);
    interfaces.forEach(iface => {
      if (iface.ip) combined.add(iface.ip);
      if (iface.mac) combined.add(iface.mac.toUpperCase());
    });

    // 2. Custom Aliases
    Object.values(aliases).forEach(alias => {
      if (alias.ip) combined.add(alias.ip);
      if (alias.mac) combined.add(alias.mac.toUpperCase());
    });

    // 3. Saved Snapshots
    snapshots.forEach(snap => {
      Object.values(snap.results).forEach(item => {
        if (item.status === 'active') {
          combined.add(item.ip);
          if (item.device?.mac && item.device.mac !== 'Unknown') {
            combined.add(item.device.mac.toUpperCase());
          }
        }
      });
    });

    return combined;
  }, [trustedDevices, localIpInfo, interfaces, aliases, snapshots]);

  // Feature 4: IP Conflict Detection
  const detectedConflicts = useMemo(() => {
    return analyzeNetworkConflicts(results, baselineSnapshot?.results);
  }, [results, baselineSnapshot]);

  // Historical Device Map for Fingerprint Matching & Soft Trust Grace Period
  const historicalDevices = useMemo(() => {
    const history: Record<string, DeviceInfo> = {};

    snapshots.forEach(snap => {
      Object.values(snap.results).forEach(item => {
        if (item.status === 'active' && item.device) {
          history[item.ip] = {
            ...item.device,
            lastSeen: new Date(snap.timestamp).toISOString()
          };
        }
      });
    });

    if (baselineSnapshot?.results) {
      Object.values(baselineSnapshot.results).forEach(item => {
        if (item.status === 'active' && item.device) {
          history[item.ip] = {
            ...item.device,
            lastSeen: history[item.ip]?.lastSeen || new Date(baselineSnapshot.timestamp).toISOString()
          };
        }
      });
    }

    return history;
  }, [snapshots, baselineSnapshot]);

  // Feature 5: Enhanced Intruder & Soft Trust Detection with Fingerprint Grace Period
  const { intruders: detectedIntruders, softTrusted: softTrustedDevices } = useMemo(() => {
    return findNewIntruderDevices(results, effectiveTrustedDevices, historicalDevices, 7);
  }, [results, effectiveTrustedDevices, historicalDevices]);

  const diffAnalysis = useMemo(() => {
    if (viewMode !== 'diff' || !baselineSnapshot) {
      return {
        diffMap: {} as Record<string, DiffStatus>,
        items: [] as DiffItem[],
        summary: { newCount: 0, offlineCount: 0, changedCount: 0, sameCount: 0, totalEvaluated: 0 }
      };
    }
    return computeSnapshotDiff(results, baselineSnapshot.results);
  }, [viewMode, results, baselineSnapshot]);

  const filteredInterfaces = useMemo(() => {
    return interfaces.filter(iface => {
      // Category filter
      if (interfaceFilter === 'up' && iface.status !== 'up') return false;
      if (interfaceFilter === 'physical' && iface.type !== 'physical') return false;
      if (interfaceFilter === 'virtual' && iface.type !== 'virtual') return false;
      if (interfaceFilter === 'vpn' && iface.type !== 'vpn') return false;
      if (interfaceFilter === 'has_ipv4' && !iface.ip) return false;

      // Text search
      if (interfaceSearch.trim()) {
        const query = interfaceSearch.toLowerCase();
        const matchName = (iface.name || '').toLowerCase().includes(query);
        const matchIP = (iface.ip || '').toLowerCase().includes(query);
        const matchMAC = iface.mac ? iface.mac.toLowerCase().includes(query) : false;
        const matchSubnet = (iface.subnet || '').toLowerCase().includes(query);
        const matchType = (iface.type || '').toLowerCase().includes(query);
        const matchCidr = iface.cidr ? iface.cidr.toLowerCase().includes(query) : false;
        return matchName || matchIP || matchMAC || matchSubnet || matchType || matchCidr;
      }
      return true;
    });
  }, [interfaces, interfaceFilter, interfaceSearch]);

  const interfaceStats = useMemo(() => {
    const total = interfaces.length;
    const active = interfaces.filter(i => i.status === 'up').length;
    const physical = interfaces.filter(i => i.type === 'physical').length;
    const virtual = interfaces.filter(i => i.type === 'virtual').length;
    const vpn = interfaces.filter(i => i.type === 'vpn').length;
    const hasIpv4 = interfaces.filter(i => !!i.ip).length;
    return { total, active, physical, virtual, vpn, hasIpv4 };
  }, [interfaces]);

  const s = translations[lang];
  const stopScanRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<Record<string, ScanResult>>({});
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedInterfaceIpRef = useRef<string | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const handleStopScan = useCallback(() => {
    stopScanRef.current = true;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (_) {}
    }
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Window close / reload warning & safe scan termination
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isScanningRef.current) {
        e.preventDefault();
        const warningMsg = lang === 'ko'
          ? '현재 네트워크 스캔이 진행 중입니다. 페이지를 벗어나거나 새로고침하면 스캔 작업이 강제 중단됩니다. 계속하시겠습니까?'
          : 'A network scan is currently in progress. Leaving or reloading the page will stop the scan. Are you sure you want to leave?';
        e.returnValue = warningMsg;
        return warningMsg;
      }
    };

    const handlePageHideOrUnload = () => {
      // If closeToTray is enabled, notify backend so it triggers tray balloon and keeps engine alive
      if (closeToTray) {
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/window-closed');
          } else {
            fetch('/api/window-closed', { method: 'POST', keepalive: true }).catch(() => {});
          }
        } catch (_) {}
      }

      if (isScanningRef.current) {
        stopScanRef.current = true;
        if (abortControllerRef.current) {
          try {
            abortControllerRef.current.abort();
          } catch (_) {}
        }
        if (updateTimerRef.current) {
          clearInterval(updateTimerRef.current);
          updateTimerRef.current = null;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHideOrUnload);
    window.addEventListener('unload', handlePageHideOrUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHideOrUnload);
      window.removeEventListener('unload', handlePageHideOrUnload);
    };
  }, [lang, closeToTray]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && scanStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - scanStartTime) / 1000));
      }, 1000);
    } else if (!isScanning) {
      if (interval!) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanStartTime]);

  // Permanently suppress browser / Chromium / Edge auto-translate popups
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
  }, [lang]);
 
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportDropdownOpen(false);
      }
    };

    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportDropdownOpen]);

  // 내보내기 및 리포트 클릭/펼침 시 자동으로 하단으로 부드럽게 스크롤하여 전체 내용 표시
  useEffect(() => {
    if (isExportDropdownOpen && exportDropdownRef.current) {
      const timer = setTimeout(() => {
        const el = exportDropdownRef.current;
        if (!el) return;
        const scrollParent = el.closest('.overflow-y-auto') as HTMLElement | null;
        if (scrollParent) {
          const targetScroll = el.offsetTop + el.offsetHeight - scrollParent.clientHeight + 24;
          if (targetScroll > scrollParent.scrollTop) {
            scrollParent.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isExportDropdownOpen]);



  const handleCopyIpAddress = useCallback((ip: string) => {
    if (!ip) return;
    const onCopiedSuccess = () => {
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2500);
      showToast(lang === 'ko' ? `📋 IP 주소 (${ip})가 클립보드에 복사되었습니다.` : `📋 IP Address (${ip}) copied to clipboard.`);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(ip)
        .then(onCopiedSuccess)
        .catch(() => {
          try {
            const textarea = document.createElement('textarea');
            textarea.value = ip;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            onCopiedSuccess();
          } catch {
            showToast(lang === 'ko' ? "클립보드 복사에 실패했습니다." : "Failed to copy to clipboard.");
          }
        });
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = ip;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        onCopiedSuccess();
      } catch {
        showToast(lang === 'ko' ? "클립보드 복사에 실패했습니다." : "Failed to copy to clipboard.");
      }
    }
  }, [lang]);

  // 내보내기 및 리포트 메뉴 항목 클릭 시 메뉴를 즉각 닫고 선택한 액션을 즉시 실행
  const handleExportItemClick = (action: () => void | Promise<void>) => {
    setIsExportDropdownOpen(false);
    try {
      action();
    } catch (err) {
      console.error("Export menu action error:", err);
    }
  };

  const handleSaveSnapshot = (customLabel?: string) => {
    const activeCount = Object.values(results).filter(r => r.status === 'active').length;
    if (activeCount === 0) {
      showToast(s.noData || "스캔된 활성 장치가 없습니다. 먼저 스캔을 실행하세요.");
      return;
    }
    const snap = saveSnapshot(config.subnet, config.start, config.end, results, customLabel);
    const updated = getSavedSnapshots();
    setSnapshots(updated);
    setBaselineSnapshotId(snap.id);
    showToast(s.snapshotSaved || "현재 스캔 스냅샷이 저장되었습니다.");
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = deleteSnapshot(id);
    setSnapshots(updated);
    if (baselineSnapshotId === id) {
      setBaselineSnapshotId(updated.length > 0 ? updated[0].id : null);
    }
    showToast(lang === 'ko' ? "스냅샷이 삭제되었습니다." : "Snapshot deleted.");
  };

  const handleActivateLicense = async () => {
    const res = activateLicenseKey(licenseKeyInput);
    if (res.success && res.license) {
      setLicense(res.license);
      showToast(res.message);
      setLicenseKeyInput('');
      setShowLicenseModal(false);
      try {
        await fetch(getApiUrl('/api/license'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(res.license)
        });
      } catch (e) {
        console.warn('Failed to sync license key to Go backend:', e);
      }
    } else {
      showToast(res.message);
    }
  };

  const handleResetLicense = async () => {
    const free = clearLicense();
    setLicense(free);
    showToast(lang === 'ko' ? "라이선스가 커뮤니티 에디션(무료)으로 초기화되었습니다." : "License reset to Community Edition (Free).");
    setShowLicenseModal(false);
    try {
      await fetch(getApiUrl('/api/license'), {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to clear license key in Go backend:', e);
    }
  };

  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) {}
  };

  const handleRemoteAction = async (ip: string, action: RemoteActionType, port?: number) => {
    setIsExecutingRemote(true);
    try {
      const result = await executeRemoteAction(ip, action, port);
      showToast(result.message);
    } catch (e: any) {
      showToast(e.message || "원격 동작 실행 중 오류가 발생했습니다.");
    } finally {
      setIsExecutingRemote(false);
    }
  };

  const handleCellDoubleClick = (ip: string, dev?: DeviceInfo) => {
    setSelectedIp(ip);
    const ports = dev?.openPorts || [];
    if (ports.includes(80) || ports.includes(443) || ports.includes(8080)) {
      handleRemoteAction(ip, ports.includes(443) && !ports.includes(80) ? 'web_ssl' : 'web', ports.includes(80) ? 80 : ports.includes(443) ? 443 : 8080);
    } else if (ports.includes(3389)) {
      handleRemoteAction(ip, 'rdp', 3389);
    } else if (ports.includes(22)) {
      handleRemoteAction(ip, 'ssh', 22);
    } else if (ports.includes(445)) {
      handleRemoteAction(ip, 'smb', 445);
    } else {
      handleRemoteAction(ip, 'web', 80);
    }
  };

  const handleSendWakeOnLan = async (mac?: string, ip?: string) => {
    if (!license.features.remoteBoot) {
      showToast(lang === 'ko' ? "원격 부팅(Wake-on-LAN) 기능은 PRO 에디션 이상에서 제공됩니다." : "Wake-on-LAN remote boot is available in PRO or higher.");
      setShowLicenseModal(true);
      return;
    }
    if (!mac || mac === 'Unknown') {
      showToast("MAC 주소가 식별되지 않아 WoL 패킷을 전송할 수 없습니다.");
      return;
    }
    setIsSendingWol(true);
    try {
      const result = await sendWakeOnLanPacket(mac, ip);
      showToast(result.message);
    } catch (e: any) {
      showToast(e.message || "WoL 패킷 전송 실패");
    } finally {
      setIsSendingWol(false);
    }
  };

  const handleSaveNickname = (mac?: string, ip?: string, customName?: string) => {
    if (!mac && !ip) return;
    const key = normalizeMacKey(mac, ip);
    const nicknameToSave = customName !== undefined ? customName.trim() : aliasNicknameInput.trim();
    const existingAlias = getDeviceAlias(mac, ip);
    const updatedAlias: DeviceAlias = {
      mac: key.startsWith('IP:') ? '' : key,
      ip,
      nickname: nicknameToSave,
      notes: existingAlias?.notes || aliasNotesInput.trim(),
      updatedAt: new Date().toISOString()
    };
    saveDeviceAlias(updatedAlias);
    setAliases(getStoredAliases());
    setAliasNicknameInput(nicknameToSave);
    setIsEditingAlias(false);
    showToast(nicknameToSave ? `기기 이름이 "${nicknameToSave}"(으)로 설정되었습니다.` : "기기 별칭이 초기화되었습니다.");
  };

  const handleDeleteNickname = (mac?: string, ip?: string) => {
    removeDeviceAlias(mac, ip);
    setAliases(getStoredAliases());
    setAliasNicknameInput('');
    setAliasNotesInput('');
    setIsEditingAlias(false);
    showToast("기기 별칭 및 메모가 삭제되었습니다.");
  };

  const handleToggleIntruderWatch = () => {
    if (!license.features.intruderDetection) {
      showToast(lang === 'ko' 
        ? "낯선 기기 실시간 감시(Intruder Watch) 기능은 PRO 에디션 이상에서 제공됩니다." 
        : "Intruder Watch Mode is available in PRO edition and higher.");
      setShowLicenseModal(true);
      return;
    }
    const nextVal = !intruderWatchMode;
    setIntruderWatchMode(nextVal);
    localStorage.setItem('grid_intruder_watch_mode', String(nextVal));
    if (nextVal) {
      const updated = new Set(trustedDevices);
      Object.values(results).forEach(r => {
        if (r.status === 'active') {
          if (r.device?.mac && r.device.mac !== 'Unknown') updated.add(r.device.mac.toUpperCase());
          if (r.ip) updated.add(r.ip);
        }
      });
      setTrustedDevices(updated);
      const arr = Array.from(updated);
      localStorage.setItem('grid_trusted_devices', JSON.stringify(arr));
      localStorage.setItem('grid_known_devices', JSON.stringify(arr));

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      showToast(lang === 'ko' ? "🔔 낯선 기기 감시 모드가 활성화되었습니다. 신규 미확인 기기 접속 시 알림을 보냅니다." : "🔔 Intruder Watch mode enabled. You will be alerted upon new unidentified device access.");
    } else {
      showToast(lang === 'ko' ? "낯선 기기 감시 모드가 비활성화되었습니다." : "Intruder Watch mode disabled.");
    }
  };

  const handleTrustDevice = (mac?: string, ip?: string) => {
    const updated = new Set(trustedDevices);
    if (mac && mac !== 'Unknown') updated.add(mac.toUpperCase());
    if (ip) updated.add(ip);
    setTrustedDevices(updated);
    const arr = Array.from(updated);
    localStorage.setItem('grid_trusted_devices', JSON.stringify(arr));
    localStorage.setItem('grid_known_devices', JSON.stringify(arr));
    showToast(lang === 'ko' ? `신뢰하는 정상 기기 목록에 등록되었습니다 (${ip || mac}).` : `Registered to trusted devices list (${ip || mac}).`);
  };

  const handleTrustAllCurrentDevices = () => {
    const updated = new Set(trustedDevices);
    let count = 0;
    Object.values(results).forEach(r => {
      if (r.status === 'active') {
        if (r.device?.mac && r.device.mac !== 'Unknown') updated.add(r.device.mac.toUpperCase());
        if (r.ip) updated.add(r.ip);
        count++;
      }
    });
    setTrustedDevices(updated);
    const arr = Array.from(updated);
    localStorage.setItem('grid_trusted_devices', JSON.stringify(arr));
    localStorage.setItem('grid_known_devices', JSON.stringify(arr));
    showToast(lang === 'ko' ? `현재 탐색된 ${count}개 활성 장치가 모두 신뢰/정상 기기로 등록되었습니다.` : `All ${count} active devices have been marked as trusted.`);
  };

  const handleResetTrustedDevices = () => {
    setTrustedDevices(new Set());
    localStorage.removeItem('grid_trusted_devices');
    localStorage.removeItem('grid_known_devices');
    showToast(lang === 'ko' ? "신뢰 기기 목록이 초기화되었습니다." : "Trusted devices list has been reset.");
  };

  const handleRunDeepPortAudit = async (ip: string) => {
    if (!license.features.portScanDeep) {
      showToast(lang === 'ko' ? "심층 포트 정밀 보안 감사 기능은 PRO 이상에서 제공됩니다." : "Deep port security audit is available in PRO or higher.");
      setShowLicenseModal(true);
      return;
    }
    setIsAuditingPorts(true);
    setPortAuditResult(null);
    try {
      showToast(s.deepPortAuditing || "포트 정밀 분석 중...");
      const audit = await runDeepPortAudit(ip, results[ip]?.device?.openPorts || []);
      setPortAuditResult(audit);
      showToast(s.deepPortAuditComplete || "포트 정밀 분석이 완료되었습니다.");
    } catch (e) {
      showToast("포트 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAuditingPorts(false);
    }
  };

  const handleExportAuditReport = () => {
    if (!license.features.exportReport) {
      showToast("보안 감사 보고서 내보내기 기능은 PRO 이상에서 제공됩니다.");
      setShowLicenseModal(true);
      return;
    }
    const activeCount = Object.values(results).filter(r => r.status === 'active').length;
    if (activeCount === 0) {
      showToast(s.noData || "내보낼 활성 데이터가 없습니다.");
      return;
    }
    generateProfessionalAuditReport(config.subnet, config.start, config.end, results, license);
    showToast("정밀 보안 감사 보고서(HTML)가 생성되었습니다.");
  };

  const handleExportPdf = async (type: 'search' | 'active' | 'all' | 'audit') => {
    if (isExportingPdf) return;

    if (type === 'audit' && !license.features.exportReport) {
      showToast(lang === 'ko' ? "보안 감사 보고서 내보내기 기능은 PRO 이상에서 제공됩니다." : "Security audit report export is available in PRO or higher.");
      setShowLicenseModal(true);
      return;
    }

    const activeCount = Object.values(results).filter(r => r.status === 'active').length;
    if (Object.keys(results).length === 0) {
      showToast(s.noData || "내보낼 스캔 데이터가 없습니다.");
      return;
    }
    if ((type === 'audit' || type === 'active') && activeCount === 0) {
      showToast(lang === 'ko' ? "내보낼 활성 장비 데이터가 없습니다." : "No active device data found to export.");
      return;
    }

    setIsExportingPdf(true);
    showToast(s.exportGeneratingPdf || "PDF 리포트를 생성하는 중입니다...");

    try {
      if (type === 'audit') {
        const res = await exportSecurityAuditReportToPDF(config.subnet, config.start, config.end, results, license, lang);
        if (res.success) {
          showToast(s.exportPdfSuccess || "보안 감사 PDF 보고서가 다운로드되었습니다.");
          setShowPdfExportModal(false);
        } else {
          showToast(res.error || "PDF 생성 중 오류가 발생했습니다.");
        }
      } else if (type === 'search') {
        const targetIps = filteredIps.length > 0 ? filteredIps : (searchTerm ? [] : Object.keys(results));
        if (targetIps.length === 0) {
          showToast(lang === 'ko' ? "검색 조건에 일치하는 결과가 없습니다." : "No items match current search filter.");
          setIsExportingPdf(false);
          return;
        }
        const res = await exportDeviceListToPDF({
          title: lang === 'ko' ? '네트워크 검색 및 필터링 결과 보고서' : 'Network Search & Filter Report',
          subtitle: lang === 'ko' ? '검색어 일치 노드 자산 및 포트 분석 상세' : 'Search Query Matched Node Inventory & Diagnostics',
          searchQuery: searchTerm || undefined,
          scopeLabel: lang === 'ko' ? (searchTerm ? `검색결과_${searchTerm}` : '필터링결과') : (searchTerm ? `Search_${searchTerm}` : 'Filtered'),
          subnet: config.subnet,
          start: config.start,
          end: config.end,
          targetIps,
          results,
          license,
          lang,
        });
        if (res.success) {
          showToast(s.exportPdfSuccess || "검색 결과 PDF가 다운로드되었습니다.");
          setShowPdfExportModal(false);
        } else {
          showToast(res.error || "PDF 생성 중 오류가 발생했습니다.");
        }
      } else if (type === 'active') {
        const targetIps = allIps.filter(ip => results[ip]?.status === 'active');
        const res = await exportDeviceListToPDF({
          title: lang === 'ko' ? '온라인 활성 장비 인벤토리 보고서' : 'Active Network Devices Inventory Report',
          subtitle: lang === 'ko' ? '현재 네트워크에 응답하는 활성 단말 상세 목록' : 'Detailed Inventory of Online Responsive Devices',
          scopeLabel: lang === 'ko' ? '활성장비' : 'ActiveNodes',
          subnet: config.subnet,
          start: config.start,
          end: config.end,
          targetIps,
          results,
          license,
          lang,
        });
        if (res.success) {
          showToast(s.exportPdfSuccess || "활성 장비 PDF가 다운로드되었습니다.");
          setShowPdfExportModal(false);
        } else {
          showToast(res.error || "PDF 생성 중 오류가 발생했습니다.");
        }
      } else if (type === 'all') {
        const targetIps = allIps;
        const res = await exportDeviceListToPDF({
          title: lang === 'ko' ? '전체 서브넷 스캔 대역 종합 보고서' : 'Complete Subnet Scan Range Comprehensive Report',
          subtitle: lang === 'ko' ? `서브넷 ${config.subnet}.0/24 전체 노드 상태 인벤토리` : `Full Node Status Map for Subnet ${config.subnet}.0/24`,
          scopeLabel: lang === 'ko' ? '전체대역' : 'AllNodes',
          subnet: config.subnet,
          start: config.start,
          end: config.end,
          targetIps,
          results,
          license,
          lang,
        });
        if (res.success) {
          showToast(s.exportPdfSuccess || "전체 결과 PDF가 다운로드되었습니다.");
          setShowPdfExportModal(false);
        } else {
          showToast(res.error || "PDF 생성 중 오류가 발생했습니다.");
        }
      }
    } catch (e: any) {
      showToast("PDF 내보내기 실패: " + (e?.message || e));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleElevateAdmin = async () => {
    if (isElevating) return;
    setIsElevating(true);
    showToast(s.relaunchNotice || "관리자 권한으로 재실행 중입니다. Windows UAC 창을 확인해주세요...");
    try {
      const res = await fetch(getApiUrl('/api/relaunch-admin'), {
        method: 'POST'
      });
      if (!res.ok) {
        showToast(s.updateError || "An error occurred during relaunch.");
        setIsElevating(false);
      } else {
        // Wait a small moment to let the UAC dialog show, then gracefully request window closure.
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            console.error("Failed to close window via JS window.close():", e);
          }
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setIsElevating(false);
    }
  };

  const getApiUrl = (path: string) => path;

  const syncOUI = async () => {
    setRegistryMeta(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch(getApiUrl('/api/info'), { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setRegistryMeta({
          status: 'synced',
          count: data.ouiCount || 0,
          source: 'local',
          isSyncing: false,
          sourceName: data.ouiSource || 'Master OUI Database (master_oui.txt)',
          cachePath: data.ouiCachePath || '',
          databaseLocation: data.ouiDatabaseLocation || ''
        });
      } else {
        throw new Error("Failed to fetch info");
      }
    } catch (err) {
      setRegistryMeta(prev => ({
        ...prev,
        status: 'error',
        isSyncing: false
      }));
    }
  };

  useEffect(() => {
    const checkEngine = async () => {
      try {
        // Increase timeout for health check to be more resilient during heavy scans
        const res = await fetch(getApiUrl('/api/info'), { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          setGoEngineAlive(true);
          
          const manualIp = selectedInterfaceIpRef.current;
          const updatedInterfaces: InterfaceInfo[] = data.interfaces || [];
          const chosenIface = manualIp 
            ? updatedInterfaces.find(i => i.ip === manualIp) 
            : (updatedInterfaces.find(i => i.type === 'physical' && i.status === 'up' && i.ip) ||
               updatedInterfaces.find(i => i.type === 'physical' && i.ip) ||
               null);

          if (chosenIface) {
            setLocalIpInfo({ ip: chosenIface.ip, subnet: chosenIface.subnet, computerName: data.computerName });
            setConfig(prev => {
              if (chosenIface.subnet && (prev.subnet === '192.168.0' || prev.subnet === '')) {
                return { ...prev, subnet: chosenIface.subnet };
              }
              return prev;
            });
          } else {
            // Check WebRTC client-side Wi-Fi IP resolution if default or preview IP returned
            let activeIp = data.ip;
            let activeSubnet = data.subnet;
            if (data.ip === '192.168.0.1' || !data.ip || data.ip === '127.0.0.1') {
              const webRtcRes = await getClientLocalIP().catch(() => null);
              if (webRtcRes) {
                activeIp = webRtcRes.ip;
                activeSubnet = webRtcRes.subnet;
              }
            }

            setLocalIpInfo({ ip: activeIp, subnet: activeSubnet, computerName: data.computerName });
            setConfig(prev => {
              if (activeSubnet && (prev.subnet === '192.168.0' || prev.subnet === '')) {
                return { ...prev, subnet: activeSubnet };
              }
              return prev;
            });
          }

          setInterfaces(updatedInterfaces);
          setIsAdmin(data.isAdmin || false);
          if (data.ouiCount !== undefined) {
            setRegistryMeta(prev => ({ 
              ...prev, 
              count: data.ouiCount, 
              status: 'synced',
              sourceName: data.ouiSource || prev.sourceName,
              cachePath: data.ouiCachePath || prev.cachePath,
              databaseLocation: data.ouiDatabaseLocation || prev.databaseLocation
            }));
          }
          if (data.message) {
            setToastMessage(data.message);
          }
        } else {
          // If response is not OK, don't immediately set to false if it was true, 
          // maybe it's just a temporary hiccup
          setGoEngineAlive(prev => prev); 
        }
      } catch (e) {
        // Only set to false if it's not an AbortError (timeout)
        if ((e as Error).name !== 'AbortError') {
          setGoEngineAlive(false);
          // Try client-side WebRTC Wi-Fi IP detection when backend is offline
          const webRtcRes = await getClientLocalIP().catch(() => null);
          if (webRtcRes) {
            setLocalIpInfo({ ip: webRtcRes.ip, subnet: webRtcRes.subnet, computerName: 'Mobile Device (Wi-Fi)' });
            setConfig(prev => {
              if (prev.subnet === '192.168.0' || prev.subnet === '') {
                return { ...prev, subnet: webRtcRes.subnet };
              }
              return prev;
            });
          }
        }
      }
    };
    checkEngine();
    const timer = setInterval(checkEngine, 8000);
    
    // Heartbeat to keep backend alive
    const heartbeatTimer = setInterval(() => {
      fetch(getApiUrl('/api/heartbeat')).catch(() => {});
    }, 3000);

    const loadLicenseFromBackend = async () => {
      try {
        const res = await fetch(getApiUrl('/api/license'));
        if (res.ok) {
          const data = await res.json();
          if (data && data.licenseKey) {
            const keyRes = activateLicenseKey(data.licenseKey);
            if (keyRes.success && keyRes.license) {
              setLicense(keyRes.license);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load license from portable storage:', err);
      }
    };
    loadLicenseFromBackend();

    syncOUI();
    return () => {
      clearInterval(timer);
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Dynamically synchronize Wi-Fi network interface IP in the interface filter list with localIpInfo
  useEffect(() => {
    if (!localIpInfo?.ip || localIpInfo.ip === '127.0.0.1') return;

    setInterfaces(prevList => {
      let hasMatchingIp = false;
      let wifiIndex = -1;

      const nextList: InterfaceInfo[] = prevList.map((iface, index) => {
        const lowerName = (iface.name || '').toLowerCase();
        const isWifi = lowerName.includes('wifi') || lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('무선');

        if (iface.ip === localIpInfo.ip) {
          hasMatchingIp = true;
          return { ...iface, isDefault: true, status: 'up' as const };
        }
        if (isWifi) {
          wifiIndex = index;
        }
        return iface;
      });

      if (!hasMatchingIp) {
        if (wifiIndex !== -1) {
          // Update existing Wi-Fi interface item's IP to match real localIpInfo
          nextList[wifiIndex] = {
            ...nextList[wifiIndex],
            ip: localIpInfo.ip,
            subnet: localIpInfo.subnet,
            cidr: `${localIpInfo.ip}/24`,
            status: 'up' as const,
            isDefault: true
          };
          return nextList;
        } else {
          // Prepend a Wi-Fi interface matching localIpInfo
          const newWifiIface: InterfaceInfo = {
            name: 'Wi-Fi 6 / 무선 어댑터 (wlan0)',
            ip: localIpInfo.ip,
            subnet: localIpInfo.subnet,
            cidr: `${localIpInfo.ip}/24`,
            status: 'up' as const,
            type: 'physical' as const,
            mtu: 1500,
            flags: ['UP', 'BROADCAST', 'MULTICAST'],
            isDefault: true
          };
          return [newWifiIface, ...nextList];
        }
      }

      return nextList;
    });
  }, [localIpInfo]);

  // Background GitHub Releases Auto-Update Checker
  useEffect(() => {
    // Load Native DLL Modules status
    fetchNativeModulesStatus().then(st => setNativeStatus(st)).catch(() => {});

    const updateTimer = setTimeout(() => {
      checkGitHubRelease(false).then(res => {
        if (res.updateInfo) {
          setUpdateInfo(res.updateInfo);
          // If a new update is available on GitHub Releases, automatically open the update popup modal
          if (res.hasUpdate) {
            setShowUpdateModal(true);
            showToast(lang === 'ko' ? `📱 신규 업데이트(v${res.updateInfo.latestVersion})가 발견되었습니다.` : `📱 New update (v${res.updateInfo.latestVersion}) detected.`);
          }
        }
      }).catch(() => {});
    }, 2500);
    return () => clearTimeout(updateTimer);
  }, []);

  const handleManualCheckUpdate = async (openUpdateModal: boolean | unknown = true) => {
    const shouldOpen = typeof openUpdateModal === 'boolean' ? openUpdateModal : true;
    setIsCheckingUpdate(true);
    showToast(lang === 'ko' ? "GitHub Releases 최신 릴리즈 점검 중..." : "Checking GitHub Releases...");
    const res = await checkGitHubRelease(true);
    setIsCheckingUpdate(false);
    if (res.updateInfo) {
      setUpdateInfo(res.updateInfo);
      if (shouldOpen) {
        setShowUpdateModal(true);
      }
      if (res.hasUpdate) {
        showToast(lang === 'ko' ? `🎉 새로운 버전(v${res.updateInfo.latestVersion})이 출시되었습니다!` : `🎉 New version v${res.updateInfo.latestVersion} available!`);
      } else {
        showToast(lang === 'ko' ? `현재 최신 버전(v${CURRENT_APP_VERSION})을 사용 중입니다.` : `You are using the latest version (v${CURRENT_APP_VERSION}).`);
      }
    } else if (res.error) {
      showToast(lang === 'ko' ? `업데이트 확인 실패: ${res.error}` : `Update check failed: ${res.error}`);
      if (shouldOpen) {
        setShowUpdateModal(true);
      }
    }
  };

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

  useEffect(() => {
    const initial: Record<string, ScanResult> = {};
    const subnet = config.subnet || '192.168.0';
    for (let i = config.start; i <= config.end; i++) {
      const ip = `${subnet}.${i}`;
      initial[ip] = { ip, status: 'idle' };
    }
    setResults(initial);
  }, [config.subnet, config.start, config.end]);

  const resetScanState = () => {
    if (isScanning) {
      handleStopScan();
    }
    
    const initial: Record<string, ScanResult> = {};
    const subnet = config.subnet || '192.168.0';
    for (let i = config.start; i <= config.end; i++) {
      initial[`${subnet}.${i}`] = { ip: `${subnet}.${i}`, status: 'idle', missCount: 0 };
    }
    
    setResults(initial);
    resultsRef.current = initial;
    setProcessedIPs(new Set());
    setScanningIPs(new Set());
    setHasStartedScan(false);
    setElapsedTime(0);
    showToast(s.stateResetComplete);
  };

  const startScan = async (scheduledTask?: ScanSchedule) => {
    let engineReady = goEngineAlive;

    if (!engineReady) {
      try {
        const pingRes = await fetch(getApiUrl('/api/info'), { signal: AbortSignal.timeout(3000) });
        if (pingRes.ok) {
          engineReady = true;
          setGoEngineAlive(true);
        }
      } catch (_) {
        // Retry probe
      }
    }

    const targetSubnet = scheduledTask ? scheduledTask.subnet : (config.subnet || '192.168.0');
    const targetStart = scheduledTask ? scheduledTask.start : config.start;
    const targetEnd = scheduledTask ? scheduledTask.end : config.end;
    const targetDeep = scheduledTask ? scheduledTask.deepScan : deepScan;
    const targetMode = scheduledTask ? scheduledTask.scanMode : scanMode;
    const targetTotalCount = targetEnd - targetStart + 1;

    if (scheduledTask && (config.subnet !== targetSubnet || config.start !== targetStart || config.end !== targetEnd)) {
      setConfig({
        subnet: targetSubnet,
        start: targetStart,
        end: targetEnd,
        timeout: config.timeout
      });
    }

    setIsScanning(true);
    setHasStartedScan(true);
    setShowSummary(false);
    stopScanRef.current = false;
    setScanningIPs(new Set());
    setProcessedIPs(new Set());
    setScanStartTime(Date.now());
    setElapsedTime(0);
    
    // Use AbortController for real cancellation
    abortControllerRef.current = new AbortController();
    
    // Initialize resultsRef with current state
    const previousResults = { ...resultsRef.current };
    if (!mergeResults) {
      resultsRef.current = {};
    }
    const subnet = targetSubnet;
    for (let i = targetStart; i <= targetEnd; i++) {
      const ip = `${subnet}.${i}`;
      if (previousResults[ip] && previousResults[ip].status === 'active') {
        resultsRef.current[ip] = { ...previousResults[ip] };
      } else if (!resultsRef.current[ip]) {
        resultsRef.current[ip] = { ip, status: 'idle', missCount: 0 };
      }
    }
    setResults({ ...resultsRef.current });
    setScanningIPs(new Set(["Initializing..."])); // Visual feedback that it started

    // Throttled UI update logic using local sets to avoid React state flood
    const localScanningIPs = new Set<string>();
    const localProcessedIPs = new Set<string>();

    const syncResultsToUI = () => {
      setResults({ ...resultsRef.current });
      setScanningIPs(new Set(localScanningIPs));
      setProcessedIPs(new Set(localProcessedIPs));
    };
    updateTimerRef.current = setInterval(syncResultsToUI, 250); // Increased to 250ms for smoothness

    try {
      setShowSummary(false);
      let delay = 10;
      let timeout = 1000;
      
      if (targetMode === 'fast') {
        delay = 0;
        timeout = 500;
      } else if (targetMode === 'precision') {
        delay = 50;
        timeout = 2000;
      }

      const response = await fetch(
        getApiUrl(`/api/scan?subnet=${targetSubnet}&start=${targetStart}&end=${targetEnd}&deep=${targetDeep}&delay=${delay}&timeout=${timeout}`),
        { signal: abortControllerRef.current.signal }
      );
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done || stopScanRef.current) {
          if (stopScanRef.current) {
            reader.cancel();
            abortControllerRef.current.abort();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '');
          try {
            const msg = JSON.parse(jsonStr);
            if (msg.type === 'scanning') {
              localScanningIPs.add(msg.ip);
              localProcessedIPs.add(msg.ip);
              resultsRef.current[msg.ip] = { ...resultsRef.current[msg.ip], status: 'scanning' };
            } else if (msg.type === 'result') {
              const res = msg.data;
              localScanningIPs.delete(res.ip);
              localProcessedIPs.add(res.ip);

              const isSelf = res.ip === localIpInfo?.ip;
              const vendorName = res.vendor || "Unknown Vendor";
              const classification = classifyDevice(vendorName, res.openPorts || [], s, {
                ip: res.ip,
                hostname: res.hostname,
                mdns: res.mdns,
                webTitle: res.webTitle,
                upnp: res.upnp,
                snmp: res.snmp,
                mac: res.mac,
                realVendor: res.realVendor,
                chipsetVendor: res.chipsetVendor,
                vendorSource: res.vendorSource,
                ouiBlockType: res.ouiBlockType,
                ouiPrefix: res.ouiPrefix,
                isRandomizedMac: res.isRandomizedMac,
                lang
              });
              
              let finalName = res.hostname;
              if (!finalName && classification.model) {
                finalName = classification.model;
              }
              if (!finalName && res.webTitle) {
                finalName = res.webTitle.length > 25 ? res.webTitle.substring(0, 22) + "..." : res.webTitle;
              }
              if (!finalName) {
                if (!res.mac || res.mac === "Unknown" || res.mac === "") {
                  finalName = isSelf ? s.deviceTypes.hostMachine : "Hidden Node";
                } else {
                  finalName = isSelf ? s.deviceTypes.hostMachine : (classification.model ? classification.model : (vendorName !== "Unknown Vendor" && !classification.isRandomizedMac ? `${vendorName} ${classification.type}` : classification.type));
                }
              }

              const prevResult = previousResults[res.ip];
              let newMissCount = 0;
              let finalStatus: IPStatus = res.alive ? 'active' : 'inactive';
              let finalDevice: DeviceInfo | undefined = res.alive ? {
                ip: res.ip,
                mac: res.mac || "Unknown",
                vendor: isSelf ? s.deviceTypes.hostMachine : (res.vendor || vendorName),
                chipsetVendor: res.chipsetVendor || classification.chipsetVendor || (isSelf ? s.deviceTypes.hostMachine : vendorName),
                realVendor: res.realVendor || classification.realVendor,
                vendorSource: res.vendorSource || classification.vendorSource || (res.realVendor ? (res.upnp ? 'UPnP XML' : res.mdns ? 'mDNS TXT' : 'IEEE OUI') : undefined),
                realVendorConfidence: classification.realVendorConfidence,
                chipsetConfidence: classification.chipsetConfidence,
                confidenceScore: classification.confidenceScore,
                priorityRank: classification.priorityRank,
                ouiBlockType: res.ouiBlockType || classification.ouiBlockType,
                ouiPrefix: res.ouiPrefix || classification.ouiPrefix,
                isRandomizedMac: res.isRandomizedMac ?? classification.isRandomizedMac,
                isChipsetOem: classification.isChipsetOem,
                deviceCategory: classification.deviceCategory,
                classificationReasons: classification.classificationReasons,
                latency: res.latency,
                hostname: finalName,
                nameSource: res.nameSource || (res.mdns ? 'MDNS' : res.upnp ? 'UPNP' : res.snmp ? 'SNMP' : res.webTitle ? 'WEB' : res.hostname ? 'DNS' : 'UNKNOWN'),
                hostnameSources: res.hostnameSources || (res.hostname ? { [res.nameSource || 'DNS']: res.hostname } : undefined),
                webTitle: res.webTitle,
                os: isSelf ? "Windows (Host PC)" : classification.os,
                openPorts: res.openPorts,
                mdns: res.mdns,
                upnp: res.upnp,
                snmp: res.snmp,
                deviceType: classification.type,
                deviceModel: res.deviceModel || classification.model
              } : undefined;

              if (!res.alive && prevResult && prevResult.status === 'active') {
                const currentMiss = (prevResult.missCount || 0) + 1;
                if (currentMiss < 3) {
                  // Grace period: keep it active
                  finalStatus = 'active';
                  finalDevice = prevResult.device;
                  newMissCount = currentMiss;
                } else {
                  // Missed 3 times, let it die
                  finalStatus = 'inactive';
                  finalDevice = undefined;
                  newMissCount = 0;
                }
              }

              resultsRef.current[res.ip] = {
                ip: res.ip,
                status: finalStatus,
                device: finalDevice,
                missCount: newMissCount
              };
            } else if (msg.type === 'complete') {
              setIsScanning(false);
              setShowSummary(true);
              const activeCount = Object.values(resultsRef.current).filter(r => r.status === 'active').length;
              setScanHistory(prev => [{
                date: new Date().toLocaleString(),
                active: activeCount,
                total: targetTotalCount
              }, ...prev].slice(0, 5));
            }
          } catch (e) {
            console.error("Parse Error:", e);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.log("Scan aborted by user");
      } else {
        console.error("Scan Failed:", e);
      }
    } finally {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      // Final sync for UI state & persist discovered active devices into known devices store
      setScanningIPs(new Set());
      const finalProcessed = new Set(localProcessedIPs);
      setProcessedIPs(finalProcessed);
      setResults({ ...resultsRef.current });

      try {
        const existingKnown = new Set<string>(trustedDevices);
        Object.values(resultsRef.current).forEach(r => {
          if (r.status === 'active') {
            existingKnown.add(r.ip);
            if (r.device?.mac && r.device.mac !== 'Unknown') {
              existingKnown.add(r.device.mac.toUpperCase());
            }
          }
        });
        const arr = Array.from(existingKnown);
        localStorage.setItem('grid_known_devices', JSON.stringify(arr));
        setTrustedDevices(existingKnown);
      } catch (e) {
        console.warn("Failed to persist scan results into known list:", e);
      }

      // Feature: Automated Recurring Schedule Auto-Save & History Logging
      if (scheduledTask) {
        const scanDuration = Date.now() - (scanStartTime || Date.now());
        const finalActive = Object.values(resultsRef.current).filter(r => r.status === 'active').length;
        let autoSnapshotId: string | undefined = undefined;

        if (scheduledTask.autoSaveSnapshot) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const snapLabel = `${scheduledTask.snapshotPrefix || '[Auto-Sched]'} ${scheduledTask.name} (${timeStr})`;
          const newSnap = saveSnapshot(targetSubnet, targetStart, targetEnd, resultsRef.current, snapLabel);
          setSnapshots(getSavedSnapshots());
          autoSnapshotId = newSnap.id;
        }

        let newDevCount = 0;
        let offlineDevCount = 0;
        if (baselineSnapshot?.results) {
          const diff = computeSnapshotDiff(resultsRef.current, baselineSnapshot.results);
          newDevCount = diff.summary.newCount;
          offlineDevCount = diff.summary.offlineCount;
        }

        recordScheduleRunCompletion(scheduledTask.id);
        addHistoryRecord({
          scheduleId: scheduledTask.id,
          scheduleName: scheduledTask.name,
          subnet: targetSubnet,
          activeCount: finalActive,
          totalCount: targetTotalCount,
          durationMs: scanDuration,
          snapshotId: autoSnapshotId,
          newDevicesCount: newDevCount,
          offlineDevicesCount: offlineDevCount,
          changedDevicesCount: 0,
          status: 'success'
        });

        if (scheduledTask.notifyOnCompletion) {
          const hasChanges = newDevCount > 0 || offlineDevCount > 0;
          if (!scheduledTask.notifyOnChangesOnly || hasChanges) {
            const body = lang === 'ko'
              ? `⏰ [자동 스케줄] '${scheduledTask.name}' 완료: 활성 ${finalActive}대 발견${hasChanges ? ` (+신규:${newDevCount}, -오프라인:${offlineDevCount})` : ''}`
              : `⏰ [Scheduled Scan] '${scheduledTask.name}' completed: ${finalActive} active devices${hasChanges ? ` (+new:${newDevCount}, -offline:${offlineDevCount})` : ''}`;
            showToast(body);
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(lang === 'ko' ? 'Grid IP Scanner2 - 정기 스케줄 완료' : 'Grid IP Scanner2 - Scheduled Scan Finished', {
                  body,
                  icon: './icon.png'
                });
              } catch (_) {}
            }
          }
        }
      }

      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const handleToggleScan = useCallback(() => {
    if (isScanning) {
      handleStopScan();
      showToast(lang === 'ko' ? '⏹️ 트레이에서 스캔 중지됨' : '⏹️ Scan stopped');
    } else {
      startScan();
      showToast(lang === 'ko' ? '⚡ 그리드 네트워크 스캔 시작됨' : '⚡ Grid Scan started');
    }
  }, [isScanning, handleStopScan, lang, showToast]);

  // Register Electron Tray Scan Toggle Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onToggleScan) {
      const api = (window as any).electronAPI;
      const unsub = api.onToggleScan(() => {
        handleToggleScan();
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [handleToggleScan]);

  // Register Listener to detect when main window is hidden to tray and trigger toast message
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onWindowHiddenToTray) {
      const api = (window as any).electronAPI;
      const unsub = api.onWindowHiddenToTray(() => {
        showToast(
          lang === 'ko'
            ? '📌 애플리케이션이 시스템 트레이로 최소화되었습니다. 백그라운드 24/7 침입 감시가 가동 중입니다.'
            : '📌 Application minimized to System Tray. Background 24/7 Intruder Watch remains active.'
        );
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [lang, showToast]);

  // Feature: Background Recurring Scan Scheduler Engine
  useEffect(() => {
    const scheduleTicker = setInterval(() => {
      const allSchedules = getSchedules();
      const enabledList = allSchedules.filter(s => s.enabled);
      setActiveScheduleCount(enabledList.length);

      if (isScanningRef.current || !goEngineAlive) return;

      const currentTime = Date.now();
      const dueSchedule = enabledList.find(s => s.nextRun && s.nextRun <= currentTime);
      if (dueSchedule) {
        console.log(`[Scheduler] Executing scheduled scan: ${dueSchedule.name}`);
        startScan(dueSchedule);
      }
    }, 5000);

    return () => clearInterval(scheduleTicker);
  }, [goEngineAlive, config, deepScan, scanMode, baselineSnapshot]);

  // Feature 5: Background Periodic Scanning for Intruder Watch Mode (Portable & Installed)
  const prevIntrudersCountRef = useRef<number>(0);
  useEffect(() => {
    if (!intruderWatchMode || !license.features.intruderDetection) return;

    // Run periodic scan every 60 seconds while watch mode is active
    const periodicTimer = setInterval(() => {
      if (!isScanning && goEngineAlive) {
        startScan();
      }
    }, 60000);

    return () => clearInterval(periodicTimer);
  }, [intruderWatchMode, license.features.intruderDetection, isScanning, goEngineAlive, config, deepScan, scanMode]);

  // Trigger sound and system notification when new intruder devices are detected (only when scan finishes or during periodic watch scan)
  useEffect(() => {
    if (intruderWatchMode && license.features.intruderDetection && !isScanning && detectedIntruders.length > prevIntrudersCountRef.current) {
      playAlertChime();
      const newItems = detectedIntruders.slice(prevIntrudersCountRef.current);
      if (newItems.length > 0) {
        recordIntrudersFromDetection(newItems, 'background_service');
        const latest = newItems[0];
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLatestIntruderTimestamp(nowStr);
        const bodyText = `새로운 낯선 기기 감지: ${latest.ip} (${latest.device?.vendor || '알 수 없음'})`;
        showToast(`🚨 ${bodyText}`);
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🚨 Grid IP Scanner2 - 낯선 기기 감지 알림', {
              body: bodyText,
              icon: './logo.png'
            });
          } catch (_) {}
        }
      }
    }
    if (detectedIntruders.length > 0) {
      recordIntrudersFromDetection(detectedIntruders, 'background_service');
      if (!latestIntruderTimestamp) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLatestIntruderTimestamp(nowStr);
      }
    }
    if (!isScanning) {
      prevIntrudersCountRef.current = detectedIntruders.length;
    }
  }, [intruderWatchMode, isScanning, detectedIntruders, latestIntruderTimestamp]);

  const handleExportCSV = (mode: 'active' | 'all' = 'active') => {
    const allResults = Object.values(results) as ScanResult[];
    const exportData = mode === 'active' 
      ? allResults.filter(r => r.status === 'active')
      : allResults; // Include everything (active, inactive, idle) for 'all' mode

    if (exportData.length === 0) {
      showToast(mode === 'active' 
        ? (lang === 'ko' ? "내보낼 온라인 활성 장비가 없습니다. 먼저 스캔을 실행하세요." : (s.noData || "No active devices to export."))
        : (lang === 'ko' ? "내보낼 스캔 데이터가 없습니다. 먼저 스캔을 실행하세요." : (s.noData || "No scan data to export.")));
      return;
    }

    const headers = ["IP Address", "Status", "MAC Address", "Real Brand", "Chipset (OUI)", "Hostname", "Name Source", "Latency (ms)", "Open Ports", "Device Type", "Model", "OS"];
    const rows = exportData.map(r => {
      const classification = classifyDevice(r.device?.vendor || "", r.device?.openPorts || [], s, {
        ip: r.ip,
        hostname: r.device?.hostname,
        mdns: r.device?.mdns,
        webTitle: r.device?.webTitle,
        upnp: r.device?.upnp,
        snmp: r.device?.snmp,
        mac: r.device?.mac,
        realVendor: r.device?.realVendor,
        chipsetVendor: r.device?.chipsetVendor,
        vendorSource: r.device?.vendorSource,
        ouiBlockType: r.device?.ouiBlockType,
        ouiPrefix: r.device?.ouiPrefix,
        isRandomizedMac: r.device?.isRandomizedMac,
        lang
      });
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      
      return [
        escape(r.ip),
        escape(r.status),
        escape(r.device?.mac || ""),
        escape(r.device?.realVendor || r.device?.vendor || ""),
        escape(r.device?.chipsetVendor || r.device?.vendor || ""),
        escape(r.device?.hostname || ""),
        escape(r.device?.nameSource || "UNKNOWN"),
        escape(r.device?.latency || 0),
        escape((r.device?.openPorts || []).join(', ')),
        escape(classification.type),
        escape(r.device?.deviceModel || classification.model || ""),
        escape(classification.os)
      ];
    });

    const now = new Date();
    const metaHeader = [
      `"${s.csv.reportTitle}"`,
      `"${s.csv.exportDate}: ${now.toLocaleString()}"`,
      `"${s.subnet}: ${config.subnet}"`,
      `"${s.start}-${s.end}: ${config.start}-${config.end}"`,
      `"${s.deepScan}: ${deepScan}"`,
      `"${s.scanDelay}: ${scanMode === 'fast' ? '0' : scanMode === 'standard' ? '10' : '50'}ms"`,
      `"${s.timeout}: ${scanMode === 'fast' ? '500' : scanMode === 'standard' ? '1000' : '2000'}ms"`,
      `"${s.csv.totalActive}: ${activeCount}"`,
      ""
    ].join('\n');

    const csvContent = metaHeader + [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.setAttribute("download", `Grid_Scan_${mode}_${dateStr}_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGrid = () => {
    const allResults = Object.values(results) as ScanResult[];
    if (allResults.length === 0) {
      showToast(lang === 'ko' ? "내보낼 스캔 그리드 데이터가 없습니다. 먼저 스캔을 실행하세요." : (s.noData || "No scan data to export."));
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleString();
    
    const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grid Scan2 Report - ${dateStr}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #1e1f22;
      --sidebar: #2b2d31;
      --text: #dbdee1;
      --text-muted: #949ba4;
      --accent: #5865f2;
      --emerald: #10b981;
      --amber: #f59e0b;
    }
    body { 
      font-family: 'Inter', sans-serif; 
      background: var(--bg); 
      color: var(--text); 
      margin: 0; 
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container { width: 100%; max-width: 1000px; }
    header { 
      margin-bottom: 40px; 
      border-bottom: 1px solid rgba(255,255,255,0.05); 
      padding-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title-group h1 { font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1px; color: #fff; }
    .title-group p { font-size: 12px; color: var(--text-muted); margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .meta-group { text-align: right; font-size: 12px; color: var(--text-muted); }
    .meta-item { margin-bottom: 4px; }
    .meta-value { color: #fff; font-family: 'JetBrains Mono', monospace; }

    .grid { 
      display: grid; 
      grid-template-columns: repeat(16, 1fr); 
      gap: 4px; 
      background: rgba(0,0,0,0.2);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .cell { 
      aspect-ratio: 1; 
      border-radius: 2px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 11px; 
      font-weight: 900; 
      font-family: 'JetBrains Mono', monospace;
      position: relative;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .cell.active { 
      background: rgba(16, 185, 129, 0.15); 
      border-color: rgba(16, 185, 129, 0.3); 
      color: #34d399; 
      box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.1);
    }
    .cell.inactive { opacity: 0.15; background: rgba(255,255,255,0.05); }
    .cell.idle { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); color: rgba(255,255,255,0.2); }
    
    .cell:hover { transform: scale(1.2); z-index: 10; border-color: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
    
    .tooltip {
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      background: #2b2d31;
      border: 1px solid #3f4147;
      padding: 10px;
      border-radius: 6px;
      width: 180px;
      font-size: 10px;
      color: #fff;
      display: none;
      pointer-events: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 100;
    }
    .cell:hover .tooltip { display: block; }
    .tooltip-title { font-weight: 900; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 5px; display: flex; justify-content: space-between; }
    .tooltip-row { display: flex; flex-direction: column; margin-bottom: 4px; }
    .tooltip-label { font-size: 8px; text-transform: uppercase; opacity: 0.5; font-weight: 900; }
    .tooltip-value { font-weight: 700; color: var(--accent); }

    .legend { margin-top: 40px; display: flex; gap: 24px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .legend-item { display: flex; align-items: center; gap: 8px; opacity: 0.7; }
    .box { width: 14px; height: 14px; border-radius: 3px; }
    
    .footer { margin-top: 60px; text-align: center; font-size: 10px; opacity: 0.3; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1>GRID SCAN2 REPORT</h1>
        <p>Network Infrastructure Scan</p>
      </div>
      <div class="meta-group">
        <div class="meta-item">${s.csv.exportDate}: <span class="meta-value">${dateStr}</span></div>
        <div class="meta-item">${s.subnet}: <span class="meta-value">${config.subnet}.0/24</span></div>
        <div class="meta-item">${s.csv.totalActive}: <span class="meta-value">${activeCount}</span></div>
      </div>
    </header>

    <div class="grid">
      ${allIps.map(ip => {
        const r = results[ip];
        const lastOctet = ip.split('.').pop();
        const device = r.device;
        return `
          <div class="cell ${r.status}">
            ${lastOctet}
            ${r.status === 'active' && device ? `
              <div class="tooltip">
                <div class="tooltip-title">
                  <span>${ip}</span>
                  <span style="color: #10b981;">●</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">${s.networkIdentity}</span>
                  <span class="tooltip-value">${device.hostname || 'Unknown'}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">${s.macInfo}</span>
                  <span class="tooltip-value" style="color: #fff;">${device.vendor || 'Unknown'}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">MAC</span>
                  <span class="tooltip-value" style="color: #fff; font-family: monospace;">${device.mac || 'Unknown'}</span>
                </div>
                ${device.mdns ? `
                <div class="tooltip-row">
                  <span class="tooltip-label">mDNS</span>
                  <span class="tooltip-value" style="color: #0ea5e9;">${device.mdns}</span>
                </div>` : ''}
                ${device.upnp ? `
                <div class="tooltip-row">
                  <span class="tooltip-label">UPnP</span>
                  <span class="tooltip-value" style="color: #a855f7;">${device.upnp}</span>
                </div>` : ''}
                ${device.snmp ? `
                <div class="tooltip-row">
                  <span class="tooltip-label">SNMP</span>
                  <span class="tooltip-value" style="color: #f59e0b;">${device.snmp}</span>
                </div>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <div class="legend">
      <div class="legend-item"><div class="box" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4);"></div> ${s.active}</div>
      <div class="legend-item"><div class="box" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"></div> ${s.all}</div>
    </div>

    <div class="footer">
      GENERATED BY GRID IP SCANNER2
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateFileName = now.toISOString().split('T')[0];
    const timeFileName = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.setAttribute("download", `Grid_${dateFileName}_${timeFileName}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcelGrid = () => {
    const allResults = Object.values(results) as ScanResult[];
    if (allResults.length === 0) {
      showToast(lang === 'ko' ? "내보낼 엑셀 그리드 데이터가 없습니다. 먼저 스캔을 실행하세요." : (s.noData || "No scan data to export."));
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleString();
    
    // Create a 16x16 table structure (or appropriate size based on range)
    const subnet = config.subnet;
    const rows: string[] = [];
    
    // Group IPs into rows of 16, with two uniform Excel rows per grid block to prevent vertical displacement
    for (let i = 0; i < 16; i++) {
      let ipRowHtml = '<tr>';
      let infoRowHtml = '<tr>';

      for (let j = 0; j < 16; j++) {
        const index = i * 16 + j;
        const octet = config.start + index;
        if (octet > config.end) {
          ipRowHtml += '<td style="border: 1px solid #ccc; width: 90px; height: 45px; background: #f9f9f9;"></td>';
          infoRowHtml += '<td style="border: 1px solid #ccc; width: 90px; height: 45px; background: #f9f9f9;"></td>';
          continue;
        }
        
        const ip = `${subnet}.${octet}`;
        const r = results[ip];
        
        let bgColor = '#ffffff';
        let textColor = '#999999';
        let fontWeight = 'normal';
        
        if (r?.status === 'active') {
          bgColor = '#d1fae5'; // emerald-100
          textColor = '#065f46'; // emerald-800
          fontWeight = 'bold';
        } else if (r?.status === 'inactive') {
          bgColor = '#f3f4f6'; // gray-100
          textColor = '#d1d5db'; // gray-300
        }

        const isSelf = ip === localIpInfo?.ip;
        if (isSelf) {
          bgColor = '#e0f2fe'; // sky-100
          textColor = '#0369a1'; // sky-700
          fontWeight = '900';
        }

        // Top Cell (IP Address header)
        ipRowHtml += `
          <td style="border: 1px solid #ccc; border-bottom: none; width: 90px; height: 45px; text-align: center; vertical-align: bottom; background-color: ${bgColor}; color: ${textColor}; font-family: sans-serif; font-size: 20px; font-weight: ${fontWeight}; padding-bottom: 2px;">
            ${octet}${isSelf ? ' (YOU)' : ''}
          </td>`;

        // Bottom Cell (Hostname / description)
        const infoText = r?.device?.hostname || '';
        infoRowHtml += `
          <td style="border: 1px solid #ccc; border-top: none; width: 90px; height: 45px; text-align: center; vertical-align: top; background-color: ${bgColor}; color: #555555; font-family: sans-serif; font-size: 13px; font-weight: normal; padding-top: 2px; word-break: break-all;">
            ${infoText}
          </td>`;
      }
      ipRowHtml += '</tr>';
      infoRowHtml += '</tr>';
      rows.push(ipRowHtml);
      rows.push(infoRowHtml);
    }

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Grid Scan2 Report</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    .title { font-size: 40pt; font-weight: bold; font-family: sans-serif; }
    .meta { font-size: 20pt; font-family: sans-serif; color: #666; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="16" class="title">GRID SCAN2 REPORT</td></tr>
    <tr><td colspan="16" class="meta">${s.csv.exportDate}: ${dateStr}</td></tr>
    <tr><td colspan="16" class="meta">${s.subnet}: ${config.subnet}.0/24</td></tr>
    <tr><td colspan="16" class="meta">${s.csv.totalActive}: ${activeCount}</td></tr>
    <tr><td colspan="16"></td></tr>
    ${rows.join('')}
  </table>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateFileName = now.toISOString().split('T')[0];
    const timeFileName = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.setAttribute("download", `Excel_Grid_${dateFileName}_${timeFileName}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOUIAutoUpdate = async () => {
    setRegistryMeta(prev => ({ ...prev, isSyncing: true }));
    try {
      showToast(s.ouiDownloading || "OUI 데이터(IEEE & Wireshark) 다운로드 및 검증 중...");
      const res = await fetch(getApiUrl('/api/oui/auto-update'), {
        method: 'POST'
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast(data.message || s.ouiUpdateSuccess);
        syncOUI();
      } else if (res.status === 502 || res.status === 503) {
        showToast(data?.error || s.ouiNetworkError || s.ouiUpdateFail);
        setRegistryMeta(prev => ({ ...prev, isSyncing: false }));
      } else {
        showToast(data?.error || s.ouiUpdateFail);
        setRegistryMeta(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (err) {
      showToast(s.ouiNetworkError || s.updateError);
      setRegistryMeta(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleOUIFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const res = await fetch(getApiUrl('/api/oui/update'), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: content
        });
        if (res.ok) {
          showToast(s.ouiUpdateSuccess);
          syncOUI();
        } else {
          showToast(s.ouiUpdateFail);
        }
      } catch (err) {
        showToast(s.updateError);
      }
    };
    reader.readAsText(file);
  };

  const activeCount = useMemo(() => (Object.values(results) as ScanResult[]).filter(r => r.status === 'active').length, [results]);
  const completedCount = useMemo(() => processedIPs.size, [processedIPs]);
  const totalCount = useMemo(() => config.end - config.start + 1, [config.start, config.end]);
  const progressPercent = useMemo(() => totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0, [completedCount, totalCount]);

  // Real-time Tray Status Message: Displays scan progress or latest intruder detection timestamp directly in tray
  const trayStatusMessage = useMemo(() => {
    if (isScanning) {
      return lang === 'ko'
        ? `스캔 진행 중: ${progressPercent}% (${completedCount}/${totalCount} IP)`
        : `Scan progress: ${progressPercent}% (${completedCount}/${totalCount} IPs)`;
    }
    if (detectedIntruders.length > 0) {
      return lang === 'ko'
        ? `낯선 기기 ${detectedIntruders.length}대 감지${latestIntruderTimestamp ? ` (최근 감지: ${latestIntruderTimestamp})` : ''}`
        : `${detectedIntruders.length} intruder(s) detected${latestIntruderTimestamp ? ` (Detected at: ${latestIntruderTimestamp})` : ''}`;
    }
    if (intruderWatchMode) {
      return lang === 'ko'
        ? `24/7 낯선 기기 무인 감시 가동 중${latestIntruderTimestamp ? ` (이전 감지: ${latestIntruderTimestamp})` : ' (정상)'}`
        : `24/7 Intruder Watch active${latestIntruderTimestamp ? ` (Last: ${latestIntruderTimestamp})` : ' (Clear)'}`;
    }
    return lang === 'ko' ? '시스템 트레이 대기 중 (정상)' : 'System Tray Standby (Ready)';
  }, [isScanning, progressPercent, completedCount, totalCount, detectedIntruders.length, latestIntruderTimestamp, intruderWatchMode, lang]);

  const allIps = useMemo(() => Object.keys(results).sort((a, b) => parseInt(a.split('.').pop()!) - parseInt(b.split('.').pop()!)), [results]);
  const filteredIps = useMemo(() => {
    let ips = allIps.filter(ip => {
      const item = results[ip];
      const alias = getDeviceAlias(item.device?.mac, ip);

      // Custom Filter Mode (all / active / conflict / intruder / soft_trust / alias)
      if (customFilterMode === 'active' && item.status !== 'active') return false;
      if (customFilterMode === 'conflict' && !detectedConflicts.has(ip)) return false;
      if (customFilterMode === 'intruder' && !detectedIntruders.some(d => d.ip === ip)) return false;
      if (customFilterMode === 'soft_trust' && !softTrustedDevices.some(d => d.ip === ip)) return false;
      if (customFilterMode === 'alias' && !alias?.nickname) return false;

      if (!searchTerm) return true;
      const s_term = searchTerm.toLowerCase();
      const classification = classifyDevice(item.device?.vendor || "", item.device?.openPorts || [], s, {
        ip,
        hostname: item.device?.hostname,
        mdns: item.device?.mdns,
        webTitle: item.device?.webTitle,
        upnp: item.device?.upnp,
        snmp: item.device?.snmp,
        mac: item.device?.mac,
        realVendor: item.device?.realVendor,
        chipsetVendor: item.device?.chipsetVendor,
        vendorSource: item.device?.vendorSource,
        ouiBlockType: item.device?.ouiBlockType,
        ouiPrefix: item.device?.ouiPrefix,
        isRandomizedMac: item.device?.isRandomizedMac,
        lang
      });
      return ip.includes(s_term) || 
             item.device?.vendor?.toLowerCase().includes(s_term) || 
             (item.device?.realVendor && item.device.realVendor.toLowerCase().includes(s_term)) ||
             (item.device?.chipsetVendor && item.device.chipsetVendor.toLowerCase().includes(s_term)) ||
             item.device?.hostname?.toLowerCase().includes(s_term) ||
             item.device?.mac?.toLowerCase().includes(s_term) ||
             classification.type.toLowerCase().includes(s_term) ||
             (classification.deviceCategory && classification.deviceCategory.toLowerCase().includes(s_term)) ||
             (classification.ouiBlockType && classification.ouiBlockType.toLowerCase().includes(s_term)) ||
             (classification.isRandomizedMac && (s_term.includes('random') || s_term.includes('랜덤') || s_term.includes('laa'))) ||
             (classification.model && classification.model.toLowerCase().includes(s_term)) ||
             (item.device?.deviceModel && item.device.deviceModel.toLowerCase().includes(s_term)) ||
             (alias?.nickname && alias.nickname.toLowerCase().includes(s_term)) ||
             (alias?.notes && alias.notes.toLowerCase().includes(s_term));
    });

    if (sortMode === 'status') {
      ips.sort((a, b) => {
        const sA = results[a].status === 'active' ? 1 : 0;
        const sB = results[b].status === 'active' ? 1 : 0;
        if (sA !== sB) return sB - sA;
        return parseInt(a.split('.').pop()!) - parseInt(b.split('.').pop()!);
      });
    } else if (sortMode === 'name') {
      ips.sort((a, b) => {
        const nameA = (results[a].device?.hostname || results[a].device?.vendor || '').toLowerCase();
        const nameB = (results[b].device?.hostname || results[b].device?.vendor || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return parseInt(a.split('.').pop()!) - parseInt(b.split('.').pop()!);
      });
    }
    return ips;
  }, [allIps, results, searchTerm, s, sortMode]);

  const t = {
    dark: { bg: 'bg-zinc-950', sidebar: 'bg-zinc-900 border-zinc-800', main: 'bg-zinc-950', header: 'bg-zinc-900/90 border-zinc-800 backdrop-blur-md', text: 'text-zinc-100', textMuted: 'text-zinc-300', input: 'bg-zinc-950 border-zinc-700 text-zinc-100', panel: 'bg-zinc-900 border-zinc-800', accent: 'text-emerald-400' },
    gray: { bg: 'bg-[#1e1f22]', sidebar: 'bg-[#2b2d31] border-[#18191c]', main: 'bg-[#313338]', header: 'bg-[#2b2d31]/90 border-[#18191c] backdrop-blur-md', text: 'text-[#f2f3f5]', textMuted: 'text-[#c2c7d0]', input: 'bg-[#1e1f22] border-[#383a40] text-[#f2f3f5]', panel: 'bg-[#2b2d31] border-[#18191c]', accent: 'text-[#5865f2]' },
    white: { bg: 'bg-slate-100', sidebar: 'bg-white border-slate-200 shadow-xs', main: 'bg-slate-50', header: 'bg-white/95 border-slate-200 backdrop-blur-md shadow-xs', text: 'text-slate-900', textMuted: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-900', panel: 'bg-white border-slate-200 shadow-xl', accent: 'text-sky-600' },
    beige: { bg: 'bg-[#faf5eb]', sidebar: 'bg-[#ebdcb9] border-[#d4be9c]', main: 'bg-[#faf5eb]', header: 'bg-[#ebdcb9]/95 border-[#d4be9c] backdrop-blur-md', text: 'text-[#1a0f05]', textMuted: 'text-[#422e1b]', input: 'bg-[#ffffff] border-[#c8ae95] text-[#1a0f05]', panel: 'bg-[#ebdcb9] border-[#d4be9c] shadow-xl backdrop-blur-md', accent: 'text-[#853a03]' }
  }[theme];

  const themeName = {
    dark: lang === 'ko' ? '다크' : 'Dark',
    gray: lang === 'ko' ? '그레이' : 'Gray',
    white: lang === 'ko' ? '화이트' : 'White',
    beige: lang === 'ko' ? '베이지' : 'Beige',
  }[theme];

  const themeIcon = {
    dark: <Moon className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
    gray: <Square className="w-3.5 h-3.5 text-zinc-300 shrink-0" />,
    white: <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
    beige: <Sun className="w-3.5 h-3.5 text-amber-700 shrink-0" />
  }[theme];

  const themeBtnClass = {
    dark: 'bg-slate-900 border-white/10 text-zinc-300 hover:bg-slate-800 hover:text-white',
    gray: 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white',
    white: 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 shadow-xs',
    beige: 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37] hover:bg-[#f5ebd6] hover:text-[#3d2711]'
  }[theme];

  const sortModeLabel = sortMode === 'ip' ? (lang === 'ko' ? 'IP순' : 'Sort: IP') : sortMode === 'status' ? (lang === 'ko' ? '상태순' : 'Sort: Status') : (lang === 'ko' ? '이름순' : 'Sort: Name');

  return (
    <div 
      style={{
        '--mobile-notch-offset': `${mobileNotchOffset}px`
      } as React.CSSProperties}
      className={`h-screen h-[100dvh] w-full max-w-full flex flex-col md:flex-row ${t.bg} ${t.text} overflow-hidden font-sans transition-all duration-300 mobile-notch-container`}
    >
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:left-auto md:right-4 bg-gray-800 text-white px-4 py-2.5 rounded-xl shadow-2xl z-[250] animate-in fade-in slide-in-from-bottom-4 flex items-center justify-between gap-3 border border-white/10">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[150] md:z-0
        w-72 md:w-64 border-r ${t.sidebar} flex flex-col shrink-0 
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!isSidebarOpen && 'md:w-64'}
      `}>
        <div className="p-3.5 pb-16 md:pb-3.5 flex flex-col h-full overflow-y-auto min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full min-w-0">
              <div className="relative shrink-0 group">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-sky-500/40 shadow-lg shadow-sky-500/20 bg-zinc-950 flex items-center justify-center group-hover:border-sky-400 group-hover:shadow-sky-400/30 transition-all duration-300">
                  <img 
                    src="./logo.png" 
                    alt="Grid IP Scanner2" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                {/* 24/7 Unattended Background Service & Radar Status Indicator Badge */}
                {isWindowsServiceInstalled ? (
                  <div className="absolute -bottom-1 -right-1 flex items-center justify-center" title={lang === 'ko' ? "24/7 Windows 무인 백그라운드 서비스 가동 중 (Session 0)" : "24/7 Windows Unattended Background Service Active (Session 0)"}>
                    <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-zinc-900 shadow-md ring-1 ring-cyan-300/80 items-center justify-center text-[7px] font-black text-black">
                      S
                    </span>
                  </div>
                ) : intruderWatchMode ? (
                  <div className="absolute -bottom-1 -right-1 flex items-center justify-center" title={lang === 'ko' ? "24/7 낯선 기기 무인 감시 모드 활성화됨" : "24/7 Intruder Watch Active"}>
                    <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-zinc-900 shadow-md ring-1 ring-rose-300/80" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-md ring-1 ring-emerald-400/50" title={lang === 'ko' ? "Core Engine Ready (정상 가동)" : "Core Engine Ready"} />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className={`text-sm font-black tracking-tight uppercase leading-snug truncate ${t.text}`} title={s.title}>
                  {s.title}
                </h1>
                <div className="flex items-center justify-between gap-1.5 mt-1.5 flex-wrap">
                  <button
                    onClick={handleManualCheckUpdate}
                    className={`px-2 py-1 rounded text-[9px] font-black flex items-center gap-1 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                      updateInfo?.hasUpdate
                        ? 'bg-emerald-500/25 text-emerald-500 border border-emerald-500/50 hover:bg-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:shadow-[0_0_16px_rgba(16,185,129,0.55)] animate-pulse'
                        : (theme === 'beige' 
                            ? 'bg-[#ffffff] text-[#422e1b] border border-[#c8ae95] hover:bg-[#faf5eb] hover:border-amber-500/50 hover:text-amber-700' 
                            : theme === 'white'
                            ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 hover:text-sky-600 shadow-xs'
                            : 'bg-white/5 hover:bg-white/10 hover:border-sky-500/30 hover:text-sky-400 text-zinc-300 border border-white/10')
                    }`}
                    title={lang === 'ko' ? "GitHub Releases 기반 실시간 업데이트 점검" : "Check for real-time updates via GitHub Releases"}
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-sky-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span>{updateInfo?.hasUpdate ? (lang === 'ko' ? `v${updateInfo.latestVersion} 업데이트` : `v${updateInfo.latestVersion} Update`) : s.checkUpdate}</span>
                  </button>

                  {/* KO / EN Toggle Moved Below Title */}
                  <div className="flex bg-black/15 dark:bg-white/10 rounded-md p-0.5 shrink-0 border border-black/10 dark:border-white/10 shadow-inner">
                    <button 
                      onClick={() => setLang('ko')} 
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${lang === 'ko' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                      title={lang === 'ko' ? '한국어로 전환' : 'Switch to Korean'}
                    >
                      KO
                    </button>
                    <button 
                      onClick={() => setLang('en')} 
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${lang === 'en' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                      title={lang === 'ko' ? '영문으로 전환 (Switch to English)' : 'Switch to English'}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg shrink-0 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col mb-4 space-y-2">
            {/* Row 1: Admin Mode Elevation Badge + Reset Button */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="relative group shrink-0">
                {!isAdmin ? (
                  <button
                    onClick={handleElevateAdmin}
                    disabled={isElevating}
                    className="px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-tight whitespace-nowrap cursor-pointer bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs"
                  >
                    <Key className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{s.standardMode}</span>
                  </button>
                ) : (
                  <div className="px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-tight whitespace-nowrap bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{s.adminMode}</span>
                  </div>
                )}
                {!isAdmin && (
                  <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-zinc-800 text-zinc-200 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] border border-white/10 shadow-2xl leading-relaxed">
                    {s.scanLimitedRelaunch}
                    <div className="absolute left-4 bottom-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-zinc-800" />
                  </div>
                )}
              </div>

              <button
                onClick={resetScanState}
                className="px-2.5 py-1 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title={s.resetState}
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>{s.resetBtn}</span>
              </button>
            </div>

            {/* Row 2: Preferences & System Tray Setting Button */}
            <div className="pt-0.5">
              <button
                onClick={() => setShowWindowsUtilModal(true)}
                className="w-full px-2.5 py-1.5 border border-cyan-500/40 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 rounded-lg text-[10px] font-black uppercase whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                title={lang === 'ko' ? "환경설정 및 시스템 트레이 제어 창 열기" : "Open Preferences & System Tray Settings"}
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{lang === 'ko' ? "환경설정 및 시스템 트레이" : "Preferences & Tray"}</span>
              </button>
            </div>
          </div>

          {/* 현재 PC 정보 (Host PC Info) */}
          {localIpInfo && (
            <div className={`mb-5 p-3 rounded-xl border ${
              theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c] text-[#1a0f05] shadow-sm' :
              theme === 'white' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' :
              'bg-white/5 border-white/10 text-slate-100'
            }`}>
              <div className="flex items-center gap-1.5 mb-2 font-black uppercase tracking-wider text-[10px] opacity-90">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className={theme === 'beige' ? 'text-[#1a0f05] font-black' : theme === 'white' ? 'text-slate-900 font-black' : 'text-slate-100'}>{s.hostPcInfo}</span>
              </div>
              <div className="space-y-1.5 text-[10.5px]">
                {localIpInfo.computerName && (
                  <div className="flex justify-between items-center">
                    <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : theme === 'white' ? 'text-slate-600 font-bold' : 'opacity-70'}>{s.computerName}</span>
                    <span className="font-extrabold text-sky-600 dark:text-sky-400 max-w-[130px] truncate" title={localIpInfo.computerName}>{localIpInfo.computerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : theme === 'white' ? 'text-slate-600 font-bold' : 'opacity-70'}>{s.ipAddress}</span>
                  <span className="font-black mono">{localIpInfo.ip}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : theme === 'white' ? 'text-slate-600 font-bold' : 'opacity-70'}>{s.subnetTarget}</span>
                  <span className="font-black mono">{localIpInfo.subnet}.0/24</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1">
            <div className={`space-y-4 p-3.5 rounded-xl border ${
              theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c]' :
              theme === 'white' ? 'bg-white border-slate-200 shadow-xs' :
              'bg-black/10 border-white/5'
            }`}>
              <div className="flex items-center justify-between relative group">
                <div className="flex items-center gap-1.5">
                  <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.deepScan}</label>
                  <Info className="w-3.5 h-3.5 opacity-50 cursor-help" />
                </div>
                <button 
                  onClick={() => setDeepScan(!deepScan)}
                  className={`w-10 h-5 rounded-full transition-all relative ${deepScan ? 'bg-sky-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${deepScan ? 'left-5.5' : 'left-0.5'}`} />
                </button>
                <div className="absolute left-0 top-full mt-3 w-full p-3 bg-zinc-800 text-zinc-200 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10 shadow-2xl leading-relaxed">
                  {s.deepScanDesc}
                  <div className="absolute left-10 bottom-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-zinc-800" />
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.scanModeLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setScanMode('fast')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      scanMode === 'fast' 
                        ? 'bg-sky-500/20 border-sky-500/60 text-sky-600 dark:text-sky-400 font-black shadow-sm' 
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 font-bold shadow-xs' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
                    }`}
                  >
                    <Zap className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black uppercase">{s.scanFast}</span>
                  </button>
                  <button
                    onClick={() => setScanMode('standard')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      scanMode === 'standard' 
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 font-black shadow-sm' 
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 font-bold shadow-xs' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
                    }`}
                  >
                    <Activity className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black uppercase">{s.scanStandard}</span>
                  </button>
                  <button
                    onClick={() => setScanMode('precision')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      scanMode === 'precision' 
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-400 font-black shadow-sm' 
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 font-bold shadow-xs' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
                    }`}
                  >
                    <Search className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black uppercase">{s.scanPrecision}</span>
                  </button>
                </div>
                
                <div className={`p-2.5 rounded-lg border ${
                  theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#1a0f05] shadow-sm' : 
                  theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs' :
                  scanMode === 'fast' ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 
                  scanMode === 'standard' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 
                  'bg-amber-500/10 border-amber-500/20 text-amber-200'
                }`}>
                  <p className={`text-[9.5px] leading-relaxed font-bold ${
                    theme === 'beige' ? 'text-[#2c1d11]' :
                    theme === 'white' ? 'text-slate-700' :
                    'opacity-90'
                  }`}>
                    {scanMode === 'fast' && s.scanFastDesc}
                    {scanMode === 'standard' && s.scanStandardDesc}
                    {scanMode === 'precision' && s.scanPrecisionDesc}
                  </p>
                </div>
              </div>

              {/* Mobile Notch & Top Camera Hole Margin Control (Hidden on PC/Desktop) */}
              <div className="md:hidden space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <label className={`text-[10.5px] font-black ${t.textMuted} uppercase tracking-wider`}>
                      {lang === 'ko' ? '상단 카메라 홀 여백' : 'Top Camera Notch'}
                    </label>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400">{mobileNotchOffset}px</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[9.5px]">
                  {[0, 16, 28, 40].map((pxVal) => (
                    <button
                      key={pxVal}
                      type="button"
                      onClick={() => handleToggleNotchOffset(pxVal)}
                      className={`py-1 rounded font-black border transition-all cursor-pointer ${
                        mobileNotchOffset === pxVal
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-xs'
                          : (theme === 'beige' ? 'bg-white border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb]' : theme === 'white' ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
                      }`}
                      title={lang === 'ko' ? `상단 여백 ${pxVal}px로 설정 (전면 카메라 홀 피함)` : `Set top margin to ${pxVal}px`}
                    >
                      {pxVal}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Network Adapter & Filter Selection */}
            <div className={`p-3 rounded-xl border ${
              theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c] text-[#1a0f05] shadow-sm' :
              theme === 'white' ? 'bg-white border-slate-200 text-slate-900 shadow-xs' :
              'bg-black/10 border-white/5'
            } space-y-2.5`}>
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest flex items-center gap-1.5`}>
                  <Network className="w-3.5 h-3.5 text-sky-400" />
                  <span>{s.interface}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-mono font-bold">
                    {interfaces.length}
                  </span>
                </label>
                <button
                  onClick={() => setShowInterfaceModal(true)}
                  className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline transition-colors"
                  title={s.openAdapterManager}
                >
                  <Sliders className="w-3 h-3" />
                  <span>{s.all} ({interfaces.length})</span>
                </button>
              </div>

              {/* Quick Filter Pill Buttons */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'all', label: s.all },
                  { key: 'up', label: 'UP' },
                  { key: 'physical', label: s.typePhysical?.split(' ')[0] || '물리' },
                  { key: 'virtual', label: s.typeVirtual?.split(' ')[0] || '가상' },
                  { key: 'has_ipv4', label: 'IPv4' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setInterfaceFilter(tab.key as any)}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                      interfaceFilter === tab.key
                        ? 'bg-sky-600 text-white shadow-sm'
                        : (theme === 'beige' ? 'bg-[#f0e2be] hover:bg-[#e2ceaa] text-[#1a0f05] font-bold border border-[#d4be9c]' : theme === 'white' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-zinc-300')
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Interface Select Dropdown */}
              {filteredInterfaces.length > 0 ? (
                <select 
                  onChange={(e) => {
                    const iface = interfaces.find(i => i.ip === e.target.value || i.name === e.target.value);
                    if (iface) {
                      if (iface.subnet) {
                        setConfig(prev => ({ ...prev, subnet: iface.subnet }));
                      }
                      setLocalIpInfo(prev => ({ ip: iface.ip || prev?.ip || '', subnet: iface.subnet || prev?.subnet || '', computerName: prev?.computerName }));
                      selectedInterfaceIpRef.current = iface.ip || null;
                      showToast(`${iface.name} (${iface.ip || 'No IP'}) 선택됨`);
                    }
                  }}
                  value={localIpInfo?.ip || (filteredInterfaces[0]?.ip || '')}
                  className={`w-full ${t.input} rounded-lg px-2.5 py-2 text-[11px] font-bold focus:outline-none transition-all cursor-pointer truncate shadow-sm`}
                >
                  {filteredInterfaces.map(iface => (
                    <option key={`${iface.name}-${iface.ip}`} value={iface.ip || iface.name}>
                      {iface.status === 'up' ? '●' : '○'} [{iface.type.toUpperCase()}] {iface.name} {iface.ip ? `(${iface.ip})` : '(No IPv4)'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>{s.noMatchingAdapters}</span>
                  <button 
                    onClick={() => setInterfaceFilter('all')}
                    className="text-[9px] underline font-bold"
                  >
                    {lang === 'ko' ? '초기화' : 'Reset'}
                  </button>
                </div>
              )}

              {/* Open Deep Inspector Button */}
              <button
                onClick={() => setShowInterfaceModal(true)}
                className={`w-full py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'beige' 
                    ? 'bg-[#ffffff] border-[#c8ae95] hover:bg-[#faf5eb] text-[#1a0f05] shadow-sm' 
                    : theme === 'white'
                    ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-xs'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200'
                }`}
              >
                <Filter className="w-3 h-3 text-sky-400" />
                <span>{s.openAdapterManager}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.subnet}</label>
              <input 
                type="text" 
                value={config.subnet}
                onChange={(e) => setConfig({...config, subnet: e.target.value})}
                className={`w-full ${t.input} rounded-md px-2.5 py-2 text-[12px] mono font-bold focus:outline-none transition-all`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.start}</label>
                <input 
                  type="number" 
                  min="0" max="255"
                  value={config.start}
                  onChange={(e) => setConfig({...config, start: parseInt(e.target.value) || 0})}
                  className={`w-full ${t.input} rounded-md px-2.5 py-2 text-[12px] mono font-bold focus:outline-none transition-all`}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.end}</label>
                <input 
                  type="number" 
                  min="0" max="255"
                  value={config.end}
                  onChange={(e) => setConfig({...config, end: parseInt(e.target.value) || 0})}
                  className={`w-full ${t.input} rounded-md px-2.5 py-2 text-[12px] mono font-bold focus:outline-none transition-all`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between px-3 py-2 ${
              theme === 'white' ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-black/10 border-white/5'
            } rounded-lg border group relative`}>
              <div className="flex items-center gap-1.5">
                <label className={`text-[11px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.keepResults}</label>
              </div>
              <button 
                onClick={() => setMergeResults(!mergeResults)}
                className={`w-10 h-5 rounded-full transition-all relative ${mergeResults ? 'bg-sky-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${mergeResults ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>

            <button
              onClick={() => {
                if (isScanning) {
                  handleStopScan();
                } else {
                  startScan();
                }
              }}
              className={`w-full py-3 rounded-lg font-black text-[12px] transition-all uppercase tracking-tight shadow-xl ${
                isScanning ? 'bg-rose-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isScanning ? s.stopScan : (hasStartedScan ? s.restartScan : s.startScan)}
            </button>

            {/* Quick Scheduler Access in Sidebar */}
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className={`w-full py-2 px-2.5 rounded-lg border text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-between ${
                activeScheduleCount > 0
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                  : (theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37] hover:bg-[#faf5eb]' : theme === 'white' ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10')
              }`}
              title={lang === 'ko' ? '정기 자동 스케줄러 열기' : 'Open Recurring Scan Scheduler'}
            >
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${activeScheduleCount > 0 ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{s.scheduler || '정기 자동 스케줄러'}</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                activeScheduleCount > 0 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {activeScheduleCount > 0 ? `${activeScheduleCount}${lang === 'ko' ? '개 가동' : ' ON'}` : (lang === 'ko' ? '설정' : 'OFF')}
              </span>
            </button>

            <div className="space-y-4 pt-3 border-t border-white/5">
              <div className="flex flex-col space-y-2 px-1">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.author}</span>
                  <span className="text-[10px] font-bold opacity-90">AhBiYout</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.version}</span>
                  <span className="text-[10px] font-black text-sky-500">{CURRENT_APP_VERSION}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.github || 'GitHub'}</span>
                  <a href="https://github.com/AhBiYout-all/grid-ip-scanner2" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-500 hover:underline flex items-center gap-1">
                    <Github className="w-2.5 h-2.5" />
                    <span>AhBiYout-all/grid-ip-scanner2</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.blog}</span>
                  <a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-500 hover:underline">ahbiyoutvibe.blogspot.com</a>
                </div>
                <button 
                  onClick={() => setShowSecurityNotice(true)}
                  className={`mt-1.5 flex items-center justify-center space-x-2 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-[9px] font-black uppercase tracking-widest text-emerald-500 w-full`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{s.securityNotice}</span>
                </button>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' :
                theme === 'white' ? 'bg-white border-slate-200 text-slate-800 shadow-xs' :
                'bg-slate-950/50 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                   <label className={`text-[10px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.ouiDb}</label>
                   <div className="flex items-center space-x-2">
                      <button 
                        onClick={handleOUIAutoUpdate}
                        disabled={registryMeta.isSyncing}
                        className={`p-0.5 opacity-50 hover:opacity-100 transition-opacity ${registryMeta.isSyncing ? 'animate-pulse' : ''}`}
                        title={s.autoUpdateIeee}
                      >
                        <CloudDownload className="w-3.5 h-3.5 text-sky-500" />
                      </button>
                      <label className="p-0.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" title={s.uploadLocalOui}>
                        <Download className="w-3.5 h-3.5" />
                        <input type="file" accept=".txt" className="hidden" onChange={handleOUIFileUpload} />
                      </label>
                      <button onClick={() => setShowSourceInfo(true)} className="p-0.5 opacity-50 hover:opacity-100 transition-opacity"><Info className="w-3.5 h-3.5" /></button>
                      <button 
                          onClick={syncOUI} 
                          disabled={registryMeta.isSyncing}
                          className={`p-0.5 rounded hover:bg-white/10 transition-colors ${registryMeta.isSyncing ? 'animate-spin opacity-50' : 'opacity-70'}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </div>
                <div className="flex items-center space-x-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    registryMeta.isSyncing 
                      ? 'bg-amber-400 animate-ping' 
                      : (registryMeta.count > 0 ? 'bg-emerald-500' : 'bg-red-500')
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    {registryMeta.isSyncing 
                      ? s.syncing 
                      : (registryMeta.count > 0 
                          ? (registryMeta.sourceName.includes('Local Cache') ? s.ouiCacheActive : s.ouiReady) 
                          : s.ouiStatusOffline)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`text-[9px] font-black uppercase ${t.textMuted}`}>{s.records}</span>
                  <span className="text-[11px] font-black mono opacity-80">{registryMeta.count.toLocaleString()}</span>
                </div>
              </div>

              {/* Space-Saving Dropdown Export & Reports Menu */}
              <div className="relative" ref={exportDropdownRef}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className={`text-[10px] font-black ${t.textMuted} uppercase tracking-widest`}>
                    {s.exportDropdownTitle || '내보내기 및 리포트'}
                  </span>
                  <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isExportDropdownOpen
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-sky-500/15 text-sky-400'
                  }`}>
                    {isExportDropdownOpen ? s.expanded : s.clickToExpand}
                  </span>
                </div>

                {/* Primary Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExportDropdownOpen(prev => {
                      const next = !prev;
                      if (next) {
                        setTimeout(() => {
                          const el = exportDropdownRef.current;
                          if (!el) return;
                          const scrollParent = el.closest('.overflow-y-auto') as HTMLElement | null;
                          if (scrollParent) {
                            const targetScroll = el.offsetTop + el.offsetHeight - scrollParent.clientHeight + 24;
                            if (targetScroll > scrollParent.scrollTop) {
                              scrollParent.scrollTo({ top: targetScroll, behavior: 'smooth' });
                            }
                          } else {
                            el.scrollIntoView({ behavior: 'smooth', block: 'end' });
                          }
                        }, 80);
                      }
                      return next;
                    });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all shadow-sm group ${
                    isExportDropdownOpen
                      ? 'border-sky-500 bg-sky-500/15 shadow-sky-500/10'
                      : (theme === 'beige'
                          ? 'bg-[#ffffff] border-[#d4be9c] hover:bg-[#faf5eb] text-[#1a0f05]'
                          : theme === 'white'
                          ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-xs'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-100')
                  }`}
                  aria-expanded={isExportDropdownOpen}
                  aria-haspopup="true"
                  title={searchTerm ? `내보내기 및 리포트 - "${searchTerm}" 검색 결과 ${filteredIps.length}개 대상 (PDF, Excel, CSV, HTML, 스냅샷)` : "내보내기 및 리포트 메뉴 (PDF 보고서, Excel 그리드, CSV 인벤토리, 대화형 HTML, 네트워크 스냅샷)"}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform shrink-0">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div className="text-left truncate">
                      <div className="text-xs sm:text-[13px] font-black tracking-tight leading-tight flex items-center gap-1.5">
                        <span className="truncate">{s.exportDropdownTitle || '내보내기 및 리포트'}</span>
                        {searchTerm && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500 text-white font-bold animate-pulse shrink-0">
                            {filteredIps.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 opacity-70 group-hover:opacity-100 transition-transform duration-200 shrink-0 ${isExportDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
                </button>

                {/* Unfolded Menu Panel */}
                {isExportDropdownOpen && (
                  <div className={`w-full mt-2 p-2.5 rounded-xl border shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200 space-y-3 ${
                    theme === 'beige'
                      ? 'bg-[#fcf8f2]/98 border-[#d4be9c] text-[#1a0f05]'
                      : theme === 'white'
                      ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
                      : 'bg-slate-900/98 border-slate-700/80 text-zinc-100'
                  }`}>
                    {/* Section 1: PDF Reports */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1.5 py-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted} flex items-center gap-1.5`}>
                          <FileDown className="w-3.5 h-3.5 text-sky-400" />
                          <span>{s.exportSectionPdf || '고품질 PDF 리포트'}</span>
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
                          jsPDF
                        </span>
                      </div>

                      {/* 1.1 Search / Filtered PDF */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportPdf('search'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${filteredIps.length === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={searchTerm ? `"${searchTerm}" 검색 결과 PDF (${filteredIps.length}개 노드) - IP, MAC, 제조사, RTT, 개방 포트` : '현재 검색/필터 결과 PDF 내보내기 - IP, MAC, 제조사, RTT, 개방 포트'}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">
                            {searchTerm ? `"${searchTerm}" 검색 결과 PDF` : (s.exportPdfSearch || '현재 검색/필터 결과 PDF')}
                          </span>
                          {searchTerm && (
                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-sky-500 text-white shrink-0">
                              {filteredIps.length}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 shrink-0 ml-1">
                          PDF
                        </span>
                      </button>

                      {/* 1.2 Active Nodes PDF */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportPdf('active'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${activeCount === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={`온라인 활성 장비 PDF (${activeCount}대) - 응답 활성 단말 인벤토리 종합 보고서`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {s.exportPdfActive || '온라인 활성 장비 PDF'} ({activeCount}대)
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0 ml-1">
                          PDF
                        </span>
                      </button>

                      {/* 1.3 Deep Security Audit PDF */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportPdf('audit'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${activeCount === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title="정밀 보안 감사 보고서 PDF (PRO) - 취약 포트, 위험도 진단, 완화 가이드, OUI 분석"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate text-indigo-400">
                            {s.exportPdfAudit || '정밀 보안 감사 보고서 PDF'}
                          </span>
                        </div>
                        <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 ml-1">
                          PRO PDF
                        </span>
                      </button>

                      {/* 1.4 All Targets PDF */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportPdf('all'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${Object.keys(results).length === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? `전체 스캔 대역 PDF (${allIps.length}개) - 서브넷 전체 IP 노드 현황 종합도` : `Full Scan Range PDF (${allIps.length} nodes) - Subnet IP map`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">
                            {s.exportPdfAll || (lang === 'ko' ? '전체 스캔 대역 PDF' : 'Full Range PDF')} ({allIps.length})
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 shrink-0 ml-1">
                          PDF
                        </span>
                      </button>

                      {/* 1.5 Open Full Modal Wizard */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => setShowPdfExportModal(true))}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left transition-colors text-[11px] text-sky-400 hover:text-sky-300 font-bold cursor-pointer ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/5 active:bg-white/10'
                        }`}
                        title={lang === 'ko' ? "PDF 리포트 센터 모달 마법사 열기 - 상세 커스터마이징 및 다중 옵션 리포트 생성" : "Open PDF Report Center - Detailed customization & options"}
                      >
                        <Layers className="w-3 h-3" />
                        <span>{s.exportOpenModal || (lang === 'ko' ? 'PDF 리포트 센터 (모달 마법사)...' : 'PDF Report Center...')}</span>
                      </button>
                    </div>

                    <div className="border-t border-white/10 dark:border-white/10" />

                    {/* Section 2: Spreadsheet & Raw Data */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1.5 py-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted} flex items-center gap-1.5`}>
                          <Database className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{s.exportSectionData || (lang === 'ko' ? '스프레드시트 및 원시 데이터' : 'Spreadsheets & Raw Data')}</span>
                        </span>
                      </div>

                      {/* 2.1 Excel XLS */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportExcelGrid())}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${Object.keys(results).length === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "Microsoft Excel 스프레드시트 호환 XLS 파일로 저장 (엑셀 16열 색상 그리드 시트)" : "Save as Microsoft Excel compatible XLS file"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate text-emerald-700 dark:text-emerald-400">
                            {s.exportExcelXls || (lang === 'ko' ? 'Excel 스프레드시트 (.xls 그리드)' : 'Excel Spreadsheet (.xls grid)')}
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0 ml-1">
                          XLS
                        </span>
                      </button>

                      {/* 2.2 CSV Active */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportCSV('active'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${activeCount === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "온라인 응답 활성 장비 목록만 CSV 파일로 저장 (IP, 상태, 호스트명, MAC, 제조사)" : "Save active devices only as CSV"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">
                            {s.exportCsvActive || (lang === 'ko' ? 'CSV 내보내기 (온라인 활성 장비)' : 'Export CSV (Active Devices)')} ({activeCount})
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 shrink-0 ml-1">
                          CSV
                        </span>
                      </button>

                      {/* 2.3 CSV All */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportCSV('all'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${Object.keys(results).length === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "서브넷 전체 IP 대역 CSV 파일로 저장 (서브넷 256개 전체 IP 전수 데이터)" : "Save full subnet range as CSV"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Box className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">
                            {s.exportCsvAll || (lang === 'ko' ? 'CSV 내보내기 (전체 스캔 대역)' : 'Export CSV (Full Subnet Range)')}
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 shrink-0 ml-1">
                          CSV
                        </span>
                      </button>
                    </div>

                    <div className="border-t border-white/10 dark:border-white/10" />

                    {/* Section 3: Web Interactive & Security Audit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1.5 py-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted} flex items-center gap-1.5`}>
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{s.exportSectionWeb || (lang === 'ko' ? '웹 대화형 및 보안 감사' : 'Web & Security Audit')}</span>
                        </span>
                      </div>

                      {/* 3.1 Interactive HTML Grid */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportGrid())}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${Object.keys(results).length === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "독립 실행형 브라우저 그리드 파일로 저장하여 웹 브라우저에서 인터랙티브하게 확인" : "Save as standalone interactive HTML grid"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Monitor className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="truncate text-sky-600 dark:text-sky-400">
                            {s.exportHtmlGrid || (lang === 'ko' ? '인터랙티브 웹 HTML 그리드' : 'Interactive Web HTML Grid')}
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 shrink-0 ml-1">
                          HTML
                        </span>
                      </button>

                      {/* 3.2 Security Audit HTML Report */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleExportAuditReport())}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${activeCount === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "웹 브라우저 즉시 인쇄용 HTML 보안 감사 보고서 새 탭에서 열기 (A4 인쇄 최적화)" : "Open printable HTML security audit report in new tab"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate text-indigo-700 dark:text-indigo-300">
                            {s.exportHtmlAudit || (lang === 'ko' ? '보안 감사 보고서 (HTML 즉시 인쇄)' : 'Security Audit Report (Printable HTML)')}
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 shrink-0 ml-1">
                          HTML
                        </span>
                      </button>
                    </div>

                    <div className="border-t border-white/10 dark:border-white/10" />

                    {/* Section 4: Snapshot */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1.5 py-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted} flex items-center gap-1.5`}>
                          <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                          <span>{s.exportSectionSnapshot || (lang === 'ko' ? '네트워크 스냅샷' : 'Network Snapshots')}</span>
                        </span>
                      </div>

                      {/* 4.1 Save Snapshot */}
                      <button
                        type="button"
                        onClick={() => handleExportItemClick(() => handleSaveSnapshot())}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-bold cursor-pointer group ${
                          theme === 'beige' ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/15'
                        } ${activeCount === 0 ? 'opacity-60' : 'opacity-100'}`}
                        title={lang === 'ko' ? "현재 스캔 상태를 기준점 스냅샷으로 저장 (비교 분석 및 변경 감지용 기준점 보관)" : "Save current scan state as baseline snapshot"}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <BookmarkPlus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate text-purple-700 dark:text-purple-300">
                            {s.exportSaveSnapshot || (lang === 'ko' ? '현재 상태 스냅샷 저장 (기준점)' : 'Save Current Snapshot (Baseline)')}
                          </span>
                        </div>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0 ml-1">
                          SNAP
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>


                {showSummary && !isScanning && (
                  <div className={`p-2.5 rounded-lg border ${theme === 'beige' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.summary}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-bold opacity-70 uppercase">{s.found}</span>
                      <span className="text-sm font-black mono">{activeCount}</span>
                    </div>
                  </div>
                )}

                {scanHistory.length > 0 && (
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${t.textMuted} uppercase tracking-widest px-1`}>{s.history}</label>
                    <div className="space-y-1.5">
                      {scanHistory.slice(0, 3).map((h, i) => (
                        <div key={i} className={`p-2 rounded border ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-black/20 border-white/5'} flex justify-between items-center`}>
                          <span className="text-[9px] font-bold opacity-50 truncate max-w-[100px]">{h.date}</span>
                          <span className="text-[11px] font-black text-emerald-500 mono">{h.active}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

      <main className={`flex-1 flex flex-col min-h-0 ${t.main} relative overflow-hidden transition-colors duration-300`}>
        {/* Responsive Header Bar */}
        <header className={`border-b ${t.header} shrink-0 transition-colors`}>
          {/* ================= DESKTOP HEADER (md and above) ================= */}
          <div className="hidden md:flex min-h-[48px] py-1.5 items-center justify-between px-3 lg:px-6 gap-2 flex-wrap">
            {/* Left section: Desktop Scanning Progress */}
            <div className="flex items-center gap-2 shrink-0 min-w-0 flex-wrap">

              {/* Desktop Scanning Indicator */}
              {(isScanning || (hasStartedScan && progressPercent > 0)) && (
                <div className="flex items-center space-x-3 bg-black/20 px-3 py-1 rounded-full border border-white/5 shadow-inner shrink-0">
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>
                      {isScanning ? (
                        <>{s.scanning} <span className="text-amber-500 mono">{Array.from(scanningIPs).slice(-1)[0] || '...'}</span></>
                      ) : (
                        <span className="text-emerald-500">{s.complete}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-28 lg:w-36 h-2 ${theme === 'beige' ? 'bg-amber-100' : 'bg-white/10'} rounded-full overflow-hidden border border-white/5`}>
                      <div 
                        className={`h-full transition-all duration-300 ${isScanning ? 'bg-sky-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-black mono ${isScanning ? 'text-sky-500' : 'text-emerald-500'}`}>{progressPercent}%</span>
                    <span className={`text-[10px] font-black mono pl-2 border-l ${theme === 'beige' ? 'border-[#e6d0a7]' : 'border-white/10'} ${t.textMuted}`}>{formatTime(elapsedTime)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Controls Container */}
            <div className="flex items-center gap-2 shrink-0">
              {/* View Mode Toggle */}
              <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${
                    viewMode === 'grid' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={s.gridMode}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{s.gridMode}</span>
                </button>
                <button
                  onClick={() => {
                    if (snapshots.length === 0 && Object.values(results).some(r => r.status === 'active')) {
                      handleSaveSnapshot();
                    }
                    setViewMode('diff');
                  }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${
                    viewMode === 'diff' ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={s.diffMode}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{s.diffMode}</span>
                </button>
              </div>

              {/* Status & Security Quick Filter Pills */}
              <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 shrink-0 gap-0.5 text-[9.5px]">
                <button
                  onClick={() => setCustomFilterMode('all')}
                  className={`px-2 py-0.5 rounded font-black transition-all ${
                    customFilterMode === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {s.all}
                </button>
                <button
                  onClick={() => setCustomFilterMode('active')}
                  className={`px-2 py-0.5 rounded font-black transition-all ${
                    customFilterMode === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {s.active} ({activeCount})
                </button>
                {detectedConflicts.size > 0 && (
                  <button
                    onClick={() => setCustomFilterMode('conflict')}
                    className={`px-2 py-0.5 rounded font-black transition-all flex items-center gap-1 ${
                      customFilterMode === 'conflict' ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    }`}
                    title={lang === 'ko' ? "IP 충돌 의심 기기만 필터링" : "Filter IP conflict suspected devices"}
                  >
                    <span>⚠️</span>
                    <span>{detectedConflicts.size}</span>
                  </button>
                )}
                {detectedIntruders.length > 0 && (
                  <button
                    onClick={() => setCustomFilterMode('intruder')}
                    className={`px-2 py-0.5 rounded font-black transition-all flex items-center gap-1 ${
                      customFilterMode === 'intruder' ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    }`}
                    title={lang === 'ko' ? "신규 감지된 낯선 기기만 필터링" : "Filter newly detected unknown devices"}
                  >
                    <span>🚨</span>
                    <span>{detectedIntruders.length}</span>
                  </button>
                )}
                {softTrustedDevices.length > 0 && (
                  <button
                    onClick={() => setCustomFilterMode('soft_trust')}
                    className={`px-2 py-0.5 rounded font-black transition-all flex items-center gap-1 ${
                      customFilterMode === 'soft_trust' ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    }`}
                    title={lang === 'ko' ? "식별자 변동/유예 기간 적용된 소프트 신뢰 기기 필터링" : "Filter soft-trusted devices with grace period"}
                  >
                    <span>🛡️</span>
                    <span>{lang === 'ko' ? `유예 ${softTrustedDevices.length}` : `Grace ${softTrustedDevices.length}`}</span>
                  </button>
                )}
                {Object.keys(aliases).length > 0 && (
                  <button
                    onClick={() => setCustomFilterMode('alias')}
                    className={`px-2 py-0.5 rounded font-black transition-all flex items-center gap-1 ${
                      customFilterMode === 'alias' ? 'bg-amber-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={lang === 'ko' ? "별칭이 지정된 기기만 필터링" : "Filter aliased devices"}
                  >
                    <span>🏷️</span>
                    <span>{Object.keys(aliases).length}</span>
                  </button>
                )}
              </div>

              {/* Feature 5: Intruder Watch Mode Toggle (PRO) */}
              <button
                onClick={handleToggleIntruderWatch}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${
                  intruderWatchMode && license.features.intruderDetection
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 ring-1 ring-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : !license.features.intruderDetection
                    ? 'bg-purple-950/20 border-purple-500/40 text-purple-300 hover:border-purple-400 hover:bg-purple-900/30'
                    : 'bg-black/10 border-white/5 opacity-60 hover:opacity-100 text-zinc-300'
                }`}
                title={
                  !license.features.intruderDetection
                    ? (lang === 'ko' ? "낯선 기기 실시간 감시 모드는 PRO 전용 기능입니다 (클릭하여 업그레이드)" : "Intruder Watch Mode is PRO exclusive (Click to upgrade)")
                    : intruderWatchMode
                    ? (lang === 'ko' ? "낯선 기기 감시 모드 작동 중 (신규 기기 감지 시 즉시 알림)" : "Intruder Watch Mode active")
                    : (lang === 'ko' ? "낯선 기기 감시 모드 켜기" : "Enable Intruder Watch Mode")
                }
              >
                <BellRing className={`w-3.5 h-3.5 ${intruderWatchMode && license.features.intruderDetection ? 'text-purple-400 animate-pulse' : 'text-purple-400'}`} />
                <span>{s.intruderWatch}</span>
                {!license.features.intruderDetection ? (
                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-xs">PRO</span>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${intruderWatchMode ? 'bg-purple-400 animate-ping' : 'bg-zinc-600'}`} />
                )}
              </button>

              {/* License Tier Badge */}
              <button
                onClick={() => setShowLicenseModal(true)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${
                  license.tier === 'enterprise'
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 hover:bg-purple-500/25'
                    : license.tier === 'pro'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                    : 'bg-zinc-800/60 border-white/10 text-zinc-400 hover:text-white'
                }`}
                title={s.licenseManage}
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>{license.tier.toUpperCase()}</span>
                {license.tier === 'free' && (
                  <span className="px-1 py-0.2 bg-sky-500/20 text-sky-400 rounded text-[8px] font-bold">PRO</span>
                )}
              </button>

              {/* Sort Mode Single Cycle Button */}
              <button
                type="button"
                onClick={cycleSortMode}
                title={lang === 'ko' ? `정렬 방식: ${sortModeLabel} (클릭 시 순환: IP순 → 상태순 → 이름순)` : `Sort by: ${sortModeLabel} (Click to cycle)`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                  theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37] hover:bg-[#f5ebd6]' :
                  theme === 'white' ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs' :
                  'bg-black/20 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{sortModeLabel}</span>
              </button>

              {/* Grid Canvas Mode (Fit vs 2D Scroll) Button */}
              <button
                type="button"
                onClick={toggleGridCanvasMode}
                title={lang === 'ko' 
                  ? (gridCanvasMode === 'scroll' 
                      ? "캔버스 모드: 가로/세로 2D 스크롤 활성 (클릭 시 화면 맞춤으로 전환)" 
                      : "캔버스 모드: 화면 맞춤 활성 (클릭 시 가로/세로 2D 스크롤로 전환)") 
                  : (gridCanvasMode === 'scroll' 
                      ? "Canvas Mode: 2D Scroll Active (Click to Fit Screen)" 
                      : "Canvas Mode: Fit Screen Active (Click to Enable 2D Scroll)")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                  gridCanvasMode === 'scroll'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50 ring-1 ring-sky-500/40 shadow-xs'
                    : (theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37] hover:bg-[#f5ebd6]' :
                       theme === 'white' ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs' :
                       'bg-black/20 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white')
                }`}
              >
                {gridCanvasMode === 'scroll' ? (
                  <>
                    <Move className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{lang === 'ko' ? '스크롤 (2D)' : 'Scroll (2D)'}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{lang === 'ko' ? '화면 맞춤' : 'Fit Screen'}</span>
                  </>
                )}
              </button>

              {/* Desktop Theme Selector Single Button */}
              <button
                type="button"
                onClick={cycleTheme}
                title={lang === 'ko' ? `테마 변경 (현재: ${themeName} - 클릭 시 순환: 다크 → 그레이 → 화이트 → 베이지)` : `Theme: ${themeName} (Click to cycle)`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${themeBtnClass}`}
              >
                {themeIcon}
                <span>{themeName}</span>
              </button>

              {/* Quick Tray Minimize Button */}
              <button
                type="button"
                onClick={handleMinimizeToTray}
                title={lang === 'ko' ? "창을 시스템 트레이로 최소화 (24/7 침입 감시 백그라운드 상주)" : "Minimize window to system tray (keep 24/7 watch active)"}
                className="px-2 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95 shadow-xs"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">{lang === 'ko' ? "트레이 최소화" : "To Tray"}</span>
              </button>

              {/* Preferences & System Tray Settings Button */}
              <button
                type="button"
                onClick={() => setShowWindowsUtilModal(true)}
                title={lang === 'ko' ? "환경설정 및 시스템 트레이 제어" : "Preferences & System Tray Settings"}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${theme === 'beige' ? 'hover:bg-[#f5ebd6] text-[#5c4a37]' : theme === 'white' ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-zinc-300'}`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Help Button */}
              <button 
                onClick={() => setShowHelp(true)} 
                title={s.help} 
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${theme === 'beige' ? 'hover:bg-[#f5ebd6] text-[#5c4a37]' : theme === 'white' ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-zinc-300'}`}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================= MOBILE HEADER (< md) ================= */}
          <div className="flex md:hidden flex-col divide-y divide-white/5">
            {/* Mobile Top Row: Menu Button, App Title & Primary Tools */}
            <div className="flex items-center justify-between px-2.5 py-2 gap-2 overflow-x-auto no-scrollbar">
              {/* Left Branding & Menu */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg shrink-0 text-sky-400 active:scale-95 transition-all flex items-center gap-1"
                  title={lang === 'ko' ? "설정 및 스캔 제어 메뉴" : "Settings & Scan Menu"}
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-tight">{lang === 'ko' ? '설정' : 'Settings'}</span>
                </button>

                {/* Mobile Quick Scan Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isScanning) {
                      handleStopScan();
                    } else {
                      startScan();
                    }
                  }}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-sm ${
                    isScanning 
                      ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                      : 'bg-sky-600 hover:bg-sky-500 border-sky-400 text-white'
                  }`}
                  title={isScanning ? s.stopScan : s.startScan}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{lang === 'ko' ? '중지' : 'Stop'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                      <span>{lang === 'ko' ? '스캔' : 'Scan'}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <img 
                    src="./logo.png" 
                    alt="Grid IP" 
                    className="w-6 h-6 rounded-lg object-cover shrink-0 shadow-xs border border-sky-500/40" 
                  />
                  <span className="font-black text-xs uppercase tracking-tight">Grid IP</span>
                  {updateInfo?.hasUpdate && (
                    <button
                      onClick={() => setShowUpdateModal(true)}
                      className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[8.5px] font-black uppercase flex items-center gap-1 animate-pulse"
                      title={lang === 'ko' ? "새 버전 다운로드 가능" : "New version available"}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>UP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Primary Tools (Camera Notch, Grid/Diff, Help) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Camera Notch Button */}
                <button
                  type="button"
                  onClick={() => handleToggleNotchOffset()}
                  className={`px-2 py-1 rounded-lg border text-[9.5px] font-black transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer ${
                    mobileNotchOffset > 0 
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-xs shadow-amber-500/20' 
                      : 'bg-black/20 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                  title={lang === 'ko' ? `상단 전면 카메라 홀 여백 조절 (현재: ${mobileNotchOffset}px)` : `Top Camera Notch Offset: ${mobileNotchOffset}px`}
                >
                  <Camera className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-mono font-bold">{mobileNotchOffset}px</span>
                </button>

                {/* View Mode (Grid vs Diff) */}
                <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 rounded text-[9.5px] font-black uppercase transition-all flex items-center gap-1 ${
                      viewMode === 'grid' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span>{lang === 'ko' ? '그리드' : 'Grid'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!license.features.diffCompare) {
                        showToast(lang === 'ko' ? "스냅샷 비교(Diff) 기능은 PRO 이상에서 제공됩니다." : "Snapshot Diff feature requires PRO edition or higher.");
                        setShowLicenseModal(true);
                        return;
                      }
                      if (snapshots.length === 0 && Object.values(results).some(r => r.status === 'active')) {
                        handleSaveSnapshot();
                      }
                      setViewMode('diff');
                    }}
                    className={`px-2 py-1 rounded text-[9.5px] font-black uppercase transition-all flex items-center gap-1 ${
                      viewMode === 'diff' ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-60'
                    }`}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Diff</span>
                  </button>
                </div>

                {/* Help Button */}
                <button 
                  onClick={() => setShowHelp(true)} 
                  title={s.help} 
                  className="p-1 rounded-lg bg-black/20 hover:bg-white/10 border border-white/5 text-zinc-300 shrink-0"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Bottom Row: Search Box, Sort, License, Theme, Language */}
            <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-black/10 overflow-x-auto no-scrollbar">
              {/* Search Box */}
              <div className={`flex-1 min-w-[120px] max-w-[160px] flex items-center ${
                theme === 'beige' ? 'bg-white border-[#dfceb0]' :
                theme === 'white' ? 'bg-white border-slate-300 text-slate-800' :
                'bg-black/30 border-white/10'
              } rounded-lg border px-2 py-1 shrink-0`}>
                <Search className={`w-3 h-3 ${t.textMuted} mr-1 shrink-0`} />
                <input 
                  type="text" 
                  placeholder={s.searchPlaceholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-[10px] ${t.text} placeholder:opacity-40 truncate`}
                />
                {searchTerm && (
                  <div className="flex items-center space-x-1 ml-1 shrink-0">
                    <button 
                      onClick={() => handleExportPdf('search')}
                      disabled={isExportingPdf}
                      className="flex items-center space-x-1 px-1 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 text-[8.5px] font-bold"
                      title={lang === 'ko' ? `"${searchTerm}" 검색 결과 PDF 다운로드` : `Download "${searchTerm}" search results PDF`}
                    >
                      <FileDown className="w-2.5 h-2.5 text-sky-400" />
                      <span>PDF</span>
                    </button>
                    <button onClick={() => setSearchTerm('')} className="text-zinc-400 hover:text-white shrink-0">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Controls Group */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mobile Sort Single Cycle Button */}
                <button
                  type="button"
                  onClick={cycleSortMode}
                  title={lang === 'ko' ? `정렬: ${sortModeLabel} (순환)` : `Sort: ${sortModeLabel} (cycle)`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shrink-0 ${
                    theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]' :
                    theme === 'white' ? 'bg-white border-slate-300 text-slate-800 shadow-xs' :
                    'bg-black/20 border-white/10 text-zinc-300'
                  }`}
                >
                  <Sliders className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{sortModeLabel}</span>
                </button>

                {/* Mobile Grid Canvas Mode (Fit vs 2D Scroll) Button */}
                <button
                  type="button"
                  onClick={toggleGridCanvasMode}
                  title={lang === 'ko' 
                    ? (gridCanvasMode === 'scroll' ? "2D 스크롤 모드 (화면 맞춤으로 전환)" : "화면 맞춤 모드 (2D 스크롤로 전환)") 
                    : (gridCanvasMode === 'scroll' ? "Scroll Mode (Switch to Fit)" : "Fit Mode (Switch to Scroll)")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shrink-0 ${
                    gridCanvasMode === 'scroll'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/50 ring-1 ring-sky-500/30'
                      : (theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]' :
                         theme === 'white' ? 'bg-white border-slate-300 text-slate-800 shadow-xs' :
                         'bg-black/20 border-white/10 text-zinc-300')
                  }`}
                >
                  {gridCanvasMode === 'scroll' ? <Move className="w-3 h-3 text-sky-400 shrink-0" /> : <Maximize2 className="w-3 h-3 text-zinc-400 shrink-0" />}
                  <span>{gridCanvasMode === 'scroll' ? (lang === 'ko' ? '스크롤' : 'Scroll') : (lang === 'ko' ? '맞춤' : 'Fit')}</span>
                </button>

                {/* Mobile Quick PDF Export Button */}
                <button
                  type="button"
                  onClick={() => setShowPdfExportModal(true)}
                  disabled={isExportingPdf || Object.keys(results).length === 0}
                  title={lang === 'ko' ? `스캔 결과 PDF 즉시 내보내기 (${activeCount}개 활성)` : `Quick PDF Export (${activeCount} active)`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shrink-0 ${
                    isExportingPdf ? 'opacity-50 cursor-wait' : ''
                  } ${
                    theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]' :
                    theme === 'white' ? 'bg-white border-slate-300 text-slate-800 shadow-xs' :
                    'bg-black/20 border-white/10 text-zinc-300'
                  }`}
                >
                  <FileDown className={`w-3 h-3 ${activeCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`} />
                  <span>PDF</span>
                </button>

                {/* License Badge */}
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="px-1.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                >
                  <Key className="w-2.5 h-2.5" />
                  <span>{license.tier.toUpperCase()}</span>
                </button>

                {/* Mobile Theme Selector Single Button */}
                <button
                  type="button"
                  onClick={cycleTheme}
                  title={lang === 'ko' ? `테마: ${themeName} (순환)` : `Theme: ${themeName} (cycle)`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shrink-0 ${themeBtnClass}`}
                >
                  {themeIcon}
                  <span>{themeName}</span>
                </button>

                {/* KO / EN Toggle */}
                <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10 shrink-0">
                  <button 
                    onClick={() => setLang('ko')} 
                    className={`px-1.5 py-0.5 text-[8.5px] font-black rounded ${lang === 'ko' ? 'bg-sky-500 text-white' : 'opacity-60'}`}
                  >
                    KO
                  </button>
                  <button 
                    onClick={() => setLang('en')} 
                    className={`px-1.5 py-0.5 text-[8.5px] font-black rounded ${lang === 'en' ? 'bg-sky-500 text-white' : 'opacity-60'}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Scanning Progress Bar (Sub-header) */}
          {(isScanning || (hasStartedScan && progressPercent > 0)) && (
            <div className="px-3 py-1.5 border-t border-white/5 bg-black/25 flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-bold truncate text-[10px]">
                  {isScanning ? (
                    <>{s.scanning} <span className="text-amber-400 mono font-bold">{Array.from(scanningIPs).slice(-1)[0] || '...'}</span></>
                  ) : (
                    <span className="text-emerald-400 font-bold">{s.complete}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${isScanning ? 'bg-sky-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className={`font-bold ${isScanning ? 'text-sky-400' : 'text-emerald-400'}`}>{progressPercent}%</span>
                <span className="opacity-50 text-[9px]">({formatTime(elapsedTime)})</span>
              </div>
            </div>
          )}
        </header>

        {/* ================= SNAPSHOT DIFF PERSISTENT SUB-HEADER TOOLBAR (CLEAN 2-ROW ORGANIZED) ================= */}
        {viewMode === 'diff' && (
          <div className={`w-full border-b shrink-0 z-20 transition-all shadow-md ${
            theme === 'beige'
              ? 'bg-[#f8f1e5] border-[#dfcaa7] text-[#4a341e]'
              : theme === 'white'
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-slate-900/95 backdrop-blur border-indigo-500/30 text-indigo-100'
          }`}>
            <div className="max-w-7xl mx-auto px-3 py-2 flex flex-col gap-2">
              {/* Row 1: Snapshot Controls & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left: Mode Badge, Unified Baseline Selector & Quick Capture */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black shrink-0">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{s.diffMode}</span>
                  </div>

                  {/* Unified Baseline Selector */}
                  {snapshots.length > 0 ? (
                    <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 shrink-0 shadow-sm ${
                      theme === 'beige' ? 'bg-white/90 border-[#d8c09a] text-[#4a341e]' : theme === 'white' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-black/40 border-white/15 text-zinc-100'
                    }`}>
                      <span className="text-[10px] font-black opacity-60 uppercase">{lang === 'ko' ? '기준:' : 'Base:'}</span>
                      <select
                        value={baselineSnapshot?.id || ''}
                        onChange={(e) => setBaselineSnapshotId(e.target.value)}
                        className={`bg-transparent text-[11px] font-black outline-none cursor-pointer py-0.5 pr-1 max-w-[170px] sm:max-w-[280px] truncate ${
                          theme === 'beige' ? 'text-[#3d2711]' : theme === 'white' ? 'text-slate-900' : 'text-zinc-100'
                        }`}
                        title={lang === 'ko' ? "비교 기준 스냅샷 선택" : "Select baseline snapshot"}
                      >
                        {snapshots.map((snap) => (
                          <option 
                            key={snap.id} 
                            value={snap.id} 
                            className={theme === 'beige' ? 'bg-[#fcf7ee] text-[#3d2711]' : theme === 'white' ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}
                          >
                            {snap.label} ({snap.activeCount})
                          </option>
                        ))}
                      </select>
                      {baselineSnapshot && (
                        <button
                          onClick={() => handleDeleteSnapshot(baselineSnapshot.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors ml-0.5"
                          title={lang === 'ko' ? "현재 선택된 기준 스냅샷 삭제" : "Delete selected baseline snapshot"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10.5px] font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      {lang === 'ko' ? '기준 스냅샷 없음 (스냅샷 캡처 버튼을 눌러 생성)' : 'No baseline snapshot (Click Snapshot Capture to create)'}
                    </span>
                  )}

                  {/* Capture Current Live Scan as Snapshot */}
                  <button
                    onClick={() => handleSaveSnapshot()}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    title={lang === 'ko' ? "현재 스캔 결과를 새 기준 스냅샷으로 캡처 및 저장" : "Capture and save current scan as baseline snapshot"}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? '스냅샷 캡처' : 'Snapshot Capture'}</span>
                  </button>
                </div>

                {/* Right: Studio & Guide & Return to Grid */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {/* 1:1 Diff Studio Modal */}
                  <button
                    onClick={() => setShowDiffStudioModal(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-500 hover:to-sky-500 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ring-1 ring-sky-400/40"
                    title={lang === 'ko' ? "임의의 두 스냅샷 간 1:1 나란히 대조 테이블 및 심층 변동 분석 스튜디오" : "1:1 Side-by-side snapshot comparison & in-depth diff analysis studio"}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? '1:1 대조 스튜디오' : '1:1 Diff Studio'}</span>
                  </button>

                  {/* Guide Help */}
                  <button
                    onClick={() => setShowDiffGuide(true)}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition-all ${
                      theme === 'beige'
                        ? 'bg-[#f0e2ca] hover:bg-[#e7d4b4] border-[#d4be94] text-[#4a341e]'
                        : theme === 'white'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                        : 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40 text-indigo-300'
                    }`}
                    title={s.diffGuideBtn}
                  >
                    <HelpCircle className="w-3.5 h-3.5 opacity-80" />
                    <span>{lang === 'ko' ? '사용법' : 'Guide'}</span>
                  </button>

                  {/* Exit Diff and return to Grid */}
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all shadow-sm ${
                      theme === 'beige'
                        ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'
                        : theme === 'white'
                        ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300'
                    }`}
                    title={lang === 'ko' ? "스냅샷 비교 종료 및 기본 그리드로 복귀" : "Exit diff view and return to grid"}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? '그리드 복귀' : 'Back to Grid'}</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Interactive Filter Tabs & Baseline Color Palette */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                {/* Left: Interactive Filter Counters */}
                <div className="flex flex-wrap items-center gap-1.5 font-black text-[10px]">
                  <button
                    onClick={() => setDiffFilter(diffFilter === 'new' ? 'all' : 'new')}
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      diffFilter === 'new'
                        ? 'ring-2 ring-emerald-400 bg-emerald-500 text-white border-emerald-300 font-black'
                        : (theme === 'beige' || theme === 'white')
                        ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                    title="초록색: 신규 감지 노드 (+NEW) 필터링"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>+ {s.diffNewBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.newCount}</span>
                  </button>

                  <button
                    onClick={() => setDiffFilter(diffFilter === 'offline' ? 'all' : 'offline')}
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      diffFilter === 'offline'
                        ? 'ring-2 ring-rose-400 bg-rose-600 text-white border-rose-300 font-black'
                        : (theme === 'beige' || theme === 'white')
                        ? 'bg-rose-100/90 text-rose-900 border-rose-300 hover:bg-rose-200'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                    title="빨간색: 연결 끊김 / 오프라인 노드 (-OFF) 필터링"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>- {s.diffGoneBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.offlineCount}</span>
                  </button>

                  <button
                    onClick={() => setDiffFilter(diffFilter === 'changed' ? 'all' : 'changed')}
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      diffFilter === 'changed'
                        ? 'ring-2 ring-amber-400 bg-amber-500 text-black border-amber-300 font-black'
                        : (theme === 'beige' || theme === 'white')
                        ? 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                    title="주황색: MAC/호스트명 변동 노드 (!CHG) 필터링"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>! {s.diffChangedBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.changedCount}</span>
                  </button>

                  <button
                    onClick={() => setDiffFilter(diffFilter === 'same' ? 'all' : 'same')}
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                      diffFilter === 'same'
                        ? diffBaselineColor === 'sky'
                          ? 'ring-2 ring-sky-400 bg-sky-500 text-black border-sky-300 font-black'
                          : diffBaselineColor === 'indigo'
                          ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white border-indigo-300 font-black'
                          : diffBaselineColor === 'teal'
                          ? 'ring-2 ring-teal-400 bg-teal-500 text-black border-teal-300 font-black'
                          : 'ring-2 ring-slate-400 bg-slate-600 text-white border-slate-300 font-black'
                        : theme === 'beige'
                        ? diffBaselineColor === 'sky'
                          ? 'bg-sky-100/90 text-sky-900 border-sky-300 hover:bg-sky-200'
                          : diffBaselineColor === 'indigo'
                          ? 'bg-indigo-100/90 text-indigo-900 border-indigo-300 hover:bg-indigo-200'
                          : diffBaselineColor === 'teal'
                          ? 'bg-teal-100/90 text-teal-900 border-teal-300 hover:bg-teal-200'
                          : 'bg-stone-100/90 text-stone-800 border-stone-300 hover:bg-stone-200'
                        : diffBaselineColor === 'sky'
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 hover:bg-sky-500/30'
                        : diffBaselineColor === 'indigo'
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/30'
                        : diffBaselineColor === 'teal'
                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/40 hover:bg-teal-500/30'
                        : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                    title="기준점과 동일 유지 노드 (=BASE) 필터링"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      diffBaselineColor === 'sky' ? 'bg-sky-400' :
                      diffBaselineColor === 'indigo' ? 'bg-indigo-400' :
                      diffBaselineColor === 'teal' ? 'bg-teal-400' : 'bg-slate-400'
                    }`} />
                    <span>= {s.diffSameBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.sameCount}</span>
                  </button>

                  {diffFilter !== 'all' && (
                    <button
                      onClick={() => setDiffFilter('all')}
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-all cursor-pointer ml-1"
                    >
                      {lang === 'ko' ? '전체 보기' : 'Show All'}
                    </button>
                  )}
                </div>

                {/* Right: Baseline Color Palette */}
                <div className="flex items-center gap-1.5 text-[9.5px] font-bold">
                  <span className="opacity-60 text-[10px]">{lang === 'ko' ? '기준색:' : 'Base Color:'}</span>
                  <div className="flex items-center bg-black/25 rounded-lg p-0.5 border border-white/5">
                    <button
                      onClick={() => setDiffBaselineColor('sky')}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-all cursor-pointer ${
                        diffBaselineColor === 'sky'
                          ? 'bg-sky-500 text-black shadow-sm ring-1 ring-sky-300'
                          : 'opacity-60 hover:opacity-100 text-sky-400'
                      }`}
                      title={lang === 'ko' ? "하늘색 (Sky Blue)" : "Sky Blue"}
                    >
                      {lang === 'ko' ? '하늘' : 'Sky'}
                    </button>
                    <button
                      onClick={() => setDiffBaselineColor('indigo')}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-all cursor-pointer ${
                        diffBaselineColor === 'indigo'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-300'
                          : 'opacity-60 hover:opacity-100 text-indigo-400'
                      }`}
                      title={lang === 'ko' ? "보라색 (Indigo / Purple)" : "Indigo / Purple"}
                    >
                      {lang === 'ko' ? '보라' : 'Purple'}
                    </button>
                    <button
                      onClick={() => setDiffBaselineColor('teal')}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-all cursor-pointer ${
                        diffBaselineColor === 'teal'
                          ? 'bg-teal-500 text-black shadow-sm ring-1 ring-teal-300'
                          : 'opacity-60 hover:opacity-100 text-teal-400'
                      }`}
                      title={lang === 'ko' ? "청록색 (Teal / Cyan)" : "Teal / Cyan"}
                    >
                      {lang === 'ko' ? '청록' : 'Teal'}
                    </button>
                    <button
                      onClick={() => setDiffBaselineColor('slate')}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-all cursor-pointer ${
                        diffBaselineColor === 'slate'
                          ? 'bg-slate-600 text-white shadow-sm ring-1 ring-slate-300'
                          : 'opacity-60 hover:opacity-100 text-slate-300'
                      }`}
                      title={lang === 'ko' ? "스틸 회색 (Slate / Gray)" : "Slate / Gray"}
                    >
                      {lang === 'ko' ? '회색' : 'Gray'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Central Grid Map Viewport with 2D Horizontal and Vertical Scroll Capability */}
        <div className="flex-1 w-full h-full p-2 md:p-3 pb-16 md:pb-3 relative bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.03)_0%,_transparent_70%)] overflow-auto min-h-0 min-w-0 grid-scroll-canvas flex">
          <div className={`grid grid-cols-16 grid-rows-16 gap-[1px] relative z-10 transition-all m-auto ${
            gridCanvasMode === 'scroll'
              ? 'min-w-[560px] min-h-[560px] w-[560px] h-[560px] sm:min-w-[620px] sm:min-h-[620px] sm:w-[620px] sm:h-[620px] aspect-square my-2'
              : viewMode === 'diff' 
                ? 'w-full aspect-square my-auto max-w-[min(800px,calc(100dvh-180px))]' 
                : 'w-full aspect-square my-auto max-w-[min(800px,calc(100dvh-140px))] md:max-w-[min(800px,calc(100vh-85px))]'
          }`}>
            {filteredIps.map((ip, index) => {
              const res = results[ip];
              const alias = getDeviceAlias(res?.device?.mac, ip);
              const conflict = detectedConflicts.get(ip);
              const isIntruder = detectedIntruders.some(d => d.ip === ip);

              return (
                <IPCell 
                  key={ip}
                  ip={ip}
                  index={index}
                  status={res.status}
                  device={res.device}
                  isSelected={selectedIp === ip}
                  isHost={ip === localIpInfo?.ip}
                  onClick={setSelectedIp}
                  onDoubleClick={handleCellDoubleClick}
                  theme={theme}
                  s={s}
                  lang={lang}
                  diffStatus={viewMode === 'diff' ? diffAnalysis.diffMap[ip] : undefined}
                  isConflict={!!conflict}
                  conflictDetails={conflict?.reason}
                  isNewIntruder={isIntruder}
                  isSoftTrust={softTrustedDevices.some(d => d.ip === ip)}
                  customNickname={alias?.nickname}
                  baselineDevice={viewMode === 'diff' && baselineSnapshot ? baselineSnapshot.results[ip]?.device : undefined}
                  diffFilter={viewMode === 'diff' ? diffFilter : undefined}
                  isDiffMode={viewMode === 'diff'}
                  baselineColor={diffBaselineColor}
                />
              );
            })}
          </div>
        </div>
      </main>

       {selectedIp && (
        <aside className={`fixed md:relative inset-y-0 right-0 w-full ${profileTextScale === 'large' ? 'md:w-96 xl:w-[420px]' : 'md:w-88 xl:w-96'} shrink-0 border-l ${t.panel} flex flex-col z-[200] md:z-0 shadow-2xl transition-all duration-200`}>
           <div className="p-4 sm:p-5 pb-24 md:pb-5 flex flex-col h-full space-y-5 overflow-y-auto no-scrollbar">
            {/* Header: Title + Font Size Zoom Toggle (100% / 115%) + Close Button */}
            <div className="flex items-center justify-between pb-2 border-b border-current border-opacity-10 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className={`${profileTextScale === 'large' ? 'text-sm' : 'text-xs'} font-black ${
                  theme === 'beige' ? 'text-[#5c4a37]' :
                  theme === 'white' ? 'text-slate-900' :
                  'text-white'
                } uppercase tracking-tight`}>
                  {s.deviceProfile}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Font Scale Switcher Button */}
                <button
                  onClick={() => {
                    const next = profileTextScale === 'normal' ? 'large' : 'normal';
                    setProfileTextScale(next);
                    try { localStorage.setItem('grid_profile_text_scale', next); } catch {}
                  }}
                  className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                    profileTextScale === 'large'
                      ? 'bg-sky-500 text-white border-sky-400 font-black'
                      : theme === 'beige'
                      ? 'bg-black/5 hover:bg-black/10 border-[#dfcaa7] text-[#5c4a37]'
                      : theme === 'white'
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                  }`}
                  title={s.profileFontScaleTooltip}
                >
                  <span className="font-mono">{profileTextScale === 'large' ? (lang === 'ko' ? '가⁺ 115%' : 'A⁺ 115%') : (lang === 'ko' ? '가 100%' : 'A 100%')}</span>
                </button>
                <button 
                  onClick={() => setSelectedIp(null)} 
                  className={`p-1.5 hover:bg-current hover:bg-opacity-10 rounded-lg ${t.textMuted} transition-colors cursor-pointer`}
                  title={lang === 'ko' ? "닫기" : "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {selectedIp && (() => {
              const isLgText = profileTextScale === 'large';
              const selectedResult = results[selectedIp];
              const selectedDevice = selectedResult?.device;
              const selectedConflict = detectedConflicts.get(selectedIp);
              const isSelectedIntruder = detectedIntruders.some(d => d.ip === selectedIp);
              const selectedSoftTrust = softTrustedDevices.find(d => d.ip === selectedIp);
              
              const selectedDiffStatus = viewMode === 'diff' ? diffAnalysis.diffMap[selectedIp] : undefined;
              const selectedBaselineResult = viewMode === 'diff' && baselineSnapshot ? baselineSnapshot.results[selectedIp] : undefined;
              const selectedBaselineDevice = selectedBaselineResult?.device;
              const selectedDiffItem = viewMode === 'diff' ? diffAnalysis.items.find(item => item.ip === selectedIp) : undefined;
              const effectiveDevice = selectedDevice || selectedBaselineDevice;
              const effectiveMac = selectedDevice?.mac || selectedBaselineDevice?.mac;
              const selectedMac = effectiveMac;
              const selectedAlias = getDeviceAlias(effectiveMac, selectedIp);

              return (
                <div className="space-y-5">
                  {/* Top Header Control: Data Source Confidence Priority Toggle Switch */}
                  <div className={`p-2.5 rounded-xl border ${
                    theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' :
                    theme === 'white' ? 'bg-slate-100 border-slate-300 text-slate-800' :
                    'bg-slate-900/90 border-slate-800 text-slate-200'
                  } space-y-2 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider truncate`}>
                          {lang === 'ko' ? '데이터 소스 신뢰도 강조' : 'Data Source Confidence Focus'}
                        </span>
                      </div>
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        vendorPriorityMode === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        vendorPriorityMode === 'real' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {vendorPriorityMode === 'auto' ? (lang === 'ko' ? '⭐ 자동 최적' : '⭐ Auto Smart') :
                         vendorPriorityMode === 'real' ? (lang === 'ko' ? '완제품 98%' : 'Real Brand') :
                         (lang === 'ko' ? '칩셋 85%' : 'OUI Hardware')}
                      </span>
                    </div>

                    {/* 3-Way Segmented Control Switch */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/30 dark:bg-black/50 border border-white/5 text-[10px] font-black">
                      <button
                        type="button"
                        onClick={() => setVendorPriorityMode('auto')}
                        className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          vendorPriorityMode === 'auto'
                            ? 'bg-emerald-500 text-black shadow-md font-black ring-1 ring-emerald-300'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={lang === 'ko' ? '신뢰도 점수 기반 자동 최적 강조 (추천)' : 'Auto-select highest confidence source'}
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lang === 'ko' ? '자동 최적' : 'Auto'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVendorPriorityMode('real')}
                        className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          vendorPriorityMode === 'real'
                            ? 'bg-sky-500 text-black shadow-md font-black ring-1 ring-sky-300'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={lang === 'ko' ? 'SSDP/mDNS 기반 실제 완제품 브랜드 강조 (신뢰도 98%)' : 'Focus on SSDP/mDNS real product brand (98% confidence)'}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lang === 'ko' ? '완제품 98%' : 'Brand 98%'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVendorPriorityMode('oui')}
                        className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          vendorPriorityMode === 'oui'
                            ? 'bg-amber-500 text-black shadow-md font-black ring-1 ring-amber-300'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={lang === 'ko' ? 'IEEE OUI 기반 하드웨어 칩셋 제조사 강조 (신뢰도 85%)' : 'Focus on IEEE OUI hardware chipset (85% confidence)'}
                      >
                        <Cpu className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lang === 'ko' ? '칩셋 85%' : 'OUI 85%'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Snapshot Diff Diagnostic Card (When in Diff Mode) */}
                  {viewMode === 'diff' && selectedDiffStatus && (
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 shadow-lg animate-in fade-in ${
                      selectedDiffStatus === 'new'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-emerald-50 border-emerald-400 text-emerald-950' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100')
                        : selectedDiffStatus === 'offline'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-rose-50 border-rose-400 text-rose-950' : 'bg-rose-500/20 border-rose-500/50 text-rose-100')
                        : selectedDiffStatus === 'changed'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-amber-50 border-amber-400 text-amber-950' : 'bg-amber-500/20 border-amber-500/50 text-amber-100')
                        : diffBaselineColor === 'sky'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-sky-50 border-sky-400 text-sky-950' : 'bg-sky-500/20 border-sky-500/50 text-sky-100')
                        : diffBaselineColor === 'indigo'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-indigo-50 border-indigo-400 text-indigo-950' : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100')
                        : diffBaselineColor === 'teal'
                        ? ((theme === 'beige' || theme === 'white') ? 'bg-teal-50 border-teal-400 text-teal-950' : 'bg-teal-500/20 border-teal-500/50 text-teal-100')
                        : (theme === 'beige' ? 'bg-[#f0e6d6] border-[#cfbea6] text-[#523d28]' : theme === 'white' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-500/15 border-slate-500/30 text-slate-200')
                    }`}>
                      <div className="flex items-center justify-between gap-2 border-b pb-2 border-current border-opacity-15">
                        <div className="flex items-center gap-2">
                          {selectedDiffStatus === 'new' && <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-black text-xs shadow-sm">✚ NEW</span>}
                          {selectedDiffStatus === 'offline' && <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-xs shadow-sm">━ OFF</span>}
                          {selectedDiffStatus === 'changed' && <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-xs shadow-sm">▲ CHG</span>}
                          {selectedDiffStatus === 'same' && (
                            <span className={`px-2 py-0.5 rounded font-black text-xs shadow-sm ${
                              diffBaselineColor === 'sky' ? 'bg-sky-500 text-black' :
                              diffBaselineColor === 'indigo' ? 'bg-indigo-600 text-white' :
                              diffBaselineColor === 'teal' ? 'bg-teal-500 text-black' :
                              'bg-slate-600 text-white'
                            }`}>= BASE</span>
                          )}
                          <div>
                            <h4 className={`font-black ${isLgText ? 'text-[13px]' : 'text-xs'} leading-tight`}>
                              {selectedDiffStatus === 'new' && (lang === 'ko' ? '신규 감지 노드 (+NEW)' : 'New Node Detected (+NEW)')}
                              {selectedDiffStatus === 'offline' && (lang === 'ko' ? '기기 연결 끊김 (-OFFLINE)' : 'Device Disconnected (-OFFLINE)')}
                              {selectedDiffStatus === 'changed' && (lang === 'ko' ? '기기 식별자 변동 (!CHANGED)' : 'Device Identifier Changed (!CHANGED)')}
                              {selectedDiffStatus === 'same' && (lang === 'ko' ? '기준점 상태 동일 유지 (=SAME)' : 'Identical to Baseline (=SAME)')}
                            </h4>
                            <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} opacity-80 font-medium`}>
                              {baselineSnapshot ? (lang === 'ko' ? `기준: ${baselineSnapshot.label}` : `Baseline: ${baselineSnapshot.label}`) : (lang === 'ko' ? '기준점 대비 비교' : 'Compare vs Baseline')}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded ${isLgText ? 'text-[10px]' : 'text-[9px]'} font-black uppercase tracking-wider ${
                          selectedDiffStatus === 'new' ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/40' :
                          selectedDiffStatus === 'offline' ? 'bg-rose-500/30 text-rose-400 border border-rose-500/40' :
                          selectedDiffStatus === 'changed' ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40 animate-pulse' :
                          diffBaselineColor === 'sky' ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40' :
                          diffBaselineColor === 'indigo' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' :
                          diffBaselineColor === 'teal' ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40' :
                          'bg-slate-500/30 text-slate-400 border border-slate-500/40'
                        }`}>
                          {selectedDiffStatus.toUpperCase()}
                        </span>
                      </div>

                      {/* Snapshot Diff Diagnostic Details */}
                      {selectedDiffStatus === 'new' && (
                        <div className={`${isLgText ? 'text-xs' : 'text-[11px]'} space-y-1.5`}>
                          <p className="leading-relaxed opacity-95">
                            {lang === 'ko'
                              ? '기준 스냅샷 캡처 당시에는 존재하지 않았던 새로운 기기입니다. 정상 접속 기기인지 확인 후 신뢰 등록을 진행하세요.'
                              : 'This device was not present when the baseline was captured. Verify if authorized and add to trusted list.'}
                          </p>
                          <div className={`bg-black/25 p-2.5 rounded-lg font-mono ${isLgText ? 'text-[11px]' : 'text-[10px]'} space-y-1 mt-1 border border-white/5`}>
                            <div>• {lang === 'ko' ? '현재 응답:' : 'Status:'} <span className="text-emerald-400 font-bold">{lang === 'ko' ? `온라인 활성 (${selectedDevice?.latency || 1}ms)` : `Online (${selectedDevice?.latency || 1}ms)`}</span></div>
                            <div>• MAC: {selectedDevice?.mac || 'Unknown'}</div>
                            <div>• {lang === 'ko' ? '제조사:' : 'Vendor:'} {selectedDevice?.vendor || 'Unknown'}</div>
                          </div>
                        </div>
                      )}

                      {selectedDiffStatus === 'offline' && (
                        <div className={`${isLgText ? 'text-xs' : 'text-[11px]'} space-y-1.5`}>
                          <p className="leading-relaxed opacity-95">
                            {lang === 'ko'
                              ? '기준 스냅샷에서는 정상 작동 중이었으나, 현재 네트워크 스캔에서 응답하지 않습니다. (장비 전원 차단, LAN 케이블 분리 또는 IP 변경 의심)'
                              : 'Device was active in the baseline snapshot, but does not respond in current scan (Powered off, cable disconnected, or IP changed).'}
                          </p>
                          <div className={`bg-black/25 p-2.5 rounded-lg font-mono ${isLgText ? 'text-[11px]' : 'text-[10px]'} space-y-1 border border-white/5`}>
                            <div className="text-rose-400 font-bold">• {lang === 'ko' ? '이전 기준 상태: 정상 작동 중이었음' : 'Baseline Status: Active'}</div>
                            <div>• {lang === 'ko' ? '이전 MAC:' : 'Baseline MAC:'} {selectedBaselineDevice?.mac || 'N/A'}</div>
                            <div>• {lang === 'ko' ? '이전 제조사:' : 'Baseline Vendor:'} {selectedBaselineDevice?.vendor || 'Unknown'}</div>
                            <div>• {lang === 'ko' ? '이전 호스트:' : 'Baseline Host:'} {selectedBaselineDevice?.hostname || 'Unknown'}</div>
                          </div>
                        </div>
                      )}

                      {selectedDiffStatus === 'changed' && (
                        <div className={`${isLgText ? 'text-xs' : 'text-[11px]'} space-y-1.5`}>
                          <p className="leading-relaxed font-bold text-amber-300">
                            ⚠️ {lang === 'ko' ? '동일한 IP에서 기준 스냅샷과 다른 하드웨어 식별자가 감지되었습니다!' : 'Different hardware identifier detected on the same IP address compared to baseline!'}
                          </p>
                          <div className={`bg-black/30 p-2.5 rounded-lg font-mono ${isLgText ? 'text-[11px]' : 'text-[10px]'} space-y-1 border border-white/5`}>
                            {selectedDiffItem?.changeDetails && selectedDiffItem.changeDetails.length > 0 ? (
                              selectedDiffItem.changeDetails.map((detail, idx) => (
                                <div key={idx} className="text-amber-200 leading-tight">
                                  {detail}
                                </div>
                              ))
                            ) : (
                              <div className="text-amber-200">{lang === 'ko' ? 'MAC 주소 또는 호스트명 변동 감지됨' : 'MAC address or hostname change detected'}</div>
                            )}
                            <div className={`grid grid-cols-2 gap-2 pt-2 border-t border-white/10 ${isLgText ? 'text-[10.5px]' : 'text-[9.5px]'}`}>
                              <div>
                                <span className="opacity-60 block">{lang === 'ko' ? '기준점 MAC:' : 'Baseline MAC:'}</span>
                                <span className="font-bold">{selectedBaselineDevice?.mac || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="opacity-60 block text-amber-400">{lang === 'ko' ? '현재 MAC:' : 'Current MAC:'}</span>
                                <span className="font-bold text-amber-300">{selectedDevice?.mac || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedDiffStatus === 'same' && (
                        <div className={`${isLgText ? 'text-xs' : 'text-[11px]'} space-y-1`}>
                          <p className="leading-relaxed opacity-90">
                            {lang === 'ko'
                              ? '기준 스냅샷 시점과 현재 네트워크 상태가 완벽히 일치하며 안정적으로 운영되고 있습니다.'
                              : 'Network state perfectly matches baseline snapshot and is operating stably.'}
                          </p>
                        </div>
                      )}

                      {/* Button to open Snapshot Diff Studio directly */}
                      <button
                        onClick={() => setShowDiffStudioModal(true)}
                        className={`w-full mt-1.5 ${isLgText ? 'py-2 text-xs' : 'py-1.5 text-[11px]'} px-3 rounded-lg bg-black/20 hover:bg-black/35 dark:bg-white/10 dark:hover:bg-white/20 border border-current border-opacity-15 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm`}
                      >
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>{lang === 'ko' ? '스냅샷 1:1 대조 스튜디오 열기' : 'Open Snapshot Diff Studio'}</span>
                      </button>
                    </div>
                  )}

                  {/* IP Conflict Warning Banner */}
                  {selectedConflict && (
                    <div className="p-3.5 rounded-xl border border-rose-500/60 bg-rose-500/20 text-rose-200 space-y-1.5 animate-pulse shadow-lg">
                      <div className={`flex items-center gap-1.5 text-rose-400 font-black ${isLgText ? 'text-sm' : 'text-xs'}`}>
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>⚠️ {lang === 'ko' ? 'IP 충돌 경고 (IP Conflict)' : 'IP Conflict Warning'}</span>
                      </div>
                      <p className={`${isLgText ? 'text-xs' : 'text-[11px]'} leading-relaxed opacity-95`}>{selectedConflict.reason}</p>
                      <div className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} text-rose-300/90 bg-black/30 p-2 rounded mt-1`}>
                        💡 {lang === 'ko' ? '해결 가이드: 고정 IP 중복 여부 확인 또는 DHCP 라우터 임대 목록을 갱신하세요.' : 'Resolution: Check for static IP duplication or renew DHCP router lease.'}
                      </div>
                    </div>
                  )}

                  {/* New Intruder Device Banner */}
                  {isSelectedIntruder && (
                    <div className="p-3.5 rounded-xl border border-purple-500/50 bg-purple-500/20 text-purple-200 flex flex-col gap-2.5 shadow-lg">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <BellRing className="w-4 h-4 text-purple-400 animate-bounce shrink-0" />
                          <div className="truncate">
                            <div className={`${isLgText ? 'text-xs' : 'text-[11.5px]'} font-black text-purple-300`}>
                              {lang === 'ko' ? '신규 감지 낯선 기기' : 'Newly Detected Unknown Device'}
                            </div>
                            <div className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} opacity-85 truncate`}>
                              {lang === 'ko' ? '신뢰 목록에 없는 기기입니다.' : 'Not found in trusted devices list.'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTrustDevice(effectiveMac, selectedIp)}
                          className={`px-3 ${isLgText ? 'py-1.5 text-xs' : 'py-1 text-[11px]'} bg-purple-600 hover:bg-purple-500 text-white font-black rounded-lg shrink-0 shadow cursor-pointer`}
                        >
                          {lang === 'ko' ? '이 기기 신뢰 등록' : 'Trust Device'}
                        </button>
                      </div>
                      <button
                        onClick={handleTrustAllCurrentDevices}
                        className={`w-full ${isLgText ? 'py-1.5 text-xs' : 'py-1 text-[10.5px]'} bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 font-bold rounded-lg transition-colors text-center cursor-pointer`}
                      >
                        {lang === 'ko' ? '⚡ 현재 탐색된 모든 기기를 정상 기기로 등록' : '⚡ Trust All Discovered Devices'}
                      </button>
                      {!license.features.intruderDetection && (
                        <div className={`pt-1 border-t border-purple-500/20 flex items-center justify-between ${isLgText ? 'text-[11px]' : 'text-[10px]'} text-purple-300`}>
                          <span>🔔 {lang === 'ko' ? '백그라운드 감시/알림은 PRO 전용' : 'Background monitoring is PRO only'}</span>
                          <button
                            onClick={() => setShowLicenseModal(true)}
                            className="underline font-black text-purple-200 hover:text-white transition-colors cursor-pointer"
                          >
                            {lang === 'ko' ? 'PRO 업그레이드' : 'Upgrade to PRO'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Soft Trust Grace Period Banner */}
                  {selectedSoftTrust && !isSelectedIntruder && (
                    <div className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-100 flex flex-col gap-2.5 shadow-lg">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <div className={`${isLgText ? 'text-xs' : 'text-[11.5px]'} font-black text-amber-300 flex items-center gap-1`}>
                              <span>{lang === 'ko' ? '소프트 신뢰 유예 중' : 'Soft Trust Grace Period'}</span>
                              {selectedSoftTrust.softTrustInfo?.similarityScore && (
                                <span className={`px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 ${isLgText ? 'text-[10px]' : 'text-[9px]'} font-mono font-bold`}>
                                  {Math.round(selectedSoftTrust.softTrustInfo.similarityScore * 100)}% {lang === 'ko' ? '매칭' : 'Match'}
                                </span>
                              )}
                            </div>
                            <div className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} opacity-90 leading-tight mt-0.5`}>
                              {selectedSoftTrust.softTrustInfo?.reason || (lang === 'ko' ? '식별자 변동 유예 중인 기존 신뢰 기기' : 'Existing trusted device with identifier shift')}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTrustDevice(effectiveMac, selectedIp)}
                          className={`px-3 ${isLgText ? 'py-1.5 text-xs' : 'py-1 text-[11px]'} bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg shrink-0 shadow cursor-pointer`}
                        >
                          {lang === 'ko' ? '정식 신뢰 등록' : 'Confirm Trust'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Identity Card */}
                  <section className="space-y-2">
                     <div className={`p-4 ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-sky-500/10 border-sky-500/30'} rounded-2xl border flex flex-col items-center text-center shadow-sm`}>
                        <Monitor className="w-8 h-8 text-sky-500 mb-2" />
                        <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider mb-1`}>{s.networkIdentity}</span>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className={`${isLgText ? 'text-lg md:text-xl' : 'text-base md:text-lg'} font-black text-sky-500 break-all leading-tight`}>
                            {selectedAlias?.nickname ? selectedAlias.nickname : (effectiveDevice?.hostname || selectedIp)}
                          </span>
                          {selectedAlias?.nickname ? (
                            <span className="px-1.5 py-0.5 rounded font-black text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {lang === 'ko' ? '별칭' : 'Alias'}
                            </span>
                          ) : effectiveDevice?.nameSource && effectiveDevice.nameSource !== 'UNKNOWN' ? (
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.hostname)}
                              className={`px-1.5 py-0.5 rounded font-black text-[9px] border shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                effectiveDevice.nameSource === 'SMB' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30' :
                                effectiveDevice.nameSource === 'NETBIOS' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/30' :
                                effectiveDevice.nameSource === 'MDNS' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 hover:bg-purple-500/30' :
                                effectiveDevice.nameSource === 'WSD' || effectiveDevice.nameSource === 'UPNP' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' :
                                effectiveDevice.nameSource === 'SNMP' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30' :
                                effectiveDevice.nameSource === 'WEB' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' :
                                'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30'
                              }`} 
                              title={lang === 'ko' ? `클릭하여 감지된 프로토콜 이름 ('${effectiveDevice.hostname}')을 이 장치 이름으로 적용` : `Click to apply discovered protocol name ('${effectiveDevice.hostname}')`}
                            >
                              {effectiveDevice.nameSource} ↵
                            </button>
                          ) : null}
                        </div>
                        {(selectedAlias?.nickname || selectedDevice?.hostname || selectedBaselineDevice?.hostname) && (
                          <span className={`${isLgText ? 'text-xs' : 'text-[11px]'} opacity-75 font-mono mt-1`}>
                            {selectedAlias?.nickname ? (effectiveDevice?.hostname || selectedIp) : (selectedDiffStatus === 'offline' ? `(${lang === 'ko' ? '이전 기준' : 'Baseline'}: ${selectedBaselineDevice?.hostname || selectedBaselineDevice?.vendor || (lang === 'ko' ? '장치' : 'Device')})` : selectedDevice?.hostname)}
                          </span>
                        )}
                        {effectiveDevice?.webTitle && (
                          <div className={`mt-2 px-3 py-1.5 ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-black/40 border-slate-800'} border rounded-lg italic ${isLgText ? 'text-xs' : 'text-[11px]'} ${t.textMuted}`}>
                            "{effectiveDevice.webTitle}"
                          </div>
                        )}
                        <div className="mt-3 flex items-center space-x-2">
                           <div className={`w-2.5 h-2.5 rounded-full ${
                             selectedDiffStatus === 'offline' ? 'bg-rose-500' :
                             selectedDiffStatus === 'new' ? 'bg-emerald-500 animate-pulse' :
                             selectedDiffStatus === 'changed' ? 'bg-amber-500 animate-pulse' :
                             selectedResult?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'
                           }`} />
                           <span className={`${isLgText ? 'text-xs' : 'text-[11px]'} font-bold opacity-90`}>
                             {selectedDiffStatus === 'offline'
                               ? (lang === 'ko' ? '연결 끊김 (기준 스냅샷 대비 오프라인)' : 'Disconnected (Offline vs Baseline)')
                               : selectedDiffStatus === 'new'
                               ? `${lang === 'ko' ? '온라인 활성 (+NEW)' : 'Online Active (+NEW)'} - ${selectedDevice?.latency || 1}ms`
                               : selectedDiffStatus === 'changed'
                               ? `${lang === 'ko' ? '온라인 활성 (!CHG 변동)' : 'Online Active (!CHG Changed)'} - ${selectedDevice?.latency || 1}ms`
                               : selectedResult?.status === 'active'
                               ? `${s.active} - ${selectedDevice?.latency || 1}ms`
                               : (lang === 'ko' ? '비활성 / 꺼짐 (Offline)' : 'Offline / Inactive')}
                           </span>
                        </div>

                        {/* Copy IP Address Action Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyIpAddress(selectedIp)}
                          className={`mt-3.5 w-full py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm ${
                            copiedIp === selectedIp
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 ring-1 ring-emerald-500/30'
                              : (theme === 'beige'
                                  ? 'bg-[#fcf8f2] hover:bg-[#f5ebd6] border-[#dfcaa7] text-[#5c4a37]'
                                  : theme === 'white'
                                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                                  : 'bg-black/30 hover:bg-white/10 border-white/10 text-sky-300 hover:text-white')
                          }`}
                          title={lang === 'ko' ? `IP 주소 (${selectedIp}) 클립보드에 복사` : `Copy IP address (${selectedIp}) to clipboard`}
                        >
                          {copiedIp === selectedIp ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="font-mono text-emerald-400">{lang === 'ko' ? 'IP 주소 복사 완료!' : 'IP Address Copied!'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-sky-400 shrink-0" />
                              <span>{s.copyIpAddress || (lang === 'ko' ? 'IP 주소 복사' : 'Copy IP Address')}</span>
                              <span className="font-mono opacity-65 text-[11px]">({selectedIp})</span>
                            </>
                          )}
                        </button>
                     </div>
                  </section>

                  {/* Feature 3: Custom Nickname & Memo Section */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider flex items-center gap-1`}>
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        <span>{s.customNickname}</span>
                      </span>
                      {!isEditingAlias ? (
                        <button
                          onClick={() => {
                            setAliasNicknameInput(selectedAlias?.nickname || '');
                            setAliasNotesInput(selectedAlias?.notes || '');
                            setIsEditingAlias(true);
                          }}
                          className={`px-2.5 py-1 rounded ${isLgText ? 'text-xs' : 'text-[11px]'} font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{selectedAlias?.nickname ? (lang === 'ko' ? "수정" : "Edit") : (lang === 'ko' ? "+ 별칭 추가" : "+ Add Alias")}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditingAlias(false)}
                          className={`${isLgText ? 'text-xs' : 'text-[11px]'} text-zinc-400 hover:text-white cursor-pointer`}
                        >
                          {lang === 'ko' ? '취소' : 'Cancel'}
                        </button>
                      )}
                    </div>

                    {isEditingAlias ? (
                      <div className={`p-3.5 rounded-xl border ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-black/40 border-amber-500/30'} space-y-3 animate-in fade-in`}>
                        <div>
                          <label className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-bold opacity-75 block mb-1`}>
                            {lang === 'ko' ? '기기 별칭 (예: 거실 공기청정기, 메인 NAS)' : 'Device Nickname (e.g. Living Room TV, Main NAS)'}
                          </label>
                          <input
                            type="text"
                            value={aliasNicknameInput}
                            onChange={e => setAliasNicknameInput(e.target.value)}
                            placeholder={lang === 'ko' ? "별칭 입력..." : "Enter nickname..."}
                            className={`w-full px-3 ${isLgText ? 'py-2 text-sm' : 'py-1.5 text-xs'} rounded-lg border outline-none ${t.input}`}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-bold opacity-75 block mb-1`}>
                            {lang === 'ko' ? '관리자 메모' : 'Admin Notes'}
                          </label>
                          <textarea
                            value={aliasNotesInput}
                            onChange={e => setAliasNotesInput(e.target.value)}
                            placeholder={lang === 'ko' ? "설치 위치, 담당자 연락처, 특이사항 등..." : "Location, manager contact, notes..."}
                            rows={2}
                            className={`w-full px-3 ${isLgText ? 'py-2 text-sm' : 'py-1.5 text-xs'} rounded-lg border outline-none resize-none ${t.input}`}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          {selectedAlias && (
                            <button
                              onClick={() => handleDeleteNickname(selectedMac, selectedIp)}
                              className={`${isLgText ? 'text-xs' : 'text-[11px]'} text-rose-400 hover:text-rose-300 font-bold cursor-pointer`}
                            >
                              {lang === 'ko' ? '삭제' : 'Delete'}
                            </button>
                          )}
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => setIsEditingAlias(false)}
                              className={`px-3 py-1.5 rounded ${isLgText ? 'text-xs' : 'text-[11px]'} font-bold bg-white/5 hover:bg-white/10 cursor-pointer`}
                            >
                              {lang === 'ko' ? '취소' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleSaveNickname(selectedMac, selectedIp)}
                              className={`px-3.5 py-1.5 rounded ${isLgText ? 'text-xs' : 'text-[11px]'} font-black bg-amber-500 hover:bg-amber-400 text-black shadow cursor-pointer`}
                            >
                              {lang === 'ko' ? '저장' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : selectedAlias ? (
                      <div className={`p-3.5 rounded-xl border ${theme === 'beige' ? 'bg-amber-50/80 border-amber-200 text-[#4a341e]' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'} space-y-1.5`}>
                        <div className="flex items-center justify-between">
                          <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-black text-amber-400`}>🏷️ {selectedAlias.nickname}</span>
                          <span className={`${isLgText ? 'text-[10px]' : 'text-[9px]'} opacity-60 mono`}>{selectedAlias.updatedAt.split('T')[0]}</span>
                        </div>
                        {selectedAlias.notes && (
                          <p className={`${isLgText ? 'text-xs' : 'text-[11px]'} opacity-85 leading-relaxed pt-1.5 border-t border-amber-500/20`}>
                            📝 {selectedAlias.notes}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </section>

                  {/* Feature 1: Quick Remote Actions */}
                  <section className="space-y-2">
                    <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider flex items-center gap-1`}>
                      <Zap className="w-4 h-4 text-sky-400" />
                      <span>{s.quickRemoteActions}</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'web', 80)}
                        className={`p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "기본 웹 브라우저로 접속 (http://IP)" : "Open in web browser (http://IP)"}
                      >
                        <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="truncate">{s.remoteWeb}</span>
                      </button>

                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'web_ssl', 443)}
                        className={`p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "보안 웹(HTTPS) 접속 (https://IP)" : "Open HTTPS web (https://IP)"}
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{s.remoteWebSSL}</span>
                      </button>

                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'rdp', 3389)}
                        className={`p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "Windows 원격 데스크톱(mstsc.exe) 실행" : "Launch Windows Remote Desktop (mstsc.exe)"}
                      >
                        <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="truncate">{s.remoteRdp}</span>
                      </button>

                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'ssh', 22)}
                        className={`p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "SSH 콘솔/PuTTY 세션 호출" : "Launch SSH Console / PuTTY session"}
                      >
                        <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{s.remoteSsh}</span>
                      </button>

                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'smb', 445)}
                        className={`p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "Windows 탐색기로 SMB 공유 폴더 (\\\\IP) 열기" : "Open SMB Shared Folder (\\\\IP)"}
                      >
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{s.remoteSmb}</span>
                      </button>

                      <button
                        onClick={() => handleRemoteAction(selectedIp, 'ping')}
                        className={`p-2.5 rounded-xl border border-zinc-500/30 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 font-bold ${isLgText ? 'text-xs' : 'text-[11.5px]'} flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                        title={lang === 'ko' ? "연속 콘솔 Ping 진단 (ping -t IP)" : "Continuous Console Ping (ping -t IP)"}
                      >
                        <Activity className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="truncate">{s.remotePing}</span>
                      </button>
                    </div>
                  </section>

                  {/* Feature 2: Wake-on-LAN (WoL) */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider flex items-center gap-1`}>
                        <Power className="w-4 h-4 text-amber-400" />
                        <span>{s.wolTitle}</span>
                      </span>
                      {!license.features.remoteBoot ? (
                        <button
                          onClick={() => setShowLicenseModal(true)}
                          className={`px-2 py-0.5 rounded ${isLgText ? 'text-[9.5px]' : 'text-[9px]'} font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1 cursor-pointer`}
                          title="Pro 라이선스 활성화 필요"
                        >
                          <Key className="w-3 h-3" />
                          <span>{lang === 'ko' ? 'PRO 전용' : 'PRO Only'}</span>
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded ${isLgText ? 'text-[9.5px]' : 'text-[9px]'} font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`}>
                          {lang === 'ko' ? 'PRO 활성' : 'PRO Active'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSendWakeOnLan(effectiveMac, selectedIp)}
                      disabled={isSendingWol || (license.features.remoteBoot && (!effectiveMac || effectiveMac === 'Unknown'))}
                      className={`w-full ${isLgText ? 'py-3 text-sm' : 'py-2.5 text-xs'} px-3 rounded-xl border font-black uppercase flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                        !license.features.remoteBoot
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 hover:border-amber-400 text-amber-300 hover:shadow-amber-500/10 active:scale-98'
                          : !effectiveMac || effectiveMac === 'Unknown'
                            ? 'opacity-40 cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-400'
                            : 'border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300'
                      }`}
                      title={
                        !license.features.remoteBoot
                          ? (lang === 'ko' ? "원격 부팅(WoL)은 PRO 라이선스 전용 기능입니다. 클릭하여 Pro 라이선스를 활성화하세요." : "Remote Boot (WoL) requires PRO license. Click to activate.")
                          : effectiveMac && effectiveMac !== 'Unknown'
                            ? (lang === 'ko' ? "UDP 9/7 브로드캐스트로 Magic Packet을 발송하여 원격 장비를 부팅합니다" : "Broadcast Magic Packet over UDP 9/7 to boot remote device")
                            : (lang === 'ko' ? "MAC 주소가 확인되지 않아 WoL을 발송할 수 없습니다" : "Cannot send WoL because MAC address is unknown")
                      }
                    >
                      {!license.features.remoteBoot ? (
                        <>
                          <Key className="w-4 h-4 text-amber-400" />
                          <span>{s.wolSendBtn} ({lang === 'ko' ? 'PRO 필요' : 'Requires PRO'})</span>
                        </>
                      ) : (
                        <>
                          <Zap className={`w-4 h-4 text-amber-400 ${isSendingWol ? 'animate-bounce' : ''}`} />
                          <span>{isSendingWol ? (lang === 'ko' ? "매직 패킷 발송 중..." : "Sending Magic Packet...") : s.wolSendBtn}</span>
                        </>
                      )}
                    </button>
                    {!license.features.remoteBoot ? (
                      <div className={`${isLgText ? 'text-[10.5px]' : 'text-[9.5px]'} text-amber-500/80 dark:text-amber-400/80 text-center`}>
                        💡 {lang === 'ko' ? 'PC/서버 원격 부팅(WoL)은 PRO 에디션 이상에서 이용하실 수 있습니다.' : 'Remote Boot (WoL) is available in PRO edition.'}
                      </div>
                    ) : (
                      effectiveMac && effectiveMac !== 'Unknown' && (
                        <div className={`${isLgText ? 'text-[10.5px]' : 'text-[9.5px]'} opacity-60 text-center mono`}>
                          Target MAC: {effectiveMac} {selectedDiffStatus === 'offline' && (lang === 'ko' ? '(이전 기록)' : '(Previous)')} (Broadcast UDP 9/7)
                        </div>
                      )
                    )}
                  </section>

                  {/* Technical Details */}
                  <section className="space-y-2">
                    <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider`}>{s.technicalDetails}</span>
                    <div className={`p-4 ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800'} rounded-xl border space-y-3.5 shadow-sm`}>
                      <div className="flex justify-between items-center">
                        <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>{s.address}</span>
                        <div className="flex items-center gap-1.5">
                          <a 
                            href={`http://${selectedIp}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className={`${isLgText ? 'text-sm' : 'text-xs'} font-black mono text-sky-500 hover:text-sky-400 hover:underline flex items-center gap-1 group/link`}
                            title={lang === 'ko' ? "새 탭에서 열기" : "Open in new tab"}
                          >
                            {selectedIp}
                            <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/link:opacity-100 inline transition-opacity" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyIpAddress(selectedIp)}
                            className={`p-1 px-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              copiedIp === selectedIp
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30'
                                : (theme === 'beige' ? 'bg-[#f5ebd6] hover:bg-[#ebdcc0] border-[#dfcaa7] text-[#5c4a37]' :
                                   theme === 'white' ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' :
                                   'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-300 hover:text-white')
                            }`}
                            title={lang === 'ko' ? `IP 주소 (${selectedIp}) 복사` : `Copy IP Address (${selectedIp})`}
                          >
                            {copiedIp === selectedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400" />}
                            <span>{copiedIp === selectedIp ? (lang === 'ko' ? '복사됨' : 'Copied') : (lang === 'ko' ? '복사' : 'Copy')}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold shrink-0`}>{s.macInfo}</span>
                        <div className="text-right min-w-0">
                          <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-black font-mono tabular-nums text-emerald-500`}>
                            {effectiveMac || 'Unknown'}
                          </span>
                          {selectedDiffStatus === 'offline' && effectiveMac && (
                            <span className={`${isLgText ? 'text-[9.5px]' : 'text-[8.5px]'} text-rose-400 font-bold ml-1`}>
                              ({lang === 'ko' ? '이전 기준' : 'Baseline'})
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Manufacturer & Hybrid OUI Classification Profile */}
                      <div className="border-t border-current border-opacity-5 pt-3 space-y-2.5">
                        {(() => {
                          const liveClass = classifyDevice(effectiveDevice?.vendor || '', effectiveDevice?.openPorts || [], s, {
                            ip: selectedIp,
                            hostname: effectiveDevice?.hostname,
                            mdns: effectiveDevice?.mdns,
                            webTitle: effectiveDevice?.webTitle,
                            upnp: effectiveDevice?.upnp,
                            snmp: effectiveDevice?.snmp,
                            mac: effectiveMac,
                            realVendor: effectiveDevice?.realVendor,
                            chipsetVendor: effectiveDevice?.chipsetVendor,
                            vendorSource: effectiveDevice?.vendorSource,
                            ouiBlockType: effectiveDevice?.ouiBlockType,
                            ouiPrefix: effectiveDevice?.ouiPrefix,
                            isRandomizedMac: effectiveDevice?.isRandomizedMac,
                            lang
                          });
                          const hasRealBrand = Boolean(effectiveDevice?.realVendor && effectiveDevice.realVendor !== (effectiveDevice.chipsetVendor || effectiveDevice.vendor));
                          const isRealPrimary = vendorPriorityMode === 'real' || (vendorPriorityMode === 'auto' && hasRealBrand);
                          const blockType = effectiveDevice?.ouiBlockType || liveClass.ouiBlockType || 'UNKNOWN';
                          const ouiPrefix = effectiveDevice?.ouiPrefix || liveClass.ouiPrefix || (effectiveMac && effectiveMac.length >= 8 ? effectiveMac.substring(0, 8).toUpperCase() : '');
                          const isRandomMac = effectiveDevice?.isRandomizedMac ?? liveClass.isRandomizedMac ?? false;
                          const isChipsetOem = effectiveDevice?.isChipsetOem ?? liveClass.isChipsetOem ?? false;
                          const reasons = effectiveDevice?.classificationReasons?.length ? effectiveDevice.classificationReasons : (liveClass.classificationReasons || []);
                          const overallConfidence = effectiveDevice?.confidenceScore || liveClass.confidenceScore || 75;
                          const visibleReasons = showAllClassificationReasons ? reasons : reasons.slice(0, 3);
                          const blockLabel =
                            blockType === 'MA-S' ? (lang === 'ko' ? 'MA-S (36비트 정밀)' : 'MA-S (36-bit)') :
                            blockType === 'MA-M' ? (lang === 'ko' ? 'MA-M (28비트 중형)' : 'MA-M (28-bit)') :
                            blockType === 'MA-L' ? (lang === 'ko' ? 'MA-L (24비트 표준)' : 'MA-L (24-bit)') :
                            blockType === 'LAA' ? (lang === 'ko' ? 'LAA (랜덤 MAC)' : 'LAA (Randomized)') :
                            blockType === 'LAA-VM' ? (lang === 'ko' ? '가상화 LAA NIC' : 'Virtual LAA NIC') :
                            blockType === 'PRIVATE' ? (lang === 'ko' ? 'IEEE Private 블록' : 'IEEE Private Block') :
                            (lang === 'ko' ? '미등록 OUI' : 'Unregistered OUI');
                          const isLightTheme = theme === 'white' || theme === 'beige';
                          
                          return (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-black tracking-wider flex items-center gap-1`}>
                                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                                  <span>{lang === 'ko' ? '제조사 및 칩셋 프로필' : 'Vendor & Chipset Profile'}</span>
                                </span>
                                <span className={`text-[10px] font-mono tabular-nums font-bold ${
                                  isRandomMac
                                    ? 'text-amber-500'
                                    : hasRealBrand
                                      ? (isRealPrimary ? 'text-sky-500' : 'text-amber-500')
                                      : 'text-emerald-500'
                                }`}>
                                  {isRandomMac
                                    ? (lang === 'ko' ? 'LAA 랜덤 MAC 감지' : 'LAA Random MAC')
                                    : hasRealBrand
                                      ? (isRealPrimary
                                          ? (lang === 'ko' ? `완제품 우선 · ${effectiveDevice?.realVendorConfidence || 99}%` : `Brand Focus · ${effectiveDevice?.realVendorConfidence || 99}%`)
                                          : (lang === 'ko' ? `칩셋 OUI 우선 · ${effectiveDevice?.chipsetConfidence || 85}%` : `OUI Focus · ${effectiveDevice?.chipsetConfidence || 85}%`))
                                      : (lang === 'ko' ? `${blockType} 식별 · ${effectiveDevice?.chipsetConfidence || liveClass.chipsetConfidence}%` : `${blockType} Matched · ${effectiveDevice?.chipsetConfidence || liveClass.chipsetConfidence}%`)}
                                </span>
                              </div>

                              {/* LAA Randomized MAC Backtracking Notice (unboxed clean alert strip) */}
                              {isRandomMac && (
                                <div className={`px-3 py-2 rounded-lg border text-[11px] leading-snug ${
                                  isLightTheme
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                }`}>
                                  <div className="font-bold flex items-center justify-between gap-2">
                                    <span>{lang === 'ko' ? '프라이버시 랜덤 MAC (LAA) 감지' : 'Privacy Randomized MAC (LAA)'}</span>
                                    <span className="font-mono tabular-nums text-[10px] opacity-80">{ouiPrefix}</span>
                                  </div>
                                  <p className="text-[10px] opacity-80 mt-0.5">
                                    {lang === 'ko'
                                      ? '스마트폰·노트북의 MAC 무작위화 주소입니다. mDNS·호스트명·포트 신호를 역추적하여 기기 유형을 보정했습니다.'
                                      : 'Locally administered randomized MAC. Device identity restored via mDNS, hostname, and port backtracking.'}
                                  </p>
                                </div>
                              )}

                              {hasRealBrand ? (
                                <div className="space-y-2">
                                  {/* Card 1: Real Manufacturer (SSDP / mDNS) */}
                                  <div className={`p-3 rounded-xl transition-all duration-200 relative border ${
                                    isRealPrimary
                                      ? (isLightTheme ? 'bg-sky-50 border-sky-400 text-slate-900' : 'bg-sky-500/15 border-sky-400 text-sky-100')
                                      : (isLightTheme ? 'bg-white border-slate-200 text-slate-700 opacity-85 hover:opacity-100' : 'bg-sky-950/20 border-sky-500/20 opacity-80 hover:opacity-100')
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0 text-[10px]">
                                        <span className={`font-black uppercase tracking-wide ${isRealPrimary ? (isLightTheme ? 'text-sky-700' : 'text-sky-300') : 'text-sky-500'}`}>
                                          {lang === 'ko' ? '실제 완제품 제조사' : 'Real Brand'}
                                        </span>
                                        <span aria-hidden="true" className="opacity-40">·</span>
                                        <span className="font-mono text-[10px] opacity-75 truncate">
                                          {effectiveDevice?.vendorSource || 'UPnP XML'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleCopyIpAddress(effectiveDevice?.realVendor!)}
                                          className="p-1 rounded text-[9px] font-bold bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 border border-sky-500/30 transition-all cursor-pointer flex items-center gap-0.5"
                                          title={lang === 'ko' ? `실제 제조사명 '${effectiveDevice?.realVendor}' 복사` : `Copy brand name`}
                                        >
                                          <Copy className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice?.realVendor)}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500 hover:bg-sky-400 text-black border border-sky-400 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                                          title={lang === 'ko' ? `실제 제조사 '${effectiveDevice?.realVendor}'를 이 장치 이름으로 설정` : `Set '${effectiveDevice?.realVendor}' as device name`}
                                        >
                                          {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                                        </button>
                                      </div>
                                    </div>
                                    <div className={`${isLgText ? 'text-base' : 'text-sm'} font-black truncate`}>
                                      {effectiveDevice?.realVendor}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] opacity-75 mt-1 border-t border-sky-500/15 pt-1">
                                      <span>{lang === 'ko' ? 'UPnP/mDNS 프로토콜 분석 기반' : 'Identified via UPnP/mDNS payloads'}</span>
                                      <span className="font-mono tabular-nums font-bold text-sky-500">
                                        {effectiveDevice?.realVendorConfidence || 99}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Card 2: Chipset Vendor (IEEE OUI) */}
                                  <div className={`p-3 rounded-xl transition-all duration-200 relative border ${
                                    !isRealPrimary
                                      ? (isLightTheme ? 'bg-amber-50 border-amber-400 text-slate-900' : 'bg-amber-500/15 border-amber-400 text-amber-100')
                                      : (isLightTheme ? 'bg-white border-slate-200 text-slate-700 opacity-85 hover:opacity-100' : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 opacity-80 hover:opacity-100')
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0 text-[10px]">
                                        <span className={`font-black uppercase tracking-wide ${!isRealPrimary ? 'text-amber-500' : 'opacity-75'}`}>
                                          {isChipsetOem ? (lang === 'ko' ? '칩셋 OEM (OUI)' : 'Chipset OEM (OUI)') : (lang === 'ko' ? '하드웨어 OUI' : 'Hardware OUI')}
                                        </span>
                                        {ouiPrefix && (
                                          <>
                                            <span aria-hidden="true" className="opacity-40">·</span>
                                            <span className="font-mono tabular-nums opacity-75">{ouiPrefix} / {blockType}</span>
                                          </>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyIpAddress(effectiveDevice?.chipsetVendor || effectiveDevice?.vendor || '')}
                                        className="p-1 rounded text-[9px] font-bold bg-zinc-500/15 hover:bg-zinc-500/25 border border-current/15 transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                                        title={lang === 'ko' ? '칩셋 제조사명 복사' : 'Copy chipset vendor'}
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                    <div className={`${isLgText ? 'text-sm' : 'text-xs'} font-bold truncate`}>
                                      {effectiveDevice?.chipsetVendor || effectiveDevice?.vendor || 'Unknown Hardware Vendor'}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] opacity-75 mt-1 border-t border-current/10 pt-1">
                                      <span>{blockLabel}</span>
                                      <span className="font-mono tabular-nums text-amber-500 font-bold">
                                        {effectiveDevice?.chipsetConfidence || liveClass.chipsetConfidence}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Single Unified Vendor Card */
                                <div className={`p-3 rounded-xl border relative space-y-1 ${
                                  theme === 'beige' ? 'bg-[#f5ebd6]/70 border-[#dfcaa7] text-[#3d2914]' :
                                  theme === 'white' ? 'bg-white border-slate-200 text-slate-900' :
                                  'bg-zinc-900/50 border-zinc-800 text-zinc-100'
                                }`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] min-w-0">
                                      <span className={`${t.textMuted} uppercase font-bold`}>
                                        {isRandomMac
                                          ? (lang === 'ko' ? '랜덤 MAC 식별' : 'Randomized MAC')
                                          : isChipsetOem
                                            ? (lang === 'ko' ? '칩셋 OEM 제조사' : 'Chipset OEM (OUI)')
                                            : (lang === 'ko' ? '통합 제조사 (IEEE OUI)' : 'Vendor (IEEE OUI)')}
                                      </span>
                                      {ouiPrefix && (
                                        <>
                                          <span aria-hidden="true" className="opacity-40">·</span>
                                          <span className="font-mono tabular-nums opacity-75">{ouiPrefix}</span>
                                        </>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyIpAddress(effectiveDevice?.vendor || 'Unknown')}
                                      className="p-1 rounded text-[9px] font-bold bg-zinc-500/15 hover:bg-zinc-500/25 border border-current/15 transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                                      title={lang === 'ko' ? '제조사명 복사' : 'Copy vendor name'}
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <div className={`${isLgText ? 'text-base' : 'text-sm'} font-bold truncate`}>
                                    {effectiveDevice?.vendor || 'Unknown Vendor'}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] opacity-75 border-t border-current/10 pt-1">
                                    <span>{blockLabel}{isChipsetOem ? (lang === 'ko' ? ' · 칩셋 모듈' : ' · Chipset OEM') : ''}</span>
                                    <span className="font-mono tabular-nums text-emerald-500 font-bold">
                                      {effectiveDevice?.chipsetConfidence || liveClass.chipsetConfidence}%
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Classification Confidence & Evidence Breakdown */}
                              <div className={`p-3 rounded-xl border space-y-2 ${
                                theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#3d2914]' :
                                theme === 'white' ? 'bg-white border-slate-200 text-slate-900' :
                                'bg-black/25 border-white/10 text-zinc-200'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`${t.textMuted} text-[10px] uppercase font-black tracking-wider`}>
                                    {lang === 'ko' ? '장치 구분 신뢰도 & 판별 근거' : 'Classification Confidence & Evidence'}
                                  </span>
                                  <span className={`font-mono tabular-nums text-xs font-black ${
                                    overallConfidence >= 85 ? 'text-emerald-500' : overallConfidence >= 65 ? 'text-sky-500' : 'text-amber-500'
                                  }`}>
                                    {overallConfidence}% ({overallConfidence >= 85 ? (lang === 'ko' ? '높음' : 'High') : overallConfidence >= 65 ? (lang === 'ko' ? '보통' : 'Medium') : (lang === 'ko' ? '추정' : 'Estimated')})
                                  </span>
                                </div>

                                <div className="w-full h-1.5 rounded-full overflow-hidden bg-zinc-500/20">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      overallConfidence >= 85 ? 'bg-emerald-500' : overallConfidence >= 65 ? 'bg-sky-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(8, overallConfidence))}%` }}
                                  />
                                </div>

                                {reasons.length > 0 ? (
                                  <div className="space-y-1.5 pt-1 border-t border-current/10">
                                    {visibleReasons.map((reason, rIdx) => (
                                      <div key={`${reason.source}-${rIdx}`} className="flex items-start justify-between gap-2 text-[11px] leading-snug">
                                        <div className="flex items-baseline gap-1.5 min-w-0">
                                          <span className="font-mono tabular-nums text-[9.5px] font-bold uppercase text-sky-500 shrink-0">
                                            [{reason.source}]
                                          </span>
                                          <span className="opacity-90 break-words">{reason.detail}</span>
                                        </div>
                                        <span className="font-mono tabular-nums text-[10px] font-bold text-emerald-500 shrink-0">
                                          +{reason.weight}
                                        </span>
                                      </div>
                                    ))}
                                    {reasons.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => setShowAllClassificationReasons((prev) => !prev)}
                                        className="text-[10px] font-bold text-sky-500 hover:text-sky-400 transition-colors cursor-pointer pt-0.5"
                                      >
                                        {showAllClassificationReasons
                                          ? (lang === 'ko' ? '근거 접기 ▲' : 'Show less ▲')
                                          : (lang === 'ko' ? `모든 근거 보기 (+${reasons.length - 3}건) ▼` : `Show all evidence (+${reasons.length - 3}) ▼`)}
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[10.5px] opacity-65 pt-1 border-t border-current/10">
                                    {lang === 'ko'
                                      ? '단일 기본 응답만 수신되었습니다. 정밀 스캔 실행 시 포트 및 mDNS 근거가 보강됩니다.'
                                      : 'Only basic response received. Enable Deep Scan to gather port and mDNS signals.'}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                        <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>{s.os}</span>
                        <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-bold`}>{effectiveDevice?.os || 'Unknown'}</span>
                      </div>
                      {(effectiveDevice?.deviceModel || effectiveDevice?.deviceType) && (
                        <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>{lang === 'ko' ? '기기 모델/분류' : 'Device Model / Type'}</span>
                          <div className="flex items-center gap-1.5 min-w-0 ml-4">
                            <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-black text-sky-400 truncate text-right`}>
                              {effectiveDevice.deviceModel ? `${effectiveDevice.deviceModel} (${effectiveDevice.deviceType})` : effectiveDevice.deviceType}
                            </span>
                            {effectiveDevice.deviceModel && (
                              <button
                                type="button"
                                onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.deviceModel)}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border border-sky-500/30 shrink-0 transition-colors cursor-pointer"
                                title={lang === 'ko' ? `기기 모델 '${effectiveDevice.deviceModel}'을 이 장치 이름으로 설정` : `Set model '${effectiveDevice.deviceModel}' as device name`}
                              >
                                {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {effectiveDevice?.mdns && (
                        <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>mDNS</span>
                          <div className="flex items-center gap-1.5 min-w-0 ml-4">
                            <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-bold truncate text-sky-500`}>{effectiveDevice.mdns}</span>
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.mdns)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border border-sky-500/30 shrink-0 transition-colors cursor-pointer"
                              title={lang === 'ko' ? `mDNS 이름 '${effectiveDevice.mdns}'을 이 장치 이름으로 설정` : `Set mDNS name '${effectiveDevice.mdns}' as device name`}
                            >
                              {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                            </button>
                          </div>
                        </div>
                      )}
                      {effectiveDevice?.upnp && (
                        <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>UPnP</span>
                          <div className="flex items-center gap-1.5 min-w-0 ml-4">
                            <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-bold truncate text-purple-500`}>{effectiveDevice.upnp}</span>
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.upnp)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 shrink-0 transition-colors cursor-pointer"
                              title={lang === 'ko' ? `UPnP 이름 '${effectiveDevice.upnp}'을 이 장치 이름으로 설정` : `Set UPnP name '${effectiveDevice.upnp}' as device name`}
                            >
                              {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                            </button>
                          </div>
                        </div>
                      )}
                      {effectiveDevice?.snmp && (
                        <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>SNMP</span>
                          <div className="flex items-center gap-1.5 min-w-0 ml-4">
                            <span className={`${isLgText ? 'text-sm' : 'text-xs'} font-bold truncate text-amber-500`}>{effectiveDevice.snmp}</span>
                            <button
                              type="button"
                              onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.snmp)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 shrink-0 transition-colors cursor-pointer"
                              title={lang === 'ko' ? `SNMP 이름 '${effectiveDevice.snmp}'을 이 장치 이름으로 설정` : `Set SNMP name '${effectiveDevice.snmp}' as device name`}
                            >
                              {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                            </button>
                          </div>
                        </div>
                      )}
                      {effectiveDevice?.nameSource && effectiveDevice.nameSource !== 'UNKNOWN' && (
                        <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[11px]' : 'text-[10px]'} uppercase font-bold`}>{lang === 'ko' ? '이름 식별 출처' : 'Name Source'}</span>
                          <button
                            type="button"
                            onClick={() => handleSaveNickname(effectiveMac, selectedIp, effectiveDevice.hostname)}
                            className={`px-2 py-0.5 rounded font-black text-xs border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              effectiveDevice.nameSource === 'SMB' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30' :
                              effectiveDevice.nameSource === 'NETBIOS' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/30' :
                              effectiveDevice.nameSource === 'MDNS' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 hover:bg-purple-500/30' :
                              effectiveDevice.nameSource === 'WSD' || effectiveDevice.nameSource === 'UPNP' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' :
                              effectiveDevice.nameSource === 'SNMP' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30' :
                              effectiveDevice.nameSource === 'WEB' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' :
                              'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30'
                            }`}
                            title={lang === 'ko' ? `클릭하여 "${effectiveDevice.hostname}"(출처: ${effectiveDevice.nameSource})을 이 장치 이름으로 적용` : `Click to apply "${effectiveDevice.hostname}" (Source: ${effectiveDevice.nameSource})`}
                          >
                            {effectiveDevice.nameSource} ({
                              effectiveDevice.nameSource === 'SMB' ? 'SMB NTLMSSP' :
                              effectiveDevice.nameSource === 'NETBIOS' ? 'NetBIOS UDP 137' :
                              effectiveDevice.nameSource === 'MDNS' ? 'mDNS Bonjour' :
                              effectiveDevice.nameSource === 'WSD' ? 'WS-Discovery' :
                              effectiveDevice.nameSource === 'UPNP' ? 'UPnP SSDP' :
                              effectiveDevice.nameSource === 'SNMP' ? 'SNMP sysName' :
                              effectiveDevice.nameSource === 'WEB' ? 'Web Title / TLS' : 'DNS PTR'
                            }) ↵
                          </button>
                        </div>
                      )}
                      {effectiveDevice?.hostnameSources && Object.keys(effectiveDevice.hostnameSources).length > 0 && (
                        <div className="border-t border-current border-opacity-5 pt-3 space-y-1.5">
                          <span className={`${t.textMuted} ${isLgText ? 'text-[10.5px]' : 'text-[9.5px]'} uppercase font-bold block`}>
                            {lang === 'ko' 
                              ? `탐색된 프로토콜별 이름 목록 (${Object.keys(effectiveDevice.hostnameSources).length}개 채널) - 클릭 시 즉시 적용` 
                              : `Discovered Protocol Names (${Object.keys(effectiveDevice.hostnameSources).length} channels) - Click to apply`}
                          </span>
                          <div className={`space-y-1 p-2.5 rounded-lg font-mono text-[11px] border ${
                            theme === 'white' ? 'bg-slate-100 border-slate-200' : theme === 'beige' ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]' : 'bg-black/20 border-white/5'
                          }`}>
                            {Object.entries(effectiveDevice.hostnameSources).map(([src, nm]) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => handleSaveNickname(effectiveMac, selectedIp, nm)}
                                className="w-full flex justify-between items-center py-1 px-1.5 rounded hover:bg-white/10 active:bg-white/20 transition-all cursor-pointer group/nameitem text-left border border-transparent hover:border-sky-500/30"
                                title={lang === 'ko' ? `클릭하여 "${nm}" 이름(출처: ${src})을 이 장치의 기본 별칭/이름으로 지정` : `Click to assign "${nm}" (${src}) as device name`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`px-1.5 py-0.2 rounded font-black text-[9px] border shrink-0 ${
                                    src === 'SMB' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    src === 'NETBIOS' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                                    src === 'MDNS' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                    src === 'WSD' || src === 'UPNP' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                    src === 'SNMP' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                    src === 'WEB' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                  }`}>[{src}]</span>
                                  <span className="font-bold text-sky-400 group-hover/nameitem:text-sky-300 truncate max-w-[170px]">{nm}</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-400 opacity-60 group-hover/nameitem:opacity-100 transition-opacity shrink-0 ml-1">
                                  {lang === 'ko' ? '적용 ↵' : 'Apply ↵'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Listening Ports & Port Security Audit */}
                  {effectiveDevice?.openPorts && effectiveDevice.openPorts.length > 0 && (
                    <section className="space-y-2">
                      <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider`}>
                        {s.listeningPorts} {selectedDiffStatus === 'offline' && <span className={`${isLgText ? 'text-[9.5px]' : 'text-[8.5px]'} text-rose-400 font-bold ml-1`}>({lang === 'ko' ? '이전 기준' : 'Baseline'})</span>}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {effectiveDevice.openPorts.map(p => (
                          <div key={p} className={`px-2.5 py-1 rounded-lg ${isLgText ? 'text-xs' : 'text-[11px]'} font-black mono ${theme === 'beige' ? 'bg-[#f5ebd6] text-[#b45309]' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
                            {p}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Deep Port Security Audit Section */}
                  <section className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} font-black ${t.textMuted} uppercase tracking-wider`}>
                          {s.deepPortAuditBtn}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRunDeepPortAudit(selectedIp)}
                        disabled={isAuditingPorts}
                        className={`px-3 ${isLgText ? 'py-1.5 text-xs' : 'py-1 text-[11px]'} bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded-lg font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer`}
                      >
                        {isAuditingPorts ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === 'ko' ? '분석 중...' : 'Auditing...'}</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'ko' ? '정밀 진단' : 'Audit Ports'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {portAuditResult && portAuditResult.ip === selectedIp && (
                      <div className={`p-3.5 rounded-xl border ${
                        theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/30 border-white/10'
                      } space-y-2 animate-in fade-in`}>
                        <div className={`flex justify-between items-center ${isLgText ? 'text-[11px]' : 'text-[10px]'} opacity-75`}>
                          <span>{lang === 'ko' ? `점검 포트: ${portAuditResult.totalChecked}개` : `Checked: ${portAuditResult.totalChecked} ports`}</span>
                          <span>{lang === 'ko' ? `탐지: ${portAuditResult.openPorts.length}개` : `Detected: ${portAuditResult.openPorts.length}`}</span>
                        </div>
                        {portAuditResult.openPorts.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                            {portAuditResult.openPorts.map((item) => (
                              <div
                                key={item.port}
                                className={`p-2.5 rounded-lg border flex flex-col space-y-1 ${
                                  theme === 'white' ? 'bg-white border-slate-200' : theme === 'beige' ? 'bg-white/80 border-[#e6d0a7]' : 'bg-white/5 border-white/5'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`${isLgText ? 'text-xs' : 'text-[11px]'} font-black mono text-sky-400`}>
                                    {item.port} / {item.service}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded ${isLgText ? 'text-[9.5px]' : 'text-[8.5px]'} font-black uppercase ${
                                      item.risk === 'high'
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : item.risk === 'medium'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {item.risk.toUpperCase()}
                                  </span>
                                </div>
                                <span className={`${isLgText ? 'text-[11px]' : 'text-[10px]'} opacity-75`}>{item.description}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`${isLgText ? 'text-xs' : 'text-[11px]'} text-emerald-400 py-1.5 text-center font-bold`}>
                            {lang === 'ko' ? '✓ 점검 결과 주의 대상 포트가 닫혀있습니다.' : '✓ All target security ports are securely closed.'}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              );
            })()}
           </div>
        </aside>
      )}

      {/* Source Info Modal */}
      {showSourceInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
           <div className={`w-full max-w-md ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-6`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-sky-500" />
                  <h3 className="font-black text-sm uppercase tracking-tight">{s.ouiMasterDb}</h3>
                </div>
                <button onClick={() => setShowSourceInfo(false)} className="p-1 hover:opacity-50"><X className="w-5 h-5" /></button>
              </div>
              
              <p className="text-xs leading-relaxed opacity-70">
                {s.ouiDescription1}<b>{s.ouiDescription2}</b>{s.ouiDescription3}
              </p>

              <div className="space-y-3">
                 <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{s.activeSource}</span>
                      <span className="text-[10px] font-black text-sky-500">{registryMeta.sourceName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{s.ouiCapacity}</span>
                      <span className="text-[11px] font-black mono">{registryMeta.count.toLocaleString()} {s.vendors}</span>
                    </div>
                    {registryMeta.databaseLocation && (
                      <div className="pt-2 border-t border-white/5 flex flex-col space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{s.ouiLocationLabel}</span>
                        <span className="text-[10px] mono break-all opacity-80 select-all">{registryMeta.databaseLocation}</span>
                      </div>
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">{s.referenceData}</label>
                    <div className="grid grid-cols-1 gap-2">
                       <a href="https://standards-oui.ieee.org/oui/oui.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : theme === 'white' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-L (24-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui/oui.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://standards-oui.ieee.org/oui28/mam.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : theme === 'white' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-M (28-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui28/mam.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://standards-oui.ieee.org/oui36/oui36.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : theme === 'white' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-S (36-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui36/oui36.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://www.wireshark.org/download/automated/data/manuf" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : theme === 'white' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">Wireshark Manuf Database (Automated)</div>
                            <div className="text-[9px] opacity-50 mono">wireshark.org/.../automated/data/manuf</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setShowSourceInfo(false)}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase transition-all shadow-xl"
              >
                {s.done}
              </button>
           </div>
        </div>
      )}

      {/* Security Notice Modal */}
      {showSecurityNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
           <div className={`w-full max-w-md ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-6 animate-in zoom-in-95 duration-200`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-sm uppercase tracking-tight">{s.securityNoticeTitle}</h3>
                </div>
                <button onClick={() => setShowSecurityNotice(false)} className="p-1 hover:opacity-50"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : theme === 'white' ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{s.falsePositiveTitle}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                    {s.falsePositiveDesc}
                  </p>
                </div>

                <div className="space-y-3 px-1">
                  <div className="flex gap-3">
                    <div className="mt-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold">{s.safeTool}</p>
                      <p className="text-[10px] opacity-60 leading-tight">{s.safeToolDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold">{s.detectionReason}</p>
                      <p className="text-[10px] opacity-60 leading-tight">{s.detectionReasonDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold">{s.solution}</p>
                      <p className="text-[10px] opacity-60 leading-tight">{s.solutionDesc}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSecurityNotice(false)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase transition-all shadow-xl"
              >
                {s.understand}
              </button>
           </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
           <div className={`w-full max-w-xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-4 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
              {/* Modal Top Header */}
              <div className="flex justify-between items-center flex-shrink-0">
                 <div className="flex items-center space-x-2">
                   <HelpCircle className="w-5 h-5 text-sky-500" />
                   <h3 className="font-black text-sm uppercase tracking-tight">{s.helpTitle}</h3>
                 </div>
                 <button onClick={() => setShowHelp(false)} className="p-1 hover:opacity-50 transition-opacity cursor-pointer">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              {/* Help Modal Tabs */}
              <div className={`flex border-b shrink-0 gap-2 ${theme === 'white' ? 'border-slate-200' : theme === 'beige' ? 'border-[#e6d0a7]' : 'border-white/10'}`}>
                <button
                  onClick={() => setHelpTab('guide')}
                  className={`pb-2.5 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    helpTab === 'guide'
                      ? 'border-sky-500 text-sky-400'
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
                      handleManualCheckUpdate(false);
                    }
                  }}
                  className={`pb-2.5 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
                    helpTab === 'update'
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-sky-400' : ''}`} />
                  <span>{s.helpTabUpdate || (lang === 'ko' ? 'GitHub 업데이트 확인' : 'GitHub Updates')}</span>
                  {updateInfo?.hasUpdate && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white font-mono">
                        NEW
                      </span>
                    </span>
                  )}
                </button>
              </div>
              
              {/* Tab 1: User Guide & License */}
              {helpTab === 'guide' && (
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar">
                  {/* Hero App Brand Card with Large Icon */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left ${
                    theme === 'beige' ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]' : theme === 'white' ? 'bg-gradient-to-br from-sky-50 to-indigo-50/50 border-sky-200 text-slate-800' : 'bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent border-sky-500/20'
                  }`}>
                    <img 
                      src="./logo.png" 
                      alt="Grid IP Scanner2" 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border-2 border-sky-500/40 shadow-xl shadow-sky-500/20 shrink-0" 
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-black tracking-tight uppercase">Grid IP Scanner2</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">v{CURRENT_APP_VERSION}</span>
                      </div>
                      <p className="text-[11px] opacity-75 leading-snug">
                         초고속 C-Class 네트워크 비주얼 탐색 및 9만 건 OUI 식별 엔진
                      </p>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-center sm:justify-start gap-2 font-mono pt-0.5 flex-wrap">
                        <span>개발자: AhBiYout</span>
                        <span>•</span>
                        <span>GitHub: AhBiYout-all</span>
                        <span>•</span>
                        <span>저장소: grid-ip-scanner2</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. License Section */}
                  <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="font-black uppercase tracking-wider">{s.helpLicenseTitle}</span>
                    </div>
                    <p className="opacity-90 whitespace-pre-line">
                      {s.helpLicenseDesc}
                    </p>
                  </div>

                  {/* 2. Usage Guide Section */}
                  <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-sky-500" />
                      <span className="font-black uppercase tracking-wider">{s.helpUsageTitle}</span>
                    </div>
                    <p className="opacity-90 whitespace-pre-line leading-relaxed">
                      {s.helpUsageDesc}
                    </p>
                  </div>

                  {/* 3. Creator Contact & GitHub Section */}
                  <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Github className="w-4 h-4 text-sky-400" />
                        <span className="font-black uppercase tracking-wider">{s.creatorContact}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">
                        Open Source & Issues
                      </span>
                    </div>
                    <div className="space-y-2.5 text-[11px] opacity-90">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{lang === 'ko' ? '개발자:' : 'Developer:'} <span className="font-bold">AhBiYout</span> <span className="text-[10px] font-mono opacity-60">(@AhBiYout-all)</span></span>
                        <a 
                          href="https://github.com/AhBiYout-all/grid-ip-scanner2/issues"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>{lang === 'ko' ? 'GitHub 이슈 문의' : 'GitHub Issues'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="opacity-70">{lang === 'ko' ? '저장소 (Repo):' : 'Repository:'}</span>
                        <a href="https://github.com/AhBiYout-all/grid-ip-scanner2" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline font-bold flex items-center gap-1">
                          <span>github.com/AhBiYout-all/grid-ip-scanner2</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-70">{lang === 'ko' ? '구글블로그:' : 'Google Blog:'}</span>
                        <a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline font-bold">
                          ahbiyoutvibe.blogspot.com
                        </a>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[10px] opacity-60 text-center mono">
                        Copyright (c) 2025-2026 AhBiYout. All rights reserved.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: GitHub Updates Integrated Tab */}
              {helpTab === 'update' && (
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar">
                  {/* Version Comparison Matrix Card */}
                  <div className={`p-4 rounded-2xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]' : theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/30 border-white/10'} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Github className="w-4 h-4 text-sky-400" />
                        <span className="font-black text-xs uppercase tracking-tight">{lang === 'ko' ? 'GitHub 릴리스 버전 상태' : 'GitHub Release Status'}</span>
                      </div>
                      <button
                        onClick={() => handleManualCheckUpdate(false)}
                        disabled={isCheckingUpdate}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={lang === 'ko' ? 'GitHub 최신 릴리스 실시간 조회' : 'Check latest release on GitHub'}
                      >
                        <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-sky-400' : ''}`} />
                        <span>{isCheckingUpdate ? (lang === 'ko' ? '확인 중...' : 'Checking...') : (lang === 'ko' ? '실시간 점검' : 'Check Now')}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme === 'white' ? 'bg-white border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                        <span className="text-[10px] opacity-60 font-semibold">{lang === 'ko' ? '현재 실행 버전' : 'Current Installed'}</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-base font-black font-mono text-sky-400">v{CURRENT_APP_VERSION}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 font-bold">{lang === 'ko' ? '로컬' : 'Local'}</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                        updateInfo?.hasUpdate 
                          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/5'
                      }`}>
                        <span className="text-[10px] opacity-60 font-semibold">{lang === 'ko' ? 'GitHub 최신 릴리스' : 'Latest Release'}</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className={`text-base font-black font-mono ${updateInfo?.hasUpdate ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            v{updateInfo?.latestVersion || CURRENT_APP_VERSION}
                          </span>
                          {updateInfo?.hasUpdate ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold animate-pulse">
                              {lang === 'ko' ? '업데이트 가능' : 'Update Available'}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-bold">
                              {lang === 'ko' ? '최신 상태' : 'Up to Date'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Update Status Banner */}
                  {updateInfo?.hasUpdate ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-black text-xs text-emerald-400 flex items-center gap-1.5">
                            <span>{lang === 'ko' ? `🚀 새 정식 버전 (v${updateInfo.latestVersion}) 사용 가능` : `🚀 New Release (v${updateInfo.latestVersion}) Available`}</span>
                          </h4>
                          <p className="text-[11px] opacity-80 leading-snug">
                            {lang === 'ko' 
                              ? '네트워크 탐지 엔진 및 보안 감사 기능이 강화되었습니다. 아래 배포 패키지 중 원하는 플랫폼을 선택하여 즉시 다운로드하세요.' 
                              : 'Latest network engine updates and security improvements are available. Choose your platform below.'}
                          </p>
                        </div>
                      </div>

                      {/* Download Buttons Matrix */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* Windows Setup Installer */}
                        <a
                          href={updateInfo.installerExeUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}_Setup.exe`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 flex items-center justify-between group transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <Download className="w-4 h-4 text-sky-400 group-hover:translate-y-0.5 transition-transform" />
                            <div className="text-left">
                              <div className="font-black text-[11px] text-white">Windows Setup</div>
                              <div className="text-[9px] opacity-60">정식 8단계 인스톨러 (.exe)</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* Windows Portable */}
                        <a
                          href={updateInfo.portableExeUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}_Portable.exe`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <Package className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                            <div className="text-left">
                              <div className="font-black text-[11px]">Windows Portable</div>
                              <div className="text-[9px] opacity-60">단일 무설치 포터블 (.exe)</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* Android Mobile APK */}
                        <a
                          href={updateInfo.androidApkUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${updateInfo.latestVersion}/Grid_IP_Scanner2_v${updateInfo.latestVersion}.apk`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-between group transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <Smartphone className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                            <div className="text-left">
                              <div className="font-black text-[11px] text-white">Android Mobile</div>
                              <div className="text-[9px] opacity-60">스마트폰 정식 APK (.apk)</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* PWA / Web Instant Sync */}
                        <button
                          onClick={handleSyncPwaNow}
                          className="p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center justify-between group transition-all cursor-pointer shadow-sm"
                          title="Service Worker 및 브라우저 캐시를 삭제하고 최신 번들로 즉시 새로고침"
                        >
                          <div className="flex items-center gap-2.5">
                            <Zap className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                            <div className="text-left">
                              <div className="font-black text-[11px] text-white">PWA / Web 즉시 적용</div>
                              <div className="text-[9px] opacity-60">캐시 초기화 & 실시간 갱신</div>
                            </div>
                          </div>
                          <RefreshCw className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                      </div>

                      {/* Release Notes Preview */}
                      {updateInfo.releaseNotes && (
                        <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-sky-400">
                            <span>📋 {lang === 'ko' ? '릴리스 변경 사항 및 패치노트' : 'Release Notes & Changelog'}</span>
                            <span className="font-mono text-zinc-400 font-normal">{updateInfo.publishedAt ? new Date(updateInfo.publishedAt).toLocaleDateString() : ''}</span>
                          </div>
                          <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto opacity-80 leading-relaxed no-scrollbar bg-black/20 p-2 rounded-lg border border-white/5">
                            {updateInfo.releaseNotes}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div className="space-y-0.5">
                        <h4 className="font-black text-xs text-emerald-400">
                          {lang === 'ko' ? `현재 최신 버전(v${CURRENT_APP_VERSION})을 사용 중입니다.` : `You are using the latest version (v${CURRENT_APP_VERSION}).`}
                        </h4>
                        <p className="text-[11px] opacity-75 leading-tight">
                          {lang === 'ko' 
                            ? '공식 GitHub Releases 저장소와 일치하며 모든 스캔 엔진 및 9만 건 OUI DB가 최신 상태입니다.' 
                            : 'Synchronized with the official GitHub release repository.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Official Links & Information */}
                  <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-white/5 border-white/5'} space-y-2 text-[11px]`}>
                    <div className="font-black uppercase tracking-wider text-[10px] text-zinc-400 mb-1">
                      {lang === 'ko' ? '공식 GitHub 릴리스 배포 채널' : 'Official GitHub Channels'}
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="opacity-70">{lang === 'ko' ? 'GitHub 릴리스 목록:' : 'GitHub Releases:'}</span>
                      <a 
                        href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`}
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sky-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>releases/latest</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="opacity-70">{lang === 'ko' ? '공식 소스 저장소:' : 'Repository:'}</span>
                      <a 
                        href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sky-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="opacity-70">{lang === 'ko' ? '개발자 공식 블로그:' : 'Official Blog:'}</span>
                      <a 
                        href="https://ahbiyoutvibe.blogspot.com/" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sky-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>ahbiyoutvibe.blogspot.com</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </div>

                    <div className="pt-2 text-[10px] opacity-60 text-center mono">
                      Auto-Update Pipeline Powered by GitHub Releases API
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase transition-all shadow-xl flex-shrink-0 cursor-pointer active:scale-98"
              >
                {s.done || "Done"}
              </button>
           </div>
        </div>
      )}

      {/* Network Adapter Explorer & Filter Modal */}
      {showInterfaceModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <img 
                    src="./logo.png" 
                    alt="Grid IP" 
                    className="w-12 h-12 rounded-xl object-cover border border-sky-500/40 shadow-md shrink-0" 
                  />
                  <div>
                    <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                      <span>{s.networkAdapters}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500 text-white font-mono font-bold">
                        {interfaces.length}
                      </span>
                    </h3>
                    <p className="text-[11px] opacity-70">
                      {s.networkAdaptersDesc}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowInterfaceModal(false)} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="space-y-2.5">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={interfaceSearch}
                  onChange={(e) => setInterfaceSearch(e.target.value)}
                  placeholder={s.filterSearchPlaceholder}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium outline-none transition-all ${
                    theme === 'beige'
                      ? 'bg-white border border-[#dfceb0] focus:border-amber-600'
                      : 'bg-black/40 border border-white/10 focus:border-sky-500 text-zinc-100'
                  }`}
                />
                {interfaceSearch && (
                  <button
                    onClick={() => setInterfaceSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { key: 'all', label: s.allAdapters, count: interfaceStats.total },
                  { key: 'up', label: s.activeOnly, count: interfaceStats.active },
                  { key: 'physical', label: s.physicalOnly, count: interfaceStats.physical },
                  { key: 'virtual', label: s.virtualOnly, count: interfaceStats.virtual },
                  { key: 'vpn', label: s.vpnOnly, count: interfaceStats.vpn },
                  { key: 'has_ipv4', label: s.withIpv4, count: interfaceStats.hasIpv4 }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setInterfaceFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      interfaceFilter === tab.key
                        ? 'bg-sky-500 text-white shadow-md'
                        : theme === 'beige'
                          ? 'bg-[#f0e4cf] hover:bg-[#e6d8c0] text-[#5c4a37]'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      interfaceFilter === tab.key ? 'bg-white/20 text-white' : 'bg-black/20 text-zinc-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Adapter Cards List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar max-h-[50vh]">
              {filteredInterfaces.length > 0 ? (
                filteredInterfaces.map((iface, idx) => {
                  const isCurrentTarget = localIpInfo?.subnet === iface.subnet && iface.ip && localIpInfo?.ip === iface.ip;
                  const isWireless = iface.name.toLowerCase().includes('wi-fi') || iface.name.toLowerCase().includes('wlan') || iface.name.toLowerCase().includes('무선');

                  return (
                    <div
                      key={`${iface.name}-${iface.ip}-${idx}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentTarget
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                          : theme === 'beige'
                            ? 'bg-white border-[#dfceb0] hover:border-amber-500/50'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                        {/* Adapter Name & Status */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            iface.status === 'up'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}>
                            {iface.type === 'physical' ? (
                              isWireless ? <Wifi className="w-4 h-4" /> : <Cable className="w-4 h-4" />
                            ) : iface.type === 'virtual' ? (
                              <Box className="w-4 h-4" />
                            ) : iface.type === 'vpn' ? (
                              <Shield className="w-4 h-4" />
                            ) : iface.type === 'loopback' ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Network className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm tracking-tight truncate" title={iface.name}>
                                {iface.name}
                              </span>
                              {iface.isDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Default Gateway
                                </span>
                              )}
                              {isCurrentTarget && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500 text-white">
                                  Active Scan Target
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {/* Status Badge */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                iface.status === 'up'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${iface.status === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                <span>{iface.status === 'up' ? s.statusUp : s.statusDown}</span>
                              </span>

                              {/* Type Badge */}
                              <span className="text-[10px] font-bold opacity-75 uppercase">
                                • {iface.type === 'physical' ? (isWireless ? 'Wi-Fi 무선' : '이더넷 유선') : iface.type === 'virtual' ? '가상(VM/Docker)' : iface.type === 'vpn' ? 'VPN 가상망' : iface.type === 'loopback' ? '루프백' : '기타'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          {iface.ip ? (
                            <button
                              onClick={() => {
                                if (iface.subnet) {
                                  setConfig(prev => ({ ...prev, subnet: iface.subnet }));
                                }
                                setLocalIpInfo(prev => ({ ip: iface.ip, subnet: iface.subnet, computerName: prev?.computerName }));
                                selectedInterfaceIpRef.current = iface.ip;
                                setShowInterfaceModal(false);
                                showToast(`${iface.name} (${iface.subnet}.0/24) 대역으로 스캔 대상이 설정되었습니다.`);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 ${
                                isCurrentTarget
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isCurrentTarget ? "현재 선택됨" : s.setAsScanTarget}</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-800/50 rounded-lg">
                              IP 미할당
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2.5 text-[11px]">
                        {/* IPv4 Address */}
                        <div className="p-2 rounded-lg bg-black/20 space-y-0.5">
                          <div className="text-[9.5px] opacity-60 uppercase font-black tracking-wider">IPv4 / CIDR</div>
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-sky-400 truncate">{iface.cidr || iface.ip || '-'}</span>
                            {iface.ip && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(iface.ip);
                                  showToast(`${iface.ip} 복사되었습니다.`);
                                }}
                                className="p-1 hover:text-white opacity-60 hover:opacity-100"
                                title="IP 복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subnet Target */}
                        <div className="p-2 rounded-lg bg-black/20 space-y-0.5">
                          <div className="text-[9.5px] opacity-60 uppercase font-black tracking-wider">Subnet Range</div>
                          <div className="font-mono font-bold text-zinc-300">
                            {iface.subnet ? `${iface.subnet}.0/24` : '-'}
                          </div>
                        </div>

                        {/* MAC Address */}
                        <div className="p-2 rounded-lg bg-black/20 space-y-0.5">
                          <div className="text-[9.5px] opacity-60 uppercase font-black tracking-wider">Hardware MAC</div>
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="truncate">{iface.mac || '-'}</span>
                            {iface.mac && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(iface.mac!);
                                  showToast(`${iface.mac} 복사되었습니다.`);
                                }}
                                className="p-1 hover:text-white opacity-60 hover:opacity-100"
                                title="MAC 복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* IPv6 Address (if available) */}
                        {iface.ipv6 && (
                          <div className="p-2 rounded-lg bg-black/20 space-y-0.5 sm:col-span-2">
                            <div className="text-[9.5px] opacity-60 uppercase font-black tracking-wider">IPv6 Address</div>
                            <div className="flex items-center justify-between font-mono font-bold text-emerald-400 text-[10px] truncate">
                              <span className="truncate">{iface.ipv6}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(iface.ipv6!);
                                  showToast(`${iface.ipv6} 복사되었습니다.`);
                                }}
                                className="p-1 hover:text-white opacity-60 hover:opacity-100 shrink-0"
                                title="IPv6 복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* MTU & Flags */}
                        <div className="p-2 rounded-lg bg-black/20 space-y-0.5">
                          <div className="text-[9.5px] opacity-60 uppercase font-black tracking-wider">{s.mtuLabel} / {s.flagsLabel}</div>
                          <div className="font-mono text-[10px] truncate text-zinc-300">
                            MTU: {iface.mtu || '-'} | {iface.flags?.slice(0, 3).join(', ') || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-3 rounded-2xl bg-black/20 border border-white/5">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto opacity-75" />
                  <div className="font-bold text-sm">{s.noMatchingAdapters}</div>
                  <button
                    onClick={() => {
                      setInterfaceFilter('all');
                      setInterfaceSearch('');
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    필터 및 검색어 전체 초기화
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-[11px] opacity-60">
                {s.adapterCountSummary
                  .replace('{total}', String(interfaceStats.total))
                  .replace('{active}', String(interfaceStats.active))
                  .replace('{physical}', String(interfaceStats.physical))
                  .replace('{virtual}', String(interfaceStats.virtual))}
              </div>
              <button 
                onClick={() => setShowInterfaceModal(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-md shrink-0"
              >
                {s.done || "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License Management & Feature Gate Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <img 
                  src="./logo.png" 
                  alt="Grid IP" 
                  className="w-10 h-10 object-cover rounded-xl border border-sky-500/40 shadow-sm shrink-0" 
                />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">{s.licenseTitle}</h3>
                  <div className="text-[10px] opacity-60 font-mono">Grid IP Scanner2 (grid-ip-scanner2)</div>
                </div>
              </div>
              <button onClick={() => setShowLicenseModal(false)} className="p-1 hover:opacity-50 transition-opacity"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs no-scrollbar">
              {/* Current Status Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                license.tier === 'enterprise'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : license.tier === 'pro'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-white/5 border-white/10 text-zinc-300'
              }`}>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-60">{s.currentTier}</div>
                  <div className="text-base font-black tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{license.tier.toUpperCase()} EDITION</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-current/20">
                      {license.tier === 'free' 
                        ? (lang === 'ko' ? '무료 커뮤니티' : 'Free Community')
                        : license.licenseType === 'annual'
                        ? (lang === 'ko' ? '📅 1년 정기 이용권' : '📅 1-Year Subscription')
                        : license.licenseType === 'trial'
                        ? (lang === 'ko' ? '⏳ 30일 체험판' : '⏳ 30-Day Trial')
                        : (lang === 'ko' ? '💎 영구 소장 정품' : '💎 Lifetime License')}
                    </span>
                  </div>
                  <div className="text-[10.5px] opacity-75 mt-1">
                    {lang === 'ko' ? '등록 대상:' : 'Licensed to:'} <span className="font-bold">{license.licensedTo || (lang === 'ko' ? '커뮤니티 사용자' : 'Community User')}</span>
                  </div>
                  {license.expiresAt ? (
                    <div className="text-[10.5px] text-amber-500 dark:text-amber-400 font-bold mt-2 flex flex-wrap items-center gap-1.5 leading-none">
                      <span>{lang === 'ko' ? '만료 예정일:' : 'Expires:'} {new Date(license.expiresAt).toLocaleDateString()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[9px] uppercase font-black animate-pulse">
                        D-{Math.max(0, Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}{lang === 'ko' ? '일 남음' : 'd left'}
                      </span>
                    </div>
                  ) : license.tier !== 'free' ? (
                    <div className="text-[10.5px] text-emerald-400 font-bold mt-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'ko' ? '평생 영구 소장 (만료일 없음 & 평생 업데이트)' : 'Lifetime Access (No expiration & Lifetime updates)'}</span>
                    </div>
                  ) : null}
                </div>
                <div className="p-2.5 rounded-full bg-current/10">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              {/* Feature Entitlement Matrix */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-60">
                  {lang === 'ko' ? '기능 해금 현황 (Feature Gates)' : 'Feature Gates & Entitlements'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? '16x16 시각화 그리드 맵' : '16x16 Visual Grid Map'}</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? '9만 건 OUI 제조사 식별' : '90k OUI Vendor Database'}</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? '스냅샷 비교 (Diff Engine)' : 'Snapshot Diff Engine'}</span>
                    {license.features.diffCompare ? (
                      <span className="text-[10px] font-bold text-emerald-400">{lang === 'ko' ? '● 활성' : '● Enabled'}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">{lang === 'ko' ? '○ 비활성 (잠김)' : '○ Locked'}</span>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? '심층 포트 정밀 보안 감사' : 'Deep Port Security Audit'}</span>
                    {license.features.portScanDeep ? (
                      <span className="text-[10px] font-bold text-emerald-400">{lang === 'ko' ? '● 활성' : '● Enabled'}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">{lang === 'ko' ? '○ 비활성 (잠김)' : '○ Locked'}</span>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? 'A4 보안 감사 보고서 (HTML)' : 'A4 Security Audit Report (HTML)'}</span>
                    {license.features.exportReport ? (
                      <span className="text-[10px] font-bold text-emerald-400">{lang === 'ko' ? '● 활성' : '● Enabled'}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">{lang === 'ko' ? '○ 비활성 (잠김)' : '○ Locked'}</span>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span className="flex items-center gap-1.5">
                      <Power className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'ko' ? '원격 부팅 (Wake-on-LAN)' : 'Remote Boot (Wake-on-LAN)'}</span>
                    </span>
                    {license.features.remoteBoot ? (
                      <span className="text-[10px] font-bold text-emerald-400">{lang === 'ko' ? '● 활성' : '● Enabled'}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">{lang === 'ko' ? '○ 비활성 (잠김)' : '○ Locked'}</span>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span className="flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-purple-400" />
                      <span>{lang === 'ko' ? '낯선 기기 감시 (Soft Trust 침입 탐지)' : 'Intruder & Soft Trust Guard'}</span>
                    </span>
                    {license.features.intruderDetection ? (
                      <span className="text-[10px] font-bold text-emerald-400">{lang === 'ko' ? '● 활성' : '● Enabled'}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">{lang === 'ko' ? '○ 비활성 (잠김)' : '○ Locked'}</span>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${theme === 'white' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/5'}`}>
                    <span>{lang === 'ko' ? '다중 서브넷 허용 한도' : 'Max Subnets Allowance'}</span>
                    <span className="text-[10px] font-bold mono text-sky-400">
                      {license.maxSubnets === 999 ? (lang === 'ko' ? '무제한' : 'Unlimited') : `${license.maxSubnets}${lang === 'ko' ? '개 대역' : ' subnets'}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* License Activation Form */}
              <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : theme === 'white' ? 'bg-amber-50/60 border-amber-200 text-slate-800' : 'bg-white/5 border-white/10'} space-y-3`}>
                <label className="text-[10px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ko' ? '라이선스 키 입력 및 활성화' : 'Enter License Key & Activate'}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder={s.licenseKeyPlaceholder}
                    className={`flex-1 ${theme === 'white' ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/10 text-white'} rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-amber-400 transition-colors`}
                  />
                  <button
                    onClick={handleActivateLicense}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-tight transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    {s.activateBtn}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {getTrialHistory().used ? (
                    <span className="text-[10px] text-amber-500/80 font-semibold flex items-center gap-1">
                      <span>🔒 {lang === 'ko' ? '30일 체험판 이용 완료 (추가 사용은 정품 키 필요)' : '30-Day Trial completed (Requires full license key)'}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setLicenseKeyInput('GRID-PRO-TRIAL-2026');
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      💡 {lang === 'ko' ? '데모 Pro 30일 사용권 키 자동 입력 (GRID-PRO-TRIAL-2026)' : 'Auto-fill Demo Pro 30-Day Key (GRID-PRO-TRIAL-2026)'}
                    </button>
                  )}
                  {license.tier !== 'free' && (
                    <button
                      onClick={handleResetLicense}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      {lang === 'ko' ? '무료 버전으로 초기화' : 'Reset to Free Community'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowLicenseModal(false)}
              className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase transition-all flex-shrink-0 cursor-pointer"
            >
              {s.done || "Done"}
            </button>
          </div>
        </div>
      )}

      {/* GitHub Releases Real-Time Auto-Update Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdate}
        onRefreshCheck={handleManualCheckUpdate}
        theme={theme}
        lang={lang}
      />

      {/* Deep Snapshot Comparison Studio Modal */}
      <SnapshotDiffModal
        isOpen={showDiffStudioModal}
        onClose={() => setShowDiffStudioModal(false)}
        snapshots={snapshots}
        onSnapshotsChange={(updated) => {
          setSnapshots(updated);
          if (baselineSnapshotId && !updated.some((s) => s.id === baselineSnapshotId)) {
            setBaselineSnapshotId(updated.length > 0 ? updated[0].id : null);
          }
        }}
        currentResults={results}
        currentSubnet={config.subnet}
        onSaveCurrentSnapshot={(label) => handleSaveSnapshot(label)}
        onSelectIp={(ip) => {
          setSelectedIp(ip);
          setViewMode('diff');
        }}
        theme={theme}
        s={s}
        lang={lang}
        showToast={showToast}
      />

      {/* Automated Recurring Scan Scheduler Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        currentConfig={config}
        currentDeepScan={deepScan}
        currentScanMode={scanMode}
        isScanning={isScanning}
        lang={lang}
        onTriggerScanNow={(sched) => {
          setShowScheduleModal(false);
          startScan(sched);
        }}
        onViewSnapshot={(snapshotId) => {
          setShowScheduleModal(false);
          setBaselineSnapshotId(snapshotId);
          setViewMode('diff');
          setShowDiffStudioModal(true);
        }}
      />

      {/* Snapshot Diff 3-Step Interactive Guide Modal */}
      {showDiffGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-indigo-400">
                    {lang === 'ko' ? '📸 스냅샷 비교(Diff) 사용법 완벽 가이드' : '📸 Snapshot Diff Comparison Guide'}
                  </h3>
                  <div className="text-[11px] opacity-70">
                    {lang === 'ko' 
                      ? '과거의 정상 기준점과 현재 네트워크를 대조하여 침입 기기 및 연결 끊김을 즉시 감지합니다.' 
                      : 'Compare past baseline with current network state to detect intruder and offline nodes.'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDiffGuide(false)} className="p-1 hover:opacity-50 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Steps Visual Cards */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black text-[10px]">STEP 1</span>
                    <Camera className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="font-black text-sm text-zinc-100">
                    {lang === 'ko' ? '정상 상태 찰칵!' : 'Capture Baseline'}
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed flex-1">
                    {lang === 'ko'
                      ? '네트워크가 정상일 때 스캔을 완료하고 [📸 현재 상태 스냅샷 저장]을 누릅니다.'
                      : 'Run a scan when normal and click [📸 Save Snapshot] to create a baseline point.'}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-black text-[10px]">STEP 2</span>
                    <RefreshCw className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="font-black text-sm text-zinc-100">
                    {lang === 'ko' ? '시간 경과 후 재스캔' : 'Re-scan Later'}
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed flex-1">
                    {lang === 'ko'
                      ? '다음 날 또는 의심스러울 때 [그리드 스캔 시작]을 눌러 현재 상태를 새로 수집합니다.'
                      : 'At a later time, start a new scan to discover the latest network status.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-black text-[10px]">STEP 3</span>
                    <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="font-black text-sm text-zinc-100">
                    {lang === 'ko' ? 'Diff 모드로 자동 진단' : 'Switch to Diff Mode'}
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed flex-1">
                    {lang === 'ko'
                      ? '상단 [Diff] 모드로 전환하면 과거 기준점과 현재 상태를 1:1 대조하여 색상으로 자동 분류합니다.'
                      : 'Switch to Diff mode to see automatic color-coded discrepancies against your baseline.'}
                  </p>
                </div>
              </div>

              {/* Color Code Legend Card */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2.5">
                <div className="font-black text-xs uppercase tracking-wider text-indigo-300">
                  {lang === 'ko' ? '🎨 색상별 진단 의미 (Color Legend)' : '🎨 Color Legend'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div>
                      <div className="font-bold text-emerald-400">{lang === 'ko' ? '🟢 신규 단말 (+ New)' : '🟢 New Node'}</div>
                      <div className="opacity-70 text-[10px]">{lang === 'ko' ? '기준점에 없던 새 장치 연결 (외부인/침입 장비)' : 'Newly appeared device not in baseline'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="w-3.5 h-3.5 rounded bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <div>
                      <div className="font-bold text-rose-400">{lang === 'ko' ? '🔴 오프라인 전환 (- Gone)' : '🔴 Offline Node'}</div>
                      <div className="opacity-70 text-[10px]">{lang === 'ko' ? '기준점에 켜져 있었으나 전원 꺼짐/연결 끊김' : 'Device went offline or disconnected'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <div>
                      <div className="font-bold text-amber-400">{lang === 'ko' ? '🟡 장비 변경 (! Changed)' : '🟡 Changed / Alert'}</div>
                      <div className="opacity-70 text-[10px]">{lang === 'ko' ? '동일 IP에서 MAC/제조사/포트 변조 감지 (IP 충돌)' : 'MAC or Vendor modified on same IP'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="w-3.5 h-3.5 rounded bg-zinc-700 shrink-0 opacity-50" />
                    <div>
                      <div className="font-bold text-zinc-300">{lang === 'ko' ? '⚪ 변동 없음 (= Same)' : '⚪ Unchanged'}</div>
                      <div className="opacity-70 text-[10px]">{lang === 'ko' ? '기준점과 상태가 동일한 안전한 장비' : 'Exact match with baseline state'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] opacity-70">
                {lang === 'ko' ? '💡 사용자 별칭(별명)이나 일시적 핑 속도 편차는 변동(!CHG)에 영향을 주지 않으며 스냅샷은 안전하게 로컬에 보관됩니다.' : '💡 Custom aliases and ping latency fluctuations do not affect change (!CHG) detection.'}
              </span>
              <button
                onClick={() => setShowDiffGuide(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase transition-all shadow-md shrink-0"
              >
                {lang === 'ko' ? '이해했습니다 (확인)' : 'Got it (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Hub Modal */}
      {showPdfExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-white/10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight">
                    {s.exportPdfModalTitle || 'PDF 리포트 내보내기 센터'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    {s.exportPdfModalDesc || '검색 결과, 활성 장비, 보안 감사 보고서를 고품질 PDF 문서로 출력 및 저장합니다.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isExportingPdf && setShowPdfExportModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subnet & Status Info Strip */}
            <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between text-xs flex-wrap gap-2 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="opacity-60">{lang === 'ko' ? '스캔 서브넷:' : 'Subnet:'}</span>
                <span className="font-mono font-bold text-sky-400">{config.subnet}.0/24</span>
                <span className="opacity-40">|</span>
                <span className="opacity-60">{lang === 'ko' ? '탐지 활성 노드:' : 'Active Nodes:'}</span>
                <span className="font-mono font-bold text-emerald-400">{activeCount}{lang === 'ko' ? '개' : ' active'}</span>
              </div>
              <div className="flex items-center space-x-2">
                {searchTerm ? (
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                    {lang === 'ko' ? `검색어: "${searchTerm}" (${filteredIps.length}건)` : `Filter: "${searchTerm}" (${filteredIps.length})`}
                  </span>
                ) : (
                  <span className="opacity-50 text-[11px]">{lang === 'ko' ? '필터 없음 (전체 표시)' : 'No filter (Show all)'}</span>
                )}
              </div>
            </div>

            {/* PDF Export Options Grid */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* Option 1: Current Search & Filter Results PDF */}
              <div className={`p-4 rounded-xl border transition-all ${
                searchTerm 
                  ? 'border-sky-500/50 bg-sky-500/10 shadow-md ring-1 ring-sky-500/30' 
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-sky-400">🔍 {s.exportPdfSearch || '현재 검색 및 필터 결과 PDF'}</span>
                      {searchTerm && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-sky-500 text-white animate-pulse">
                          {lang === 'ko' ? '추천' : 'Recommended'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-80">
                      {searchTerm 
                        ? (lang === 'ko' ? `검색어 "${searchTerm}"에 일치하는 ${filteredIps.length}개 노드 목록을 PDF로 출력합니다.` : `Export ${filteredIps.length} nodes matching "${searchTerm}" to PDF.`) 
                        : (lang === 'ko' ? `현재 화면에 필터링된 ${filteredIps.length}개 노드 목록을 PDF로 출력합니다.` : `Export ${filteredIps.length} filtered nodes to PDF.`)}
                    </p>
                    <div className="text-[11px] opacity-60 font-mono">
                      {lang === 'ko' ? '포함: IP 주소, MAC, 제조사, 호스트명, RTT, 개방 포트 상태' : 'Includes: IP, MAC, Vendor, Hostname, RTT, Open Ports'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportPdf('search')}
                    disabled={isExportingPdf || filteredIps.length === 0}
                    className={`px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                      isExportingPdf || filteredIps.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? `PDF 다운로드 (${filteredIps.length})` : `Download PDF (${filteredIps.length})`}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Active Devices Inventory PDF */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-emerald-400">🟢 {s.exportPdfActive || '온라인 활성 장비 인벤토리 PDF'}</span>
                    </div>
                    <p className="text-xs opacity-80">
                      {lang === 'ko' 
                        ? `현재 네트워크에서 응답이 확인된 온라인 활성 단말 (${activeCount}대) 자산 인벤토리 보고서를 생성합니다.` 
                        : `Generate inventory report of ${activeCount} active online devices.`}
                    </p>
                    <div className="text-[11px] opacity-60 font-mono">
                      {lang === 'ko' ? '포함: 활성 노드 인벤토리, 제조사별 통계, RTT 응답속도' : 'Includes: Active node inventory, vendor statistics, RTT latency'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportPdf('active')}
                    disabled={isExportingPdf || activeCount === 0}
                    className={`px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                      isExportingPdf || activeCount === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? `PDF 다운로드 (${activeCount})` : `Download PDF (${activeCount})`}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Deep Security Audit Report PDF (Pro) */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:border-indigo-500/50 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-indigo-400">🛡️ {s.exportPdfAudit || '정밀 보안 감사 보고서 PDF'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        PRO EDITION
                      </span>
                    </div>
                    <p className="text-xs opacity-80">
                      {lang === 'ko' 
                        ? 'SMB(445) 랜섬웨어 표적, RDP(3389), Telnet(23) 등 보안 위험 포트 분석 및 제조사 점유율 정밀 진단서를 발행합니다.' 
                        : 'Audit sensitive target ports (SMB 445, RDP 3389, Telnet 23) and issue deep security analysis.'}
                    </p>
                    <div className="text-[11px] opacity-60 font-mono">
                      {lang === 'ko' ? '포함: 위험 포트 노출 경고, 위협 완화 권고사항, OUI 제조사 점유율' : 'Includes: Exposed risk port warnings, mitigation recommendations, vendor share'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportPdf('audit')}
                    disabled={isExportingPdf || activeCount === 0}
                    className={`px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                      isExportingPdf || activeCount === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? '보안 감사 PDF' : 'Security Audit PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Option 4: Full Subnet Map PDF */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-zinc-300">📋 {s.exportPdfAll || '전체 스캔 대역 종합 보고서 PDF'}</span>
                    </div>
                    <p className="text-xs opacity-80">
                      {lang === 'ko' 
                        ? `서브넷 전체 IP 대역 (${config.subnet}.${config.start} ~ .${config.end}, 총 ${allIps.length}개 대상)의 상태를 종합 기록합니다.` 
                        : `Record full state of ${config.subnet}.${config.start} ~ .${config.end} (${allIps.length} total targets).`}
                    </p>
                    <div className="text-[11px] opacity-60 font-mono">
                      {lang === 'ko' ? '포함: 활성 및 비활성 전체 노드 전수 지도' : 'Includes: Complete map of all active and inactive nodes'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportPdf('all')}
                    disabled={isExportingPdf || Object.keys(results).length === 0}
                    className={`px-3.5 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-black text-xs uppercase transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                      isExportingPdf || Object.keys(results).length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{lang === 'ko' ? '전체 대역 PDF' : 'Full Subnet PDF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                {isExportingPdf ? (
                  <div className="flex items-center space-x-2 text-xs text-sky-400 font-bold animate-pulse">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>{s.exportGeneratingPdf || 'PDF 문서 생성 및 렌더링 중...'}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleExportAuditReport();
                      setShowPdfExportModal(false);
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold underline transition-colors cursor-pointer"
                  >
                    {lang === 'ko' ? '🌐 대화형 HTML 보고서 (인쇄 창) 열기' : '🌐 Open Interactive HTML Report (Print)'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowPdfExportModal(false)}
                disabled={isExportingPdf}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer"
              >
                {lang === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windows OS Legacy Network Utilities & System Tray Modal */}
      {showWindowsUtilModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : theme === 'white' ? 'bg-white text-slate-900 border-slate-200' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-white/10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                    <span>{lang === 'ko' ? '환경설정 및 시스템 트레이' : 'Preferences & System Tray'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                      Settings
                    </span>
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    {lang === 'ko' ? '시스템 트레이 상주, 24/7 침입 감시, 부팅 자동 실행 및 Windows 네트워크 설정' : 'System tray background watch, 24/7 intruder detection, auto-start & OS tools'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowWindowsUtilModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Section 1: System Tray & Background Controls */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-cyan-300 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'ko' ? '📌 시스템 트레이 상주 & 무인 백그라운드' : '📌 System Tray Resident & Background Watch'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'ko' ? '트레이 상주 엔진 활성화됨' : 'Tray Engine Active'}</span>
                    </span>
                  </div>
                </div>

                {/* Status Indicator Banner */}
                <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/20 text-[11px] text-cyan-200 flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyan-300">
                      {lang === 'ko' ? '트레이 실행 보장: ' : 'Tray Execution Guaranteed: '}
                    </span>
                    {lang === 'ko' 
                      ? '앱 기동과 동시에 Windows 작업표시줄 시스템 트레이 아이콘이 생성되어, 창을 닫아도 백그라운드 스캐너 및 24/7 침입 감시가 멈추지 않습니다.' 
                      : 'System tray icon is created on startup. Background scanner and 24/7 intruder watch remain active even if the main window is closed.'}
                  </div>
                </div>

                {/* Direct Minimize to Tray Action Button */}
                <button
                  onClick={handleMinimizeToTray}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-98 text-cyan-200 font-bold border border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-cyan-500/10"
                >
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>
                    {lang === 'ko' ? '📌 즉시 시스템 트레이로 최소화 (Minimize to Tray)' : '📌 Minimize to System Tray Now'}
                  </span>
                </button>

                {/* Close to Tray Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="font-bold text-zinc-200">
                      {lang === 'ko' ? '창 닫기 시 트레이 최소화 (Close-to-Tray)' : 'Close to System Tray'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {lang === 'ko' 
                        ? '메인 창 [X] 클릭 시 완전히 종료하지 않고 시스템 트레이로 상주시킵니다.' 
                        : 'Minimize to system tray instead of quitting when clicking [X].'}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !closeToTray;
                      setCloseToTray(next);
                      try { localStorage.setItem('grid_close_to_tray', String(next)); } catch (_) {}
                      showToast(
                        next
                          ? (lang === 'ko' ? '📌 닫기 시 트레이 최소화 활성화' : '📌 Close-to-Tray enabled')
                          : (lang === 'ko' ? '창 닫기 시 즉시 종료 설정' : 'Quit immediately on window close')
                      );
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${closeToTray ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${closeToTray ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Auto Start Registry Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="font-bold text-zinc-200">
                      {lang === 'ko' ? 'Windows 부팅 시 자동 시작 (Registry)' : 'Auto Start on Windows Boot (Registry)'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {lang === 'ko' 
                        ? '컴퓨터 부팅 시 자동으로 트레이 최소화 상태로 실행합니다 (HKCU\\Run).' 
                        : 'Automatically run minimized in system tray when Windows boots (HKCU\\Run).'}
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const next = !isAutoStartEnabled;
                      const res = await executeWindowsUtility('autostart', next);
                      if (res.success && res.enabled !== undefined) {
                        setIsAutoStartEnabled(res.enabled);
                      }
                      showToast(res.message);
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${isAutoStartEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isAutoStartEnabled ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* 24/7 Windows Background Service Control */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <Shield className={`w-3.5 h-3.5 ${isWindowsServiceInstalled ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}`} />
                      <span>
                        {lang === 'ko' ? '24/7 Windows 무인 백그라운드 서비스 (GridIPScannerService)' : '24/7 Windows Background Service (GridIPScannerService)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {lang === 'ko' 
                        ? '로그아웃 상태에서도 Session 0 무인 서비스로 24시간 네트워크 스케줄러 및 낯선 기기 감지 수행' 
                        : 'Runs as Session 0 background service for 24/7 network monitoring even when logged out'}
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const action = isWindowsServiceInstalled ? 'service-stop' : 'service-install';
                      const res = await executeWindowsUtility(action);
                      if (res.installed !== undefined) {
                        setIsWindowsServiceInstalled(res.installed);
                      }
                      showToast(res.message);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                      isWindowsServiceInstalled 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {isWindowsServiceInstalled ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                        </span>
                        <span>{lang === 'ko' ? 'Session 0 가동 중 (클릭 시 중지)' : 'Session 0 Active (Click to Stop)'}</span>
                      </>
                    ) : (
                      <span>{lang === 'ko' ? '⚙️ 서비스 등록/시작' : '⚙️ Register/Start Service'}</span>
                    )}
                  </button>
                </div>

                {/* 24/7 Intruder Watch Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="font-bold text-zinc-200">
                      {lang === 'ko' ? '🚨 24/7 낯선 기기 무인 감시 모드' : '🚨 24/7 Intruder Watch Mode'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {lang === 'ko' 
                        ? '백그라운드 상주 중 미확인 신규 기기 감지 시 Windows OS 알림 및 소리 송출.' 
                        : 'Emits Windows OS notification and audio alert when an unknown device is detected.'}
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleIntruderWatch}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${intruderWatchMode ? 'bg-rose-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${intruderWatchMode ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Show Intruder Log Dedicated Button */}
                <button
                  onClick={() => {
                    setShowWindowsUtilModal(false);
                    setShowIntruderLogModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 active:scale-98 text-rose-300 font-bold border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-rose-500/10"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>{lang === 'ko' ? '📜 낯선 기기 감시 로그 전체 기록 열기' : '📜 Open Full Intruder Detection Log'}</span>
                </button>

                {/* Clean Exit Application Button */}
                <button
                  onClick={handleExitApplication}
                  className="w-full py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 active:scale-98 text-red-300 font-bold border border-red-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-red-500/10"
                  title={lang === 'ko' ? '백그라운드 서비스 및 앱 완전 종료' : 'Exit Application & Terminate Background Service'}
                >
                  <Power className="w-4 h-4 text-red-400" />
                  <span>{lang === 'ko' ? '🛑 애플리케이션 완전 종료 (Exit Application)' : '🛑 Exit Application Completely'}</span>
                </button>
              </div>

              {/* Section 2: Legacy OS Network Tools */}
              <div className="space-y-2.5">
                <div className="font-black text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ko' ? '🛠️ Windows 레거시 네트워크 유틸리티 퀵 키' : '🛠️ Windows Legacy Network Utilities'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Tool 1: DNS Flush */}
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-amber-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? 'DNS 캐시 쾌속 초기화' : 'Flush DNS Resolver Cache'}</span>
                      </div>
                      <p className="text-[10.5px] opacity-70 mt-1">
                        <code>ipconfig /flushdns</code>. {lang === 'ko' ? 'DNS 응답 지연 및 도메인 IP 변경 시 즉시 캐시 갱신.' : 'Refreshes DNS cache on domain latency or IP change.'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await executeWindowsUtility('flushdns');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 transition-all cursor-pointer text-xs"
                    >
                      ⚡ {lang === 'ko' ? 'ipconfig /flushdns 실행' : 'Execute ipconfig /flushdns'}
                    </button>
                  </div>

                  {/* Tool 2: ncpa.cpl */}
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sky-400 flex items-center gap-1">
                        <Network className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '네트워크 어댑터 제어판' : 'Network Connections Panel'}</span>
                      </div>
                      <p className="text-[10.5px] opacity-70 mt-1">
                        <code>control ncpa.cpl</code>. {lang === 'ko' ? '어댑터 사용 안 함/재연결 및 고정 IP/DNS 설정 창 즉시 호출.' : 'Opens classic network adapter control panel (ncpa.cpl).'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await executeWindowsUtility('ncpa.cpl');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold border border-sky-500/30 transition-all cursor-pointer text-xs"
                    >
                      🌐 {lang === 'ko' ? 'ncpa.cpl 제어판 열기' : 'Open ncpa.cpl Panel'}
                    </button>
                  </div>

                  {/* Tool 3: Firewall Re-registration */}
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '방화벽 예외 규칙 재등록' : 'Reset Firewall Rules'}</span>
                      </div>
                      <p className="text-[10.5px] opacity-70 mt-1">
                        <code>netsh advfirewall</code>. {lang === 'ko' ? 'RAW 소켓 스캔 및 인바운드/아웃바운드 규칙 실시간 복원.' : 'Restores default firewall rules for scanner & RAW sockets.'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await executeWindowsUtility('firewall');
                        showToast(res.message);
                      }}
                      className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 transition-all cursor-pointer text-xs"
                    >
                      🛡️ {lang === 'ko' ? '방화벽 규칙 복원' : 'Restore Firewall Rules'}
                    </button>
                  </div>

                  {/* Tool 4: Admin Elevation */}
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-purple-400 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '관리자 권한 재시작' : 'Relaunch as Admin (UAC)'}</span>
                      </div>
                      <p className="text-[10.5px] opacity-70 mt-1">
                        {lang === 'ko' ? 'Windows UAC 승인을 통해 RAW 소켓 L2 SendARP 및 OUI 레지스트리 가속 권한으로 재기동.' : 'Relaunch with UAC elevated privileges for RAW sockets & SendARP.'}
                      </p>
                    </div>
                    <button
                      onClick={handleElevateAdmin}
                      disabled={isElevating}
                      className="w-full py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/30 transition-all cursor-pointer disabled:opacity-50 text-xs"
                    >
                      🔑 {lang === 'ko' ? 'UAC 승인 재시작' : 'Relaunch with UAC Admin'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowWindowsUtilModal(false);
                  setShowNativeModal(true);
                }}
                className="text-[11px] opacity-60 hover:opacity-100 text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-all cursor-pointer font-medium"
                title={lang === 'ko' ? 'C/Win32 가속 DLL 및 실시간 커널 진단 콘솔 열기' : 'Open C/Win32 DLL & Kernel Diagnostics'}
              >
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ko' ? '고급: C/Win32 엔진 진단' : 'Advanced: Native Diagnostics'}</span>
              </button>
              <button
                onClick={() => setShowWindowsUtilModal(false)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer"
              >
                {lang === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native Modules Diagnostics & Acceleration Modal */}
      <NativeModulesModal
        isOpen={showNativeModal}
        onClose={() => setShowNativeModal(false)}
        theme={theme}
        lang={lang}
        currentSelectedIp={selectedIp || undefined}
        currentSelectedMac={selectedIp ? results[selectedIp]?.device?.mac : undefined}
      />

      {/* 24/7 Background Service Intruder Detection History Modal */}
      <IntruderLogModal
        isOpen={showIntruderLogModal}
        onClose={() => setShowIntruderLogModal(false)}
        lang={lang as 'ko' | 'en'}
        theme={theme}
        onTrustDevice={(macOrIp) => {
          handleTrustDevice(
            macOrIp.includes(':') || macOrIp.includes('-') ? macOrIp : undefined,
            macOrIp.includes('.') ? macOrIp : undefined
          );
        }}
      />
    </div>
  );
};


export default App;
