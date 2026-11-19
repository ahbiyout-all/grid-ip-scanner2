package main

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Official Grid IP Scanner2 Ed25519 SPKI Public Key (Private signing key never ships in binary)
const gridEd25519PublicKeySPKI = "MCowBQYDK2VwAyEAi8D7v5wK1y3bH0pX9aG8v4T2q1F6j3K5n8M2L0P9wQE="

const (
	sealedLicenseFileName  = "license.sealed.json"
	sealedDomainHMACKey    = "GRID-IP-SCANNER2-USB-SEAL-V1-2026"
	lanSeatBeaconPort      = 39281
	lanSeatDigestSalt      = "GRID-LAN-SEAT-BEACON-V1-2026|"
	defaultOfflineGraceDay = 14
	clockRollbackTolerance = 300 // 5 minutes tolerance for NTP micro-adjustments
)

var revokedLicenseKeySet = map[string]bool{
	"REFUNDED-KEY-EXAMPLE-001": true,
	"REVOKED-SAMPLE-001":       true,
}

type StorageBindingInfo struct {
	MediaType            string `json:"mediaType"` // "removable_usb" | "fixed_disk" | "network_share" | "unknown"
	DeviceLabel          string `json:"deviceLabel"`
	BusType              string `json:"busType"`
	VendorID             string `json:"vendorId,omitempty"`
	ProductID            string `json:"productId,omitempty"`
	Model                string `json:"model,omitempty"`
	SerialNumber         string `json:"-"` // Never expose raw hardware serial in JSON API responses
	HasHardwareSerial    bool   `json:"hasHardwareSerial"`
	FingerprintHash      string `json:"fingerprintHash"`
	FingerprintShort     string `json:"fingerprintShort"`
	StrictOnlineCapHours int    `json:"strictOnlineCapHours,omitempty"`
}

type LicenseFeatures struct {
	VisualGrid        bool `json:"visualGrid"`
	FastPing          bool `json:"fastPing"`
	OUILookup         bool `json:"ouiLookup"`
	PortScanDeep      bool `json:"portScanDeep"`
	DiffCompare       bool `json:"diffCompare"`
	AutoMonitor       bool `json:"autoMonitor"`
	ExportReport      bool `json:"exportReport"`
	MultiSubnet       bool `json:"multiSubnet"`
	RemoteBoot        bool `json:"remoteBoot"`
	IntruderDetection bool `json:"intruderDetection"`
}

type DuplicateSeatConflict struct {
	Detected     bool   `json:"detected"`
	ConflictHost string `json:"conflictHost,omitempty"`
	ConflictIP   string `json:"conflictIp,omitempty"`
	DetectedAt   string `json:"detectedAt,omitempty"`
	Message      string `json:"message,omitempty"`
}

type LicenseStatusResponse struct {
	Tier                 string                 `json:"tier"`
	LicenseType          string                 `json:"licenseType,omitempty"`
	LicensedTo           string                 `json:"licensedTo"`
	LicenseKey           string                 `json:"licenseKey,omitempty"`
	LicenseID            string                 `json:"licenseId,omitempty"`
	IssuedAt             string                 `json:"issuedAt,omitempty"`
	ExpiresAt            string                 `json:"expiresAt,omitempty"`
	MaxSubnets           int                    `json:"maxSubnets"`
	Features             LicenseFeatures        `json:"features"`
	BindingStatus        string                 `json:"bindingStatus"` // unlicensed, verified_usb, verified_fixed_pc, clone_mismatch, clock_tamper, lease_expired, duplicate_seat, signature_invalid, revoked
	BindingReason        string                 `json:"bindingReason"`
	BoundMediaType       string                 `json:"boundMediaType"`
	BoundDeviceLabel     string                 `json:"boundDeviceLabel"`
	BindingHashShort     string                 `json:"bindingHashShort"`
	HasHardwareSerial    bool                   `json:"hasHardwareSerial"`
	LeaseIssuedAt        string                 `json:"leaseIssuedAt,omitempty"`
	LeaseExpiresAt       string                 `json:"leaseExpiresAt,omitempty"`
	OfflineGraceDaysLeft int                    `json:"offlineGraceDaysLeft,omitempty"`
	HybridMode           string                 `json:"hybridMode"` // online_verified | offline_grace | local_sealed | unverified
	SignatureVerified    bool                   `json:"signatureVerified"`
	DuplicateConflict    *DuplicateSeatConflict `json:"duplicateConflict,omitempty"`
	BackendAuthoritative bool                   `json:"backendAuthoritative"`
	TrialUsed            bool                   `json:"trialUsed"`
	TrialActivatedAt     string                 `json:"trialActivatedAt,omitempty"`
	LastError            string                 `json:"lastError,omitempty"`
	Binding              StorageBindingInfo     `json:"binding"`
}

type SignedLicensePayload struct {
	LicenseID          string `json:"licenseId,omitempty"`
	Tier               string `json:"tier"`
	LicenseType        string `json:"licenseType,omitempty"`
	LicensedTo         string `json:"licensedTo,omitempty"`
	IssuedAt           string `json:"issuedAt,omitempty"`
	ExpiresAt          string `json:"expiresAt,omitempty"`
	UsbFingerprintHash string `json:"usbFingerprintHash,omitempty"`
	MaxUsbSeats        int    `json:"maxUsbSeats,omitempty"`
	LeaseIssuedAt      string `json:"leaseIssuedAt,omitempty"`
	LeaseExpiresAt     string `json:"leaseExpiresAt,omitempty"`
	Revoked            bool   `json:"revoked,omitempty"`
}

type SealedDiskFile struct {
	FormatVersion int    `json:"formatVersion"`
	MediaType     string `json:"mediaType"`
	BindingHint   string `json:"bindingHint"`
	HasHwSerial   bool   `json:"hasHwSerial"`
	Nonce         string `json:"nonce"`
	Ciphertext    string `json:"ciphertext"`
	UpdatedAtUtc  string `json:"updatedAtUtc"`
}

