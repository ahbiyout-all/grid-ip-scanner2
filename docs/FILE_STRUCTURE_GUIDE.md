# Grid IP Scanner2 파일 및 디렉토리 구조 명세서 (File Structure & Component Specifications)

본 문서는 **Grid IP Scanner2 (v2.6.0)** 프로젝트를 구성하는 모든 디렉토리와 파일의 역할, 세부 동작 원리, 상호 작용 관계 및 상용 빌드 프로세스에서의 사용처를 일목요연하게 정리한 공식 기술 구조 가이드입니다.

---

## 📂 1. 전체 디렉토리 요약 구조 (Directory Tree)

```text
Grid IP Scanner2 Root/
│
├── 📂 .github/                     # GitHub 자동화 및 워크플로우 폴더
│   └── 📂 workflows/
│       ├── build-and-release.yml   # GitHub Actions CI/CD (Windows .exe/인스톨러, Android APK, 모바일 PWA)
│       └── mobile-release.yml      # 모바일 전용 독립 릴리스 워크플로우
│
├── 📂 components/                  # React 개별 컴포넌트 폴더 (16개 모달·뷰·셀)
│   ├── HelpUpdateModal.tsx         # 도움말, 버전 정보 및 업데이트 확인 통합 모달
│   ├── IPCell.tsx                  # 16x16 그리드 개별 IP 상태, Diff 뱃지, Proxy-ARP 인디케이터 뱃지 컴포넌트
│   ├── InterfaceExplorerModal.tsx  # 전체 물리/가상/VPN 네트워크 어댑터 탐색 및 서브넷 원클릭 전환 모달
│   ├── IntruderLogModal.tsx        # 24/7 무인 백그라운드 서비스 침입 탐지 이력 조회 및 화이트리스트 모달
│   ├── LicenseModal.tsx            # Community/Pro/Enterprise 라이선스 상태 조회·활성화·해제 모달
│   ├── MultiSubnetBar.tsx          # [v2.6.0] 온디맨드 다중 서브넷/VLAN 전환 바, 활성 VLAN Tag ID 인디케이터 & 순차 Batch Sweep 컨트롤
│   ├── MultiSubnetModal.tsx        # [v2.6.0] NIC/VLAN 자동 탐색·커스텀 등록·교차 대역 이상 징후 통합 대시보드 모달
│   ├── NativeModulesModal.tsx      # 12대 C/C++ 네이티브 DLL 엔진 아코디언 진단 콘솔 (pcap v2.6.2 테스트 포함)
│   ├── PreferencesTrayModal.tsx    # 환경설정, 자율 트레이 요약, 스케줄러 제어, DND/이벤트 알림 정책, 접이식 OS 도구 모달
│   ├── ProFeatureLockedModal.tsx   # PRO/Enterprise 전용 기능 안내 모달 (Free 전환된 5시트 Excel 제외)
│   ├── ReportCenterModal.tsx       # Free 5시트 Excel Grid(.xls)·CSV·JSON·Markdown & Pro PDF·HTML 통합 내보내기 모달
│   ├── ScheduleModal.tsx           # 정기 자동 네트워크 스캔 스케줄 관리 및 실행 이력 모달
│   ├── SnapshotDiffModal.tsx       # 1:1 Side-by-Side 딥 스냅샷 비교 스튜디오 모달
│   ├── TopologyMapView.tsx         # [v2.6.0] 3계층 인터랙티브 토폴로지 SVG 맵 & Security Correlation 뷰
│   ├── TrayStatusIndicator.tsx     # 트레이 실시간 스캔 진척도 및 침입 경보 타임스탬프 보조 인디케이터
│   └── UpdateModal.tsx             # GitHub Releases 실시간 업데이트 센터 안내 및 다운로드 모달
│
├── 📂 services/                    # 비즈니스 로직 및 코어 엔진 서비스 폴더
│   ├── apiConfig.ts                # 백엔드 API 베이스 URL 및 safeTimeout 타임아웃 가드 유틸리티
│   ├── clipboard.ts                # Clipboard API + 레거시 Fallback 클립보드 복사 유틸리티
│   ├── conflictDetector.ts         # IP/MAC 충돌 탐지, Gateway Proxy-ARP 비알림 분리 및 Soft Trust 알고리즘
│   ├── deviceAliasManager.ts       # 사용자 장치 별칭 및 메모 관리
│   ├── diffEngine.ts               # 스냅샷 A/B 딥 비교 엔진, 고위험 포트 탐지, IP 충돌 분석
│   ├── intruderLogService.ts       # 24/7 침입 탐지 이력 저장/필터/CSV 내보내기 서비스
│   ├── licenseManager.ts           # Community/Pro/Enterprise 비대칭 암호키 오프라인/임대 라이선스 매니저 (Free 2 서브넷 / .xls)
│   ├── multiSubnetManager.ts       # [v2.6.0] 다중 서브넷/VLAN 프로필, 대역별 독립 결과 캐시 & 교차 대역 KPI 집계 서비스
│   ├── nativeModulesService.ts     # 네이티브 DLL 진단, 토폴로지 맵/가드, 패킷 텔레메트리, 서브넷 탐색 및 트레이 API 클라이언트
│   ├── ouiClassifier.ts            # OUI + 포트/mDNS/UPnP 다중 신호 시맨틱 분류 및 LAA 랜덤 MAC 역추적
│   ├── portScanner.ts              # 25개 주요 포트 정밀 보안 검사 및 위험도 분류 모듈
│   ├── remoteActionService.ts      # 원격 진단 및 제어 액션 서비스
│   ├── reportCenterService.ts      # 다중 포맷 보고서(Free 5시트 Excel Grid XML/CSV/JSON/Markdown/HTML) 생성·보관 서비스
│   ├── reportGenerator.ts          # A4 최적화 스마트 페이지네이션 PDF/HTML(칩셋 OUI & 실제 제조사 분리) 엔진
│   ├── schedulerService.ts         # 5초 Ticker 기반 정기 스케줄러, 남은 시간 카운트다운, 스냅샷 자동저장
│   ├── topologyGraphBuilder.ts     # [v2.6.0] 3계층 토폴로지 노드·엣지·보안 상관분석 빌더
│   ├── updateChecker.ts            # GitHub Releases API 조회 및 버전 비교 실시간 업데이트 체커 (v2.6.0)
│   └── wolService.ts               # Wake-on-LAN (UDP 9/7 매직 패킷) 원격 부팅 서비스
│
├── 📂 native_dll/                  # 순수 C99 / C++17 12대 네이티브 가속 DLL 엔진 소스
│   ├── grid_topology_guard.c/.h    # 순수 창작 O(N) 서브넷 토폴로지 해시 & Proxy-ARP/LAA 분리 (v2.6.1)
│   ├── grid_probe_engine.c/.h      # 벡터화 비동기 ICMP 배치 스위프 (`Probe_SweepCidrAsyncBatch`, v2.6.0)
│   ├── grid_port_iocp.c/.h         # Win32 IOCP+ConnectEx 다중 호스트 포트 스위프 (`PortScan_IocpMultiHostSweep`)
│   ├── grid_discovery.c/.h         # 네이티브 SSDP / mDNS 라벨 파싱 & 다중 프로토콜 탐색 엔진
│   ├── grid_oui_trie.c/.h          # Bitwise OUI CIDR(/24, /28, /36) 고속 트라이 탐색 엔진
│   ├── grid_banner_grabber.c/.h    # 비파괴 다중 recv HTTP/서비스 배너 추출 엔진
│   ├── grid_pcap_analyzer.c/.h     # Npcap + `Pcap_InspectPacketProfileJson` 패킷 텔레메트리·OS TTL·Live ARP 검증 (`v2.6.2`)
│   ├── grid_fingerprint_engine.c/.h# AI 휴리스틱 기기 지문 분석 & 리스크 점수 산출 엔진
│   ├── grid_net_driver.c/.h/.go    # 코어 네이티브 소켓 드라이버 및 Go FFI 바인딩
│   ├── grid_vault_driver.c/.h/.go  # `GVAULT11` PBKDF2-HMAC-SHA256 스택 고속 경로 보안 볼트 C 드라이버
│   ├── oui_validator.cpp/.h        # Wireshark/IEEE `manuf` 무결성 & CIDR 충돌 검증기
│   ├── secure_vault.cpp/.h         # C++17 AES-256-GCM 네이티브 암호화 엔진 (`v2.6.0`)
│   └── build_all_dlls.bat          # MSYS2 GCC 16.1.0 정적 링크(`-static-libgcc -static-libstdc++`) 전수 빌드 스크립트
│
├── 📂 docs/                        # 시스템 및 프로그램 공식 기술 문서 허브 (2026-11-20 v2.6.0 최신화)
│   ├── README.md                   # 문서 저장소 총괄 가이드 및 색인 목차
│   ├── GOOGLE_BLOGGER_POST.md      # 구글 블로거 포스팅 가이드 ([작성 모드 (서식 있는 텍스트)])
│   ├── GOOGLE_BLOGGER_POST.html    # 구글 블로거 포스팅 가이드 ([HTML 편집 모드] 전용 소스)
│   ├── GITHUB_GUIDE.md             # 깃허브 연동, .gitignore 규칙 및 CI/CD 자동 배포 가이드
│   ├── GRID_TOPOLOGY_GUARD_DLL_SPEC.md # 순수 창작 DLL 명세 및 12대 DLL 감사·하드닝 보고서
│   ├── SCHEDULED_SCAN_SPEC.md      # 정기 자동 스캔 스케줄러, 일시정지 및 트레이 연동 명세서
│   ├── SNAPSHOT_DIFF_SPEC.md       # 딥 스냅샷 비교 엔진 v2 및 1:1 대조 스튜디오 명세서
│   ├── MOBILE_GITHUB_GUIDE.md      # 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
│   ├── WorkLog.md                  # 개발 및 기능 구현 공식 작업 일지
│   ├── VERSIONING_POLICY.md        # SemVer 3단계 버전 관리 규정 및 SSOT 10대 타깃 동기화 지침
│   ├── PATCH_NOTE.md               # 기능 추가 및 패치 이력 (2026-11-21 v2.6.0 감사·최신화)
│   ├── GRID_IP_SCANNER_2.md        # 서비스 개요 및 제품 설명서 백서
│   ├── SECURITY_REPORT.md          # 보안 점검 및 암호화 검증 보고서
│   ├── FILE_STRUCTURE_GUIDE.md     # [본 문서] 파일 구조 및 디렉토리 상세 명세서
│   └── LICENSE.md                  # 프로그램 이중 라이선스 및 준수 명세 계약서
│
├── 📂 installer/                   # Windows 정식 인스톨러 패키징 툴체인
│   ├── Grid_IP_Scanner2_Dedicated_Setup.iss # Inno Setup 6 인스톨러 (12대 DLL 분리 배치, 포그라운드 무클릭 자동 제거)
│   ├── build-installer.js          # 버전 자동 동기화 및 인스톨러 빌드 오케스트레이터
│   └── setup_builder.go            # 스탠드얼론 Go 기반 자체 압축해제 설치 빌더
│
├── 📂 public/                      # 브라우저 정적 에셋 폴더
│   ├── favicon.ico / icon.ico      # 멀티레이어 고해상도 아이콘 (16~256px)
│   ├── logo.png                    # 풀 블리드(Full-Bleed) 공식 대표 로고 이미지
│   └── manifest.json               # PWA 모바일 웹 매니페스트
│
├── 📝 App.tsx / index.html / types.ts / env.d.ts # React 19 프론트엔드 코어 (Grid/Topology/Diff, Packet Telemetry)
├── 🐹 main.go / engine.go / name_resolver.go / license_guard.go # Go 병렬 백엔드, /api/packet-inspect, /api/topology-map, /api/subnets/discover, Free 2서브넷 가드
├── 🐹 tray_engine.go               # Go 자율 백그라운드 트레이 엔진(10초 스윕, 이벤트 쿨다운/DND, 스케줄러, HTTP API)
├── 🐹 native_modules_bridge.go / native_modules_bridge_other.go # 경로 고정 `LoadLibraryExW` C-DLL 브리지 & `Pcap_InspectPacketProfileJson` 폴백
├── 🐹 utils_windows.go / utils_other.go # Win32 ARGB 배지 HICON, SCM 서비스(`--service`), 풍선 알림, Close-to-Tray, 5단계 런처
├── 🧪 main_test.go / license_guard_test.go / name_resolver_test.go # Go 백엔드 핵심 단위 테스트 스위트
├── 📝 master_oui.txt               # 9만여 건의 가공된 IEEE/Wireshark OUI 로컬 정적 데이터베이스
├── 🛠️ build-win.js / scripts/build-dll.js / scripts/sync-version.js # SSOT 동기화 및 12-DLL/EXE 빌드 파이프라인
└── ⚙️ package.json / go.mod / winres.json # 의존성 및 v2.6.0 메타데이터
```

