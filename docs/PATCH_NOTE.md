# Grid IP Scanner2 - Patch Note (v2.4.0)

---

## 🚀 [v2.4.0] - 2026-10-08

### 🌟 주요 기능 추가 및 개선 (Major Improvements)

1. **지능형 낯선 기기 감지 및 Soft Trust 유예 시스템 (Soft Trust Grace Period)**
   - **문제 해결**: 이전에 탐색되었던 친숙 기기가 IP 재할당(DHCP), MAC 주소 무작위화(Randomized/Private MAC), 또는 네트워크 재연결 시 낯선 기기로 오진되는 현상을 개선했습니다.
   - **Fingerprint 유사도 계산 엔진**: MAC 주소 OUI(제조사 코드), 호스트명(Hostname), mDNS 이름, 오픈 포트 프로필을 종합 분석하여 0~100% 식별 유사도를 산출합니다.
   - **Soft Trust 상태 도입**:
     - 이전 탐색 이력이 있거나 동일 제조사/호스트명을 가진 기기는 무조건적인 경고 대신 `Soft Trust (유예 중)` 상태로 분류됩니다.
     - 사용자 UI에 황색 보호 실드 아이콘과 유예 사유(예: "동일 제조사/호스트명 일치 기기") 및 유사도 점수가 투명하게 표시됩니다.
     - 사용자는 원클릭으로 정식 신뢰 기기로 승격하거나 즉시 차단 등록할 수 있습니다.

2. **Secure Vault C++/Go 네이티브 DLL 암호화 모듈 구현**
   - **고성능 AES-256-GCM 엔진**: 기기 별칭(Alias) 및 네트워크 스냅샷 파일의 보안 강화를 위해 C++ 및 Go 기반 Native DLL 모듈(`SecureVault.dll`)을 통합했습니다.
   - **FFI C-Style 내보내기 인터페이스**: Electron Main 프로세스 및 백엔드 서비스에서 `encryptData`, `decryptData`를 유연하게 호출할 수 있는 표준 C ABI FFI 인터페이스를 구축했습니다.
   - **인증 디코딩 검증**: GCM(Galois/Counter Mode) 인증 태그를 통해 데이터 위변조를 100% 감지하고 안전하게 복호화합니다.

3. **단일 진실 원천(SSOT) 파이프라인 자동 동기화**
   - 버전 파이프라인 `scripts/sync-version.js`를 강화하여 `package.json`, `winres.json`, `Grid_IP_Scanner2_Setup.iss`, `App.tsx`, `updateChecker.ts`, `docs/PATCH_NOTE.md`, `docs/README.md`, `docs/WorkLog.md` 등 총 8개 대상을 한 번의 명령어로 자동 동기화합니다.

4. **Edge-to-Edge 다중 해상도 ICO 자동 생성기 통합**
   - transparent 여백 자르기(Trim) 및 256, 128, 64, 48, 32, 16 픽셀 다중 레이어 ICO 윈도우 리소스 자동 생성기(`generate-assets.js`)를 빌드 파이프라인에 통합했습니다.

---

## 🛠️ [v2.3.2] - 2026-10-05

### 🔧 버그 수정 및 안정화
- Windows 환경에서 Go 백엔드 컴파일 시 `syscall.ByteSliceToString` 및 `net` 패키지 참조 모듈을 `utils_windows.go`에서 교체하여 크로스 컴파일 안정성 확보.
- 포터블 실행 파일 실행 시 지정 포트(기본 3031) 자동 바인딩 및 웹 서버 정상 구동 확인.

---

## 📜 [v2.3.0] - 2026-09-28

### ✨ 기능 추가
- IP/MAC 충돌 실시간 탐지 알고리즘 적용.
- 네이티브 OUI 검증 모듈(`OuiValidator.dll`) 추가.
- 다크/베이지/그레이 멀티 테마 가독성 자동 보정 적용.