type SealedPayload struct {
	Tier                 string `json:"tier"`
	LicenseType          string `json:"licenseType"`
	LicenseID            string `json:"licenseId"`
	LicensedTo           string `json:"licensedTo"`
	LicenseKey           string `json:"licenseKey"`
	IssuedAt             string `json:"issuedAt"`
	ExpiresAt            string `json:"expiresAt,omitempty"`
	BoundFingerprintHash string `json:"boundFingerprintHash"`
	BoundMediaType       string `json:"boundMediaType"`
	BoundDeviceLabel     string `json:"boundDeviceLabel"`
	HasHardwareSerial    bool   `json:"hasHardwareSerial"`
	LeaseIssuedAt        string `json:"leaseIssuedAt,omitempty"`
	LeaseExpiresAt       string `json:"leaseExpiresAt,omitempty"`
	HybridMode           string `json:"hybridMode"`
	SignatureVerified    bool   `json:"signatureVerified"`
	LastVerifiedMonoUtc  int64  `json:"lastVerifiedMonoUtc"`
	TrialUsed            bool   `json:"trialUsed"`
	TrialActivatedAt     string `json:"trialActivatedAt,omitempty"`
	SeatToken            string `json:"seatToken,omitempty"`
	RebindCount          int    `json:"rebindCount,omitempty"`
}

type leaseServerRequest struct {
	LicenseKey          string `json:"licenseKey"`
	LicenseID           string `json:"licenseId,omitempty"`
	HardwareFingerprint string `json:"hardwareFingerprint"`
	MediaType           string `json:"mediaType"`
	DeviceLabel         string `json:"deviceLabel"`
	HasHardwareSerial   bool   `json:"hasHardwareSerial"`
	SeatToken           string `json:"seatToken,omitempty"`
}

type leaseServerResponse struct {
	OK             bool   `json:"ok"`
	Message        string `json:"message,omitempty"`
	SignedToken    string `json:"signedToken,omitempty"`
	LeaseExpiresAt string `json:"leaseExpiresAt,omitempty"`
	SeatToken      string `json:"seatToken,omitempty"`
	Revoked        bool   `json:"revoked,omitempty"`
	SeatExceeded   bool   `json:"seatExceeded,omitempty"`
}

type lanSeatBeaconPacket struct {
	App      string `json:"app"`
	Digest   string `json:"digest"`
	Instance string `json:"inst"`
	Host     string `json:"host"`
}

type LicenseGuard struct {
	mu             sync.RWMutex
	storageDir     string
	publicKey      ed25519.PublicKey
	leaseServerURL string
	httpClient     *http.Client
	hwProvider     func(dir string) StorageBindingInfo
	nowFunc        func() time.Time

	instanceID string
	hostName   string
	conflictMu sync.RWMutex
	conflict   *DuplicateSeatConflict
	conflictAt time.Time
}

var (
	defaultLicenseGuard     *LicenseGuard
	defaultLicenseGuardOnce sync.Once
)

func getLicenseGuard() *LicenseGuard {
	defaultLicenseGuardOnce.Do(func() {
		defaultLicenseGuard = newDefaultLicenseGuard()
	})
	return defaultLicenseGuard
}

func newDefaultLicenseGuard() *LicenseGuard {
	pubKey, err := parseEd25519SPKIPublicKey(gridEd25519PublicKeySPKI)
	if err != nil {
		fmt.Printf("[LicenseGuard] Warning: failed to parse SPKI public key: %v\n", err)
	}
	dir := resolveDefaultLicenseStorageDir()
	host, _ := os.Hostname()
	var randBuf [8]byte
	_, _ = rand.Read(randBuf[:])
	return &LicenseGuard{
		storageDir:     dir,
		publicKey:      pubKey,
		leaseServerURL: strings.TrimRight(strings.TrimSpace(os.Getenv("GRID_LICENSE_SERVER_URL")), "/"),
		httpClient:     &http.Client{Timeout: 5 * time.Second},
		hwProvider:     GetStorageBindingContext,
		nowFunc:        func() time.Time { return time.Now().UTC() },
		instanceID:     hex.EncodeToString(randBuf[:]),
		hostName:       host,
	}
}

func resolveDefaultLicenseStorageDir() string {
	exePath, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exePath)
		tempDir := filepath.Clean(os.TempDir())
		cleanExe := filepath.Clean(exeDir)
		// If running via `go run` inside TempDir, store in user home so builds persist cleanly
		if !strings.HasPrefix(strings.ToLower(cleanExe), strings.ToLower(tempDir)) {
			return exeDir
		}
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return filepath.Join(home, ".grid_ip_scanner")
	}
	return "."
}

func parseEd25519SPKIPublicKey(spkiB64 string) (ed25519.PublicKey, error) {
	der, err := base64.StdEncoding.DecodeString(strings.TrimSpace(spkiB64))
	if err != nil {
		return nil, fmt.Errorf("invalid base64 SPKI: %w", err)
	}
	pubAny, err := x509.ParsePKIXPublicKey(der)
	if err != nil {
		return nil, fmt.Errorf("invalid SPKI DER: %w", err)
	}
	pub, ok := pubAny.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New("public key is not Ed25519")
	}
	return pub, nil
}

