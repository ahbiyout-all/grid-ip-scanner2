# 🌐 Grid IP Scanner2 (v2.5.0)

> **초고속 네트워크 IP 스캐닝, IP 충돌 탐지, A4 최적화 PDF 감사 보고서 및 낯선 기기 감지 시스템**  
> **High-Performance Network IP Scanner, Conflict Detector & Intruder Defense Suite**

---

## 📌 개요 (Overview)

**Grid IP Scanner2**는 C++/Go 기반의 고성능 네이티브 엔진과 React 19 / Vite 기반의 직관적인 사용자 인터페이스를 결합한 종합 네트워크 관리 및 보안 모니터링 솔루션입니다.  
로컬 네트워크(LAN) 내 활성 기기 탐지, MAC 주소 기반 제조사 분석, IP/MAC 충돌 탐지, **Soft Trust 유예 기간을 지원하는 낯선 기기 감시 모드**, 그리고 **A4 규격에 완벽히 맞춘 고품질 PDF 보안 감사 보고서 출력 엔진**을 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

1. **⚡ 초고속 네트워크 IP 스캐닝 & 16x16 그리드 맵**
   - Go 기반 멀티스레드 Ping/ARP/mDNS 스캐닝 엔진 (254개 전체 호스트 동시 진단)
   - 9만 건 이상의 IEEE/Wireshark OUI 마스터 DB를 통한 MAC 제조사 즉각 식별
   - 25개 주요 서비스 포트 정밀 스캐닝 및 위험도 분류
   - **🏷️ UPnP/SSDP XML & mDNS 실제 제조사 판별 & OUI 시맨틱 분류 + LAA 랜덤 MAC 역추적**: OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 분류(`services/ouiClassifier.ts`), 사설 랜덤 MAC(LAA) 교차 역추적 및 신뢰도/근거 표기
   - **📋 원클릭 IP 주소 복사 (Clipboard API)**: 장치 상세 프로필 패널에서 한 번의 클릭으로 선택한 IP 주소를 클립보드에 완벽 복사 (Clipboard API & Fallback 지원)
   - **🛡️ Windows 인스톨러 UAC 권한 승계 & 12대 네이티브 DLL 분리 설치**: Inno Setup 6 커널 UAC 권한 승계(`runascurrentuser`) 및 포그라운드 무클릭 자동 업그레이드·12대 C/C++ DLL 분리 배치
   - **🚦 3단계 시맨틱 버저닝(SemVer) 및 10대 SSOT 자동 동기화**: MAJOR.MINOR.PATCH 원칙 수립 및 구글 블로거/깃허브 전용 배포 자산 최적화 관리 (`v2.5.0`)

2. **📄 A4 규격 최적화 스마트 페이지네이션 PDF 엔진 (`services/reportGenerator.ts`)**
   - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율) 독립 페이지 모델로 테이블 행 및 텍스트 줄 잘림 원천 방지
   - **프린터 안전 여백 (11mm Margin)**: 일반 사무용 레이저/잉크젯 프린터에서 출력해도 글자 잘림 없는 안전 여백 확보
   - **동적 페이지 번호**: 모든 페이지에 `페이지 X / Y` 형태의 전체 대비 현재 페이지 번호 및 공식 헤더/푸터 동기화
   - **브라우저 직접 인쇄(Ctrl+P) 지원**: `@media print` 고해상도 스타일시트를 통한 배경색 및 뱃지 완벽 보존

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
   - **무인 백그라운드 주기적 스캔**: 10분, 15분, 30분, 1시간, 2시간, 6시간, 12시간, 24시간 야간점검 등 주기별 자동 실행
   - **5초 Ticker & Busy Lock**: 수동 스캔 시 중복 실행 방지 및 안전 실행 가드
   - **스냅샷 자동 캡처 (`[Auto-Sched]`)**: 스캔 완료 시 시점별 스냅샷을 자동 아카이빙하여 Diff 모드에서 즉각 비교 가능
   - **실행 이력 로깅 & 실시간 카운트다운**: 최근 50회 실행 이력 보관, CSV 내보내기, 헤더 원터치 카운트다운 배지 연동

