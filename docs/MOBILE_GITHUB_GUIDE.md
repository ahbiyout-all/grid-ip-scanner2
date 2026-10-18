# 📱 Grid IP Scanner2 모바일 버전 GitHub 배포 가이드

본 문서는 **Grid IP Scanner2 모바일 버전(Android APK & iOS/Web PWA)**을 GitHub 리포지토리 및 GitHub Actions를 통해 클라우드에서 일괄 빌드하고 릴리스하는 표준 파이프라인 가이드입니다.

---

## 🌟 단일 통합 저장소 기반 GitHub 자동 배포

별도의 복잡한 전용 업로드 폴더 없이, **메인 GitHub 리포지토리 하나로 PC와 모바일의 모든 릴리스가 자동 관리**됩니다.

* **공식 저장소**: `https://github.com/AhBiYout-all/grid-ip-scanner2`
* **배포 파일 목록 (Releases 탭)**:
  1. **`Grid_IP_Scanner2_v2.4.3_Setup.exe`**: Windows 정식 인스톨러
  2. **`Grid_IP_Scanner2_v2.4.3.apk`**: 안드로이드 스마트폰 설치 파일 (Native Go ARM64 엔진 내장)
  3. **`Grid_IP_Scanner2_v2.4.3_Mobile_PWA.zip`**: 모바일 웹 & iOS PWA 오프라인 패키지

---

## 🚀 배포 실행 방법

### 방법 1: 전체 통합 푸시 (PC + 모바일 동시 릴리스)
로컬 PC에서 아래 명령어를 실행하면, 소스코드가 GitHub에 깔끔하게 커밋되고 `v2.4.3` 릴리스가 생성됩니다:
```cmd
github-push.bat
:: 또는 npm run git:push
```
GitHub Actions가 클라우드 상에서 Windows 인스톨러, Android APK, Mobile PWA를 자동으로 빌드하여 GitHub Releases에 즉시 배포합니다.

### 방법 2: 모바일 전용 릴리스 태그 발행
모바일 버전만을 명시적으로 릴리스하고 싶으실 경우:
```cmd
npm run git:mobile
:: 또는 scripts\github-mobile-sync.bat
```
`mobile-v2.4.3` 태그가 발행되며, GitHub Actions의 `mobile-release.yml` 워크플로우가 동작하여 모바일 패키지만 독립적으로 릴리스합니다.

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
