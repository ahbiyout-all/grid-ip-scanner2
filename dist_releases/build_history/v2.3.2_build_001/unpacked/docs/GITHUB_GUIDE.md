# 🐙 Grid IP Scanner2 - GitHub 연동 및 CI/CD 자동 배포 가이드

본 문서는 **Grid IP Scanner2** 프로젝트를 공식 깃허브(GitHub) 저장소에 등록하고, **GitHub Actions 클라우드 파이프라인**을 통해 소스코드 푸시 시 PC용(.exe)과 모바일용 빌드 결과물을 전자동으로 생성·배포하는 운영 지침서입니다.

---

## 📌 1. 공식 깃허브 계정 및 저장소 정보 (Repository Identity)

* **GitHub 사용자 계정 (Account)**: `AhBiYout`
* **GitHub 저장소 저장소 (Repository Name)**: `grid-ip-scanner2`
* **원격 저장소 URL**:
  * SSH 방식: `git@github.com:AhBiYout/grid-ip-scanner2.git` (또는 `git@github.com:AhBiYout/grid-ip-scanner2.git`)
  * HTTPS 방식: `https://github.com/AhBiYout/grid-ip-scanner2.git` (또는 `https://github.com/AhBiYout/grid-ip-scanner2.git`)
* **기본 브랜치 (Default Branch)**: `main`
* **개발 브랜치 (Development Branch)**: `develop`

---

## 🚀 2. GitHub Actions 자동 빌드 파이프라인 명세 (`.github/workflows/build-and-release.yml`)

저장소에 코드를 `git push`하거나 새 버전 태그(예: `v2.3.2`)를 푸시하면 깃허브 클라우드 러너가 스스로 다음 4가지 빌드 잡(Job)을 수행합니다.

### 💻 Job 1: Windows PC 실행 파일 및 설치 패키지 자동 빌드 (`build-windows`)
* **구동 환경**: `windows-latest` 가상 머신
* **수행 절차**:
  1. `actions/checkout@v4`로 최신 소스코드 동기화
  2. Node.js v20 및 Go v1.22 런타임 자동 설치 & 캐싱
  3. `node scripts/sync-version.js`로 전체 파일의 버전 정보 자동 일치
  4. `npm run build:exe` 실행 ➔ **무설치 포터블 단일 실행 파일(`Grid IP Scanner2 v2.3.2.exe`) 자동 생성**
  5. Inno Setup 6 자동 설치 및 `npm run build:installer` 실행 ➔ **정식 윈도우 인스톨러(`Grid_IP_Scanner2_v2.3.2_Setup.exe`) 자동 패키징**
  6. 생성된 모든 `.exe` 산출물을 깃허브 아티팩트(`windows-binaries`)로 업로드

### 📱 Job 2: 모바일 웹 & PWA 배포 번들 빌드 (`build-web-mobile`)
* **구동 환경**: `ubuntu-latest` 고속 컨테이너
* **수행 절차**:
  1. `npm run build`로 스마트폰/태블릿 최적화 모바일 웹 SPA 번들 컴파일
  2. `node scripts/package-mobile.js` 실행:
     - **`Grid_IP_Scanner2_v2.3.2_Mobile_PWA.zip`**: 오프라인 지원 모바일 반응형 웹 PWA 패키지 아카이브 생성
  3. 스마트폰 모바일 브라우저를 통한 반응형 웹 접속 완벽 지원

### 🤖 Job 3: Android 스마트폰 설치 파일 빌드 (`build-android-apk`)
* **구동 환경**: `ubuntu-latest` + Java 17 Temurin
* **수행 절차**:
  1. 안드로이드 빌드 툴체인 및 Web 번들 구조 연동
  2. `node scripts/package-android.js` 실행 ➔ **안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.3.2.apk`) 생성**
  3. 생성된 APK 파일을 `android-binaries` 아티팩트로 업로드

### 📦 Job 4: GitHub Releases 공식 릴리즈 자동 발행 (`publish-github-release`)
* **발동 조건**: `v*` 형태의 시맨틱 버전 태그 푸시 시 자동 실행
* **수행 절차**:
  1. 위 3개 빌드 잡의 산출물(.exe, Setup.exe, .apk, .zip)을 자동 수집
  2. `softprops/action-gh-release@v2`를 통해 GitHub 공식 Releases에 자동 등록
  3. 전 세계 사용자가 `https://github.com/AhBiYout/grid-ip-scanner2/releases`에서 즉시 다운로드 가능

