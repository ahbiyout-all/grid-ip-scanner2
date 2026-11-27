# Grid IP Scanner2
## 📋 기술 설명서 및 개발 백서 (Technical Documentation & Architecture Whitepaper)

본 문서는 **Grid IP Scanner2 (v2.7.0)**의 시스템 아키텍처, **가변 CIDR(`/20`–`/30`, 최대 4,094 호스트) 확장 스캔 · `/24` 블록 분할 & 고밀도 테이블 뷰(`DeviceTableView`)**, **단말별 접속·포트 변동 이력 타임라인 DB(`timeline_store.go` / `DeviceTimelineTab`)**, **Pure-Go SNMP v2c 스위치 포트 & L2 물리 연결 매핑(`snmp_l2.go` / RAM 전용 볼트)**, **다중 단말 일괄 WoL & 원격 제어 큐(`batch_queue.go` / `BatchQueueDrawer`)**, **앱 전체 UI·그리드·테이블 통합 글자 배율 조절(`85%~130%`, `TextScaleControl`)**, 16x16 시각화 그리드 맵, **3계층 인터랙티브 토폴로지 맵(`TopologyMapView`) & 보안 교차 분석**, **네이티브 패킷 정밀 텔레메트리(`grid_pcap_analyzer.dll v2.6.2`)**, **다중 서브넷·VLAN 통합 대시보드(`MultiSubnetBar` / `MultiSubnetModal` / Batch Sweep)**, **Free 16×16 엑셀 그리드(.xls) & Pro 전체 보고서(5시트) 엑셀 통합문서 + Quick Connect 빠른 연결 모달**, **OUI 시맨틱 다중 신호 기기 분류 & LAA 랜덤 MAC 역추적**, **게이트웨이/인프라 Proxy-ARP 비알림 분리**, **순수 창작 `grid_topology_guard.dll`(`v2.6.1`) 포함 12대 C/C++ 네이티브 DLL 엔진**, **Go 자율 트레이 엔진(`tray_engine.go`)·동적 4색 배지 `HICON`·Windows SCM 네이티브 서비스(`--service`)·조용한 부팅(`--tray`)·이벤트 기반 OS 알림 고도화**, **통합 보고서 센터(`ReportCenterModal`) 및 A4 PDF 보고서 엔진**, 정기 자동 네트워크 스캔 스케줄러, 딥 스냅샷 비교(Diff v2) 1:1 대조 스튜디오, Inno Setup 6 윈도우 인스톨러 툴체인 및 안드로이드 APK 배포 체계를 체계적으로 기술한 공식 제품 가이드입니다.

---

## 1. 프로젝트 개요 및 아키텍처

