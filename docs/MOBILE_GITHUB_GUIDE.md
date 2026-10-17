# 📱 Grid IP Scanner2 모바일용 GitHub 생성 및 배포 완벽 가이드

본 문서는 **Grid IP Scanner2 모바일 버전(Android APK & iOS/Web PWA)**을 GitHub에 생성, 배포, 릴리스하는 2가지 최적화 방식을 설명합니다.

---

## 🌟 모바일 GitHub 배포 2가지 방식

### [방식 1] 메인 GitHub 리포지토리 Releases에 모바일 통합 배포 (가장 추천 ⭐)
* **리포지토리**: `https://github.com/AhBiYout-all/grid-ip-scanner2`
* **동작 원리**:
  - `git push` 또는 `scripts/github-sync.bat` 실행 시, GitHub Actions 클라우드 러너가 자동으로 Windows PC용 인스톨러뿐만 아니라 **안드로이드 APK 및 모바일 PWA 패키지를 함께 컴파일하여 GitHub Releases에 자동 등록**합니다.
* **배포 파일 목록**:
  1. `Grid_IP_Scanner2_v2.4.3_Setup.exe` (Windows 인스톨러)
  2. `Grid_IP_Scanner2_v2.4.3.apk` (안드로이드 스마트폰 설치 파일)
  3. `Grid_IP_Scanner2_v2.4.3_Mobile_PWA.zip` (모바일 웹 & iOS PWA 패키지)
* **모바일 전용 태그 릴리스**:
  - `scripts/github-mobile-sync.bat` 실행 후 `[1]`을 선택하면 `mobile-v2.4.3` 태그가 생성되며, 모바일 전용 릴리스가 GitHub에 즉시 독립 발행됩니다.

---

### [방식 2] 모바일 전용 독립 GitHub 리포지토리 생성 및 푸시
모바일 버전만을 위한 별도의 독립 GitHub 저장소(`grid-ip-scanner2-mobile`)를 운영하고 싶으실 때 사용하는 방식입니다.

1. **독립 모바일 리포지토리 자동 생성 스크립트 실행**:
   ```bash
   node scripts/export-mobile-repo.js
   ```
   - 이 명령어는 `dist_releases/mobile_repository/` 폴더에 모바일 전용 `package.json`, `index.html`, PWA manifest, 서비스 워커, 안드로이드 APK 및 `README.md`를 자동으로 생성합니다.
2. **독립 리포지토리 푸시 실행**:
   - `scripts/github-mobile-sync.bat` 실행 후 `[2] Push to Standalone Mobile Repository` 선택
   - 또는 `dist_releases/mobile_repository/push-to-github.bat`을 실행하여 GitHub 새 저장소(`AhBiYout-all/grid-ip-scanner2-mobile`)에 1-클릭으로 푸시합니다.

---

## ⚙️ 자동화 파이프라인 구성 내역

| 파일 경로 | 역할 및 설명 |
| :--- | :--- |
| **`.github/workflows/build-and-release.yml`** | 메인 브랜치 푸시 시 PC + 모바일(APK & PWA) 전체를 빌드하여 GitHub Releases에 동시 발행 |
| **`.github/workflows/mobile-release.yml`** | 모바일 태그(`mobile-v*`) 푸시 또는 Actions 탭에서 수동 실행(1-Click) 시 모바일 릴리스 독립 생성 |
| **`scripts/github-mobile-sync.bat`** | Windows 환경에서 모바일 패키징 및 GitHub 자동 태그/푸시를 지원하는 배치 스크립트 |
| **`scripts/export-mobile-repo.js`** | 독립 모바일 GitHub 저장소 패키지(`dist_releases/mobile_repository/`) 자동 생성기 |

---

## 📲 스마트폰 사용자 다운로드 및 실행 방법

### 1. 안드로이드 (Android APK)
1. GitHub 저장소의 **[Releases]** 페이지에서 `Grid_IP_Scanner2_v2.4.3.apk` 다운로드
2. 다운로드 완료 후 알림창을 터치하여 설치 (설정 -> '출처를 알 수 없는 앱 설치' 허용)
3. 홈 화면에 설치된 **Grid IP Scanner2** 아이콘을 눌러 네이티브 성능으로 실행

### 2. iPhone / iPad (iOS Safari PWA)
1. Safari 브라우저에서 배포된 모바일 웹 주소에 접속
2. 화면 하단 중앙의 **[공유(Share)]** 아이콘 터치
3. 메뉴에서 **[홈 화면에 추가 (Add to Home Screen)]** 터치
4. 홈 화면에 생성된 아이콘을 터치하면 주소창 없는 전체 화면 네이티브 앱으로 동작
