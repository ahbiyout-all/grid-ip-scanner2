# Grid IP Scanner2
## 📋 기술 설명서 및 개발 백서 (Technical Documentation & Architecture Whitepaper)

본 문서는 **Grid IP Scanner2 (v2.6.0)**의 시스템 아키텍처, 16x16 시각화 그리드 맵, **3계층 인터랙티브 토폴로지 맵(`TopologyMapView`) & 보안 교차 분석**, **네이티브 패킷 정밀 텔레메트리(`grid_pcap_analyzer.dll v2.6.2`)**, **다중 서브넷·VLAN 통합 대시보드(`MultiSubnetBar` / `MultiSubnetModal` / Batch Sweep)**, **Free 티어 5시트 엑셀 그리드(.xls) 내보내기**, **OUI 시맨틱 다중 신호 기기 분류 & LAA 랜덤 MAC 역추적**, **게이트웨이/인프라 Proxy-ARP 비알림 분리**, **순수 창작 `grid_topology_guard.dll`(`v2.6.1`) 포함 12대 C/C++ 네이티브 DLL 엔진**, **Go 자율 트레이 엔진(`tray_engine.go`)·동적 4색 배지 `HICON`·Windows SCM 네이티브 서비스(`--service`)·조용한 부팅(`--tray`)·이벤트 기반 OS 알림 고도화**, **통합 보고서 센터(`ReportCenterModal`) 및 A4 PDF 보고서 엔진**, 정기 자동 네트워크 스캔 스케줄러, 딥 스냅샷 비교(Diff v2) 1:1 대조 스튜디오, Inno Setup 6 윈도우 인스톨러 툴체인 및 안드로이드 APK 배포 체계를 체계적으로 기술한 공식 제품 가이드입니다.

---

## 1. 프로젝트 개요 및 아키텍처

**Grid IP Scanner2**는 로컬 네트워크 대역(C클래스, `/24` 서브넷 및 다중 서브넷/VLAN)의 모든 IP 주소(1~254)를 실시간으로 고속 탐색하여 시각적 **16x16 그리드 맵**과 **3계층 인터랙티브 토폴로지 맵**으로 한눈에 파악할 수 있도록 설계된 고성능 올인원 네트워크 분석 및 보안 감사 도구입니다.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                  Grid IP Scanner2 System Flow (v2.6.0)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  React 19 / Electron Frontend   │     │  Go + 12 Native C/C++ DLL Core  │
│  - Grid / TopologyMap / Diff v2 │◄────┤  - /api/packet-inspect (v2.6.2) │
│  - MultiSubnetBar & Modal (VLAN)│ SSE │  - /api/topology-map & /discover│
│  - Packet Telemetry Inspector   │     │  - tray_engine.go & SCM Service │
│  - ReportCenter (Free .xls+PDF) │────►│  - grid_topology_guard.dll v2.6 │
│  - OUI Semantic + Proxy-ARP UI  │ API │  - Async ICMP Batch + IOCP Port │
│  - Ed25519 Offline Licensing    │     │  - UPnP XML, mDNS & Vault v2.6  │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