func normalizeHardwareSerial(raw string) string {
	cleaned := strings.TrimSpace(strings.ToUpper(raw))
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	if len(cleaned) < 4 {
		return ""
	}
	invalid := map[string]bool{
		"NONE":               true,
		"N/A":                true,
		"NA":                 true,
		"UNKNOWN":            true,
		"DEFAULTSTRING":      true,
		"TOBEFILLEDBYO.E.M":  true,
		"TOBEFILLEDBYO.E.M.": true,
		"00000000":           true,
		"000000000000":       true,
		"12345678":           true,
		"1234567890":         true,
		"FFFFFFFF":           true,
		"FFFFFFFFFFFF":       true,
	}
	if invalid[cleaned] {
		return ""
	}
	// Reject repeated single char serials like "000000" or "AAAAAA"
	allSame := true
	for i := 1; i < len(cleaned); i++ {
		if cleaned[i] != cleaned[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return ""
	}
	return cleaned
}

func freeFeatures() LicenseFeatures {
	return LicenseFeatures{
		VisualGrid: true,
		FastPing:   true,
		OUILookup:  true,
	}
}

func proFeatures() LicenseFeatures {
	return LicenseFeatures{
		VisualGrid:        true,
		FastPing:          true,
		OUILookup:         true,
		PortScanDeep:      true,
		DiffCompare:       true,
		AutoMonitor:       true,
		ExportReport:      true,
		MultiSubnet:       false,
		RemoteBoot:        true,
		IntruderDetection: true,
	}
}

func enterpriseFeatures() LicenseFeatures {
	f := proFeatures()
	f.MultiSubnet = true
	return f
}

func isLicenseRevoked(keyOrID string) bool {
	k := strings.ToUpper(strings.TrimSpace(keyOrID))
	if k == "" {
		return false
	}
	return revokedLicenseKeySet[k]
}

func deriveHardwareSealKey(hwFingerprintHash string) []byte {
	mac := hmac.New(sha256.New, []byte(sealedDomainHMACKey))
	mac.Write([]byte(hwFingerprintHash))
	return mac.Sum(nil)
}

func sealPayloadForHardware(payload SealedPayload, hw StorageBindingInfo, now time.Time) (SealedDiskFile, error) {
	key := deriveHardwareSealKey(hw.FingerprintHash)
	block, err := aes.NewCipher(key)
	if err != nil {
		return SealedDiskFile{}, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return SealedDiskFile{}, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return SealedDiskFile{}, err
	}
	plain, err := json.Marshal(payload)
	if err != nil {
		return SealedDiskFile{}, err
	}
	aad := []byte("grid-seal-v1|" + hw.FingerprintHash)
	ct := gcm.Seal(nil, nonce, plain, aad)
	return SealedDiskFile{
		FormatVersion: 1,
		MediaType:     hw.MediaType,
		BindingHint:   hw.FingerprintShort,
		HasHwSerial:   hw.HasHardwareSerial,
		Nonce:         base64.StdEncoding.EncodeToString(nonce),
		Ciphertext:    base64.StdEncoding.EncodeToString(ct),
		UpdatedAtUtc:  now.UTC().Format(time.RFC3339),
	}, nil
}

func unsealPayloadForHardware(diskFile SealedDiskFile, hw StorageBindingInfo) (*SealedPayload, error) {
	if diskFile.Nonce == "" || diskFile.Ciphertext == "" {
		return nil, errors.New("empty sealed license blob")
	}
	nonce, err := base64.StdEncoding.DecodeString(diskFile.Nonce)
	if err != nil {
		return nil, fmt.Errorf("invalid sealed nonce: %w", err)
	}
	ct, err := base64.StdEncoding.DecodeString(diskFile.Ciphertext)
	if err != nil {
		return nil, fmt.Errorf("invalid sealed ciphertext: %w", err)
	}
	key := deriveHardwareSealKey(hw.FingerprintHash)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(nonce) != gcm.NonceSize() {
		return nil, errors.New("nonce length mismatch")
	}
	aad := []byte("grid-seal-v1|" + hw.FingerprintHash)
	plain, err := gcm.Open(nil, nonce, ct, aad)
	if err != nil {
		return nil, fmt.Errorf("hardware binding seal verification failed (cloned media or tampered file): %w", err)
	}
	var payload SealedPayload
	if err := json.Unmarshal(plain, &payload); err != nil {
		return nil, fmt.Errorf("corrupted sealed payload: %w", err)
	}
	if payload.BoundFingerprintHash != "" && payload.BoundFingerprintHash != hw.FingerprintHash {
		return nil, errors.New("bound hardware fingerprint mismatch")
	}
	return &payload, nil
}

func decodeBase64Flexible(s string) ([]byte, error) {
	clean := strings.TrimSpace(s)
	encodings := []*base64.Encoding{
		base64.RawURLEncoding,
		base64.URLEncoding,
		base64.RawStdEncoding,
		base64.StdEncoding,
	}
	for _, enc := range encodings {
		if b, err := enc.DecodeString(clean); err == nil {
			return b, nil
		}
	}
	return nil, errors.New("invalid base64 encoding")
}

// verifyEd25519TokenWithKey strictly verifies Ed25519 signature over canonical license payload.
// Supported token formats:
// 1) GSCAN.<PAYLOAD_B64>.<SIG_B64>
// 2) ED25519.<PAYLOAD_B64>.<SIG_B64>
// 3) <PAYLOAD_B64>.<SIG_B64>
func verifyEd25519TokenWithKey(token string, pub ed25519.PublicKey) (*SignedLicensePayload, error) {
	if len(pub) != ed25519.PublicKeySize {
		return nil, errors.New("ed25519 public key not configured")
	}
	trimmed := strings.TrimSpace(token)
	if trimmed == "" || !strings.Contains(trimmed, ".") {
		return nil, errors.New("서명이 없는 일반 키 또는 잘못된 토큰 형식입니다 (GSCAN.<payload>.<signature> 형식 필요)")
	}

	parts := strings.Split(trimmed, ".")
	var payloadPart, sigPart string
	if len(parts) == 2 {
		payloadPart = parts[0]
		sigPart = parts[1]
	} else if len(parts) == 3 && (strings.EqualFold(parts[0], "GSCAN") || strings.EqualFold(parts[0], "ED25519")) {
		payloadPart = parts[1]
		sigPart = parts[2]
	} else {
		return nil, errors.New("유효한 Ed25519 라이선스 토큰 구조가 아닙니다")
	}

	payloadBytes, err := decodeBase64Flexible(payloadPart)
	if err != nil {
		return nil, fmt.Errorf("페이로드 Base64 디코딩 실패: %w", err)
	}
	sigBytes, err := decodeBase64Flexible(sigPart)
	if err != nil || len(sigBytes) != ed25519.SignatureSize {
		return nil, errors.New("서명 길이가 Ed25519 규격(64바이트)과 일치하지 않습니다")
	}

	// Verify cryptographic signature against canonical base64 segment OR exact JSON bytes
	validSig := ed25519.Verify(pub, []byte(payloadPart), sigBytes) || ed25519.Verify(pub, payloadBytes, sigBytes)
	if !validSig {
		return nil, errors.New("Ed25519 디지털 서명 검증 실패: 위조되었거나 변조된 라이선스 토큰입니다")
	}

	var parsed SignedLicensePayload
	// Also handle wrapped envelope { "data": { ... } }
	var wrapper struct {
		Data *SignedLicensePayload `json:"data"`
	}
	if err := json.Unmarshal(payloadBytes, &wrapper); err == nil && wrapper.Data != nil && wrapper.Data.Tier != "" {
		parsed = *wrapper.Data
	} else if err := json.Unmarshal(payloadBytes, &parsed); err != nil {
		return nil, fmt.Errorf("라이선스 JSON 페이로드 파싱 실패: %w", err)
	}

	tier := strings.ToLower(strings.TrimSpace(parsed.Tier))
	if tier != "pro" && tier != "enterprise" {
		return nil, errors.New("서명된 토큰에 유효한 유료 티어(pro/enterprise)가 없습니다")
	}
	parsed.Tier = tier

	if parsed.LicenseType == "" {
		parsed.LicenseType = "lifetime"
	} else {
		parsed.LicenseType = strings.ToLower(strings.TrimSpace(parsed.LicenseType))
	}

	if parsed.Revoked || isLicenseRevoked(parsed.LicenseID) || isLicenseRevoked(trimmed) {
		return nil, errors.New("환불 또는 보안 사유로 폐기(Revoked)된 라이선스입니다")
	}

	return &parsed, nil
}

func (g *LicenseGuard) sealedFilePath() string {
	return filepath.Join(g.storageDir, sealedLicenseFileName)
}

func (g *LicenseGuard) readSealedDiskFile() (*SealedDiskFile, bool, error) {
	path := g.sealedFilePath()
	b, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}
	if len(bytes.TrimSpace(b)) == 0 {
		return nil, false, nil
	}
	var disk SealedDiskFile
	if err := json.Unmarshal(b, &disk); err != nil {
		return nil, true, err
	}
	return &disk, true, nil
}