5. **🛡️ 낯선 기기 감시 및 Soft Trust 유예 시스템 (Intruder Watch Mode - PRO)**
   - **Pro 라이선스 연동**: 60초 주기 무인 백그라운드 자동 스캔, 침입 즉각 오디오 비프음 및 OS 네이티브 데스크톱 알림
   - 새롭게 연결된 미등록 기기 실시간 감지 및 정상 기기 화이트리스트 영구 보존
   - **Soft Trust Grace Period**: 사설 MAC 또는 DHCP 재할당 단말에 대한 과도한 오경보 방지 유예 평가

6. **⚠️ 게이트웨이 Proxy-ARP 정상 분리 & IP/MAC 충돌 감지 (`conflictDetector.ts`, `IPCell.tsx`)**
   - 학교/기업망 게이트웨이(`.254`/`.1`) L3 스위치 Proxy-ARP 동일 MAC 다중 IP 응답을 **`Gateway Proxy-ARP` 비알림 Info**로 분리하고 스카이블루 **`Proxy-ARP`** 뱃지로 표기해 실제 MAC 복제/스푸핑 경보(`⚠️`)와 구분

7. **🔒 12대 네이티브 C/C++ DLL 엔진 & PBKDF2+AES-256-GCM Secure Vault (`v2.6.0`)**
   - 순수 창작 `grid_topology_guard.dll` (`v2.6.1`), `Probe_SweepCidrAsyncBatch` 비동기 ICMP/ARP 스위프, `PortScan_IocpMultiHostSweep` IOCP 포트 스위프 및 `GVAULT11` 16B 솔트 PBKDF2-HMAC-SHA256 스택 고속 경로 적용

8. **🔑 오프라인 라이선스 매니저 & 30일 Pro 체험권**
   - Ed25519 비대칭 암호키 기반 100% 오프라인 라이선스 검증 (폐쇄망 완벽 대응)
   - 데모 Pro 키(`GRID-PRO-TRIAL-2026` 등) 입력 시 **30일 정식 Pro 체험권** 즉시 발급

9. **📦 클린 소스 배포 & 전자동 패키징 (Portable & Setup Installer & Mobile APK)**
   - Windows 제어판 프로그램 추가/제거 및 클린 언인스톨러 등록 (`installer/Grid_IP_Scanner2_Setup.iss`)
   - 단일 무설치 포터블 실행 파일(`Grid_IP_Scanner2.exe`)과 정식 인스톨러 동시 듀얼 빌드
   - 안드로이드 Core Splashscreen 최적화, 패키지 렌더링 딜레이 해소, ZipAlign 및 키서명 안정화 APK
   - 로컬 푸시 스크립트 격리 및 클린 소스코드 전용 `.gitignore` 체계

10. **🚫 브라우저 자동 번역 팝업 원천 차단**
    - `index.html` 내 `notranslate` 및 `lang="ko"` 명시, 브라우저 실행 시 `--disable-features=Translate`, `--disable-translate`, `--lang=ko` 인자 주입으로 번역 제안 팝업 차단

11. **🚀 원클릭 GitHub 동기화 파이프라인 (`sync-github.sh` & `github-push.bat`)**
    - CLI/Bash 및 Windows 환경 모두에서 단 1회 명령으로 로컬 변경 사항을 커밋하고 GitHub Actions CI/CD를 호출하여 빌드 자동화

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```
[ Electron / Browser Frontend ]  <--- HTTP / SSE (Port 3031) --->  [ Embedded Go Backend Engine ]
         │                                                                      │
  React 19 + Vite                                                  12 Native C/C++ DLL Bridges (Path-Pinned)
  Tailwind CSS v4                                                  - grid_topology_guard.dll (v2.6.1 O(N) Hash & Proxy-ARP)
  OUI Semantic + Proxy-ARP UI                                      - grid_probe_engine.dll / grid_port_iocp.dll (Async/IOCP)
  jsPDF & html2canvas (A4 Engine)                                  - grid_vault_driver.dll / secure_vault.dll (PBKDF2+GCM)
```

---

## 🚀 시작하기 (Getting Started)

### 개발 환경 구동 (Development)
```bash
npm install
npm run dev
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
```bash
# [방법 1] Linux / macOS / Git Bash 원터치 동기화
./sync-github.sh
# 또는 npm run deploy:git

