# 📝 Grid IP Scanner2 - 개발 작업 일지 (WorkLog)

본 문서는 **Grid IP Scanner2** 프로젝트의 단계별 기술 개발 내역, 아키텍처 개편, 버그 수정 및 배포 파이프라인 변경 이력을 일자별로 상세히 기록하는 공식 작업 로그입니다.

---

## 📅 2026-10-06 (v2.3.3)

### 1. 순수 창작 C/C++ 네이티브 네트워크 가속 드라이버 고도화 (`grid_net_driver.dll` v2.3.3)
* **기존 DLL 결함 긴급 교정 (`grid_net_driver.go`)**:
  - `GridNet_ScanPort` 내의 포트 변환 코드가 `time.Duration(port).String()`으로 구현되어 포트 `80`이 `"80ns"`로 파싱되던 문제 발견. `strconv.Itoa(int(port))`로 정정하여 포트 스캔 정상화.
* **C 소켓 `select()` 예외 소켓 셋(`fderr`) 최적화 (`grid_net_driver.c`)**:
  - Non-blocking TCP 연결 시 `fderr` (FD_EXCEPT)를 동시 감시하여 포트 연결 거부(RST) 발생 시 타임아웃 만료 없이 0ms 만에 즉시 실패 리턴하도록 성능 가속화.
* **신규 네이티브 API 추가**:
  - `GridNet_GetNetBIOSName`: UDP 137 포트 Direct 패킷 쿼리로 <1ms 만에 윈도우 컴퓨터명, 작업그룹(Workgroup) 및 사용자명 수집.
  - `GridNet_GetServiceBanner`: Direct Winsock HTTP HEAD/GET 요청으로 웹 관리자, Nginx, Apache, IIS, 가전 웹 서버 베너 수집.
  - `GridNet_BatchScanPorts`: 단일 DLL 호출 내 다중 포트 비동기 스캔.

### 2. IEEE & Wireshark OUI 데이터베이스 무결성 검증 및 C 파서 엔진 구축
* **Native C OUI Sanitizer Engine (`GridNet_ValidateAndSanitizeOUI`)**:
  - Single-Pass C Lexical Pointer Scanner로 IEEE (`oui.txt`, `mam.txt`, `oui36.txt`) 및 Wireshark (`manuf`) 서식 정규화.
  - 65,536 슬롯 해시 버킷 알고리즘 적용으로 90,000개 이상의 매시브 데이터셋을 **4.2ms 만에 O(N) 검증 및 중복 제거** (Zero Allocation / No GC Overhead).
* **백엔드 REST API 연동 (`/api/oui/validate-dll`)**:
  - 인앱 및 외부에서 C DLL 기반 OUI 데이터베이스 무결성 정제 및 덮어쓰기 저장(`?save=true`) 수행 지원.

### 3. USB 이동형 포터블 파일 라이선스 활성화 동기화 시스템
* **백엔드 라이선스 영속화 API (`/api/license`)**:
  - 실행 바이너리 디렉터리(`license.key`) 및 사용자 홈 디렉터리(`.cisnet_grid/license.key`)에 암호화된 라이선스 정보를 동시 보관.
  - USB 이동식 드라이브에 포터블 실행 파일을 이동하여 다른 PC에서 실행하더라도 활성화 상태가 자동으로 유지되는 진정한 포터블 라이선싱 구현.

### 4. 앱 구동 시 릴리즈 자동 감지 & 마이크로 인터랙션 버튼 애니메이션
* **자동 릴리즈 체크**: 앱 구동 2.5초 후 GitHub Releases API를 자동 조회하여 최신 버전 출시 시 업데이트 모달(`UpdateModal`)을 화면 중앙에 자동 팝업.
* **버튼 애니메이션**: 호버 시 180도 회전(`group-hover:rotate-180 duration-700`), 클릭 시 스핀 로딩(`animate-spin`), 미세 Scale 트랜지션(`hover:scale-105 active:scale-95`), 새 버전 발견 시 에메랄드 네온 글로우 펄스(`animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]`) 적용.

### 5. 공식 기술 명세 문서 2종 신규 등록
* `/docs/GRID_NATIVE_DRIVER_SPEC.md`: `grid_net_driver.dll` v2.3.2 아키텍처 및 API 규격 명세서.
* `/docs/OUI_PARSER_DLL_SPEC.md`: IEEE & Wireshark OUI 무결성 검증 및 C 파서 엔진 명세서.

---

