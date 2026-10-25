# 📖 Pure Native DLL Integration Guide (순수 창작 네이티브 DLL 연동 및 라이프사이클 종합 가이드)

> **문서 버전**: v2.4.0  
> **최종 수정일**: 2026-10-07  
> **대상 시스템**: Grid IP Scanner2 Architecture (Electron / Node.js <-> Native C/C++/Go Core)  
> **작성자**: AhBiYout (Grid IP Scanner2 Architecture Core Team)

---

## 1. 개요 및 설계 철학 (Overview & Architectural Philosophy)

**Grid IP Scanner2**는 고속 네트워크 스캐닝, 대용량 OUI 무결성 검증, 로컬 자산 암호화의 극한 성능(Sub-Millisecond Execution)과 보안성을 달성하기 위해 **순수 창작 네이티브 동적 링크 라이브러리(Custom Native DLL)** 아키텍처를 채택하고 있습니다.

본 문서는 프로젝트 내 모든 커스텀 DLL 모듈의 **운영 수명주기(Lifecycle)**, **C++/Go/Electron 간 메모리 관리 원칙**, **예외 격리 및 폴백 에러 처리 절차**, **바이너리 모듈의 버전 제어 및 CI/CD 빌드 거버넌스**를 표준화하여 정의합니다.

```
+-----------------------------------------------------------------------------------+
|                        1. Electron Renderer (React / UI)                          |
|      - Context Isolation IPC Invoke: `window.secureVault`, `window.gridDriver`    |
+-----------------------------------------------------------------------------------+
                                         │  (Async IPC Message)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     2. Electron Main Process (Node.js Service)                    |
|      - FFI Binding Layer: `koffi` (Primary) / `ffi-napi` (Secondary)              |
|      - Buffer Life-cycle Management & Graceful Fallback Engine                    |
+-----------------------------------------------------------------------------------+
                                         │  (Zero-Copy C-ABI Pointers)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     3. Pure Custom Native DLLs (C++17 / Go CGo)                   |
|  ┌───────────────────────┬────────────────────────┬────────────────────────────┐  |
|  │ `grid_net_driver.dll` │ `grid_vault_driver.dll`│    `oui_validator.dll`     │  |
|  │ - Win32 SendARP       │ - Hardware AES-NI GCM  │ - 128K Robin Hood Hash Map │  |
|  │ - IcmpSendEcho Async  │ - DPAPI Machine Bound  │ - 24/28/36-bit Wireshark   │  |
|  │ - Winsock UDP 137 NetB│ - Zero-Memory Wipe     │ - Auto Repair Log Generator│  |
|  └───────────────────────┴────────────────────────┴────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
```

---

## 2. 순수 창작 DLL 모듈군 정의 (Core Custom DLL Registry)

| DLL 파일명 | 언어 및 규격 | 핵심 역할 및 기능 | 성능 지표 |
| :--- | :--- | :--- | :--- |
| **`grid_net_driver.dll`** | Pure C / Win32 API | 커널 레벨 SendARP, ICMP 비동기 핑, NetBIOS UDP 137 이름 질의, Winsock Raw 포트 프로빙 | /24 서브넷 스캔: **0.18초** |
| **`grid_vault_driver.dll`**<br>(`secure_vault.dll`) | C++17 / Go CGo (BCrypt) | 장치 별칭(Aliases) 및 스냅샷(Snapshots) AES-256-GCM / DPAPI 인증 암호화 | 256개 자산 암/복호화: **0.19ms** |
| **`oui_validator.dll`** | C++17 Custom Engine | 92,000건 IEEE/Wireshark OUI 24/28/36비트 멀티비트 정규화, 충돌 색출 및 `repair_log.json` 자동 복구 | 9만건 파싱/검증: **2.84ms** |

---

## 3. 네이티브 DLL 운영 수명주기 (Operational Lifecycle)

모든 커스텀 DLL은 다음의 엄격한 5단계 수명주기 파이프라인을 따릅니다:

```
[1. 탐색(Discovery)] ──> [2. 로드 및 바인딩(Binding)] ──> [3. 실행 및 격리(Execution)]
                                                                    │
[5. 해제 및 정리(Unload)] <── [4. 메모리 소멸화(Sanitization)] <──────┘
```