# [방법 2] Windows 환경 원클릭 푸시 (배치 파일 더블클릭)
github-push.bat
# 또는 npm run git:push
```

---

## 📂 문서 구조 (Documentation Hub)

- [`docs/PATCH_NOTE.md`](./PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트 (v2.5.0 최신화)
- [`docs/SCHEDULED_SCAN_SPEC.md`](./SCHEDULED_SCAN_SPEC.md) : 정기 자동 네트워크 스캔 스케줄러 아키텍처 및 데이터 명세서
- [`docs/SNAPSHOT_DIFF_SPEC.md`](./SNAPSHOT_DIFF_SPEC.md) : 딥 스냅샷 비교 엔진 v2, 1:1 대조 스튜디오 및 잘림 방지 서브헤더 기술 명세서
- [`docs/GOOGLE_BLOGGER_POST.md`](./GOOGLE_BLOGGER_POST.md) : 구글 블로거 포스팅 가이드 (`[작성 모드 (서식 있는 텍스트)]`)
- [`docs/GOOGLE_BLOGGER_POST.html`](./GOOGLE_BLOGGER_POST.html) : 구글 블로거 포스팅 가이드 (`[HTML 편집 모드]` 전용 소스)
- [`docs/WorkLog.md`](./WorkLog.md) : 개발 및 기능 구현 공식 작업 일지 (v2.5.0 최신화)
- [`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md) : 깃허브 연동, .gitignore 격리 규칙 및 CI/CD 자동 배포 가이드 (v2.5.0)
- [`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md) : 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
- [`docs/A4_REPORT_ENGINE_SPEC.md`](./A4_REPORT_ENGINE_SPEC.md) : A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
- [`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md) : 프로젝트 파일 및 디렉토리 상세 명세서 (v2.5.0)
- [`docs/GRID_IP_SCANNER_2.md`](./GRID_IP_SCANNER_2.md) : 서비스 개요, 기술 사양 및 사용자 매뉴얼 백서 (v2.5.0)
- [`docs/VERSIONING_POLICY.md`](./VERSIONING_POLICY.md) : SemVer 3단계 버전 관리 규정 및 SSOT 동기화 지침
- [`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](./DISTRIBUTION_AND_TIER_STRATEGY.md) : 포터블 & 인스톨러 배포 전략 및 유료화 사양서
- [`docs/V3_FALSE_POSITIVE_GUIDE.md`](./V3_FALSE_POSITIVE_GUIDE.md) : AhnLab V3 오진 분석 및 화이트리스트 신청 가이드
- [`docs/DIGITAL_SIGNATURE_GUIDE.md`](./DIGITAL_SIGNATURE_GUIDE.md) : 테스트용 자가 서명(PowerShell) 가이드
- [`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서 (v2.5.0)
- [`docs/PROPRIETARY_TECHNOLOGY.md`](./PROPRIETARY_TECHNOLOGY.md) : 15대 핵심 독점 기술 및 코어 엔진 기술 명세서
- [`docs/OUI_DATABASE_SPEC.md`](./OUI_DATABASE_SPEC.md) : OUI 계층형 데이터베이스 및 이중 미러링 기술 명세서
- [`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](./GRID_TOPOLOGY_GUARD_DLL_SPEC.md) : **순수 창작 네이티브 DLL(`grid_topology_guard.dll` `v2.6.1`) 명세 및 12대 DLL 감사·하드닝 보고서**
- [`docs/NATIVE_DLL_EXPANSION_ROADMAP.md`](./NATIVE_DLL_EXPANSION_ROADMAP.md) : 네이티브 DLL 모듈화 기술 명세서 및 8대 핵심 엔진 아키텍처 로드맵
- [`docs/PURE_NATIVE_DLL_INTEGRATION_GUIDE.md`](./PURE_NATIVE_DLL_INTEGRATION_GUIDE.md) : 순수 창작 네이티브 DLL 연동 및 Caller-Allocates 라이프사이클 종합 가이드
- [`docs/LICENSE_KR.md`](./LICENSE_KR.md) : 한국어 라이선스 전문
- [`docs/LICENSE.md`](./LICENSE.md) : 프로그램 이중 라이선스 계약서
