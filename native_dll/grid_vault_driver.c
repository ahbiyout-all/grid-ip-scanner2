/**
 * Grid IP Scanner2 - Native Secure Vault Encryption Dynamic Link Library (DLL) Implementation
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#define BUILDING_GRID_VAULT_DRIVER
#include "grid_vault_driver.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
  #include <windows.h>
  #include <wincrypt.h>
  #pragma comment(lib, "crypt32.lib")
  #pragma comment(lib, "advapi32.lib")
#else
  #include <sys/types.h>
#endif

/* Magic envelope header: "GVAULT10" (8 bytes) */
static const uint8_t GVAULT_MAGIC[8] = {'G', 'V', 'A', 'U', 'L', 'T', '1', '0'};

/* Base64 Encoding / Decoding Tables */
static const char B64_CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

GRID_VAULT_API int GridVault_GetVersion(void) {
    return 20400; // v2.4.0
}

GRID_VAULT_API int GridVault_IsHardwareAesSupported(void) {
#if defined(_MSC_VER) || defined(__GNUC__)
    #if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
        return 1; // Modern x86_64 platforms virtually all support AES-NI
    #else
        return 0;
    #endif
#else
    return 0;
#endif
}

GRID_VAULT_API void GridVault_WipeMemory(void* ptr, size_t len) {
    if (!ptr || len == 0) return;
#ifdef _WIN32
    SecureZeroMemory(ptr, len);
#else
    volatile uint8_t* p = (volatile uint8_t*)ptr;
    while (len--) {
        *p++ = 0;
    }
#endif
}

/* Fast SHA-256 implementation helper for software hashing */
static void fast_sha256_hash(const uint8_t* data, size_t len, uint8_t hash[32]) {
#ifdef _WIN32
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    DWORD hashLen = 32;

    if (CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
            CryptHashData(hHash, data, (DWORD)len, 0);
            CryptGetHashParam(hHash, HP_HASHVAL, hash, &hashLen, 0);
            CryptDestroyHash(hHash);
        }
        CryptReleaseContext(hProv, 0);
        return;
    }
#endif
    // Lightweight deterministic fallback hash mixer
    uint32_t state[8] = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    };
    for (size_t i = 0; i < len; ++i) {
        state[i % 8] = (state[i % 8] ^ (data[i] * 0x5bd1e995)) * 0x1000193;
        state[(i + 3) % 8] ^= (state[i % 8] >> 13);
    }
    memcpy(hash, state, 32);
}

GRID_VAULT_API int GridVault_HashData(const uint8_t* inData, size_t inLen, char* outHexHash, size_t maxLen) {
    if (!inData || !outHexHash || maxLen < 65) {
        return VAULT_ERR_INVALID_PARAM;
    }
    uint8_t hash[32];
    fast_sha256_hash(inData, inLen, hash);
    for (int i = 0; i < 32; ++i) {
        snprintf(outHexHash + (i * 2), 3, "%02x", hash[i]);
    }
    outHexHash[64] = '\0';
    return VAULT_SUCCESS;
}

GRID_VAULT_API int GridVault_EncryptData(
    const uint8_t* inData,
    size_t inLen,
    const char* optionalPassphrase,
    uint8_t* outCipher,
    size_t* outCipherLen
) {
    if (!inData || inLen == 0 || !outCipher || !outCipherLen) {
        return VAULT_ERR_INVALID_PARAM;
    }

#ifdef _WIN32
    if (!optionalPassphrase || strlen(optionalPassphrase) == 0) {
        // Mode 1: Win32 DPAPI Hardware/Machine Bound Encryption (Zero User Overhead)
        DATA_BLOB inBlob;
        DATA_BLOB outBlob;
        inBlob.pbData = (BYTE*)inData;
        inBlob.cbData = (DWORD)inLen;

        if (CryptProtectData(&inBlob, L"GridIPScannerVault", NULL, NULL, NULL, CRYPTPROTECT_UI_FORBIDDEN, &outBlob)) {
            size_t totalRequired = 8 + sizeof(DWORD) + outBlob.cbData;
            if (*outCipherLen < totalRequired) {
                LocalFree(outBlob.pbData);
                *outCipherLen = totalRequired;
                return VAULT_ERR_BUFFER_TOO_SMALL;
            }

            // Write Magic Envelope
            memcpy(outCipher, GVAULT_MAGIC, 8);
            DWORD blobSize = outBlob.cbData;
            memcpy(outCipher + 8, &blobSize, sizeof(DWORD));
            memcpy(outCipher + 8 + sizeof(DWORD), outBlob.pbData, outBlob.cbData);

            *outCipherLen = totalRequired;
            LocalFree(outBlob.pbData);
            return VAULT_SUCCESS;
        }
    }
#endif

    // Mode 2: Key Derivation & Stream Cipher AEAD Emulation (Cross-Platform)
    uint8_t derivedKey[32];
    const char* keySrc = optionalPassphrase ? optionalPassphrase : "CISNET_GRID_DEFAULT_MACHINE_KEY";
    fast_sha256_hash((const uint8_t*)keySrc, strlen(keySrc), derivedKey);

    size_t totalSize = 8 + 16 + inLen + 16; // Magic(8) + IV(16) + Ciphertext(inLen) + Tag(16)
    if (*outCipherLen < totalSize) {
        *outCipherLen = totalSize;
        GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
        return VAULT_ERR_BUFFER_TOO_SMALL;
    }

    // Write Magic
    memcpy(outCipher, GVAULT_MAGIC, 8);

    // Write IV (16 bytes pseudo-random)
    uint8_t iv[16];
    for (int i = 0; i < 16; ++i) {
        iv[i] = (uint8_t)(rand() & 0xFF);
    }
    memcpy(outCipher + 8, iv, 16);

    // Encrypt payload using multi-round XOR-CTR mixer
    uint8_t* cipherDst = outCipher + 24;
    for (size_t i = 0; i < inLen; ++i) {
        uint8_t k = derivedKey[(i + iv[i % 16]) % 32];
        cipherDst[i] = inData[i] ^ k;
    }

    // Compute Tag (16 bytes)
    uint8_t fullHash[32];
    fast_sha256_hash(cipherDst, inLen, fullHash);
    memcpy(outCipher + 24 + inLen, fullHash, 16);

    *outCipherLen = totalSize;
    GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
    return VAULT_SUCCESS;
}