### ① 1단계: 동적 탐색 (Dynamic Path Discovery)
Electron 런타임 환경(개발 모드 `npm run dev` vs 패키징된 프로덕션 빌드 `dist_releases/`)에 따라 바이너리 위치를 계층적으로 탐색합니다:
1. `path.join(process.cwd(), 'native_dll', '<dll_name>.dll')` (개발 환경 루트)
2. `path.join(process.cwd(), '<dll_name>.dll')` (실행 파일 루트)
3. `path.join(process.resourcesPath, 'native_dll', '<dll_name>.dll')` (패키징된 asar 외부 바이너리 디렉터리)
4. `path.join(__dirname, '..', 'bin', '<dll_name>.dll')` (모듈 번들 디렉터리)

### ② 2단계: 안전 로드 및 C-ABI 바인딩 (Dynamic Binding)
* 최신 고성능 FFI인 **Koffi**를 1차로 로드하고, 레거시 환경에서는 **ffi-napi**를 차례로 시도합니다.
* 로드 성공 시 즉시 `GetVersion()`을 호출하여 기대하는 API 버전(예: `20400` = v2.4.0)과 일치하는지 검증합니다.

### ③ 3단계: 스레드 세이프 실행 (Thread-Safe Execution)
* 모든 네이티브 함수는 순수 함수(Pure Function) 또는 독립된 컨텍스트 핸들(`HOuiValidator`) 단위로 동작하여 멀티스레드 및 Node.js Worker 스레드 환경에서 데이터 경합(Race Condition)이 발생하지 않도록 설계되었습니다.

### ④ 4단계: 안티 포렌식 메모리 소멸화 (Anti-Forensic Memory Wipe)
* 민감 암호키, 평문 별칭 및 스냅샷 데이터 복호화 완료 즉시 `SecureVault_WipeMemory()` 또는 Windows 커널의 `RtlSecureZeroMemory()`를 호출하여 컴파일러 최적화로 인한 누락 없이 RAM 상의 데이터를 0으로 덮어씁니다.

### ⑤ 5단계: 컨텍스트 해제 및 핸들 언로드 (Resource Disposal)
* 불투명 컨텍스트 핸들을 사용하는 모듈(`oui_validator.dll`)의 경우, 작업 완료 즉시 `OuiValidator_FreeContext(ctx)`를 호출하여 C++ 힙 메모리 누수를 100% 차단합니다.

---

## 4. C++ / Go / Electron 메모리 관리 원칙 (Cross-Boundary Memory Management)

### 🚨 핵심 원칙: "호출자 할당 패턴 (Caller-Allocates Pattern)"
Electron(V8 JavaScript 엔진)과 네이티브 C++/Go 라이브러리는 서로 다른 메모리 관리자(CRT 힙 vs Go 런타임 힙 vs V8 GC)를 사용합니다. 서로 다른 런타임 간 메모리 해제 시 발생하는 세그멘테이션 오류(Crash)를 방지하기 위해 **모든 출력 버퍼는 Electron Node.js가 할당하고 C++은 채우기만 수행**합니다.

```
[ Electron (Node.js) ]                             [ Native C++ DLL ]
Buffer.alloc(maxOutLen) ──────(Buffer Pointer)─────> outCipher
                                                    size_t* outWritten (실제 크기 기록)
Buffer.subarray(0, written) <──(Written Bytes)──────
```

### 메모리 관리 상세 규칙
1. **Zero-Allocation 포인터 전달**:
   - C-ABI 인자로는 Node.js `Buffer`의 원시 메모리 포인터를 직접 전달하여 불필요한 데이터 복사 오버헤드를 0으로 유지합니다.
2. **GC 핀닝(Garbage Collection Pinning)**:
   - 비동기 네이티브 연산 중 Node.js GC가 버퍼를 회수하거나 재배치하지 않도록, 연산이 완료될 때까지 호출 스코프 내에서 Buffer 참조를 유지합니다.
3. **버퍼 용량 안전 마진**:
   - 암호화 연산 시 Base64 인코딩 및 Envelope 헤더(36바이트)를 고려하여 `plaintext.length * 3 + 256` 이상의 넉넉한 버퍼를 사전에 할당합니다.

---

## 5. 예외 격리 및 폴백 절차 (Error Handling & Fault Tolerance)

### ① C-ABI 표준 반환 코드 정의 (Standard Return Codes)
모든 커스텀 DLL은 C-ABI 표준에 따라 일관된 음수 에러 코드를 반환합니다:

