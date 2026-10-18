package main

/*
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

// Return codes
#define VAULT_OK 0
#define VAULT_ERR_INVALID_PARAM -1
#define VAULT_ERR_BUFFER_TOO_SMALL -2
#define VAULT_ERR_ENCRYPT_FAILED -3
#define VAULT_ERR_DECRYPT_FAILED -4
#define VAULT_ERR_AUTH_MISMATCH -5
#define VAULT_ERR_FILE_IO -6
*/
import "C"
import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"os"
	"unsafe"
)

const (
	HeaderMagic = "GVAULT10" // 8-byte magic header
	NonceLength = 12         // 12-byte standard GCM nonce
	TagLength   = 16         // 16-byte Poly1305 / GHASH authentication tag
)

// ZeroMemory sanitizes sensitive byte slices in memory to prevent RAM dump forensics.
func zeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

//export GridVault_GetVersionCode
func GridVault_GetVersionCode() C.int {
	return C.int(20400) // v2.4.0
}

func deriveKey(passStr string) [32]byte {
	return sha256.Sum256([]byte(passStr))
}

func encryptInternal(goPlain []byte, passStr string) ([]byte, error) {
	keyHash := deriveKey(passStr)
	key := keyHash[:]
	defer zeroBytes(key)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nil, nonce, goPlain, nil)

	envelope := make([]byte, 0, len(HeaderMagic)+len(nonce)+len(ciphertext))
	envelope = append(envelope, []byte(HeaderMagic)...)
	envelope = append(envelope, nonce...)
	envelope = append(envelope, ciphertext...)
	return envelope, nil
}

func decryptInternal(rawEnvelope []byte, passStr string) ([]byte, C.int) {
	minLen := len(HeaderMagic) + NonceLength + TagLength
	if len(rawEnvelope) < minLen {
		return nil, C.VAULT_ERR_DECRYPT_FAILED
	}

	magic := string(rawEnvelope[:len(HeaderMagic)])
	if magic != HeaderMagic {
		return nil, C.VAULT_ERR_AUTH_MISMATCH
	}

	keyHash := deriveKey(passStr)
	key := keyHash[:]
	defer zeroBytes(key)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, C.VAULT_ERR_DECRYPT_FAILED
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, C.VAULT_ERR_DECRYPT_FAILED
	}

	nonceStart := len(HeaderMagic)
	nonceEnd := nonceStart + gcm.NonceSize()
	nonce := rawEnvelope[nonceStart:nonceEnd]
	cipherPayload := rawEnvelope[nonceEnd:]

	plaintext, err := gcm.Open(nil, nonce, cipherPayload, nil)
	if err != nil {
		return nil, C.VAULT_ERR_AUTH_MISMATCH
	}

	return plaintext, C.VAULT_OK
}

//export GridVault_EncryptGCM
// C ABI: int GridVault_EncryptGCM(const char* plaintext, const char* keyPass, char* outBase64, int maxOutLen)
func GridVault_EncryptGCM(plaintext *C.char, keyPass *C.char, outBase64 *C.char, maxOutLen C.int) C.int {
	if plaintext == nil || outBase64 == nil || maxOutLen <= 0 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}

	goPlain := []byte(C.GoString(plaintext))
	passStr := "CISNET_GRID_SECURE_DEFAULT_KEY"
	if keyPass != nil {
		p := C.GoString(keyPass)
		if len(p) > 0 {
			passStr = p
		}
	}

	envelope, err := encryptInternal(goPlain, passStr)
	if err != nil {
		return C.int(C.VAULT_ERR_ENCRYPT_FAILED)
	}

	b64Result := base64.StdEncoding.EncodeToString(envelope)
	if len(b64Result)+1 > int(maxOutLen) {
		return C.int(C.VAULT_ERR_BUFFER_TOO_SMALL)
	}

	cRes := C.CString(b64Result)
	defer C.free(unsafe.Pointer(cRes))
	C.strncpy(outBase64, cRes, C.size_t(maxOutLen-1))

	return C.int(len(b64Result))
}

//export GridVault_DecryptGCM
// C ABI: int GridVault_DecryptGCM(const char* inBase64, const char* keyPass, char* outPlaintext, int maxOutLen)
func GridVault_DecryptGCM(inBase64 *C.char, keyPass *C.char, outPlaintext *C.char, maxOutLen C.int) C.int {
	if inBase64 == nil || outPlaintext == nil || maxOutLen <= 0 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}

	b64Str := C.GoString(inBase64)
	rawEnvelope, err := base64.StdEncoding.DecodeString(b64Str)
	if err != nil {
		return C.int(C.VAULT_ERR_DECRYPT_FAILED)
	}

	passStr := "CISNET_GRID_SECURE_DEFAULT_KEY"
	if keyPass != nil {
		p := C.GoString(keyPass)
		if len(p) > 0 {
			passStr = p
		}
	}

	plaintext, errCode := decryptInternal(rawEnvelope, passStr)
	if errCode != C.VAULT_OK {
		return C.int(errCode)
	}
	defer zeroBytes(plaintext)

	if len(plaintext)+1 > int(maxOutLen) {
		return C.int(C.VAULT_ERR_BUFFER_TOO_SMALL)
	}

	cOut := C.CString(string(plaintext))
	defer C.free(unsafe.Pointer(cOut))
	C.strncpy(outPlaintext, cOut, C.size_t(maxOutLen-1))

	return C.int(len(plaintext))
}