---

## 🛠️ 2. 개별 파일 상세 명세 및 동작 원리

### 💻 2-1. 프론트엔드 계층 (Frontend Layer)

#### 📝 `App.tsx` & 모달·뷰 분리 구조 (`components/*.tsx`)
* **역할**: 프론트엔드의 3대 메인 뷰(`grid` / `topology` / `diff`), 테마 선택(Dark/Gray/White/Beige) 관리, 실시간 SSE 스트리밍 수신 및 버퍼링 제어, 세부 IP 프로필 사이드바(네이티브 패킷 텔레메트리 포함), 다중 서브넷/VLAN 캐시 전환·순차 Batch Sweep 및 Go/Electron 트레이 양방향 상태 동기화를 전담합니다.
* **컴포넌트 분리**: 3계층 토폴로지 뷰(`TopologyMapView.tsx`), 다중 서브넷 바·통합 대시보드(`MultiSubnetBar.tsx`, `MultiSubnetModal.tsx`), 통합 보고서 센터(`ReportCenterModal.tsx`), 환경설정·트레이(`PreferencesTrayModal.tsx`), 도움말/업데이트(`HelpUpdateModal.tsx`), 어댑터 탐색기(`InterfaceExplorerModal.tsx`), 라이선스(`LicenseModal.tsx`), PRO 잠금 안내(`ProFeatureLockedModal.tsx`)를 독립 컴포넌트로 분리했습니다.

