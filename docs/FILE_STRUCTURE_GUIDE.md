# Grid IP Scanner2 파일 및 디렉토리 구조 명세서 (File Structure & Component Specifications)

본 문서는 **Grid IP Scanner2 (v2.3.2)** 프로젝트를 구성하는 모든 디렉토리와 파일의 역할, 세부 동작 원리, 상호 작용 관계 및 상용 빌드 프로세스에서의 사용처를 일목요연하게 정리한 공식 기술 구조 가이드입니다.

---

## 📂 1. 전체 디렉토리 요약 구조 (Directory Tree)

```text
Grid IP Scanner2 Root/
│
├── 📂 .github/                     # GitHub 자동화 및 워크플로우 폴더
│   └── 📂 workflows/
│       └── build-and-release.yml   # GitHub Actions CI/CD (Windows .exe/인스톨러, Android APK, 모바일 웹)
│
├── 📂 components/                  # React 개별 컴포넌트 폴더
│   ├── IPCell.tsx                  # 16x16 그리드 속 개별 IP 상태 및 Diff 뱃지 표현 컴포넌트
│   └── UpdateModal.tsx             # GitHub Releases 실시간 업데이트 센터 안내 및 다운로드 모달
│
├── 📂 services/                    # 비즈니스 로직 및 코어 엔진 서비스 폴더
│   ├── diffEngine.ts               # 스캔 스냅샷 저장/삭제 및 실시간 Diff 변경 비교 엔진
│   ├── portScanner.ts              # 25개 주요 포트 정밀 보안 검사 및 위험도 분류 모듈
│   ├── reportGenerator.ts          # A4 인쇄 규격 전문 네트워크 보안 감사 보고서(HTML) 생성기
│   ├── licenseManager.ts           # Community/Pro/Enterprise 비대칭 암호키 오프라인 라이선스 매니저
│   └── updateChecker.ts            # GitHub Releases API 조회 및 버전 비교 실시간 업데이트 체커
│
├── 📂 docs/                        # 시스템 및 프로그램 공식 기술 문서 허브 (11대 표준 문서)
│   ├── README.md                   # 문서 저장소 총괄 가이드 및 색인 목차
│   ├── GITHUB_GUIDE.md             # 깃허브 연동 및 CI/CD 자동 배포 가이드 (AhBiYout / AhBiYout-all)
│   ├── WorkLog.md                  # 개발 및 기능 구현 공식 작업 일지
│   ├── VERSIONING_POLICY.md        # SemVer 3단계 버전 관리 규정 및 패치노트 기록 지침
│   ├── PATCH_NOTE.md               # 기능 추가 및 패치 이력 (v2.3.2 최신화)
│   ├── GRID_IP_SCANNER_2.md        # 서비스 개요 및 제품 설명서 백서
│   ├── DISTRIBUTION_AND_TIER_STRATEGY.md # 포터블 & 인스톨러 배포 전략 및 유료화 사양서
│   ├── OUI_DATABASE_SPEC.md        # OUI 데이터베이스 구조 및 이중 미러링 기술 명세서
│   ├── PROPRIETARY_TECHNOLOGY.md   # 독점 기술 및 15대 코어 엔진 설명서
│   ├── FILE_STRUCTURE_GUIDE.md     # [본 문서] 파일 구조 및 디렉토리 상세 명세서
│   └── LICENSE.md                  # 프로그램 이중 라이선스 및 준수 명세 계약서
│
├── 📂 installer/                   # Windows 정식 인스톨러 패키징 툴체인
│   ├── Grid_IP_Scanner2_Setup.iss  # Inno Setup 6 윈도우 인스톨러 컴파일러 스크립트 (방화벽/제어판/시작메뉴)
│   └── build-installer.js          # 버전 자동 동기화 및 인스톨러 빌드 오케스트레이터
│
├── 📂 public/                      # 브라우저 정적 에셋 폴더
│   ├── favicon.ico                 # 브라우저 탭 아이콘 (멀티레이어)
│   ├── icon.ico                    # 웹 애플리케이션 고해상도 아이콘 (16~256px)
│   ├── logo.png                    # 풀 블리드(Full-Bleed) 공식 대표 로고 이미지
│   └── manifest.json               # PWA 모바일 웹 매니페스트
│
├── 📝 LICENSE.md                   # 프로그램 루트 이중 라이선스 명세서
├── 📝 App.tsx                      # React 프론트엔드 메인 컨테이너 및 비즈니스 로직 (상태 보존 & 풀 블리드 UI)
├── 📝 index.html                   # 프론트엔드 HTML 엔트리 포인트
├── 📝 index.tsx                    # React와 DOM 렌더러 연결부 (렌더링 진입점)
├── 📝 index.css                    # Tailwind CSS 연동 글로벌 테마 및 스타일링 지정
├── 📝 types.ts                     # 전체 시스템 공유 TypeScript 타입 명세 및 이늄(Enum) 정의
├── 📝 env.d.ts                     # Vite 및 환경변수 전용 타입 어노테이션 파일
│
├── 🐹 main.go                      # Go 기반 초고속 하이브리드 백엔드 메인 엔트리 (안전 재시작 & 어댑터 전수 탐색)
├── 🐹 engine.go                    # 멀티 프로토콜 병렬 포트/IP 탐색 및 하드웨어 제조사 추적 모듈
├── 🐹 utils_windows.go             # Windows Win32 API(user32.dll) 바인딩, 적응형 5단계 런처 & 긴급 보고서 모듈
├── 🐹 utils_other.go               # Linux / macOS 플랫폼용 저사양 소켓 추상화 폴백 모듈
├── 📝 master_oui.txt               # 가공된 IEEE 표준 맥주소 제조사 정보(OUI) 로컬 정적 데이터베이스
│
├── 🖥️ server.ts                   # Node.js 개발/프록시 서버 (Go 백엔드 바인딩 대기 sync 로직 탑재)
├── ⚙️ vite.config.ts               # Vite 프론트엔드 빌드 툴체인 설정
├── ⚙️ tsconfig.json                # TypeScript 컴파일 규칙 및 경로 매핑 구성 파일
│
├── 🛠️ build-win.js                 # PATCH_NOTE.md 동적 버전 수집, EXE 빌드 & 2단계 PE 리소스 패칭 오케스트레이터
├── 🛠️ generate-assets.js           # 엣지-투-엣지 자동 크롭, 6단계 멀티레이어 ICO 생성 & 소켓 자가 회수 스크립트
├── 🛠️ winres.json                  # Windows 바이너리 메타데이터 (#1 & APP 아이콘 그룹 주입용) 리소스 명세
├── ⚙️ package.json                 # Node.js 의존성 패키지 및 개발 스크립트 중앙 관리 매니페스트 (v2.3.2)
├── ⚙️ go.mod                       # Go 모듈 및 병렬 처리 의존성 정의 구성 파일
│
├── 📂 scripts/                     # 자동화 및 배포 스크립트 폴더
│   ├── sync-version.js             # 8대 핵심 타깃 일괄 버전 동기화(Single Source of Truth) 엔진
│   ├── package-mobile.js           # 모바일 PWA 웹 패키지 압축 스크립트
│   ├── package-android.js          # 안드로이드 스마트폰 전용 APK 패키징 스크립트
│   ├── auto-update.bat             # 콘솔 대화형 실시간 자동 업데이트 배치 스크립트
│   ├── github-sync.bat             # [Windows] 깃허브 원클릭 자동 동기화 및 릴리즈 태그 푸시 배치 스크립트
│   └── github-sync.sh              # [Linux/Mac/Git Bash] 깃허브 자동 푸시 쉘 스크립트
│
├── 🛠️ github-push.bat              # 프로젝트 루트에서 즉시 실행 가능한 깃허브 원클릭 업로드 단축 스크립트
└── 🛠️ build.bat / build.sh         # 영문 자동 빌드 배치 및 쉘 스크립트
```

