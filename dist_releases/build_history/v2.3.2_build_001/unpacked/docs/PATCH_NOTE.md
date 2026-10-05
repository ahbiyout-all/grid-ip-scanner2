# Grid IP Scanner2 - Patch Note (v2.3.2)
## 🛠️ 릴리즈 및 버전별 패치 노트 (Release & Semantic Version History)

본 문서는 **Grid IP Scanner2** 프로젝트의 버전별 변경 내역, 신규 기능 추가, 버그 수정 및 시스템 고도화 이력을 시맨틱 버저닝(Semantic Versioning: `MAJOR.MINOR.PATCH`) 원칙에 따라 체계적으로 기록합니다.

---

## 📌 [v2.3.2] - 2026-10-03 (Latest)
* **분류**: `PATCH` (깃허브 자동 스크립트 구축, 8개 타깃 버전 자동 연동 체계, PC/Android/iOS 원클릭 설치 파일 생성, 실시간 자동 업데이트 및 레포지토리 정리)
* **공식 깃허브 계정 및 저장소**: `AhBiYout` / `grid-ip-scanner2`
* **배경 및 목적**:
  - 코드 푸시 시 버전 정보가 전체 코드베이스와 깃허브 릴리즈 태그에 누락 없이 자동 연동되는 완벽한 CI/CD 자동화 환경 구축.
  - PC용(포터블/인스톨러), 안드로이드 스마트폰(APK), 그리고 아이폰(iOS WebClip .mobileconfig 프로파일 & PWA)까지 전 플랫폼 지원 설치 파일 생성.
  - GitHub Releases API 기반 실시간 자동 업데이트 시스템 및 불필요한 파일이 깃허브에 커밋되지 않도록 레포지토리 전면 정리.
