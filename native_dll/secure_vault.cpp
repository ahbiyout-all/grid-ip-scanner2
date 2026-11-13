/**
 * SecureVault - High-Performance C++ AES-256-GCM Native Encryption DLL Implementation
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#define BUILDING_SECURE_VAULT
#include "secure_vault.h"

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <cstring>
#include <cstdlib>

#ifdef _WIN32
  #include <windows.h>
  #include <bcrypt.h>
  #pragma comment(lib, "bcrypt.lib")
  #pragma comment(lib, "crypt32.lib")
  #pragma comment(lib, "advapi32.lib")
  #ifndef NT_SUCCESS
    #define NT_SUCCESS(Status) (((NTSTATUS)(Status)) >= 0)
  #endif
#else
  #include <sys/random.h>
#endif

namespace {

// Base64 Encoding Table
static const char B64_TABLE[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static std::string base64Encode(const uint8_t* data, size_t len) {
    std::string out;
    out.reserve(((len + 2) / 3) * 4);
    for (size_t i = 0; i < len; i += 3) {
        uint32_t val = (data[i] << 16);
        if (i + 1 < len) val |= (data[i + 1] << 8);
        if (i + 2 < len) val |= data[i + 2];

        out.push_back(B64_TABLE[(val >> 18) & 0x3F]);
        out.push_back(B64_TABLE[(val >> 12) & 0x3F]);
        out.push_back((i + 1 < len) ? B64_TABLE[(val >> 6) & 0x3F] : '=');
        out.push_back((i + 2 < len) ? B64_TABLE[val & 0x3F] : '=');
    }
    return out;
}

static std::vector<uint8_t> base64Decode(const std::string& in) {
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[(unsigned char)B64_TABLE[i]] = i;

    std::vector<uint8_t> out;
    int val = 0, valb = -8;
    for (unsigned char c : in) {
        if (c == '=') break;
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') continue;
        if (T[c] == -1) return {};
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back((uint8_t)((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

// Generates cryptographically secure pseudo-random bytes
static bool generateRandomBytes(uint8_t* buffer, size_t size) {
#ifdef _WIN32
    BCRYPT_ALG_HANDLE hRng = NULL;
    if (NT_SUCCESS(BCryptOpenAlgorithmProvider(&hRng, BCRYPT_RNG_ALGORITHM, NULL, 0))) {
        NTSTATUS status = BCryptGenRandom(hRng, buffer, (ULONG)size, 0);
        BCryptCloseAlgorithmProvider(hRng, 0);
        return NT_SUCCESS(status);
    }
    return false;
#else
    return getrandom(buffer, size, 0) == (ssize_t)size;
#endif
}

// Portable RFC 6234 SHA-256
static inline uint32_t rotr32(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }

static void portableSha256(const uint8_t* data, size_t len, uint8_t out[32]) {
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
    uint32_t st[8] = {
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    };
    uint64_t bitLen = (uint64_t)len * 8ULL;
    size_t paddedLen = ((len + 9 + 63) / 64) * 64;
    uint8_t stackMsg[256];
    std::vector<uint8_t> heapMsg;
    uint8_t* msg = nullptr;
    if (paddedLen <= sizeof(stackMsg)) {
        std::memset(stackMsg, 0, paddedLen);
        msg = stackMsg;
    } else {
        heapMsg.assign(paddedLen, 0);
        msg = heapMsg.data();
    }
    if (len > 0) std::memcpy(msg, data, len);
    msg[len] = 0x80;
    for (int i = 0; i < 8; i++) msg[paddedLen - 1 - i] = (uint8_t)((bitLen >> (i * 8)) & 0xFF);

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
        uint32_t a=st[0],b=st[1],c=st[2],d=st[3],e=st[4],f=st[5],g=st[6],h=st[7];
        for (int i = 0; i < 64; i++) {
            uint32_t S1 = rotr32(e,6) ^ rotr32(e,11) ^ rotr32(e,25);
            uint32_t ch = (e & f) ^ ((~e) & g);
            uint32_t t1 = h + S1 + ch + K[i] + w[i];
            uint32_t S0 = rotr32(a,2) ^ rotr32(a,13) ^ rotr32(a,22);
            uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
            uint32_t t2 = S0 + maj;
            h=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
        }
        st[0]+=a; st[1]+=b; st[2]+=c; st[3]+=d;
        st[4]+=e; st[5]+=f; st[6]+=g; st[7]+=h;
    }
    for (int i = 0; i < 8; i++) {
        out[i*4]   = (uint8_t)((st[i] >> 24) & 0xFF);
        out[i*4+1] = (uint8_t)((st[i] >> 16) & 0xFF);
        out[i*4+2] = (uint8_t)((st[i] >> 8) & 0xFF);
        out[i*4+3] = (uint8_t)(st[i] & 0xFF);
    }
    SecureVault_WipeMemory(msg, paddedLen);
}

static void sha256Bytes(const uint8_t* data, size_t len, uint8_t out[32]) {
#ifdef _WIN32
    BCRYPT_ALG_HANDLE hAlg = NULL;
    BCRYPT_HASH_HANDLE hHash = NULL;
    if (len > 4096 && len <= 0x7FFFFFFFULL && NT_SUCCESS(BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_SHA256_ALGORITHM, NULL, 0))) {
        if (NT_SUCCESS(BCryptCreateHash(hAlg, &hHash, NULL, 0, NULL, 0, 0))) {
            BCryptHashData(hHash, (PUCHAR)data, (ULONG)len, 0);
            BCryptFinishHash(hHash, out, 32, 0);
            BCryptDestroyHash(hHash);
            BCryptCloseAlgorithmProvider(hAlg, 0);
            return;
        }
        BCryptCloseAlgorithmProvider(hAlg, 0);
    }
#endif
    portableSha256(data, len, out);
}

static void hmacSha256(const uint8_t* key, size_t keyLen, const uint8_t* msg, size_t msgLen, uint8_t out[32]) {
    uint8_t kPad[64] = {0};
    if (keyLen > 64) portableSha256(key, keyLen, kPad);
    else if (keyLen > 0) std::memcpy(kPad, key, keyLen);

    uint8_t innerStack[256];
    std::vector<uint8_t> innerHeap;
    size_t innerLen = 64 + msgLen;
    uint8_t* inner = nullptr;
    if (innerLen <= sizeof(innerStack)) {
        inner = innerStack;
    } else {
        innerHeap.resize(innerLen);
        inner = innerHeap.data();
    }
    for (int i = 0; i < 64; i++) inner[i] = kPad[i] ^ 0x36;
    if (msgLen > 0) std::memcpy(inner + 64, msg, msgLen);
    uint8_t innerHash[32];
    portableSha256(inner, innerLen, innerHash);
    SecureVault_WipeMemory(inner, innerLen);

    uint8_t outer[96];
    for (int i = 0; i < 64; i++) outer[i] = kPad[i] ^ 0x5C;
    std::memcpy(outer + 64, innerHash, 32);
    portableSha256(outer, sizeof(outer), out);
    SecureVault_WipeMemory(kPad, sizeof(kPad));
    SecureVault_WipeMemory(innerHash, sizeof(innerHash));
    SecureVault_WipeMemory(outer, sizeof(outer));
}

// PBKDF2-HMAC-SHA256 (10,000 iterations with per-envelope salt or deterministic domain salt for legacy v1)
static void deriveKeyPbkdf2(const char* keyPass, const uint8_t* salt, size_t saltLen, int iterations, uint8_t outKey[32]) {
    const char* fallbackScope = "GridIPScanner2-SecureVault-SessionScope";
    const char* pass = (keyPass && std::strlen(keyPass) > 0) ? keyPass : fallbackScope;
    size_t passLen = std::strlen(pass);

    std::vector<uint8_t> block(saltLen + 4);
    if (saltLen > 0) std::memcpy(block.data(), salt, saltLen);
    block[saltLen] = 0; block[saltLen+1] = 0; block[saltLen+2] = 0; block[saltLen+3] = 1;

    uint8_t u[32], t[32];
    hmacSha256((const uint8_t*)pass, passLen, block.data(), block.size(), u);
    std::memcpy(t, u, 32);
    for (int i = 1; i < iterations; i++) {
        hmacSha256((const uint8_t*)pass, passLen, u, 32, u);
        for (int b = 0; b < 32; b++) t[b] ^= u[b];
    }
    std::memcpy(outKey, t, 32);
    SecureVault_WipeMemory(u, sizeof(u));
    SecureVault_WipeMemory(t, sizeof(t));
}

} // namespace

SECURE_VAULT_API int SecureVault_GetVersion(void) {
    return 20600; // v2.6.0 hardened
}

SECURE_VAULT_API void SecureVault_WipeMemory(void* ptr, size_t len) {
    if (!ptr || len == 0) return;
#ifdef _WIN32
    SecureZeroMemory(ptr, len);
#else
    volatile uint8_t* p = (volatile uint8_t*)ptr;
    while (len--) *p++ = 0;
#endif
}

SECURE_VAULT_API int encryptData(
    const uint8_t* inData,
    size_t inLen,
    const char* keyPass,
    uint8_t* outCipher,
    size_t maxOutLen,
    size_t* outWritten
) {
    if (!inData || !outCipher || !outWritten || inLen > 0x7FFFFFFFULL) {
        return SECURE_VAULT_ERR_INVALID_PARAM;
    }

    size_t totalNeeded = VAULT_HEADER_LEN + VAULT_NONCE_SIZE_BYTES + VAULT_TAG_SIZE_BYTES + inLen;
    if (maxOutLen < totalNeeded) {
        return SECURE_VAULT_ERR_BUFFER_TOO_SMALL;
    }

    uint8_t nonce[VAULT_NONCE_SIZE_BYTES];
    if (!generateRandomBytes(nonce, sizeof(nonce))) {
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    uint8_t key[VAULT_KEY_SIZE_BYTES];
    deriveKeyPbkdf2(keyPass, nonce, sizeof(nonce), 10000, key);

    uint8_t tag[VAULT_TAG_SIZE_BYTES] = {0};
    uint8_t* cipherPayload = outCipher + VAULT_HEADER_LEN + VAULT_NONCE_SIZE_BYTES + VAULT_TAG_SIZE_BYTES;

#ifdef _WIN32
    BCRYPT_ALG_HANDLE hAlg = NULL;
    BCRYPT_KEY_HANDLE hKey = NULL;
    NTSTATUS status = BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_AES_ALGORITHM, NULL, 0);
    if (!NT_SUCCESS(status)) {
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    status = BCryptSetProperty(hAlg, BCRYPT_CHAINING_MODE, (PUCHAR)BCRYPT_CHAIN_MODE_GCM, sizeof(BCRYPT_CHAIN_MODE_GCM), 0);
    if (!NT_SUCCESS(status)) {
        BCryptCloseAlgorithmProvider(hAlg, 0);
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    status = BCryptGenerateSymmetricKey(hAlg, &hKey, NULL, 0, key, sizeof(key), 0);
    if (!NT_SUCCESS(status)) {
        BCryptCloseAlgorithmProvider(hAlg, 0);
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO authInfo;
    BCRYPT_INIT_AUTH_MODE_INFO(authInfo);
    authInfo.pbNonce = nonce;
    authInfo.cbNonce = sizeof(nonce);
    authInfo.pbTag = tag;
    authInfo.cbTag = sizeof(tag);

    ULONG cbData = 0;
    status = BCryptEncrypt(hKey, (PUCHAR)inData, (ULONG)inLen, &authInfo, NULL, 0, cipherPayload, (ULONG)inLen, &cbData, 0);
    BCryptDestroyKey(hKey);
    BCryptCloseAlgorithmProvider(hAlg, 0);
    SecureVault_WipeMemory(key, sizeof(key));

    if (!NT_SUCCESS(status)) {
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }
#else
    // Verified SHA-256-CTR + HMAC-SHA256 fallback (never unauthenticated)
    uint8_t ctrInput[48];
    std::memcpy(ctrInput, key, 32);
    std::memcpy(ctrInput + 32, nonce, 12);
    uint32_t blk = 0;
    size_t off = 0;
    uint8_t ks[32];
    while (off < inLen) {
        ctrInput[44] = (uint8_t)(blk & 0xFF);
        ctrInput[45] = (uint8_t)((blk >> 8) & 0xFF);
        ctrInput[46] = (uint8_t)((blk >> 16) & 0xFF);
        ctrInput[47] = (uint8_t)((blk >> 24) & 0xFF);
        sha256Bytes(ctrInput, sizeof(ctrInput), ks);
        size_t chunk = (inLen - off) < 32 ? (inLen - off) : 32;
        for (size_t i = 0; i < chunk; i++) cipherPayload[off + i] = inData[off + i] ^ ks[i];
        off += chunk;
        blk++;
    }
    std::vector<uint8_t> macIn(VAULT_NONCE_SIZE_BYTES + inLen);
    std::memcpy(macIn.data(), nonce, VAULT_NONCE_SIZE_BYTES);
    if (inLen > 0) std::memcpy(macIn.data() + VAULT_NONCE_SIZE_BYTES, cipherPayload, inLen);
    uint8_t fullMac[32];
    hmacSha256(key, sizeof(key), macIn.data(), macIn.size(), fullMac);
    std::memcpy(tag, fullMac, VAULT_TAG_SIZE_BYTES);
    SecureVault_WipeMemory(ctrInput, sizeof(ctrInput));
    SecureVault_WipeMemory(ks, sizeof(ks));
    SecureVault_WipeMemory(macIn.data(), macIn.size());
    SecureVault_WipeMemory(fullMac, sizeof(fullMac));
    SecureVault_WipeMemory(key, sizeof(key));
#endif

    std::memcpy(outCipher, VAULT_HEADER_MAGIC, VAULT_HEADER_LEN);
    std::memcpy(outCipher + VAULT_HEADER_LEN, nonce, VAULT_NONCE_SIZE_BYTES);
    std::memcpy(outCipher + VAULT_HEADER_LEN + VAULT_NONCE_SIZE_BYTES, tag, VAULT_TAG_SIZE_BYTES);

    *outWritten = totalNeeded;
    return SECURE_VAULT_OK;
}

SECURE_VAULT_API int decryptData(
    const uint8_t* inCipher,
    size_t cipherLen,
    const char* keyPass,
    uint8_t* outPlain,
    size_t maxOutLen,
    size_t* outWritten
) {
    if (!inCipher || !outPlain || !outWritten || cipherLen > 0x7FFFFFFFULL) {
        return SECURE_VAULT_ERR_INVALID_PARAM;
    }

    size_t minHeader = VAULT_HEADER_LEN + VAULT_NONCE_SIZE_BYTES + VAULT_TAG_SIZE_BYTES;
    if (cipherLen < minHeader) {
        return SECURE_VAULT_ERR_INVALID_PARAM;
    }

    if (std::memcmp(inCipher, VAULT_HEADER_MAGIC, VAULT_HEADER_LEN) != 0) {
        return SECURE_VAULT_ERR_AUTH_FAILED;
    }

    size_t plainLen = cipherLen - minHeader;
    if (maxOutLen < plainLen) {
        return SECURE_VAULT_ERR_BUFFER_TOO_SMALL;
    }

    const uint8_t* nonce = inCipher + VAULT_HEADER_LEN;
    const uint8_t* tag = inCipher + VAULT_HEADER_LEN + VAULT_NONCE_SIZE_BYTES;
    const uint8_t* cipherPayload = inCipher + minHeader;

    uint8_t key[VAULT_KEY_SIZE_BYTES];
    deriveKeyPbkdf2(keyPass, nonce, VAULT_NONCE_SIZE_BYTES, 10000, key);

#ifdef _WIN32
    BCRYPT_ALG_HANDLE hAlg = NULL;
    BCRYPT_KEY_HANDLE hKey = NULL;
    NTSTATUS status = BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_AES_ALGORITHM, NULL, 0);
    if (!NT_SUCCESS(status)) {
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    status = BCryptSetProperty(hAlg, BCRYPT_CHAINING_MODE, (PUCHAR)BCRYPT_CHAIN_MODE_GCM, sizeof(BCRYPT_CHAIN_MODE_GCM), 0);
    if (!NT_SUCCESS(status)) {
        BCryptCloseAlgorithmProvider(hAlg, 0);
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    status = BCryptGenerateSymmetricKey(hAlg, &hKey, NULL, 0, key, sizeof(key), 0);
    if (!NT_SUCCESS(status)) {
        BCryptCloseAlgorithmProvider(hAlg, 0);
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_CRYPTO_FAILED;
    }

    BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO authInfo;
    BCRYPT_INIT_AUTH_MODE_INFO(authInfo);
    authInfo.pbNonce = (PUCHAR)nonce;
    authInfo.cbNonce = VAULT_NONCE_SIZE_BYTES;
    authInfo.pbTag = (PUCHAR)tag;
    authInfo.cbTag = VAULT_TAG_SIZE_BYTES;

    ULONG cbPlain = 0;
    status = BCryptDecrypt(hKey, (PUCHAR)cipherPayload, (ULONG)plainLen, &authInfo, NULL, 0, outPlain, (ULONG)plainLen, &cbPlain, 0);
    BCryptDestroyKey(hKey);
    BCryptCloseAlgorithmProvider(hAlg, 0);
    SecureVault_WipeMemory(key, sizeof(key));

    if (!NT_SUCCESS(status)) {
        SecureVault_WipeMemory(outPlain, plainLen);
        return SECURE_VAULT_ERR_AUTH_FAILED;
    }
#else
    std::vector<uint8_t> macIn(VAULT_NONCE_SIZE_BYTES + plainLen);
    std::memcpy(macIn.data(), nonce, VAULT_NONCE_SIZE_BYTES);
    if (plainLen > 0) std::memcpy(macIn.data() + VAULT_NONCE_SIZE_BYTES, cipherPayload, plainLen);
    uint8_t expectedMac[32];
    hmacSha256(key, sizeof(key), macIn.data(), macIn.size(), expectedMac);
    SecureVault_WipeMemory(macIn.data(), macIn.size());

    uint8_t diff = 0;
    for (size_t i = 0; i < VAULT_TAG_SIZE_BYTES; i++) diff |= (uint8_t)(expectedMac[i] ^ tag[i]);
    SecureVault_WipeMemory(expectedMac, sizeof(expectedMac));
    if (diff != 0) {
        SecureVault_WipeMemory(key, sizeof(key));
        return SECURE_VAULT_ERR_AUTH_FAILED;
    }

    uint8_t ctrInput[48];
    std::memcpy(ctrInput, key, 32);
    std::memcpy(ctrInput + 32, nonce, 12);
    uint32_t blk = 0;
    size_t off = 0;
    uint8_t ks[32];
    while (off < plainLen) {
        ctrInput[44] = (uint8_t)(blk & 0xFF);
        ctrInput[45] = (uint8_t)((blk >> 8) & 0xFF);
        ctrInput[46] = (uint8_t)((blk >> 16) & 0xFF);
        ctrInput[47] = (uint8_t)((blk >> 24) & 0xFF);
        sha256Bytes(ctrInput, sizeof(ctrInput), ks);
        size_t chunk = (plainLen - off) < 32 ? (plainLen - off) : 32;
        for (size_t i = 0; i < chunk; i++) outPlain[off + i] = cipherPayload[off + i] ^ ks[i];
        off += chunk;
        blk++;
    }
    SecureVault_WipeMemory(ctrInput, sizeof(ctrInput));
    SecureVault_WipeMemory(ks, sizeof(ks));
    SecureVault_WipeMemory(key, sizeof(key));
#endif

    *outWritten = plainLen;
    return SECURE_VAULT_OK;
}

SECURE_VAULT_API int SecureVault_EncryptString(
    const char* inUtf8String,
    const char* keyPass,
    char* outBase64,
    size_t maxOutLen
) {
    if (!inUtf8String || !outBase64 || maxOutLen == 0) return SECURE_VAULT_ERR_INVALID_PARAM;
    size_t inLen = std::strlen(inUtf8String);
    std::vector<uint8_t> cipherBuf(inLen + 64);
    size_t written = 0;

    int res = encryptData((const uint8_t*)inUtf8String, inLen, keyPass, cipherBuf.data(), cipherBuf.size(), &written);
    if (res != SECURE_VAULT_OK) {
        SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
        return res;
    }

    std::string b64 = base64Encode(cipherBuf.data(), written);
    SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
    if (b64.length() + 1 > maxOutLen) return SECURE_VAULT_ERR_BUFFER_TOO_SMALL;

    std::memcpy(outBase64, b64.c_str(), b64.length() + 1);
    return (int)b64.length();
}

SECURE_VAULT_API int SecureVault_DecryptString(
    const char* inBase64,
    const char* keyPass,
    char* outUtf8String,
    size_t maxOutLen
) {
    if (!inBase64 || !outUtf8String || maxOutLen == 0) return SECURE_VAULT_ERR_INVALID_PARAM;
    std::vector<uint8_t> raw = base64Decode(inBase64);
    if (raw.empty()) return SECURE_VAULT_ERR_INVALID_PARAM;

    std::vector<uint8_t> plainBuf(raw.size());
    size_t written = 0;
    int res = decryptData(raw.data(), raw.size(), keyPass, plainBuf.data(), plainBuf.size(), &written);
    SecureVault_WipeMemory(raw.data(), raw.size());
    if (res != SECURE_VAULT_OK) {
        SecureVault_WipeMemory(plainBuf.data(), plainBuf.size());
        return res;
    }

    if (written + 1 > maxOutLen) {
        SecureVault_WipeMemory(plainBuf.data(), plainBuf.size());
        return SECURE_VAULT_ERR_BUFFER_TOO_SMALL;
    }

    std::memcpy(outUtf8String, plainBuf.data(), written);
    outUtf8String[written] = '\0';
    SecureVault_WipeMemory(plainBuf.data(), plainBuf.size());
    return (int)written;
}

SECURE_VAULT_API int SecureVault_WriteEncryptedFile(
    const char* filePath,
    const uint8_t* inData,
    size_t inLen,
    const char* keyPass
) {
    if (!filePath || !inData) return SECURE_VAULT_ERR_INVALID_PARAM;
    std::vector<uint8_t> cipherBuf(inLen + 64);
    size_t written = 0;
    int res = encryptData(inData, inLen, keyPass, cipherBuf.data(), cipherBuf.size(), &written);
    if (res != SECURE_VAULT_OK) {
        SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
        return res;
    }

    std::ofstream out(filePath, std::ios::binary);
    if (!out.is_open()) {
        SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
        return SECURE_VAULT_ERR_FILE_IO;
    }

    out.write((const char*)cipherBuf.data(), written);
    out.close();
    SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
    return SECURE_VAULT_OK;
}

SECURE_VAULT_API int SecureVault_ReadEncryptedFile(
    const char* filePath,
    const char* keyPass,
    uint8_t* outPlain,
    size_t maxOutLen,
    size_t* outWritten
) {
    if (!filePath || !outPlain || !outWritten) return SECURE_VAULT_ERR_INVALID_PARAM;
    std::ifstream in(filePath, std::ios::binary | std::ios::ate);
    if (!in.is_open()) return SECURE_VAULT_ERR_FILE_IO;

    std::streamsize size = in.tellg();
    if (size <= 0 || size > 64 * 1024 * 1024) return SECURE_VAULT_ERR_INVALID_PARAM;
    in.seekg(0, std::ios::beg);

    std::vector<uint8_t> cipherBuf((size_t)size);
    if (!in.read((char*)cipherBuf.data(), size)) {
        SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
        return SECURE_VAULT_ERR_FILE_IO;
    }
    in.close();

    int res = decryptData(cipherBuf.data(), (size_t)size, keyPass, outPlain, maxOutLen, outWritten);
    SecureVault_WipeMemory(cipherBuf.data(), cipherBuf.size());
    return res;
}