* **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons를 사용하여 현대적인 반응형 UI를 제공합니다. 3계층 인터랙티브 토폴로지 맵(`TopologyMapView.tsx`, `topologyGraphBuilder.ts`), 다중 서브넷/VLAN 바·통합 대시보드(`MultiSubnetBar.tsx`, `MultiSubnetModal.tsx`, `multiSubnetManager.ts`), OUI 시맨틱 분류(`ouiClassifier.ts`), Proxy-ARP 비알림 분리(`conflictDetector.ts`, `IPCell.tsx`), 통합 보고서 센터(`ReportCenterModal.tsx`), 트레이/알림 정책 통합 모달(`PreferencesTrayModal.tsx`), 5초 Ticker 정기 스케줄러(`schedulerService.ts`), 1:1 대조 스튜디오(`SnapshotDiffModal.tsx`)가 모듈화되어 탑재되어 있습니다.
* **Backend, Autonomous Tray Engine & 12 Native C/C++ DLL Suite**: Go 병렬 탐색·패킷 프로파일링(`/api/packet-inspect`)·토폴로지 그래프(`/api/topology-map`)·다중 NIC/VLAN 탐색(`/api/subnets/discover`)·자율 트레이 엔진(`tray_engine.go`, `utils_windows.go`)과 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`) 12대 C/C++ 네이티브 DLL(`grid_pcap_analyzer.dll v2.6.2`, `grid_topology_guard.dll v2.6.1`, `grid_probe_engine.dll`, `grid_port_iocp.dll`, `grid_vault_driver.dll`, `secure_vault.dll` 등)이 결합해 정밀 패킷 텔레메트리, 무인 감시, 동적 배지 트레이, Windows SCM 서비스(`--service`), 이벤트 쿨다운·DND 알림, IOCP/Async ICMP 배치 스위프, O(N) 토폴로지 델타 해시 및 `GVAULT11` PBKDF2+AES-256-GCM 암복호화를 수행합니다.
* **Adaptive 5-Tier Launcher, Silent Boot (`--tray`) & Close-to-Tray**: 최신 Windows 11/10 Edge 앱 모드부터 `--tray` 무창 트레이 부팅, 창 닫기 후 Go 10초 자율 스윕 전환, 레거시 OS 대응 트레이 서브메뉴, 심각도별 Win32 풍선 알림(`NIIF_ERROR`/`WARNING`/`INFO`), 네이티브 비상 스캔 모드(`notepad.exe`)까지 5단계 자동 폴백을 지원합니다.
* **Dual Distribution (Portable & Installer & Mobile)**: 단일 무설치 포터블(`.exe`), 12대 DLL 분리 배치형 Inno Setup 6 정식 인스톨러(`Grid_IP_Scanner2_v2.6.0_Setup.exe`), 안드로이드 APK(`Grid_IP_Scanner2_v2.6.0.apk`) 및 PWA 패키지를 제공합니다.

---

## 2. 주요 핵심 기능

### 📌 1. 16x16 시각화 그리드 맵 · 3계층 토폴로지 맵 & 딥 스냅샷 비교 (Diff v2)
* C클래스 `/24` 서브넷의 254개 전체 호스트를 16행 16열 바둑판 형태로 시각화.
* **3계층 인터랙티브 토폴로지 맵 (`Grid` | `Topology Map` | `Snapshot Diff`) (`components/TopologyMapView.tsx`, `services/topologyGraphBuilder.ts`, `POST /api/topology-map`)**:
  - 게이트웨이/코어 라우터(Tier 0) ➔ 인프라·Proxy-ARP·보안 그룹(Tier 1) ➔ 개별 단말(Tier 2) 계층을 SVG 줌/팬으로 탐색하며, `grid_topology_guard.dll` 연계를 통한 **Pro 보안 교차 분석(Topology Security Correlation)** 오버레이 지원.
* **네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`, `GET/POST /api/packet-inspect`)**:
  - 장치 상세 프로필 패널에서 원클릭으로 **TTL/초기 TTL/추정 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), TCP Window 힌트, OS 추정(신뢰도) 및 Live ARP MAC 정합성**을 실시간 프로파일링.
* **온디맨드 다중 서브넷 및 VLAN 통합 대시보드 (`MultiSubnetBar.tsx`, `MultiSubnetModal.tsx`, `multiSubnetManager.ts`, `GET /api/subnets/discover`)**:
  - 일반 단일 대역 사용 시에는 숨김 상태를 유지하다 상단 **`다중 서브넷·VLAN`**(`VLAN`) 버튼 클릭 시(또는 일괄 스윕 가동 시) 화면에 펼쳐지며, **활성 프로필 VLAN Tag ID 비주얼 인디케이터(`활성 태그` 배지 + 프로파일별 색상 구분 태그 마커)**, 로컬 NIC/VLAN CIDR 자동 탐색 및 대역별 독립 스캔 결과 캐싱, Free 최대 2개 대역 전환 및 **Pro(5대역)/Enterprise(무제한) 순차 일괄 스윕(Batch Sweep)·교차 서브넷 이상 징후 통합 관제** 제공.