#### 📝 `components/PreferencesTrayModal.tsx` & `tray_engine.go` & `utils_windows.go`
* **역할**: Windows 네이티브 트레이(`Shell_NotifyIconW`)·SCM 서비스(`GridIPScannerService`)·Electron 트레이·웹 UI 간의 양방향 제어 허브입니다.
* **주요 동작**:
  - **동적 배지 아이콘 & 요약 메뉴**: `standby`/`watching`/`scanning`/`alert` 상태에 따른 32×32 ARGB 동적 배지 `HICON` 생성 및 실시간 상태 요약.
  - **자율 감시 & 조용한 시작(`--tray`)**: UI 창 종료 또는 `--tray` 부팅 시 Go 엔진이 10초 주기로 자율 스윕·만기 스케줄을 수행.
  - **Windows SCM 서비스(`--service`)**: `advapi32.dll` Service Control Dispatcher를 통해 Session 0 서비스 상태(`running`/`stopped`/`not_installed`) 정확 제어.
  - **고도화 알림 정책**: 신규 침입·IP 충돌·대량 오프라인 급감 이벤트 필터링, 쿨다운 중복 억제, 상시/30분 일시 해제/야간 예약 방해금지(DND), 접이식 Windows 레거시 도구(`flushdns`, `ncpa.cpl`, `firewall`) 제공.

