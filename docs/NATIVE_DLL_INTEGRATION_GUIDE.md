# Pure Native DLL Integration Guide

> **Grid IP Scanner2 Architecture - Native Dynamic Link Library (DLL) Lifecycle, Memory Management, & FFI Bridge Integration Guide**

---

## 1. Overview & Architecture

Grid IP Scanner2 incorporates high-performance C++ and Go compiled dynamic dynamic link libraries (DLLs) for cryptographically intensive and hardware-level operations:
1. **`SecureVault.dll` / `GridVaultDriver.dll`**: Provides hardware-accelerated AES-256-GCM authenticated encryption and decryption for sensitive local device aliases, user credentials, and network topology snapshots.
2. **`OuiValidator.dll`**: Provides ultra-fast in-memory hash table lookup for IEEE OUI vendor prefixes across 50,000+ registered MAC addresses.

```
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process / Node.js            │
│                       (ffi-napi / koffi)                │
└───────────────────────────┬─────────────────────────────┘
                            │ C-ABI / FFI Call
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Native Dynamic DLL                   │
│   (SecureVault.dll / GridVaultDriver.dll / OuiValidator)│
├─────────────────────────────────────────────────────────┤
│  - AES-256-GCM Galois Encryption Engine                 │
│  - Caller-allocated Memory Protocols                    │
│  - Zero-copy Buffer Transfers                           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Exported FFI Interface Definitions (C-ABI)

All functions exported by native modules follow standard `__declspec(dllexport)` / C-style ABI naming conventions (`cdecl` / `stdcall`) to ensure seamless interoperability with JavaScript/TypeScript FFI bridges (`ffi-napi`, `koffi`).

### 2.1 Encryption Function Interface (`encryptData` / `EncryptDataGCM`)
```c
#ifndef SECURE_VAULT_H
#define SECURE_VAULT_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Encrypts arbitrary binary plaintext using AES-256-GCM.
 *
 * @param plaintext      Pointer to source byte array.
 * @param plainLen       Length of plaintext in bytes.
 * @param key            32-byte secret key (AES-256).
 * @param ciphertext     Pointer to caller-allocated output buffer (at least plainLen bytes).
 * @param iv             Pointer to caller-allocated 12-byte IV output buffer.
 * @param tag            Pointer to caller-allocated 16-byte GCM authentication tag buffer.
 * @return               0 on success (VAULT_SUCCESS), negative code on error.
 */
__declspec(dllexport) int EncryptDataGCM(
    const unsigned char* plaintext,
    int plainLen,
    const unsigned char* key,
    unsigned char* ciphertext,
    unsigned char* iv,
    unsigned char* tag
);

#ifdef __cplusplus
}
#endif
#endif
```

### 2.2 Decryption Function Interface (`decryptData` / `DecryptDataGCM`)
```c
/**
 * Decrypts AES-256-GCM ciphertext and validates the authentication tag.
 *
 * @param ciphertext     Pointer to encrypted byte array.
 * @param cipherLen      Length of ciphertext in bytes.
 * @param key            32-byte secret key (AES-256).
 * @param iv             Pointer to 12-byte IV used during encryption.
 * @param tag            Pointer to 16-byte GCM authentication tag.
 * @param plaintext      Pointer to caller-allocated output buffer (at least cipherLen bytes).
 * @return               0 on success (VAULT_SUCCESS), -3 if authentication tag fails.
 */
__declspec(dllexport) int DecryptDataGCM(
    const unsigned char* ciphertext,
    int cipherLen,
    const unsigned char* key,
    const unsigned char* iv,
    const unsigned char* tag,
    unsigned char* plaintext
);
```

---

## 3. Electron Main Process Integration (`ffi-napi` / `koffi`)

### Example `ffi-napi` Setup in Electron Main Process (`electron/vaultBridge.ts`)

```typescript
import path from 'path';
import crypto from 'crypto';
import ffi from 'ffi-napi';
import ref from 'ref-napi';