---

## 🔄 3. 지속적 버전 연동 (Single Source of Truth) 메커니즘

코드를 지속적으로 수정할 때 버전 불일치가 발생하지 않도록 **중앙 집중형 버전 동기화 엔진(`scripts/sync-version.js`)**이 탑재되어 있습니다:
* **단일 원천(SSOT)**: `package.json`의 `"version"`을 기준으로 삼거나, `node scripts/sync-version.js --bump-patch` 실행 시 1회 명령으로 다음 8개 파일이 동시 수정됩니다:
  1. `package.json`: `"version": "2.3.2"`
  2. `winres.json`: Windows 바이너리 메타데이터 및 PE 리소스 버전 정보 (`2.3.2.0`)
  3. `installer/Grid_IP_Scanner2_Setup.iss`: Inno Setup 인스톨러 스크립트 정의
  4. `App.tsx`: 사이드바, 모바일 상단 바, 모달 내부의 버전 뱃지 및 인스톨러 파일명
  5. `services/updateChecker.ts`: 실시간 릴리즈 비교 기준 버전 (`CURRENT_APP_VERSION = '2.3.2'`)
  6. `docs/PATCH_NOTE.md`: 패치 노트 최상단 헤더 버전
  7. `docs/README.md`: 공식 문서 허브 최신 버전 표기
  8. `docs/WorkLog.md`: 개발 작업 일지 연동 확인
* **원클릭 푸시 스크립트(`scripts/github-sync.bat` / `github-push.bat` / `scripts/github-sync.sh`)**:
  - 푸시 전 `node scripts/sync-version.js`를 자동 호출하여 변경된 버전이 모든 파일과 Git 태그(`vX.Y.Z`)에 100% 자동 동기화된 상태로 커밋 및 푸시됩니다.

---

## ⚡ 4. GitHub Releases 기반 실시간 자동 업데이트 시스템

사용자가 프로그램을 켜면 GitHub의 최신 릴리즈를 실시간 감지하여 원클릭으로 업데이트할 수 있는 풀스택 업데이트 체계가 구축되어 있습니다:
* **인앱 자동 감지 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**:
  - 앱 구동 시 GitHub Releases API(`api.github.com/repos/AhBiYout/grid-ip-scanner2/releases/latest`)를 백그라운드에서 주기적으로 조회.
  - 최신 릴리즈가 존재할 경우 사이드바 및 모바일 상단 바에 **`[🚀 새 버전 vX.X.X 업데이트]` 펄스 뱃지** 활성화.
  - 모달 클릭 시 변경점(Patch Notes)과 함께 Windows 포터블(.exe), 정식 인스톨러(Setup.exe), 안드로이드(APK) 다운로드 링크 원클릭 제공.
* **자동 업데이트 스크립트 (`scripts/auto-update.bat`)**:
  - 사용자가 콘솔에서 바로 실행하여 최신 `.exe`, `Setup.exe`, `APK`를 선택적으로 다운로드받고 설치할 수 있는 자동화 배치 파일 제공.

---

## 🧹 5. 깃허브 업로드 제외 파일 최적화 (.gitignore)

