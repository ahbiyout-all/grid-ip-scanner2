/**
 * SecureVault - High-Performance C++ AES-256-GCM Native Encryption DLL Header
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 * 
 * Provides hardware-accelerated (AES-NI / Windows BCrypt API) authenticated encryption
 * and decryption for sensitive device aliases and network snapshot datasets.
 */

#ifndef SECURE_VAULT_H
#define SECURE_VAULT_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_SECURE_VAULT
    #define SECURE_VAULT_API __declspec(dllexport)
  #else
    #define SECURE_VAULT_API __declspec(dllimport)
  #endif
#else
  #define SECURE_VAULT_API __attribute__((visibility("default")))
#endif

/* Return / Status Codes */
#define SECURE_VAULT_OK                  0
#define SECURE_VAULT_ERR_INVALID_PARAM  -1
#define SECURE_VAULT_ERR_BUFFER_TOO_SMALL -2
#define SECURE_VAULT_ERR_CRYPTO_FAILED  -3
#define SECURE_VAULT_ERR_AUTH_FAILED    -4 // Tag mismatch / Data tampering detected
#define SECURE_VAULT_ERR_MEMORY         -5
#define SECURE_VAULT_ERR_FILE_IO        -6

/* Cryptographic Constants */
#define VAULT_KEY_SIZE_BYTES   32 // 256-bit AES Key
#define VAULT_NONCE_SIZE_BYTES 12 // 96-bit Standard GCM Nonce
#define VAULT_TAG_SIZE_BYTES   16 // 128-bit GHASH Authentication Tag
#define VAULT_HEADER_MAGIC     "GVAULT10"
#define VAULT_HEADER_LEN       8

/**
 * Returns integer version code of SecureVault.dll (e.g. 20400 = v2.4.0).
 */
SECURE_VAULT_API int SecureVault_GetVersion(void);

/**
 * Encrypts arbitrary binary/text data using AES-256-GCM.
 * The output format is an authenticated binary envelope:
 * [Magic(8 bytes) | Nonce(12 bytes) | Tag(16 bytes) | Ciphertext(N bytes)]
 *
 * @param inData Pointer to plaintext input buffer
 * @param inLen Length of plaintext input in bytes
 * @param keyPass Optional passphrase string or 32-byte raw key (NULL for default machine binding)
 * @param outCipher Pointer to pre-allocated buffer for encrypted payload
 * @param maxOutLen Capacity of outCipher buffer (must be >= inLen + 36 bytes)
 * @param outWritten Pointer to receive actual byte length written to outCipher
 * @return SECURE_VAULT_OK (0) on success, or negative error code
 */
SECURE_VAULT_API int encryptData(
    const uint8_t* inData,
    size_t inLen,
    const char* keyPass,
    uint8_t* outCipher,
    size_t maxOutLen,
    size_t* outWritten
);

/**
 * Decrypts authenticated AES-256-GCM ciphertext envelope back into plaintext.
 * Verifies the 128-bit GHASH tag and magic header prior to outputting plaintext.
 *
 * @param inCipher Pointer to ciphertext input buffer
 * @param cipherLen Length of ciphertext buffer in bytes
 * @param keyPass Optional passphrase string or 32-byte raw key
 * @param outPlain Pointer to pre-allocated buffer for decrypted plaintext
 * @param maxOutLen Capacity of outPlain buffer
 * @param outWritten Pointer to receive actual byte length written to outPlain
 * @return SECURE_VAULT_OK (0) on success, or SECURE_VAULT_ERR_AUTH_FAILED if tampered
 */
SECURE_VAULT_API int decryptData(
    const uint8_t* inCipher,
    size_t cipherLen,
    const char* keyPass,
    uint8_t* outPlain,
    size_t maxOutLen,
    size_t* outWritten
);

/**
 * Encrypts a UTF-8 JSON string (Device Aliases / Snapshot) to a Base64 string for safe storage.
 *
 * @param inUtf8String Plaintext UTF-8 string
 * @param keyPass Optional passphrase
 * @param outBase64 Pointer to pre-allocated buffer for Base64 ciphertext
 * @param maxOutLen Capacity of outBase64 buffer
 * @return Length of output string on success, or negative error code
 */
SECURE_VAULT_API int SecureVault_EncryptString(
    const char* inUtf8String,
    const char* keyPass,
    char* outBase64,
    size_t maxOutLen
);

/**
 * Decrypts a Base64 ciphertext envelope back to a plaintext UTF-8 JSON string.
 *
 * @param inBase64 Base64 encoded ciphertext string
 * @param keyPass Optional passphrase
 * @param outUtf8String Pointer to pre-allocated buffer for plaintext UTF-8 string
 * @param maxOutLen Capacity of outUtf8String buffer
 * @return Length of output string on success, or negative error code
 */
SECURE_VAULT_API int SecureVault_DecryptString(
    const char* inBase64,
    const char* keyPass,
    char* outUtf8String,
    size_t maxOutLen
);

/**
 * Writes an AES-256-GCM encrypted file directly to disk (atomically).
 *
 * @param filePath Target destination file path (e.g. "device_aliases.vault")
 * @param inData Plaintext data buffer
 * @param inLen Length of plaintext data
 * @param keyPass Optional passphrase
 * @return SECURE_VAULT_OK (0) on success, or negative error code
 */
SECURE_VAULT_API int SecureVault_WriteEncryptedFile(
    const char* filePath,
    const uint8_t* inData,
    size_t inLen,
    const char* keyPass
);

/**
 * Reads and decrypts an AES-256-GCM encrypted file directly from disk into memory.
 *
 * @param filePath Source encrypted file path
 * @param keyPass Optional passphrase
 * @param outPlain Output buffer for decrypted plaintext
 * @param maxOutLen Capacity of outPlain buffer
 * @param outWritten Pointer to receive actual byte length
 * @return SECURE_VAULT_OK (0) on success, or negative error code
 */
SECURE_VAULT_API int SecureVault_ReadEncryptedFile(
    const char* filePath,
    const char* keyPass,
    uint8_t* outPlain,
    size_t maxOutLen,
    size_t* outWritten
);

/**
 * Securely sanitizes and zeroes memory to prevent RAM dump forensic recovery.
 *
 * @param ptr Pointer to sensitive buffer
 * @param len Length in bytes
 */
SECURE_VAULT_API void SecureVault_WipeMemory(void* ptr, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* SECURE_VAULT_H */
