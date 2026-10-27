# 🌐 Grid IP Scanner2 (v2.4.7)

> **초고속 네트워크 IP 스캐닝, IP 충돌 탐지, A4 최적화 PDF 감사 보고서 및 낯선 기기 감지 시스템**  
> **High-Performance Network IP Scanner, Conflict Detector & Intruder Defense Suite**

[![License](https://img.shields.io/badge/License-Source--Available%20%7C%20Commercial-red.svg)](LICENSE.md)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20PWA-indigo.svg)](docs/MOBILE_GITHUB_GUIDE.md)

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

2. **📄 A4 규격 최적화 스마트 페이지네이션 PDF 엔진 (`services/reportGenerator.ts`)**
   - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142 비율) 독립 페이지 모델로 테이블 행 및 텍스트 줄 잘림 원천 방지
   - **프린터 안전 여백 (11mm Margin)**: 일반 사무용 레이저/잉크젯 프린터에서 출력해도 글자 잘림 없는 안전 여백 확보
   - **동적 페이지 번호**: 모든 페이지에 `페이지 X / Y` 형태의 전체 대비 현재 페이지 번호 및 공식 헤더/푸터 동기화
   - **브라우저 직접 인쇄(Ctrl+P) 지원**: `@media print` 고해상도 스타일시트를 통한 배경색 및 뱃지 완벽 보존

3. **📸 딥 스냅샷 비교 엔진(Deep Diff v2) & 1:1 대조 스튜디오 (`components/SnapshotDiffModal.tsx`)**
   - **임의 시점 간 1:1 자유 교차 대조**: 보관된 스냅샷 2개 간(A ↔ B) 또는 실시간 스캔과 자유롭게 교차 비교 및 1클릭 소스 맞바꿈(Swap)
   - **다각도 심층 변동 진단 (Deep Vector)**: MAC 주소 변경(IP 충돌/ARP 스푸핑 경보), 신규 취약 포트(21, 23, 445, 3389 등) 노출 경보, RTT 급변 감지
   - **1:1 Side-by-Side 대조 테이블**: 전수 노드 상태/MAC/포트 나란히 대조 및 엑셀 CSV 원클릭 내보내기, 클립보드 서식 요약 복사
   - **잘림 없는 고정 서브헤더 툴바**: 스크롤 간섭 없는 독립 서브헤더 배치로 상단 잘림 원천 방지 및 불필요한 하단 설명 제거로 극상의 공간 활용성 제공
   - **4색 컬러 진단**: 🟢 신규 접속(`+NEW`), 🔴 오프라인(`-OFF`), 🟠 식별자/포트 변동(`!CHG`), 🔵 기준 유지(`=SAME`) 실시간 카운터 및 필터링

4. **🛡️ 낯선 기기 감시 및 Soft Trust 유예 시스템 (Intruder Watch Mode - PRO)**
   - **Pro 라이선스 연동**: 60초 주기 무인 백그라운드 자동 스캔, 침입 즉각 오디오 비프음 및 OS 네이티브 데스크톱 알림
   - 새롭게 연결된 미등록 기기 실시간 감지 및 정상 기기 화이트리스트 영구 보존
   - **Soft Trust Grace Period**: 사설 MAC 또는 DHCP 재할당 단말에 대한 과도한 오경보 방지 유예 평가

5. **⚠️ IP / MAC 충돌 감지 (Conflict Detection)**
   - 동일 IP에 복수 MAC이 응답하거나, IP가 변경된 기기 즉각 포착 및 시각적 충돌 경고 패널 표시

6. **🔒 Secure Vault 네이티브 암호화 (AES-256-GCM)**
   - C++/Go 네이티브 DLL 기반 초고속 AES-256-GCM 암호화로 기기 별칭(Alias) 및 스냅샷 저장소 보호

7. **🔑 오프라인 라이선스 매니저 & 30일 Pro 체험권**
   - Ed25519 비대칭 암호키 기반 100% 오프라인 라이선스 검증 (폐쇄망 완벽 대응)
   - 데모 Pro 키(`GRID-PRO-TRIAL-2026` 등) 입력 시 **30일 정식 Pro 체험권** 즉시 발급

8. **📦 클린 소스 배포 & 전자동 패키징 (Portable & Setup Installer & Mobile APK)**
   - 단일 무설치 포터블 실행 파일 및 Inno Setup 기반 정식 인스톨러(`Grid_IP_Scanner2_v2.4.7_Setup.exe`)
   - 안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.4.7.apk`) 및 PWA 모바일 패키지 동시 제공
   - 로컬 푸시 스크립트 격리 및 클린 소스코드 전용 `.gitignore` 체계

9. **🚫 브라우저 자동 번역 팝업 원천 차단**
   - `index.html` 내 `notranslate` 및 `lang="ko"` 명시, 브라우저 실행 시 `--disable-features=Translate`, `--disable-translate`, `--lang=ko` 인자 주입으로 번역 제안 팝업 차단

10. **🚀 원클릭 GitHub 동기화 파이프라인 (`sync-github.sh` & `github-push.bat`)**
    - CLI/Bash 및 Windows 환경 모두에서 단 1회 명령으로 로컬 변경 사항을 커밋하고 GitHub Actions CI/CD를 호출하여 빌드 자동화

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```
[ Electron / Browser Frontend ]  <--- HTTP / WebSockets (Port 3031) --->  [ Embedded Go Backend Engine ]
         │                                                                             │
  React 19 + Vite                                                            C/Go Native DLL Bridges
  Tailwind CSS v4                                                           - SecureVault.dll (AES-256-GCM)
  Lucide Icons                                                              - OuiValidator.dll (MAC OUI)
  jsPDF & html2canvas (A4 Engine)                                           - Cross-Platform Raw Sockets
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
# 패치 버전 자동 상승 및 9개 대상 일괄 동기화
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

- [`docs/PATCH_NOTE.md`](docs/PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트 (v2.4.5 최신화)
- [`docs/WorkLog.md`](docs/WorkLog.md) : 개발 및 기능 구현 공식 작업 일지
- [`docs/GITHUB_GUIDE.md`](docs/GITHUB_GUIDE.md) : 깃허브 연동, .gitignore 격리 규칙 및 CI/CD 자동 배포 가이드
- [`docs/MOBILE_GITHUB_GUIDE.md`](docs/MOBILE_GITHUB_GUIDE.md) : 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
- [`docs/A4_REPORT_ENGINE_SPEC.md`](docs/A4_REPORT_ENGINE_SPEC.md) : A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
- [`docs/FILE_STRUCTURE_GUIDE.md`](docs/FILE_STRUCTURE_GUIDE.md) : 프로젝트 파일 및 디렉토리 상세 명세서
- [`docs/GRID_IP_SCANNER_2.md`](docs/GRID_IP_SCANNER_2.md) : 서비스 개요, 기술 사양 및 사용자 매뉴얼 백서
- [`docs/VERSIONING_POLICY.md`](docs/VERSIONING_POLICY.md) : SemVer 3단계 버전 관리 규정 및 SSOT 동기화 지침
- [`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`](docs/DISTRIBUTION_AND_TIER_STRATEGY.md) : 포터블 & 인스톨러 배포 전략 및 유료화 사양서
- [`docs/V3_FALSE_POSITIVE_GUIDE.md`](docs/V3_FALSE_POSITIVE_GUIDE.md) : AhnLab V3 오진 분석 및 화이트리스트 신청 가이드
- [`docs/DIGITAL_SIGNATURE_GUIDE.md`](docs/DIGITAL_SIGNATURE_GUIDE.md) : 테스트용 자가 서명(PowerShell) 가이드
- [`docs/SECURITY_REPORT.md`](docs/SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서
- [`docs/PROPRIETARY_TECHNOLOGY.md`](docs/PROPRIETARY_TECHNOLOGY.md) : 15대 핵심 독점 기술 및 코어 엔진 기술 명세서
- [`docs/LICENSE_KR.md`](docs/LICENSE_KR.md) : 한국어 라이선스 전문
- [`docs/LICENSE.md`](docs/LICENSE.md) : 프로그램 라이선스 계약서
- [`LICENSE.md`](LICENSE.md) : 공식 Source-Available 상용 라이선스 고지서

---

## 📜 라이선스 및 지적재산권 고지 (License & Intellectual Property)

> **"Source code is visible for security audit and transparency. Commercial redistribution or selling modified versions without permission is strictly prohibited."**  
> *(보안 검증 및 투명성을 위해 소스코드를 공개하며, 허가 없는 상업적 무단 복제, 재배포 및 재판매는 엄격히 금지됩니다.)*

* **소스코드 공개 목적 (Source-Available for Trust)**: 본 프로그램은 네트워크 보안 진단 툴의 신뢰성 검증과 백도어 유무 감사를 위해 소스코드가 투명하게 공개되어 있습니다.
* **비영리 개인 이용**: 개인 사용자의 비영리적 학습, 연구 및 자체 보안 진단 목적으로는 자유롭게 평가 및 테스트할 수 있습니다.
* **상업적 이용 및 재배포 제한**: 저작권자(**AhBiYout**)의 서면 승인 없이 본 소프트웨어 또는 그 수정본을 영리 목적으로 재판매, 유료 패키징, 서브라이선스 발행 또는 무단 재배포하는 행위는 대한민국 저작권법 및 국제 지적재산권 협약(WIPO)에 의해 엄격히 금지됩니다.
* **상용 라이선스 및 구매 문의**: 공식 스토어(Lemon Squeezy) 또는 저작권자 문의를 통해 기업/개인용 정식 상용 라이선스(Pro / Enterprise)를 취득하실 수 있습니다.

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*