**Grid IP Scanner2**는 로컬 네트워크 대역(`/30`~`/20` 가변 CIDR 및 다중 서브넷/VLAN)의 모든 IP 주소를 실시간으로 고속 탐색하여 시각적 **16x16 그리드 맵**, **고밀도 테이블 뷰**, **3계층 인터랙티브 토폴로지 맵**으로 한눈에 파악할 수 있도록 설계된 고성능 올인원 네트워크 엔지니어링 및 보안 감사 도구입니다.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                  Grid IP Scanner2 System Flow (v2.7.0)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  React 19 / Electron Frontend   │     │  Go + 12 Native C/C++ DLL Core  │
│  - Grid / Table / Topology/Diff │◄────┤  - cidr_engine (/20~/30 Plan)   │
│  - CidrBlockBar & TimelineTab   │ SSE │  - timeline_store & snmp_l2(RAM)│
│  - SnmpSwitchModal & BatchQueue │     │  - batch_queue & /packet-inspect│
│  - TextScaleControl (85%~130%)  │────►│  - tray_engine.go & SCM Service │
│  - ReportCenter & QuickConnect  │ API │  - grid_topology_guard.dll v2.6 │
│  - Ed25519 Offline Licensing    │     │  - Async ICMP Batch + IOCP Port │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons를 사용하여 현대적인 반응형 UI를 제공합니다. 가변 CIDR `/24` 블록 전환 바(`CidrBlockBar.tsx`), 고밀도 테이블 뷰(`DeviceTableView.tsx`), 단말 이력 타임라인 탭(`DeviceTimelineTab.tsx`), SNMP L2 스위치 설정 모달(`SnmpSwitchConfigModal.tsx`), 다중 단말 일괄 제어 큐 드로어(`BatchQueueDrawer.tsx`), 빠른 연결 모달(`QuickConnectModal.tsx`), 통합 글자 배율 컨트롤(`TextScaleControl.tsx`), 3계층 인터랙티브 토폴로지 맵(`TopologyMapView.tsx`, `topologyGraphBuilder.ts`), 다중 서브넷/VLAN 바·통합 대시보드(`MultiSubnetBar.tsx`, `MultiSubnetModal.tsx`), OUI 시맨틱 분류(`ouiClassifier.ts`), Proxy-ARP 비알림 분리(`conflictDetector.ts`, `IPCell.tsx`), 통합 보고서 센터(`ReportCenterModal.tsx`), 트레이/알림 정책 모달(`PreferencesTrayModal.tsx`), 5초 Ticker 스케줄러(`schedulerService.ts`), 1:1 대조 스튜디오(`SnapshotDiffModal.tsx`)가 모듈화되어 탑재되어 있습니다.
* **Backend, Autonomous Tray Engine & 12 Native C/C++ DLL Suite**: Go 가변 CIDR 계획/청킹 엔진(`cidr_engine.go`), 시계열 타임라인 저장소(`timeline_store.go`, `timeline_events.jsonl`), Pure-Go SNMP v2c L2 매핑 + RAM 전용 볼트(`snmp_l2.go`), 일괄 원격 제어 비동기 큐(`batch_queue.go`), 병렬 탐색·패킷 프로파일링(`/api/packet-inspect`)·토폴로지 그래프(`/api/topology-map`)·다중 NIC/VLAN 탐색(`/api/subnets/discover`)·자율 트레이 엔진(`tray_engine.go`, `utils_windows.go`)과 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`) 12대 C/C++ 네이티브 DLL(`grid_pcap_analyzer.dll v2.6.2`, `grid_topology_guard.dll v2.6.1`, `grid_probe_engine.dll`, `grid_port_iocp.dll`, `grid_vault_driver.dll`, `secure_vault.dll` 등)이 결합해 대규모 대역 감사, L2 매핑, 무인 감시, 동적 배지 트레이, Windows SCM 서비스(`--service`), IOCP/Async ICMP 배치 스위프 및 `GVAULT11` PBKDF2+AES-256-GCM 암복호화를 수행합니다.
* **Adaptive 5-Tier Launcher, Silent Boot (`--tray`) & Close-to-Tray**: 최신 Windows 11/10 Edge 앱 모드부터 `--tray` 무창 트레이 부팅, 창 닫기 후 Go 10초 자율 스윕 전환, 레거시 OS 대응 트레이 서브메뉴, 심각도별 Win32 풍선 알림(`NIIF_ERROR`/`WARNING`/`INFO`), 네이티브 비상 스캔 모드(`notepad.exe`)까지 5단계 자동 폴백을 지원합니다.
* **Dual Distribution (Portable & Installer & Mobile)**: 단일 무설치 포터블(`.exe`), 12대 DLL 분리 배치형 Inno Setup 6 정식 인스톨러(`Grid_IP_Scanner2_v2.7.0_Setup.exe`), 안드로이드 APK(`Grid_IP_Scanner2_v2.7.0.apk`) 및 PWA 패키지를 제공합니다.

---

## 2. 주요 핵심 기능

### 📌 1. 가변 CIDR (`/20`–`/30`), 고밀도 테이블 뷰 · 3계층 토폴로지 · 타임라인 DB · SNMP L2 · 일괄 큐
* **가변 CIDR 대역 확장 & 분할 블록 뷰 (`cidr_engine.go`, `services/cidrUtils.ts`, `components/CidrBlockBar.tsx`)**:
  - 기존 `/24` 고정을 넘어 `/30`~`/20`(최대 4,094 호스트) 가변 CIDR 입력을 정규화 및 `/24` 세그먼트 청크로 자동 계획·스캔하며, 상단 `CidrBlockBar`에서 `전체` 또는 `256` 호스트 블록별 탭(활성 대수 실시간 표시)을 즉시 전환합니다 (Free 최대 `/23` 510호스트, Pro `/22` 1,022호스트, Enterprise `/21`–`/20` 4,094호스트).
* **고밀도 정렬 테이블 뷰 (`components/DeviceTableView.tsx`)**:
  - `Grid` | `Table` | `Topology Map` | `Snapshot Diff` 4종 워크스페이스로 확장되어 IP·호스트명·제조사·RTT·스위치 포트·위험도 컬럼 정렬, 빠른 필터 및 일괄 선택 체크박스를 제공합니다.
* **단말별 접속·포트 변동 이력 타임라인 DB (`timeline_store.go`, `components/DeviceTimelineTab.tsx`)**:
  - 스캔 완료마다 `timeline_events.jsonl`에 `FIRST_SEEN`, `ONLINE`, `OFFLINE`, `IP_CHANGED`, `PORT_OPENED`, `PORT_CLOSED`, `VENDOR_OR_HOST_UPDATED`, `SWITCH_PORT_MOVED` 8종 시계열 이벤트를 기록하고 장치 프로필 `[이력 타임라인]` 탭 및 CSV 감사 내보내기를 지원합니다 (Free 24시간/50건, Pro 30일, Enterprise 무제한).
* **SNMP v2c 스위치 포트 & L2 물리 연결 매핑 (`snmp_l2.go`, `components/SnmpSwitchConfigModal.tsx`)**:
  - Pure-Go ASN.1 BER `IF-MIB`/`BRIDGE-MIB`/`Q-BRIDGE-MIB`/`LLDP-MIB` 탐색과 디스크·`localStorage`에 절대 기록되지 않는 **RAM 전용 자격증명 볼트**를 통해 단말이 연결된 스위치 포트·VLAN을 자동 매핑하고 토폴로지 L2 노드/링크 및 테이블·보고서에 표시합니다 (Pro 최대 2대 / Enterprise 무제한).
* **다중 단말 일괄 WoL & 원격 제어 큐 (`batch_queue.go`, `components/BatchQueueDrawer.tsx`)**:
  - 그리드 `Ctrl/Cmd+Click` 또는 테이블 체크박스로 복수 단말을 선택해 일괄 WoL, 일괄 Ping, 일괄 원격 포트 점검을 비동기 워커 큐(동시성 1–4, 지연 100–2000ms, 중단/재시도 지원)로 실행합니다 (Pro 16대 / Enterprise 무제한).
* **3계층 인터랙티브 토폴로지 맵 (`components/TopologyMapView.tsx`, `services/topologyGraphBuilder.ts`, `POST /api/topology-map`)**:
  - 게이트웨이/코어 라우터(Tier 0) ➔ L2 스위치·인프라·Proxy-ARP·보안 그룹(Tier 1) ➔ 개별 단말(Tier 2) 계층을 SVG 줌/팬으로 탐색하며, `grid_topology_guard.dll` 연계를 통한 **Pro 보안 교차 분석(Topology Security Correlation)** 오버레이를 지원합니다.
* **네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`, `GET/POST /api/packet-inspect`)**:
  - 장치 상세 프로필 패널에서 원클릭으로 **TTL/초기 TTL/추정 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), TCP Window 힌트, OS 추정(신뢰도) 및 Live ARP MAC 정합성**을 실시간 프로파일링합니다.
