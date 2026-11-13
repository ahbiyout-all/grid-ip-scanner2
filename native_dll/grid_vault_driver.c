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

/* Magic envelope headers: "GVAULT10" (legacy) and "GVAULT11" (salted PBKDF2-HMAC-SHA256) */
static const uint8_t GVAULT_MAGIC[8]   = {'G', 'V', 'A', 'U', 'L', 'T', '1', '0'};
static const uint8_t GVAULT_MAGIC11[8] = {'G', 'V', 'A', 'U', 'L', 'T', '1', '1'};
#define VAULT_PBKDF2_ITERS 10000
#define VAULT_SALT_LEN     16

/* Base64 Encoding / Decoding Tables */
static const char B64_CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

GRID_VAULT_API int GridVault_GetVersion(void) {
    return 20600; // v2.6.0 hardened
}

GRID_VAULT_API int GridVault_IsHardwareAesSupported(void) {
#if defined(_MSC_VER) || defined(__GNUC__)
    #if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
        return 1;
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

/* Cryptographically Secure Random Byte Generator */
static int fill_random_bytes(uint8_t* buf, size_t len) {
    if (!buf || len == 0) return 0;
#ifdef _WIN32
    HCRYPTPROV hProv = 0;
    if (CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        BOOL ok = CryptGenRandom(hProv, (DWORD)len, buf);
        CryptReleaseContext(hProv, 0);
        if (ok) return 1;
    }
    return 0;
#else
    FILE* urand = fopen("/dev/urandom", "rb");
    if (urand) {
        size_t readN = fread(buf, 1, len, urand);
        fclose(urand);
        if (readN == len) return 1;
    }
    return 0;
#endif
}

/* Portable RFC 6234 SHA-256 implementation (used on non-Windows or as fallback) */
static uint32_t rotr32(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }

static void portable_sha256(const uint8_t* data, size_t len, uint8_t hash[32]) {
    static const uint32_t K[64] = {
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    };
    uint32_t state[8] = {
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    };

    uint64_t bitLen = (uint64_t)len * 8ULL;
    size_t paddedLen = ((len + 9 + 63) / 64) * 64;
    uint8_t stackMsg[256];
    uint8_t* msg = (paddedLen <= sizeof(stackMsg)) ? stackMsg : (uint8_t*)malloc(paddedLen);
    if (!msg) { memset(hash, 0, 32); return; }
    memset(msg, 0, paddedLen);
    if (len > 0) memcpy(msg, data, len);
    msg[len] = 0x80;
    for (int i = 0; i < 8; i++) {
        msg[paddedLen - 1 - i] = (uint8_t)((bitLen >> (i * 8)) & 0xFF);
    }

    for (size_t off = 0; off < paddedLen; off += 64) {
        uint32_t w[64];
        for (int i = 0; i < 16; i++) {
            w[i] = ((uint32_t)msg[off + i*4] << 24) | ((uint32_t)msg[off + i*4 + 1] << 16) |
                   ((uint32_t)msg[off + i*4 + 2] << 8) | (uint32_t)msg[off + i*4 + 3];
        }
        for (int i = 16; i < 64; i++) {
            uint32_t s0 = rotr32(w[i-15], 7) ^ rotr32(w[i-15], 18) ^ (w[i-15] >> 3);
            uint32_t s1 = rotr32(w[i-2], 17) ^ rotr32(w[i-2], 19) ^ (w[i-2] >> 10);
            w[i] = w[i-16] + s0 + w[i-7] + s1;
        }
        uint32_t a=state[0],b=state[1],c=state[2],d=state[3],e=state[4],f=state[5],g=state[6],h=state[7];
        for (int i = 0; i < 64; i++) {
            uint32_t S1 = rotr32(e,6) ^ rotr32(e,11) ^ rotr32(e,25);
            uint32_t ch = (e & f) ^ ((~e) & g);
            uint32_t t1 = h + S1 + ch + K[i] + w[i];
            uint32_t S0 = rotr32(a,2) ^ rotr32(a,13) ^ rotr32(a,22);
            uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
            uint32_t t2 = S0 + maj;
            h=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
        }
        state[0]+=a; state[1]+=b; state[2]+=c; state[3]+=d;
        state[4]+=e; state[5]+=f; state[6]+=g; state[7]+=h;
    }

    for (int i = 0; i < 8; i++) {
        hash[i*4]   = (uint8_t)((state[i] >> 24) & 0xFF);
        hash[i*4+1] = (uint8_t)((state[i] >> 16) & 0xFF);
        hash[i*4+2] = (uint8_t)((state[i] >> 8) & 0xFF);
        hash[i*4+3] = (uint8_t)(state[i] & 0xFF);
    }
    GridVault_WipeMemory(msg, paddedLen);
    if (msg != stackMsg) free(msg);
}

static void fast_sha256_hash(const uint8_t* data, size_t len, uint8_t hash[32]) {
#ifdef _WIN32
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    DWORD hashLen = 32;

    if (len > 4096 && len <= 0x7FFFFFFFUL && CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
            if (CryptHashData(hHash, data, (DWORD)len, 0) &&
                CryptGetHashParam(hHash, HP_HASHVAL, hash, &hashLen, 0)) {
                CryptDestroyHash(hHash);
                CryptReleaseContext(hProv, 0);
                return;
            }
            CryptDestroyHash(hHash);
        }
        CryptReleaseContext(hProv, 0);
    }
#endif
    portable_sha256(data, len, hash);
}