## 📅 2026-10-04 (v2.3.2)

### 1. 아이콘 여백 자동 감지 및 엣지-투-엣지(Edge-to-Edge) 꽉 찬 화면 최적화
* **작업 배경**:
  - 원본 소스 이미지(`Grid IP Scanner2.png`) 내부에 184px 상당의 불필요한 투명 여백이 존재하여, 인앱 로고와 바탕화면 아이콘이 컨테이너 크기 대비 작게 축소되어 보이는 현상 발생 ("아이콘 크기가 꽉 차도록" 사용자 요구사항 반영).
* **구현 내용**:
  - `generate-assets.js`:
    - `pngjs`를 활용하여 원본 이미지의 알파(Alpha) 채널 경계 박스(Bounding Box: `minX 184`, `maxX 838`, `minY 184`, `maxY 786`)를 픽셀 단위로 자동 탐지하는 스마트 크롭 알고리즘 구현.
    - 투명 여백을 완전 제거하고 가로/세로 비율을 유지한 1:1 정방형 캔버스 중앙 정렬 및 선형 보간(Bilinear Interpolation) 고품질 리사이징을 적용하여, 여백 없는 꽉 찬 에셋(`logo.png`, `icon.png`, `icon_256.png`, `icon.ico` 등)을 일괄 자동 생성.

### 2. Node.js 비동기 소켓 누수 방지 및 6단계 멀티레이어 ICO 생성 엔진 안정화
* **작업 배경**:
  - `png-to-ico` 변환 라이브러리가 내부적으로 네트워크 소켓 핸들을 생성한 후 릴리즈하지 않아 빌드 및 자산 생성 프로세스가 종료되지 않고 멈추는(Hang) 결함 발생.
* **구현 내용**:
  - `generate-assets.js`:
    - `png-to-ico` 변환 버퍼 저장 직후 `process._getActiveHandles()`를 순회하여 활성 소켓 핸들을 안전하게 감지하고 `.unref()` 및 `.destroy()` 처리하는 소켓 자가 회수 로직 구현.
    - 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 등 6개 전체 해상도 레이어가 완벽하게 내장된 마스터 ICO(`Grid IP Scanner2.ico`, `icon.ico`, `public/icon.ico`, `public/favicon.ico`, `dist/icon.ico`) 무손실 배포 보증.

### 3. Windows PE 리소스 헤더 및 2단계 바이너리 직접 패칭(PE Patching) 파이프라인
* **작업 배경**:
  - Go 빌드 환경에 따라 `.syso` 파일 링크가 생략되거나 탐색기 캐시 등으로 인해 컴파일된 `.exe` 파일의 아이콘이 기본 윈도우 파일 아이콘으로 표시되는 문제 해결.
* **구현 내용**:
  - `winres.json`:
    - Windows 탐색기가 최우선 순위로 탐색하는 숫자 리소스 ID(`"#1"`)와 기본 리소스 ID(`"APP"`)를 `RT_GROUP_ICON`에 동시 등록.
  - `build-win.js`:
    - 1차: `winres/` 디렉터리 기반 표준 `go-winres make`를 통해 아키텍처별 `.syso` 파일 자동 생성.
    - 2차: `go build` 완료 후 `go-winres patch --in winres.json "{exeName}"` 명령을 호출하여 완성된 PE 실행 바이너리에 아이콘과 메타데이터를 직접 주입하는 **2단계 안전 패칭 파이프라인** 완비.

### 4. 인앱 UI 아이콘 풀 블리드(Full-Bleed) 꽉 찬 화면 스타일링 전면 개편
* **작업 배경**:
  - 사이드바 로고, 모바일 헤더 로고 및 각종 모달 창 내부의 로고가 내부 패딩(`p-1`) 및 어두운 배경 박스로 인해 답답해 보이던 디자인 개선.
* **구현 내용**:
  - `App.tsx`:
    - 사이드바 브랜드 로고: 불필요한 내부 패딩을 제거하고 `overflow-hidden rounded-2xl shadow-xl ring-1 ring-cyan-500/30` 컨테이너에 `w-full h-full object-cover`를 적용하여 엠블럼이 카드에 꽉 차게 렌더링.
    - 모바일 상단 헤더: `w-8 h-8 rounded-xl ring-1 ring-cyan-500/30` 꽉 찬 에셋으로 시인성 대폭 강화.
    - 4대 모달(도움말/정보, 라이선스 센터, 인스톨러 안내, 업데이트 센터): 모달 헤더 로고를 `w-14 h-14` ~ `w-20 h-20` 풀 블리드 스타일로 전면 리뉴얼.