* **온디맨드 다중 서브넷 및 VLAN 통합 대시보드 (`MultiSubnetBar.tsx`, `MultiSubnetModal.tsx`, `multiSubnetManager.ts`, `GET /api/subnets/discover`)**:
  - 일반 단일 대역 사용 시에는 숨김 상태를 유지하다 상단 **`다중 서브넷·VLAN`**(`VLAN`) 버튼 클릭 시(또는 일괄 스윕 가동 시) 화면에 펼쳐지며, **활성 프로필 VLAN Tag ID 비주얼 인디케이터(`활성 태그` 배지 + 프로파일별 색상 구분 태그 마커)**, 로컬 NIC/VLAN CIDR 자동 탐색 및 대역별 독립 스캔 결과 캐싱, Free 최대 2개 대역 전환 및 **Pro(5대역)/Enterprise(무제한) 순차 일괄 스윕(Batch Sweep)·교차 서브넷 이상 징후 통합 관제**를 제공합니다.
* **스냅샷 Diff 4색 상태 구분 체계 (`services/diffEngine.ts`, `components/IPCell.tsx`, `components/SnapshotDiffModal.tsx`)**:
  - 현재 스캔 결과와 과거 스냅샷 기준점을 대조하여 🟢 신규 접속(`+NEW`), 🔴 이탈/오프라인(`-OFF`), 🟠 식별자 변동(`!CHG`), 🔵 기준점 유지(`=SAME`/`=BASE`) 4색 컬러와 1:1 Side-by-Side 대조 스튜디오를 제공합니다.

