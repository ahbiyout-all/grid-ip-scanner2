# 🐙 Grid IP Scanner2 - GitHub 연동 및 CI/CD 자동 배포 가이드 (v2.4.6)

본 문서는 **Grid IP Scanner2** 프로젝트를 공식 깃허브(GitHub) 저장소에 등록하고, **클린 소스코드 전용 `.gitignore` 격리 규칙** 및 **GitHub Actions 클라우드 파이프라인**을 통해 소스코드 푸시 시 PC용 설치 파일과 모바일 APK를 전자동으로 생성·배포하는 운영 지침서입니다.

---

## 📌 1. 공식 깃허브 계정 및 저장소 정보 (Repository Identity & Rules)

* **개발자 (Author)**: `AhBiYout`
* **깃허브 네임스페이스 (Organization & Namespace)**: `AhBiYout-all`
* **GitHub 저장소 (Repository Name)**: `grid-ip-scanner2`
* **GitHub 저장소 전체 경로**: `https://github.com/AhBiYout-all/grid-ip-scanner2`
* **공식 원격 저장소 URL**:
  * SSH 방식: `git@github.com:AhBiYout-all/grid-ip-scanner2.git`
  * HTTPS 방식: `https://github.com/AhBiYout-all/grid-ip-scanner2.git`
* **공식 이슈(Issues) URL**: `https://github.com/AhBiYout-all/grid-ip-scanner2/issues`
* **공식 릴리즈(Releases) URL**: `https://github.com/AhBiYout-all/grid-ip-scanner2/releases`
* **공식 구글 블로그**: `https://ahbiyoutvibe.blogspot.com/`
* **소속**: `https://www.cisnet.co.kr`
* **기본 브랜치 (Default Branch)**: `main`

---

## 🔒 2. 개인정보 보호 및 클린 소스 전용 `.gitignore` 원칙

원격 GitHub 저장소에는 **핵심 소스코드, 공식 문서, 설정 파일 및 빌드 도구만 선별 업로드**되며, 로컬 전용 파일이나 컴파일 산출물은 철저히 배제됩니다:

| 구분 | 포함 (GitHub 푸시 대상) ✅ | 제외 (원격 업로드 완전 차단) 🚫 |
| :--- | :--- | :--- |
| **푸시 스크립트** | *(없음 - 전면 비공개 유지)* | **`github-push.bat`**, **`scripts/github-sync.bat`**, **`scripts/github-mobile-sync.bat`**, **`*.sh`** |
| **소스 코드** | React/TS(`App.tsx`, `components/`, `services/`), Go 백엔드(`main.go`, `engine.go`), Electron(`main.js`), OUI DB(`master_oui.txt`), 리소스(`winres.json`, `public/`) | 임시 파일(`*.tmp`, `*.temp`), 백업 파일(`*.bak`) |
| **문서 및 설정** | **`README.md`**, **`LICENSE.md`**, **`docs/`** 전체 문서, **`package.json`**, **`tsconfig.json`**, **`vite.config.ts`**, **`.github/workflows/`** | **`.env`**, 개인 인증키(`*.key`, `*.pem`), IDE 설정(`.vscode/`, `.idea/`) |
| **빌드 스크립트** | **`build.bat`**, **`build.sh`**, **`build-win.js`**, **`generate-assets.js`**, **`installer/`**(Inno Setup 스크립트), **`scripts/build-distribution.js`**, **`scripts/sync-version.js`** | *(빌드 재현성을 위해 스크립트 자체는 포함)* |
| **빌드 산출물** | *(GitHub Releases 탭에서만 클라우드 자동 배포)* | **`dist/`**, **`dist_installer/`**, **`dist_releases/`**, **`*.exe`**, **`*.syso`**, **`*.apk`**, **`*.zip`**, **`engine_arm64`**, **`node_modules/`**, **`go/`** |

---

## 🚀 3. GitHub Actions 자동 빌드 파이프라인 명세 (`.github/workflows/build-and-release.yml`)

저장소에 코드를 `git push`하거나 새 버전 태그(예: `v2.4.6`)를 푸시하면 깃허브 클라우드 러너가 스스로 다음 빌드 잡(Job)을 수행합니다:

### 💻 Job 1: Windows PC 인스톨러 및 포터블 동시 듀얼 빌드 (`build-windows`)
* **구동 환경**: `windows-latest` 가상 머신
* **수행 절차**:
  1. `actions/checkout@v4`로 최신 소스코드 동기화
  2. Node.js v22 LTS 및 Go v1.22 런타임 자동 설치 & 캐싱
  3. `npm run build:exe` 실행 ➔ **무설치 포터블 바이너리(`Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.4.6_Portable.exe`) 컴파일**
  4. Inno Setup 6 자동 설치 및 `npm run build:installer` 실행 ➔ **정식 윈도우 인스톨러(`Grid_IP_Scanner2_v2.4.6_Setup.exe`) 자동 패키징** (제어판 프로그램 추가/제거 정식 등록 포함)

