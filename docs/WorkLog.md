# 📝 Grid IP Scanner2 - 작업 로그 (Work Log)

---

## 📅 [2026-10-08] - Grid IP Scanner2 v2.4.0 개발 작업 완료

### 1. C++/Go 네이티브 Secure Vault DLL 설계 및 구현
- **요구사항**: 디바이스 별칭(Alias) 및 스냅샷 저장소의 보안 강화를 위한 초고속 AES-256-GCM 암호화/복호화 모듈 구축.
- **작업 내용**:
  - `native_dll/secure_vault.h` 및 `secure_vault.cpp` 구현 (OpenSSL / Crypto++ 지원 C++ 구현).
  - `native_dll/vault_gcm_core.go` 및 `grid_vault_driver.go` 구현 (Go cgo 기반 C-ABI DLL 내보내기).
  - C-Style FFI 내보내기 함수 정의:
    - `int EncryptDataGCM(const unsigned char* plaintext, int plainLen, const unsigned char* key, unsigned char* ciphertext, unsigned char* iv, unsigned char* tag)`
    - `int DecryptDataGCM(const unsigned char* ciphertext, int cipherLen, const unsigned char* key, const unsigned char* iv, const unsigned char* tag, unsigned char* plaintext)`
  - FFI 인터페이스 연동 가이드 문서화 (`docs/NATIVE_DLL_INTEGRATION_GUIDE.md`).

### 2. 낯선 기기 감시 모드 개선 & Soft Trust 유예 로직 탑재
- **요구사항**: 재탐색 시 기존 친숙 기기가 IP 변경이나 무작위 MAC 사용으로 인해 낯선 기기(Intruder)로 오진되는 문제 해결.
- **작업 내용**:
  - `types.ts` 내 `SoftTrustInfo` 인터페이스 정의 및 `DeviceInfo`, `ScanResult` 확장.
  - `services/conflictDetector.ts` 내 지능형 Fingerprint 유사도 측정 알고리즘 개발 (`computeFingerprintSimilarity`):
    - OUI 매칭, 호스트명 유사도, mDNS 식별자, 오픈 포트 서명 비교.
    - 무작위/사설 MAC(Randomized MAC - bit 1 of first octet) 자동 감지.
    - 유예 조건 충족 시 `softTrusted` 디바이스 목록으로 분류.
  - `App.tsx` 내 역사적 디바이스 맵(`historicalDevices`) 구축 및 `softTrustedDevices` 추출 로직 연결.
  - 필터 탭에 `Soft Trust (유예 중)` 버튼 추가 및 선택 시 상세 사이드바에 유예 사유, Fingerprint 매칭률(%) 카드 연동.
  - `components/IPCell.tsx` 셀 카드에 🛡️SOFT 방패 배지 UI 반영.

### 3. Windows Go 백엔드 빌드 안정화
- **요구사항**: `utils_windows.go` 파일의 `syscall.ByteSliceToString` 및 `net` 패키지 참조 오류 해결.
- **작업 내용**:
  - `utils_windows.go` 내 패키지 임포트(`import "net"`) 추가 및 `windows.UTF16PtrToString` / C-string 변환 함수 정형화.
  - 포터블 커스텀 포트(예: 3031) 생성 및 인젝션 플래그 정상 작동 확인.

### 4. 문서 통합 관리 (docs/)
- **작업 내용**:
  - `docs/README.md`: 프로젝트 개요 및 빌드/실행 안내.
  - `docs/PATCH_NOTE.md`: v2.4.0 주요 변경사항 기재.
  - `docs/NATIVE_DLL_INTEGRATION_GUIDE.md`: DLL 연동, 메모리 관리, 에러 코드 명세 작성.
  - `docs/SECURITY_REPORT.md`: AES-256-GCM 보안성 및 낯선 기기 검증 보고서 작성.
  - `docs/LICENSE_KR.md` & `docs/LICENSE_EN.md`: 이중 언어 라이선스 정리.
  - `docs/WorkLog.md`: 전체 히스토리 업데이트.

---

## 📅 [2026-10-05] - Grid IP Scanner2 v2.3.2 작업
- 동적 버전 파이프라인(`scripts/sync-version.js`) 구축.
- Inno Setup 스크립트 연동 및 자동 릴리스 빌드 파이프라인 정비.
