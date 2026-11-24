# 🌐 Grid IP Scanner2 (v2.6.0)

> **초고속 네트워크 IP 스캐닝, IP 충돌 탐지, A4 최적화 PDF 감사 보고서 및 낯선 기기 감지 시스템**  
> **High-Performance Network IP Scanner, Conflict Detector & Intruder Defense Suite**

---

## 📌 개요 (Overview)

**Grid IP Scanner2**는 C++/Go 기반의 고성능 네이티브 엔진과 React 19 / Vite 기반의 직관적인 사용자 인터페이스를 결합한 종합 네트워크 관리 및 보안 모니터링 솔루션입니다.  
로컬 네트워크(LAN) 내 활성 기기 탐지, MAC 주소 기반 제조사 분석, IP/MAC 충돌 탐지, **Soft Trust 유예 기간을 지원하는 낯선 기기 감시 모드**, 그리고 **A4 규격에 완벽히 맞춘 고품질 PDF 보안 감사 보고서 출력 엔진**을 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

1. **⚡ 초고속 네트워크 IP 스캐닝, 16x16 그리드 맵 & 3계층 인터랙티브 토폴로지**
   - Go 기반 멀티스레드 Ping/ARP/mDNS 스캐닝 엔진 (254개 전체 호스트 동시 진단)
   - 9만 건 이상의 IEEE/Wireshark OUI 마스터 DB를 통한 MAC 제조사 즉각 식별
   - 25개 주요 서비스 포트 정밀 스캐닝·위험도 분류 및 **Listening Ports 클릭 빠른 연결(`QuickConnectModal.tsx`, 프로토콜별 아이콘·URI 복사·원격 실행 제안)**
   - **🗺️ 3계층 인터랙티브 토폴로지 맵 (`Grid` / `Topology Map` / `Snapshot Diff`)**: `POST /api/topology-map` 및 `grid_topology_guard.dll`(`v2.6.1`)과 연계해 Gateway/Core -> L2·Proxy-ARP·보안 그룹 -> 단말 노드 계층을 SVG 줌/팬으로 시각화하고, Pro 티어에서 **Topology Security Correlation (충돌·스푸핑·위험 포트·침입 교차 분석)** 제공
   - **🔬 네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`)**: 장치 상세 프로필 패널에서 원클릭으로 **TTL/초기 TTL/추정 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), Window 힌트, OS 추정(신뢰도) 및 Live ARP 정합성 검증** 수행
   - **🌐 온디맨드 다중 서브넷 & VLAN 통합 대시보드 (`MultiSubnetBar`, `MultiSubnetModal`)**: 평소에는 깔끔한 단일 대역 UI를 유지하고 상단 **`다중 서브넷·VLAN`**(`VLAN`) 활성화 버튼을 누를 때(또는 Batch Sweep 중) 즉시 표시되며, **활성 프로필 VLAN Tag ID 인디케이터(`활성 태그` + 프로파일별 컬러 태그 뱃지)**, 로컬 NIC/VLAN CIDR 자동 탐색(`/api/subnets/discover`), 서브넷별 독립 결과 캐싱, **Free 최대 2개 대역 전환**, **Pro(5대역)/Enterprise(무제한) 순차 일괄 스윕(Batch Sweep) 및 교차 대역 이상 징후 통합 관제** 지원
   - **🏷️ UPnP/SSDP XML & mDNS 실제 제조사 정밀 판별 & OUI 시맨틱 분류 + LAA 랜덤 MAC 역추적**: OUI + 개방 포트 + mDNS + UPnP 복합 점수 시맨틱 분류(`services/ouiClassifier.ts`), 사설 랜덤 MAC(LAA) 교차 역추적 및 신뢰도/판별 근거 UI 표기
   - **📋 원클릭 IP 주소 복사 (Clipboard API)**: 장치 상세 프로필 패널에서 한 번의 클릭으로 선택한 IP 주소를 클립보드에 완벽 복사 (Clipboard API & Fallback 지원)
   - **🛡️ Windows 인스톨러 UAC 권한 승계 & 12대 네이티브 DLL 분리 설치**: Inno Setup 6 커널 UAC 권한 승계(`runascurrentuser`) 및 포그라운드 무클릭 자동 업그레이드·12대 C/C++ DLL 분리 배치로 백신 오탐지 예방
   - **🚦 3단계 시맨틱 버저닝(SemVer) 및 10대 SSOT 자동 동기화**: MAJOR.MINOR.PATCH 원칙 수립 및 구글 블로거/깃허브 배포 자산 표준 관리 (`v2.6.0`)

2. **📄 통합 보고서 센터 & Free 5시트 엑셀 그리드 + A4 PDF 엔진 (`components/ReportCenterModal.tsx`, `services/reportCenterService.ts`, `services/reportGenerator.ts`)**
   - **Free 티어 엑셀 그리드(.xls) 전면 개방**: 16x16 IP 맵 시트를 포함한 **5시트 다중 시트 Excel XML(.xls)** 및 CSV·JSON·Markdown 보고서를 Free 커뮤니티 에디션에서 바로 내보내기 가능
   - **다중 포맷 통합 내보내기 센터**: Pro A4 PDF 보안 감사 보고서, 인쇄/그리드 HTML 및 스냅샷 Diff 연계를 전용 모달로 통합
   - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율) 독립 페이지 모델 및 11mm 안전 여백으로 테이블 행·텍스트 줄 잘림 원천 방지
   - **동적 페이지 번호 & 직접 인쇄**: 모든 페이지에 `페이지 X / Y` 및 공식 푸터 동기화, `@media print` 고해상도 스타일시트 지원

3. **📸 딥 스냅샷 비교 엔진(Deep Diff v2) & 1:1 대조 스튜디오 (`components/SnapshotDiffModal.tsx`)**
   - **임의 시점 간 1:1 자유 교차 대조**: 보관된 스냅샷 2개 간(A ↔ B) 또는 실시간 스캔과 자유롭게 교차 비교 및 1클릭 소스 맞바꿈(Swap)
   - **다각도 심층 변동 진단 (Deep Vector)**: MAC 주소 변경(IP 충돌/ARP 스푸핑 경보), 양방향 포트 집합 변경 및 취약 포트(21, 23, 445, 3389 등) 노출 경보, RTT 급변 감지
   - **1:1 Side-by-Side 대조 테이블**: 전수 노드 상태/MAC/포트 나란히 대조 및 엑셀 CSV 원클릭 내보내기, 클립보드 서식 요약 복사
   - **잘림 없는 고정 서브헤더 툴바**: 스크롤 간섭 없는 독립 서브헤더 배치로 상단 잘림 원천 방지 및 극상의 공간 활용성 제공
   - **4색 컬러 진단**: 🟢 신규 접속(`+NEW`), 🔴 오프라인(`-OFF`), 🟠 식별자/포트 변동(`!CHG`), 🔵 기준 유지(`=SAME`) 실시간 카운터 및 필터링

4. **⏰ 정기 자동 네트워크 스캔 스케줄러 (`services/schedulerService.ts`, `components/ScheduleModal.tsx`)**
   - **무인 백그라운드 주기적 스캔**: 15분, 30분, 1시간, 2시간, 6시간, 12시간, 매일/매주 및 사용자 지정 분 단위 주기 자동 실행
   - **5초 Ticker · Busy Lock & 트레이 일시정지 제어**: 수동 스캔 시 중복 방지 안전 가드, 트레이/UI 양방향 **일시정지·재개 및 즉시 실행(`run_schedule_now`)** 제어
   - **스냅샷 자동 캡처 (`[Auto-Sched]`) & 자동 내보내기**: 스캔 완료 시 시점별 스냅샷 아카이빙 및 다중 포맷 자동 보고서 저장 연계

5. **📌 자율 시스템 트레이 · Windows SCM 서비스 & 이벤트 기반 OS 알림 고도화 (`tray_engine.go`, `utils_windows.go`, `PreferencesTrayModal.tsx`)**
   - **동적 4색 배지 아이콘 & 실시간 요약 메뉴**: 상태(`standby` / `watching` / `scanning` / `alert`)에 맞춘 GDI32/User32 32×32 ARGB 동적 배지 `HICON` 및 활성 호스트·침입·충돌·다음 스케줄 요약 메뉴
   - **창 없는 조용한 시작(`--tray`) & 10초 무인 자율 스윕**: Windows 부팅 자동 시작(`--tray`) 또는 UI 창 종료 상태에서도 Go 자율 루프가 24/7 감시·만기 스케줄 실행을 유지
   - **Windows SCM 네이티브 서비스(`--service`)**: `advapi32.dll` `StartServiceCtrlDispatcherW` 구현으로 `GridIPScannerService` 서비스 제어 관리자 무결성 확보(Error 1053 방지)
   - **이벤트별 OS 알림 · 쿨다운 · 방해금지(DND)**: 신규 침입, IP/MAC 충돌, 대량 호스트 오프라인 급감(대수/% 임계치) 알림 및 동일 키 쿨다운 중복 억제, 상시/30분 일시 해제/야간 조용한 시간 지원
   - **Pro 라이선스 & Soft Trust Grace Period**: 사설 랜덤 MAC 또는 DHCP 재할당 단말에 대한 오경보 방지 유예 평가

6. **⚠️ 게이트웨이 Proxy-ARP 정상 분리 & IP/MAC 충돌 감지 (`services/conflictDetector.ts`, `components/IPCell.tsx`)**
   - 학교/캠퍼스/기업망 게이트웨이(`.254`/`.1`) L3 스위치 Proxy-ARP 동일 MAC 다중 IP 응답을 **`Gateway Proxy-ARP (비알림 Info)`** 로 안전 판별하여 스카이블루 **`Proxy-ARP`** 뱃지로 시각화하고 실제 MAC 복제/스푸핑 경보(`⚠️`)와 명확히 분리

7. **🔒 12대 C/C++ 네이티브 DLL 가속 & PBKDF2+AES-256-GCM Secure Vault (`v2.6.0`)**
   - 순수 창작 `grid_topology_guard.dll` (`v2.6.1`), `Probe_SweepCidrAsyncBatch` 비동기 ICMP/ARP 스위프, `PortScan_IocpMultiHostSweep` Win32 IOCP 포트 스위프 탑재
   - `LoadLibraryExW(LOAD_LIBRARY_SEARCH_APPLICATION_DIR)` 경로 고정, `GVAULT11` 16B 솔트 + PBKDF2-HMAC-SHA256(10,000회) 256B 스택 고속 경로 및 JSON 음수 포트 방어 적용

8. **🔑 하이브리드 Ed25519 라이선스 매니저 & USB 물리 바인딩 + 30일 1회 체험권 (`license_guard.go`, `components/LicenseModal.tsx`)**
   - Go 백엔드 SPKI Ed25519 비대칭 서명(`GSCAN.<payload>.<sig>`), `AES-256-GCM` 하드웨어 봉인(`license.sealed.json`), LAN UDP `:39281` 동시 시트 감지 및 폐쇄망 완벽 대응
   - 1회성 체험 키(`GRID-PRO-TRIAL-2026`) 입력 시 **하드웨어 바인딩 30일 Pro 체험권** 발급 (리플레이 방지 및 만료 시 Free 자동 전환)

9. **📦 클린 소스 배포 & 전자동 패키징 (Portable & Setup Installer & Mobile APK)**
   - 단일 무설치 포터블 실행 파일 및 Inno Setup 6 정식 인스톨러(`Grid_IP_Scanner2_v2.6.0_Setup.exe`, `installer/Grid_IP_Scanner2_Dedicated_Setup.iss`)
   - 안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.6.0.apk`) 및 PWA 모바일 패키지 동시 제공
   - 로컬 푸시 스크립트 격리 및 클린 소스코드 전용 `.gitignore` 체계