static void hmac_sha256(const uint8_t* key, size_t keyLen, const uint8_t* msg, size_t msgLen, uint8_t out[32]) {
    uint8_t kPad[64];
    memset(kPad, 0, sizeof(kPad));
    if (keyLen > 64) {
        portable_sha256(key, keyLen, kPad);
    } else if (keyLen > 0) {
        memcpy(kPad, key, keyLen);
    }

    uint8_t innerStack[256];
    size_t innerLen = 64 + msgLen;
    uint8_t* inner = (innerLen <= sizeof(innerStack)) ? innerStack : (uint8_t*)malloc(innerLen);
    if (!inner) { memset(out, 0, 32); GridVault_WipeMemory(kPad, sizeof(kPad)); return; }
    for (int i = 0; i < 64; i++) inner[i] = kPad[i] ^ 0x36;
    if (msgLen > 0) memcpy(inner + 64, msg, msgLen);

    uint8_t innerHash[32];
    portable_sha256(inner, innerLen, innerHash);
    GridVault_WipeMemory(inner, innerLen);
    if (inner != innerStack) free(inner);

    uint8_t outer[64 + 32];
    for (int i = 0; i < 64; i++) outer[i] = kPad[i] ^ 0x5C;
    memcpy(outer + 64, innerHash, 32);
    portable_sha256(outer, sizeof(outer), out);

    GridVault_WipeMemory(kPad, sizeof(kPad));
    GridVault_WipeMemory(innerHash, sizeof(innerHash));
    GridVault_WipeMemory(outer, sizeof(outer));
}