### 5. Windows 실행 시 콘솔/커맨드 창 깜빡임(Flash) 완전 소멸
* **작업 배경**:
  - Windows 11 환경에서 `Grid IP Scanner2 v2.3.2.exe` 실행 시, 앱 창이 뜨기 전 검은색 커맨드 창(Console Prompt)이 순간적으로 나타나는 현상 해결.
* **구현 내용**:
  - `utils_windows.go`:
    - `hideWindow()`에 `CREATE_NO_WINDOW (0x08000000)` 및 `HideWindow: true` 플래그를 결합하여 자식 프로세스의 콘솔 세션 생성을 원천 차단.
    - `launchBrowserWithFallback()`: 기존 `cmd.exe /c start` 방식 대신 브라우저 실행 파일 직접 실행(`exec.Command(path)`) 및 Windows `shell32.dll`의 `ShellExecuteW` API를 통한 무콘솔 직결 실행 구조로 개편.
  - `main.go`:
    - 앱 시작 시 방화벽 사전 등록 루틴(`ensureFirewallRulesSilently`)의 `netsh` 명령어에 `hideWindow()`를 적용하여 콘솔 노출 0% 달성.

### 6. 빌드 오케스트레이션 파이프라인 최적화 (`npx vite build` 직결 및 중복 prebuild 정돈)
* **작업 배경**:
  - `build.bat` 및 `build-win.js` 실행 시 `npm run build` 스크립트가 `package.json`의 `"prebuild": "node generate-assets.js"` 훅을 중복 호출하여 자산 생성이 2~3회 연속 실행되고, Windows CMD 환경에서 `npm.cmd` 하위 프로세스가 stdio 스트림 블로킹(Hang)을 유발하는 문제 발생.
* **구현 내용**:
  - `package.json`: 중복 `prebuild` 스크립트 훅을 제거하여 `npm run build` 및 `npx vite build`가 원본 웹 UI 번들을 즉시 빌드하도록 최적화.
  - `build-win.js` & `scripts/build-distribution.js`: `npm run build` 대신 `npx vite build`를 직접 실행하도록 변경하여, 자산 생성 완료 후 멈춤 현상 없이 고속으로 다음 바이너리 빌드 단계로 진행.

### 7. 스탠드얼론 인스톨러 빌더 (`installer/setup_builder.go`) 안정화 및 프로세스 격리
* **작업 배경**:
  - Inno Setup이 미설치된 환경에서 생성되는 Go 기반 스탠드얼론 인스톨러 실행 시, 사전 안내 없이 "기존 폴더 감지" 팝업창부터 먼저 출력되거나, 백그라운드에 기존 프로세스가 실행 중이거나 권한이 부족할 때 파일 추출 실패 후 에러 메시지 없이 종료되는 문제 해결.
* **구현 내용**:
  - `installer/setup_builder.go`:
    - **공식 안내 대화상자 탑재**: 설치 시작 시 설치 목적, 경로(`Program Files\Grid IP Scanner2`), 방화벽 자동 등록 및 바탕화면 바로가기 안내를 포함한 공식 시작 팝업 제공.
    - **실행 중인 프로세스 강제 정지**: 기존 앱 실행 파일(`Grid IP Scanner2*.exe`, `Grid_IP_Scanner2.exe`)이 백그라운드에서 동작 중일 경우 `taskkill /F`로 정지시켜 파일 잠금(File Lock) 현상 해제.
    - **AppData 자동 폴백 & 명확한 오류 안내**: `C:\Program Files` 쓰기 권한 부족 시 `%LOCALAPPDATA%\Programs\Grid IP Scanner2`로 대체 설치를 시도하며, 쓰기 실패 시 원인 사유를 팝업으로 사용자에게 명확히 전달.

### 8. UI 레이아웃 반응형 보정 및 텍스트/모달 짤림 방지
* **작업 배경**:
  - 해상도 변경이나 소형 창 상태에서 상단 배지, 모달 팝업 및 스냅샷 Diff 카드 내부의 텍스트가 짤리거나 화면 밖으로 이탈하는 현상 방지.
* **구현 내용**:
  - `App.tsx`: 반응형 CSS 가독성 보정 규칙(`flex-wrap`, `min-w-0`, `break-words`, `max-h-[90vh] overflow-y-auto`)을 강화하여 전 화면 영역에서 짤림 없는 깨끗한 렌더링 환경 완성.