10. **🚫 브라우저 자동 번역 팝업 원천 차단**
    - `index.html` 내 `notranslate` 및 `lang="ko"` 명시, 브라우저 실행 시 `--disable-features=Translate`, `--disable-translate`, `--lang=ko` 인자 주입으로 번역 제안 팝업 차단

11. **🚀 원클릭 GitHub 동기화 파이프라인 (`sync-github.sh` & `github-push.bat`)**
    - CLI/Bash 및 Windows 환경 모두에서 단 1회 명령으로 로컬 변경 사항을 커밋하고 GitHub Actions CI/CD를 호출하여 빌드 자동화

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```text
[ Browser / Electron / Capacitor ] <--- HTTP / SSE / Tray Sync ---> [ Go Backend & Autonomous Tray Core ]
          │                                                                     │
  React 19 + Vite + Tailwind v4                                   /api/subnets/discover & /api/packet-inspect
  Grid / TopologyMapView / Diff v2                                /api/topology-map & /api/topology-guard
  MultiSubnetBar & MultiSubnetModal                               tray_engine.go (10s Daemon, DND/Cooldown)
  ReportCenter (Free Export + Pro Audit)                          12 Native C/C++ DLL Bridges (Path-Pinned)
  PreferencesTrayModal (Alert/Service)                            - grid_pcap_analyzer.dll (v2.6.2 Telemetry)
  OUI Semantic + Proxy-ARP UI                                     - grid_topology_guard.dll (v2.6.1 O(N) Hash)
```