* **상세 변경 내역**:
  1. **깃허브 자동화 스크립트 및 지속적 버전 동기화 체계 (Single Source of Truth)**:
     - `scripts/github-sync.bat`, `github-push.bat`, `scripts/github-sync.sh`: Git 상태 점검, SSOT 버전 자동 동기화, 자동 커밋, 원격 푸시 및 릴리즈 태그(`vX.Y.Z`) 발행까지 원클릭으로 일괄 처리.
     - `scripts/sync-version.js`: 1회 실행으로 다음 8대 핵심 타깃을 전수 자동 동기화:
       ① `package.json` (`version`)
       ② `winres.json` (PE 리소스 및 File/ProductVersion `2.3.2.0`)
       ③ `installer/Grid_IP_Scanner2_Setup.iss` (`MyAppVersion`)
       ④ `App.tsx` (사이드바, 모바일 상단 바, 모달 내부 뱃지)
       ⑤ `services/updateChecker.ts` (`CURRENT_APP_VERSION = '2.3.2'`)
       ⑥ `docs/PATCH_NOTE.md` (최상단 패치노트 헤더)
       ⑦ `docs/README.md` (문서 허브 버전)
       ⑧ `docs/WorkLog.md` (작업 일지)
  2. **PC / Android 스마트폰 설치 및 배포 파일 생성 (아이폰 설치 파일 생성 보류)**:
     - **Windows PC**: 포터블 무설치 단일 바이너리(`Grid IP Scanner2 v2.3.2.exe`) 및 Inno Setup 6 공식 인스톨러(`Grid_IP_Scanner2_v2.3.2_Setup.exe`) 생성.
     - **Android 스마트폰**: `scripts/package-android.js`를 통해 네이티브 매니페스트와 웹 자산이 통합된 안드로이드 전용 APK(`Grid_IP_Scanner2_v2.3.2.apk`) 생성 파이프라인 구축.
     - **아이폰 (iOS)**: 사용자 요구사항에 따라 아이폰용 별도 설치 파일 생성은 당분간 배제하고 표준 반응형 모바일 웹 접속 방식으로 유지.
  3. **GitHub Releases 기반 실시간 자동 업데이트 시스템 구축**:
     - **인앱 업데이트 센터 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**: 앱 구동 시 GitHub Releases API를 조회하여 최신 릴리즈를 실시간 감지하고, 플랫폼별(PC 포터블, 인스톨러, 안드로이드 APK) 다운로드 링크 및 릴리즈 노트를 직관적 제공.
     - **콘솔 자동 업데이트 배치 (`scripts/auto-update.bat`)**: 5가지 선택 메뉴(포터블, 인스톨러, 안드로이드 APK, 브라우저 열기, 취소)를 제공하여 콘솔에서 즉시 최신 버전을 내려받도록 고도화.
     - **GitHub Actions 워크플로우 (`.github/workflows/build-and-release.yml`)**: `.exe`, `_Setup.exe`, `*.apk`, `*.zip`을 모두 자동 수집하여 GitHub Releases에 단일 패키지로 동시 배포.
  4. **깃허브 커밋 제외 파일 정밀 점검 및 `.gitignore` 전면 최적화**:
     - 약 216MB 크기의 임시 다운로드 Go 툴체인 디렉터리(`go/`, `go.zip`)가 소스코드에 포함되지 않도록 원천 차단.
     - 중복 락파일(`bun.lock`, `yarn.lock`, `pnpm-lock.yaml`) 및 이전 미사용 프로토타입 이미지 잔여물 정리.
     - 빌드 산출물(`dist/`, `dist_installer/`, `dist_electron/`, `build/`, `bin/`, `out/`, `release_assets/`, `release_files/`), 실행 바이너리(`*.exe`, `*.syso`, `*.dll`), 모바일 산출물(`*.apk`, `*.mobileconfig`, `*.ipa`)을 `.gitignore`에 등록하여 레포지토리 경량화 및 보안 유지.
  5. **바탕화면 및 시스템 리소스 256x256 멀티 레이어 마스터 아이콘 적용**:
     - Windows 탐색기 "아주 큰 아이콘" 모드 및 바탕화면 바로가기에서 선명하게 렌더링되도록 6개 해상도 레이어(16~256px) 마스터 ICO 연동.
     - 앱 내부 사이드바 브랜드 배너에 64px 대형 엠블럼과 엔진 상태 핑, 모바일 상단 바에 앱 로고 배치.
  6. **아이콘 여백 자동 감지 및 엣지-투-엣지(Edge-to-Edge) 꽉 찬 화면 최적화**:
     - 원본 소스 이미지(`Grid IP Scanner2.png`) 내부의 불필요한 투명 여백(184px 패딩)을 `pngjs` 알파 채널 경계 박스 자동 분석을 통해 완벽히 크롭.
     - 1:1 정방형 캔버스 중앙 정렬 및 고품질 바이리니어 리사이징을 적용하여, 여백 없이 꽉 찬 고화질 에셋(`logo.png`, `icon.png`, `icon_256.png`, `icon.ico` 등) 일괄 생성.
  7. **Node.js 네트워크 소켓 누수 방지 및 2단계 PE 바이너리 직접 패칭(PE Patching) 파이프라인**:
     - `png-to-ico` 변환 후 잔류 소켓 핸들을 자동으로 해제(`unref`)하여 자산 생성 및 빌드 스크립트 블로킹(Hang) 문제 해결.
     - `winres.json`: Windows 탐색기 최우선 순위 숫자 리소스 ID(`"#1"`) 및 `"APP"`을 `RT_GROUP_ICON`에 동시 등록.
     - `build-win.js`: `go-winres make`에 이어 `go build` 후 `go-winres patch --in winres.json`을 통한 2차 직접 PE 바이너리 리소스 주입 파이프라인 구축으로 탐색기 및 작업표시줄 아이콘 미표시 결함 완벽 해결.
  8. **인앱 UI 아이콘 풀 블리드(Full-Bleed) 꽉 찬 스타일링 전면 개편**:
     - `App.tsx`: 사이드바 브랜드 엠블럼, 모바일 헤더, 4대 모달(도움말, 라이선스, 인스톨러 안내, 업데이트 센터)의 내부 패딩(`p-1`) 및 어두운 여백 박스를 제거하고 `w-full h-full object-cover rounded-2xl ring-1 ring-cyan-500/30`으로 꽉 찬 시인성 극대화.

---

## 📌 [v2.3.1] - 2026-10-03
* **분류**: `PATCH` (모든 네트워크 어댑터 전수 탐색 및 다차원 필터, 모바일 2단 분리형 비잘림 헤더, GitHub CI/CD 파이프라인 구축)
* **공식 깃허브 계정 및 저장소**: `AhBiYout` / `grid-ip-scanner2`
* **배경 및 목적**:
  - 단일 활성 인터페이스 외에 시스템 내 모든 물리/가상/VPN/비활성 어댑터 정보 확인 및 필터링 요구 수용.
  - 스마트폰 모바일 화면에서 상단 컨트롤이 가로로 짤리는 UI/UX 결함 완전 해결.
  - 깃허브 코드 푸시 시 Windows PC(.exe/인스톨러)와 모바일 웹 산출물이 전자동 생성되도록 GitHub Actions CI/CD 구축.