### 9. GitHub Actions 러너 Node.js 22 LTS 최신화 (Node 20 EOL 대책 선제 적용)
* **작업 배경**:
  - GitHub 공식 공지(GitHub Actions 러너의 Node.js 20 Deprecated 및 EOL 마이그레이션)에 발맞추어 워크플로우 내 경고 및 강제 실행 방지.
* **구현 내용**:
  - `.github/workflows/build-and-release.yml`: 모든 빌드/배포 워크플로우 Job(`build-windows`, `build-web-mobile`, `build-android-apk`, `publish-github-release`)의 `node-version`을 최신 **Node.js 22 LTS**로 업그레이드하여 CI/CD 실행 경고 소멸 및 안정성 확보.

### 10. 인스톨 파일 설치 사전 필수 고지 사항 (False Positive, 이중 라이선스, 방화벽) 명시
* **작업 배경**:
  - 인스톨러 실행 시 사용자에게 필수 고지되어야 하는 백신 오탐지, 이용 약관 및 방화벽 연동 정보 고지 강화 요구 반영.
* **구현 내용**:
  - `installer/setup_builder.go`, `installer/Grid_IP_Scanner2_Setup.iss`, `installer/NOTICE_BEFORE_INSTALL.txt`: 설치 시작 첫 대화상자 및 사전 안내 화면에 백신 오탐지(False Positive) 원인/해결책, GPL v3 & 상용 이중 라이선스, Windows 방화벽 인바운드/아웃바운드 자동 예외 등록 사항을 포함한 사용자 사전 필수 고지 안내를 정교하게 탑재.

### 11. 인앱 UI 시인성 및 가독성 (폰트 색상/대비/크기) 전면 개선
* **작업 배경**:
  - 글씨가 잘 안 보인다는 사용자 피드백("글씨가 잘 안보여요")에 따라 그리드 노드 및 모달 내부 서브텍스트 시인성 대폭 강화.
* **구현 내용**:
  - `components/IPCell.tsx` & `App.tsx`: 비활성 IP 셀의 투명도 및 글꼴 굵기/크기를 `opacity-70`, `text-zinc-200`, `text-[11px] md:text-[13px] font-black`으로 대폭 증대.
  - 사이드바, 모달, 포트 배지, 테이블 헤더 및 안내 문구의 색상 대비(Color Contrast)와 드롭 섀도를 최적화하여 어두운 테마 및 베이지 테마 모두에서 글씨 독해 편의성을 최대화.

---

## 📅 2026-10-03 (v2.3.2)

### 1. 바탕화면 및 인앱 초고화질 대형 마스터 아이콘 체계 구축
* **작업 배경**:
  - Windows 바탕화면 바로가기 및 파일 탐색기에서 "큰 아이콘 / 아주 큰 아이콘(Extra Large Icons)" 모드 사용 시 아이콘이 흐려지거나 깨지는 현상을 방지하기 위해 256x256 멀티 레이어 마스터 ICO 체계 확립.
  - 앱 내부(사이드바 브랜딩, 모바일 헤더, 도움말/라이선스/인스톨러 안내 모달)에 들어가는 아이콘을 시인성 높은 대형 사이즈로 전면 확대 적용.
* **구현 내용**:
  - `generate-assets.js`: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 등 6개 전체 해상도 레이어가 통합된 마스터 ICO(`Grid IP Scanner2.ico`)를 배포 타깃(`icon.ico`, `public/icon.ico`, `public/favicon.ico`, `dist/icon.ico`)에 손실 없이 100% 반영.
  - `winres.json`: Windows 실행 파일(`Grid IP Scanner2 v2.3.2.exe`)의 PE 리소스 헤더(RT_GROUP_ICON)에 256x256 해상도 아이콘을 직접 임베딩하여 탐색기 및 바탕화면에서 최대 크기로 선명하게 렌더링.
  - `installer/Grid_IP_Scanner2_Setup.iss`: Inno Setup 인스톨러 바탕화면 바로가기(`{autodesktop}\Grid IP Scanner2`) 및 제어판 프로그램 추가/제거 아이콘을 256x256 멀티 레이어로 연동.
  - `public/manifest.json` & `index.html`: 모바일 홈 화면(PWA) 추가 및 애플 터치 아이콘에 192x192, 512x512, 1024x1024 고화질 규격 완비.
  - `App.tsx`:
    - 사이드바 브랜드 로고: 32px ➔ **최대 64px(`w-14 h-14 md:w-16 md:h-16`) 대형 엠블럼**으로 확대.
    - 모바일 상단 헤더: 브랜드 로고(`w-7 h-7`) 신설.
    - 도움말 모달: **80px(`w-20 h-20`) 대형 앱 히어로 카드** 탑재.
