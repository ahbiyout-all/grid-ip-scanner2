# 🌐 Grid IP Scanner2 (v2.4.0)

> **초고속 네트워크 IP 스캐닝, IP 충돌 탐지 및 낯선 기기 감지 시스템**  
> **High-Performance Network IP Scanner, Conflict Detector & Intruder Defense Suite**

---

## 📌 개요 (Overview)

**Grid IP Scanner2**는 C++/Go 기반의 고성능 네이티브 엔진과 React 19 / Vite 기반의 직관적인 사용자 인터페이스를 결합한 종합 네트워크 관리 및 보안 모니터링 솔루션입니다.  
로컬 네트워크(LAN) 내 활성 기기 탐지, MAC 주소 기반 제조사 분석, IP/MAC 충돌 탐지, 그리고 **Soft Trust 유예 기간을 지원하는 낯선 기기 감시 모드**를 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

1. **⚡ 초고속 네트워크 IP 스캐닝 & 16x16 그리드 맵**
   - Go 기반 멀티스레드 Ping/ARP/mDNS 스캐닝 엔진
   - C/C++ OUI 검증 모듈을 통한 MAC 제조사 즉각 식별
   - 25개 주요 서비스 포트 정밀 스캐닝 및 위험도 분류

2. **📸 스냅샷 비교(Diff) 4색 진단 & 대화형 필터**
   - 과거 기준점 대비 변경 사항을 4색 컬러 시스템으로 직관적 시각화:
     - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 배경 + 펄스 링
     - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 빗금 패턴
     - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지
      - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 선명한 하늘색(Sky Blue 🔵) 기본 적용 (상단 범례에서 보라/청록/회색 원클릭 색상 변경 팔레트 지원)
   - 대화형 카테고리 필터(`+신규`, `-이탈`, `!변동`, `=유지`) 및 우측 전후 대조 카드 제공
   - 오프라인 노드 대상 기준점 MAC 보존 기반 **원격 부팅(Wake-on-LAN, Pro 전용)** 원클릭 지원

3. **📊 내보내기 & A4 보안 감사 리포트 드롭다운 메뉴**
   - 툴바 공간 효율을 극대화한 통합 드롭다운 팝오버 메뉴
   - CSV 스프레드시트, JSON 계층 데이터, 기업 전산 감사용 A4 규격 HTML/PDF 보고서 즉각 출력

4. **🛡️ 낯선 기기 감시 및 Soft Trust 유예 시스템 (Intruder Watch Mode - PRO)**
   - **Pro 라이선스 연동**: 60초 주기 무인 백그라운드 자동 스캔, 침입 즉각 오디오 비프음 및 OS 네이티브 데스크톱 알림
   - 새롭게 연결된 미등록 기기 실시간 감지 및 정상 기기 화이트리스트 영구 보존
   - **Soft Trust Grace Period**: 동일 OUI, 호스트명, 또는 사설 MAC(Randomized MAC)을 사용하는 기존 친숙 기기에 대해 과도한 오경보를 방지하는 지능형 유예 모드 제공
   - 지능형 Fingerprint 유사도 분석 (0~100% 매칭 점수 산출)

5. **⚠️ IP / MAC 충돌 감지 (Conflict Detection)**
   - 동일 IP에 복수 MAC이 응답하거나, IP가 변경된 기기 즉각 포착
   - 시각적 충돌 아이콘 및 상세 경고 패널 표시

6. **🔒 Secure Vault 네이티브 암호화 (AES-256-GCM)**
   - C++/Go 네이티브 DLL 기반 초고속 AES-256-GCM 암호화
   - 기기 별칭(Alias) 및 스냅샷 저장소의 민감 데이터 무단 접근 차단

7. **🔑 오프라인 라이선스 매니저, 낯선 기기 감시 & 원격 부팅(WoL) Pro 게이트 & 30일 체험권**
   - Ed25519 비대칭 암호키 기반 100% 오프라인 라이선스 검증 (폐쇄망 완벽 대응)
   - 낯선 기기 감시(Intruder Watch), 원격 부팅(Wake-on-LAN), Diff 엔진, 심층 포트 감사, A4 리포트 등 Pro 핵심 기능 라이선스 게이팅
   - 데모 Pro 키(`GRID-PRO-TRIAL-2026` 등) 입력 시 **30일 정식 Pro 체험권** 자동 발급

8. **📦 무설치 포터블 & 설치형 지원 (Portable & Setup Installer)**
   - 단일 포터블 실행 파일 및 Inno Setup 기반 자동 설치 패키지 제공
   - 사용자 지정 포트 선택 및 로컬 내장 서버 자동 연동

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```
[ Electron / Browser Frontend ]  <--- HTTP / WebSockets (Port 3031) --->  [ Embedded Go Backend Engine ]
         │                                                                             │
  React 19 + Vite                                                            C/Go Native DLL Bridges
  Tailwind CSS v4                                                           - SecureVault.dll (AES-256-GCM)
  Lucide Icons                                                              - OuiValidator.dll (MAC OUI)
```

---

## 🚀 시작하기 (Getting Started)

### 개발 환경 구동 (Development)
```bash
# 의존성 패키지 설치
npm install

# 개발 서버 실행 (React UI + Go Proxy Server)
npm run dev
```

### 버전에 따른 동기화 빌드 (SSOT Version Sync & Build)
```bash
# 패치 버전 자동 상승 및 8개 대상 동기화 빌드
npm run version:bump

# 실행 파일 및 배포용 패키지 생성
npm run build:exe
```

---

## 📂 문서 구조 (Documentation)

- [`docs/PATCH_NOTE.md`](./PATCH_NOTE.md) : 버전별 변경 내역 및 상세 패치 노트
- [`docs/WorkLog.md`](./WorkLog.md) : 작업 이력 및 모듈 개발 기록
- [`docs/NATIVE_DLL_INTEGRATION_GUIDE.md`](./NATIVE_DLL_INTEGRATION_GUIDE.md) : C++/Go 네이티브 DLL FFI 연동 명세
- [`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md) : 보안 점검 및 암호화 검증 보고서
- [`docs/LICENSE_KR.md`](./LICENSE_KR.md) : 한국어 라이선스 전문
- [`docs/LICENSE_EN.md`](./LICENSE_EN.md) : English License Agreement

---

© 2025-2026 **AhBiYout**. All rights reserved.