* **스냅샷 Diff 4색 상태 구분 체계 (`services/diffEngine.ts`, `components/IPCell.tsx`, `components/SnapshotDiffModal.tsx`)**:
  - 현재 스캔 결과와 과거 스냅샷 기준점을 대조하여 직관적인 4색 컬러 시스템으로 표시:
    - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 발광 + 펄스 애니메이션 핑 닷 + 고대비 테두리.
    - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 오프라인 빗금 패턴.
    - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지 (MAC 변조/IP 충돌 의심, 취약 포트 신규 노출 감지).
    - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 4개 메탈릭 베이스라인(하늘, 보라, 청록, 회색) 원클릭 스위처 지원.
  - **미할당 빈 IP 슬롯(245개) 완전 제외**: 장비 없는 빈 슬롯을 `=SAME`에서 분리하여 실제 온라인 기준 장비만 정직하게 카운트.
  - **1:1 Side-by-Side 대조 스튜디오**: 과거 시점 A vs B 또는 실시간 스캔을 1:1로 나란히 비교, 실시간 검색, 보안 경보 탭, CSV 내보내기 지원.
  - **Zero-Clipping Sub-Header**: 스크롤 시에도 최상단 조작 버튼과 카운터 뱃지가 잘리지 않는 고정 레이어 아키텍처.

### 📌 2. 정기 자동 네트워크 스캔 스케줄러 (`services/schedulerService.ts`, `components/ScheduleModal.tsx`)
* **주기적 무인 자동 스캔**:
  - 15분, 30분, 1시간, 2시간, 6시간, 12시간, 매일/매주 등 주기별 자동 스캔 및 자동 내보내기(`autoExportEnabled`, `autoReportIds`) 지원.
  - 5초 Ticker 백그라운드 타이머, 수동 스캔 시 중복 실행 방지 비지 락(Busy Lock), 트레이/UI 양방향 **일시정지·재개 및 즉시 실행(`run_schedule_now`)** 지원.
* **스냅샷 자동 아카이빙 (`[Auto-Sched]`)**:
  - 스케줄 완료 시 자동으로 시점별 스냅샷을 캡처하여 최대 25개까지 보관, Diff 모드에서 즉시 대조 가능.
* **실시간 카운트다운 헤더 배지**:
  - 메인 상단 헤더에 `⏰ 정기 스캔 ON (주기)` 및 일시정지 상태 배지를 통해 다음 스캔까지 남은 시간을 실시간 표시.

### 📌 3. 통합 보고서 센터 · Free 5시트 엑셀 그리드 & A4 최적화 스마트 PDF 감사 보고서
* **통합 보고서 센터 모달 (`components/ReportCenterModal.tsx`, `services/reportCenterService.ts`)**:
  - **Free 티어 5시트 Excel Grid XML(`.xls`) 전면 개방**: 16x16 IP 맵 시트 포함 다중 시트 Excel XML(`.xls`) 및 CSV·JSON·Markdown을 Free 에디션에서 무료 제공.
  - PDF 보안 감사 보고서(Pro+), 인쇄/그리드 HTML 내보내기 및 스냅샷 비교 진입을 전용 모달로 일원화.
* **25개 주요 서비스 포트 정밀 진단 & 빠른 연결 모달 (`services/portScanner.ts`, `components/QuickConnectModal.tsx`)**:
  - FTP(21), SSH(22), Telnet(23), SMTP(25), DNS(53), HTTP(80), SMB(445), RTSP(554), IPP(631), MSSQL(1433), MQTT(1883), MySQL(3306), RDP(3389), PostgreSQL(5432), VNC(5900), Redis(6379), JetDirect(9100) 등 주요 포트 위험도(`HIGH`/`MEDIUM`/`SAFE`) 분류 및 Listening Ports 클릭 시 프로토콜 아이콘·URI 복사·원격 실행을 제안하는 **Quick Connect 모달** 제공.
* **A4 규격 스마트 페이지네이션 PDF 엔진 (`services/reportGenerator.ts`)**:
  - **Zero Row-Chopping**: 794px x 1123px (A4 1:1.4142)의 독립 페이지 단위 사전 분할로 페이지 경계면에서 테이블 행이나 글자가 반으로 잘리는 문제 완전 해소.
  - **11mm 프린터 안전 여백 & 동적 페이지 번호**: 매 페이지 하단 `페이지 X / Y` 및 공식 푸터 동기화, `@media print` 고해상도 직접 인쇄 지원.

### 📌 4. 자율 시스템 트레이 · Windows SCM 서비스 & 이벤트 기반 OS 알림 (`tray_engine.go`, `utils_windows.go`, `components/PreferencesTrayModal.tsx`)
* **동적 4색 ARGB 배지 트레이 아이콘 (`utils_windows.go`)**:
  - 상태(`standby` 회색 / `watching` 에메랄드 / `scanning` 호박색 / `alert` 적색)에 맞춰 32×32 ARGB 배지 `HICON`을 실시간 합성·전환하고 활성 호스트·침입·충돌·다음 스케줄 요약 툴팁과 우클릭 메뉴를 제공.
