# Portable USB 복제 방지 및 하이브리드 Ed25519 라이선스 보안 사양서

**문서 목적**: `Grid IP Scanner2` 포터블(Portable) 버전에서 Pro 라이선스를 인증한 뒤 실행 폴더 전체를 여러 개의 USB 드라이브로 복사하여 무단 분산·동시 사용하는 행위를 차단하기 위한 연구 결과 및 구현 아키텍처 명세입니다.

---

## 1. 기존 구조의 취약점 분석 (Threat Model)

기존 라이선스 구현(`main.go`, `services/licenseManager.ts`)에서는 다음 4가지 경로로 포터블 USB 다중 복제 및 무료 우회가 가능했습니다.

1. **실행 파일 옆 평문 JSON 저장 (`license.key`)**: USB 폴더 전체를 다른 USB로 복사하면 평문 파일까지 그대로 복제되어 즉시 Pro 권한이 열렸습니다.
2. **볼륨 시리얼/단말기 바인딩 부재**: 실행 중인 USB 컨트롤러 또는 PC 하드웨어를 대조하지 않아 어느 드라이브로 복사해도 제한이 없었습니다.
3. **클라이언트 측 서명 검증 누락 및 접두사 우회**: Ed25519 공개키 상수는 선언되어 있었으나 실제 서명 검증이 빠진 채 `PRO-`/`DEMO-`/`ENT-` 접두사 또는 서명 없는 Base64 페이로드만으로 Pro가 활성화되었고, `.toUpperCase()` 정규화로 Base64 서명 토큰이 훼손되는 결함이 있었습니다.
4. **시계 역행 및 LAN 동시 실행 탐지 부재**: 시스템 날짜를 과거로 되돌려 체험/임대 만료를 회피하거나, 동일 사무실 LAN 내에서 같은 라이선스 사본 여러 대를 동시에 띄워도 탐지할 수 없었습니다.

---

## 2. 다중 방어선 아키텍처 (Defense-in-Depth)

### 2.1. 정품 USB 물리 컨트롤러 바인딩 (`utils_windows.go`, `utils_other.go`)
- **볼륨 시리얼(VSN) 단독 사용 배제**: FAT32/NTFS 볼륨 시리얼은 유틸리티로 쉽게 복제 가능하므로 주 식별자로 사용하지 않습니다.
- **물리 USB 컨트롤러 지문(SHA-256)**:
  - **Windows**: `GetDriveTypeW` + PowerShell CIM(`Win32_LogicalDisk → Win32_DiskPartition → Win32_DiskDrive`)으로 USB 버스 여부와 **VID/PID + 물리 디스크/USB 컨트롤러 시리얼 + 모델 + 용량**을 추출합니다. UASP/외장 SSD처럼 `DRIVE_FIXED`로 보고되더라도 `InterfaceType=USB` 또는 `USBSTOR` PNP ID가 감지되면 USB 매체로 식별합니다.
  - **Linux / macOS**: `findmnt` 및 `/sys/class/block/<dev>/device`와 sysfs USB 부모(`idVendor`, `idProduct`, `serial`)를 조회합니다.
  - **이동성 보장**: PC 마더보드가 아닌 **정품 USB 하드웨어 지문**에 귀속하므로, 엔지니어가 정품 USB 1개를 여러 고객사 PC에 꽂아 점검할 때는 정상 Pro로 동작합니다.
  - **초저가 USB 폴백 Cap**: 물리 컨트롤러 시리얼이 없는 저가형/더미 시리얼 USB는 `HasHardwareSerial = false`로 분류해 오프라인 유예 상한을 **24시간**으로 제한합니다.

### 2.2. AES-256-GCM 하드웨어 봉인 파일 (`license.sealed.json`)
- 모든 인증 상태는 평문 `license.key` 대신 **`license.sealed.json`** 에 AES-256-GCM으로 암호화·무결성 인증(AEAD + AAD)하여 저장합니다.
- 암호화 키는 `HMAC-SHA256(앱 도메인 솔트, 현재 매체의 물리 하드웨어 지문)`으로 파생됩니다.
- **복제 탐지 결과**: USB A의 폴더 전체를 USB B 또는 로컬 PC로 복사하면 USB B의 하드웨어 지문이 달라 AES-GCM 태그 검증이 즉시 실패하며, 앱은 자동으로 무료 커뮤니티 에디션으로 강등하고 `clone_mismatch` 경고를 표시합니다.

