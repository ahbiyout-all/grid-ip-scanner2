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
   - 25개 주요 서비스 포트 정밀 스캐닝 및 위험도 분류
   - **🗺️ 3계층 인터랙티브 토폴로지 맵 (`Grid` / `Topology Map` / `Snapshot Diff`)**: `TopologyMapView`와 `/api/topology-map` · `grid_topology_guard.dll` 연동을 통해 게이트웨이·L2 그룹·호스트 계층 그래프를 시각화하고 Pro 티어에서 **Topology Security Correlation** 보안 교차 분석 지원
   - **🔬 네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`)**: 장치 상세 프로필 및 DLL 콘솔에서 **TTL/초기 TTL/추정 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), OS 추정, Live ARP 스푸핑 정합성 검사** 실시간 실행
   - **🌐 온디맨드 다중 서브넷 & VLAN 통합 대시보드 (`MultiSubnetBar`, `MultiSubnetModal`)**: 평소에는 숨김 상태를 유지하다 상단 **`다중 서브넷·VLAN`**(`VLAN`) 버튼 클릭 시 즉시 표시되며, **활성 프로필 VLAN Tag ID 인디케이터(`활성 태그` + 프로파일별 컬러 태그 뱃지)**, 로컬 NIC/VLAN CIDR 자동 탐색(`/api/subnets/discover`), 대역별 독립 캐싱, **Free 최대 2개 서브넷 전환**, **Pro(5대역)/Enterprise(무제한) 순차 일괄 스윕 및 교차 대역 이상 징후 대시보드** 제공
   - **🏷️ UPnP/SSDP XML & mDNS 실제 제조사 판별 & OUI 시맨틱 분류 + LAA 랜덤 MAC 역추적**: OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 분류(`services/ouiClassifier.ts`), 사설 랜덤 MAC(LAA) 교차 역추적 및 신뢰도/근거 표기
   - **📋 원클릭 IP 주소 복사 (Clipboard API)**: 장치 상세 프로필 패널에서 한 번의 클릭으로 선택한 IP 주소를 클립보드에 완벽 복사 (Clipboard API & Fallback 지원)
   - **🛡️ Windows 인스톨러 UAC 권한 승계 & 12대 네이티브 DLL 분리 설치**: Inno Setup 6 커널 UAC 권한 승계(`runascurrentuser`) 및 포그라운드 무클릭 자동 업그레이드·12대 C/C++ DLL 분리 배치
   - **🚦 3단계 시맨틱 버저닝(SemVer) 및 10대 SSOT 자동 동기화**: MAJOR.MINOR.PATCH 원칙 수립 및 구글 블로거/깃허브 전용 배포 자산 최적화 관리 (`v2.6.0`)

2. **📄 통합 보고서 센터 & Free 16×16 엑셀 그리드 · Pro 전체 보고서(5시트) 엑셀 + PDF (`components/ReportCenterModal.tsx`, `services/reportCenterService.ts`, `services/reportGenerator.ts`)**
   - **티어별 Excel XML(`.xls`) 및 표준 내보내기**: **Free 티어**는 **16×16 엑셀 그리드 시트(`Grid_16x16`) 전용 `.xls`** 및 일반 범위(`active`/`search`/`all`/`summary`)의 PDF·HTML·CSV·JSON·Markdown을 무료 제공하며, **Pro+**는 `1_Summary`·`2_Grid_16x16`·`3_Device_Inventory`·`4_Security_Audit`·`5_Snapshot_Diff` 전체 보고서 5시트 엑셀 통합문서를 생성
   - **Pro+ 정밀 보안 감사 & 비교 보고서**: 보안 감사 범위(`audit`) PDF/HTML, 스냅샷 Diff(`diff`) 리포트, 자동 예약 아카이브 및 화이트라벨 로고(`PNG/JPG/WEBP/GIF`)·브랜딩 커스터마이징 제공
   - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율) 독립 페이지 모델 및 11mm 안전 여백으로 테이블 행·텍스트 잘림 원천 방지
   - **동적 페이지 번호 & 직접 인쇄**: 모든 페이지에 `페이지 X / Y` 및 공식 푸터 동기화, `@media print` 고해상도 스타일시트 지원

3. **📸 딥 스냅샷 비교(Deep Diff v2) 4색 진단 & 1:1 대조 스튜디오 (`components/SnapshotDiffModal.tsx`)**
   - **4색 컬러 진단 및 메탈릭 베이스라인**:
     - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 발광 + 펄스 애니메이션 링
     - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 빗금 패턴
     - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지 (MAC 변조/포트 노출 감지)
     - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 4색 메탈릭 베이스라인(하늘, 보라, 청록, 회색) 지원
   - **미할당 빈 IP 슬롯(245개) 완전 분리**: 장비 없는 빈 슬롯을 `=SAME`에서 제외하여 실제 온라인 장비만 정확히 계측
   - **1:1 Side-by-Side 대조 스튜디오**: 임의 2개 시점(A ↔ B) 교차 비교, CSV 보고서 및 IT 요약 복사
   - **Zero-Clipping 고정 서브헤더**: 스크롤 및 해상도에 무관하게 툴바 상단 잘림 0% 보장
   - **2단계 폰트 확대 (`[가 100%] ↔ [가⁺ 115%]`)**: 장치 상세 패널 표준 가독성 확보

4. **⏰ 정기 자동 네트워크 스캔 스케줄러 (`services/schedulerService.ts`, `components/ScheduleModal.tsx`)**
   - **무인 백그라운드 주기적 스캔**: 15분, 30분, 1시간, 2시간, 6시간, 12시간, 매일/매주 및 사용자 지정 분 단위 주기 자동 실행
   - **5초 Ticker · Busy Lock & 트레이 일시정지 제어**: 수동 스캔 시 중복 방지 안전 가드, 트레이/UI 양방향 **일시정지·재개 및 즉시 실행(`run_schedule_now`)** 제어
   - **스냅샷 자동 캡처 (`[Auto-Sched]`) & 자동 내보내기**: 스캔 완료 시 시점별 스냅샷 아카이빙 및 다중 포맷 자동 보고서 저장 연계
   - **실행 이력 로깅 & 실시간 카운트다운**: 최근 50회 실행 이력 보관, CSV 내보내기, 헤더 원터치 카운트다운 및 일시정지 배지 연동

5. **📌 자율 시스템 트레이 · Windows SCM 서비스 & 이벤트 기반 OS 알림 고도화 (`tray_engine.go`, `utils_windows.go`, `PreferencesTrayModal.tsx`)**
   - **동적 상태 배지 아이콘 & 실시간 요약 메뉴**: 상태(`standby` / `watching` / `scanning` / `alert`)에 맞춘 GDI32/User32 32×32 ARGB 동적 배지 `HICON` 및 활성 호스트·침입·충돌·다음 스케줄 요약 메뉴
   - **창 없는 조용한 시작(`--tray`) & 10초 무인 자율 스윕**: Windows 부팅 자동 시작(`--tray`) 또는 UI 창 종료 상태에서도 Go 자율 루프가 24/7 감시·만기 스케줄 실행을 유지
   - **Windows SCM 네이티브 서비스(`--service`)**: `advapi32.dll` `StartServiceCtrlDispatcherW` 구현으로 `GridIPScannerService` 서비스 제어 관리자 무결성 확보(Error 1053 방지)
   - **이벤트별 OS 알림 · 쿨다운 · 방해금지(DND)**: 신규 침입, IP/MAC 충돌, 대량 호스트 오프라인 급감(대수/% 임계치) 알림 및 동일 키 쿨다운 중복 억제, 상시/30분 일시 해제/야간 조용한 시간 지원
   - **Pro 라이선스 & Soft Trust Grace Period**: 사설 랜덤 MAC 또는 DHCP 재할당 단말에 대한 과도한 오경보 방지 유예 평가

6. **⚠️ 게이트웨이 Proxy-ARP 정상 분리 & IP/MAC 충돌 감지 (`conflictDetector.ts`, `IPCell.tsx`)**
   - 학교/기업망 게이트웨이(`.254`/`.1`) L3 스위치 Proxy-ARP 동일 MAC 다중 IP 응답을 **`Gateway Proxy-ARP` 비알림 Info**로 분리하고 스카이블루 **`Proxy-ARP`** 뱃지로 표기해 실제 MAC 복제/스푸핑 경보(`⚠️`)와 구분

7. **🔒 12대 네이티브 C/C++ DLL 엔진 & PBKDF2+AES-256-GCM Secure Vault (`v2.6.0`)**
   - 순수 창작 `grid_topology_guard.dll` (`v2.6.1`), `Probe_SweepCidrAsyncBatch` 비동기 ICMP/ARP 스위프, `PortScan_IocpMultiHostSweep` IOCP 포트 스위프 및 `GVAULT11` 16B 솔트 PBKDF2-HMAC-SHA256 스택 고속 경로 적용

8. **🔑 하이브리드 Ed25519 라이선스 매니저 & USB 물리 바인딩 + 30일 1회 체험권 (`license_guard.go`, `components/LicenseModal.tsx`)**
   - Go 백엔드 SPKI Ed25519 비대칭 서명 검증(`GSCAN.<payload>.<sig>`), `AES-256-GCM` 하드웨어 봉인(`license.sealed.json`), LAN UDP `:39281` 동시 시트 감지 지원
   - 1회성 체험 키(`GRID-PRO-TRIAL-2026`) 입력 시 **하드웨어 바인딩 30일 Pro 체험권** 즉시 발급 (기존 서명 없는 레거시 데모 키는 보안상 차단)

9. **📦 클린 소스 배포 & 전자동 패키징 (Portable & Setup Installer & Mobile APK)**
   - Windows 제어판 프로그램 추가/제거 및 클린 언인스톨러 등록 (`installer/Grid_IP_Scanner2_Dedicated_Setup.iss`)
   - 단일 무설치 포터블 실행 파일(`Grid_IP_Scanner2.exe`)과 정식 인스톨러 동시 듀얼 빌드
   - 안드로이드 Core Splashscreen 최적화, 패키지 렌더링 딜레이 해소, ZipAlign 및 키서명 안정화 APK
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
# 패치 버전 자동 상승 및 10개 대상 일괄 동기화
npm run version:bump

# 실행 파일 및 Windows 빌드
npm run build:exe

# 설치 프로그램 빌드
npm run build:installer

# 모바일 APK 빌드
npm run build:apk
```