* **무창 부팅(`--tray`) · 10초 무인 자율 스윕 & Windows SCM 서비스(`--service`)**:
  - Windows 부팅 시 `--tray`로 창 없이 조용히 상주하며, 창이 닫힌 뒤에도 Go `tray_engine.go`가 10초 주기 자율 감시와 만기 스케줄 스캔을 계속 수행.
  - `advapi32.dll` `StartServiceCtrlDispatcherW` 네이티브 서비스 핸들러(`--service`)로 `GridIPScannerService` Error 1053을 방지하며, UI에서 서비스 설치/시작/중지 및 레거시 Windows 유틸리티(접이식 고급 영역)를 통합 제어.
* **스마트 이벤트 OS 알림 (중복 억제 · 방해금지 DND)**:
  - **신규 침입**, **IP/MAC 충돌**, **대량 호스트 오프라인 급감**(대수/% 임계치) 이벤트별 알림 규칙과 동일 키 쿨다운 중복 억제, 상시/30분 일시 해제/야간 조용한 시간(DND), 최근 이벤트 피드(최대 100건)를 제공.

### 📌 5. 비대칭 암호키 오프라인 라이선스 매니저, 낯선 기기 감시 & WoL Pro 게이트 (`components/LicenseModal.tsx`, `components/ProFeatureLockedModal.tsx`)
* **3단계 라이선스 티어**: Community(Free), Pro, Enterprise.
* **낯선 기기 감시(Intruder Watch) Pro 에디션 게이팅 (`App.tsx`, `services/licenseManager.ts`)**:
  - 상단 툴바 [낯선 기기 감시] 버튼에 `PRO` 뱃지가 적용되며, Pro 라이선스 인증 시에만 60초 주기 무인 백그라운드 자동 스캔 및 데스크톱/사운드 침입 경보가 가동.
  - Free 티어 사용자가 토글 시 Pro 라이선스 안내 팝업 및 인증 모달 자동 연계.
  - 침입 단말기 선택 시 Pro 업그레이드 가이드와 정상 단말 화이트리스트 등록 기능 연동.
* **원격 부팅(Wake-on-LAN) Pro 에디션 게이팅 (`App.tsx`, `services/wolService.ts`)**:
  - Free 커뮤니티 버전에서는 무단 부팅 패킷 발송을 방지하기 위해 라이선스 잠금 모달로 유도.
  - 정품 Pro 라이선스 또는 30일 체험권 입력 시 `PRO 활성` 뱃지와 함께 대상 장비 MAC으로 UDP 9/7 매직 패킷 브로드캐스트 즉각 해금.
* **완전한 오프라인 라이선스 인증 (`license_guard.go`, `services/licenseManager.ts`)**:
  - 인터넷이 없는 폐쇄망, 선박, 공장 자동화 환경에서도 Go 백엔드 SPKI Ed25519 비대칭 서명 검증(`GSCAN.<payload>.<sig>`)과 `AES-256-GCM` 하드웨어 봉인(`license.sealed.json`)으로 안전하게 기능을 해금.
* **30일 1회성 Pro 체험 라이선스 발급**:
  - 공식 체험 키(`GRID-PRO-TRIAL-2026`) 입력 시 활성화 일시 기준 **30일간의 Pro 사용권**(`expiresAt`)을 현재 하드웨어 지문에 1회 바인딩하여 부여 (재사용·시계 역행 차단, 서명 없는 레거시 키 차단).
  - 30일 동안 낯선 기기 감시(Intruder Watch), 원격 부팅(WoL), Diff 비교, 심층 포트 스캔, 정밀 보안 감사 리포트, 5개 서브넷 Batch Sweep 권한을 무제한 체험 가능.

### 📌 6. 모든 네트워크 어댑터 전수 탐색 및 다차원 필터 시스템 (`components/InterfaceExplorerModal.tsx`)
* Go 백엔드 `getAllInterfaces()` 및 `InterfaceInfo` 구조체:
  - 시스템 내 모든 물리(이더넷, Wi-Fi), 가상(WSLg, Hyper-V, VMware, Docker), VPN(Tailscale, WireGuard), 루프백 어댑터의 UP/DOWN 상태, IPv4/CIDR, IPv6, MAC, MTU, 게이트웨이 플래그 전수 수집.