* **상세 변경 내역**:
  1. **모든 네트워크 어댑터 전수 탐색 및 상세 메타데이터 수집 (`main.go`, `types.ts`)**:
     - `getAllInterfaces()` 함수를 전면 개편하여 `UP`/`DOWN` 연결 상태, 물리(LAN/Wi-Fi)/가상(WSL, Hyper-V, VMware, Docker)/VPN(Tailscale, WireGuard)/루프백 전수 수집.
     - IPv4 & CIDR 표기, IPv6, 하드웨어 MAC 주소, MTU 바이트 크기, 시스템 플래그, 기본 게이트웨이(`isDefault`) 구조화 제공.
  2. **다차원 필터 및 네트워크 어댑터 관리자 모달 구현 (`App.tsx`)**:
     - 카테고리 필터 탭 6종(`전체`, `활성 UP`, `물리 LAN/Wi-Fi`, `가상 VM/도커`, `VPN/가상망`, `IPv4 할당됨`) 및 실시간 검색 지원.
     - 전용 모달에서 IP/MAC/IPv6 원클릭 복사 및 `[🎯 이 대역으로 스캔 설정]` 원클릭 서브넷 연동.
  3. **모바일 장치 전용 2단 분리형 헤더 레이아웃 (`App.tsx`)**:
     - 데스크톱(`md:flex`)과 모바일(`md:hidden`) 헤더 완벽 분리.
     - 1행: 설정 메뉴 + 앱 타이틀 + 그리드/Diff 토글 + 라이선스 등급 + 테마 순환 버튼 + 도움말.
     - 2행: 전체 너비 검색창 + 정렬 드롭다운(`주소/상태/이름`) + `[KO|EN]` 언어 토글.
     - 3행: 스캔 실행 시에만 표시되는 전용 진행률 및 실시간 IP 서브바.
     - 스마트폰 화면(360px~412px)에서도 상단 내용 짤림 현상 0% 달성.
  4. **GitHub Actions 자동 빌드 & 릴리즈 워크플로우 구성 (`.github/workflows/build-and-release.yml`)**:
     - GitHub 계정(`AhBiYout`), 저장소(`grid-ip-scanner2`) 기반 CI/CD 파이프라인 탑재.
     - `build-windows`: Node.js 20 + Go 1.22 + Inno Setup 6 환경에서 `Grid IP Scanner2 v2.3.1.exe` 및 `Setup.exe` 자동 생성 및 아티팩트 업로드.
     - `build-web-mobile`: 모바일 반응형 웹 및 PWA 번들 자동 빌드.
  5. **GitHub 연동 가이드 및 작업 일지 공식 문서 등재**:
     - `docs/GITHUB_GUIDE.md` 및 `docs/WorkLog.md` 신설.

---

## 📌 [v2.3.0] - 2026-09-28
* **분류**: `MINOR` (스냅샷 Diff 비교 엔진, 심층 포트 보안 감사, A4 전문 감사 보고서, 라이선스 매니저 및 인스톨러 빌드 파이프라인 구축)
* **배경 및 목적**:
  - 무료/유료 듀얼 배포 및 선(先)개발 후 단계적 기능 개방(Feature Gate) 전략에 따라, 네트워크 엔지니어 및 기업 전산 관리자를 위한 핵심 Pro/Enterprise 기능을 단일 바이너리에 통합 구현하고 공식 인스톨러 툴체인을 완비함.
