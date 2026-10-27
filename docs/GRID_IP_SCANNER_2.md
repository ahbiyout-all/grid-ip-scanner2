# Grid IP Scanner2
## 📋 기술 설명서 및 개발 백서 (Technical Documentation & Architecture Whitepaper)

본 문서는 **Grid IP Scanner2 (v2.4.6)**의 시스템 아키텍처, 16x16 시각화 그리드 맵, 정기 자동 네트워크 스캔 스케줄러, 딥 스냅샷 비교(Diff v2) 엔진 및 1:1 대조 스튜디오, 심층 포트 보안 감사, A4 최적화 PDF 보고서 생성 엔진, 오프라인 라이선스 아키텍처, 네트워크 어댑터 전수 탐색 시스템, 5단계 적응형 런처, 브라우저 번역 팝업 원천 차단, 네이티브 비상 스캔 모드, Inno Setup 6 윈도우 인스톨러 툴체인(제어판 언인스톨러 등록), 그리고 안드로이드 Core Splashscreen 모바일 배포 체계를 체계적으로 기술한 공식 제품 가이드입니다.

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
│  - 16x16 Grid & Deep Diff v2    │◄────┤  - Multi-threaded Worker Pool   │
│  - Scheduled Scan Ticker (5s)   │ SSE │  - Raw ARP / ICMP / NetBIOS     │
│  - 1:1 Side-by-Side Studio      │     │  - Deep Port Scan Engine        │
│  - Zero-Clipping Sub-Header     │     │  - Tiered 90k+ OUI Engine       │
│  - A4 Smart Pagination PDF      │────►│  - 5-Tier Adaptive Launcher     │
│  - Ed25519 Offline Licensing    │ API │  - Safe Relaunch Engine         │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