* 프론트엔드 다차원 필터 탭 6종(`전체`, `활성 UP`, `물리`, `가상`, `VPN`, `IPv4 보유`) 및 실시간 텍스트 검색 지원.
* 전용 [네트워크 어댑터 관리자] 모달(`InterfaceExplorerModal.tsx`)에서 `[🎯 이 대역으로 스캔 설정]` 원클릭 서브넷 전환 연동.

### 📌 7. 반응형 2단 헤더 & 모바일 비잘림 레이아웃
* 데스크톱(`md:flex`)과 모바일(`md:hidden`) 헤더 아키텍처를 완전 분리하여 스마트폰 화면(360px~412px)에서도 상단 UI 가로 짤림 현상 0% 달성.
* 데스크톱 상단 헤더 복잡도를 축소해 스캔·보고서 센터·스케줄러·트레이/설정 핵심 진입점만 정돈 배치하고, 모바일 1~3단(액션 바, 검색/정렬, 실시간 진행률 바) 레이아웃 유지.

### 📌 8. GitHub Releases 기반 실시간 자동 업데이트 & 도움말 센터 (`components/HelpUpdateModal.tsx`, `components/UpdateModal.tsx`)
* **인앱 업데이트 센터 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**:
  - 앱 구동 시 GitHub Releases API를 백그라운드 조회하여 새 버전을 실시간 감지.
  - 사이드바 및 모바일 상단 바에 `[🚀 새 버전 업데이트]` 펄스 뱃지 활성화.
  - Windows 포터블(.exe), 인스톨러(Setup.exe), 안드로이드(APK) 원클릭 다운로드 제공.
* **콘솔 자동 업데이트 배치 (`scripts/auto-update.bat`)**:
  - 대화형 콘솔 메뉴를 통해 원클릭으로 최신 패키지를 다운로드.

### 📌 9. 스마트 엣지-투-엣지(Edge-to-Edge) 아이콘 자동 크롭 & PE 바이너리 패칭
* 원본 소스 이미지의 불필요한 투명 여백(184px)을 `pngjs` 알파 채널 경계 박스 자동 분석을 통해 완벽히 크롭.
* 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 등 6개 전체 규격 마스터 ICO 무손실 생성.
* `winres.json`에 최우선 순위 숫자 리소스 ID(`"#1"`) 및 `"APP"` 등록.
* `build-win.js`에서 `go-winres make` 및 `go build` 후 `go-winres patch --in winres.json`을 통한 2차 직접 PE 리소스 주입 파이프라인으로 Windows 탐색기/작업표시줄 아이콘 미노출 결함 완벽 해결.
* 인앱 사이드바, 모바일 헤더, 모달 로고를 여백 없이 꽉 찬 풀 블리드(Full-Bleed) 스타일로 리뉴얼.

### 📌 10. 5단계 스마트 적응형 런처 파이프라인
* 브라우저 환경을 자동 진단하여 최적 모드로 실행:
  - 1단계: `Microsoft Edge` 단독 앱 창 (`--app=http://localhost:3031`)
  - 2단계: `Google Chrome` 단독 앱 창 (구형 Win7/8.1 Chrome 109 호환)
  - 3단계: `Naver Whale` / `Brave Browser` 단독 앱 창
  - 4단계: 시스템 기본 브라우저 새 탭 실행
  - 5단계: 브라우저 부재 시 Windows 네이티브 대화상자(`user32.dll`) 출력

### 📌 11. 브라우저 부재 환경을 위한 네이티브 비상 스캔 & 메모장 보고서
* 브라우저가 전무한 환경에서도 64개 멀티스레드 워커가 C클래스 IP 대역을 고속 스캔하고 바탕화면에 `Grid_IP_Scan_Result.txt` 생성 후 윈도우 기본 메모장(`notepad.exe`) 자동 실행.

### 📌 12. 관리자 권한 재시작 프로세스 자동 정리 (Safe Relaunch Engine)
* UAC 권한 상승 시 기존 백엔드 프로세스뿐만 아니라 띄워져 있던 독립 앱 창(Edge 샌드박스 창)까지 충돌 없이 안전하게 자동 종료하고 관리자 모드 앱 하나만 새롭게 기동.

### 📌 13. IEEE 봇 차단 우회 및 이중 미러링 OUI 실시간 업데이트
* IEEE 서버의 봇 차단 정책(HTTP 418)을 표준 브라우저 User-Agent 헤더로 우회.
* Wireshark Automated Manuf(58,000+건) 1차 미러 및 IEEE MA-L/M/S 2차 미러를 연계한 이중 미러링 체계로 90,000건 이상의 하드웨어 제조사를 정밀 식별.