### 📌 2. 정기 자동 네트워크 스캔 스케줄러 (`services/schedulerService.ts`, `components/ScheduleModal.tsx`)
* **주기적 무인 자동 스캔**:
  - 15분, 30분, 1시간, 2시간, 6시간, 12시간, 매일/매주 등 주기별 자동 스캔 및 자동 내보내기(`autoExportEnabled`, `autoReportIds`) 지원.
  - 5초 Ticker 백그라운드 타이머, 수동 스캔 시 중복 실행 방지 비지 락(Busy Lock), 트레이/UI 양방향 **일시정지·재개 및 즉시 실행(`run_schedule_now`)** 지원.
* **스냅샷 자동 아카이빙 (`[Auto-Sched]`) & 실시간 카운트다운 헤더 배지**:
  - 스케줄 완료 시 자동으로 시점별 스냅샷을 최대 25개까지 보관하고 메인 헤더에 다음 스캔까지 남은 시간을 실시간 표시합니다.

### 📌 3. 통합 보고서 센터 · Free 16×16 엑셀 그리드 & Pro 5시트 전체 보고서 + A4 스마트 PDF 엔진
* **통합 보고서 센터 모달 (`components/ReportCenterModal.tsx`, `services/reportCenterService.ts`)**:
  - **티어별 Excel XML(`.xls`) 생성**: **Free 티어**에서는 **16×16 바둑판 IP 그리드 시트(`Grid_16x16`)만** 생성·다운로드하며, **Pro / Enterprise 티어**에서는 **요약(`1_Summary`)·16×16 그리드(`2_Grid_16x16`)·장비 인벤토리(`3_Device_Inventory`)·보안 감사(`4_Security_Audit`)·스냅샷 Diff(`5_Snapshot_Diff`) 전체 보고서 엑셀 통합문서**를 생성합니다.
  - 일반 PDF·CSV·JSON·Markdown 내보내기 및 Pro+ 보안 감사 PDF·인쇄/그리드 HTML·스냅샷 비교를 전용 모달로 일원화.
* **25개 주요 서비스 포트 정밀 진단 & 빠른 연결 모달 (`services/portScanner.ts`, `components/QuickConnectModal.tsx`)**:
  - FTP(21), SSH(22), Telnet(23), SMTP(25), DNS(53), HTTP(80), SMB(445), RTSP(554), IPP(631), MSSQL(1433), MQTT(1883), MySQL(3306), RDP(3389), PostgreSQL(5432), VNC(5900), Redis(6379), JetDirect(9100) 등 주요 포트 위험도(`HIGH`/`MEDIUM`/`SAFE`) 분류 및 Listening Ports 클릭 시 프로토콜 아이콘·URI 복사·원격 실행을 제안하는 **Quick Connect 모달** 제공.
