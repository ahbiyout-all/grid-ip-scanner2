# Grid IP Scanner2
## 📋 기술 설명서 및 개발 백서 (Technical Documentation & Architecture Whitepaper)

본 문서는 **Grid IP Scanner2 (v2.3.2)**의 시스템 아키텍처, 16x16 시각화 그리드 맵, 스냅샷 비교(Diff) 엔진, 심층 포트 보안 감사, 오프라인 라이선스 아키텍처, 네트워크 어댑터 전수 탐색 시스템, 5단계 적응형 런처, 네이티브 비상 스캔 모드, Inno Setup 6 윈도우 인스톨러 툴체인, 그리고 최신 초고화질 아이콘 엣지-투-엣지 최적화 내역을 체계적으로 기술한 공식 제품 가이드입니다.

---

## 1. 프로젝트 개요 및 아키텍처

**Grid IP Scanner2**는 로컬 네트워크 대역(C클래스, `/24` 서브넷)의 모든 IP 주소(1~254)를 실시간으로 고속 탐색하여 시각적 **16x16 그리드 맵**으로 한눈에 파악할 수 있도록 설계된 고성능 올인원 네트워크 분석 및 보안 감사 도구입니다.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Grid IP Scanner2 System Flow                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  React 19 Frontend (SPA / PWA)  │     │  Go High-Performance Backend    │
│  - 16x16 Grid & Diff View       │◄────┤  - Multi-threaded Worker Pool   │
│  - Real-time State Batching     │ SSE │  - Raw ARP / ICMP / NetBIOS     │
│  - Adapter Multi-Filter Modal   │     │  - Deep Port Scan Engine        │
│  - Deep Port Audit / A4 Reports │────►│  - Tiered 90k+ OUI Engine       │
│  - Ed25519 Offline Licensing    │ API │  - 5-Tier Adaptive Launcher     │
│  - GitHub Live Update Center    │     │  - Safe Relaunch Engine         │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