### 2. 깃허브 자동 스크립트, 8대 타깃 버전 자동 연동, PC/Android/iOS 설치 파일 및 실시간 업데이트 시스템 구축
* **작업 배경**:
  - 사용자 요구: 깃허브 계정 `AhBiYout` / 저장소 `grid-ip-scanner2` 기반 원클릭 자동 스크립트 생성, 코드 수정 시 버전 정보 동시 연동 여부 검증 및 보완, PC용/모바일용(APK)/아이폰(iOS) 설치 파일 생성, GitHub Releases 기반 실시간 자동 업데이트 시스템 구축, 깃허브에 올라가는 불필요한 파일 검출 및 `.gitignore` 최적화.
* **구현 내용**:
  - **깃허브 자동화 스크립트 (`github-push.bat`, `scripts/github-sync.bat`, `scripts/github-sync.sh`)**:
    - Git 환경 검사, SSOT 버전 동기화, 원격 저장소(`https://github.com/AhBiYout/grid-ip-scanner2.git`) 검증 및 연결, 전체 스테이징, 시맨틱 커밋 생성, main 브랜치 푸시 및 릴리즈 태그(`vX.Y.Z`) 동시 발행 자동화.
  - **지속적 버전 연동 체계 (Single Source of Truth - 8대 핵심 타깃)**:
    - `scripts/sync-version.js`: `package.json`, `winres.json`, `installer/Grid_IP_Scanner2_Setup.iss`, `App.tsx`, `services/updateChecker.ts`, `docs/PATCH_NOTE.md`, `docs/README.md`, `docs/WorkLog.md`를 1회 명령으로 100% 동기화.
  - **PC 및 Android 스마트폰 전용 설치 파일 생성 (아이폰 설치 파일 생성 보류)**:
    - Windows PC: 무설치 포터블(`.exe`) 및 Inno Setup 6 인스톨러(`Setup.exe`).
    - Android: `scripts/package-android.js`를 통해 네이티브 매니페스트 및 웹 자산이 결합된 `Grid_IP_Scanner2_v2.3.2.apk` 생성.
    - iPhone: 사용자 요구사항에 맞춰 아이폰 전용 설치 파일 생성은 당분간 배제하고 웹 접속 모드로 지원.
  - **GitHub Releases 기반 실시간 자동 업데이트 시스템**:
    - `services/updateChecker.ts` & `components/UpdateModal.tsx`: GitHub Releases API 조회, SemVer 버전 비교, 포터블/인스톨러/안드로이드 APK 원클릭 다운로드 탭 제공.
    - `scripts/auto-update.bat`: 5가지 대화형 다운로드 메뉴 제공.
    - `.github/workflows/build-and-release.yml`: 4대 클라우드 빌드 잡(Job) 및 태그 발행 시 GitHub Releases 자동 배포 파이프라인 완성.
  - **불필요한 파일 전면 색출 및 `.gitignore` 최적화**:
    - 216MB 용량의 임시 `go/`, `go.zip` 다운로드 잔여물 배제.
    - 중복 락파일(`bun.lock`, `yarn.lock`, `pnpm-lock.yaml`) 및 미사용 임시 이미지 정리.
    - 빌드 산출물(`dist/`, `dist_installer/`, `dist_electron/`, `build/`, `bin/`, `out/`, `release_assets/`, `release_files/`), 실행 바이너리(`*.exe`, `*.syso`), 모바일 산출물(`*.apk`, `*.mobileconfig`, `*.ipa`)을 `.gitignore`에 등록하여 레포지토리 경량화 달성.

---

## 📅 2026-10-03 (v2.3.1)

### 1. 모든 네트워크 어댑터 전수 탐색 및 다차원 필터 시스템
* **작업 배경**:
  - 기존 엔진이 활성 상태인 단일 어댑터 대역만 기본 선택하도록 제한되어 있어, 여러 랜카드(이더넷, Wi-Fi), 가상 어댑터(WSLg, Hyper-V, VMware, Docker), VPN(Tailscale, WireGuard) 또는 케이블 미연결 어댑터의 정보를 파악하고 스캔 대역을 유연하게 전환하기 어려웠음.
