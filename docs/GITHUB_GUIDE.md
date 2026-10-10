# 🐙 Grid IP Scanner2 - GitHub 연동 및 CI/CD 자동 배포 가이드

본 문서는 **Grid IP Scanner2** 프로젝트를 공식 깃허브(GitHub) 저장소에 등록하고, **GitHub Actions 클라우드 파이프라인**을 통해 소스코드 푸시 시 PC용(.exe)과 모바일용 빌드 결과물을 전자동으로 생성·배포하는 운영 지침서입니다.

---

## 📌 1. 공식 깃허브 계정 및 저장소 정보 (Repository Identity & Rules)

* **개발자 (Author)**: `AhBiYout`
* **깃허브에서 사용하는 이름 (개발자명 / Organization & Namespace)**: `AhBiYout-all`
* **GitHub 저장소 (Repository Name)**: `grid-ip-scanner2` (기본 생성)
* **GitHub 저장소 전체 경로**: `https://github.com/AhBiYout-all/grid-ip-scanner2`
* **공식 원격 저장소 URL**:
  * SSH 방식: `git@github.com:AhBiYout-all/grid-ip-scanner2.git`
  * HTTPS 방식: `https://github.com/AhBiYout-all/grid-ip-scanner2.git`
* **공식 이슈(Issues) URL**: `https://github.com/AhBiYout-all/grid-ip-scanner2/issues`
* **공식 릴리즈(Releases) URL**: `https://github.com/AhBiYout-all/grid-ip-scanner2/releases`
* **공식 구글 블로그**: `https://ahbiyoutvibe.blogspot.com/`
* **소속**: `https://www.cisnet.co.kr`
* **기본 브랜치 (Default Branch)**: `main`
* **개발 브랜치 (Development Branch)**: `develop`

---

## 🔒 2. 개인정보 및 보안 준수 규칙 (Privacy & Secret Protection)
* **개인정보 및 개인 이메일 업로드 절대 금지**: 소스코드, 커밋 로그, 문서, 주석 내 개인 이메일이나 민감 자격증명이 포함되지 않도록 원천 차단합니다.
* **불필요한 파일 및 바이너리 업로드 방지 (`.gitignore`)**:
  - `node_modules/`, `go/`, `go.zip`, 로컬 빌드 부산물(`dist/`, `*.tmp`, `*.log`, `*.exe`, `*.apk`, `*.zip`) 및 `.env*` 파일 배제.
* **Releases 자산 배포 원칙**:
  - 깃허브 Releases에는 사용자가 즉시 설치할 수 있는 **정식 인스톨러 파일(`Grid_IP_Scanner2_vX.Y.Z_Setup.exe`)만 생성하여 첨부**합니다.

---

## 🚀 3. GitHub Actions 자동 빌드 파이프라인 명세 (`.github/workflows/build-and-release.yml`)

저장소에 코드를 `git push`하거나 새 버전 태그(예: `v2.4.0`)를 푸시하면 깃허브 클라우드 러너가 스스로 다음 빌드 잡(Job)을 수행합니다.

### 💻 Job 1: Windows PC 실행 파일 및 설치 패키지 자동 빌드 (`build-windows`)
* **구동 환경**: `windows-latest` 가상 머신
* **수행 절차**:
  1. `actions/checkout@v4`로 최신 소스코드 동기화
  2. Node.js v22 LTS 및 Go v1.22 런타임 자동 설치 & 캐싱
  3. `node scripts/sync-version.js`로 전체 파일의 버전 정보 자동 일치
  4. `npm run build:exe` 실행 ➔ 무설치 포터블 바이너리 생성
  5. Inno Setup 6 자동 설치 및 `npm run build:installer` 실행 ➔ **정식 윈도우 인스톨러(`Grid_IP_Scanner2_vX.Y.Z_Setup.exe`) 자동 패키징**
  6. 생성된 인스톨러 산출물을 깃허브 아티팩트로 업로드

### 📱 Job 2: 모바일 웹 & iOS PWA 패키징 (`build-web-mobile`)
* **구동 환경**: `ubuntu-latest` 고속 컨테이너
* **수행 절차**:
  1. `npm run build`로 스마트폰/태블릿/아이폰 최적화 모바일 반응형 웹 PWA 번들 컴파일
  2. `node scripts/package-mobile.js` 실행 및 모바일 패키징

### 🤖 Job 3: Android 스마트폰 설치 파일 빌드 (`build-android-apk`)
* **구동 환경**: `ubuntu-latest` + Go 1.22 + Java 17 Temurin
* **수행 절차**:
  1. ARM64 네이티브 스캔 엔진 크로스 컴파일 및 APK 패키징 구조 결합

### 📦 Job 4: GitHub Releases 공식 릴리즈 자동 발행 (`publish-github-release`)
* **발동 조건**: `v*` 형태의 시맨틱 버전 태그 푸시 또는 main 브랜치 푸시
* **첨부 자산 원칙**: **정식 인스톨 파일(`Grid_IP_Scanner2_v*_Setup.exe`)만 릴리즈 자산으로 첨부 등록**
* 전 세계 사용자가 `https://github.com/AhBiYout-all/grid-ip-scanner2/releases`에서 즉시 다운로드 가능