* **A4 규격 스마트 페이지네이션 PDF 엔진 (`services/reportGenerator.ts`)**:
  - **Zero Row-Chopping**: 794px x 1123px (A4 1:1.4142)의 독립 페이지 단위 사전 분할, 11mm 프린터 안전 여백 및 동적 `페이지 X / Y` 푸터를 제공합니다.

### 📌 4. 자율 시스템 트레이 · Windows SCM 서비스 & 이벤트 기반 OS 알림 (`tray_engine.go`, `utils_windows.go`, `components/PreferencesTrayModal.tsx`)
* **동적 4색 ARGB 배지 트레이 아이콘 (`utils_windows.go`)**:
  - 상태(`standby` 회색 / `watching` 에메랄드 / `scanning` 호박색 / `alert` 적색)에 맞춰 32×32 ARGB 배지 `HICON`을 실시간 합성·전환하고 활성 호스트·침입·충돌·다음 스케줄 요약 툴팁과 우클릭 메뉴를 제공.
* **무창 부팅(`--tray`) · 10초 무인 자율 스윕 & Windows SCM 서비스(`--service`)**:
  - Windows 부팅 시 `--tray`로 창 없이 조용히 상주하며, `advapi32.dll` `StartServiceCtrlDispatcherW` 네이티브 서비스 핸들러(`--service`)로 `GridIPScannerService` Error 1053을 방지하고 UI에서 서비스 설치/시작/중지를 통합 제어.
* **스마트 이벤트 OS 알림 (중복 억제 · 방해금지 DND)**:
  - **신규 침입**, **IP/MAC 충돌**, **대량 호스트 오프라인 급감**(대수/% 임계치) 이벤트별 알림 규칙과 동일 키 쿨다운 중복 억제, 상시/30분 일시 해제/야간 조용한 시간(DND), 최근 이벤트 피드(최대 100건)를 제공.

### 📌 5. 비대칭 암호키 오프라인 라이선스 매니저, 낯선 기기 감시 & WoL Pro 게이트 (`components/LicenseModal.tsx`, `components/ProFeatureLockedModal.tsx`)
* **3단계 라이선스 티어**: Community(Free), Pro, Enterprise.
* **낯선 기기 감시(Intruder Watch) & 원격 부팅(WoL / Batch Queue) Pro 에디션 게이팅 (`App.tsx`, `services/licenseManager.ts`, `license_guard.go`)**:
  - Pro 라이선스 인증 시 60초 주기 무인 백그라운드 침입 감시, 단일/일괄 Wake-on-LAN(UDP 9/7), 가변 CIDR `/22`, 30일 타임라인 DB, SNMP L2 스위치 매핑(2대), 5시트 전체 보고서 엑셀, 5개 서브넷 Batch Sweep이 해금됩니다.
* **완전한 오프라인 라이선스 인증 & 30일 1회성 체험권 (`GRID-PRO-TRIAL-2026`)**:
  - 인터넷 없는 폐쇄망에서도 SPKI Ed25519 비대칭 서명 검증(`GSCAN.<payload>.<sig>`)과 `AES-256-GCM` 하드웨어 봉인(`license.sealed.json`)으로 안전하게 기능을 해금하며, 공식 체험 키(`GRID-PRO-TRIAL-2026`) 입력 시 1회 하드웨어 바인딩 30일 Pro 체험권을 발급합니다.

### 📌 6. 모든 네트워크 어댑터 전수 탐색 및 다차원 필터 시스템 (`components/InterfaceExplorerModal.tsx`)
* Go 백엔드 `getAllInterfaces()` 및 `InterfaceInfo` 구조체를 통해 물리·가상(WSLg/Hyper-V/Docker)·VPN(Tailscale/WireGuard)·루프백 어댑터 상태를 수집하고, 6종 필터 탭 및 `[🎯 이 대역으로 스캔 설정]` 원클릭 전환을 제공합니다.