---

## 🚀 시작하기 (Getting Started)

### 개발 환경 구동 (Development)
```bash
npm install
npm run dev
```

### 무인 트레이 / Windows 서비스 실행 옵션
```cmd
:: 창 없이 시스템 트레이로 조용히 시작 (Windows 부팅 자동 시작 기본 인자)
Grid_IP_Scanner2.exe --tray

:: Windows 서비스 제어 관리자(SCM) 모드
Grid_IP_Scanner2.exe --service
```

### 버전에 따른 동기화 빌드 (SSOT Version Sync & Build)
```bash
# 패치/부 버전 상승 및 10개 대상 일괄 동기화
npm run version:bump
npm run version:bump-minor

# 실행 파일 및 Windows 빌드
npm run build:exe

# 설치 프로그램 빌드
npm run build:installer

# 모바일 APK 빌드
npm run build:apk
```

### GitHub 동기화 및 자동 릴리스 (Clean Source Push)
> **참고**: `sync-github.sh` 및 `github-push.bat`는 `.gitignore`에 의해 원격 저장소에 포함되지 않는 **로컬 관리자 전용 스크립트**입니다. 저장소를 클론한 환경에서는 아래 표준 `git` 명령으로 배포 워크플로우(`.github/workflows/build-and-release.yml`)를 트리거할 수 있습니다.