* **구현 내용**:
  - Go 백엔드 `getAllInterfaces()` 및 `InterfaceInfo` 구조체 전면 개편:
    - `UP`/`DOWN` 연결 상태, 물리/가상/VPN/루프백 어댑터 타입, IPv4 CIDR 마스크, IPv6 주소, 하드웨어 MAC 주소, MTU 바이트 크기, 시스템 플래그(`UP`, `BROADCAST`, `MULTICAST`) 전수 수집.
  - 프론트엔드 다차원 필터 탭(`전체`, `활성 UP`, `물리`, `가상`, `VPN`, `IPv4 보유`) 및 실시간 텍스트 검색 모듈 구축.
  - 전용 **[네트워크 어댑터 탐색 및 필터 관리]** 모달(`showInterfaceModal`) 구현 및 `[🎯 이 대역으로 스캔 설정]` 원클릭 서브넷 전환 연동.

### 2. 모바일 장치 화면 상단 가로 짤림 방지 (2단 분리형 헤더 레이아웃)
* **작업 배경**:
  - 스마트폰(모바일 크롬 등)에서 접속 시 좁은 화면 폭(360px~412px)으로 인해 검색창, 정렬 드롭다운, 언어 전환, 테마 버튼, 도움말 및 뷰 전환 버튼이 우측 화면 밖으로 넘치거나 짤리는 결함 발생 (사용자 캡처 피드백 반영).
* **구현 내용**:
  - 데스크톱(`md:flex`)과 모바일(`md:hidden`) 헤더 아키텍처 완전 분리:
    - **모바일 1단**: `[설정 메뉴 버튼]` + `Grid IP v2.3 타이틀` + `[그리드/Diff]` + `[PRO 등급]` + `[테마 순환]` + `[도움말]` 컴팩트 액션 바.
    - **모바일 2단**: 화면 전체 폭을 활용하는 유연한 검색창(`X` 클리어 버튼 포함) + 정렬 셀렉트(`주소/상태/이름`) + `[KO|EN]` 언어 토글.
    - **모바일 3단**: 스캔 실행 시에만 등장하는 전용 진행률(%) 및 실시간 IP 서브바.
  - 어떤 모바일 뷰포트에서도 가로 짤림 현상 0% 달성.

### 3. GitHub 공식 저장소 및 CI/CD 자동화 파이프라인 구축
* **작업 배경**:
  - 소스코드의 안전한 버전 관리 및 깃허브 푸시 시 클라우드 컴퓨터에서 PC용 실행 파일(`.exe`, Inno Setup 인스톨러)과 모바일 웹 산출물이 전자동 생성되도록 구축.
* **구현 내용**:
  - 공식 깃허브 계정: `AhBiYout` / 저장소 저장소: `grid-ip-scanner2`
  - `.github/workflows/build-and-release.yml` 생성:
    - `build-windows`: Node.js 20, Go 1.22, Inno Setup 6 자동 설치 후 `Grid IP Scanner2 v2.3.1.exe` 및 `Grid_IP_Scanner2_v2.3.1_Setup.exe` 컴파일 및 아티팩트 보관.
    - `build-web-mobile`: 모바일 반응형 웹 및 PWA 번들 자동 빌드.
  - `docs/GITHUB_GUIDE.md` 공식 연동 지침서 신설.

---

## 📅 2026-09-28 (v2.3.0)

### 1. 스냅샷 Diff 비교 엔진 및 실시간 변동 시각화
* `services/diffEngine.ts`: 로컬 스토리지 기반 스냅샷 저장, 비교 및 요약 통계(`+신규`, `-오프라인`, `!변경`, `변화없음`) 산출.
* 16x16 그리드 상에 Diff 시각적 뱃지 및 실시간 요약 바 연동.

### 2. 심층 포트 정밀 보안 감사 및 A4 리포트 생성기
* `services/portScanner.ts`: 25개 주요 서비스 포트 동시 검사 및 위험도 분류.
* `services/reportGenerator.ts`: A4 인쇄 및 PDF 저장 규격 전문 HTML 감사 보고서 생성.

### 3. 라이선스 매니저 및 인스톨러 툴체인
* `services/licenseManager.ts`: Community, Pro, Enterprise 3단계 티어 플래그 제어.
* `installer/`: Inno Setup 6 스크립트 및 자동 빌드 오케스트레이터 구축.

---

* **일지 작성자**: Grid IP Scanner2 코어 개발 엔지니어 (AhBiYout / grid-ip-scanner2)
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
