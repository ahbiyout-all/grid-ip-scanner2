# 🛡️ SecureVault - C++ AES-256-GCM Native DLL & Electron FFI 연동 명세서

> **문서 버전**: v2.4.0  
> **최종 수정일**: 2026-10-07  
> **프로젝트명**: `SecureVault` (C++17 AES-256-GCM Native Dynamic Link Library)  
> **모듈 파일**: `native_dll/secure_vault.dll`  
> **작성자**: AhBiYout (Grid IP Scanner2 Core Security Team)

---

## 1. 개요 및 설계 목적 (Overview & Architecture)

**`SecureVault`**는 Grid IP Scanner2에서 관리자가 입력한 **장치별 별칭(Device Aliases), 관리자 메모(Notes), 서브넷 스냅샷 데이터(Network Snapshots)**를 로컬 스토리지에 안전하게 보관하기 위해 독자 설계된 **C++17 기반 고성능 AES-256-GCM 인증 암호화 네이티브 DLL 프로젝트**입니다.

```
+-------------------------------------------------------------------------+
|                  Electron Renderer Process (UI / React)                 |
|            window.secureVault.saveAliases(aliases, "aliases.vault")      |
+-------------------------------------------------------------------------+
                                    |
                            (Electron IPC Invoke)
                                    v
+-------------------------------------------------------------------------+
|                    Electron Main Process (Node.js)                      |
|                   `services/secureVaultBridge.ts`                       |
+-------------------------------------------------------------------------+
                                    |
                    (ffi-napi / koffi Native FFI Binding)
                                    v
+-------------------------------------------------------------------------+
|                         SecureVault.dll (C++17)                         |
|  - Hardware-Accelerated AES-NI & Windows BCrypt CNG                     |
|  - AES-256-GCM Authenticated Encryption & 128-bit GHASH Verification    |
|  - Zero-Memory Anti-Forensic Sanitization (`SecureZeroMemory`)          |
|  - FFI-Compatible C-ABI Functions: `encryptData` & `decryptData`        |
+-------------------------------------------------------------------------+
                                    |
                                    v
           +---------------------------------------------------+
           | Encrypted Vault File:                             |
           | [Magic(8B) | Nonce(12B) | Tag(16B) | Cipher(NB)]  |
           +---------------------------------------------------+
```

---

## 2. C-Style 익스포트 헤더 명세 (`native_dll/secure_vault.h`)

Electron 및 Node.js FFI와의 호환성을 위해 이름 맹글링(Name Mangling)이 없는 `extern "C"` C-ABI로 함수를 익스포트합니다.

```c
#ifndef SECURE_VAULT_H
#define SECURE_VAULT_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #define SECURE_VAULT_API __declspec(dllexport)
#else
  #define SECURE_VAULT_API __attribute__((visibility("default")))
#endif

/* 상태 코드 */
#define SECURE_VAULT_OK                   0
#define SECURE_VAULT_ERR_INVALID_PARAM   -1
#define SECURE_VAULT_ERR_BUFFER_TOO_SMALL -2
#define SECURE_VAULT_ERR_CRYPTO_FAILED   -3
#define SECURE_VAULT_ERR_AUTH_FAILED     -4 // 태그 불일치 / 데이터 변조 감지
#define SECURE_VAULT_ERR_MEMORY          -5
#define SECURE_VAULT_ERR_FILE_IO         -6

/**
 * 1. 데이터 암호화 (encryptData)
 * 입력된 바이너리/텍스트 데이터를 AES-256-GCM으로 암호화하여 봉투(Envelope)에 기록합니다.
 */
SECURE_VAULT_API int encryptData(
    const uint8_t* inData,      // [입력] 평문 버퍼 포인터
    size_t inLen,               // [입력] 평문 크기 (바이트)
    const char* keyPass,        // [입력] 패스프레이즈 또는 NULL (기본 키 사용)
    uint8_t* outCipher,         // [출력] 암호문이 저장될 버퍼
    size_t maxOutLen,           // [입력] 출력 버퍼 최대 크기 (inLen + 36 이상)
    size_t* outWritten          // [출력] 실제 기록된 암호문 바이트 수
);

/**
 * 2. 데이터 복호화 (decryptData)
 * 암호문 봉투를 열어 128비트 GHASH 무결성 태그를 검증하고 평문으로 복원합니다.
 */
SECURE_VAULT_API int decryptData(
    const uint8_t* inCipher,    // [입력] 암호문 버퍼 포인터
    size_t cipherLen,           // [입력] 암호문 크기 (바이트)
    const char* keyPass,        // [입력] 패스프레이즈 또는 NULL
    uint8_t* outPlain,          // [출력] 복호화된 평문 버퍼
    size_t maxOutLen,           // [입력] 출력 버퍼 최대 크기
    size_t* outWritten          // [출력] 실제 복호화된 평문 바이트 수
);

/**
 * 3. 민감 메모리 소멸화 (Zero-Memory)
 */
SECURE_VAULT_API void SecureVault_WipeMemory(void* ptr, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* SECURE_VAULT_H */
```