---

## 🔄 4. 지속적 버전 연동 (Single Source of Truth) 메커니즘

코드를 지속적으로 수정할 때 버전 불일치가 발생하지 않도록 **중앙 집중형 버전 동기화 엔진(`scripts/sync-version.js`)**이 탑재되어 있습니다:
* **단일 원천(SSOT)**: `package.json`의 `"version"`을 기준으로 삼거나, `node scripts/sync-version.js --bump-patch` 실행 시 1회 명령으로 다음 대상이 동시 수정됩니다:
  1. `package.json`: `"version": "2.4.0"`
  2. `winres.json`: Windows 바이너리 메타데이터 및 PE 리소스 버전 정보
  3. `installer/Grid_IP_Scanner2_Setup.iss`: Inno Setup 인스톨러 스크립트 정의
  4. `App.tsx`: 사이드바, 모바일 상단 바, 모달 내부의 버전 뱃지 및 인스톨러 파일명
  5. `services/updateChecker.ts`: 실시간 릴리즈 비교 기준 버전
  6. `docs/PATCH_NOTE.md`: 패치 노트 최상단 헤더 버전
  7. `docs/README.md`: 공식 문서 허브 최신 버전 표기
  8. `docs/WorkLog.md`: 개발 작업 일지 연동 확인
* **원클릭 푸시 스크립트(`scripts/github-sync.bat` / `github-push.bat` / `scripts/github-sync.sh`)**:
  - 푸시 전 `node scripts/sync-version.js`를 자동 호출하여 변경된 버전이 모든 파일과 Git 태그(`vX.Y.Z`)에 100% 자동 동기화된 상태로 커밋 및 푸시됩니다.

---

## ⚡ 5. GitHub Releases 기반 실시간 자동 업데이트 시스템

사용자가 프로그램을 켜면 GitHub의 최신 릴리즈를 실시간 감지하여 원클릭으로 업데이트할 수 있는 풀스택 업데이트 체계가 구축되어 있습니다:
* **인앱 자동 감지 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**:
  - 앱 구동 2.5초 후 GitHub Releases API(`api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest`)를 백그라운드에서 실시간 조회.
  - 최신 릴리즈가 존재할 경우 **업데이트 알림 팝업창(UpdateModal) 자동 실행**.
  - 팝업창 구성 요소:
    - **업데이트 확인 / 다운로드 버튼**: 정식 Windows 설치 파일(`Setup.exe`) 즉시 내려받기
    - **깃허브 경로**: 저장소(`github.com/AhBiYout-all/grid-ip-scanner2`) 및 릴리즈 페이지 바로가기 링크
    - **버전 정보**: 현재 버전(`v2.4.0`) vs 최신 버전(`vX.Y.Z`) 및 릴리즈 일자
    - **릴리즈 패치 노트**: 공식 GitHub Releases의 변경점 미리보기 제공
* **자동 업데이트 스크립트 (`scripts/auto-update.bat`)**:
  - 사용자가 콘솔에서 바로 실행하여 최신 공식 인스톨러를 자동 다운로드받고 설치할 수 있는 자동화 배치 파일 제공.

---

## 🧹 6. 깃허브 업로드 제외 파일 최적화 (.gitignore)

개인정보 보호 및 저장소 경량화를 위해 `.gitignore`에 다음 규칙을 철저히 적용합니다:
* 개인정보 및 시크릿: `.env`, `.env.*`
* 빌드 도구 체인 및 다운로드 잔여물: `go/`, `go.zip`
* 임시 테스트 바이너리 및 패키지: `*.exe`, `*.dll`, `*.so`, `*.apk`, `*.zip`, `node_modules/`
* 빌드 산출물: `dist/`, `dist_installer/`, `dist_electron/`, `release_assets/`, `release_files/`

---

## 🛠️ 7. 깃허브 최초 소스 업로드 및 원클릭 푸시 절차 (Initial Push & Sync Guide)

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

# 2. 모든 소스코드 스테이징 (.gitignore에 의해 개인정보 및 무거운 바이너리 자동 제외)
git add .

# 3. 초기 커밋 생성
git commit -m "feat: Grid IP Scanner2 v2.4.0 release with real-time update & auto CI/CD"

# 4. 기본 브랜치 이름을 main으로 설정
git branch -M main

# 5. 원격 저장소 연결 (AhBiYout-all / grid-ip-scanner2)
git remote add origin https://github.com/AhBiYout-all/grid-ip-scanner2.git

# 6. 원격 저장소로 최초 푸시
git push -u origin main
```

---

## 🏷️ 8. 버전 릴리즈 태그 생성 및 자동 배포 (Release Tagging)

새로운 버전을 배포할 때는 태그(`vX.Y.Z`)를 발행하여 GitHub Releases에 자동 등록합니다:

```bash
# 버전 태그 생성 (SemVer 준수)
git tag -a v2.4.0 -m "Release v2.4.0: Official Installer Pipeline & Real-Time Auto-Update"

# 태그를 원격 저장소에 푸시 (GitHub Actions Release 워크플로우 즉시 발동)
git push origin v2.4.0
```

---

* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
* **개발자**: AhBiYout
* **GitHub 저장소**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
* **공식 구글 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