static void derive_pbkdf2_sha256(const char* passphrase, const uint8_t salt[VAULT_SALT_LEN], uint8_t outKey[32]) {
    uint8_t passKey[64];
    size_t passLen = 0;
    if (passphrase && passphrase[0] != '\0') {
        passLen = strlen(passphrase);
        if (passLen > sizeof(passKey)) passLen = sizeof(passKey);
        memcpy(passKey, passphrase, passLen);
    } else {
        /* Per-invocation salted session binding when no passphrase is passed */
        const char* label = "GridIPScanner2-LocalVault";
        passLen = strlen(label);
        memcpy(passKey, label, passLen);
    }

    uint8_t blockInput[VAULT_SALT_LEN + 4];
    memcpy(blockInput, salt, VAULT_SALT_LEN);
    blockInput[VAULT_SALT_LEN]     = 0;
    blockInput[VAULT_SALT_LEN + 1] = 0;
    blockInput[VAULT_SALT_LEN + 2] = 0;
    blockInput[VAULT_SALT_LEN + 3] = 1; /* block index 1 */

    uint8_t u[32], t[32];
    hmac_sha256(passKey, passLen, blockInput, sizeof(blockInput), u);
    memcpy(t, u, 32);

    for (int iter = 1; iter < VAULT_PBKDF2_ITERS; iter++) {
        hmac_sha256(passKey, passLen, u, 32, u);
        for (int b = 0; b < 32; b++) t[b] ^= u[b];
    }
    memcpy(outKey, t, 32);

    GridVault_WipeMemory(passKey, sizeof(passKey));
    GridVault_WipeMemory(u, sizeof(u));
    GridVault_WipeMemory(t, sizeof(t));
}

static void ctr_xor_stream(const uint8_t derivedKey[32], const uint8_t iv[16], const uint8_t* src, uint8_t* dst, size_t len) {
    uint8_t ctrInput[52];
    memcpy(ctrInput, derivedKey, 32);
    memcpy(ctrInput + 32, iv, 16);

    uint8_t keystream[32];
    size_t offset = 0;
    uint32_t blockIdx = 0;
    while (offset < len) {
        ctrInput[48] = (uint8_t)(blockIdx & 0xFF);
        ctrInput[49] = (uint8_t)((blockIdx >> 8) & 0xFF);
        ctrInput[50] = (uint8_t)((blockIdx >> 16) & 0xFF);
        ctrInput[51] = (uint8_t)((blockIdx >> 24) & 0xFF);
        fast_sha256_hash(ctrInput, sizeof(ctrInput), keystream);

        size_t chunk = (len - offset) < 32 ? (len - offset) : 32;
        for (size_t i = 0; i < chunk; ++i) {
            dst[offset + i] = src[offset + i] ^ keystream[i];
        }
        offset += chunk;
        blockIdx++;
    }
    GridVault_WipeMemory(ctrInput, sizeof(ctrInput));
    GridVault_WipeMemory(keystream, sizeof(keystream));
}

static void compute_keyed_tag(const uint8_t derivedKey[32], const uint8_t iv[16], const uint8_t* cipher, size_t cipherLen, uint8_t outTag[16]) {
    size_t macBufLen = 16 + cipherLen;
    uint8_t* macBuf = (uint8_t*)malloc(macBufLen);
    if (!macBuf) {
        memset(outTag, 0, 16);
        return;
    }
    memcpy(macBuf, iv, 16);
    if (cipherLen > 0) memcpy(macBuf + 16, cipher, cipherLen);

    uint8_t fullHmac[32];
    hmac_sha256(derivedKey, 32, macBuf, macBufLen, fullHmac);
    memcpy(outTag, fullHmac, 16);
    GridVault_WipeMemory(macBuf, macBufLen);
    GridVault_WipeMemory(fullHmac, sizeof(fullHmac));
    free(macBuf);
}