### 2.3. 백엔드 단일 진실 원천 & 실제 Ed25519 검증 (`license_guard.go`, `services/licenseManager.ts`)
- Go 백엔드(`crypto/ed25519`, `crypto/x509.ParsePKIXPublicKey`)가 내장된 SPKI 공개키(`GRID_ED25519_PUBLIC_KEY`)로 `GSCAN.<PAYLOAD_B64>.<SIG_B64>` 및 `<PAYLOAD_B64>.<SIG_B64>` 토큰의 64바이트 Ed25519 서명을 직접 검증합니다.
- 기존 `PRO-*`, `DEMO-*`, `ANNUAL-*`, `ENT-*` 무서명 접두사 우회 및 무서명 Base64 디코딩 경로는 전면 제거되었습니다.
- 30일 평가판 키(`GRID-PRO-TRIAL-2026`)는 현재 하드웨어에 봉인된 1회성 체험으로만 허용되며, 초기화(`Deactivate`) 이후에도 `TrialUsed = true`가 봉인 파일에 유지되어 재활성화 우회를 차단합니다.
- 프론트엔드는 `localStorage`의 `tier` 값을 맹신하지 않고 기동 시 및 60초 주기로 `/api/license/status`에서 백엔드 검증 결과를 동기화합니다.

### 2.4. 단조 시계 역행 방지 & 하이브리드 온라인 임대(Lease)
- **Anti-Rollback 단조 타임스탬프**: 마지막 검증 시각(`lastVerifiedMonoUtc`)을 봉인 파일 내부에 기록하여, PC 시계를 5분 이상 과거로 되돌리면 `clock_tamper`로 즉시 Pro 기능을 잠급니다.
- **하이브리드 임대 클라이언트(`GRID_LICENSE_SERVER_URL`)**:
  - 서버 URL이 설정된 경우 `POST /v1/licenses/activate`, `/refresh`, `/deactivate`를 통해 온라인 시트(Seat) 점유·갱신·USB 이전 해제를 수행합니다(`hybridMode = "online_verified"`).
  - 폐쇄망/외근 중 오프라인 상태에서는 서명된 `leaseExpiresAt`(기본 14일, 시리얼 미지원 USB는 24시간)까지 유예 동작합니다(`hybridMode = "offline_grace"`).

### 2.5. LAN 동일 라이선스 동시 실행 감지기 (`UDP :39281`)
- 동일 서브넷(LAN) 내 복제본 동시 사용을 탐지하기 위해 평문 라이선스 키나 개인정보 없이 **솔트 해시 다이제스트(`SHA256(salt + licenseKey)[:16]`) + 무작위 인스턴스 ID**만 15초마다 UDP `:39281`로 송수신합니다.
- 다른 호스트/IP에서 동일 다이제스트가 수신되면 `duplicate_seat` 경고를 띄우고 Pro 권한을 일시 제한합니다.

---

## 3. HTTP 보안 API 엔드포인트

| 메서드 및 경로 | 설명 |
| :--- | :--- |
| `GET /api/license/status` (및 `GET /api/license`) | USB 하드웨어 지문, Ed25519 검증 상태, 오프라인 유예 잔여일, LAN 충돌 여부 반환 |
| `POST /api/license/activate` (및 `POST /api/license`) | Ed25519 서명 검증 + 온라인 좌석 확인(설정 시) + AES-256-GCM 하드웨어 바인딩 |
| `POST /api/license/refresh` | 온라인 좌석 유예 임대 갱신 및 로컬 서명/바인딩 무결성 재검증 |
| `POST /api/license/deactivate` (및 `DELETE /api/license`) | 온라인 시트 해제 및 현재 USB 바인딩 초기화(`trialUsed` 이력 보존) |

---

## 4. 테스트 및 검증 기준
- `license_guard_test.go` 단위 테스트: SPKI 공개키 파싱, 무서명/변조 토큰 거부, 정품 USB 다른 PC 이동 유지, 복제 USB `clone_mismatch` 차단, 시계 역행 `clock_tamper` 차단, 1회 체험 재사용 차단, Mock 온라인 임대 서버 및 LAN 중복 실행 차단을 자동 검증합니다.