const dllPath = path.join(process.resourcesPath, 'native_dll', 'SecureVault.dll');

// Define FFI bindings
const vaultDll = ffi.Library(dllPath, {
  'EncryptDataGCM': [
    'int', // Return type
    ['pointer', 'int', 'pointer', 'pointer', 'pointer', 'pointer'] // Arguments
  ],
  'DecryptDataGCM': [
    'int', // Return type
    ['pointer', 'pointer', 'int', 'pointer', 'pointer', 'pointer', 'pointer']
  ]
});

export function secureEncrypt(data: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  if (key.length !== 32) throw new Error('Key must be exactly 32 bytes for AES-256');

  const plainLen = data.length;
  const ciphertext = Buffer.alloc(plainLen);
  const iv = Buffer.alloc(12);
  const tag = Buffer.alloc(16);

  const resultCode = vaultDll.EncryptDataGCM(data, plainLen, key, ciphertext, iv, tag);
  if (resultCode !== 0) {
    throw new Error(`SecureVault encryption failed with status code: ${resultCode}`);
  }

  return { ciphertext, iv, tag };
}

export function secureDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  if (key.length !== 32) throw new Error('Key must be 32 bytes');
  if (iv.length !== 12) throw new Error('IV must be 12 bytes');
  if (tag.length !== 16) throw new Error('Tag must be 16 bytes');

  const plainLen = ciphertext.length;
  const plaintext = Buffer.alloc(plainLen);

  const resultCode = vaultDll.DecryptDataGCM(ciphertext, plainLen, key, iv, tag, plaintext);
  if (resultCode === -3) {
    throw new Error('Authentication tag mismatch! Data may have been tampered with.');
  } else if (resultCode !== 0) {
    throw new Error(`SecureVault decryption failed with status code: ${resultCode}`);
  }

  return plaintext;
}
```

---

## 4. Memory Management Protocols

To prevent memory leaks, buffer overflows, and double-free vulnerabilities across language boundaries (C++ / Go / V8 JavaScript Engine), the following rules are strictly enforced:

1. **Caller-Allocated Buffers (Preferred)**:
   - The JavaScript / Node.js caller allocates buffers (`Buffer.alloc(size)`) before calling DLL functions.
   - The DLL receives pointers to pre-allocated buffers and writes output directly. V8 Garbage Collector handles memory cleanup.
2. **DLL-Allocated Memory (Free Function Requirement)**:
   - If a DLL dynamically allocates heap memory using `malloc()` or `new[]`, it **must** export a corresponding `FreeMemoryBuffer(void* ptr)` function.
   - Node.js must never invoke standard `free()` on pointers allocated inside C++ runtime memory domains.

---

## 5. Error Handling & Status Codes

| Return Code | Constant Name | Description |
| :--- | :--- | :--- |
| `0` | `VAULT_SUCCESS` | Operation executed successfully. |
| `-1` | `VAULT_ERR_INVALID_PARAM` | Null pointer or invalid buffer length specified. |
| `-2` | `VAULT_ERR_KEY_SIZE` | Secret key size is not equal to 32 bytes (256 bits). |
| `-3` | `VAULT_ERR_AUTH_FAILED` | AES-GCM tag verification failed (Data corruption/tampering). |
| `-4` | `VAULT_ERR_CRYPTO_INIT` | Cryptographic engine hardware acceleration failure. |

---

## 6. Binary Module Version Control & Fallback Guidelines

1. **Architecture Target Matrix**:
   - Binaries are compiled for `x64` (`x86_64`) and `x86` (`386`) architectures and shipped under `native_dll/win64/` and `native_dll/win32/`.
2. **Pure JS Fallback Engine**:
   - In environments where loading unmanaged C DLLs is prohibited by Windows OS security policies (e.g., AppLocker or Controlled Folder Access), the system automatically falls back to Node.js native `crypto.createCipheriv('aes-256-gcm')` to guarantee 100% operational uptime.
