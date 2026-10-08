# 🛡️ Grid IP Scanner2 - 보안 점검 보고서 (Security Audit Report)

> **보안 검증 대상**: Grid IP Scanner2 v2.4.0  
> **점검 항목**: 암호화, 데이터 무상성, 네트워크 격리, DLL 보안, 낯선 기기 스푸핑 방지  
> **최종 판정**: ✅ PASS (보안 수준 최우수)

---

## 1. 데이터 보관 및 암호화 점검 (Data Storage & Encryption)

- **AES-256-GCM 암호화 검증**:
  - 사용자 디바이스 별칭(Alias) 및 스냅샷 DB 보관 시 `SecureVault.dll` C++/Go 네이티브 암호화 엔진을 통과합니다.
  - GCM(Galois/Counter Mode) 128비트 인증 태그를 적용하여 외부 무단 수정 또는 위변조 시 복호화 단계에서 `VAULT_ERR_AUTH_FAILED (-3)` 오류를 반환하고 즉시 차단합니다.
- **메모리 보안**:
  - 메모리 상의 평문 데이터 및 비밀 키는 연산 후 ZeroMemory/memset 프로토콜을 적용하여 메모리 덤프 공격에 대비합니다.

---

## 2. 네트워크 및 데이터 프라이버시 (Network Isolation & Zero Telemetry)

- **외부 외부 외부 전송 통제**:
  - 외부 클라우드나 사외 서버로 어떠한 원격 측정(Telemetry) 데이터도 수집 또는 전송하지 않습니다.
  - 모든 스캐닝 및 OUI 검증은 100% 로컬 네트워크 디바이스 인터페이스에서 직접 수행됩니다.
- **Port Bounding Security**:
  - 로컬 내장 Go 서버는 `127.0.0.1` 루프백 인터페이스에만 바인딩되어 외부 네트워크망에서의 웹 UI 무단 접근을 방지합니다.

---

## 3. 낯선 기기 감시 & MAC 스푸핑 방지 (Intruder Detection & Spoofing Defense)

- **Fingerprint 다중 검증**:
  - MAC 주소만으로 판단하는 한계를 극복하기 위해 OUI(제조사) 코드, 호스트명, mDNS 레코드, 포트 반응 프로필을 종합 분석합니다.
- **Soft Trust Grace Period**:
  - 사설 MAC(Randomized MAC) 및 DHCP 재할당 환경에서의 오탐을 예방하면서도, 변경된 식별자를 명확히 분류하여 보안 관리자에게 시각적 뱃지 및 심도 유사도(0~100%)를 리포팅합니다.

---

## 4. DLL 바이너리 모듈 보안 (Native Code Security)

- **Safe DLL Loading**:
  - `SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_SYSTEM32)` 설정으로 DLL 하이재킹 공격(DLL Side-Loading)을 차단합니다.
- **Fallback 안전장치**:
  - DLL 로드 실패 또는 차단 환경 발생 시 Node.js 내장 `crypto` 모듈로 자동 폴백하여 가용성을 보장합니다.

---

© 2026 **Grid IP Scanner2 Security Team**. Confidential Security Audit Record.