* **상세 변경 내역**:
  1. **스냅샷 비교(Diff) 엔진 및 실시간 변동 시각화 (`services/diffEngine.ts`, `components/IPCell.tsx`)**:
     - 현재 스캔 결과를 로컬 스냅샷(`localStorage`)으로 저장 및 관리.
     - 기준 스냅샷(Baseline) 대비 `신규 등장(+NEW)`, `오프라인 전환(-OFF)`, `MAC/호스트 변경(!CHG)` 장치를 16x16 그리드 맵 위에 실시간 뱃지로 직관적 시각화.
     - 그리드 상단에 원클릭 전환 뷰 모드 토글(`[16x16 그리드 뷰]` / `[스냅샷 비교 (Diff)]`) 및 진단 요약 바 탑재.
  2. **심층 포트 정밀 보안 감사 모듈 (`services/portScanner.ts`, `main.go`)**:
     - 25개 주요 서비스 포트(FTP 21, SSH 22, Telnet 23, SMTP 25, DNS 53, HTTP 80, SMB 445, MSSQL 1433, MySQL 3306, RDP 3389, PostgreSQL 5432, Redis 6379 등) 정밀 동시 점검.
     - Go 백엔드 `/api/portscan` 고속 엔드포인트 연동 및 위험도(HIGH/MEDIUM/SAFE) 분류 및 서비스 설명 자동 식별.
  3. **A4 규격 전문 네트워크 보안 감사 보고서 생성기 (`services/reportGenerator.ts`)**:
     - 기업 전산 보고용 A4 인쇄 및 PDF 저장 지원 HTML 감사 보고서 원클릭 생성.
     - 서브넷 통계, 하드웨어 제조사 점유율 표, 보안 취약 포트 개방 노드 목록, 상세 인벤토리 테이블 자동 렌더링.
  4. **비대칭 암호키 기반 오프라인 라이선스 및 기능 플래그 매니저 (`services/licenseManager.ts`, `types.ts`)**:
     - Community(Free), Pro, Enterprise 3단계 티어 구조화.
     - 인터넷 연결 없는 폐쇄망에서도 오프라인 키 인증 및 기능 해금 지원 (`GRID-PRO-TRIAL-2026` 테스트 키 지원).
  5. **Inno Setup 6 기반 정식 윈도우 인스톨러 패키징 툴체인 구축 (`installer/`)**:
     - `installer/Grid_IP_Scanner2_Setup.iss` (64비트 Program Files, 제어판 언인스톨러, 부팅 시 백그라운드 트레이 자동 실행, 방화벽 인바운드 예외 자동 등록).
     - `installer/build-installer.js` 및 `npm run build:installer` 자동 빌드 오케스트레이터 연동.
  6. **배포 전략 및 유료화 아키텍처 공식 사양서 등재**:
     - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md` 신설 및 `docs/README.md`, `docs/FILE_STRUCTURE_GUIDE.md` 색인 연동.

---

## 📌 [v2.2.3] - 2026-09-14
* **분류**: `PATCH` (OUI 자동 업데이트 차단 방어, 이중 미러링 구축 및 UI 상태/안내 메시지 세분화)
* **배경 및 목적**:
  - IEEE OUI 공식 서버(`standards-oui.ieee.org`)의 봇/스크래퍼 차단 정책(HTTP 418/차단)으로 인해 자동 업데이트 시 네트워크 정상 환경임에도 사용자가 '오프라인'으로 오인하는 결함 발생.
  - 일괄적인 에러 안내를 상황별(서버 오류, 방화벽 차단, 다운로드 진행 중, 캐시 활성 등)로 정밀하게 분리하고 데이터 소스 안정성을 보장하기 위함.
* **상세 변경 내역**:
  1. **IEEE 봇 차단 방어 및 표준 브라우저 헤더(User-Agent) 탑재 (`main.go`)**:
     - `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36` 표준 브라우저 식별 헤더를 요청 파이프라인에 탑재하여 IEEE 서버 차단을 완전 우회.
  2. **이중 미러링(Tiered Fallback) 자동 업데이트 파이프라인 구축 (`main.go`)**:
     - 1순위: Wireshark Automated Manuf (`https://www.wireshark.org/download/automated/data/manuf`, 58,000+건) 고속 동기화.
     - 2순위: IEEE 공식 대·중·소형 레지스트리(MA-L, MA-M, MA-S) 순차적 병렬 병합.
     - 외부망 통신 불가 시에도 무결성 검증을 거쳐 내장 `master_oui.txt`(90,168건)로 자가 복구(Self-Healing Fallback) 유지.
  3. **OUI DB 상태 배지 및 토스트 안내 메시지 세분화 (`App.tsx`)**:
     - 기존의 모호한 '온라인/오프라인' 표기를 `준비됨 (오프라인 내장)`, `최신 캐시 적용됨`, `동기화 중...`, `연결 끊김` 4단계로 세분화.
     - 다운로드 중, 외부망 통신 실패, 데이터 파싱 오류, 업데이트 성공 메시지를 구체적 사유와 함께 한국어/영어로 분리 제공.
  4. **OUI DB 파일 시스템 저장 위치 실시간 표기 기능 추가**:
     - 상세 모달(ⓘ)에서 현재 메모리에 적재된 실제 OUI 파일 경로(`ouiDatabaseLocation`, `%USERPROFILE%\.cisnet_grid\master_oui.txt`)를 즉시 확인 가능하도록 연동.
  5. **개발자 및 조직 공식 정보 전역 일원화**:
     - 개발자: `AhBiYout` (``)
     - 소속: `Cisnet` ([www.cisnet.co.kr](http://www.cisnet.co.kr/))
     - 공식 블로그: `ahbiyoutvibe.blogspot.com` ([ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/))
  6. **기술 문서 체계 보강**:
     - `docs/OUI_DATABASE_SPEC.md` (OUI DB 및 동기화 기술 명세서) 신설.
  7. **라이선스 및 프로그램 정보 규격 최신화**:
     - `LICENSE.md`, `docs/LICENSE.md`, `docs/GRID_IP_SCANNER_2.md`의 버전 표기를 `v2.2.3`으로 통일.
     - OUI 데이터 소스(IEEE MA-L/M/S, Wireshark Automated Manuf, Ringmast4r MIT DB) 귀속 명세 및 이중 미러링 법적 준수 사항을 전역 라이선스 문서와 `App.tsx` 도움말 모달에 보강 반영.
  8. **공식 블로그 배포 라벨(태그) 규격 확정**:
     - 구글 블로그 20개/200자 제한을 준수한 공식 16개 표준 태그(`Grid IP Scanner2,IP 스캐너,IP Scanner,네트워크 스캐너,Network Scanner,IP 스캔,IP Scan,MAC 추적,MAC Lookup,OUI 식별,OUI Lookup,포트 스캔,Port Scan,IP 관리,LAN 분석,LAN Tool`) 확정 및 문서 등재.

---

## 📌 [v2.2.2] - 2026-09-12
* **분류**: `PATCH` (기본 구동 포트 3031번 재지정 및 전역 빌드 파이프라인 동기화)
* **상세 변경 내역**:
  1. **시스템 기본 바인딩 포트 3031번 지정**:
     - Go 단독 백엔드 기본 실행 포트를 `3000`에서 `3031`로 변경 (`main.go`).
     - 모바일 연동 및 QR 코드 생성 모달(`MobileConnectModal.tsx`) 기본 포트를 `3031`로 동기화.
     - Windows 자동 빌드 스크립트(`build.bat`, `build-win.js`)의 대화형 기본 포트 설정을 `3031`로 갱신.
  2. **관련 기술 문서 및 사양서 전면 업데이트**:
     - `docs/PROPRIETARY_TECHNOLOGY.md`, `docs/GRID_IP_SCANNER_2.md`, `docs/FILE_STRUCTURE_GUIDE.md` 포트 명세 3031 동기화.

---

## 📌 [v2.2.1] - 2026-09-11
* **분류**: `PATCH` (하위 호환성을 유지하는 정적 DB 대규모 최신화 및 다중 비트 마스크 파서 개선)
* **상세 변경 내역**:
  1. **OUI Master Database 90,168건 전면 갱신**:
     - IEEE 공식 레지스트리 기반 최신 90,168개 하드웨어 제조사 레코드로 전격 교체 (`master_oui.txt`).
  2. **Wireshark 표준 다중 비트 마스크 파서 탑재 (`main.go`)**:
     - 24비트(MA-L), 28비트(MA-M `/28` - 7자리 16진수), 36비트(MA-S `/36` - 9자리 16진수) 슬래시 마스크 표기를 정확히 분해·색인하도록 Go 백엔드 파싱 로직 개선.
     - MAC 주소 조회 시 MA-S(9자리) ➡️ MA-M(7자리) ➡️ MA-L(6자리) 순서로 계층적 매칭을 수행하여 제조사 식별 정밀도 대폭 향상.
  3. **버전 관리 규정 및 문서 허브 구축**:
     - `docs/VERSIONING_POLICY.md` (SemVer 3단계 관리 표준 규정) 신설.
     - `docs/README.md` (중앙 문서 색인 허브) 신설 및 전체 기술 문서 동기화.

---

## 📌 [v2.2.0] - 2026-08-20
* **분류**: `MINOR` (5단계 스마트 적응형 런처, 비상 스캔 모드 및 프로세스 자가 회수 메커니즘 추가)
* **상세 변경 내역**:
  1. **구형 OS 및 WebView2 부재 환경 대응 5단계 스마트 적응형 런처 파이프라인 탑재**:
     - 1단계: `Microsoft Edge` 단독 앱 모드 (`--app=...`)
     - 2단계: `Google Chrome` 단독 앱 모드 (Windows 7/8.1 호환 Chrome 109 포함)
     - 3단계: `Naver Whale` / `Brave Browser` 앱 모드
     - 4단계: 시스템 기본 브라우저 연동 (`cmd /c start`, `rundll32 url.dll,FileProtocolHandler`)
     - 5단계: Win32 네이티브 대화상자(`user32.dll`) 및 비상 모드 진입
  2. **Windows 네이티브 비상 스캔 & 메모장 보고서 모드 (`notepad.exe`)**:
     - 브라우저가 없는 폐쇄망/구형 PC에서도 64개 멀티스레드 워커가 1~2초 만에 C클래스(/24) 대역 254개 IP를 고속 탐색.
     - 분석 결과를 바탕화면에 `Grid_IP_Scan_Result.txt`로 자동 저장하고 메모장으로 즉시 오픈.
  3. **모바일 및 타 PC 원격 웹 UI 접속 안내**:
     - 모니터가 없는 PC에서도 실제 로컬 IP(예: `http://192.168.0.15:3000`)를 자동 계산하여 네이티브 안내창에 표시.
  4. **백엔드 기동 미완료 시 503 프록시 에러 해결 (`waitForGoBackend`)**:
     - Express 서버 스타트업 파이프라인에 비동기 헬스 체크 루틴을 추가하여 초기 연결 실패 차단.
  5. **관리자 권한 재시작 프로세스 자가 포트 회수 (Safe Relaunch Engine)**:
     - UAC 권한 승인 시 이전 브라우저 샌드박스 인스턴스 및 백엔드 포트(3000번)를 안전하게 회수하여 소켓 충돌 방지.
  6. **네트워크 어댑터 수동 선택 상태 영속 유지 (`selectedInterfaceIpRef`)**:
     - 백엔드 상태 폴링 시 사용자가 직접 선택한 인터페이스가 리셋되지 않도록 방어 로직 적용.

---

## 📌 [v2.1.0] - 2026-07-15
* **분류**: `MINOR` (Capacitor 기반 모바일/안드로이드 네이티브 지원 및 이중 라이선스 체계 도입)
* **상세 변경 내역**:
  1. **Capacitor & Android 네이티브 지원 (`android/`)**:
     - 안드로이드 스마트폰 및 태블릿에서 독립적으로 구동 가능한 모바일 네트워크 스캐너 레이어 구축.
     - `WifiContextHelper.java`를 통한 모바일 서브넷 및 Wi-Fi SSID 자동 추출.
  2. **이중 라이선스(Dual Licensing) 정책 수립**:
     - 무상 GPL v3 커뮤니티 에디션과 독점 상용 라이선스(Commercial License) 체계 분리 (`docs/LICENSE.md`).
     - 하부 MIT 오픈소스 라이브러리의 상업적 재배포 및 유료 판매 권한 명세화.
  3. **다국어 및 테마 엔진 고도화**:
     - 한국어/영어 즉시 전환 및 3가지 커스텀 테마(Beige, Dark, Gray) 지원.

---

## 📌 [v2.0.0] - 2026-06-01
* **분류**: `MAJOR` (16x16 고유 그리드 맵 + Go 네이티브 하이브리드 아키텍처 전면 개편)
* **상세 변경 내역**:
  1. **16x16 인터랙티브 그리드 맵 UI 도입**:
     - C클래스(/24) 254개 전체 호스트 노드를 한눈에 직관적으로 파악 가능한 고유 매트릭스 레이어 설계.
  2. **Go 기반 멀티스레드 하이브리드 스캔 백엔드 구축**:
     - ICMP Ping, ARP 탐색, NetBIOS, mDNS, UPnP, SNMP, 주요 포트 스캔의 동시 병렬 처리.
  3. **Server-Sent Events (SSE) 실시간 스트리밍 파이프라인 탑재**:
     - 탐색된 노드 결과를 버퍼링 없이 프론트엔드로 1ms 내 실시간 브로드캐스팅.
  4. **보고서 내보내기 기능**:
     - EXCEL(XLSX) 및 JSON 형식의 네트워크 스캔 보고서 원클릭 다운로드 기능 지원.

---

## 🏛️ [Grid IP Scanner 1세대 (v1.x) 히스토리]

### 📌 [v1.5.0] - 2026-03-20
* **분류**: `MINOR` (1세대 최종 안정화 릴리즈 및 2세대 프로토타입 착수)
* **상세 변경 내역**:
  1. **초기 16x16 바둑판 매트릭스 그리드 레이아웃 프로토타입 시범 도입**:
     - 텍스트 표 형태에서 탈피하여 254개 IP를 시각적 격자 블록으로 표시하는 UI 레이아웃 실험 성공.
  2. **간이 OUI(MAC 제조사) 텍스트 파일 매핑**:
     - 약 15,000건의 기본 IEEE 24비트 OUI 텍스트 파일 연동 지원.
  3. **스캔 데이터 JSON 및 CSV 내보내기 지원**:
     - 진단된 활성 호스트 목록을 파일로 저장하는 기능 추가.
  4. **한계점 식별 및 2세대 개편 계기**:
     - 싱글 스레드 중심 처리로 인해 254개 전체 탐색 시 15~30초가 소요되는 성능 병목 발견 ➡️ Go 언어 네이티브 엔진 도입 계기 마련.

---

### 📌 [v1.3.0] - 2025-12-10
* **분류**: `MINOR` (포트 스캐닝 및 멀티 프로토콜 식별 기능 확장)
* **상세 변경 내역**:
  1. **주요 서비스 포트(Well-Known Ports) 간이 탐색 추가**: 80(HTTP), 443(HTTPS), 22(SSH), 3389(RDP), 445(SMB) 열림 여부 판별.
  2. **NetBIOS 컴퓨터 저장소 확인 연동**: UDP 137 포트를 질의하여 Windows PC의 호스트명 및 작업 그룹 자동 수집.
  3. **스캔 속도 단계 조절(Fast / Normal / Slow) 옵션 추가**.

---

### 📌 [v1.2.0] - 2025-09-18
* **분류**: `MINOR` (로컬 네트워크 인터페이스 자동 감지 및 서브넷 계산)
* **상세 변경 내역**:
  1. **네트워크 어댑터 자동 감지**: 활성화된 이더넷 및 Wi-Fi의 로컬 IP와 서브넷 마스크(255.255.255.0)를 읽어 시작 IP(1)와 끝 IP(254) 자동 계산.
  2. **ARP 캐시 테이블 파싱 강화**: 윈도우 `arp -a` 테이블을 읽어 통신 성공 IP의 MAC 주소 추출.
  3. **UI 다크 테마(Dark Theme) 기본 적용**.

---

### 📌 [v1.1.0] - 2025-06-15
* **분류**: `PATCH` (안정성 개선 및 비정상 응답 타임아웃 튜닝)
* **상세 변경 내역**:
  1. **ICMP Ping 타임아웃 미세 조정**: 패킷 손실이 잦은 Wi-Fi 환경에서의 응답 정확도 개선.
  2. **응답 없는 호스트 건너뛰기 로직 보강**: 스캔 멈춤 현상(Hang) 해결.
  3. **검색 필터 추가**: IP 주소, 활성 상태(Active/Dead), 호스트명 기준 실시간 목록 필터링.

---

### 📌 [v1.0.0] - 2025-04-01
* **분류**: `MAJOR` (Grid IP Scanner 1세대 최초 프로토타입 릴리즈)
* **상세 변경 내역**:
  1. **단순 C클래스 IP Ping 스캐너 최초 구현**: 순차 루프 기반으로 1~254번 IP에 ICMP Ping을 송신하여 응답 기기 목록을 텍스트 테이블(Table View)로 출력.
  2. **기본 동작 검증**: 사내망 공유기, 프린터, PC 활성화 상태 체크 기능 실현.

---
* **최종 문서 갱신 일자**: 2026년 9월 14일
* **문서 관리자**: AhBiYout (Grid IP Scanner2 개발팀 / [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/))
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