* **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons를 사용하여 현대적인 사이버펑크 Slate 테마 기반의 반응형 UI를 제공합니다. UI 렌더링 블로킹을 차단하는 250ms 상태 배칭 버퍼 엔진과 수동 인터페이스 상태 보존 래퍼가 내장되어 있습니다.
* **Backend**: Go(Golang) 언어로 구현된 초고속 병렬 탐색 엔진입니다. 수백 개의 고루틴과 워커 풀(Worker Pool)을 가동해 ICMP Ping, ARP 탐색, NetBIOS(UDP 137), mDNS(UDP 5353), UPnP, SNMP 프로토콜을 병렬 탐색하며 결과를 Server-Sent Events (SSE)로 프론트엔드에 실시간 스트리밍합니다.
* **Adaptive 5-Tier Launcher**: 최신 Windows 11/10의 Edge 앱 모드, 구형 Windows 7/8.1의 Chrome/Whale 앱 모드, 시스템 기본 브라우저 연동, 브라우저가 전면 차단된 폐쇄망을 위한 Windows 시스템 네이티브 비상 스캔 모드(`user32.dll` + `notepad.exe` 보고서)까지 5단계 자동 폴백 파이프라인을 지원합니다.
* **Express & Go Sync Proxy (`server.ts`)**: 개발 및 가상 실행 모드에서 Node Express 서버가 Go 백엔드를 기동할 때 `/api/info` 헬스체크 응답을 대기(`waitForGoBackend`)한 후 프록시 통로를 개방함으로써 `ECONNREFUSED` 503 프록시 초기 구동 연결 에러를 완벽히 소멸시켰습니다.
* **Dual Distribution (Standalone & Installer)**: 단일 무설치 포터블(`.exe`) 및 Inno Setup 6 기반의 정식 윈도우 인스톨러(`Setup.exe`)를 동시 제공하며, 안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.3.2.apk`) 및 PWA 모바일 접속 모드를 지원합니다.

---

## 2. 주요 핵심 기능

### 📌 1. 16x16 시각화 그리드 맵 & 스냅샷 비교 (Diff) 엔진
* C클래스 `/24` 서브넷의 254개 전체 호스트를 16행 16열 바둑판 형태로 시각화.
* **스냅샷 Diff 비교 엔진 (`services/diffEngine.ts`)**:
  - 현재 스캔 결과를 로컬 스토리지에 스냅샷으로 저장 및 이전 스냅샷과 실시간 비교.
  - `신규 장치(+NEW)`, `오프라인 전환(-OFF)`, `MAC/호스트 변경(!CHG)`, `변화없음` 4가지 상태를 시각적 뱃지로 16x16 그리드 상에 동시 표기.
  - 상단 토글로 `[16x16 그리드 뷰]`와 `[스냅샷 비교 (Diff)]` 모드를 원클릭 전환.

### 📌 2. 심층 포트 정밀 보안 감사 및 A4 전문 보고서 생성기
* **25개 주요 서비스 포트 정밀 진단 (`services/portScanner.ts`)**:
  - FTP(21), SSH(22), Telnet(23), SMTP(25), DNS(53), HTTP(80), SMB(445), MSSQL(1433), MySQL(3306), RDP(3389), PostgreSQL(5432), Redis(6379) 등 주요 위험 포트 동시 검사.
  - 포트별 위험도(HIGH/MEDIUM/SAFE) 자동 분류 및 서비스 설명 자동 매핑.
* **A4 규격 전문 감사 보고서 (`services/reportGenerator.ts`)**:
  - 기업 전산 보고 및 보안 감사를 위한 A4 인쇄 및 PDF 저장을 지원하는 고품질 HTML 보고서 원클릭 생성.
  - 서브넷 통계, 하드웨어 제조사 점유율 표, 보안 취약 포트 노출 노드 목록, 상세 인벤토리 테이블 자동 렌더링.

### 📌 3. 비대칭 암호키 오프라인 라이선스 매니저
* **3단계 라이선스 티어**: Community(Free), Pro, Enterprise.
* **완전한 오프라인 라이선스 인증 (`services/licenseManager.ts`)**:
  - 인터넷이 없는 폐쇄망, 선박, 공장 자동화 환경에서도 비대칭 암호키(Ed25519) 기반 공개키 검증으로 안전하게 기능을 해금.
  - 개발자/엔지니어 테스트용 키(`GRID-PRO-TRIAL-2026`) 기본 내장 지원.

### 📌 4. 모든 네트워크 어댑터 전수 탐색 및 다차원 필터 시스템
* Go 백엔드 `getAllInterfaces()` 및 `InterfaceInfo` 구조체:
  - 시스템 내 모든 물리(이더넷, Wi-Fi), 가상(WSLg, Hyper-V, VMware, Docker), VPN(Tailscale, WireGuard), 루프백 어댑터의 UP/DOWN 상태, IPv4/CIDR, IPv6, MAC, MTU, 게이트웨이 플래그 전수 수집.
* 프론트엔드 다차원 필터 탭 6종(`전체`, `활성 UP`, `물리`, `가상`, `VPN`, `IPv4 보유`) 및 실시간 텍스트 검색 지원.
* 전용 [네트워크 어댑터 관리자] 모달에서 `[🎯 이 대역으로 스캔 설정]` 원클릭 서브넷 전환 연동.

### 📌 5. 모바일 2단 분리형 비잘림 헤더 레이아웃
* 데스크톱(`md:flex`)과 모바일(`md:hidden`) 헤더 아키텍처를 완전 분리하여 스마트폰 화면(360px~412px)에서도 상단 UI 가로 짤림 현상 0% 달성.
* 1단: 액션 바(설정, 타이틀, Diff 토글, 라이선스, 테마, 도움말).
* 2단: 유연한 전체 폭 검색창, 정렬 드롭다운(`주소/상태/이름`), 언어 토글(`[KO|EN]`).
* 3단: 스캔 시에만 나타나는 실시간 진행률(%) 및 진행 IP 서브바.

### 📌 6. GitHub Releases 기반 실시간 자동 업데이트 센터
* **인앱 업데이트 센터 (`services/updateChecker.ts`, `components/UpdateModal.tsx`)**:
  - 앱 구동 시 GitHub Releases API를 백그라운드 조회하여 새 버전을 실시간 감지.
  - 사이드바 및 모바일 상단 바에 `[🚀 새 버전 업데이트]` 펄스 뱃지 활성화.
  - Windows 포터블(.exe), 인스톨러(Setup.exe), 안드로이드(APK) 원클릭 다운로드 제공.
* **콘솔 자동 업데이트 배치 (`scripts/auto-update.bat`)**:
  - 대화형 콘솔 메뉴를 통해 원클릭으로 최신 패키지를 다운로드.

### 📌 7. 스마트 엣지-투-엣지(Edge-to-Edge) 아이콘 자동 크롭 & PE 바이너리 패칭
* 원본 소스 이미지의 불필요한 투명 여백(184px)을 `pngjs` 알파 채널 경계 박스 자동 분석을 통해 완벽히 크롭.
* 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 등 6개 전체 규격 마스터 ICO 무손실 생성.
* `winres.json`에 최우선 순위 숫자 리소스 ID(`"#1"`) 및 `"APP"` 등록.
* `build-win.js`에서 `go-winres make` 및 `go build` 후 `go-winres patch --in winres.json`을 통한 2차 직접 PE 리소스 주입 파이프라인으로 Windows 탐색기/작업표시줄 아이콘 미노출 결함 완벽 해결.
* 인앱 사이드바, 모바일 헤더, 4대 모달 로고를 여백 없이 꽉 찬 풀 블리드(Full-Bleed) 스타일로 리뉴얼.

### 📌 8. 5단계 스마트 적응형 런처 파이프라인
* 브라우저 환경을 자동 진단하여 최적 모드로 실행:
  - 1단계: `Microsoft Edge` 단독 앱 창 (`--app=http://localhost:3031`)
  - 2단계: `Google Chrome` 단독 앱 창 (구형 Win7/8.1 Chrome 109 호환)
  - 3단계: `Naver Whale` / `Brave Browser` 단독 앱 창
  - 4단계: 시스템 기본 브라우저 새 탭 실행
  - 5단계: 브라우저 부재 시 Windows 네이티브 대화상자(`user32.dll`) 출력

