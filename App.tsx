
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Activity, RefreshCw, X, Database, ShieldCheck, Wifi, Globe, Cpu, Box, Sun, Moon, Square, Zap, HardDrive, Info, AlertCircle, Terminal, MapPin, Cloud, CheckCircle2, Monitor, RotateCcw, ExternalLink, Download, CloudDownload, HelpCircle, Mail, Key, Sparkles, Layers, FileText, BookmarkPlus, ArrowRightLeft, ShieldAlert, Package, Check, Network, Filter, Copy, Cable, Shield, Sliders, Github, Trash2, Camera } from 'lucide-react';
import { IPStatus, DeviceInfo, ScanResult, NetworkConfig, InterfaceInfo, LicenseInfo, ScanSnapshot, PortAuditItem, PortScanResult, DiffStatus, DiffItem } from './types';
import IPCell from './components/IPCell';
import { getStoredLicense, activateLicenseKey, clearLicense } from './services/licenseManager';
import { getSavedSnapshots, saveSnapshot, deleteSnapshot, computeSnapshotDiff } from './services/diffEngine';
import { runDeepPortAudit } from './services/portScanner';
import { generateProfessionalAuditReport } from './services/reportGenerator';
import { UpdateModal } from './components/UpdateModal';
import { checkGitHubRelease, UpdateInfo, CURRENT_APP_VERSION } from './services/updateChecker';

const classifyDevice = (vendor: string, openPorts: number[], s: any) => {
  const v = (vendor || "").toLowerCase();
  if (openPorts.includes(9100) || openPorts.includes(631)) return { type: s.deviceTypes.printer, os: "Embedded" };
  if (openPorts.includes(445) || openPorts.includes(135)) return { type: s.deviceTypes.windows, os: "Windows" };
  if (openPorts.includes(22)) return { type: s.deviceTypes.linux, os: "Linux" };
  if (openPorts.includes(3389)) return { type: s.deviceTypes.rdp, os: "Windows" };
  if (openPorts.includes(62078)) return { type: s.deviceTypes.apple, os: "iOS" };
  
  if (v.includes("apple")) return { type: s.deviceTypes.apple, os: "iOS/macOS" };
  if (v.includes("samsung") || v.includes("xiaomi") || v.includes("huawei")) return { type: s.deviceTypes.mobile, os: "Android" };
  if (v.includes("cisco") || v.includes("tp-link") || v.includes("asus") || v.includes("netgear")) return { type: s.deviceTypes.network, os: "RTOS" };
  if (v.includes("synology") || v.includes("qnap")) return { type: s.deviceTypes.nas, os: "Linux" };
  
  return { type: s.deviceTypes.generic, os: "Generic" };
};