```bash
# [표준 Git 배포] 소스 푸시 및 릴리스 태그 발행 (CI 자동 빌드 트리거)
git add .
git commit -m "chore: release v2.6.0"
git tag v2.6.0
git push origin main --tags

# [로컬 관리자 전용] 유지보수 스크립트가 있는 로컬 환경
./sync-github.sh    # Linux / macOS / Git Bash (또는 npm run deploy:git)
github-push.bat     # Windows (또는 npm run git:push)
```

---

## 📂 문서 구조 (Documentation Hub)

- [`docs/README.md`](docs/README.md) : 전체 기술 문서 저장소 총괄 허브 (v2.6.0)
- [`docs/PATCH_NOTE.md`](docs/PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트 (2026-11-21 v2.6.0 감사·최신화)
- [`docs/WorkLog.md`](docs/WorkLog.md) : 개발 및 기능 구현 공식 작업 일지 (패킷 텔레메트리·토폴로지 맵·다중 서브넷/VLAN·자아성찰 감사 반영)
- [`docs/SCHEDULED_SCAN_SPEC.md`](docs/SCHEDULED_SCAN_SPEC.md) : 정기 자동 네트워크 스캔 스케줄러, 일시정지/즉시 실행 및 트레이 연동 명세서
- [`docs/SNAPSHOT_DIFF_SPEC.md`](docs/SNAPSHOT_DIFF_SPEC.md) : 딥 스냅샷 비교 엔진 v2 및 1:1 대조 스튜디오 명세서
- [`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md) : 순수 창작 `grid_topology_guard.dll` 명세 및 12대 DLL 감사·하드닝 보고서
- [`docs/GOOGLE_BLOGGER_POST.md`](docs/GOOGLE_BLOGGER_POST.md) : 구글 블로거 포스팅 가이드 (`[작성 모드 (서식 있는 텍스트)]`)
- [`docs/GOOGLE_BLOGGER_POST.html`](docs/GOOGLE_BLOGGER_POST.html) : 구글 블로거 포스팅 가이드 (`[HTML 편집 모드]`)
- [`docs/GITHUB_GUIDE.md`](docs/GITHUB_GUIDE.md) : 깃허브 연동, .gitignore 격리 규칙 및 CI/CD 자동 배포 가이드 (v2.6.0 최신화)
- [`docs/MOBILE_GITHUB_GUIDE.md`](docs/MOBILE_GITHUB_GUIDE.md) : 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
- [`docs/A4_REPORT_ENGINE_SPEC.md`](docs/A4_REPORT_ENGINE_SPEC.md) : A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
- [`docs/FILE_STRUCTURE_GUIDE.md`](docs/FILE_STRUCTURE_GUIDE.md) : 프로젝트 파일 및 디렉토리 상세 명세서 (v2.6.0 컴포넌트·엔진 반영)
- [`docs/GRID_IP_SCANNER_2.md`](docs/GRID_IP_SCANNER_2.md) : 서비스 개요, 기술 사양 및 사용자 매뉴얼 백서 (v2.6.0 최신화)
- [`docs/VERSIONING_POLICY.md`](docs/VERSIONING_POLICY.md) : SemVer 3단계 버전 관리 규정 및 SSOT 동기화 지침
- [`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](docs/DISTRIBUTION_AND_TIER_STRATEGY.md) : 포터블 & 인스톨러 배포 전략 및 유료화 사양서 (v2.6.0 티어 개편)
- [`docs/V3_FALSE_POSITIVE_GUIDE.md`](docs/V3_FALSE_POSITIVE_GUIDE.md) : AhnLab V3 오진 분석 및 화이트리스트 신청 가이드
- [`docs/DIGITAL_SIGNATURE_GUIDE.md`](docs/DIGITAL_SIGNATURE_GUIDE.md) : 테스트용 자가 서명(PowerShell) 가이드
- [`docs/SECURITY_REPORT.md`](docs/SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서 (v2.6.0)
- [`docs/PROPRIETARY_TECHNOLOGY.md`](docs/PROPRIETARY_TECHNOLOGY.md) : 15대 핵심 독점 기술 및 코어 엔진 기술 명세서
- [`docs/LICENSE_KR.md`](docs/LICENSE_KR.md) : 한국어 라이선스 전문
- [`docs/LICENSE.md`](docs/LICENSE.md) : 프로그램 라이선스 계약서
- [`LICENSE.md`](LICENSE.md) : 공식 Source-Available 상용 라이선스 고지서

---

## 📜 이중 라이선스 및 지적재산권 고지 (Dual License & Intellectual Property)

> **"Source code is visible for security audit and transparency. Commercial redistribution or selling modified versions without permission is strictly prohibited."**  
> *(보안 검증 및 투명성을 위해 소스코드를 공개하며, 허가 없는 상업적 무단 복제, 재배포 및 재판매는 엄격히 금지됩니다.)*

* **[선택 A] GNU GPL v3 커뮤니티 에디션 (`LICENSE.md` / `docs/LICENSE.md`)**: 개인·연구·오픈소스 기여 목적의 자유로운 이용 및 수정본 소스 공개(Copyleft) 조건 준수 배포를 허용합니다.
* **[선택 B] 독점 상용 라이선스 (`Proprietary Commercial License`)**: 소스코드 비공개, 리브랜딩(White-labeling), 유료 상용 패키징 납품·재배포 시 저작권자(**AhBiYout**)와의 상용 라이선스 계약이 적용됩니다.
* **Pro / Enterprise 에디션 및 키 보호**: 정품 유료 기능(WoL, 심층 포트 감사, 4색 Diff, 24/7 침입 감시, 다중 서브넷 Batch Sweep, 보안 감사/브랜딩 리포트 등)은 백엔드 Ed25519 서명 검증 및 하드웨어 바인딩으로 보호됩니다.

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*