static void compute_legacy_tag(const uint8_t derivedKey[32], const uint8_t iv[16], const uint8_t* cipher, size_t cipherLen, uint8_t outTag[16]) {
    size_t macBufLen = 32 + 16 + cipherLen;
    uint8_t* macBuf = (uint8_t*)malloc(macBufLen);
    if (!macBuf) { memset(outTag, 0, 16); return; }
    memcpy(macBuf, derivedKey, 32);
    memcpy(macBuf + 32, iv, 16);
    if (cipherLen > 0) memcpy(macBuf + 48, cipher, cipherLen);

    uint8_t fullHash[32];
    fast_sha256_hash(macBuf, macBufLen, fullHash);
    memcpy(outTag, fullHash, 16);
    GridVault_WipeMemory(macBuf, macBufLen);
    GridVault_WipeMemory(fullHash, sizeof(fullHash));
    free(macBuf);
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
    if (!inData || inLen == 0 || inLen > 0x7FFFFFFFUL || !outCipher || !outCipherLen) {
        return VAULT_ERR_INVALID_PARAM;
    }

#ifdef _WIN32
    if (!optionalPassphrase || strlen(optionalPassphrase) == 0) {
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

    // Mode 2 (GVAULT11): Magic(8) + Salt(16) + IV(16) + Ciphertext(inLen) + HMAC-Tag(16)
    size_t totalSize = 8 + VAULT_SALT_LEN + 16 + inLen + 16;
    if (*outCipherLen < totalSize) {
        *outCipherLen = totalSize;
        return VAULT_ERR_BUFFER_TOO_SMALL;
    }

    uint8_t salt[VAULT_SALT_LEN];
    uint8_t iv[16];
    if (!fill_random_bytes(salt, sizeof(salt)) || !fill_random_bytes(iv, sizeof(iv))) {
        return VAULT_ERR_CRYPTO_FAILED;
    }

    uint8_t derivedKey[32];
    derive_pbkdf2_sha256(optionalPassphrase, salt, derivedKey);

    memcpy(outCipher, GVAULT_MAGIC11, 8);
    memcpy(outCipher + 8, salt, VAULT_SALT_LEN);
    memcpy(outCipher + 8 + VAULT_SALT_LEN, iv, 16);

    uint8_t* cipherDst = outCipher + 8 + VAULT_SALT_LEN + 16;
    ctr_xor_stream(derivedKey, iv, inData, cipherDst, inLen);
    compute_keyed_tag(derivedKey, iv, cipherDst, inLen, cipherDst + inLen);

    *outCipherLen = totalSize;
    GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
    GridVault_WipeMemory(salt, sizeof(salt));
    return VAULT_SUCCESS;
}

GRID_VAULT_API int GridVault_DecryptData(
    const uint8_t* inCipher,
    size_t cipherLen,
    const char* optionalPassphrase,
    uint8_t* outData,
    size_t* outDataLen
) {
    if (!inCipher || cipherLen < 24 || cipherLen > 0x7FFFFFFFUL || !outData || !outDataLen) {
        return VAULT_ERR_INVALID_PARAM;
    }

    int isV11 = (memcmp(inCipher, GVAULT_MAGIC11, 8) == 0);
    int isV10 = (memcmp(inCipher, GVAULT_MAGIC, 8) == 0);
    if (!isV11 && !isV10) {
        return VAULT_ERR_AUTH_FAILED;
    }

#ifdef _WIN32
    if (isV10 && (!optionalPassphrase || strlen(optionalPassphrase) == 0)) {
        DWORD blobSize = 0;
        memcpy(&blobSize, inCipher + 8, sizeof(DWORD));
        if (blobSize > 0 && cipherLen >= (8 + sizeof(DWORD) + (size_t)blobSize)) {
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

    if (isV11) {
        size_t minLen = 8 + VAULT_SALT_LEN + 16 + 16;
        if (cipherLen < minLen) return VAULT_ERR_INVALID_PARAM;

        size_t payloadLen = cipherLen - minLen;
        const uint8_t* salt = inCipher + 8;
        const uint8_t* iv = inCipher + 8 + VAULT_SALT_LEN;
        const uint8_t* cipherPayload = inCipher + 8 + VAULT_SALT_LEN + 16;
        const uint8_t* tag = cipherPayload + payloadLen;

        uint8_t derivedKey[32];
        derive_pbkdf2_sha256(optionalPassphrase, salt, derivedKey);

        uint8_t expectedTag[16];
        compute_keyed_tag(derivedKey, iv, cipherPayload, payloadLen, expectedTag);
        uint8_t diff = 0;
        for (size_t i = 0; i < 16; ++i) diff |= (uint8_t)(expectedTag[i] ^ tag[i]);
        GridVault_WipeMemory(expectedTag, sizeof(expectedTag));
        if (diff != 0) {
            GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
            return VAULT_ERR_AUTH_FAILED;
        }
        if (*outDataLen < payloadLen) {
            *outDataLen = payloadLen;
            GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
            return VAULT_ERR_BUFFER_TOO_SMALL;
        }
        ctr_xor_stream(derivedKey, iv, cipherPayload, outData, payloadLen);
        *outDataLen = payloadLen;
        GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
        return VAULT_SUCCESS;
    }

    // Legacy GVAULT10 decryption compatibility
    if (cipherLen < 40) return VAULT_ERR_INVALID_PARAM;
    if (!optionalPassphrase || strlen(optionalPassphrase) == 0) {
        return VAULT_ERR_AUTH_FAILED;
    }

    size_t payloadLen = cipherLen - 40;
    const uint8_t* iv = inCipher + 8;
    const uint8_t* cipherPayload = inCipher + 24;
    const uint8_t* tag = inCipher + 24 + payloadLen;

    uint8_t derivedKey[32];
    fast_sha256_hash((const uint8_t*)optionalPassphrase, strlen(optionalPassphrase), derivedKey);

    uint8_t expectedTag[16];
    compute_legacy_tag(derivedKey, iv, cipherPayload, payloadLen, expectedTag);
    uint8_t diff = 0;
    for (size_t i = 0; i < 16; ++i) diff |= (uint8_t)(expectedTag[i] ^ tag[i]);
    GridVault_WipeMemory(expectedTag, sizeof(expectedTag));
    if (diff != 0) {
        GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
        return VAULT_ERR_AUTH_FAILED;
    }

    if (*outDataLen < payloadLen) {
        *outDataLen = payloadLen;
        GridVault_WipeMemory(derivedKey, sizeof(derivedKey));
        return VAULT_ERR_BUFFER_TOO_SMALL;
    }

    ctr_xor_stream(derivedKey, iv, cipherPayload, outData, payloadLen);
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
    if (!data || input_length < 4 || (input_length % 4) != 0) return 0;
    size_t pad = 0;
    if (data[input_length - 1] == '=') pad++;
    if (data[input_length - 2] == '=') {
        if (pad == 0) return 0;
        pad++;
    }
    size_t output_length = (input_length / 4) * 3 - pad;
    if (decoded_data == NULL || max_len < output_length) return 0;

    int table[256];
    memset(table, 0x80, sizeof(table));
    for (int i = 0; i < 64; i++) table[(unsigned char)B64_CHARS[i]] = i;

    for (size_t i = 0, j = 0; i < input_length; i += 4) {
        int isLast = (i + 4 == input_length);
        uint32_t a = (uint32_t)table[(unsigned char)data[i]];
        uint32_t b = (uint32_t)table[(unsigned char)data[i + 1]];
        uint32_t c = (isLast && pad == 2 && data[i + 2] == '=') ? 0u : (uint32_t)table[(unsigned char)data[i + 2]];
        uint32_t d = (isLast && pad >= 1 && data[i + 3] == '=') ? 0u : (uint32_t)table[(unsigned char)data[i + 3]];

        if ((a | b | c | d) & 0x80u) return 0;

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
    size_t rawCap = inLen + 256;
    uint8_t* rawBuf = (uint8_t*)malloc(rawCap);
    if (!rawBuf) return VAULT_ERR_MEMORY;

    size_t actualCipherLen = rawCap;
    int res = GridVault_EncryptData((const uint8_t*)inJson, inLen, optionalPassphrase, rawBuf, &actualCipherLen);
    if (res != VAULT_SUCCESS) {
        GridVault_WipeMemory(rawBuf, rawCap);
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
    if (b64Len < 4) return VAULT_ERR_INVALID_PARAM;
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