//export GridVault_WriteEncryptedFile
// C ABI: int GridVault_WriteEncryptedFile(const char* filePath, const char* plaintext, const char* keyPass)
func GridVault_WriteEncryptedFile(filePath *C.char, plaintext *C.char, keyPass *C.char) C.int {
	if filePath == nil || plaintext == nil {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}

	pathStr := C.GoString(filePath)
	goPlain := []byte(C.GoString(plaintext))
	passStr := "CISNET_GRID_SECURE_DEFAULT_KEY"
	if keyPass != nil {
		p := C.GoString(keyPass)
		if len(p) > 0 {
			passStr = p
		}
	}

	envelope, err := encryptInternal(goPlain, passStr)
	if err != nil {
		return C.int(C.VAULT_ERR_ENCRYPT_FAILED)
	}

	b64Data := base64.StdEncoding.EncodeToString(envelope)
	err = os.WriteFile(pathStr, []byte(b64Data), 0600)
	if err != nil {
		return C.int(C.VAULT_ERR_FILE_IO)
	}

	return C.int(C.VAULT_OK)
}

//export GridVault_ReadEncryptedFile
// C ABI: int GridVault_ReadEncryptedFile(const char* filePath, const char* keyPass, char* outPlaintext, int maxOutLen)
func GridVault_ReadEncryptedFile(filePath *C.char, keyPass *C.char, outPlaintext *C.char, maxOutLen C.int) C.int {
	if filePath == nil || outPlaintext == nil || maxOutLen <= 0 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}

	pathStr := C.GoString(filePath)
	data, err := os.ReadFile(pathStr)
	if err != nil {
		return C.int(C.VAULT_ERR_FILE_IO)
	}

	rawEnvelope, err := base64.StdEncoding.DecodeString(string(data))
	if err != nil {
		return C.int(C.VAULT_ERR_DECRYPT_FAILED)
	}

	passStr := "CISNET_GRID_SECURE_DEFAULT_KEY"
	if keyPass != nil {
		p := C.GoString(keyPass)
		if len(p) > 0 {
			passStr = p
		}
	}

	plaintext, errCode := decryptInternal(rawEnvelope, passStr)
	if errCode != C.VAULT_OK {
		return C.int(errCode)
	}
	defer zeroBytes(plaintext)

	if len(plaintext)+1 > int(maxOutLen) {
		return C.int(C.VAULT_ERR_BUFFER_TOO_SMALL)
	}

	cOut := C.CString(string(plaintext))
	defer C.free(unsafe.Pointer(cOut))
	C.strncpy(outPlaintext, cOut, C.size_t(maxOutLen-1))

	return C.int(len(plaintext))
}

//export GridVault_EncryptDeviceAliases
// C ABI: int GridVault_EncryptDeviceAliases(const char* aliasesJson, const char* outFilePath, const char* keyPass)
func GridVault_EncryptDeviceAliases(aliasesJson *C.char, outFilePath *C.char, keyPass *C.char) C.int {
	return GridVault_WriteEncryptedFile(outFilePath, aliasesJson, keyPass)
}

//export GridVault_DecryptDeviceAliases
// C ABI: int GridVault_DecryptDeviceAliases(const char* inFilePath, const char* keyPass, char* outJson, int maxOutLen)
func GridVault_DecryptDeviceAliases(inFilePath *C.char, keyPass *C.char, outJson *C.char, maxOutLen C.int) C.int {
	return GridVault_ReadEncryptedFile(inFilePath, keyPass, outJson, maxOutLen)
}

//export GridVault_EncryptSnapshot
// C ABI: int GridVault_EncryptSnapshot(const char* snapshotJson, const char* outFilePath, const char* keyPass)
func GridVault_EncryptSnapshot(snapshotJson *C.char, outFilePath *C.char, keyPass *C.char) C.int {
	return GridVault_WriteEncryptedFile(outFilePath, snapshotJson, keyPass)
}

//export GridVault_DecryptSnapshot
// C ABI: int GridVault_DecryptSnapshot(const char* inFilePath, const char* keyPass, char* outJson, int maxOutLen)
func GridVault_DecryptSnapshot(inFilePath *C.char, keyPass *C.char, outJson *C.char, maxOutLen C.int) C.int {
	return GridVault_ReadEncryptedFile(inFilePath, keyPass, outJson, maxOutLen)
}

func main() {}