### 📌 7. 앱 전체 UI·그리드·테이블 통합 글자 배율 조절 & 반응형 2단 헤더 (`components/TextScaleControl.tsx`)
* **통합 글자 확대·축소 (`85%~130%`, 5% 단위 · `100%` 초기화)**:
  - 데스크톱 메인 툴바, 모바일 상단 헤더 1행, 장치 상세 프로필 패널 상단에 양방향 동기화된 `[ - | 100% | + ]` 컨트롤을 배치하고 `Ctrl/Cmd + +/-/0` 키보드 단축키를 지원합니다.
  - 루트 CSS 변수(`--ui-text-scale`) 및 `.grid-cell-octet` 스케일링으로 헤더·사이드바·모달·16×16 그리드·고밀도 테이블·프로필 패널 전체 가독성을 일관 조절하며, A4 보고서 미리보기·인쇄(`@media print`)·SVG 토폴로지(`.ui-scale-reset`)는 원본 정밀 규격으로 격리 보호합니다.
* **반응형 2단 헤더 & 모바일 비잘림 레이아웃**:
  - 데스크톱(`md:flex`)과 모바일(`md:hidden`) 헤더 아키텍처를 분리해 스마트폰 화면(360px~412px)에서도 가로 짤림 없는 조작성과 통합 배율 제어를 제공합니다.

### 📌 8. GitHub Releases 기반 실시간 자동 업데이트 & 도움말 센터 (`components/HelpUpdateModal.tsx`, `components/UpdateModal.tsx`)
* 앱 구동 시 GitHub Releases API(`api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest`)를 백그라운드 조회해 Windows 포터블/인스톨러/Android APK 원클릭 다운로드 및 `scripts/auto-update.bat`를 제공합니다.

### 📌 9. 스마트 엣지-투-엣지(Edge-to-Edge) 아이콘 자동 크롭 & PE 바이너리 패칭
* `pngjs` 알파 경계 박스 자동 크롭으로 6규격(16~256px) 무손실 ICO를 생성하고, `build-win.js`에서 `go-winres make` 및 `go-winres patch --in winres.json` 2차 직접 PE 주입으로 탐색기/작업표시줄 아이콘을 선명하게 표출합니다.

### 📌 10. 5단계 스마트 적응형 런처 파이프라인 & 네이티브 비상 스캔
* Edge 앱 창 ➔ Chrome 앱 창 ➔ Whale/Brave 앱 창 ➔ 기본 브라우저 ➔ Win32 대화상자(`user32.dll`) 순으로 자동 진단 기동하며, 브라우저 부재 환경에서는 64-워커 비상 스캔 후 `Grid_IP_Scan_Result.txt`를 메모장(`notepad.exe`)으로 자동 출력합니다.

### 📌 11. 관리자 권한 재시작 프로세스 자동 정리 (Safe Relaunch Engine)
* UAC 권한 상승 시 기존 백엔드와 5종 Chromium 독립 앱 창(`Edge`/`Chrome`/`Whale`/`Brave`/`Vivaldi`)을 안전 정리 후 관리자 모드 단일 인스턴스만 재기동합니다.

### 📌 12. IEEE 봇 차단 우회 및 이중 미러링 OUI 실시간 업데이트
* Wireshark Automated Manuf(58,000+건) 및 IEEE MA-L/M/S 2차 미러를 연계해 90,000건 이상의 제조사를 정밀 식별하고 OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 분류 및 LAA 랜덤 MAC 역추적을 수행합니다.

---

## 3. 세부 기술 문서 색인