---

## 🛠️ 2. 개별 파일 상세 명세 및 동작 원리

### 💻 2-1. 프론트엔드 계층 (Frontend Layer)

#### 📝 `App.tsx`
* **역할**: 프론트엔드의 화면 레이아웃 정의, 테마 선택(Beige/Dark/Gray) 관리, 실시간 SSE 스트리밍 수신 및 버퍼링 제어, 세부 IP 프로필 사이드바 렌더링, EXCEL 및 JSON 보고서 내보내기, 스냅샷 Diff 뷰 전환, 전체 어댑터 탐색 모달 제어, 라이선스/업데이트 모달 연동 핵심 비즈니스 제어를 모두 전담하는 중앙 컨테이너 파일입니다.
* **주요 동작**:
  - **선택 인터페이스 상태 보존**: `/api/status` 폴링 시 백엔드 기본 카드로 초기화되는 현상을 막기 위해 `selectedInterfaceIpRef` 상태 래퍼를 도입하여 수동 지정 어댑터를 강제 유지합니다.
  - **풀 블리드(Full-Bleed) UI 아이콘 스타일링**: 사이드바 및 모바일 헤더, 각종 모달 헤더 로고의 내부 여백을 제거하고 `rounded-2xl shadow-xl ring-1 ring-cyan-500/30` 꽉 찬 에셋으로 시인성을 극대화합니다.
  - **제작자 및 블로그 안내**: 푸터 및 사이드바 영역에 공식 웹사이트(`www.cisnet.co.kr`) 및 공식 블로그(`ahbiyoutvibe.blogspot.com`) 링크가 제공됩니다.

