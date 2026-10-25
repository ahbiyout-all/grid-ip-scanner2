package main

/*
#include <stdlib.h>
#include "grid_vault_driver.h"
*/
import "C"
import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"io"
	"unsafe"
)

//export GridVault_GetVersion
func GridVault_GetVersion() C.int {
	return C.int(20400) // v2.4.0
}

//export GridVault_IsHardwareAesSupported
func GridVault_IsHardwareAesSupported() C.int {
	return C.int(1)
}

//export GridVault_HashData
func GridVault_HashData(inData *C.uint8_t, inLen C.size_t, outHexHash *C.char, maxLen C.size_t) C.int {
	if inData == nil || outHexHash == nil || maxLen < 65 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}
	goBytes := C.GoBytes(unsafe.Pointer(inData), C.int(inLen))
	sum := sha256.Sum256(goBytes)
	hexStr := hex.EncodeToString(sum[:])

	cStr := C.CString(hexStr)
	defer C.free(unsafe.Pointer(cStr))
	C.strncpy(outHexHash, cStr, maxLen-1)
	return C.int(C.VAULT_SUCCESS)
}

//export GridVault_EncryptString
func GridVault_EncryptString(inJson *C.char, optionalPassphrase *C.char, outBase64 *C.char, maxLen C.size_t) C.int {
	if inJson == nil || outBase64 == nil || maxLen < 32 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}
	goPlain := C.GoString(inJson)
	pass := "CISNET_GRID_DEFAULT_MACHINE_KEY"
	if optionalPassphrase != nil {
		p := C.GoString(optionalPassphrase)
		if len(p) > 0 {
			pass = p
		}
	}

	keyHash := sha256.Sum256([]byte(pass))
	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return C.int(C.VAULT_ERR_CRYPTO_FAILED)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return C.int(C.VAULT_ERR_CRYPTO_FAILED)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return C.int(C.VAULT_ERR_CRYPTO_FAILED)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(goPlain), nil)
	envelope := append([]byte("GVAULT10"), ciphertext...)
	b64 := base64.StdEncoding.EncodeToString(envelope)

	if C.size_t(len(b64)+1) > maxLen {
		return C.int(C.VAULT_ERR_BUFFER_TOO_SMALL)
	}

	cRes := C.CString(b64)
	defer C.free(unsafe.Pointer(cRes))
	C.strncpy(outBase64, cRes, maxLen-1)

	return C.int(len(b64))
}

//export GridVault_DecryptString
func GridVault_DecryptString(inBase64 *C.char, optionalPassphrase *C.char, outJson *C.char, maxLen C.size_t) C.int {
	if inBase64 == nil || outJson == nil || maxLen < 1 {
		return C.int(C.VAULT_ERR_INVALID_PARAM)
	}
	b64Str := C.GoString(inBase64)
	raw, err := base64.StdEncoding.DecodeString(b64Str)
	if err != nil || len(raw) < 8 || string(raw[:8]) != "GVAULT10" {
		return C.int(C.VAULT_ERR_AUTH_FAILED)
	}

	pass := "CISNET_GRID_DEFAULT_MACHINE_KEY"
	if optionalPassphrase != nil {
		p := C.GoString(optionalPassphrase)
		if len(p) > 0 {
			pass = p
		}
	}

	keyHash := sha256.Sum256([]byte(pass))
	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return C.int(C.VAULT_ERR_CRYPTO_FAILED)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return C.int(C.VAULT_ERR_CRYPTO_FAILED)
	}

	cipherPayload := raw[8:]
	nonceSize := gcm.NonceSize()
	if len(cipherPayload) < nonceSize {
		return C.int(C.VAULT_ERR_AUTH_FAILED)
	}

	nonce, actualCipher := cipherPayload[:nonceSize], cipherPayload[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, actualCipher, nil)
	if err != nil {
		return C.int(C.VAULT_ERR_AUTH_FAILED)
	}

	if C.size_t(len(plaintext)+1) > maxLen {
		return C.int(C.VAULT_ERR_BUFFER_TOO_SMALL)
	}

	cOut := C.CString(string(plaintext))
	defer C.free(unsafe.Pointer(cOut))
	C.strncpy(outJson, cOut, maxLen-1)

	return C.int(len(plaintext))
}

func main() {}