* **[`docs/README.md`](./README.md)**: 전체 기술 문서 저장소 총괄 허브 (v2.7.0)
* **[`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](./GRID_TOPOLOGY_GUARD_DLL_SPEC.md)**: 순수 창작 `grid_topology_guard.dll` (`v2.6.1`) 명세 및 12대 DLL 감사·하드닝 보고서
* **[`docs/SCHEDULED_SCAN_SPEC.md`](./SCHEDULED_SCAN_SPEC.md)**: 정기 자동 네트워크 스캔 스케줄러 아키텍처 및 데이터 명세서
* **[`docs/SNAPSHOT_DIFF_SPEC.md`](./SNAPSHOT_DIFF_SPEC.md)**: 딥 스냅샷 비교 엔진 v2, 1:1 대조 스튜디오 및 잘림 방지 서브헤더 기술 명세서
* **[`docs/GOOGLE_BLOGGER_POST.md`](./GOOGLE_BLOGGER_POST.md)**: 구글 블로거 포스팅 가이드 (`[작성 모드 (서식 있는 텍스트)]`, v2.7.0)
* **[`docs/GOOGLE_BLOGGER_POST.html`](./GOOGLE_BLOGGER_POST.html)**: 구글 블로거 포스팅 가이드 (`[HTML 편집 모드]`, v2.7.0)
* **[`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md)**: SemVer 3단계 버전 관리 규정
* **[`docs/PATCH_NOTE.md`](./PATCH_NOTE.md)**: 최신 v2.7.0 릴리즈 및 패치 이력
* **[`docs/WorkLog.md`](./WorkLog.md)**: 일자별 기술 개발 및 아키텍처 개편 일지 (v2.7.0)
* **[`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md)**: 프로젝트 전체 디렉터리 및 컴포넌트 명세서 (v2.7.0)
* **[`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md)**: 깃허브 연동 및 GitHub Actions CI/CD 명세서 (v2.7.0)
* **[`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md)**: 모바일 APK 및 PWA 단일 리포지토리 배포 가이드 (v2.7.0)
* **[`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md)**: 포터블/인스톨러 배포 전략 및 유료화 사양서 (v2.7.0)
* **[`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md)**: 15대 핵심 독점 기술 및 고유 엔진 명세서
* **[`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md)**: OUI 계층형 매칭 및 이중 미러링 기술 명세서
* **[`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md)**: 보안 점검 및 암호화 검증 보고서
* **[`docs/LICENSE.md`](./LICENSE.md)**: GPL v3 커뮤니티 에디션 및 상용 독점 이중 라이선스 계약서

---

## 4. Windows 실행 파일 속성 메타데이터 명세 (PE Header)

Windows 탐색기에서 `Grid IP Scanner2.exe` / `Grid_IP_Scanner2_v2.7.0_Setup.exe` 우클릭 후 `[속성] -> [자세히]` 탭 규격입니다:

| 항목 (Field) | 설정 값 (Value) |
| :--- | :--- |
| **파일 설명 (FileDescription)** | `Grid IP Scanner2` |
| **파일 버전 (FileVersion)** | `2.7.0.0` |
| **제품 이름 (ProductName)** | `Grid IP Scanner2` |
| **제품 버전 (ProductVersion)** | `2.7.0.0` |
| **저작권 (LegalCopyright)** | `Copyright (C) 2025-2026 AhBiYout. All rights reserved.` |
| **원본 파일 이름 (OriginalFilename)** | `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_Setup.exe` |
| **내부 이름 (InternalName)** | `GridIPScanner2` |
| **회사 / 개발자 (CompanyName)** | `AhBiYout` |
| **상표 (LegalTrademarks)** | `Grid IP Scanner2` |
| **설명 / 주석 (Comments)** | `Grid IP Scanner2 - Variable CIDR (/20-/30), Timeline DB, SNMP L2 Mapping, Batch Queue, 12 Native DLLs & Unified Scaling` |
| **지원 언어 (Language)** | `한국어 (0412) / English (0409) / Neutral (0000)` |

---

## 5. 제작자 및 버전 정보

* **소프트웨어 버전**: v2.7.0 (2026-11-26 최신 반영)
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
* **제작자 (Author)**: AhBiYout
* **공식 GitHub**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 기술 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