* **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons를 사용하여 현대적인 사이버펑크 Slate 테마 기반의 반응형 UI를 제공합니다. 5초 Ticker 백그라운드 정기 스케줄러(`schedulerService.ts`), 1:1 대조 스튜디오(`SnapshotDiffModal.tsx`), Zero-Clipping 고정 서브헤더, 2단계 폰트 확대 스위처(`[가 100%] ↔ [가⁺ 115%]`), UI 렌더링 블로킹을 차단하는 250ms 상태 배칭 버퍼 엔진이 내장되어 있습니다.
* **Backend**: Go(Golang) 언어로 구현된 초고속 병렬 탐색 엔진입니다. 수백 개의 고루틴과 워커 풀(Worker Pool)을 가동해 ICMP Ping, ARP 탐색, NetBIOS(UDP 137), mDNS(UDP 5353), UPnP, SNMP 프로토콜을 병렬 탐색하며 결과를 Server-Sent Events (SSE)로 프론트엔드에 실시간 스트리밍합니다.
* **Adaptive 5-Tier Launcher**: 최신 Windows 11/10의 Edge 앱 모드(`--disable-translate` 주입), 구형 Windows 7/8.1의 Chrome/Whale 앱 모드, 시스템 기본 브라우저 연동, 브라우저가 전면 차단된 폐쇄망을 위한 Windows 시스템 네이티브 비상 스캔 모드(`user32.dll` + `notepad.exe` 보고서)까지 5단계 자동 폴백 파이프라인을 지원합니다.
* **Dual Distribution (Standalone & Installer & Mobile)**: 단일 무설치 포터블(`.exe`) 및 Inno Setup 6 기반의 정식 윈도우 인스톨러(`Grid_IP_Scanner2_v2.4.6_Setup.exe`, 제어판 프로그램 추가/제거 등록)를 동시 제공하며, 안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.4.6.apk`, AndroidX Core Splashscreen 최적화) 및 PWA 모바일 접속 모드를 지원합니다.

---

## 2. 주요 핵심 기능

### 📌 1. 16x16 시각화 그리드 맵 & 딥 스냅샷 비교 (Diff v2) 1:1 대조 스튜디오
* C클래스 `/24` 서브넷의 254개 전체 호스트를 16행 16열 바둑판 형태로 시각화.
* **스냅샷 Diff 4색 상태 구분 체계 (`services/diffEngine.ts`, `components/IPCell.tsx`, `components/SnapshotDiffModal.tsx`)**:
  - 현재 스캔 결과와 과거 스냅샷 기준점을 대조하여 직관적인 4색 컬러 시스템으로 표시:
    - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 발광 + 펄스 애니메이션 핑 닷 + 고대비 테두리.
    - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 오프라인 빗금 패턴.
    - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지 (MAC 변조/IP 충돌 의심, 취약 포트 신규 노출 감지).
    - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 4개 메탈릭 베이스라인(하늘, 보라, 청록, 회색) 원클릭 스위처 지원.
  - **미할당 빈 IP 슬롯(245개) 완전 제외**: 장비가 없는 빈 슬롯을 `=SAME`에서 분리하여 실제 온라인 기준 장비만 정직하게 카운트.
  - **1:1 Side-by-Side 대조 스튜디오**: 과거 시점 A vs B 또는 실시간 스캔을 1:1로 나란히 비교, 실시간 검색, 보안 경보 탭, CSV 내보내기 지원.
  - **Zero-Clipping Sub-Header**: 스크롤 시에도 최상단 조작 버튼과 카운터 뱃지가 잘리지 않는 고정 레이어 아키텍처.

### 📌 2. 정기 자동 네트워크 스캔 스케줄러 (Automated Recurring Scan Scheduler)
* **주기적 무인 자동 스캔 (`services/schedulerService.ts`, `components/ScheduleModal.tsx`)**:
  - 10분, 15분, 30분, 1시간, 2시간, 6시간, 12시간, 24시간 야간점검 등 주기별 자동 스캔.
  - 5초 Ticker 백그라운드 타이머 및 수동 스캔 시 중복 실행을 막는 비지 락(Busy Lock) 안전 가드.
* **스냅샷 자동 아카이빙 (`[Auto-Sched]`)**:
  - 스케줄 완료 시 자동으로 시점별 스냅샷을 캡처하여 최대 25개까지 보관, Diff 모드에서 즉시 대조 가능.
* **실시간 카운트다운 헤더 배지**:
  - 메인 상단 헤더에 `⏰ 정기 스캔 ON (주기)` 원터치 인디케이터 배지를 통해 다음 스캔까지 남은 시간을 초 단위로 실시간 표시.

### 📌 2. 내보내기/리포트 드롭다운 메뉴 및 A4 최적화 스마트 페이지네이션 PDF 감사 보고서
* **통합 드롭다운 팝오버 메뉴 (`App.tsx`)**:
  - 툴바 공간을 절약하고 가독성을 높이기 위해 CSV, JSON 내보내기 및 A4 보안 감사 보고서 버튼을 단일 드롭다운 팝오버로 통합.
  - 외부 클릭 자동 닫힘 및 다크/베이지 테마 블러 스타일 적용.
* **25개 주요 서비스 포트 정밀 진단 (`services/portScanner.ts`)**:
  - FTP(21), SSH(22), Telnet(23), SMTP(25), DNS(53), HTTP(80), SMB(445), MSSQL(1433), MySQL(3306), RDP(3389), PostgreSQL(5432), Redis(6379) 등 주요 위험 포트 동시 검사.
  - 포트별 위험도(HIGH/MEDIUM/SAFE) 자동 분류 및 서비스 설명 자동 매핑.
* **A4 규격 스마트 페이지네이션 PDF 엔진 (`services/reportGenerator.ts`)**:
  - **Zero Row-Chopping**: 794px x 1123px (A4 1:1.4142)의 독립 페이지 단위 사전 분할로 페이지 경계면에서 테이블 행이나 글자가 반으로 잘리는 문제 완전 해소.
  - **11mm 프린터 안전 여백**: 일반 사무용 레이저/잉크젯 프린터 출력 시에도 가장자리 글자 잘림 없는 안전 여백 보장.
  - **동적 페이지 번호 및 공식 푸터**: 매 페이지 하단 `페이지 X / Y`, 기밀(CONFIDENTIAL) 등급, 배포처((주)씨아이에스넷), 개발사(AhBiYout) 메타데이터 정돈 표기.
  - **브라우저 직접 인쇄(Ctrl+P) 지원**: `@media print` 고해상도 스타일시트로 배경색과 뱃지 완벽 보존.

### 📌 3. 비대칭 암호키 오프라인 라이선스 매니저, 낯선 기기 감시 & WoL Pro 게이트 & 30일 체험권
* **3단계 라이선스 티어**: Community(Free), Pro, Enterprise.
* **낯선 기기 감시(Intruder Watch) Pro 에디션 게이팅 (`App.tsx`, `services/licenseManager.ts`)**:
  - 상단 툴바 [낯선 기기 감시] 버튼에 `PRO` 뱃지가 적용되며, Pro 라이선스 인증 시에만 60초 주기 무인 백그라운드 자동 스캔 및 데스크톱/사운드 침입 경보가 가동.
  - Free 티어 사용자가 토글 시 Pro 라이선스 안내 팝업 및 인증 모달 자동 연계.
  - 침입 단말기 선택 시 Pro 업그레이드 가이드와 정상 단말 화이트리스트 등록 기능 연동.
* **원격 부팅(Wake-on-LAN) Pro 에디션 게이팅 (`App.tsx`, `services/wolService.ts`)**:
  - Free 커뮤니티 버전에서는 무단 부팅 패킷 발송을 방지하기 위해 라이선스 잠금 모달로 유도.
  - 정품 Pro 라이선스 또는 30일 체험권 입력 시 `PRO 활성` 뱃지와 함께 대상 장비 MAC으로 UDP 9/7 매직 패킷 브로드캐스트 즉각 해금.
* **완전한 오프라인 라이선스 인증 (`services/licenseManager.ts`)**:
  - 인터넷이 없는 폐쇄망, 선박, 공장 자동화 환경에서도 비대칭 암호키(Ed25519) 기반 공개키 검증으로 안전하게 기능을 해금.
* **30일 Pro 체험 라이선스 자동 발급**:
  - 데모 Pro 키(`GRID-PRO-TRIAL-2026`, `GRID-PRO-DEMO`, `PRO-DEMO`, `DEMO-PRO` 등) 입력 시 활성화 일시 기준 **30일간의 Pro 사용권**(`expiresAt`)을 동적 계산하여 부여.
  - 30일 동안 낯선 기기 감시(Intruder Watch), 원격 부팅(WoL), Diff 비교, 심층 포트 스캔, 감사 리포트, 5개 서브넷 관리 권한을 무제한 체험 가능.

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

* **[`docs/README.md`](./README.md)**: 전체 기술 문서 저장소 총괄 허브 (v2.4.6)
* **[`docs/SCHEDULED_SCAN_SPEC.md`](./SCHEDULED_SCAN_SPEC.md)**: 정기 자동 네트워크 스캔 스케줄러 아키텍처 및 데이터 명세서 (신규)
* **[`docs/SNAPSHOT_DIFF_SPEC.md`](./SNAPSHOT_DIFF_SPEC.md)**: 딥 스냅샷 비교 엔진 v2, 1:1 대조 스튜디오 및 잘림 방지 서브헤더 기술 명세서
* **[`docs/GOOGLE_BLOGGER_POST.md`](./GOOGLE_BLOGGER_POST.md)**: 구글 블로거 포스팅 완벽 가이드 ([작성 모드] & [HTML 편집 모드])
* **[`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md)**: SemVer 3단계 버전 관리 규정
* **[`docs/PATCH_NOTE.md`](./PATCH_NOTE.md)**: 최신 v2.4.6 릴리즈 및 패치 이력
* **[`docs/WorkLog.md`](./WorkLog.md)**: 일자별 기술 개발 및 아키텍처 개편 일지 (v2.4.6)
* **[`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md)**: 프로젝트 전체 디렉터리 및 컴포넌트 명세서 (v2.4.6)
* **[`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md)**: 깃허브 연동 및 GitHub Actions CI/CD 명세서
* **[`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md)**: 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
* **[`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md)**: 포터블/인스톨러 배포 전략 및 유료화 사양서
* **[`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md)**: 15대 핵심 독점 기술 및 고유 엔진 명세서
* **[`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md)**: OUI 계층형 매칭 및 이중 미러링 기술 명세서
* **[`docs/LICENSE.md`](./LICENSE.md)**: GPL v3 커뮤니티 에디션 및 상용 독점 이중 라이선스 계약서