func (g *LicenseGuard) writeSealedPayload(payload SealedPayload, hw StorageBindingInfo, now time.Time) error {
	if err := os.MkdirAll(g.storageDir, 0755); err != nil {
		return err
	}
	disk, err := sealPayloadForHardware(payload, hw, now)
	if err != nil {
		return err
	}
	out, err := json.MarshalIndent(disk, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(g.sealedFilePath(), out, 0600)
}

func (g *LicenseGuard) buildFreeStatus(hw StorageBindingInfo, statusCode, reason string, trialUsed bool, trialActivatedAt string, lastErr string) LicenseStatusResponse {
	var conflictCopy *DuplicateSeatConflict
	g.conflictMu.RLock()
	if g.conflict != nil && g.conflict.Detected && g.nowFunc().Sub(g.conflictAt) <= 45*time.Second {
		cp := *g.conflict
		conflictCopy = &cp
	}
	g.conflictMu.RUnlock()

	return LicenseStatusResponse{
		Tier:                 "free",
		LicenseType:          "free",
		LicensedTo:           "Community User",
		MaxSubnets:           1,
		Features:             freeFeatures(),
		BindingStatus:        statusCode,
		BindingReason:        reason,
		BoundMediaType:       hw.MediaType,
		BoundDeviceLabel:     hw.DeviceLabel,
		BindingHashShort:     hw.FingerprintShort,
		HasHardwareSerial:    hw.HasHardwareSerial,
		HybridMode:           "unverified",
		SignatureVerified:    false,
		DuplicateConflict:    conflictCopy,
		BackendAuthoritative: true,
		TrialUsed:            trialUsed,
		TrialActivatedAt:     trialActivatedAt,
		LastError:            lastErr,
		Binding:              hw,
	}
}

func (g *LicenseGuard) EvaluateStatus() LicenseStatusResponse {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.evaluateStatusLocked()
}

func (g *LicenseGuard) evaluateStatusLocked() LicenseStatusResponse {
	now := g.nowFunc()
	hw := g.hwProvider(g.storageDir)

	diskFile, exists, readErr := g.readSealedDiskFile()
	if !exists {
		return g.buildFreeStatus(
			hw,
			"unlicensed",
			"활성화된 라이선스가 없습니다. 정품 Ed25519 서명 키 또는 1회 체험 키를 입력하세요.",
			false,
			"",
			"",
		)
	}
	if readErr != nil || diskFile == nil {
		return g.buildFreeStatus(
			hw,
			"signature_invalid",
			"봉인된 라이선스 파일 형식이 손상되었습니다.",
			false,
			"",
			fmt.Sprintf("sealed file parse error: %v", readErr),
		)
	}

	payload, err := unsealPayloadForHardware(*diskFile, hw)
	if err != nil {
		// Cloned onto another USB drive or copied to another PC's local disk!
		return g.buildFreeStatus(
			hw,
			"clone_mismatch",
			"현재 실행 매체(USB/PC)의 물리 하드웨어 지문이 봉인된 정품 바인딩과 일치하지 않습니다. 복제된 USB 또는 다른 디스크 복사본에서는 Pro 기능이 잠깁니다.",
			false,
			"",
			err.Error(),
		)
	}

	// Clear active free-state container after deactivation while preserving trialUsed
	if payload.Tier == "" || payload.Tier == "free" {
		return g.buildFreeStatus(
			hw,
			"unlicensed",
			"라이선스가 해제되었습니다 (커뮤니티 에디션).",
			payload.TrialUsed,
			payload.TrialActivatedAt,
			"",
		)
	}

	// Check revocation list
	if isLicenseRevoked(payload.LicenseKey) || isLicenseRevoked(payload.LicenseID) {
		return g.buildFreeStatus(
			hw,
			"revoked",
			"환불 또는 보안 사유로 폐기된 라이선스입니다.",
			payload.TrialUsed,
			payload.TrialActivatedAt,
			"revoked license",
		)
	}

	// Anti-rollback monotonic clock protection
	nowUnix := now.Unix()
	if payload.LastVerifiedMonoUtc > 0 && nowUnix+clockRollbackTolerance < payload.LastVerifiedMonoUtc {
		return g.buildFreeStatus(
			hw,
			"clock_tamper",
			"시스템 시계가 마지막 검증 시각보다 과거로 되돌려졌습니다. 시계를 복원하거나 온라인 갱신을 실행하세요.",
			payload.TrialUsed,
			payload.TrialActivatedAt,
			"clock rollback detected",
		)
	}
	if nowUnix > payload.LastVerifiedMonoUtc+60 {
		payload.LastVerifiedMonoUtc = nowUnix
		_ = g.writeSealedPayload(*payload, hw, now)
	}

	// Check overall license expiration (trial / annual)
	if payload.ExpiresAt != "" {
		if exp, parseErr := time.Parse(time.RFC3339, payload.ExpiresAt); parseErr == nil && now.After(exp) {
			return g.buildFreeStatus(
				hw,
				"lease_expired",
				fmt.Sprintf("라이선스 유효 기간(%s)이 만료되었습니다.", exp.Format("2006-01-02")),
				payload.TrialUsed,
				payload.TrialActivatedAt,
				"license expired",
			)
		}
	}

	// Check hybrid offline lease expiration
	graceDaysLeft := 0
	if payload.LeaseExpiresAt != "" {
		if leaseExp, parseErr := time.Parse(time.RFC3339, payload.LeaseExpiresAt); parseErr == nil {
			if now.After(leaseExp) {
				return g.buildFreeStatus(
					hw,
					"lease_expired",
					"오프라인 유예 임대 기간(Lease)이 만료되었습니다. 인터넷 연결 후 온라인 좌석 갱신을 실행하세요.",
					payload.TrialUsed,
					payload.TrialActivatedAt,
					"offline lease expired",
				)
			}
			graceDaysLeft = int(leaseExp.Sub(now).Hours()/24) + 1
			if graceDaysLeft < 1 {
				graceDaysLeft = 1
			}
		}
	}

	// Check LAN concurrent seat conflict detected via UDP :39281
	g.conflictMu.RLock()
	var activeConflict *DuplicateSeatConflict
	if g.conflict != nil && g.conflict.Detected && now.Sub(g.conflictAt) <= 45*time.Second {
		cp := *g.conflict
		activeConflict = &cp
	}
	g.conflictMu.RUnlock()

	if activeConflict != nil {
		resp := g.buildFreeStatus(
			hw,
			"duplicate_seat",
			fmt.Sprintf("동일 LAN 내 다른 호스트(%s / %s)에서 같은 라이선스가 동시 실행되어 Pro 기능이 일시 제한되었습니다.",
				activeConflict.ConflictHost, activeConflict.ConflictIP),
			payload.TrialUsed,
			payload.TrialActivatedAt,
			activeConflict.Message,
		)
		resp.DuplicateConflict = activeConflict
		return resp
	}

	maxSubnets := 5
	features := proFeatures()
	if payload.Tier == "enterprise" {
		maxSubnets = 999
		features = enterpriseFeatures()
	}

	bindStatus := "verified_fixed_pc"
	bindReason := fmt.Sprintf("PC 하드웨어 바인딩 검증 완료 (%s)", hw.DeviceLabel)
	if hw.MediaType == "removable_usb" {
		bindStatus = "verified_usb"
		if hw.HasHardwareSerial {
			bindReason = fmt.Sprintf("정품 USB 물리 컨트롤러 바인딩 확인 (%s · %s)", hw.DeviceLabel, hw.FingerprintShort)
		} else {
			bindReason = fmt.Sprintf("USB 장치 바인딩됨 (물리 시리얼 미지원 매체 — 24시간 단기 유예 제한 적용: %s)", hw.DeviceLabel)
		}
	}

	return LicenseStatusResponse{
		Tier:                 payload.Tier,
		LicenseType:          payload.LicenseType,
		LicensedTo:           payload.LicensedTo,
		LicenseKey:           payload.LicenseKey,
		LicenseID:            payload.LicenseID,
		IssuedAt:             payload.IssuedAt,
		ExpiresAt:            payload.ExpiresAt,
		MaxSubnets:           maxSubnets,
		Features:             features,
		BindingStatus:        bindStatus,
		BindingReason:        bindReason,
		BoundMediaType:       hw.MediaType,
		BoundDeviceLabel:     hw.DeviceLabel,
		BindingHashShort:     hw.FingerprintShort,
		HasHardwareSerial:    hw.HasHardwareSerial,
		LeaseIssuedAt:        payload.LeaseIssuedAt,
		LeaseExpiresAt:       payload.LeaseExpiresAt,
		OfflineGraceDaysLeft: graceDaysLeft,
		HybridMode:           payload.HybridMode,
		SignatureVerified:    payload.SignatureVerified,
		BackendAuthoritative: true,
		TrialUsed:            payload.TrialUsed,
		TrialActivatedAt:     payload.TrialActivatedAt,
		Binding:              hw,
	}
}

func (g *LicenseGuard) callOnlineLeaseEndpoint(action string, req leaseServerRequest) (*leaseServerResponse, bool, error) {
	if g.leaseServerURL == "" {
		return nil, false, nil
	}
	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, false, err
	}
	endpoint := fmt.Sprintf("%s/v1/licenses/%s", g.leaseServerURL, strings.TrimLeft(action, "/"))
	httpReq, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, false, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "GridIPScanner2-LicenseGuard/1.0")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		// Server unreachable -> allow offline fallback if signed locally
		return nil, false, err
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	var parsed leaseServerResponse
	_ = json.Unmarshal(respBytes, &parsed)

	if resp.StatusCode >= 400 || !parsed.OK {
		msg := parsed.Message
		if msg == "" {
			msg = fmt.Sprintf("온라인 라이선스 서버가 요청을 거부했습니다 (HTTP %d)", resp.StatusCode)
		}
		return &parsed, true, errors.New(msg)
	}
	return &parsed, true, nil
}