### 📌 9. 브라우저 부재 환경을 위한 네이티브 비상 스캔 & 메모장 보고서
* 브라우저가 전무한 환경에서도 64개 멀티스레드 워커가 C클래스 IP 대역을 고속 스캔하고 바탕화면에 `Grid_IP_Scan_Result.txt` 생성 후 윈도우 기본 메모장(`notepad.exe`) 자동 실행.

### 📌 10. 관리자 권한 재시작 프로세스 자동 정리 (Safe Relaunch Engine)
* UAC 권한 상승 시 기존 백엔드 프로세스뿐만 아니라 띄워져 있던 독립 앱 창(Edge 샌드박스 창)까지 충돌 없이 안전하게 자동 종료하고 관리자 모드 앱 하나만 새롭게 기동.

### 📌 11. IEEE 봇 차단 우회 및 이중 미러링 OUI 실시간 업데이트
* IEEE 서버의 봇 차단 정책(HTTP 418)을 표준 브라우저 User-Agent 헤더로 우회.
* Wireshark Automated Manuf(58,000+건) 1차 미러 및 IEEE MA-L/M/S 2차 미러를 연계한 이중 미러링 체계로 90,000건 이상의 하드웨어 제조사를 정밀 식별.

---

## 3. 세부 기술 문서 색인

* **[`docs/README.md`](./README.md)**: 전체 기술 문서 저장소 총괄 허브
* **[`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md)**: SemVer 3단계 버전 관리 규정
* **[`docs/PATCH_NOTE.md`](./PATCH_NOTE.md)**: 최신 v2.3.2 릴리즈 및 패치 이력
* **[`docs/WorkLog.md`](./WorkLog.md)**: 일자별 기술 개발 및 아키텍처 개편 일지
* **[`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md)**: 프로젝트 전체 디렉터리 및 컴포넌트 명세서
* **[`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md)**: 깃허브 연동 및 GitHub Actions CI/CD 명세서
* **[`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md)**: 포터블/인스톨러 배포 전략 및 유료화 사양서
* **[`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md)**: 15대 핵심 독점 기술 및 고유 엔진 명세서
* **[`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md)**: OUI 계층형 매칭 및 이중 미러링 기술 명세서
* **[`docs/LICENSE.md`](./LICENSE.md)**: GPL v3 커뮤니티 에디션 및 상용 독점 이중 라이선스 계약서

---

## 4. Windows 실행 파일 속성 메타데이터 명세 (PE Header)

Windows 탐색기에서 `Grid IP Scanner2 v2.3.2.exe` 우클릭 후 `[속성] -> [자세히]` 탭 규격입니다:

| 항목 (Field) | 설정 값 (Value) |
| :--- | :--- |
| **파일 설명 (FileDescription)** | `Grid IP Scanner2` |
| **파일 버전 (FileVersion)** | `2.3.2.0` |
| **제품 이름 (ProductName)** | `Grid IP Scanner2` |
| **제품 버전 (ProductVersion)** | `2.3.2.0` |
| **저작권 (LegalCopyright)** | `Copyright (C) 2025-2026 AhBiYout. All rights reserved.` |
| **원본 파일 이름 (OriginalFilename)** | `Grid IP Scanner2 v2.3.2.exe` |
| **내부 이름 (InternalName)** | `GridIPScanner2` |
| **회사 / 개발자 (CompanyName)** | `AhBiYout` |
| **상표 (LegalTrademarks)** | `Grid IP Scanner2` |
| **설명 / 주석 (Comments)** | `Grid IP Scanner2 - Advanced Network Scanner with Diff, Deep Port Audit, Live Update & 90k+ OUI Engine` |
| **지원 언어 (Language)** | `한국어 (0412) / English (0409) / Neutral (0000)` |

---

## 5. 제작자 및 버전 정보

* **소프트웨어 버전**: v2.3.3 (2026-10-06)
* **저작권**: Copyright (c) 2025-2026 AhBiYout  All rights reserved.
* **제작자 (Author)**: AhBiYout
* **공식 GitHub**: [github.com/AhBiYout/AhBiYout-all](https://github.com/AhBiYout/AhBiYout-all)
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
* **공식 기술 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