---

## 3. 세부 기술 문서 색인

* **[`docs/README.md`](./README.md)**: 전체 기술 문서 저장소 총괄 허브 (v2.6.0)
* **[`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](./GRID_TOPOLOGY_GUARD_DLL_SPEC.md)**: 순수 창작 `grid_topology_guard.dll` (`v2.6.1`) 명세 및 12대 DLL 감사·하드닝 보고서
* **[`docs/SCHEDULED_SCAN_SPEC.md`](./SCHEDULED_SCAN_SPEC.md)**: 정기 자동 네트워크 스캔 스케줄러 아키텍처 및 데이터 명세서
* **[`docs/SNAPSHOT_DIFF_SPEC.md`](./SNAPSHOT_DIFF_SPEC.md)**: 딥 스냅샷 비교 엔진 v2, 1:1 대조 스튜디오 및 잘림 방지 서브헤더 기술 명세서
* **[`docs/GOOGLE_BLOGGER_POST.md`](./GOOGLE_BLOGGER_POST.md)**: 구글 블로거 포스팅 가이드 (`[작성 모드 (서식 있는 텍스트)]`)
* **[`docs/GOOGLE_BLOGGER_POST.html`](./GOOGLE_BLOGGER_POST.html)**: 구글 블로거 포스팅 가이드 (`[HTML 편집 모드]`)
* **[`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md)**: SemVer 3단계 버전 관리 규정
* **[`docs/PATCH_NOTE.md`](./PATCH_NOTE.md)**: 최신 v2.6.0 릴리즈 및 패치 이력
* **[`docs/WorkLog.md`](./WorkLog.md)**: 일자별 기술 개발 및 아키텍처 개편 일지 (v2.6.0)
* **[`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md)**: 프로젝트 전체 디렉터리 및 컴포넌트 명세서 (v2.6.0)
* **[`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md)**: 깃허브 연동 및 GitHub Actions CI/CD 명세서 (v2.6.0)
* **[`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md)**: 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
* **[`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md)**: 포터블/인스톨러 배포 전략 및 유료화 사양서 (v2.6.0)
* **[`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md)**: 15대 핵심 독점 기술 및 고유 엔진 명세서
* **[`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md)**: OUI 계층형 매칭 및 이중 미러링 기술 명세서
* **[`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md)**: 보안 점검 및 암호화 검증 보고서 (v2.6.0)
* **[`docs/LICENSE.md`](./LICENSE.md)**: GPL v3 커뮤니티 에디션 및 상용 독점 이중 라이선스 계약서

---

## 4. Windows 실행 파일 속성 메타데이터 명세 (PE Header)

Windows 탐색기에서 `Grid IP Scanner2.exe` / `Grid_IP_Scanner2_v2.6.0_Setup.exe` 우클릭 후 `[속성] -> [자세히]` 탭 규격입니다:

| 항목 (Field) | 설정 값 (Value) |
| :--- | :--- |
| **파일 설명 (FileDescription)** | `Grid IP Scanner2` |
| **파일 버전 (FileVersion)** | `2.6.0.0` |
| **제품 이름 (ProductName)** | `Grid IP Scanner2` |
| **제품 버전 (ProductVersion)** | `2.6.0.0` |
| **저작권 (LegalCopyright)** | `Copyright (C) 2025-2026 AhBiYout. All rights reserved.` |
| **원본 파일 이름 (OriginalFilename)** | `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_Setup.exe` |
| **내부 이름 (InternalName)** | `GridIPScanner2` |
| **회사 / 개발자 (CompanyName)** | `AhBiYout` |
| **상표 (LegalTrademarks)** | `Grid IP Scanner2` |
| **설명 / 주석 (Comments)** | `Grid IP Scanner2 - Advanced Network Scanner with 12 Native DLLs, Packet Telemetry, 3-Tier Topology & Multi-Subnet VLAN` |
| **지원 언어 (Language)** | `한국어 (0412) / English (0409) / Neutral (0000)` |

---

## 5. 제작자 및 버전 정보

* **소프트웨어 버전**: v2.6.0 (2026-11-21 최신 반영)
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
* **제작자 (Author)**: AhBiYout
* **공식 GitHub**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 기술 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