func (g *LicenseGuard) ActivateLicense(rawInputKey string) (LicenseStatusResponse, string, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := g.nowFunc()
	hw := g.hwProvider(g.storageDir)
	trimmed := strings.TrimSpace(rawInputKey)
	upper := strings.ToUpper(trimmed)

	// Load existing sealed state on this hardware if readable (to keep TrialUsed memory)
	var existingTrialUsed bool
	var existingTrialActivatedAt string
	var existingRebindCount int
	var hasForeignSeal bool
	if diskFile, exists, readErr := g.readSealedDiskFile(); exists && readErr == nil && diskFile != nil {
		if prev, err := unsealPayloadForHardware(*diskFile, hw); err == nil {
			existingTrialUsed = prev.TrialUsed
			existingTrialActivatedAt = prev.TrialActivatedAt
			existingRebindCount = prev.RebindCount
		} else {
			hasForeignSeal = true
		}
	}

	if trimmed == "" {
		return g.buildFreeStatus(hw, "unlicensed", "라이선스 키를 입력해 주세요.", existingTrialUsed, existingTrialActivatedAt, "empty key"),
			"라이선스 키를 입력해 주세요.", false
	}

	if hw.MediaType == "network_share" {
		msg := "네트워크 공유 드라이브에서는 포터블 라이선스를 바인딩할 수 없습니다. 정품 USB 또는 로컬 디스크에서 실행하세요."
		return g.buildFreeStatus(hw, "clone_mismatch", msg, existingTrialUsed, existingTrialActivatedAt, msg), msg, false
	}

	if isLicenseRevoked(upper) {
		msg := "환불 또는 보안 사유로 폐기된 라이선스 키입니다."
		return g.buildFreeStatus(hw, "revoked", msg, existingTrialUsed, existingTrialActivatedAt, msg), msg, false
	}

	// Single-use 30-day Pro trial (hardware-bound, strictly protected against replay or cloned sealed files)
	if upper == "GRID-PRO-TRIAL-2026" {
		if hasForeignSeal {
			msg := "다른 USB/PC에 바인딩된 봉인 파일이 감지되어 체험판을 중복 발급할 수 없습니다. 기존 바인딩을 초기화하거나 정품 키를 사용하세요."
			return g.buildFreeStatus(hw, "clone_mismatch", msg, false, "", msg), msg, false
		}
		if existingTrialUsed {
			msg := fmt.Sprintf("이미 이 장치에서 Pro 30일 무료 체험판을 이용하셨습니다 (%s 활성화). 정품 Ed25519 라이선스 키를 입력하세요.", existingTrialActivatedAt)
			return g.buildFreeStatus(hw, "unlicensed", msg, true, existingTrialActivatedAt, msg), msg, false
		}

		exp := now.Add(30 * 24 * time.Hour)
		leaseExp := now.Add(defaultOfflineGraceDay * 24 * time.Hour)
		if hw.StrictOnlineCapHours > 0 {
			leaseExp = now.Add(time.Duration(hw.StrictOnlineCapHours) * time.Hour)
		}
		if leaseExp.After(exp) {
			leaseExp = exp
		}

		payload := SealedPayload{
			Tier:                 "pro",
			LicenseType:          "trial",
			LicenseID:            "TRIAL-" + hw.FingerprintShort,
			LicensedTo:           fmt.Sprintf("Pro 30-Day Trial (%s)", hw.DeviceLabel),
			LicenseKey:           upper,
			IssuedAt:             now.Format(time.RFC3339),
			ExpiresAt:            exp.Format(time.RFC3339),
			BoundFingerprintHash: hw.FingerprintHash,
			BoundMediaType:       hw.MediaType,
			BoundDeviceLabel:     hw.DeviceLabel,
			HasHardwareSerial:    hw.HasHardwareSerial,
			LeaseIssuedAt:        now.Format(time.RFC3339),
			LeaseExpiresAt:       leaseExp.Format(time.RFC3339),
			HybridMode:           "offline_grace",
			SignatureVerified:    false,
			LastVerifiedMonoUtc:  now.Unix(),
			TrialUsed:            true,
			TrialActivatedAt:     now.Format(time.RFC3339),
			RebindCount:          existingRebindCount,
		}
		if err := g.writeSealedPayload(payload, hw, now); err != nil {
			msg := fmt.Sprintf("봉인된 라이선스 저장 실패: %v", err)
			return g.buildFreeStatus(hw, "unlicensed", msg, false, "", err.Error()), msg, false
		}
		return g.evaluateStatusLocked(), "Pro 30일 무료 체험판이 현재 하드웨어에 안전하게 바인딩되었습니다.", true
	}

	// Strictly verify Ed25519 cryptographically signed token (NO unsigned PRO-/DEMO-/ANNUAL-/ENT- bypass!)
	signed, err := verifyEd25519TokenWithKey(trimmed, g.publicKey)
	effectiveToken := trimmed

	// If lease server is configured and either local verify failed (e.g. short online license code) or online seat check needed:
	var serverResp *leaseServerResponse
	var contacted bool
	var serverErr error
	if g.leaseServerURL != "" {
		serverResp, contacted, serverErr = g.callOnlineLeaseEndpoint("activate", leaseServerRequest{
			LicenseKey:          trimmed,
			LicenseID:           safeLicenseID(signed),
			HardwareFingerprint: hw.FingerprintHash,
			MediaType:           hw.MediaType,
			DeviceLabel:         hw.DeviceLabel,
			HasHardwareSerial:   hw.HasHardwareSerial,
		})
		if contacted && serverErr != nil {
			// Authoritative rejection from server (seat limit exceeded, revoked, etc.)
			return g.buildFreeStatus(hw, "revoked", serverErr.Error(), existingTrialUsed, existingTrialActivatedAt, serverErr.Error()), serverErr.Error(), false
		}
		if contacted && serverResp != nil && serverResp.SignedToken != "" {
			effectiveToken = serverResp.SignedToken
			signed, err = verifyEd25519TokenWithKey(effectiveToken, g.publicKey)
		}
	}

	if err != nil {
		return g.buildFreeStatus(hw, "signature_invalid", err.Error(), existingTrialUsed, existingTrialActivatedAt, err.Error()), err.Error(), false
	}

	// Enforce pre-pinned USB fingerprint inside signed token if present
	if signed.UsbFingerprintHash != "" && !strings.EqualFold(signed.UsbFingerprintHash, hw.FingerprintHash) {
		msg := "이 라이선스 토큰은 다른 정품 USB 장치에 지정 발급되어 현재 매체에서는 사용할 수 없습니다."
		return g.buildFreeStatus(hw, "clone_mismatch", msg, existingTrialUsed, existingTrialActivatedAt, msg), msg, false
	}

	// Check expiration on signed token
	if signed.ExpiresAt != "" {
		if exp, parseErr := time.Parse(time.RFC3339, signed.ExpiresAt); parseErr == nil && now.After(exp) {
			msg := "서명된 라이선스 토큰의 유효 기간이 만료되었습니다."
			return g.buildFreeStatus(hw, "lease_expired", msg, existingTrialUsed, existingTrialActivatedAt, msg), msg, false
		}
	}

	// Determine hybrid lease window
	hybridMode := "local_sealed"
	leaseIssued := now.Format(time.RFC3339)
	leaseExpires := signed.LeaseExpiresAt
	if contacted && serverResp != nil && serverResp.OK {
		hybridMode = "online_verified"
		if serverResp.LeaseExpiresAt != "" {
			leaseExpires = serverResp.LeaseExpiresAt
		} else if leaseExpires == "" {
			leaseExpires = now.Add(defaultOfflineGraceDay * 24 * time.Hour).Format(time.RFC3339)
		}
	} else if leaseExpires != "" {
		hybridMode = "offline_grace"
	} else if hw.StrictOnlineCapHours > 0 {
		hybridMode = "offline_grace"
		leaseExpires = now.Add(time.Duration(hw.StrictOnlineCapHours) * time.Hour).Format(time.RFC3339)
	}

	if hw.StrictOnlineCapHours > 0 && leaseExpires != "" {
		if curExp, pErr := time.Parse(time.RFC3339, leaseExpires); pErr == nil {
			strictMax := now.Add(time.Duration(hw.StrictOnlineCapHours) * time.Hour)
			if curExp.After(strictMax) {
				leaseExpires = strictMax.Format(time.RFC3339)
			}
		}
	}

	issuedAt := signed.IssuedAt
	if issuedAt == "" {
		issuedAt = now.Format(time.RFC3339)
	}
	expiresAt := signed.ExpiresAt
	if signed.LicenseType == "annual" && expiresAt == "" {
		expiresAt = now.Add(365 * 24 * time.Hour).Format(time.RFC3339)
	}
	licensedTo := signed.LicensedTo
	if licensedTo == "" {
		licensedTo = "Verified Licensee"
	}
	licenseID := signed.LicenseID
	if licenseID == "" {
		h := sha256.Sum256([]byte(effectiveToken))
		licenseID = "LIC-" + strings.ToUpper(hex.EncodeToString(h[:6]))
	}
	seatToken := ""
	if serverResp != nil {
		seatToken = serverResp.SeatToken
	}

	payload := SealedPayload{
		Tier:                 signed.Tier,
		LicenseType:          signed.LicenseType,
		LicenseID:            licenseID,
		LicensedTo:           licensedTo,
		LicenseKey:           effectiveToken,
		IssuedAt:             issuedAt,
		ExpiresAt:            expiresAt,
		BoundFingerprintHash: hw.FingerprintHash,
		BoundMediaType:       hw.MediaType,
		BoundDeviceLabel:     hw.DeviceLabel,
		HasHardwareSerial:    hw.HasHardwareSerial,
		LeaseIssuedAt:        leaseIssued,
		LeaseExpiresAt:       leaseExpires,
		HybridMode:           hybridMode,
		SignatureVerified:    true,
		LastVerifiedMonoUtc:  now.Unix(),
		TrialUsed:            existingTrialUsed,
		TrialActivatedAt:     existingTrialActivatedAt,
		SeatToken:            seatToken,
		RebindCount:          existingRebindCount,
	}

	if err := g.writeSealedPayload(payload, hw, now); err != nil {
		msg := fmt.Sprintf("봉인된 라이선스 파일 기록 실패: %v", err)
		return g.buildFreeStatus(hw, "unlicensed", msg, existingTrialUsed, existingTrialActivatedAt, err.Error()), msg, false
	}

	g.conflictMu.Lock()
	g.conflict = nil
	g.conflictMu.Unlock()

	st := g.evaluateStatusLocked()

	msg := fmt.Sprintf("Ed25519 서명 검증 및 %s 바인딩 완료 (%s)", hw.MediaTypeLabel(), strings.ToUpper(signed.Tier))
	return st, msg, true
}