#### 📝 `components/IPCell.tsx`
* **역할**: 16x16 그리드 속 총 254개의 개별 호스트 노드를 표현하는 UI 서브 컴포넌트입니다. 온라인/오프라인 상태에 따른 시각적 핑 애니메이션과 스냅샷 Diff 모드 시 `+NEW`, `-OFF`, `!CHG` 뱃지를 정밀 렌더링합니다.

#### 📝 `components/UpdateModal.tsx`
* **역할**: 새 버전 감지 시 릴리즈 노트와 함께 Windows 무설치 포터블(.exe), 정식 인스톨러(Setup.exe), 안드로이드 스마트폰(APK) 원클릭 다운로드 탭을 제공하는 모달 컴포넌트입니다.

---

### ⚙️ 2-2. 서비스 계층 (Services Layer)

#### 📝 `services/diffEngine.ts`
* **역할**: 현재 스캔 결과를 `localStorage`에 스냅샷으로 영구 저장하고, 이전 기준 스냅샷과 1:1 비교하여 신규 장치, 오프라인 장치, MAC/호스트 변경 장치를 정밀 산출하는 델타 연산 엔진입니다.

#### 📝 `services/portScanner.ts`
* **역할**: 25개 주요 서비스 포트(FTP, SSH, Telnet, HTTP, SMB, DB, RDP 등)를 비동기 병렬 스캔하고 위험 등급(HIGH/MEDIUM/SAFE)을 자동 매핑하는 정밀 보안 감사 모듈입니다.

#### 📝 `services/reportGenerator.ts`
* **역할**: 기업 전산망 보안 감사 보고용 A4 규격 HTML 문서를 생성하여 인쇄 및 PDF 저장을 완벽 지원하는 리포트 생성기입니다.

#### 📝 `services/licenseManager.ts`
* **역할**: Community, Pro, Enterprise 3단계 티어의 비대칭 암호키(Ed25519) 오프라인 인증 및 기능 플래그(Feature Gate)를 제어하는 라이선스 관리자입니다.

#### 📝 `services/updateChecker.ts`
* **역할**: GitHub Releases API를 백그라운드에서 비동기 조회하여 최신 릴리즈 유무를 확인하고 버전 번호를 비교하는 실시간 업데이트 체커입니다.

---

### 🐹 2-3. 백엔드 및 가속 엔진 파일 (Backend Layer)

#### 🖥️ `server.ts`
* **역할**: Express 서버 및 API 프록시 엔트리 포인트입니다.
* **동기화 로직**: `waitForGoBackend('http://127.0.0.1:8081/api/info')` 루틴을 가동하여, Go 백엔드가 정상 구동 및 바인딩 완료될 때까지 비동기 대기 후 프록시 통로를 개방하여 503 `ECONNREFUSED` 에러를 원천 예방합니다.

