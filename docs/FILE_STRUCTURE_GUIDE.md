# Grid IP Scanner2 파일 및 디렉토리 구조 명세서 (File Structure & Component Specifications)

본 문서는 **Grid IP Scanner2 (v2.2)** 프로젝트를 구성하는 모든 디렉토리와 파일의 역할, 세부 동작 원리, 상호 작용 관계 및 상용 빌드 프로세스에서의 사용처를 일목요연하게 정리한 공식 기술 구조 가이드입니다.

---

## 📂 1. 전체 디렉토리 요약 구조 (Directory Tree)

```text
Grid IP Scanner2 Root/
│
├── 📂 .github/                     # GitHub 자동화 및 워크플로우 폴더
│   └── 📂 workflows/
│       └── build-and-release.yml   # GitHub Actions CI/CD (Windows .exe/인스톨러 & 모바일 번들 자동 빌드)
│
├── 📂 components/                  # React 개별 컴포넌트 폴더
│   └── IPCell.tsx                  # 16x16 그리드 속 개별 IP 상태 및 Diff 뱃지 표현 컴포넌트
│
├── 📂 services/                    # 비즈니스 로직 및 코어 엔진 서비스 폴더
│   ├── diffEngine.ts               # 스캔 스냅샷 저장/삭제 및 실시간 Diff 변경 비교 엔진
│   ├── portScanner.ts              # 25개 주요 포트 정밀 보안 검사 및 위험도 분류 모듈
│   ├── reportGenerator.ts          # A4 인쇄 규격 전문 네트워크 보안 감사 보고서(HTML) 생성기
│   └── licenseManager.ts           # Community/Pro/Enterprise 비대칭 암호키 오프라인 라이선스 매니저
│
├── 📂 docs/                        # 시스템 및 프로그램 도움말 문서 폴더
│   ├── README.md                   # 문서 저장소 총괄 가이드 및 색인 목차
│   ├── GITHUB_GUIDE.md             # 깃허브 연동 및 CI/CD 자동 배포 가이드 (AhBiYout / AhBiYout-all)
│   ├── WorkLog.md                  # 개발 및 기능 구현 공식 작업 일지
│   ├── VERSIONING_POLICY.md        # SemVer 3단계 버전 관리 규정 및 패치노트 기록 지침
│   ├── PATCH_NOTE.md               # 기능 추가 및 패치 이력 (v2.3.1 최신화)
│   ├── GRID_IP_SCANNER_2.md        # 서비스 개요 및 제품 설명서
│   ├── DISTRIBUTION_AND_TIER_STRATEGY.md # 포터블 & 인스톨러 배포 전략 및 유료화 사양서
│   ├── OUI_DATABASE_SPEC.md        # OUI 데이터베이스 구조 및 이중 미러링 기술 명세서
│   ├── PROPRIETARY_TECHNOLOGY.md   # 독점 기술 및 코어 엔진 설명서
│   ├── FILE_STRUCTURE_GUIDE.md     # [본 문서] 파일 구조 및 디렉토리 상세 명세서
│   └── LICENSE.md                  # 프로그램 이중 라이선스 및 준수 명세 계약서
│
├── 📂 installer/                   # Windows 정식 인스톨러 패키징 툴체인
│   ├── Grid_IP_Scanner2_Setup.iss  # Inno Setup 6 윈도우 인스톨러 컴파일러 스크립트 (방화벽/제어판/시작메뉴)
│   └── build-installer.js          # 버전 자동 동기화 및 인스톨러 빌드 오케스트레이터
│
├── 📂 public/                      # 브라우저 정적 에셋 폴더
│   ├── favicon.ico                 # 브라우저 탭 아이콘
│   ├── icon.ico                    # 웹 에플리케이션 고해상도 아이콘
│   ├── logo.png                    # 서비스 공식 대표 로고 이미지
│   └── manifest.json               # 웹 매니페스트
│
├── 📝 LICENSE.md                   # 프로그램 루트 이중 라이선스 명세서
├── 📝 App.tsx                      # React 프론트엔드 메인 컨테이너 및 비즈니스 로직 (상태 보존 탑재)
├── 📝 index.html                   # 프론트엔드 HTML 엔트리 포인트
├── 📝 index.tsx                    # React와 DOM 랜더러 연결부 (렌더링 진입점)
├── 📝 index.css                    # Tailwind CSS 연동 글로벌 테마 및 스타일링 지정
├── 📝 types.ts                     # 전체 시스템 공유 TypeScript 타입 명세 및 이늄(Enum) 정의
├── 📝 env.d.ts                     # Vite 및 환경변수 전용 타입 어노테이션 파일
│
├── 🐹 main.go                      # Go 기반 초고속 하이브리드 백엔드 메인 엔트리 (안전 재시작 & 네이티브 긴급 스캔 탑재)
├── 🐹 engine.go                    # 멀티 프로토콜 병렬 포트/IP 탐색 및 하드웨어 제조사 추적 모듈
├── 🐹 utils_windows.go             # Windows Win32 API(user32.dll) 바인딩, 적응형 5단계 런처 & 긴급 보고서 모듈
├── 🐹 utils_other.go               # Linux / macOS 플랫폼용 저사양 소켓 추상화 폴백 모듈
├── 📝 master_oui.txt               # 가공된 IEEE 표준 맥주소 제조사 정보(OUI) 로컬 정적 데이터베이스
│
├── 🖥️ server.ts                   # Node.js 개발/프록시 서버 (Go 백엔드 바인딩 대기 sync 로직 탑재)
├── ⚙️ vite.config.ts               # Vite 프론트엔드 빌드 툴체인 설정
├── ⚙️ tsconfig.json                # TypeScript 컴파일 규칙 및 경로 매핑 구성 파일
│
├── 🛠️ build-win.js                 # PATCH_NOTE.md 동적 버전 수집 및 EXE 자동 패키징 오케스트레이터
├── 🛠️ generate-assets.js           # 로고 이미지 리사이징 및 윈도우 다중 해상도 아이콘 빌드 에이전트
├── 🛠️ winres.json                  # Windows 바이너리 메타데이터 정보 주입용 리소스 구성 명세
├── ⚙️ package.json                 # Node.js 의존성 패키지 및 개발 스크립트 중앙 관리 매니페스트 (v2.2.1)
├── ⚙️ go.mod                       # Go 모듈 및 병렬 처리 의존성 정의 구성 파일
│
├── 📂 scripts/                     # 자동화 및 배포 스크립트 폴더
│   ├── github-sync.bat             # [Windows] 깃허브 원클릭 자동 동기화 및 릴리즈 태그 푸시 배치 스크립트
│   └── github-sync.sh              # [Linux/Mac/Git Bash] 깃허브 자동 푸시 쉘 스크립트
│
├── 🛠️ github-push.bat              # 프로젝트 루트에서 즉시 실행 가능한 깃허브 원클릭 업로드 단축 스크립트
└── 🛠️ build.bat / build.sh         # 영문 자동 빌드 배치 및 쉘 스크립트
```