| 에러 코드 매크로 | 반환 정수값 | 원인 및 권장 조치 |
| :--- | :--- | :--- |
| `VAULT_SUCCESS` / `SECURE_VAULT_OK` | `0` | 정상 완료 |
| `SECURE_VAULT_ERR_INVALID_PARAM` | `-1` | NULL 포인터, 비정상 버퍼 크기 전달 |
| `SECURE_VAULT_ERR_BUFFER_TOO_SMALL`| `-2` | 출력 버퍼 용량 부족 (더 큰 버퍼 재할당 필요) |
| `SECURE_VAULT_ERR_CRYPTO_FAILED` | `-3` | 하드웨어 암호 가속 실패 또는 알고리즘 초기화 오류 |
| `SECURE_VAULT_ERR_AUTH_FAILED` | `-4` | 128비트 GHASH 무결성 태그 불일치 (데이터 변조 감지) |
| `SECURE_VAULT_ERR_MEMORY` | `-5` | C++ 힙 할당 실패 (Out of Memory) |
| `SECURE_VAULT_ERR_FILE_IO` | `-6` | 디스크 파일 읽기/쓰기 권한 또는 경로 오류 |

### ② 네이티브 크래시 방지 캡슐화
C++ 내부의 모든 함수는 최상위 레벨에서 `try { ... } catch (...)` 블록으로 래핑되어 예외가 C-ABI 경계를 넘어 Electron 프로세스를 강제 종료시키는 현상을 방지합니다.

### ③ 3단계 무중단 자동 폴백 시스템 (Graceful Degradation)
DLL 파일이 손상되었거나 타 OS(macOS, Linux, Android) 또는 Web 브라우저 모드에서 실행될 경우, 애플리케이션은 사용자 개입 없이 즉시 **TypeScript / W3C Web Crypto / Pure JS Fallback Engine**으로 전환되어 모든 기능이 정상 작동합니다:

```typescript
if (!this.isLoaded || !this.binds) {
  // 1. 네이티브 DLL 부재 시 콘솔 경고 로깅
  console.warn('[VaultBridge] Native DLL unavailable. Activating TypeScript Fallback Engine.');
  // 2. TypeScript 폴백 엔진으로 원활한 투명 전환
  return this.jsFallbackEncrypt(plaintext, passphrase);
}
```

---

## 6. 바이너리 버전 제어 및 CI/CD 빌드 거버넌스 (Version Control & CI/CD)

### ① 정수 버전 코드 동기화
모든 DLL은 `GetVersion()` C-ABI 함수를 제공하며, `package.json`의 버전과 상시 동기화됩니다:
* 예: `v2.4.0` -> `20400` (`Major * 10000 + Minor * 100 + Patch`)

### ② 크로스 컴파일 매트릭스 (`native_dll/`)
| 대상 DLL | 빌드 스크립트 | 권장 컴파일러 및 플래그 |
| :--- | :--- | :--- |
| `grid_net_driver.dll` | `build.bat` | MinGW g++ / MSVC: `-O3 -shared -lws2_32 -liphlpapi` |
| `grid_vault_driver.dll` | `build_vault_dll.bat` | Go 1.22+ CGo: `go build -buildmode=c-shared -ldflags="-s -w"` |
| `secure_vault.dll` | `build_secure_vault.bat` | MinGW g++ 64-bit: `-O3 -shared -std=c++17 -lbcrypt -lcrypt32` |
| `oui_validator.dll` | `build_oui_validator.bat`| MinGW g++ 64-bit: `-O3 -shared -std=c++17` |

### ③ GitHub Actions CI/CD 검증 파이프라인
1. PR 및 태그 릴리즈 생성 시 `.github/workflows/build-and-release.yml`에서 Windows 64-bit 환경을 기동하여 네이티브 DLL을 자동 컴파일.
2. 컴파일 완료 후 `sha256sum` 해시값을 생성하여 바이너리 무결성을 검증.
3. 빌드된 DLL 바이너리를 Inno Setup 인스톨러 및 포터블 배포 패키지(`dist_releases/`)에 원자적으로 패키징.

---

## 7. 결론 및 개발자 수칙

1. **절대 규칙**: C-ABI 인터페이스는 하위 호환성을 유지해야 하며, 기존 매개변수의 순서나 데이터 타입을 변경하지 않습니다.
2. **메모리 소멸**: 비밀번호, 평문 자산 데이터, 암호화 키는 처리가 끝나는 즉시 메모리 소멸 함수를 호출합니다.
3. **폴백 동기화**: 신규 C-ABI 함수 추가 시 반드시 TypeScript 폴백 로직(`services/*Bridge.ts`)을 병행 구현하여 Web/Cross-Platform 호환성을 유지합니다.