func (g *LicenseGuard) RefreshLease() (LicenseStatusResponse, string, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := g.nowFunc()
	hw := g.hwProvider(g.storageDir)

	diskFile, exists, readErr := g.readSealedDiskFile()
	if !exists || readErr != nil || diskFile == nil {
		return g.buildFreeStatus(hw, "unlicensed", "갱신할 활성 라이선스가 없습니다.", false, "", ""),
			"갱신할 활성 라이선스가 없습니다.", false
	}

	payload, err := unsealPayloadForHardware(*diskFile, hw)
	if err != nil {
		msg := "하드웨어 바인딩 검증에 실패해 갱신할 수 없습니다 (복제 매체 감지)."
		return g.buildFreeStatus(hw, "clone_mismatch", msg, false, "", err.Error()), msg, false
	}
	if payload.Tier == "" || payload.Tier == "free" {
		msg := "활성화된 Pro/Enterprise 라이선스가 없습니다."
		return g.buildFreeStatus(hw, "unlicensed", msg, payload.TrialUsed, payload.TrialActivatedAt, ""), msg, false
	}

	if g.leaseServerURL == "" {
		payload.LastVerifiedMonoUtc = now.Unix()
		_ = g.writeSealedPayload(*payload, hw, now)
		return g.evaluateStatusLocked(), "로컬 Ed25519 서명 및 USB 하드웨어 바인딩 무결성 점검을 완료했습니다 (폐쇄망 모드).", true
	}

	serverResp, contacted, serverErr := g.callOnlineLeaseEndpoint("refresh", leaseServerRequest{
		LicenseKey:          payload.LicenseKey,
		LicenseID:           payload.LicenseID,
		HardwareFingerprint: hw.FingerprintHash,
		MediaType:           hw.MediaType,
		DeviceLabel:         hw.DeviceLabel,
		HasHardwareSerial:   hw.HasHardwareSerial,
		SeatToken:           payload.SeatToken,
	})
	if !contacted {
		return g.evaluateStatusLocked(), "온라인 라이선스 서버에 연결할 수 없어 오프라인 유예 상태가 유지됩니다.", false
	}
	if serverErr != nil {
		if serverResp != nil && serverResp.Revoked {
			payload.Tier = "free"
			_ = g.writeSealedPayload(*payload, hw, now)
			return g.buildFreeStatus(hw, "revoked", serverErr.Error(), payload.TrialUsed, payload.TrialActivatedAt, serverErr.Error()), serverErr.Error(), false
		}
		return g.evaluateStatusLocked(), serverErr.Error(), false
	}

	leaseDays := defaultOfflineGraceDay
	if hw.StrictOnlineCapHours > 0 {
		leaseDays = 1
	}
	newLeaseExp := now.Add(time.Duration(leaseDays) * 24 * time.Hour).Format(time.RFC3339)
	if serverResp != nil && serverResp.LeaseExpiresAt != "" {
		newLeaseExp = serverResp.LeaseExpiresAt
	}
	if serverResp != nil && serverResp.SignedToken != "" {
		if reVerified, vErr := verifyEd25519TokenWithKey(serverResp.SignedToken, g.publicKey); vErr == nil && reVerified.Tier != "" {
			payload.LicenseKey = serverResp.SignedToken
			payload.Tier = reVerified.Tier
			payload.SignatureVerified = true
		}
	}
	payload.HybridMode = "online_verified"
	payload.LeaseIssuedAt = now.Format(time.RFC3339)
	payload.LeaseExpiresAt = newLeaseExp
	payload.LastVerifiedMonoUtc = now.Unix()
	_ = g.writeSealedPayload(*payload, hw, now)

	g.conflictMu.Lock()
	g.conflict = nil
	g.conflictMu.Unlock()

	return g.evaluateStatusLocked(), "온라인 좌석 인증 및 오프라인 유예 임대(Lease)가 성공적으로 갱신되었습니다.", true
}