### 📱 Job 2: 모바일 웹 & iOS PWA 패키징 (`build-web-mobile`)
* **구동 환경**: `ubuntu-latest` 고속 컨테이너
* **수행 절차**:
  1. `npm run build`로 모바일 최적화 웹 PWA 번들 컴파일
  2. `node scripts/package-mobile.js` 실행 및 모바일 오프라인 zip 패키지 생성

### 🤖 Job 3: Android 스마트폰 설치 파일 빌드 (`build-android-apk`)
* **구동 환경**: `ubuntu-latest` + Node.js 22 LTS + Go 1.22 + Java 21 + Android SDK 35
* **수행 절차**:
  1. `chmod +x android/gradlew` 실행 권한 부여
  2. Go ARM64 네이티브 스캔 엔진 크로스 컴파일
  3. `assembleRelease` 또는 `assembleDebug` 실행 및 ZipAlign/서명 처리 ➔ **안드로이드 APK(`Grid_IP_Scanner2_v2.4.6.apk`) 패키징**

### 📦 Job 4: GitHub Releases 공식 릴리즈 자동 발행 (`publish-github-release`)
* **발동 조건**: `v*` 형태의 시맨틱 버전 태그 푸시 또는 main 브랜치 푸시
* **안전 가드**: `actions/download-artifact@v4`에 `continue-on-error: true` 적용으로 모바일 산출물 다운로드 실패 시에도 릴리스 중단 방지
* **첨부 릴리즈 파일**:
  1. `Grid_IP_Scanner2_v2.4.6_Setup.exe` (Windows 정식 인스톨러 - 제어판 등록)
  2. `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.4.6_Portable.exe` (Windows 단일 무설치 포터블)
  3. `Grid_IP_Scanner2_v2.4.6.apk` (안드로이드 스마트폰 직접 설치 파일)
  4. `Grid_IP_Scanner2_v2.4.6_Mobile_PWA.zip` (모바일 웹 & iOS PWA 패키지)
* 사용자가 `https://github.com/AhBiYout-all/grid-ip-scanner2/releases`에서 즉시 다운로드 가능

---

## 🔄 4. 지속적 버전 연동 (Single Source of Truth) 메커니즘

버전 불일치가 발생하지 않도록 **중앙 집중형 버전 동기화 엔진(`scripts/sync-version.js`)**이 탑재되어 있습니다:
* **단일 원천(SSOT)**: `package.json`의 `"version"`을 기준으로 삼거나, `node scripts/sync-version.js --bump-patch` 실행 시 1회 명령으로 다음 9개 대상이 동시 수정됩니다:
  1. `package.json`: `"version": "2.4.6"`
  2. `winres.json`: Windows 바이너리 메타데이터 및 PE 리소스 버전 정보 (`2.4.6.0`)
  3. `installer/Grid_IP_Scanner2_Setup.iss`: Inno Setup 인스톨러 스크립트 정의
  4. `App.tsx`: 사이드바, 모바일 상단 바, 모달 내부의 버전 뱃지 및 인스톨러 파일명
  5. `services/updateChecker.ts`: 실시간 릴리즈 비교 기준 버전
  6. `installer/setup_builder.go`: 내장 셋업 빌더 버전
  7. `docs/PATCH_NOTE.md`: 패치 노트 최상단 헤더 버전
  8. `docs/README.md`: 공식 문서 허브 최신 버전 표기
  9. `docs/WorkLog.md`: 개발 작업 일지 연동 확인

---

## ⚡ 5. GitHub Releases 기반 실시간 자동 업데이트 시스템

* **인앱 자동 감지 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**:
  - 앱 구동 2.5초 후 GitHub Releases API(`api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest`)를 백그라운드에서 실시간 조회.
  - 최신 릴리즈가 존재할 경우 **업데이트 알림 팝업창(UpdateModal) 자동 실행**.
  - 원클릭으로 최신 `Setup.exe` 다운로드 및 패치노트 확인 가능.
* **자동 업데이트 스크립트 (`scripts/auto-update.bat`)**:
  - 콘솔에서 최신 공식 인스톨러를 자동 다운로드받고 설치할 수 있는 자동화 배치 파일 제공.

---

## 💻 6. 로컬 동기화 및 푸시 방법

로컬 PC에서 아래 둘 중 하나를 실행하시면, 푸시 스크립트와 바이너리 없이 **순수 소스코드만 GitHub에 깨끗하게 업로드**되며 릴리스가 자동 트리거됩니다:
```cmd
:: 방법 1 (원클릭)
github-push.bat

:: 방법 2 (터미널)
npm run git:push
```
