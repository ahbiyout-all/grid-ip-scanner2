# Grid IP Scanner2 파일 및 디렉토리 구조 명세서 (File Structure & Component Specifications)

본 문서는 **Grid IP Scanner2 (v2.5.0)** 프로젝트를 구성하는 모든 디렉토리와 파일의 역할, 세부 동작 원리, 상호 작용 관계 및 상용 빌드 프로세스에서의 사용처를 일목요연하게 정리한 공식 기술 구조 가이드입니다.

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
├── 📂 components/                  # React 개별 컴포넌트 폴더
│   ├── IPCell.tsx                  # 16x16 그리드 개별 IP 상태, Diff 뱃지, Proxy-ARP 인디케이터 뱃지 컴포넌트
│   ├── IntruderLogModal.tsx        # 24/7 무인 백그라운드 서비스 침입 탐지 이력 조회 및 화이트리스트 모달
│   ├── NativeModulesModal.tsx      # 12대 C/C++ 네이티브 DLL 엔진 아코디언 진단 콘솔
│   ├── ScheduleModal.tsx           # 정기 자동 네트워크 스캔 스케줄 관리 및 실행 이력 모달
│   ├── SnapshotDiffModal.tsx       # 1:1 Side-by-Side 딥 스냅샷 비교 스튜디오 모달
│   ├── TrayStatusIndicator.tsx     # 트레이 실시간 스캔 진척도 및 침입 경보 타임스탬프 인디케이터
│   └── UpdateModal.tsx             # GitHub Releases 실시간 업데이트 센터 안내 및 다운로드 모달
│
├── 📂 services/                    # 비즈니스 로직 및 코어 엔진 서비스 폴더
│   ├── conflictDetector.ts         # IP/MAC 충돌 탐지, Gateway Proxy-ARP 비알림 분리 및 Soft Trust 알고리즘
│   ├── ouiClassifier.ts            # OUI + 포트/mDNS/UPnP 다중 신호 시맨틱 분류 및 LAA 랜덤 MAC 역추적
│   ├── diffEngine.ts               # 스냅샷 A/B 딥 비교 엔진, 고위험 포트 탐지, IP 충돌 분석
│   ├── portScanner.ts              # 25개 주요 포트 정밀 보안 검사 및 위험도 분류 모듈
│   ├── schedulerService.ts         # 5초 Ticker 기반 정기 스케줄러, 남은 시간 카운트다운, 스냅샷 자동저장
│   ├── reportGenerator.ts          # A4 최적화 스마트 페이지네이션 PDF/HTML(칩셋 OUI & 실제 제조사 분리) 엔진
│   ├── licenseManager.ts           # Community/Pro/Enterprise 비대칭 암호키 오프라인 라이선스 매니저
│   ├── updateChecker.ts            # GitHub Releases API 조회 및 버전 비교 실시간 업데이트 체커 (v2.5.0)
│   ├── wolService.ts               # Wake-on-LAN (UDP 9/7 매직 패킷) 원격 부팅 서비스
│   ├── intruderLogService.ts       # 24/7 침입 탐지 이력 저장/필터/CSV 내보내기 서비스
│   ├── nativeModulesService.ts     # 네이티브 DLL 상태 점검 및 토폴로지 가드 API 브리지
│   ├── ouiValidatorBridge.ts       # OUI DB 검증 브리지
│   ├── secureVaultBridge.ts        # Secure Vault AES-256-GCM 암호화 브리지
│   ├── electronVaultBridge.ts      # Electron 환경 Vault IPC 브리지
│   ├── vaultService.ts             # 통합 보안 저장소 추상화 계층
│   ├── deviceAliasManager.ts       # 사용자 장치 별칭 관리
│   └── remoteActionService.ts      # 원격 진단 및 제어 액션 서비스
│
├── 📂 native_dll/                  # 순수 C99 / C++17 12대 네이티브 가속 DLL 엔진 소스
│   ├── grid_topology_guard.c/.h    # [신규/순수창작] O(N) 서브넷 토폴로지 해시 & Proxy-ARP/LAA 분리 (v2.6.1)
│   ├── grid_probe_engine.c/.h      # 벡터화 비동기 ICMP 배치 스위프 (`Probe_SweepCidrAsyncBatch`, v2.6.0)
│   ├── grid_port_iocp.c/.h         # Win32 IOCP+ConnectEx 다중 호스트 포트 스위프 (`PortScan_IocpMultiHostSweep`)
│   ├── grid_discovery.c/.h         # 네이티브 SSDP / mDNS 라벨 파싱 & 다중 프로토콜 탐색 엔진
│   ├── grid_oui_trie.c/.h          # Bitwise OUI CIDR(/24, /28, /36) 고속 트라이 탐색 엔진
│   ├── grid_banner_grabber.c/.h    # 비파괴 다중 recv HTTP/서비스 배너 추출 엔진
│   ├── grid_pcap_analyzer.c/.h     # Npcap(`wpcap.dll` System32 고정) 패킷 기반 OS TTL 분석 엔진
│   ├── grid_fingerprint_engine.c/.h# AI 휴리스틱 기기 지문 분석 & 리스크 점수 산출 엔진
│   ├── grid_net_driver.c/.h/.go    # 코어 네이티브 소켓 드라이버 및 Go FFI 바인딩
│   ├── grid_vault_driver.c/.h/.go  # `GVAULT11` PBKDF2-HMAC-SHA256 스택 고속 경로 보안 볼트 C 드라이버
│   ├── oui_validator.cpp/.h        # Wireshark/IEEE `manuf` 무결성 & CIDR 충돌 검증기
│   ├── secure_vault.cpp/.h         # C++17 AES-256-GCM 네이티브 암호화 엔진 (`v2.6.0`)
│   └── build_all_dlls.bat          # MSYS2 GCC 16.1.0 정적 링크(`-static-libgcc -static-libstdc++`) 전수 빌드 스크립트
│
├── 📂 docs/                        # 시스템 및 프로그램 공식 기술 문서 허브 (v2.5.0)
│   ├── README.md                   # 문서 저장소 총괄 가이드 및 색인 목차 (v2.5.0)
│   ├── GOOGLE_BLOGGER_POST.md      # 구글 블로거 포스팅 가이드 ([작성 모드 (서식 있는 텍스트)])
│   ├── GOOGLE_BLOGGER_POST.html    # 구글 블로거 포스팅 가이드 ([HTML 편집 모드] 전용 소스)
│   ├── GITHUB_GUIDE.md             # 깃허브 연동, .gitignore 규칙 및 CI/CD 자동 배포 가이드 (v2.5.0)
│   ├── GRID_TOPOLOGY_GUARD_DLL_SPEC.md # 순수 창작 DLL 명세 및 12대 DLL 감사·하드닝 보고서
│   ├── SCHEDULED_SCAN_SPEC.md      # 정기 자동 스캔 스케줄러 아키텍처 및 데이터 명세서
│   ├── SNAPSHOT_DIFF_SPEC.md       # 딥 스냅샷 비교 엔진 v2 및 1:1 대조 스튜디오 명세서
│   ├── MOBILE_GITHUB_GUIDE.md      # 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
│   ├── WorkLog.md                  # 개발 및 기능 구현 공식 작업 일지 (v2.5.0)
│   ├── VERSIONING_POLICY.md        # SemVer 3단계 버전 관리 규정 및 SSOT 10대 타깃 동기화 지침
│   ├── PATCH_NOTE.md               # 기능 추가 및 패치 이력 (v2.5.0 최신화)
│   ├── GRID_IP_SCANNER_2.md        # 서비스 개요 및 제품 설명서 백서 (v2.5.0)
│   ├── SECURITY_REPORT.md          # 보안 점검 및 암호화 검증 보고서 (v2.5.0)
│   ├── FILE_STRUCTURE_GUIDE.md     # [본 문서] 파일 구조 및 디렉토리 상세 명세서 (v2.5.0)
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
├── 📝 App.tsx / index.html / types.ts / env.d.ts # React 19 프론트엔드 코어
├── 🐹 main.go / engine.go / name_resolver.go # Go 병렬 백엔드, UPnP XML/mDNS 제조사 식별 엔진
├── 🐹 native_modules_bridge.go / native_modules_bridge_other.go # 경로 고정 `LoadLibraryExW` C-DLL 브리지 & 폴백
├── 🐹 utils_windows.go / utils_other.go # Win32 트레이 서브메뉴, 풍선 알림, Close-to-Tray, 5단계 런처
├── 📝 master_oui.txt               # 9만여 건의 가공된 IEEE/Wireshark OUI 로컬 정적 데이터베이스
├── 🛠️ build-win.js / scripts/build-dll.js / scripts/sync-version.js # SSOT 동기화 및 12-DLL/EXE 빌드 파이프라인
└── ⚙️ package.json / go.mod / winres.json # 의존성 및 v2.5.0 메타데이터
```

---

## 🛠️ 2. 개별 파일 상세 명세 및 동작 원리

### 💻 2-1. 프론트엔드 계층 (Frontend Layer)

#### 📝 `App.tsx`
* **역할**: 프론트엔드의 화면 레이아웃 정의, 테마 선택(Beige/Dark/Gray) 관리, 실시간 SSE 스트리밍 수신 및 버퍼링 제어, 세부 IP 프로필 사이드바 렌더링, A4 PDF 리포트 내보내기, 스냅샷 Diff 뷰 전환, 전체 어댑터 탐색 모달 제어, 라이선스/업데이트 모달 연동 핵심 비즈니스 제어를 모두 전담하는 중앙 컨테이너 파일입니다.

#### 📝 `services/reportGenerator.ts`
* **역할**: A4 용지 규격에 완벽히 맞춘 고품질 보안 감사 보고서(PDF) 및 브라우저 인쇄용 HTML을 생성하는 전문 리포팅 엔진입니다.
* **주요 동작**:
  - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율)의 `.a4-report-page` 독립 페이지 단위로 컨텐츠를 사전 분할하여 jsPDF에 1:1로 결합함으로써, 페이지 경계면에서 테이블 행이나 텍스트 줄이 반으로 잘리는 결함을 원천 방지합니다.
  - **프린터 안전 여백 (11mm Margin)**: 좌우 40px(약 11mm)의 안전 여백을 확보하여 모든 사무용 프린터에서 출력해도 글자 잘림이 발생하지 않습니다.
  - **동적 페이지 번호 및 공식 푸터**: 모든 페이지 하단에 `페이지 X / Y`, 기밀(CONFIDENTIAL) 등급, 공식 배포처 메타데이터를 정돈하여 출력합니다.
  - **브라우저 직접 인쇄 지원**: `@media print` 스타일시트를 통해 인쇄 시 배경색과 뱃지 색상을 선명하게 유지합니다.

#### 📝 `services/schedulerService.ts`
* **역할**: 정기 자동 네트워크 스캔 스케줄의 로컬 저장소 CRUD, 주기 환산, 백그라운드 5초 Ticker 검사 및 스냅샷 자동 저장을 전담하는 스케줄링 코어 서비스입니다.
* **주요 동작**:
  - `grid_ip_scanner_schedules_v1` 및 `grid_ip_scanner_schedule_history_v1` 키를 통해 스케줄 및 최근 50회 실행 이력을 영구 보관합니다.
  - 10분, 15분, 30분, 1시간, 2시간, 6시간, 12시간, 24시간 및 사용자 정의 분 단위 주기를 지원합니다.
  - 실행 완료 시 `[Auto-Sched] 스케줄명 (HH:MM)` 스냅샷을 캡처하여 최대 25개까지 아카이빙합니다.
  - 실행 이력을 CSV 파일로 다운로드 내보내기(`exportScheduleHistoryToCSV`)를 지원합니다.

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