---

## 🛠️ 2. 개별 파일 상세 명세 및 동작 원리

### 💻 2-1. 프론트엔드 핵심 파일 (Frontend Layer)

#### 📝 `App.tsx`
* **역할**: 프론트엔드의 화면 레이아웃 정의, 테마 선택(Beige/Dark/Gray) 관리, 실시간 SSE 스트리밍 수신 및 버퍼링 제어, 세부 IP 프로필 사이드바 렌더링, EXCEL 및 JSON 보고서 내보내기 핵심 비즈니스 제어를 모두 전담하는 중앙 컨테이너 파일입니다.
* **주요 동작**:
  - **선택 인터페이스 상태 보존**: `/api/status` 폴링 시 백엔드 기본 카드로 초기화되는 현상을 막기 위해 `selectedInterfaceIpRef` 상태 래퍼를 도입하여 수동 지정 어댑터를 강제 유지합니다.
  - **제작자 및 블로그 안내**: 푸터 및 사이드바 영역에 공식 웹사이트(`www.cisnet.co.kr`) 및 공식 블로그(`ahbiyoutvibe.blogspot.com`) 링크가 제공됩니다.

#### 📝 `components/IPCell.tsx`
* **역할**: 16x16 그리드 속 총 254개의 개별 호스트 노드를 표현하는 UI 서브 컴포넌트입니다.

---

### 🐹 2-2. 백엔드 및 가속 엔진 파일 (Backend Layer)

#### 🖥️ `server.ts`
* **역할**: Express 서버 및 API 프록시 엔트리 포인트입니다.
* **v2.2 동기화 로직**: `waitForGoBackend('http://127.0.0.1:8081/api/info')` 루틴을 가동하여, Go 백엔드가 정상 구동 및 바인딩 완료될 때까지 비동기 대기 후 프록시 통로를 개방하여 503 `ECONNREFUSED` 에러를 원천 예방합니다.

#### 🐹 `main.go`
* **역할**: Go 백엔드 기동 서버, 동적 HTTP API 엔드포인트 제공, Server-Sent Events(SSE) 파이프라인, 안전 재시작 API (`/api/relaunch-admin`) 및 브라우저 부재 시 64 워커 풀을 활용한 Windows 네이티브 긴급 스캔 엔진(`runEmergencyScanAndReport`)을 전담합니다.

#### 🐹 `utils_windows.go`
* **역할**: Windows Win32 시스템 API(`user32.dll`의 `MessageBoxW`, `clip.exe`, `notepad.exe`) 바인딩, 5단계 스마트 적응형 런처 파이프라인(`launchBrowserWithFallback`), 및 UTF-8 / ANSI 디코딩 가속 모듈입니다.

---

### 🛠️ 2-3. 빌드 오케스트레이션 및 문서 파일 (Build & Documentation Layer)

#### 📂 `docs/` 디렉토리
* **`GRID_IP_SCANNER_2.md`**: 서비스 개요 및 제품 설명서 백서
* **`PATCH_NOTE.md`**: 버전별 패치 내역 및 버저닝 소스 기준 문서
* **`LICENSE.md`**: 오픈소스 GPL v3 및 상용 라이선스(Proprietary Commercial License) 이중 라이선스 규정집
* **`PROPRIETARY_TECHNOLOGY.md`**: 코어 독점 엔진 및 아키텍처 설명서
* **`FILE_STRUCTURE_GUIDE.md`**: [본 문서] 전체 파일 구조 및 동작 원리 안내서

#### 🛠️ `build.bat` & `build-win.js`
* **역할**: 영문 CMD 자동 빌드 배치 및 NodeJS 컴파일 오케스트레이터입니다. `docs/PATCH_NOTE.md` 및 `package.json`에서 정식 버전(`v2.2`)을 수집하여 `Grid IP Scanner2 v2.2.exe` 바이너리로 자동 완성합니다.

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
[실시간 16x16 동적 그리드 리사이클러 뷰] (IPCell.tsx / App.tsx)
```

---

* **문서 업데이트 일자**: 2026년 7월 23일
* **작성 부서**: Grid IP Scanner2 코어 개발 연구 부서 (ahbiyoutvibe.blogspot.com / ahbiyout@gmail.com)