func (g *LicenseGuard) DeactivateLicense() (LicenseStatusResponse, string, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := g.nowFunc()
	hw := g.hwProvider(g.storageDir)

	diskFile, exists, readErr := g.readSealedDiskFile()
	if exists && readErr == nil && diskFile != nil {
		if prev, err := unsealPayloadForHardware(*diskFile, hw); err == nil {
			// Notify online lease server to free the USB slot if configured
			if g.leaseServerURL != "" && prev.Tier != "" && prev.Tier != "free" && prev.LicenseType != "trial" {
				_, _, _ = g.callOnlineLeaseEndpoint("deactivate", leaseServerRequest{
					LicenseKey:          prev.LicenseKey,
					LicenseID:           prev.LicenseID,
					HardwareFingerprint: hw.FingerprintHash,
					MediaType:           hw.MediaType,
					DeviceLabel:         hw.DeviceLabel,
					HasHardwareSerial:   hw.HasHardwareSerial,
					SeatToken:           prev.SeatToken,
				})
			}

			if prev.TrialUsed {
				// Preserve TrialUsed flag sealed to this hardware so trial cannot be infinitely reset
				cleared := SealedPayload{
					Tier:                 "free",
					LicenseType:          "free",
					BoundFingerprintHash: hw.FingerprintHash,
					BoundMediaType:       hw.MediaType,
					BoundDeviceLabel:     hw.DeviceLabel,
					HasHardwareSerial:    hw.HasHardwareSerial,
					HybridMode:           "unverified",
					LastVerifiedMonoUtc:  now.Unix(),
					TrialUsed:            true,
					TrialActivatedAt:     prev.TrialActivatedAt,
					RebindCount:          prev.RebindCount + 1,
				}
				_ = g.writeSealedPayload(cleared, hw, now)
			} else {
				_ = os.Remove(g.sealedFilePath())
			}

			g.conflictMu.Lock()
			g.conflict = nil
			g.conflictMu.Unlock()

			return g.buildFreeStatus(hw, "unlicensed", "USB/단말기 라이선스 바인딩이 해제되었습니다.", prev.TrialUsed, prev.TrialActivatedAt, ""),
				"현재 매체의 라이선스 바인딩이 해제되었습니다 (다른 정품 USB에서 재등록 가능).", true
		}
		// Foreign/cloned seal on disk: remove file to let user start clean
		_ = os.Remove(g.sealedFilePath())
	}

	g.conflictMu.Lock()
	g.conflict = nil
	g.conflictMu.Unlock()

	return g.buildFreeStatus(hw, "unlicensed", "라이선스가 커뮤니티 에디션(무료)으로 초기화되었습니다.", false, "", ""),
		"라이선스가 커뮤니티 에디션(무료)으로 초기화되었습니다.", true
}