---

## 4. Windows 실행 파일 속성 메타데이터 명세 (PE Header)

Windows 탐색기에서 `Grid IP Scanner2.exe` / `Grid_IP_Scanner2_v2.4.6_Setup.exe` 우클릭 후 `[속성] -> [자세히]` 탭 규격입니다:

| 항목 (Field) | 설정 값 (Value) |
| :--- | :--- |
| **파일 설명 (FileDescription)** | `Grid IP Scanner2` |
| **파일 버전 (FileVersion)** | `2.4.6.0` |
| **제품 이름 (ProductName)** | `Grid IP Scanner2` |
| **제품 버전 (ProductVersion)** | `2.4.6.0` |
| **저작권 (LegalCopyright)** | `Copyright (C) 2025-2026 AhBiYout. All rights reserved.` |
| **원본 파일 이름 (OriginalFilename)** | `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_Setup.exe` |
| **내부 이름 (InternalName)** | `GridIPScanner2` |
| **회사 / 개발자 (CompanyName)** | `AhBiYout` |
| **상표 (LegalTrademarks)** | `Grid IP Scanner2` |
| **설명 / 주석 (Comments)** | `Grid IP Scanner2 - Advanced Network Scanner with Scheduler, Deep Diff Studio, A4 PDF & 90k+ OUI Engine` |
| **지원 언어 (Language)** | `한국어 (0412) / English (0409) / Neutral (0000)` |

---

## 5. 제작자 및 버전 정보

* **소프트웨어 버전**: v2.4.6 (2026-10-26)
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
* **제작자 (Author)**: AhBiYout
* **공식 배포사**: 씨아이에스넷 (Cisnet, [www.cisnet.co.kr](http://www.cisnet.co.kr))
* **공식 GitHub**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 기술 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