### GitHub 동기화 및 자동 릴리스 (Clean Source Push)
> **참고**: `sync-github.sh` 및 `github-push.bat`는 `.gitignore`로 격리되는 **로컬 관리자 전용 스크립트**입니다. 클론 환경에서는 표준 `git` 명령으로 릴리스 태그를 푸시하십시오.

```bash
# [표준 Git 배포] 소스 푸시 및 릴리스 태그 발행
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

- [`docs/PATCH_NOTE.md`](./PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트 (2026-11-21 v2.6.0 감사·최신화)
- [`docs/SCHEDULED_SCAN_SPEC.md`](./SCHEDULED_SCAN_SPEC.md) : 정기 자동 네트워크 스캔 스케줄러, 일시정지/즉시 실행 및 트레이 연동 명세서
- [`docs/SNAPSHOT_DIFF_SPEC.md`](./SNAPSHOT_DIFF_SPEC.md) : 딥 스냅샷 비교 엔진 v2, 1:1 대조 스튜디오 및 잘림 방지 서브헤더 기술 명세서
- [`docs/GOOGLE_BLOGGER_POST.md`](./GOOGLE_BLOGGER_POST.md) : 구글 블로거 포스팅 가이드 (`[작성 모드 (서식 있는 텍스트)]`)
- [`docs/GOOGLE_BLOGGER_POST.html`](./GOOGLE_BLOGGER_POST.html) : 구글 블로거 포스팅 가이드 (`[HTML 편집 모드]` 전용 소스)
- [`docs/WorkLog.md`](./WorkLog.md) : 개발 및 기능 구현 공식 작업 일지 (v2.6.0 패킷·토폴로지·온디맨드 다중 서브넷·자아성찰 감사 반영)
- [`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md) : 깃허브 연동, .gitignore 격리 규칙 및 CI/CD 자동 배포 가이드 (v2.6.0 최신화)
- [`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md) : 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
- [`docs/A4_REPORT_ENGINE_SPEC.md`](./A4_REPORT_ENGINE_SPEC.md) : A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
- [`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md) : 프로젝트 파일 및 디렉토리 상세 명세서 (v2.6.0 신규 컴포넌트/서비스 반영)
- [`docs/GRID_IP_SCANNER_2.md`](./GRID_IP_SCANNER_2.md) : 서비스 개요, 기술 사양 및 사용자 매뉴얼 백서 (v2.6.0 최신화)
- [`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md) : SemVer 3단계 버전 관리 규정 및 SSOT 동기화 지침
- [`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md) : 포터블 & 인스톨러 배포 전략 및 유료화 사양서 (v2.6.0 티어 개편)
- [`docs/V3_FALSE_POSITIVE_GUIDE.md`](./V3_FALSE_POSITIVE_GUIDE.md) : AhnLab V3 오진 분석 및 화이트리스트 신청 가이드
- [`docs/DIGITAL_SIGNATURE_GUIDE.md`](./DIGITAL_SIGNATURE_GUIDE.md) : 테스트용 자가 서명(PowerShell) 가이드
- [`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서
- [`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md) : 15대 핵심 독점 기술 및 코어 엔진 기술 명세서
- [`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md) : OUI 계층형 데이터베이스 및 이중 미러링 기술 명세서
- [`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](./GRID_TOPOLOGY_GUARD_DLL_SPEC.md) : **순수 창작 네이티브 DLL(`grid_topology_guard.dll` `v2.6.1`) 명세 및 12대 DLL 감사·하드닝 보고서**
- [`docs/NATIVE_DLL_EXPANSION_ROADMAP.md`](./NATIVE_DLL_EXPANSION_ROADMAP.md) : 네이티브 DLL 모듈화 기술 명세서 및 8대 핵심 엔진 아키텍처 로드맵
- [`docs/PURE_NATIVE_DLL_INTEGRATION_GUIDE.md`](./PURE_NATIVE_DLL_INTEGRATION_GUIDE.md) : 순수 창작 네이티브 DLL 연동 및 Caller-Allocates 라이프사이클 종합 가이드
- [`docs/LICENSE_KR.md`](./LICENSE_KR.md) : 한국어 라이선스 전문
- [`docs/LICENSE.md`](./LICENSE.md) : 프로그램 이중 라이선스 계약서