func (hw StorageBindingInfo) MediaTypeLabel() string {
	switch hw.MediaType {
	case "removable_usb":
		return "정품 USB 하드웨어"
	case "fixed_disk":
		return "PC 고정 디스크"
	case "network_share":
		return "네트워크 공유 드라이브"
	default:
		return "실행 매체"
	}
}

func safeLicenseID(s *SignedLicensePayload) string {
	if s == nil {
		return ""
	}
	return s.LicenseID
}

// StartLANSeatGuard runs the privacy-preserving UDP :39281 beacon & listener
// to detect multiple simultaneous clones running with the same license on the same LAN.
func (g *LicenseGuard) StartLANSeatGuard() {
	go g.runLANListener()
	go g.runLANBroadcaster()
}

func (g *LicenseGuard) computeActiveSeatDigest() (string, bool) {
	st := g.EvaluateStatus()
	if st.Tier == "free" || (st.BindingStatus != "verified_usb" && st.BindingStatus != "verified_fixed_pc") {
		return "", false
	}
	rawKey := st.LicenseKey
	if rawKey == "" {
		rawKey = st.LicenseID
	}
	if rawKey == "" {
		return "", false
	}
	sum := sha256.Sum256([]byte(lanSeatDigestSalt + rawKey))
	return hex.EncodeToString(sum[:8]), true // 16 hex chars (truncated salted digest only; zero PII/raw keys on wire)
}

func (g *LicenseGuard) handleIncomingBeacon(pkt lanSeatBeaconPacket, srcIP string) {
	if pkt.App != "gridscan2" || pkt.Digest == "" || pkt.Instance == "" || pkt.Instance == g.instanceID {
		return
	}
	myDigest, active := g.computeActiveSeatDigest()
	if !active || myDigest != pkt.Digest {
		return
	}
	now := g.nowFunc()
	g.conflictMu.Lock()
	g.conflict = &DuplicateSeatConflict{
		Detected:     true,
		ConflictHost: pkt.Host,
		ConflictIP:   srcIP,
		DetectedAt:   now.Format(time.RFC3339),
		Message:      fmt.Sprintf("LAN 내 다른 장치(%s · %s)에서 동일 라이선스 동시 사용이 감지되었습니다.", pkt.Host, srcIP),
	}
	g.conflictAt = now
	g.conflictMu.Unlock()
}

func (g *LicenseGuard) runLANListener() {
	pc, err := net.ListenPacket("udp4", fmt.Sprintf(":%d", lanSeatBeaconPort))
	if err != nil {
		// Gracefully degrade if port 39281 is occupied or restricted
		return
	}
	defer pc.Close()

	buf := make([]byte, 1024)
	for {
		n, addr, err := pc.ReadFrom(buf)
		if err != nil {
			return
		}
		var pkt lanSeatBeaconPacket
		if jsonErr := json.Unmarshal(buf[:n], &pkt); jsonErr == nil {
			srcIP := ""
			if udpAddr, ok := addr.(*net.UDPAddr); ok {
				srcIP = udpAddr.IP.String()
			}
			g.handleIncomingBeacon(pkt, srcIP)
		}
	}
}

func (g *LicenseGuard) runLANBroadcaster() {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		digest, active := g.computeActiveSeatDigest()
		if !active {
			continue
		}
		pkt := lanSeatBeaconPacket{
			App:      "gridscan2",
			Digest:   digest,
			Instance: g.instanceID,
			Host:     g.hostName,
		}
		b, err := json.Marshal(pkt)
		if err != nil {
			continue
		}
		conn, err := net.DialUDP("udp4", nil, &net.UDPAddr{
			IP:   net.IPv4bcast,
			Port: lanSeatBeaconPort,
		})
		if err == nil {
			_, _ = conn.Write(b)
			_ = conn.Close()
		}
	}
}
