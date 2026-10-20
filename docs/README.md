# 🌐 Grid IP Scanner2 (v2.4.4)

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

2. **📄 A4 규격 최적화 PDF 보고서 출력 엔진 (`services/reportGenerator.ts`)**
   - **스마트 페이지네이션 (Zero Row-Chopping)**: 794px x 1123px (A4 1:1.4142) 독립 페이지 모델로 테이블 행 및 텍스트 줄 잘림 원천 방지
   - **프린터 안전 여백 (11mm Margin)**: 일반 사무용 및 가정용 프린터에서 출력해도 글자 잘림 없는 안전 여백 확보
   - **동적 페이지 번호**: 모든 페이지에 `페이지 X / Y` 형태의 전체 대비 현재 페이지 번호 및 공식 헤더/푸터 동기화
   - **브라우저 직접 인쇄(Ctrl+P) 지원**: `@media print` 스타일시트를 통한 배경색 및 뱃지 완벽 보존

3. **📸 스냅샷 비교(Diff) 4색 진단 & 대화형 필터**
   - 과거 기준점 대비 변경 사항을 4색 컬러 시스템으로 직관적 시각화:
     - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 배경 + 펄스 링
     - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 빗금 패턴
     - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지
     - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 선명한 하늘색(Sky Blue 🔵) 기본 적용 (팔레트 변경 지원)
   - 오프라인 노드 대상 기준점 MAC 보존 기반 **원격 부팅(Wake-on-LAN, Pro 전용)** 원클릭 지원

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
   - 단일 무설치 포터블 실행 파일 및 Inno Setup 기반 정식 인스톨러(`Grid_IP_Scanner2_v2.4.4_Setup.exe`)
   - 안드로이드 스마트폰 전용 APK(`Grid_IP_Scanner2_v2.4.4.apk`) 및 PWA 모바일 패키지 동시 제공
   - 로컬 푸시 스크립트 격리 및 클린 소스코드 전용 `.gitignore` 체계

9. **🚫 브라우저 자동 번역 팝업 원천 차단**
   - `index.html` 내 `notranslate` 및 `lang="ko"` 명시, 브라우저 실행 시 `--disable-features=Translate` 인자 주입으로 번역 제안 팝업 차단

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
# 윈도우 환경 원클릭 푸시 (푸시 스크립트 및 바이너리는 업로드 제외)
github-push.bat
# 또는 npm run git:push
```

---

## 📂 문서 구조 (Documentation)

- [`docs/PATCH_NOTE.md`](./PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트 (v2.4.4 최신화)
- [`docs/WorkLog.md`](./WorkLog.md) : 작업 이력 및 모듈 개발 공식 일지
- [`docs/GITHUB_GUIDE.md`](./GITHUB_GUIDE.md) : 깃허브 연동, .gitignore 격리 규칙 및 CI/CD 자동 배포 가이드
- [`docs/MOBILE_GITHUB_GUIDE.md`](./MOBILE_GITHUB_GUIDE.md) : 모바일 APK 및 PWA 단일 리포지토리 배포 가이드
- [`docs/FILE_STRUCTURE_GUIDE.md`](./FILE_STRUCTURE_GUIDE.md) : 프로젝트 파일 및 디렉토리 상세 명세서
- [`docs/V3_FALSE_POSITIVE_GUIDE.md`](./V3_FALSE_POSITIVE_GUIDE.md) : AhnLab V3 오진 분석 및 화이트리스트 신청 가이드
- [`docs/A4_REPORT_ENGINE_SPEC.md`](./A4_REPORT_ENGINE_SPEC.md) : A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
- [`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서
- [`docs/LICENSE_KR.md`](./LICENSE_KR.md) : 한국어 라이선스 전문