#### 🐹 `main.go`
* **역할**: Go 백엔드 기동 서버, 동적 HTTP API 엔드포인트 제공, Server-Sent Events(SSE) 파이프라인, 안전 재시작 API (`/api/relaunch-admin`), 전체 네트워크 어댑터 전수 탐색(`getAllInterfaces`), 및 브라우저 부재 시 64 워커 풀을 활용한 Windows 네이티브 긴급 스캔 엔진(`runEmergencyScanAndReport`)을 전담합니다.

#### 🐹 `utils_windows.go`
* **역할**: Windows Win32 시스템 API(`user32.dll`의 `MessageBoxW`, `clip.exe`, `notepad.exe`) 바인딩, 5단계 스마트 적응형 런처 파이프라인(`launchBrowserWithFallback`), 및 UTF-8 / ANSI 디코딩 가속 모듈입니다.

---

### 🛠️ 2-4. 빌드 오케스트레이션 및 배포 스크립트 (Build & Toolchain Layer)

#### 🛠️ `build-win.js`
* **역할**: `package.json` 및 `docs/PATCH_NOTE.md`의 버전 메타데이터를 자동 파싱하여 `Grid IP Scanner2 v2.3.2.exe`를 패키징하고, `go-winres make` 컴파일 및 `go-winres patch`를 통한 2차 직접 PE 바이너리 리소스 주입을 전담하는 NodeJS 빌드 오케스트레이터입니다.

#### 🛠️ `generate-assets.js`
* **역할**: 원본 PNG의 투명 여백을 `pngjs`로 자동 분석하여 엣지-투-엣지(Edge-to-Edge) 크롭을 수행하고, 소켓 핸들 자가 회수 로직을 통해 행(Hang) 현상 없이 16~256px 6단계 멀티레이어 마스터 ICO를 생성하는 자동화 에이전트입니다.

#### 🛠️ `winres.json`
* **역할**: Windows 바이너리 메타데이터 및 PE 리소스 헤더에 최우선 순위 숫자 ID(`"#1"`) 및 기본 ID(`"APP"`) 아이콘 그룹을 주입하는 리소스 정의 명세서입니다.

#### 🛠️ `scripts/sync-version.js`
* **역할**: 1회 실행으로 8대 핵심 타깃(`package.json`, `winres.json`, `Setup.iss`, `App.tsx`, `updateChecker.ts`, `docs/PATCH_NOTE.md`, `docs/README.md`, `docs/WorkLog.md`)의 버전을 100% 동기화하는 중앙 집중식 SSOT 엔진입니다.

#### 🛠️ `installer/Grid_IP_Scanner2_Setup.iss` & `build-installer.js`
* **역할**: Inno Setup 6 기반의 정식 Windows 인스톨러(`Grid_IP_Scanner2_v2.3.2_Setup.exe`)를 컴파일하고 방화벽 인바운드/아웃바운드 자동 예외 등록 및 제어판 등록을 수행하는 패키징 툴체인입니다.

---

## 🔗 3. 핵심 모듈 간의 유기적 데이터 흐름도 (Data Flow)

```text
[사용자 클릭 / UI 제어] (App.tsx) ───► 어댑터 강제 고정 (selectedInterfaceIpRef)
         │
         ▼ (REST API)
[Express 개발 서버 / Go 통신 포트] (server.ts / main.go) ───► waitForGoBackend (503 소멸)
         │
         ▼ (병렬 처리 고루틴 기동)
[고성능 병렬 탐색 모듈] (engine.go) ───[Windows 커널 NDIS 제어] (utils_windows.go)
         │                                       │
         ├───────────────────────────────────────┘ (MAC & IP 주소 수집)
         ▼
[OUI DB 해시 탐색] (master_oui.txt 데이터 조회 및 제조사명 변환)
         │
         ▼ (실시간 JSON 메시지 빌드)
[Server-Sent Events (SSE) 스트림 채널] (main.go -> SSE Stream)
         │
         ▼ (250ms 배칭 렌더러 처리로 React 스레드 지연 0%)
[실시간 16x16 동적 그리드 / Diff 뷰] (IPCell.tsx / App.tsx)
```

---

* **문서 업데이트 일자**: 2026년 10월 4일 (v2.3.2 최신화)
* **작성 부서**: Grid IP Scanner2 코어 개발 연구팀 (ahbiyoutvibe.blogspot.com / ahbiyout@gmail.com)
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