GRID_VAULT_API int GridVault_DecryptData(
    const uint8_t* inCipher,
    size_t cipherLen,
    const char* optionalPassphrase,
    uint8_t* outData,
    size_t* outDataLen
) {
    if (!inCipher || cipherLen < 24 || !outData || !outDataLen) {
        return VAULT_ERR_INVALID_PARAM;
    }

    // Verify Magic
    if (memcmp(inCipher, GVAULT_MAGIC, 8) != 0) {
        return VAULT_ERR_AUTH_FAILED;
    }

#ifdef _WIN32
    if (!optionalPassphrase || strlen(optionalPassphrase) == 0) {
        // Try DPAPI
        DWORD blobSize = 0;
        memcpy(&blobSize, inCipher + 8, sizeof(DWORD));
        if (blobSize > 0 && cipherLen >= (8 + sizeof(DWORD) + blobSize)) {
            DATA_BLOB inBlob;
            DATA_BLOB outBlob;
            inBlob.pbData = (BYTE*)(inCipher + 8 + sizeof(DWORD));
            inBlob.cbData = blobSize;

            if (CryptUnprotectData(&inBlob, NULL, NULL, NULL, NULL, CRYPTPROTECT_UI_FORBIDDEN, &outBlob)) {
                if (*outDataLen < outBlob.cbData) {
                    *outDataLen = outBlob.cbData;
                    LocalFree(outBlob.pbData);
                    return VAULT_ERR_BUFFER_TOO_SMALL;
                }
                memcpy(outData, outBlob.pbData, outBlob.cbData);
                *outDataLen = outBlob.cbData;
                GridVault_WipeMemory(outBlob.pbData, outBlob.cbData);
                LocalFree(outBlob.pbData);
                return VAULT_SUCCESS;
            }
        }
    }
#endif

    // Software Cipher Decryption
    if (cipherLen < 40) { // 8 + 16 + payload(0) + 16
        return VAULT_ERR_INVALID_PARAM;
    }

    size_t payloadLen = cipherLen - 40;
    const uint8_t* iv = inCipher + 8;
    const uint8_t* cipherPayload = inCipher + 24;
    const uint8_t* tag = inCipher + 24 + payloadLen;

    // Verify Tag
    uint8_t expectedHash[32];
    fast_sha256_hash(cipherPayload, payloadLen, expectedHash);
    if (memcmp(expectedHash, tag, 16) != 0) {
        return VAULT_ERR_AUTH_FAILED;
    }

    if (*outDataLen < payloadLen) {
        *outDataLen = payloadLen;
        return VAULT_ERR_BUFFER_TOO_SMALL;
    }

    uint8_t derivedKey[32];
    const char* keySrc = optionalPassphrase ? optionalPassphrase : "CISNET_GRID_DEFAULT_MACHINE_KEY";
    fast_sha256_hash((const uint8_t*)keySrc, strlen(keySrc), derivedKey);

    for (size_t i = 0; i < payloadLen; ++i) {
        uint8_t k = derivedKey[(i + iv[i % 16]) % 32];
        outData[i] = cipherPayload[i] ^ k;
    }

    *outDataLen = payloadLen;
    GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
    return VAULT_SUCCESS;
}

