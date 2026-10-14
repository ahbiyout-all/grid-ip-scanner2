# 📝 Grid IP Scanner2 - 작업 로그 (Work Log)

---

## 📅 [2026-10-14] - Grid IP Scanner2 v2.4.2: 원격 부팅 Pro 기능화 및 Pro 전략 수립

### 1. 원격 부팅 (Wake-on-LAN) Pro 에디션 기능 전환 및 라이선스 게이팅
- **요구사항**: 원격 부팅(WoL)을 유료 Pro 라이선스 기능으로 제한하고, Free 티어에서의 차단 및 Pro 티어에서의 원활한 작동을 보장.
- **작업 내용**:
  - `types.ts`: `LicenseFeatures` 인터페이스에 `remoteBoot: boolean` 속성 추가.
  - `services/licenseManager.ts`:
    - `DEFAULT_FREE_FEATURES`: `remoteBoot: false`로 설정.
    - `PRO_FEATURES` & `ENTERPRISE_FEATURES`: `remoteBoot: true`로 설정.
    - 로컬 스토리지 역직렬화 시 구버전 캐시 호환성을 위해 `tier` 기반 `remoteBoot` 자동 동기화 로직 보강.
  - `App.tsx`:
    - `handleSendWakeOnLan`: 실행 전 `license.features.remoteBoot` 검증. 미인증 시 안내 토스트 출력 및 라이선스 모달 자동 팝업.
    - 상세 패널 WoL UI: 미인증 시 `PRO 전용` 뱃지 및 안내 메시지 노출, 인증 시 `PRO 활성` 뱃지와 함께 매직 패킷 발송 허용.
    - 라이선스 관리 모달: `기능 해금 현황` 매트릭스에 `원격 부팅 (Wake-on-LAN)` 항목 추가.

### 2. Pro 기능 제한 기준 및 신규 Pro 기능 추천 로드맵 수립
- **작업 내용**:
  - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md` 섹션 8 추가:
    - **Pro 제한 대상**: 원격 부팅(WoL), 심층 포트 감사(25개 포트/서비스 배너), 4색 스냅샷 Diff 비교, A4 PDF 보안감사 보고서, 다중 서브넷 확장, 24/7 침입자 경보, 자산 별칭 영구 동기화.
    - **신규 Pro 추천 기능 6선**: 1) 다중 단말 일괄 원격 제어(Batch WoL & Shutdown), 2) 스케줄링 무인 스캔 & 웹훅(Slack/Discord) 알림, 3) ARP 스푸핑/게이트웨이 사칭 감지, 4) L2/L3 스위치 포트 매핑(SNMP), 5) DHCP 풀 고갈 예측기, 6) 자산 변동 이력 타임라인.

---

## 📅 [2026-10-14] - Grid IP Scanner2 v2.4.1 고도화 작업 완료

### 1. 내보내기 및 보안 감사 리포트 드롭다운 UI 개편
- **요구사항**: 상단 네비게이션 헤더에 복잡하게 나열되던 CSV, JSON 및 A4 감사 보고서 버튼을 드롭다운 방식으로 통합하여 가독성 및 공간 최적화 달성.
- **작업 내용**:
  - `showExportDropdown` 상태 및 드롭다운 토글 버튼 구현 (`Download` 아이콘과 화살표 애니메이션).
  - 팝오버 메뉴 내 포맷 3종(CSV 테이블, JSON 계층 데이터, A4 보안감사 PDF 리포트)의 아이콘, 명칭, 설명 카드 구성.
  - 외부 영역 클릭 시 드롭다운 닫기 이벤트 리스너 탑재 및 테마(다크/베이지) 맞춤형 유리 모피즘(Glassmorphism) 스타일링 적용.

### 2. 스냅샷 비교(Diff) 4색 명확한 색상 차이 및 진단 고도화
- **요구사항**: 스냅샷 비교 시 변경 상태(신규, 이탈, 변동, 유지)가 한눈에 구분되도록 색상 시각화 강화.
- **작업 내용**:
  - `components/IPCell.tsx` 셀 렌더러에 4대 색상 체계 반영:
    - `+NEW` (신규): 에메랄드 그린 배경 + 네온 테두리 + 펄스 인디케이터.
    - `-OFF` (오프라인 이탈): 고대비 로즈 레드 배경 + 대각선 오프라인 빗금 패턴.
    - `!CHG` (식별자 변동): 앰버 오렌지 테두리 + 경고 뱃지 + 볼드 텍스트.
    - `=SAME` (기준점 동일 유지): 기존 어두운 회색에서 선명한 **하늘색(Sky Blue 🔵)**으로 기본 개편되어 비활성 셀과 명확히 구분되며, 상단 범례에서 보라/청록/회색 원클릭 전환 지원.
  - 상단 Diff 패널에 대화형 카테고리 필터(`diffFilter`: 'all', 'new', 'offline', 'changed', 'same') 및 기준점 색상 선택 팔레트(`diffBaselineColor`: sky, indigo, teal, slate) 연동.
  - 우측 상세 프로필 패널에 전용 **스냅샷 비교 진단 카드** 추가:
    - 변동 노드: 기준점 vs 현재의 MAC/호스트명 2단 비교 표 제공.
    - 오프라인 노드: 기준점 MAC 기반 원클릭 **WoL (Wake-on-LAN)** 패킷 발송 연동.

### 3. 데모 Pro 라이선스 30일 체험 사용권 전환 엔진 구현
- **요구사항**: 현재 데모 Pro 키 입력 시 고정 만료일 대신 활성화일 기준 30일 체험 사용권으로 적용.
- **작업 내용**:
  - `services/licenseManager.ts` 내 `activateLicense` 로직 개편:
    - 데모/체험 키(`GRID-PRO-TRIAL-2026`, `GRID-PRO-DEMO`, `PRO-DEMO`, `DEMO-PRO` 등) 입력 시 `Date() + 30일`의 동적 `expiresAt` 타임스탬프 계산 및 저장.
    - 라이선스 대상자 명칭을 `Registered Pro Trial User (30-Day Demo)`로 설정.
    - UI 알림 및 모달에 30일 무료 체험 안내 및 원클릭 키 자동 입력 버튼 반영.

### 4. 기술 문서 동기화
- **작업 내용**:
  - `docs/PATCH_NOTE.md`: v2.4.1 변경사항 기술.
  - `docs/WorkLog.md`: 당일 작업 이력 정리.
  - `docs/GRID_IP_SCANNER_2.md`: Diff 4색 체계 및 내보내기/30일 체험 라이선스 최신화.
  - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md`: 30일 Pro Trial 라이선싱 메커니즘 명시.
  - `docs/README.md`: 핵심 기능 최신화.

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