다음과 같은 불필요한 빌드 부산물이나 임시 바이너리가 깃허브에 올라가지 않도록 `.gitignore`를 전면 정비했습니다:
* 빌드 도구 체인 및 다운로드 잔여물: `go/`, `go.zip` (200MB가 넘는 로컬 임시 툴체인 배제)
* 중복 패키지 매니저 락파일: `bun.lock`, `yarn.lock`, `pnpm-lock.yaml` (표준 npm `package-lock.json`만 유지)
* 임시 테스트 바이너리: `gridscan-portable`, `test_bin`, `*.exe`, `*.syso`, `*.dll`, `*.so`
* 빌드 산출물: `dist/`, `dist_installer/`, `dist_electron/`, `build/`, `bin/`, `out/`, `release_assets/`, `release_files/`
* 모바일 산출물: `*.apk`, `*.aab`, `*.ipa`, `*.app`, `*.mobileconfig` (GitHub Actions에서 빌드되어 Releases로 배포)
* 툴체인 및 압축 아카이브: `*.zip`, `*.tar.gz`
* 환경 변수 및 임시 파일: `.env*`, `*.log`, `.DS_Store`, `Thumbs.db`, `desktop.ini`, `.idea/`, `.vscode/`

---

## 🛠️ 6. 깃허브 최초 소스 업로드 및 원클릭 푸시 절차 (Initial Push & Sync Guide)

### 방법 A: 원클릭 자동 스크립트 실행 (권장)
루트 경로에 배치된 원클릭 동기화 스크립트를 더블클릭하거나 터미널에서 실행하면 SSOT 버전 동기화, 커밋, 푸시 및 릴리즈 태그 생성이 전자동 완료됩니다:
```bash
# Windows 환경
github-push.bat
# 또는
scripts\github-sync.bat

# Linux / Mac / Git Bash 환경
bash scripts/github-sync.sh
```

### 방법 B: 수동 커밋 및 푸시 절차
로컬 터미널(Git Bash 또는 명령 프롬프트)에서 아래 명령어를 순서대로 실행합니다:

```bash
# 1. 로컬 저장소 초기화 (미초기화 상태인 경우)
git init

# 2. 모든 소스코드 스테이징 (.gitignore에 의해 무거운 node_modules 및 바이너리 자동 제외)
git add .

# 3. 초기 커밋 생성
git commit -m "feat: Grid IP Scanner2 v2.3.2 release with edge-to-edge icons, live update & PE patching"

# 4. 기본 브랜치 이름을 main으로 설정
git branch -M main

# 5. 원격 저장소 연결 (AhBiYout / grid-ip-scanner2)
git remote add origin https://github.com/AhBiYout/grid-ip-scanner2.git

# 6. 원격 저장소로 최초 푸시
git push -u origin main
```

---

## 🏷️ 7. 버전 릴리즈 태그 생성 및 자동 배포 (Release Tagging)

새로운 버전을 배포할 때는 태그(`vX.Y.Z`)를 발행하여 GitHub Releases에 자동 등록합니다:

```bash
# 버전 태그 생성 (SemVer 준수)
git tag -a v2.3.2 -m "Release v2.3.2: Edge-to-Edge Full-Bleed Icons, PE Resource Patching & Live Update"

# 태그를 원격 저장소에 푸시 (GitHub Actions Release 워크플로우 즉시 발동)
git push origin v2.3.2
```

푸시 후 **GitHub 웹페이지 ➔ [Actions] 탭**에서 빌드 과정을 실시간 모니터링할 수 있으며, 빌드가 완료되면 생성된 `.exe`, `_Setup.exe`, `*.apk`, `*.zip` 파일이 GitHub Releases에 동시 게시되어 전 세계 어디서든 바로 다운로드받을 수 있습니다.

---

## 🌿 8. 표준 브랜치 전략 (Git Branching Model)

1. **`main`**: 상용 제품으로 즉시 배포 가능한 완전 무결한 릴리즈 브랜치
2. **`develop`**: 차기 버전을 위한 통합 개발 브랜치
3. **`feature/*`**: 개별 신규 기능 단위 개발 브랜치 (예: `feature/multi-adapter-filter`)
4. **`hotfix/*`**: 배포된 상용 버전의 긴급 결함 수정 브랜치 (예: `hotfix/mobile-header-overflow`)

---

* **저작권**: Copyright (c) 2025-2026 AhBiYout (grid-ip-scanner2). All rights reserved.
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
* **공식 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)
