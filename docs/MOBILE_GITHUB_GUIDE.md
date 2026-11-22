# 📱 Grid IP Scanner2 모바일 버전 GitHub 배포 가이드

본 문서는 **Grid IP Scanner2 모바일 버전(Android APK & iOS/Web PWA)**을 GitHub 리포지토리 및 GitHub Actions를 통해 클라우드에서 일괄 빌드하고 릴리스하는 표준 파이프라인 가이드입니다.

---

## 🌟 단일 통합 저장소 기반 GitHub 자동 배포

별도의 복잡한 전용 업로드 폴더 없이, **메인 GitHub 리포지토리 하나로 PC와 모바일의 모든 릴리스가 자동 관리**됩니다.

* **공식 저장소**: `https://github.com/AhBiYout-all/grid-ip-scanner2`
* **빌드 런타임**: GitHub Actions 최신 권장 **Node.js 24**, Java 21 (Temurin), Android SDK 35
* **배포 파일 목록 (Releases 탭)**:
  1. **`Grid_IP_Scanner2_v2.6.0_Setup.exe`**: Windows 정식 인스톨러 (제어판 등록 지원)
  2. **`Grid_IP_Scanner2_v2.6.0_Portable.exe`**: Windows 단일 무설치 포터블
  3. **`Grid_IP_Scanner2_v2.6.0.apk`**: 안드로이드 스마트폰 설치 파일 (Native Go ARM64 엔진 내장)
  4. **`Grid_IP_Scanner2_v2.6.0_Mobile_PWA.zip`**: 모바일 웹 & iOS PWA 오프라인 패키지

---

## 🚀 배포 실행 방법

### 방법 1: 전체 통합 푸시 (PC + 모바일 동시 릴리스)
표준 `git` 태그 푸시(또는 `.gitignore`에 의해 격리된 로컬 관리자 스크립트 `github-push.bat` / `npm run git:push`)를 실행하면 `v2.6.0` 릴리스가 생성됩니다:
```bash
git tag v2.6.0
git push origin main --tags
```
GitHub Actions가 클라우드 상에서 Windows 인스톨러, Android APK, Mobile PWA를 자동으로 빌드하여 GitHub Releases에 즉시 배포합니다.

### 방법 2: 모바일 전용 릴리스 태그 발행
모바일 버전만을 명시적으로 릴리스하고 싶으실 경우 `mobile-v*` 태그를 푸시하십시오 (로컬 관리자 환경에서는 `npm run git:mobile` / `scripts\github-mobile-sync.bat` 지원):
```bash
git tag mobile-v2.6.0
git push origin mobile-v2.6.0
```
`mobile-v2.6.0` 태그가 발행되며, GitHub Actions의 `mobile-release.yml` 워크플로우(Node.js 24)가 동작하여 모바일 패키지만 독립적으로 릴리스합니다.

> **참고**: GitHub Releases 배포 완료 시 `scripts/prune-old-release-assets.js`가 실행되어 **최신 3개 릴리즈**의 바이너리만 유지하고, 이전 릴리즈는 릴리즈 노트·이력·태그를 남긴 채 첨부 바이너리 파일만 자동 정리합니다.

---

## 📲 스마트폰 사용자 다운로드 및 실행 방법

### 1. 안드로이드 (Android APK)
1. GitHub 저장소의 **[Releases]** 페이지에서 `Grid_IP_Scanner2_v2.6.0.apk` 다운로드
2. 다운로드 완료 후 알림창을 터치하여 설치 (설정 -> '출처를 알 수 없는 앱 설치' 허용)
3. 홈 화면에 설치된 **Grid IP Scanner2** 아이콘을 눌러 네이티브 성능으로 실행

### 2. iPhone / iPad (iOS Safari PWA)
1. Safari 브라우저에서 배포된 모바일 웹 주소에 접속
2. 화면 하단 중앙의 **[공유(Share)]** 아이콘 터치
3. 메뉴에서 **[홈 화면에 추가 (Add to Home Screen)]** 터치
4. 홈 화면에 생성된 아이콘을 터치하면 주소창 없는 전체 화면 네이티브 앱으로 동작
