# 🛡️ Grid IP Scanner2 - 보안 점검 보고서 (Security Audit Report)

> **보안 검증 대상**: Grid IP Scanner2 v2.5.0 (12-DLL Native Architecture)  
> **점검 항목**: PBKDF2+AES-256-GCM 암호화, 데이터 무결성, 네트워크 격리, DLL 경로 고정·JSON 방어, Proxy-ARP 비알림 분리, 백신 오진 대응  
> **최종 판정**: ✅ PASS (보안 수준 최우수)

---

## 1. 데이터 보관 및 암호화 점검 (Data Storage & Encryption)

- **PBKDF2-HMAC-SHA256 & AES-256-GCM (`GVAULT11`) 암호화 검증**:
  - 사용자 디바이스 별칭(Alias) 및 스냅샷 DB 보관 시 `grid_vault_driver.dll` / `secure_vault.dll` (`v2.6.0`) C/C++ 네이티브 암호화 엔진을 통과합니다.
  - **`GVAULT11` 하드닝 포맷**: 매 암호화 시 16바이트 CSPRNG 솔트(`BCryptGenRandom` / `CryptGenRandom` / `/dev/urandom`)를 생성해 **PBKDF2-HMAC-SHA256(10,000회 반복)** 키 파생을 수행하며, 256바이트 스택 고속 경로(Fast-Path)로 성능 병목 없이 대용량 항목을 암복호화합니다.
  - GCM(Galois/Counter Mode) 128비트 인증 태그 및 상수시간 태그 검증, 엄격한 Base64 패딩 검증을 적용하여 외부 무단 수정·위변조 시 복호화 단계에서 `VAULT_ERR_AUTH_FAILED (-3)` 오류를 반환하고 즉시 차단합니다.
- **메모리 보안**:
  - 메모리 상의 평문 데이터, 솔트, 파생 키는 연산 직후 `SecureZeroMemory` / `ZeroMemory` / `memset` 프로토콜로 소거하여 메모리 덤프 공격에 대비합니다.

---

## 2. 네트워크 및 데이터 프라이버시 (Network Isolation & Zero Telemetry)

- **외부 전송 통제**:
  - 외부 클라우드나 사외 서버로 어떠한 원격 측정(Telemetry) 데이터도 수집 또는 전송하지 않습니다.
  - 모든 ICMP/ARP/IOCP 스캐닝, OUI/UPnP/mDNS 식별 및 토폴로지 분석은 100% 로컬 네트워크 인터페이스에서 직접 수행됩니다.
- **Port Binding Security**:
  - 로컬 내장 Go 서버는 `127.0.0.1` 루프백 인터페이스에만 바인딩되어 외부 네트워크망에서의 웹 UI 무단 접근을 방지합니다.

---

## 3. 낯선 기기 감시, LAA 역추적 & 게이트웨이 Proxy-ARP 분리

- **OUI 시맨틱 다중 시그널 & `grid_topology_guard.dll` (`v2.6.1`)**:
  - MAC 주소만으로 판단하는 한계를 극복하기 위해 OUI 코드, 호스트명, mDNS 레코드, UPnP XML, 개방 포트 프로필을 복합 점수화하여 사설 랜덤 MAC(LAA)도 교차 역추적합니다.
- **게이트웨이 Proxy-ARP 정상 판별 & Soft Trust Grace Period**:
  - 학교·캠퍼스·기업망의 L3 스위치 Proxy-ARP 또는 가상 게이트웨이(VIP) 동일 MAC 다중 IP 응답은 **`Gateway Proxy-ARP` 비알림 Info**로 안전하게 분리하고, 일반 소비자 브랜드(`asus`, `synology`, `qnap`)는 인프라 예외에서 제외하여 실제 악성 MAC 복제/스푸핑 경보를 은폐하지 않습니다.

---

## 4. DLL 바이너리 모듈 보안 (Native Code Security & Path Pinning)

- **Safe DLL Path Pinning (`LoadLibraryExW`)**:
  - 12대 네이티브 DLL 로드 시 `LOAD_LIBRARY_SEARCH_APPLICATION_DIR` 경로 고정 및 `wpcap.dll`의 `LOAD_LIBRARY_SEARCH_SYSTEM32` 고정을 적용해 DLL 하이재킹(DLL Side-Loading) 공격을 원천 차단합니다.
- **JSON 입력 방어 & 동시성 안전화**:
  - 네이티브 C JSON 브리지(`grid_topology_guard.c`, `grid_fingerprint_engine.c`)는 중첩 깊이·따옴표 인식 파서 및 음수 포트(`[-23]`) 방어 로직을 탑재했으며, Win32 비동기 ICMP/IOCP 엔진은 스레드 레이스 제거 및 `CancelIoEx` 안전 종료 드레인을 준수합니다.
- **Fallback 안전장치**:
  - DLL 로드 실패 또는 비-Windows 환경 발생 시 Go/WebAssembly 내장 `crypto` 및 순수 Go 토폴로지 모듈로 무중단 폴백하여 가용성을 보장합니다.

---

## 5. A4 최적화 PDF 보안 감사 보고서 무결성 (A4 Audit Report Engine)

- **100% 로컬 클라이언트 생성**:
  - 외부 렌더링 서버나 서드파티 클라우드를 경유하지 않고, `services/reportGenerator.ts` 내장 스마트 페이지네이션 엔진을 통해 브라우저/로컬 메모리 상에서만 PDF 바이너리를 직접 생성합니다.
- **A4 규격 정합성 및 기밀 등급 표기**:
  - 인쇄 시 행 잘림 없는 794x1123px A4 페이지 모델 적용 및 매 페이지 하단 `CONFIDENTIAL` 보안 등급과 동적 페이지 번호 동기화.

---

## 6. 백신 오진(False Positive) 방어 및 V3 대응

- **12대 네이티브 DLL 분리 설치 & 컴파일 경로 난독화 (`-trimpath`)**:
  - 정식 인스톨러(`Setup.exe`) 설치 시 12개 네이티브 DLL을 독립 바이너리로 분리 배치하고, `-trimpath` 및 정적 링크(`-static-libgcc -static-libstdc++`)를 적용해 휴리스틱 오탐 점수를 최소화했습니다.
- **공식 오진 소명 및 예외 가이드**:
  - `docs/V3_FALSE_POSITIVE_GUIDE.md`를 통해 안랩 Smart Defense(ASD) 오탐 분석 및 검사 예외 등록 지침을 제공합니다.

---

© 2026 **Grid IP Scanner2 Security Team**. Confidential Security Audit Record.
