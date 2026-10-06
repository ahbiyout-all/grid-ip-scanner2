# 📚 Grid IP Scanner2 - 공식 기술 문서 저장소 (Documentation Hub)

본 `docs/` 폴더는 **Grid IP Scanner2**의 시스템 아키텍처, 독점 기술 명세, 시맨틱 버전 관리 규정, 릴리즈 패치 노트, 사용자 매뉴얼, 이중 라이선스 가이드를 종합 관리하는 중앙 문서 허브입니다.

---

## 🗂️ 문서 목차 (Document Index)

아래의 문서를 통해 Grid IP Scanner2의 모든 기술 사양과 개발 가이드를 확인하실 수 있습니다.

### 1. 📌 버전 관리 및 패치 기록
* **[소프트웨어 버전 관리 규정 (docs/VERSIONING_POLICY.md)](./VERSIONING_POLICY.md)**
  * Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`) 3단계 관리 원칙
  * 버전 승급 기준 (대규모 개편 / 기능 추가 / 버그 수정) 및 코드 특이점 발생 시 기록 규칙
* **[릴리즈 & 패치 노트 (docs/PATCH_NOTE.md)](./PATCH_NOTE.md)**
  * 최신 v2.3.3 버전을 포함한 전체 버전별 수정 내역, 버그 픽스, 신규 기능 추가 이력
* **[개발 작업 일지 (docs/WorkLog.md)](./WorkLog.md)**
  * 일자별 개발 내역, 아키텍처 개편 및 기능 구현 작업 로그 상세 기록

### 2. 📖 제품 매뉴얼 및 시스템 사양
* **[서비스 개요 및 제품 설명서 (docs/GRID_IP_SCANNER_2.md)](./GRID_IP_SCANNER_2.md)**
  * 제품 주요 기능, 16x16 그리드 맵 & 스냅샷 Diff 비교, 심층 포트 정밀 감사, A4 리포트, 오프라인 라이선스, 전체 어댑터 다차원 필터, 2단 모바일 헤더 및 UI 가이드
* **[OUI 데이터베이스 및 동기화 기술 명세서 (docs/OUI_DATABASE_SPEC.md)](./OUI_DATABASE_SPEC.md)**
  * 계층형 OUI 아키텍처(MA-S/M/L), IEEE 봇 차단 방어, 이중 미러링(Wireshark Manuf) 및 로컬 캐시 자가 복구 기술
* **[프로젝트 파일 구조 가이드 (docs/FILE_STRUCTURE_GUIDE.md)](./FILE_STRUCTURE_GUIDE.md)**
  * 루트 및 하위 디렉터리(`docs/`, `.github/`, `components/`, `services/`, `installer/`, `scripts/` 등) 전체 구조 및 역할 정의

### 3. 🔬 핵심 기술, 배포 전략, 네이티브 DLL 및 깃허브 CI/CD
* **[순수 창작 네이티브 네트워크 가속 드라이버 명세서 (docs/GRID_NATIVE_DRIVER_SPEC.md)](./GRID_NATIVE_DRIVER_SPEC.md)**
  * `grid_net_driver.dll` v2.3.2 아키텍처, Direct Win32 SendARP/IcmpSendEcho/Winsock 소켓 제어, 버그 수정 일지 및 벤치마크
* **[OUI 무결성 검증 및 파싱 최적화 DLL 명세서 (docs/OUI_PARSER_DLL_SPEC.md)](./OUI_PARSER_DLL_SPEC.md)**
  * IEEE & Wireshark OUI 무결성 검증 엔진, Single-Pass C Lexer, 65,536 해시 버킷 중복 제거 알고리즘 및 REST API 명세
* **[GitHub 연동 및 CI/CD 자동 배포 가이드 (docs/GITHUB_GUIDE.md)](./GITHUB_GUIDE.md)**
  * GitHub 계정(`ahbiyout-all`), 저장소(`grid-ip-scanner2`) 연동 규격
  * GitHub Actions 기반 Windows PC(.exe, Inno Setup 인스톨러), Android APK 및 모바일 웹 자동 빌드/릴리즈 파이프라인
* **[배포 전략 및 유료화 아키텍처 기술 사양서 (docs/DISTRIBUTION_AND_TIER_STRATEGY.md)](./DISTRIBUTION_AND_TIER_STRATEGY.md)**
  * 무료(포터블) vs 유료(인스톨러) 듀얼 배포 모델, Inno Setup 6 윈도우 인스톨러 규격, Ed25519 비대칭 암호키 오프라인 인증 및 기능 플래그 아키텍처
* **[독점 핵심 기술 명세서 (docs/PROPRIETARY_TECHNOLOGY.md)](./PROPRIETARY_TECHNOLOGY.md)**
  * 15대 핵심 기술 (스냅샷 Diff 비교 엔진, 25개 주요 포트 감사, A4 리포트 생성기, Ed25519 오프라인 라이선싱, 어댑터 전수 탐색, 엣지-투-엣지 아이콘 & PE 바이너리 패칭, 실시간 라이브 업데이트 등)
* **[이중 라이선스 명세서 (docs/LICENSE.md)](./LICENSE.md)**
  * GPL v3 (커뮤니티 에디션) & 상용 독점 라이선스 (Commercial Edition) 안내 및 하부 MIT 라이브러리 준수성

---

## 🔄 문서 유지보수 규칙
1. **신규 기능/모듈 추가 시**: 해당 기능에 대한 세부 명세 문서를 `docs/` 폴더에 즉시 작성하고 본 `README.md`에 등재합니다.
2. **코드 수정에 특이점 발생 시**: `docs/VERSIONING_POLICY.md`의 규칙에 따라 `docs/PATCH_NOTE.md`에 패치 기록을 추가하고 버전을 갱신합니다.
3. **버전 동기화**: `package.json`, `docs/PATCH_NOTE.md`, `build-win.js`의 버전 표기를 상시 일치시킵니다.

---

## 🏷️ 공식 배포 및 블로그 검색 태그 규격 (Official Blog Tags)
공식 기술 블로그([ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)) 게시 및 온라인 배포 시 사용하는 표준 키워드 라벨 규격입니다 (총 16개 / 공백·쉼표 포함 147자):

```text
Grid IP Scanner2,IP 스캐너,IP Scanner,네트워크 스캐너,Network Scanner,IP 스캔,IP Scan,MAC 추적,MAC Lookup,OUI 식별,OUI Lookup,포트 스캔,Port Scan,IP 관리,LAN 분석,LAN Tool
```

---
* **문서 허브 관리 부서**: Grid IP Scanner2 코어 개발 연구팀
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
* **공식 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)
* **저작권**: Copyright (c) 2025-2026 AhBiYout  All rights reserved.
