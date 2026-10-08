/**
 * Grid IP Scanner2 - Native Secure Vault Encryption Dynamic Link Library (DLL) Header
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 * 
 * Provides sub-millisecond hardware-accelerated AES-256-GCM / DPAPI authenticated encryption
 * and anti-forensic memory sanitization for device aliases, notes, and network snapshot data.
 */

#ifndef GRID_VAULT_DRIVER_H
#define GRID_VAULT_DRIVER_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_VAULT_DRIVER
    #define GRID_VAULT_API __declspec(dllexport)
  #else
    #define GRID_VAULT_API __declspec(dllimport)
  #endif
#else
  #define GRID_VAULT_API
#endif

/* Status Return Codes */
#define VAULT_SUCCESS               0
#define VAULT_ERR_INVALID_PARAM    -1
#define VAULT_ERR_BUFFER_TOO_SMALL -2
#define VAULT_ERR_CRYPTO_FAILED    -3
#define VAULT_ERR_AUTH_FAILED      -4
#define VAULT_ERR_MEMORY           -5
#define VAULT_ERR_FILE_IO          -6

/**
 * Returns the integer version code of grid_vault_driver.dll (e.g., 20400 for v2.4.0).
 */
GRID_VAULT_API int GridVault_GetVersion(void);
GRID_VAULT_API int GridVault_GetVersionCode(void);

/**
 * Checks whether the host CPU supports hardware AES-NI instructions.
 * @return 1 if supported, 0 otherwise
 */
GRID_VAULT_API int GridVault_IsHardwareAesSupported(void);

/**
 * Encrypts arbitrary binary data using AES-256-GCM or Win32 DPAPI envelope.
 */
GRID_VAULT_API int GridVault_EncryptData(
    const uint8_t* inData,
    size_t inLen,
    const char* optionalPassphrase,
    uint8_t* outCipher,
    size_t* outCipherLen
);

/**
 * Decrypts authenticated ciphertext into plaintext.
 */
GRID_VAULT_API int GridVault_DecryptData(
    const uint8_t* inCipher,
    size_t cipherLen,
    const char* optionalPassphrase,
    uint8_t* outData,
    size_t* outDataLen
);

/**
 * Encrypts a JSON or UTF-8 text string and returns a base64-encoded safe vault string.
 */
GRID_VAULT_API int GridVault_EncryptString(
    const char* inJson,
    const char* optionalPassphrase,
    char* outBase64,
    size_t maxLen
);
GRID_VAULT_API int GridVault_EncryptGCM(
    const char* plaintext,
    const char* keyPass,
    char* outBase64,
    int maxOutLen
);

/**
 * Decrypts a base64 vault envelope string back into a plaintext UTF-8 JSON string.
 */
GRID_VAULT_API int GridVault_DecryptString(
    const char* inBase64,
    const char* optionalPassphrase,
    char* outJson,
    size_t maxLen
);
GRID_VAULT_API int GridVault_DecryptGCM(
    const char* inBase64,
    const char* keyPass,
    char* outPlaintext,
    int maxOutLen
);

/**
 * Encrypts data and directly writes to an authenticated vault file on disk.
 */
GRID_VAULT_API int GridVault_WriteEncryptedFile(
    const char* filePath,
    const char* inJson,
    const char* optionalPassphrase
);

/**
 * Reads an authenticated vault file from disk and decrypts it into plaintext memory.
 */
GRID_VAULT_API int GridVault_ReadEncryptedFile(
    const char* filePath,
    const char* optionalPassphrase,
    char* outJson,
    int maxOutLen
);

/**
 * High-level helpers for Device Aliases and Network Snapshots.
 */
GRID_VAULT_API int GridVault_EncryptDeviceAliases(
    const char* aliasesJson,
    const char* outFilePath,
    const char* optionalPassphrase
);
GRID_VAULT_API int GridVault_DecryptDeviceAliases(
    const char* inFilePath,
    const char* optionalPassphrase,
    char* outJson,
    int maxOutLen
);
GRID_VAULT_API int GridVault_EncryptSnapshot(
    const char* snapshotJson,
    const char* outFilePath,
    const char* optionalPassphrase
);
GRID_VAULT_API int GridVault_DecryptSnapshot(
    const char* inFilePath,
    const char* optionalPassphrase,
    char* outJson,
    int maxOutLen
);

/**
 * Computes a high-speed cryptographic SHA-256 hex digest of data.
 */
GRID_VAULT_API int GridVault_HashData(
    const uint8_t* inData,
    size_t inLen,
    char* outHexHash,
    size_t maxLen
);

/**
 * Securely sanitizes and zeroes out sensitive memory (anti-forensics/anti-dump).
 */
GRID_VAULT_API void GridVault_WipeMemory(void* ptr, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* GRID_VAULT_DRIVER_H */