const translations = {
  ko: {
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
    networkIdentity: "네트워크 식별",
    technicalDetails: "기술 세부 정보",
    address: "주소",
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
    securityNoticeTitle: "보안 및 안전 공지",
    falsePositiveTitle: "백신 오탐지 안내 (False Positive)",
    falsePositiveDesc: "본 프로그램은 네트워크 스캐너의 특성상 짧은 시간 내에 많은 IP와 포트에 접속을 시도합니다. 이러한 동작은 일부 백신(Windows Defender 등)에서 '정찰 활동'으로 오해하여 악성코드로 탐지하거나, 방화벽에서 가짜 응답을 보내 '유령 장치'가 나타날 수 있습니다.",
    safeTool: "안전한 도구",
    safeToolDesc: "개인정보 탈취나 시스템 파괴 로직이 포함되지 않은 순수 네트워크 진단 도구입니다.",
    detectionReason: "탐지 원인",
    detectionReasonDesc: "디지털 서명이 없는 실행 파일이 네트워크 포트 스캔을 수행할 때 발생하는 전형적인 현상입니다.",
    solution: "해결 방법",
    solutionDesc: "백신 프로그램의 '검사 예외' 또는 '허용' 목록에 추가하여 사용하시기 바랍니다.",
    understand: "이해했습니다",
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
      mobile: "모바일 장치",
      network: "네트워크 장비",
      nas: "NAS 서버",
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
    helpLicenseTitle: "1. 이중 라이선스 고지 (Dual Licensing Notice)",
    helpLicenseDesc: "Grid IP Scanner2는 오픈소스 라이선스(GPL v3)와 상용 라이선스(Proprietary Commercial License)의 [이중 라이선스 (Dual Licensing)] 정책을 채택하여 배포됩니다.\n\n[1. 이중 라이선스 모델 안내]\n• 커뮤니티 에디션 (무상 사용): 소스코드를 공개 및 기여해야 하는 카피레프트 의무(GPL v3) 하에 무상으로 자유롭게 사용할 수 있습니다.\n• 상업용 에디션 (유료 판매): 소스코드를 독점적으로 유지한 채 독자적인 상용 라이선스를 적용하여 상업적으로 패키징하고, 유료 솔루션으로 재배포 및 판매하고자 하는 경우 상용 라이선스(Commercial License)를 취득하여 법적 제약 없이 완전한 비즈니스 권리를 누릴 수 있습니다.\n\n[2. 법적 안전성 및 오픈소스 준수]\n• 본 프로그램의 독창적인 UI, 자체 고안된 네트워크 탐색 파이프라인 및 코어 기능은 개발자/배포자(AhBiYout & Cisnet)에게 독점적 저작권이 귀속됩니다.\n• 앱의 하부 구조를 이루는 오픈소스 라이브러리(React, Lucide React, Go runtime 등)는 허용형 라이선스(MIT License)를 준수합니다. MIT 라이선스는 상업적 재배포, 서브라이선스 발행 및 유료 판매권을 완전히 보장하므로, 향후 이를 패키징하여 상용 소프트웨어로 유료 판매하더라도 법적으로 어떠한 분쟁이나 문제가 발생하지 않는 완전무결한 법적 효력을 갖습니다.\n\n[3. 하드웨어 OUI 데이터베이스 귀속 및 엔진]\n• 하드웨어 제조사 매핑 데이터는 IEEE 공식 OUI 레지스트리(MA-L/M/S), Wireshark Manuf Automated Database 및 Ringmast4r OUI Master Database(MIT)를 기반으로 가공된 최신 90,168개 이상의 엔트리를 탑재하고 있습니다. 다중 비트 마스크(/28, /36) 및 24비트 OUI를 완벽 지원하며, 이중 미러링(Tiered Fallback)을 통해 상업용 패키징 유료 판매 과정에서 특허나 라이선스 충돌 요소가 일체 없습니다.\n\n[4. 보증의 부인 및 책임 제한 (Standard Disclaimer)]\n• 본 소프트웨어는 일체의 명시적 또는 묵시적 보증 없이 '있는 그대로(AS IS)' 제공됩니다. 저작권자는 본 프로그램의 사용 또는 탐색 결과로 인해 발생하는 어떠한 직·간접적 손해에 대해서도 법적 책임을 지지 않습니다.",
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
    diffSameBadge: "변화 없음",
    diffGuideBtn: "스냅샷 비교 사용법",
    diffSaveNewBtn: "📸 현재 상태 스냅샷 저장 (기준점 캡처)",
    diffDeleteBtn: "삭제",
    diffEmptyTitle: "저장된 비교 기준 스냅샷이 없습니다.",
    diffEmptyDesc: "네트워크가 정상일 때 스캔 후 [📸 현재 상태 스냅샷 저장]을 누르면 기준점이 생성됩니다. 이후 다시 스캔할 때 새로운 침입 기기나 꺼진 장비를 색상으로 자동 감지합니다.",
    deepPortAuditBtn: "심층 포트 정밀 진단 (Pro)",
    deepPortAuditing: "포트 정밀 분석 중...",
    deepPortAuditComplete: "심층 포트 분석 완료",
    exportAuditReportBtn: "보안 감사 보고서 (HTML/인쇄)",
    licenseManage: "라이선스 관리",
    licenseTitle: "Grid IP Scanner2 에디션 & 라이선스",
    licenseKeyPlaceholder: "라이선스 키 입력 (예: GRID-PRO-TRIAL-2026)",
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
    adapterSubnetNotice: "어댑터 IPv4 서브넷이 스캔 대상으로 지정되었습니다."
  },
  en: {
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
    networkIdentity: "Network Identity",
    technicalDetails: "Technical Details",
    address: "Address",
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
    securityNoticeTitle: "Security & Safety Notice",
    falsePositiveTitle: "False Positive Notice",
    falsePositiveDesc: "Due to the nature of network scanners, this program attempts to connect to many IPs and ports in a short time. This behavior may be misunderstood as 'reconnaissance' by antivirus software or trigger firewall 'ghost' responses.",
    safeTool: "Safe Tool",
    safeToolDesc: "A pure network diagnostic tool with no logic for personal info theft or system destruction.",
    detectionReason: "Detection Reason",
    detectionReasonDesc: "A typical phenomenon when an unsigned executable performs network port scans.",
    solution: "Solution",
    solutionDesc: "Please add it to the 'Exclusion' or 'Allow' list of your antivirus program.",
    understand: "I Understand",
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
      mobile: "Mobile Device",
      network: "Network Equipment",
      nas: "NAS Server",
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
    helpLicenseTitle: "1. Dual Licensing Notice",
    helpLicenseDesc: "Grid IP Scanner2 is distributed under a [Dual Licensing] scheme, offering both an Open Source License (GPL v3) and a Proprietary Commercial License.\n\n[1. Dual Licensing Model]\n• Community Edition (Free Use): If you use, modify, and distribute the software for personal or open-source projects under the copyleft obligation of sharing your derivative source code under the same terms, the GNU GPL v3 license applies, allowing free usage.\n• Commercial Edition (Paid/Proprietary): If you wish to package, rename, distribute, or sell Grid IP Scanner2 as a proprietary commercial solution without any obligation to disclose your source code, you can obtain a \"Proprietary Commercial License.\" This legally guarantees your right to monetize, lease, and sell the software as a paid proprietary solution.\n\n[2. Legal Security & Upstream Compliance]\n• The user interface, proprietary scanning logic, and specialized pipeline are fully owned by the developer/distributor (AhBiYout & Cisnet), granting complete legal authority for commercialization.\n• Underlying third-party libraries (such as React, Lucide React, Go runtime, etc.) are licensed under the highly permissive MIT License. The MIT License explicitly and fully permits sublicensing, modification, commercial distribution, and paid resale. Therefore, integrating these components into a commercial package is 100% compliant and legally secure.\n\n[3. OUI Database Compliance & Engine]\n• The hardware vendor OUI database is processed and derived from the official IEEE OUI registry (MA-L/M/S), Wireshark Automated Manuf Database, and Ringmast4r OUI Master Database (MIT License), featuring 90,168+ entries. All multi-bit masks (/28, /36) and 24-bit OUIs are supported with robust tiered fallback mirroring, ensuring total compliance and zero legal conflict.\n\n[4. Standard Disclaimer of Warranty & Liability]\n• THIS SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM OR IN CONNECTION WITH THE SOFTWARE OR ITS USE.",
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
    diffSameBadge: "Unchanged",
    diffGuideBtn: "How to use Snapshot Diff",
    diffSaveNewBtn: "📸 Capture Current State as Snapshot",
    diffDeleteBtn: "Delete",
    diffEmptyTitle: "No Baseline Snapshot Saved",
    diffEmptyDesc: "Scan your network when normal and click [📸 Capture Snapshot] to set a baseline. When you scan again, new rogue devices or offline nodes will be auto-highlighted.",
    deepPortAuditBtn: "Deep Port Security Audit (Pro)",
    deepPortAuditing: "Auditing ports...",
    deepPortAuditComplete: "Port audit completed",
    exportAuditReportBtn: "Security Audit Report (HTML/Print)",
    licenseManage: "License Manager",
    licenseTitle: "Grid IP Scanner2 Edition & License",
    licenseKeyPlaceholder: "Enter License Key (e.g. GRID-PRO-TRIAL-2026)",
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
    adapterSubnetNotice: "Adapter IPv4 subnet set as scan target."
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
  const [theme, setTheme] = useState<'dark' | 'gray' | 'beige'>('gray');
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
  const [deepScan, setDeepScan] = useState(false);
  const [mergeResults, setMergeResults] = useState(false);
  const [scanMode, setScanMode] = useState<'fast' | 'standard' | 'precision'>('fast');
  const [scanHistory, setScanHistory] = useState<{date: string, active: number, total: number}[]>([]);
  const [hasStartedScan, setHasStartedScan] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [processedIPs, setProcessedIPs] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState<'active' | 'all'>('active');
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isElevating, setIsElevating] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sortMode, setSortMode] = useState<'ip' | 'status' | 'name'>('ip');

  // License Management State (Feature Flag & Entitlements)
  const [license, setLicense] = useState<LicenseInfo>(getStoredLicense());
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');

  // Snapshots & Diff Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'diff'>('grid');
  const [snapshots, setSnapshots] = useState<ScanSnapshot[]>(getSavedSnapshots());
  const [baselineSnapshotId, setBaselineSnapshotId] = useState<string | null>(null);
  const [showDiffGuide, setShowDiffGuide] = useState(false);
  const [diffFilter, setDiffFilter] = useState<'all' | 'new' | 'offline' | 'changed' | 'same'>('all');

  // Deep Port Audit State
  const [isAuditingPorts, setIsAuditingPorts] = useState(false);
  const [portAuditResult, setPortAuditResult] = useState<PortScanResult | null>(null);

  // GitHub Real-Time Auto-Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const baselineSnapshot = useMemo(() => {
    if (!baselineSnapshotId && snapshots.length > 0) {
      return snapshots[0];
    }
    return snapshots.find(s => s.id === baselineSnapshotId) || null;
  }, [snapshots, baselineSnapshotId]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSnapshot = () => {
    const activeCount = Object.values(results).filter(r => r.status === 'active').length;
    if (activeCount === 0) {
      showToast(s.noData || "스캔된 활성 장치가 없습니다. 먼저 스캔을 실행하세요.");
      return;
    }
    const snap = saveSnapshot(config.subnet, config.start, config.end, results);
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
    showToast("스냅샷이 삭제되었습니다.");
  };

  const handleActivateLicense = () => {
    const res = activateLicenseKey(licenseKeyInput);
    if (res.success && res.license) {
      setLicense(res.license);
      showToast(res.message);
      setLicenseKeyInput('');
      setShowLicenseModal(false);
    } else {
      showToast(res.message);
    }
  };

  const handleResetLicense = () => {
    const free = clearLicense();
    setLicense(free);
    showToast("라이선스가 커뮤니티 에디션(무료)으로 초기화되었습니다.");
    setShowLicenseModal(false);
  };

  const handleRunDeepPortAudit = async (ip: string) => {
    if (!license.features.portScanDeep) {
      showToast("심층 포트 정밀 보안 감사 기능은 PRO 이상에서 제공됩니다.");
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
            setLocalIpInfo({ ip: data.ip, subnet: data.subnet, computerName: data.computerName });
            setConfig(prev => {
              if (data.subnet && (prev.subnet === '192.168.0' || prev.subnet === '')) {
                return { ...prev, subnet: data.subnet };
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
        }
      }
    };
    checkEngine();
    const timer = setInterval(checkEngine, 8000);
    
    // Heartbeat to keep backend alive
    const heartbeatTimer = setInterval(() => {
      fetch(getApiUrl('/api/heartbeat')).catch(() => {});
    }, 3000);

    syncOUI();
    return () => {
      clearInterval(timer);
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Background GitHub Releases Auto-Update Checker
  useEffect(() => {
    const updateTimer = setTimeout(() => {
      checkGitHubRelease(false).then(res => {
        if (res.updateInfo) {
          setUpdateInfo(res.updateInfo);
          // If a new update is available on GitHub Releases, automatically open the update popup modal
          if (res.hasUpdate) {
            setShowUpdateModal(true);
          }
        }
      }).catch(() => {});
    }, 2500);
    return () => clearTimeout(updateTimer);
  }, []);

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    showToast("GitHub Releases 최신 릴리즈 점검 중...");
    const res = await checkGitHubRelease(true);
    setIsCheckingUpdate(false);
    if (res.updateInfo) {
      setUpdateInfo(res.updateInfo);
      setShowUpdateModal(true);
      if (res.hasUpdate) {
        showToast(`🎉 새로운 버전(v${res.updateInfo.latestVersion})이 출시되었습니다!`);
      } else {
        showToast(`현재 최신 버전(v${CURRENT_APP_VERSION})을 사용 중입니다.`);
      }
    } else if (res.error) {
      showToast(`업데이트 확인 실패: ${res.error}`);
      setShowUpdateModal(true);
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
      stopScanRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsScanning(false);
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

  const startScan = async () => {
    if (!goEngineAlive) return;
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
    const subnet = config.subnet || '192.168.0';
    for (let i = config.start; i <= config.end; i++) {
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
      
      if (scanMode === 'fast') {
        delay = 0;
        timeout = 500;
      } else if (scanMode === 'precision') {
        delay = 50;
        timeout = 2000;
      }

      const response = await fetch(
        getApiUrl(`/api/scan?subnet=${config.subnet}&start=${config.start}&end=${config.end}&deep=${deepScan}&delay=${delay}&timeout=${timeout}`),
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
              const classification = classifyDevice(vendorName, res.openPorts || [], s);
              
              let finalName = res.hostname;
              if (!finalName && res.webTitle) {
                finalName = res.webTitle.length > 25 ? res.webTitle.substring(0, 22) + "..." : res.webTitle;
              }
              if (!finalName) {
                if (!res.mac || res.mac === "Unknown" || res.mac === "") {
                  finalName = isSelf ? s.deviceTypes.hostMachine : "Hidden Node";
                } else {
                  finalName = isSelf ? s.deviceTypes.hostMachine : (vendorName !== "Unknown Vendor" ? `${vendorName} ${classification.type}` : "Unknown Device");
                }
              }

              const prevResult = previousResults[res.ip];
              let newMissCount = 0;
              let finalStatus: IPStatus = res.alive ? 'active' : 'inactive';
              let finalDevice: DeviceInfo | undefined = res.alive ? {
                ip: res.ip,
                mac: res.mac || "Unknown",
                vendor: isSelf ? s.deviceTypes.hostMachine : vendorName,
                latency: res.latency,
                hostname: finalName,
                webTitle: res.webTitle,
                os: isSelf ? "Windows (Host PC)" : classification.os,
                openPorts: res.openPorts,
                mdns: res.mdns,
                upnp: res.upnp,
                snmp: res.snmp
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
                total: totalCount
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
      // Final sync for UI state
      setScanningIPs(new Set());
      const finalProcessed = new Set(localProcessedIPs);
      setProcessedIPs(finalProcessed);
      setResults({ ...resultsRef.current });
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const handleExportCSV = (mode: 'active' | 'all' = 'active') => {
    const allResults = Object.values(results) as ScanResult[];
    const exportData = mode === 'active' 
      ? allResults.filter(r => r.status === 'active')
      : allResults; // Include everything (active, inactive, idle) for 'all' mode

    if (exportData.length === 0) {
      showToast(mode === 'active' ? s.noData : s.noData);
      return;
    }

    const headers = ["IP Address", "Status", "MAC Address", "Vendor", "Hostname", "Latency (ms)", "Open Ports", "Device Type", "OS"];
    const rows = exportData.map(r => {
      const classification = classifyDevice(r.device?.vendor || "", r.device?.openPorts || [], s);
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      
      return [
        escape(r.ip),
        escape(r.status),
        escape(r.device?.mac || ""),
        escape(r.device?.vendor || ""),
        escape(r.device?.hostname || ""),
        escape(r.device?.latency || 0),
        escape((r.device?.openPorts || []).join(', ')),
        escape(classification.type),
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
      showToast(s.noData);
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
        <h1>CISNET GRID SCAN2 REPORT</h1>
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
      GENERATED BY CISNET GRID IP SCANNER2 | WWW.CISNET.CO.KR
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
      showToast(s.noData);
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
  const allIps = useMemo(() => Object.keys(results).sort((a, b) => parseInt(a.split('.').pop()!) - parseInt(b.split('.').pop()!)), [results]);
  const filteredIps = useMemo(() => {
    let ips = allIps.filter(ip => {
      if (!searchTerm) return true;
      const item = results[ip];
      const s_term = searchTerm.toLowerCase();
      const classification = classifyDevice(item.device?.vendor || "", item.device?.openPorts || [], s);
      return ip.includes(s_term) || 
             item.device?.vendor?.toLowerCase().includes(s_term) || 
             item.device?.hostname?.toLowerCase().includes(s_term) ||
             item.device?.mac?.toLowerCase().includes(s_term) ||
             classification.type.toLowerCase().includes(s_term);
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
    beige: { bg: 'bg-[#faf5eb]', sidebar: 'bg-[#ebdcb9] border-[#d4be9c]', main: 'bg-[#faf5eb]', header: 'bg-[#ebdcb9]/95 border-[#d4be9c] backdrop-blur-md', text: 'text-[#1a0f05]', textMuted: 'text-[#422e1b]', input: 'bg-[#ffffff] border-[#c8ae95] text-[#1a0f05]', panel: 'bg-[#ebdcb9] border-[#d4be9c] shadow-xl backdrop-blur-md', accent: 'text-[#853a03]' }
  }[theme];

  return (
    <div className={`h-screen flex flex-col md:flex-row ${t.bg} ${t.text} overflow-hidden font-sans transition-colors duration-300`}>
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-[200] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white transition-colors">
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
        <div className="p-3.5 flex flex-col h-full overflow-y-auto min-h-0">
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
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-md ring-1 ring-emerald-400/50" title="Core Engine Ready (정상 가동)" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className={`text-sm font-black tracking-tight uppercase leading-snug whitespace-nowrap ${t.text}`}>
                  {s.title}
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={handleManualCheckUpdate}
                    className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                      updateInfo?.hasUpdate
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 animate-pulse shadow-sm'
                        : (theme === 'beige' ? 'bg-[#ffffff] text-[#422e1b] border border-[#c8ae95] hover:bg-[#faf5eb]' : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10')
                    }`}
                    title="GitHub Releases 기반 실시간 업데이트 점검"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isCheckingUpdate ? 'animate-spin text-sky-400' : ''}`} />
                    <span>{updateInfo?.hasUpdate ? `v${updateInfo.latestVersion} 업데이트` : '업데이트 확인'}</span>
                  </button>
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
          <div className="flex flex-col mb-6">
            <div className="flex items-center gap-2 mt-1.5">
              <div className="relative group w-fit">
                {!isAdmin ? (
                  <button
                    onClick={handleElevateAdmin}
                    disabled={isElevating}
                    className="px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-tighter inline-block w-fit cursor-pointer bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {s.standardMode}
                  </button>
                ) : (
                  <div className="px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-tighter inline-block w-fit bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    {s.adminMode}
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
                className="px-2 py-0.5 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-tighter hover:bg-red-500/20 transition-colors"
                title={s.resetState}
              >
                {s.resetBtn}
              </button>
            </div>
          </div>

          {/* 현재 PC 정보 (Host PC Info) */}
          {localIpInfo && (
            <div className={`mb-5 p-3 rounded-xl border ${theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c] text-[#1a0f05] shadow-sm' : 'bg-white/5 border-white/10 text-slate-100'}`}>
              <div className="flex items-center gap-1.5 mb-2 font-black uppercase tracking-wider text-[10px] opacity-90">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className={theme === 'beige' ? 'text-[#1a0f05] font-black' : 'text-slate-100'}>{s.hostPcInfo}</span>
              </div>
              <div className="space-y-1.5 text-[10.5px]">
                {localIpInfo.computerName && (
                  <div className="flex justify-between items-center">
                    <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : 'opacity-70'}>{s.computerName}</span>
                    <span className="font-extrabold text-sky-600 dark:text-sky-400 max-w-[130px] truncate" title={localIpInfo.computerName}>{localIpInfo.computerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : 'opacity-70'}>{s.ipAddress}</span>
                  <span className="font-black mono">{localIpInfo.ip}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme === 'beige' ? 'text-[#422e1b] font-bold' : 'opacity-70'}>{s.subnetTarget}</span>
                  <span className="font-black mono">{localIpInfo.subnet}.0/24</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1">
            <div className={`space-y-4 p-3.5 rounded-xl border ${theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c]' : 'bg-black/10 border-white/5'}`}>
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
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
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
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
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
                        : (theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#422e1b] hover:bg-[#faf5eb] font-bold' : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800')
                    }`}
                  >
                    <Search className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black uppercase">{s.scanPrecision}</span>
                  </button>
                </div>
                
                <div className={`p-2.5 rounded-lg border ${
                  theme === 'beige' ? 'bg-[#ffffff] border-[#d4be9c] text-[#1a0f05] shadow-sm' : 
                  scanMode === 'fast' ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 
                  scanMode === 'standard' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 
                  'bg-amber-500/10 border-amber-500/20 text-amber-200'
                }`}>
                  <p className={`text-[9.5px] leading-relaxed font-bold ${theme === 'beige' ? 'text-[#2c1d11]' : 'opacity-90'}`}>
                    {scanMode === 'fast' && s.scanFastDesc}
                    {scanMode === 'standard' && s.scanStandardDesc}
                    {scanMode === 'precision' && s.scanPrecisionDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Network Adapter & Filter Selection */}
            <div className={`p-3 rounded-xl border ${theme === 'beige' ? 'bg-[#ffffff]/80 border-[#d4be9c] text-[#1a0f05] shadow-sm' : 'bg-black/10 border-white/5'} space-y-2.5`}>
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
                        : (theme === 'beige' ? 'bg-[#f0e2be] hover:bg-[#e2ceaa] text-[#1a0f05] font-bold border border-[#d4be9c]' : 'bg-white/5 hover:bg-white/10 text-zinc-300')
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
                    초기화
                  </button>
                </div>
              )}

              {/* Open Deep Inspector Button */}
              <button
                onClick={() => setShowInterfaceModal(true)}
                className={`w-full py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'beige' 
                    ? 'bg-[#ffffff] border-[#c8ae95] hover:bg-[#faf5eb] text-[#1a0f05] shadow-sm' 
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

            <div className="flex items-center justify-between px-3 py-2 bg-black/10 rounded-lg border border-white/5 group relative">
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
                  stopScanRef.current = true;
                  abortControllerRef.current?.abort();
                } else {
                  startScan();
                }
              }}
              disabled={!goEngineAlive && !isScanning}
              className={`w-full py-3 rounded-lg font-black text-[12px] transition-all uppercase tracking-tight shadow-xl disabled:opacity-30 ${
                isScanning ? 'bg-rose-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isScanning ? s.stopScan : (hasStartedScan ? s.restartScan : s.startScan)}
            </button>

            <div className="space-y-4 pt-3 border-t border-white/5">
              <div className="flex flex-col space-y-2 px-1">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.author}</span>
                  <span className="text-[10px] font-bold opacity-90">AhBiYout-all</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.version}</span>
                  <span className="text-[10px] font-black text-sky-500">{CURRENT_APP_VERSION}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.github || 'GitHub'}</span>
                  <a href="https://github.com/ahbiyout-all/grid-ip-scanner2" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-500 hover:underline flex items-center gap-1">
                    <Github className="w-2.5 h-2.5" />
                    <span>grid-ip-scanner2</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.website}</span>
                  <a href="http://www.cisnet.co.kr" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-500 hover:underline">www.cisnet.co.kr</a>
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

              <div className={`p-2.5 rounded-lg border ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-slate-950/50 border-slate-800'}`}>
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

              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => handleExportCSV('active')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest w-full ${
                    theme === 'beige' 
                      ? 'bg-[#ffffff] border-[#d4be9c] text-[#1a0f05] hover:bg-[#faf5eb] shadow-sm' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200'
                  } ${activeCount > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <Zap className="w-3.5 h-3.5 text-sky-500" />
                  <span>{s.exportActive} (CSV)</span>
                </button>
                
                <button 
                  onClick={() => handleExportCSV('all')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest w-full ${
                    theme === 'beige' 
                      ? 'bg-[#ffffff] border-[#d4be9c] text-[#1a0f05] hover:bg-[#faf5eb] shadow-sm' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200'
                  } ${Object.keys(results).length > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <Box className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{s.exportAll} (CSV)</span>
                </button>

                <button 
                  onClick={handleExportGrid}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all text-[10px] font-black uppercase tracking-widest w-full ${Object.keys(results).length > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <Monitor className="w-3.5 h-3.5 text-sky-500" />
                  <span>{s.exportGrid} (HTML)</span>
                </button>

                <button 
                  onClick={handleExportExcelGrid}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-all text-[10px] font-black uppercase tracking-widest w-full ${Object.keys(results).length > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{s.exportExcelGrid} (XLS)</span>
                </button>

                {/* Professional Security Audit Report (Pro/Enterprise Feature) */}
                <button 
                  onClick={handleExportAuditReport}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all text-[10px] font-black uppercase tracking-widest w-full ${activeCount > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                  title={s.exportAuditReportBtn}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                  <span>{s.exportAuditReportBtn}</span>
                </button>

                {/* Save Current Scan Snapshot for Diff Comparison */}
                <button 
                  onClick={handleSaveSnapshot}
                  className={`flex items-center justify-center space-x-2 py-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all text-[9.5px] font-black uppercase tracking-widest w-full ${activeCount > 0 ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
                  title={s.saveSnapshot}
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{s.saveSnapshot}</span>
                </button>

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
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-h-0 ${t.main} relative overflow-hidden transition-colors duration-300`}>
        {/* Responsive Header Bar */}
        <header className={`border-b ${t.header} shrink-0 transition-colors`}>
          {/* ================= DESKTOP HEADER (md and above) ================= */}
          <div className="hidden md:flex min-h-[48px] py-1.5 items-center justify-between px-3 lg:px-6 gap-2 flex-wrap">
            {/* Left section: Search and Desktop Scanning Progress */}
            <div className="flex items-center gap-2 shrink-0 min-w-0 flex-wrap">
              <div className={`flex items-center ${theme === 'beige' ? 'bg-[#fcf8f2]/80 border-[#e6d0a7]' : 'bg-slate-950/80 border-slate-800'} rounded-lg border px-2 py-1 min-w-0`}>
                <Search className={`w-3.5 h-3.5 ${t.textMuted} mr-1.5 shrink-0`} />
                <input 
                  type="text" 
                  placeholder={s.searchPlaceholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`bg-transparent border-none outline-none text-xs w-16 lg:w-32 ${t.text} placeholder:opacity-30 truncate`}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-zinc-400 hover:text-white shrink-0 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

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

              {/* Sort Mode Dropdown */}
              <div className="relative group shrink-0">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as 'ip' | 'status' | 'name')}
                  className={`appearance-none bg-black/10 hover:bg-black/20 px-3 py-1.5 pr-7 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none transition-colors border border-transparent ${t.text}`}
                  title={s.sortBy}
                >
                  <option value="ip" className={t.bg}>{s.sortByIp}</option>
                  <option value="status" className={t.bg}>{s.sortByStatus}</option>
                  <option value="name" className={t.bg}>{s.sortByName}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none opacity-50">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex bg-black/10 rounded-lg p-0.5 shrink-0">
                <button 
                  onClick={() => setLang('ko')} 
                  className={`px-2 py-1 text-[10px] font-black rounded ${lang === 'ko' ? 'bg-sky-500 text-white' : 'opacity-50 hover:opacity-100'}`}
                >
                  KO
                </button>
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-2 py-1 text-[10px] font-black rounded ${lang === 'en' ? 'bg-sky-500 text-white' : 'opacity-50 hover:opacity-100'}`}
                >
                  EN
                </button>
              </div>

              {/* Desktop Theme Selector Dropdown */}
              <div className="relative group shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                  theme === 'beige' 
                    ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]' 
                    : theme === 'gray'
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                    : 'bg-slate-900 border-white/10 text-zinc-300'
                }`}>
                  {theme === 'beige' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : theme === 'gray' ? (
                    <Square className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'dark' | 'gray' | 'beige')}
                    className="bg-transparent border-none outline-none text-[10px] font-black cursor-pointer appearance-none pr-3"
                    title={lang === 'ko' ? '테마 스타일 선택' : 'Select Theme Style'}
                  >
                    <option value="dark" className={t.bg}>{lang === 'ko' ? '다크 테마' : 'Dark Theme'}</option>
                    <option value="gray" className={t.bg}>{lang === 'ko' ? '그레이 테마' : 'Gray Theme'}</option>
                    <option value="beige" className={t.bg}>{lang === 'ko' ? '베이지 테마' : 'Beige Theme'}</option>
                  </select>
                  <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none opacity-50">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Real-time GitHub Update Button */}
              <button
                onClick={handleManualCheckUpdate}
                title={updateInfo?.hasUpdate ? `새 버전 v${updateInfo.latestVersion} 업데이트 가능` : 'GitHub 최신 릴리즈 점검'}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                  updateInfo?.hasUpdate
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 animate-pulse'
                    : theme === 'beige' ? 'hover:bg-[#f5ebd6] text-[#5c4a37]' : 'hover:bg-white/10 text-zinc-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Help Button */}
              <button 
                onClick={() => setShowHelp(true)} 
                title={s.help} 
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all shrink-0 ${theme === 'beige' ? 'hover:bg-[#f5ebd6] text-[#5c4a37]' : 'hover:bg-white/10 text-zinc-300'}`}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================= MOBILE HEADER (< md) ================= */}
          <div className="flex md:hidden flex-col divide-y divide-white/5">
            {/* Mobile Top Row: Menu Button, App Title & Quick Tools */}
            <div className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg shrink-0 text-sky-400 active:scale-95 transition-all flex items-center gap-1.5"
                  title="설정 및 스캔 제어 메뉴"
                >
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-tight">설정</span>
                </button>
                <div className="flex items-center gap-1.5 truncate">
                  <img 
                    src="./logo.png" 
                    alt="Grid IP" 
                    className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-sm border border-sky-500/40" 
                  />
                  <span className="font-black text-xs uppercase tracking-tight truncate">Grid IP</span>
                  {updateInfo?.hasUpdate && (
                    <button
                      onClick={() => setShowUpdateModal(true)}
                      className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[8.5px] font-black uppercase flex items-center gap-1 animate-pulse"
                      title="새 버전 다운로드 가능"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>UP</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* View Mode (Grid vs Diff) */}
                <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 rounded text-[9.5px] font-black uppercase transition-all flex items-center gap-1 ${
                      viewMode === 'grid' ? 'bg-sky-500 text-white shadow-sm' : 'opacity-60'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span>그리드</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!license.features.diffCompare) {
                        showToast("스냅샷 비교(Diff) 기능은 PRO 이상에서 제공됩니다.");
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

                {/* License Badge */}
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[9.5px] font-black uppercase flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>{license.tier.toUpperCase()}</span>
                </button>

                {/* Theme Selector Dropdown */}
                <div className="relative group shrink-0">
                  <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                    theme === 'beige' 
                      ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#5c4a37]' 
                      : theme === 'gray'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-slate-900 border-white/10 text-zinc-300'
                  }`}>
                    {theme === 'beige' ? (
                      <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                    ) : theme === 'gray' ? (
                      <Square className="w-3 h-3 text-zinc-300 shrink-0" />
                    ) : (
                      <Moon className="w-3 h-3 text-sky-400 shrink-0" />
                    )}
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as 'dark' | 'gray' | 'beige')}
                      className="bg-transparent border-none outline-none text-[9px] font-black cursor-pointer appearance-none pr-2"
                      title={lang === 'ko' ? '테마 선택' : 'Theme'}
                    >
                      <option value="dark" className={t.bg}>다크</option>
                      <option value="gray" className={t.bg}>그레이</option>
                      <option value="beige" className={t.bg}>베이지</option>
                    </select>
                  </div>
                </div>

                {/* Help Button */}
                <button 
                  onClick={() => setShowHelp(true)} 
                  title={s.help} 
                  className="p-1.5 rounded-lg bg-black/20 hover:bg-white/10 border border-white/5 text-zinc-300"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Bottom Row: Search Bar (30% reduced), Sort Dropdown & Language */}
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-black/10">
              {/* Search Box (30% reduced width) */}
              <div className={`w-36 flex items-center ${theme === 'beige' ? 'bg-white border-[#dfceb0]' : 'bg-black/30 border-white/10'} rounded-lg border px-2 py-1 shrink-0`}>
                <Search className={`w-3.5 h-3.5 ${t.textMuted} mr-1.5 shrink-0`} />
                <input 
                  type="text" 
                  placeholder={s.searchPlaceholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-xs ${t.text} placeholder:opacity-40 truncate`}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-zinc-400 hover:text-white shrink-0 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Select Dropdown */}
              <div className="relative group shrink-0">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as 'ip' | 'status' | 'name')}
                  className={`appearance-none bg-black/20 border border-white/10 px-2.5 py-1 pr-5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer outline-none ${t.text}`}
                >
                  <option value="ip" className={t.bg}>{s.sortByIp}</option>
                  <option value="status" className={t.bg}>{s.sortByStatus}</option>
                  <option value="name" className={t.bg}>{s.sortByName}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-1 pointer-events-none opacity-50">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {/* KO / EN Toggle */}
              <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10 shrink-0">
                <button 
                  onClick={() => setLang('ko')} 
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lang === 'ko' ? 'bg-sky-500 text-white' : 'opacity-60'}`}
                >
                  KO
                </button>
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lang === 'en' ? 'bg-sky-500 text-white' : 'opacity-60'}`}
                >
                  EN
                </button>
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

        <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-3 relative bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.03)_0%,_transparent_70%)] overflow-y-auto min-h-0">
          {/* Enhanced Snapshot Diff Diagnostic & Control Panel */}
          {viewMode === 'diff' && (
            <div className={`w-full max-w-[800px] mb-2 p-3 rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 ${
              theme === 'beige'
                ? 'bg-[#fcf7ee] border-[#dfcaa7] text-[#4a341e]'
                : 'bg-gradient-to-r from-indigo-950/85 via-slate-900/90 to-purple-950/85 border-indigo-500/40 text-indigo-100'
            }`}>
              {/* Row 1: Header, Status Badge, Guide & Exit Buttons */}
              <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${
                theme === 'beige' ? 'border-[#dfcaa7]/60' : 'border-white/10'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    theme === 'beige' ? 'bg-amber-500/20 text-amber-800' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-xs font-black uppercase tracking-tight truncate ${
                      theme === 'beige' ? 'text-[#382613]' : 'text-indigo-300'
                    }`}>{s.diffMode}</span>
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold truncate border ${
                      theme === 'beige'
                        ? 'bg-[#edd8b6] border-[#d8c09a] text-[#543818]'
                        : 'bg-indigo-500/30 border-indigo-500/40 text-indigo-200'
                    }`}>
                      {baselineSnapshot ? `기준: ${baselineSnapshot.label}` : '기준점 필요 (스냅샷 저장)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowDiffGuide(true)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition-all ${
                      theme === 'beige'
                        ? 'bg-[#f0e2ca] hover:bg-[#e7d4b4] border-[#d4be94] text-[#4a341e]'
                        : 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40 text-indigo-300'
                    }`}
                    title={s.diffGuideBtn}
                  >
                    <HelpCircle className="w-3.5 h-3.5 opacity-80" />
                    <span>{s.diffGuideBtn}</span>
                  </button>

                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition-all ${
                      theme === 'beige'
                        ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300'
                    }`}
                    title="스냅샷 비교 종료 및 기본 그리드로 복귀"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>그리드 복귀</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Snapshot Actions (Save / Baseline Selector / Delete) & Live Counters */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveSnapshot}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-[10.5px] font-black uppercase tracking-tight shadow-md flex items-center gap-1.5 transition-all shrink-0"
                    title="현재 스캔된 네트워크 상태를 새 기준 스냅샷으로 캡처하여 저장합니다"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{s.diffSaveNewBtn}</span>
                  </button>

                  {snapshots.length > 0 && (
                    <div className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 ${
                      theme === 'beige'
                        ? 'bg-white/90 border-[#d8c09a] text-[#4a341e]'
                        : 'bg-black/40 border-white/10 text-zinc-100'
                    }`}>
                      <span className={`text-[9.5px] font-bold uppercase tracking-wider ${
                        theme === 'beige' ? 'text-[#7d5f39]' : 'text-zinc-400'
                      }`}>{s.baselineSelect}:</span>
                      <select
                        value={baselineSnapshot?.id || ''}
                        onChange={(e) => setBaselineSnapshotId(e.target.value)}
                        className={`bg-transparent text-[10.5px] font-bold outline-none cursor-pointer py-1 pr-1 max-w-[180px] truncate ${
                          theme === 'beige' ? 'text-[#3d2711]' : 'text-zinc-100'
                        }`}
                      >
                        {snapshots.map((snap) => (
                          <option 
                            key={snap.id} 
                            value={snap.id} 
                            className={theme === 'beige' ? 'bg-[#fcf7ee] text-[#3d2711]' : 'bg-zinc-900 text-zinc-100'}
                          >
                            {snap.label} ({snap.activeCount}대)
                          </option>
                        ))}
                      </select>
                      {baselineSnapshot && (
                        <button
                          onClick={() => handleDeleteSnapshot(baselineSnapshot.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                          title="선택한 기준 스냅샷 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Diff Live Diagnostic Counters (Responsive Adaptive Grid) */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black">
                  <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 shadow-sm transition-all ${
                    theme === 'beige'
                      ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>+ {s.diffNewBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.newCount}</span>
                  </div>

                  <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 shadow-sm transition-all ${
                    theme === 'beige'
                      ? 'bg-rose-100/90 text-rose-900 border-rose-300'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>- {s.diffGoneBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.offlineCount}</span>
                  </div>

                  <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 shadow-sm transition-all ${
                    theme === 'beige'
                      ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>! {s.diffChangedBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.changedCount}</span>
                  </div>

                  <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                    theme === 'beige'
                      ? 'bg-stone-100/90 text-stone-800 border-stone-300'
                      : 'bg-white/5 text-zinc-300 border-white/10'
                  }`}>
                    <span>= {s.diffSameBadge}:</span>
                    <span className="mono text-xs font-black">{diffAnalysis.summary.sameCount}</span>
                  </div>
                </div>
              </div>

              {/* Friendly Callout if no snapshots exist */}
              {snapshots.length === 0 && (
                <div className={`p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-3 animate-in fade-in ${
                  theme === 'beige'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info className={`w-4 h-4 shrink-0 ${theme === 'beige' ? 'text-amber-700' : 'text-indigo-400'}`} />
                    <span>{s.diffEmptyDesc}</span>
                  </div>
                  <button
                    onClick={handleSaveSnapshot}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] shrink-0 uppercase shadow"
                  >
                    지금 캡처
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={`grid grid-cols-16 grid-rows-16 gap-[1px] w-full aspect-square relative z-10 my-auto transition-all ${
            viewMode === 'diff' 
              ? 'max-w-[min(800px,calc(100vh-270px))] md:max-w-[min(800px,calc(100vh-220px))]' 
              : 'max-w-[min(800px,calc(100vh-120px))] md:max-w-[min(800px,calc(100vh-85px))]'
          }`}>
            {filteredIps.map((ip, index) => (
              <IPCell 
                key={ip}
                ip={ip}
                index={index}
                status={results[ip].status}
                device={results[ip].device}
                isSelected={selectedIp === ip}
                isHost={ip === localIpInfo?.ip}
                onClick={setSelectedIp}
                theme={theme}
                s={s}
                diffStatus={viewMode === 'diff' ? diffAnalysis.diffMap[ip] : undefined}
              />
            ))}
          </div>
        </div>
      </main>

       {selectedIp && (
        <aside className={`fixed md:relative inset-y-0 right-0 w-full md:w-80 border-l ${t.panel} flex flex-col z-[200] md:z-0 shadow-2xl transition-all`}>
           <div className="p-5 flex flex-col h-full space-y-6 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className={`text-xs font-black ${theme === 'beige' ? 'text-[#5c4a37]' : 'text-white'} uppercase tracking-tighter`}>{s.deviceProfile}</h2>
              <button onClick={() => setSelectedIp(null)} className={`p-1.5 hover:bg-current hover:bg-opacity-10 rounded-lg ${t.textMuted} transition-colors`}><X className="w-5 h-5" /></button>
            </div>
            {results[selectedIp]?.device ? (
              <div className="space-y-6">
                <section className="space-y-2">
                   <div className={`p-5 ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-sky-500/10 border-sky-500/30'} rounded-2xl border flex flex-col items-center text-center`}>
                      <Monitor className="w-8 h-8 text-sky-500 mb-3" />
                      <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest mb-1`}>{s.networkIdentity}</span>
                      <span className="text-base font-black text-sky-500 break-all leading-tight">
                        {results[selectedIp].device?.hostname}
                      </span>
                      {results[selectedIp].device?.webTitle && (
                        <div className={`mt-3 px-3 py-1.5 ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-black/40 border-slate-800'} border rounded-lg italic text-[10px] ${t.textMuted}`}>
                          "{results[selectedIp].device?.webTitle}"
                        </div>
                      )}
                      <div className="mt-3 flex items-center space-x-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                         <span className="text-[10px] font-bold opacity-70">{s.active} - {results[selectedIp].device?.latency}ms</span>
                      </div>
                   </div>
                </section>
                <section className="space-y-2">
                  <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.technicalDetails}</span>
                  <div className={`p-4 ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-slate-950 border-slate-800'} rounded-xl border space-y-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`${t.textMuted} text-[9px] uppercase font-bold`}>{s.address}</span>
                      <a 
                        href={`http://${selectedIp}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-black mono text-sky-500 hover:text-sky-400 hover:underline flex items-center gap-1 group/link"
                        title={lang === 'ko' ? '웹 브라우저로 연결 (HTTP)' : 'Connect via Web Browser (HTTP)'}
                      >
                        {selectedIp}
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover/link:opacity-100 inline transition-opacity" />
                      </a>
                    </div>
                    <div className="flex justify-between items-center"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>{s.macInfo}</span><span className="text-xs font-black mono text-emerald-500">{results[selectedIp].device?.mac}</span></div>
                    <div className="flex justify-between items-center"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>{s.vendor}</span><span className="text-xs font-black truncate ml-4 text-right">{results[selectedIp].device?.vendor}</span></div>
                    <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>{s.os}</span><span className="text-xs font-black">{results[selectedIp].device?.os}</span></div>
                    {results[selectedIp].device?.mdns && (
                      <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>mDNS</span><span className="text-xs font-black truncate ml-4 text-right text-sky-500">{results[selectedIp].device?.mdns}</span></div>
                    )}
                    {results[selectedIp].device?.upnp && (
                      <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>UPnP</span><span className="text-xs font-black truncate ml-4 text-right text-purple-500">{results[selectedIp].device?.upnp}</span></div>
                    )}
                    {results[selectedIp].device?.snmp && (
                      <div className="flex justify-between items-center border-t border-current border-opacity-5 pt-3"><span className={`${t.textMuted} text-[9px] uppercase font-bold`}>SNMP</span><span className="text-xs font-black truncate ml-4 text-right text-amber-500">{results[selectedIp].device?.snmp}</span></div>
                    )}
                  </div>
                </section>
                {results[selectedIp].device?.openPorts && results[selectedIp].device!.openPorts!.length > 0 && (
                  <section className="space-y-2">
                    <span className={`text-[9px] font-black ${t.textMuted} uppercase tracking-widest`}>{s.listeningPorts}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {results[selectedIp].device?.openPorts?.map(p => (
                        <div key={p} className={`px-2 py-0.5 rounded text-[11px] font-black mono ${theme === 'beige' ? 'bg-[#f5ebd6] text-[#b45309]' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
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
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span className={`text-[9.5px] font-black ${t.textMuted} uppercase tracking-widest`}>
                        {s.deepPortAuditBtn}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRunDeepPortAudit(selectedIp)}
                      disabled={isAuditingPorts}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      {isAuditingPorts ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>정밀 진단</span>
                        </>
                      )}
                    </button>
                  </div>

                  {portAuditResult && portAuditResult.ip === selectedIp && (
                    <div className={`p-3 rounded-xl border ${theme === 'beige' ? 'bg-[#fcf8f2] border-[#e6d0a7]' : 'bg-black/30 border-white/10'} space-y-2 animate-in fade-in`}>
                      <div className="flex justify-between items-center text-[9px] opacity-70">
                        <span>점검 포트: {portAuditResult.totalChecked}개</span>
                        <span>탐지: {portAuditResult.openPorts.length}개</span>
                      </div>
                      {portAuditResult.openPorts.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                          {portAuditResult.openPorts.map((item) => (
                            <div
                              key={item.port}
                              className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col space-y-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black mono text-sky-400">
                                  {item.port} / {item.service}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
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
                              <span className="text-[9px] opacity-70">{item.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-400 py-1 text-center font-bold">
                          ✓ 점검 결과 주의 대상 포트가 닫혀있습니다.
                        </div>
                      )}
                    </div>
                  )}
                </section>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                <Wifi className="w-16 h-16 mb-4" />
                <span className="text-xs font-black uppercase tracking-widest">{s.selectNode}</span>
              </div>
            )}
           </div>
        </aside>
      )}

      {/* Source Info Modal */}
      {showSourceInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
           <div className={`w-full max-w-md ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-6`}>
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
                 <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-slate-950 border-slate-800'}`}>
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
                       <a href="https://standards-oui.ieee.org/oui/oui.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-L (24-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui/oui.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://standards-oui.ieee.org/oui28/mam.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-M (28-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui28/mam.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://standards-oui.ieee.org/oui36/oui36.txt" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : 'bg-white/5'}`}>
                          <div>
                            <div className="text-[10px] font-bold">IEEE OUI / MA-S (36-bit Registry)</div>
                            <div className="text-[9px] opacity-50 mono">standards-oui.ieee.org/oui36/oui36.txt</div>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                       </a>
                       <a href="https://www.wireshark.org/download/automated/data/manuf" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-sky-500/30 transition-all ${theme === 'beige' ? 'bg-[#f5ebd6]/50' : 'bg-white/5'}`}>
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
           <div className={`w-full max-w-md ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-6 animate-in zoom-in-95 duration-200`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-sm uppercase tracking-tight">{s.securityNoticeTitle}</h3>
                </div>
                <button onClick={() => setShowSecurityNotice(false)} className="p-1 hover:opacity-50"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 'bg-amber-500/10 border-amber-500/20'}`}>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
           <div className={`w-full max-w-lg ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col`}>
              <div className="flex justify-between items-center flex-shrink-0">
                 <div className="flex items-center space-x-2">
                   <HelpCircle className="w-5 h-5 text-sky-500" />
                   <h3 className="font-black text-sm uppercase tracking-tight">{s.helpTitle}</h3>
                 </div>
                 <button onClick={() => setShowHelp(false)} className="p-1 hover:opacity-50 transition-opacity"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed no-scrollbar">
                {/* Hero App Brand Card with Large Icon */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left ${
                  theme === 'beige' ? 'bg-[#f5ebd6]/60 border-[#e6d0a7]' : 'bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent border-sky-500/20'
                }`}>
                  <img 
                    src="./logo.png" 
                    alt="Grid IP Scanner2" 
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border-2 border-sky-500/40 shadow-xl shadow-sky-500/20 shrink-0" 
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black tracking-tight uppercase">Grid IP Scanner2</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">v2.3.2</span>
                    </div>
                    <p className="text-[11px] opacity-75 leading-snug">
                      초고속 C-Class 네트워크 비주얼 탐색 및 9만 건 OUI 식별 엔진
                    </p>
                    <div className="text-[10px] text-zinc-400 flex items-center justify-center sm:justify-start gap-2 font-mono pt-0.5 flex-wrap">
                      <span>개발자: AhBiYout-all</span>
                      <span>•</span>
                      <span>GitHub: AhBiYout</span>
                      <span>•</span>
                      <span>저장소: grid-ip-scanner2</span>
                    </div>
                  </div>
                </div>

                {/* 1. License Section */}
                <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-black uppercase tracking-wider">{s.helpLicenseTitle}</span>
                  </div>
                  <p className="opacity-90 whitespace-pre-line">
                    {s.helpLicenseDesc}
                  </p>
                </div>

                {/* 2. Usage Guide Section */}
                <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-sky-500" />
                    <span className="font-black uppercase tracking-wider">{s.helpUsageTitle}</span>
                  </div>
                  <p className="opacity-90 whitespace-pre-line leading-relaxed">
                    {s.helpUsageDesc}
                  </p>
                </div>

                {/* 3. Creator Contact & GitHub Section */}
                <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-white/5 border-white/5'}`}>
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
                      <span className="font-semibold">{lang === 'ko' ? '개발자:' : 'Developer:'} <span className="font-bold">AhBiYout-all</span> <span className="text-[10px] font-mono opacity-60">(@AhBiYout)</span></span>
                      <a 
                        href="https://github.com/AhBiYout/grid-ip-scanner2/issues"
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
                      <a href="https://github.com/AhBiYout/grid-ip-scanner2" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline font-bold flex items-center gap-1">
                        <span>github.com/AhBiYout/grid-ip-scanner2</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-70">{lang === 'ko' ? '소 속:' : 'Affiliation:'}</span>
                      <a href="http://www.cisnet.co.kr/" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline font-bold">
                        www.cisnet.co.kr
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

              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase transition-all shadow-xl flex-shrink-0"
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
          <div className={`w-full max-w-lg ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
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
                  <div className="text-base font-black tracking-tight mt-0.5 flex items-center gap-2">
                    <span>{license.tier.toUpperCase()} EDITION</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-current/20">
                      {license.tier === 'free' ? '무료' : '정품 인증'}
                    </span>
                  </div>
                  <div className="text-[10.5px] opacity-75 mt-1">
                    등록 대상: <span className="font-bold">{license.licensedTo || '커뮤니티 사용자'}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-full bg-current/10">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              {/* Feature Entitlement Matrix */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-60">기능 해금 현황 (Feature Gates)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>16x16 시각화 그리드 맵</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>9만 건 OUI 제조사 식별</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>스냅샷 비교 (Diff Engine)</span>
                    {license.features.diffCompare ? (
                      <span className="text-[10px] font-bold text-emerald-400">● 활성</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">○ 비활성 (잠김)</span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>심층 포트 정밀 보안 감사</span>
                    {license.features.portScanDeep ? (
                      <span className="text-[10px] font-bold text-emerald-400">● 활성</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">○ 비활성 (잠김)</span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>A4 보안 감사 보고서 (HTML)</span>
                    {license.features.exportReport ? (
                      <span className="text-[10px] font-bold text-emerald-400">● 활성</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">○ 비활성 (잠김)</span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span>다중 서브넷 허용 한도</span>
                    <span className="text-[10px] font-bold mono text-sky-400">
                      {license.maxSubnets === 999 ? '무제한' : `${license.maxSubnets}개 대역`}
                    </span>
                  </div>
                </div>
              </div>

              {/* License Activation Form */}
              <div className={`p-4 rounded-xl border ${theme === 'beige' ? 'bg-[#f5ebd6]/50 border-[#e6d0a7]' : 'bg-white/5 border-white/10'} space-y-3`}>
                <label className="text-[10px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>라이선스 키 입력 및 활성화</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder={s.licenseKeyPlaceholder}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    onClick={handleActivateLicense}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-tight transition-all shadow-md shrink-0"
                  >
                    {s.activateBtn}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => {
                      setLicenseKeyInput('GRID-PRO-TRIAL-2026');
                    }}
                    className="text-[10px] text-sky-400 hover:underline font-semibold"
                  >
                    💡 시험용 Pro 키 자동 입력 (GRID-PRO-TRIAL-2026)
                  </button>
                  {license.tier !== 'free' && (
                    <button
                      onClick={handleResetLicense}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      무료 버전으로 초기화
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowLicenseModal(false)}
              className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase transition-all flex-shrink-0"
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
      />

      {/* Snapshot Diff 3-Step Interactive Guide Modal */}
      {showDiffGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl ${theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37]' : 'bg-zinc-900 text-zinc-100'} rounded-2xl shadow-2xl border ${t.panel} p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
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
              <span className="text-[11px] opacity-60">
                {lang === 'ko' ? '💡 스냅샷은 브라우저/시스템에 안전하게 영구 저장됩니다.' : '💡 Snapshots are safely saved locally.'}
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
    </div>
  );
};

export default App;