#### 📝 `components/ReportCenterModal.tsx`, `services/reportCenterService.ts`, `services/reportGenerator.ts`
* **역할**: **Free 티어 5시트 Excel Grid XML(`.xls`)·CSV·JSON·Markdown**과 **Pro+ A4 PDF 보안 감사 보고서·인쇄/그리드 HTML** 및 스냅샷 비교 흐름을 통합한 전용 리포팅 센터입니다.
* **주요 동작**:
  - **Free 티어 5시트 Excel Grid XML(`.xls`)**: `Summary`, `Devices`, `16x16 IP Map`, `Security Audit`, `Subnets & History` 5개 시트를 무료 커뮤니티 티어에서 즉시 생성·다운로드합니다.
  - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율)의 `.a4-report-page` 독립 페이지 단위로 컨텐츠를 사전 분할하여 jsPDF에 1:1로 결합함으로써 페이지 경계면 테이블/텍스트 잘림을 원천 방지합니다.
  - **프린터 안전 여백 (11mm Margin) 및 자동 리포트 보관**: 좌우 40px(약 11mm) 안전 여백, `페이지 X / Y` 동적 푸터, 스케줄 연동 자동 보고서 보관 및 `@media print` 인쇄 지원.

#### 📝 `services/schedulerService.ts`
* **역할**: 정기 자동 네트워크 스캔 스케줄의 로컬 저장소 CRUD, 주기 환산, 백그라운드 5초 Ticker 검사 및 스냅샷/리포트 자동 저장을 전담하는 스케줄링 코어 서비스입니다.
* **주요 동작**:
  - `grid_ip_scanner_schedules_v1`, `grid_ip_scanner_schedule_history_v1`, `grid_scheduler_paused` 키를 통해 스케줄·이력·트레이 일시정지 상태를 영구 보관합니다.
  - 15분, 30분, 1시간, 2시간, 6시간, 12시간, 매일, 매주 및 사용자 정의 분 단위 주기를 지원하며 `tray_engine.go`의 `TrayScheduleSummary`와 동기화됩니다.
  - 실행 완료 시 `[Auto-Sched] 스케줄명 (HH:MM)` 스냅샷 자동 저장(최대 25개) 및 실행 이력 CSV 다운로드(`exportScheduleHistoryToCSV`)를 지원합니다.