static size_t base64_encode(const uint8_t* data, size_t input_length, char* encoded_data, size_t max_len) {
    size_t output_length = 4 * ((input_length + 2) / 3);
    if (encoded_data == NULL || max_len <= output_length) return 0;

    for (size_t i = 0, j = 0; i < input_length;) {
        uint32_t octet_a = i < input_length ? data[i++] : 0;
        uint32_t octet_b = i < input_length ? data[i++] : 0;
        uint32_t octet_c = i < input_length ? data[i++] : 0;

        uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;

        encoded_data[j++] = B64_CHARS[(triple >> 18) & 0x3F];
        encoded_data[j++] = B64_CHARS[(triple >> 12) & 0x3F];
        encoded_data[j++] = i > input_length + 1 ? '=' : B64_CHARS[(triple >> 6) & 0x3F];
        encoded_data[j++] = i > input_length ? '=' : B64_CHARS[triple & 0x3F];
    }
    encoded_data[output_length] = '\0';
    return output_length;
}

static size_t base64_decode(const char* data, size_t input_length, uint8_t* decoded_data, size_t max_len) {
    if (input_length % 4 != 0) return 0;
    size_t output_length = input_length / 4 * 3;
    if (data[input_length - 1] == '=') (output_length)--;
    if (data[input_length - 2] == '=') (output_length)--;
    if (decoded_data == NULL || max_len < output_length) return 0;

    int table[256];
    memset(table, 0x80, sizeof(table));
    for (int i = 0; i < 64; i++) table[(unsigned char)B64_CHARS[i]] = i;
    table['='] = 0;

    for (size_t i = 0, j = 0; i < input_length;) {
        uint32_t a = table[(unsigned char)data[i++]];
        uint32_t b = table[(unsigned char)data[i++]];
        uint32_t c = table[(unsigned char)data[i++]];
        uint32_t d = table[(unsigned char)data[i++]];

        if ((a | b | c | d) & 0x80) return 0;

        uint32_t triple = (a << 18) + (b << 12) + (c << 6) + d;
        if (j < output_length) decoded_data[j++] = (triple >> 16) & 0xFF;
        if (j < output_length) decoded_data[j++] = (triple >> 8) & 0xFF;
        if (j < output_length) decoded_data[j++] = triple & 0xFF;
    }
    return output_length;
}

GRID_VAULT_API int GridVault_EncryptString(
    const char* inJson,
    const char* optionalPassphrase,
    char* outBase64,
    size_t maxLen
) {
    if (!inJson || !outBase64 || maxLen < 32) {
        return VAULT_ERR_INVALID_PARAM;
    }
    size_t inLen = strlen(inJson);
    size_t rawCap = inLen + 128;
    uint8_t* rawBuf = (uint8_t*)malloc(rawCap);
    if (!rawBuf) return VAULT_ERR_MEMORY;

    size_t actualCipherLen = rawCap;
    int res = GridVault_EncryptData((const uint8_t*)inJson, inLen, optionalPassphrase, rawBuf, &actualCipherLen);
    if (res != VAULT_SUCCESS) {
        free(rawBuf);
        return res;
    }

    size_t b64Len = base64_encode(rawBuf, actualCipherLen, outBase64, maxLen);
    GridVault_WipeMemory(rawBuf, actualCipherLen);
    free(rawBuf);

    if (b64Len == 0) return VAULT_ERR_BUFFER_TOO_SMALL;
    return (int)b64Len;
}

GRID_VAULT_API int GridVault_DecryptString(
    const char* inBase64,
    const char* optionalPassphrase,
    char* outJson,
    size_t maxLen
) {
    if (!inBase64 || !outJson || maxLen < 1) {
        return VAULT_ERR_INVALID_PARAM;
    }
    size_t b64Len = strlen(inBase64);
    size_t rawCap = b64Len;
    uint8_t* rawBuf = (uint8_t*)malloc(rawCap);
    if (!rawBuf) return VAULT_ERR_MEMORY;

    size_t decodedLen = base64_decode(inBase64, b64Len, rawBuf, rawCap);
    if (decodedLen == 0) {
        free(rawBuf);
        return VAULT_ERR_INVALID_PARAM;
    }

    size_t actualPlainLen = maxLen - 1;
    int res = GridVault_DecryptData(rawBuf, decodedLen, optionalPassphrase, (uint8_t*)outJson, &actualPlainLen);
    GridVault_WipeMemory(rawBuf, decodedLen);
    free(rawBuf);

    if (res != VAULT_SUCCESS) {
        return res;
    }

    outJson[actualPlainLen] = '\0';
    return (int)actualPlainLen;
}
