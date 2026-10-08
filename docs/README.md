# 🌐 Grid IP Scanner2 (v2.4.0)

> **초고속 네트워크 IP 스캐닝, IP 충돌 탐지 및 낯선 기기 감지 시스템**  
> **High-Performance Network IP Scanner, Conflict Detector & Intruder Defense Suite**

---

## 📌 개요 (Overview)

**Grid IP Scanner2**는 C++/Go 기반의 고성능 네이티브 엔진과 React 19 / Vite 기반의 직관적인 사용자 인터페이스를 결합한 종합 네트워크 관리 및 보안 모니터링 솔루션입니다.  
로컬 네트워크(LAN) 내 활성 기기 탐지, MAC 주소 기반 제조사 분석, IP/MAC 충돌 탐지, 그리고 **Soft Trust 유예 기간을 지원하는 낯선 기기 감시 모드**를 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

1. **⚡ 초고속 네트워크 IP 스캐닝 (High-Speed Scanning)**
   - Go 기반 멀티스레드 Ping/ARP 스캐닝 엔진
   - C/C++ OUI 검증 모듈을 통한 MAC 제조사 즉각 식별
   - 포트 스캐닝 (HTTP, HTTPS, SSH, RDP, SMB 등 주요 포트 감지)

2. **🛡️ 낯선 기기 감시 및 Soft Trust 유예 시스템 (Intruder Detection & Soft Trust)**
   - 새롭게 연결된 미등록 기기 실시간 감지 및 경고
   - **Soft Trust Grace Period**: 동일 OUI, 호스트명, 또는 MAC 주소 무작화(Randomized MAC)를 사용하는 기존 친숙 기기에 대해 과도한 오경보를 방지하는 유예 모드 제공
   - 지능형 Fingerprint 유사도 분석 (0~100% 매칭 점수 산출)

3. **⚠️ IP / MAC 충돌 감지 (Conflict Detection)**
   - 동일 IP에 복수 MAC이 응답하거나, IP가 변경된 기기 즉각 포착
   - 시각적 충돌 아이콘 및 상세 경고 패널 표시

4. **🔒 Secure Vault 네이티브 암호화 (AES-256-GCM)**
   - C++/Go 네이티브 DLL 기반 초고속 AES-256-GCM 암호화
   - 기기 별칭(Alias) 및 스냅샷 저장소의 민감 데이터 무단 접근 차단

5. **📦 무설치 포터블 & 설치형 지원 (Portable & Setup Installer)**
   - 단일 포터블 실행 파일(`Grid IP Scanner2 v2.4.0.exe`) 및 Inno Setup 기반 자동 설치 패키지 제공
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