#### 📝 `components/ScheduleModal.tsx`
* **역할**: 사용자가 정기 자동 스캔 일정을 등록, 수정, 삭제하고 최근 실행 기록을 조회할 수 있는 대화형 관리자 모달 컴포넌트입니다.
* **주요 특징**:
  - [스케줄 목록], [새 스케줄 등록/수정], [자동 실행 기록]의 직관적인 3개 탭 구성.
  - 현재 실행 대기 상태와 다음 실행까지 남은 시간 카운트다운을 실시간 렌더링.
  - 즉시 실행(Run Now) 및 연동된 스냅샷 Diff 바로가기 버튼 제공.

#### 📝 `services/diffEngine.ts`
* **역할**: 스캔 스냅샷의 저장/복원 및 두 시점(스냅샷 A vs 스냅샷 B 또는 실시간 스캔) 간의 심층 다각도 차분 분석을 수행하는 딥 비교 엔진입니다.
* **주요 동작**:
  - 4색 상태 판별: 신규 접속(+NEW), 오프라인(-OFF), 속성/보안 변동(!CHG), 정상 유지(=SAME).
  - 미할당 빈 IP 슬롯(245개)을 계산에서 분리하여 실제 온라인 장비만 정확히 계측.
  - MAC 주소 변조(동일 IP 충돌/ARP 스푸핑 의심) 및 11개 주요 취약 포트(21, 23, 445, 3389 등) 신규 개방 감지.
  - 핑 지연시간 편차 디커플링 및 MAC/호스트명 정규화로 오탐(False Positive) 원천 방지.

#### 📝 `components/SnapshotDiffModal.tsx`
* **역할**: 임의의 두 시점 간의 네트워크 변경점을 나란히 대조할 수 있는 1:1 Side-by-Side 대조 스튜디오 인터페이스입니다.
* **주요 특징**:
  - 소스 맞바꿈(Swap), 6대 KPI 요약 카드, 실시간 텍스트 검색 및 보안 경보 전용 필터 탭 제공.
  - 변동 장치의 과거 vs 현재 상태, MAC, 개방 포트 나란히 대조 및 CSV 내보내기/클립보드 요약 복사 지원.

#### 📝 `index.html`
* **역할**: 웹 및 데스크톱 앱의 기본 HTML 템플릿입니다.
* **주요 특징**:
  - `<html lang="ko" class="notranslate" translate="no">` 및 `<meta name="google" content="notranslate">` 메타 태그를 명시하여 Chromium/Edge 브라우저가 영문 페이지로 오인하고 번역 제안 팝업을 띄우는 현상을 원천 차단했습니다.