---

## 3. Electron Main Process 연동 가이드 (`ffi-napi` & `koffi`)

### ① `ffi-napi` 바인딩 설정 및 사용법

```typescript
import path from 'path';
import ffi from 'ffi-napi';
import ref from 'ref-napi';

// size_t 포인터 타입 정의
const size_t_ptr = ref.refType(ref.types.size_t);

// DLL 경로 로드
const dllPath = path.join(process.cwd(), 'native_dll', 'secure_vault.dll');

// ffi-napi 라이브러리 매핑
const secureVaultLib = ffi.Library(dllPath, {
  'encryptData': [
    'int', // 반환값: 상태 코드
    ['pointer', 'size_t', 'string', 'pointer', 'size_t', size_t_ptr]
  ],
  'decryptData': [
    'int', // 반환값: 상태 코드
    ['pointer', 'size_t', 'string', 'pointer', 'size_t', size_t_ptr]
  ],
  'SecureVault_GetVersion': ['int', []]
});

// [1] 데이터 암호화 호출 함수
export function encryptBuffer(plainBuffer: Buffer, passphrase?: string): Buffer {
  const maxOutLen = plainBuffer.length + 64;
  const outCipher = Buffer.alloc(maxOutLen);
  const writtenPtr = ref.alloc(ref.types.size_t);

  const status = secureVaultLib.encryptData(
    plainBuffer,
    plainBuffer.length,
    passphrase || null,
    outCipher,
    maxOutLen,
    writtenPtr
  );

  if (status !== 0) {
    throw new Error(`Encryption failed with code ${status}`);
  }

  const writtenBytes = writtenPtr.deref();
  return Buffer.from(outCipher.subarray(0, writtenBytes));
}

// [2] 데이터 복호화 호출 함수
export function decryptBuffer(cipherBuffer: Buffer, passphrase?: string): Buffer {
  const maxOutLen = cipherBuffer.length;
  const outPlain = Buffer.alloc(maxOutLen);
  const writtenPtr = ref.alloc(ref.types.size_t);

  const status = secureVaultLib.decryptData(
    cipherBuffer,
    cipherBuffer.length,
    passphrase || null,
    outPlain,
    maxOutLen,
    writtenPtr
  );

  if (status !== 0) {
    throw new Error(`Decryption failed (Data tampered or invalid key): ${status}`);
  }

  const writtenBytes = writtenPtr.deref();
  return Buffer.from(outPlain.subarray(0, writtenBytes));
}
```

### ② 현대적인 고속 `koffi` FFI 연동 (권장)

```typescript
import koffi from 'koffi';

const lib = koffi.load('native_dll/secure_vault.dll');

const encryptData = lib.func(
  'int encryptData(const uint8_t* inData, size_t inLen, const char* keyPass, _Out_ uint8_t* outCipher, size_t maxOutLen, _Out_ size_t* outWritten)'
);
const decryptData = lib.func(
  'int decryptData(const uint8_t* inCipher, size_t cipherLen, const char* keyPass, _Out_ uint8_t* outPlain, size_t maxOutLen, _Out_ size_t* outWritten)'
);
```

---

## 4. 장치 별칭 및 스냅샷 파일 저장 구조

암호화된 파일은 다음과 같은 무결성 보장 바이너리 레이아웃으로 디스크에 기록됩니다:

| 오프셋 (Byte) | 길이 | 필드명 | 설명 |
| :--- | :--- | :--- | :--- |
| `0x00 - 0x07` | 8 Bytes | **Magic Header** | `"GVAULT10"` 아스키 식별자 |
| `0x08 - 0x13` | 12 Bytes | **GCM Nonce** | 암호화 시마다 생성되는 96비트 암호학적 난수 |
| `0x14 - 0x23` | 16 Bytes | **GHASH Tag** | 128비트 메시지 인증 태그 (변조 즉시 감지) |
| `0x24 - EOF` | N Bytes | **Ciphertext** | 하드웨어 가속 AES-256 암호문 본문 |

* **장치 별칭 저장 파일**: `device_aliases.vault`
* **네트워크 스냅샷 저장 파일**: `snapshot_YYYYMMDD_HHMMSS.vault`
