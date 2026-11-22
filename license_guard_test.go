package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func makeTestSignedToken(t *testing.T, priv ed25519.PrivateKey, payload SignedLicensePayload, prefix string) string {
	t.Helper()
	b, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(b)
	sig := ed25519.Sign(priv, []byte(payloadB64))
	sigB64 := base64.RawURLEncoding.EncodeToString(sig)
	if prefix != "" {
		return prefix + "." + payloadB64 + "." + sigB64
	}
	return payloadB64 + "." + sigB64
}

func newTestGuard(t *testing.T, pub ed25519.PublicKey, hw *StorageBindingInfo, now *time.Time) *LicenseGuard {
	t.Helper()
	return &LicenseGuard{
		storageDir: t.TempDir(),
		publicKey:  pub,
		httpClient: &http.Client{Timeout: 2 * time.Second},
		hwProvider: func(dir string) StorageBindingInfo {
			return *hw
		},
		nowFunc:    func() time.Time { return *now },
		instanceID: "test-inst-1",
		hostName:   "test-host-1",
	}
}

func TestEmbeddedSPKIPublicKeyParses(t *testing.T) {
	pub, err := parseEd25519SPKIPublicKey(gridEd25519PublicKeySPKI)
	if err != nil {
		t.Fatalf("expected embedded SPKI public key to parse cleanly, got error: %v", err)
	}
	if len(pub) != ed25519.PublicKeySize {
		t.Fatalf("expected %d-byte Ed25519 pubkey, got %d", ed25519.PublicKeySize, len(pub))
	}
}

func TestEd25519RejectsUnsignedAndTamperedTokens(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	now := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	usbA := StorageBindingInfo{
		MediaType:         "removable_usb",
		DeviceLabel:       "Kingston DataTraveler (VID:0951 PID:1666)",
		BusType:           "USB",
		HasHardwareSerial: true,
		FingerprintHash:   "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff66667777888899990000",
		FingerprintShort:  "aaaa1111bbbb",
	}
	guard := newTestGuard(t, pub, &usbA, &now)

	// 1. Legacy unsigned prefix shortcuts MUST be rejected
	for _, forged := range []string{"PRO-UNLIMITED-2026", "DEMO-PRO", "ENT-BYPASS-01", "ANNUAL-FREE"} {
		st, _, ok := guard.ActivateLicense(forged)
		if ok || st.Tier != "free" {
			t.Fatalf("expected unsigned prefix %q to be rejected, got ok=%v tier=%s", forged, ok, st.Tier)
		}
	}

	// 2. Unsigned raw Base64 JSON MUST be rejected
	rawJSON := base64.StdEncoding.EncodeToString([]byte(`{"tier":"enterprise","licensedTo":"Attacker"}`))
	if st, _, ok := guard.ActivateLicense(rawJSON); ok || st.Tier != "free" {
		t.Fatalf("expected unsigned base64 JSON to be rejected")
	}

	// 3. Valid signed token succeeds
	validToken := makeTestSignedToken(t, priv, SignedLicensePayload{
		LicenseID:   "LIC-VALID-001",
		Tier:        "pro",
		LicenseType: "lifetime",
		LicensedTo:  "Field Engineer A",
	}, "GSCAN")

	// Tamper 1 character in payload -> MUST fail signature verification
	tampered := validToken[:12] + "X" + validToken[13:]
	if st, _, ok := guard.ActivateLicense(tampered); ok || st.Tier != "free" || st.BindingStatus != "signature_invalid" {
		t.Fatalf("expected tampered token rejection (signature_invalid), got ok=%v status=%s", ok, st.BindingStatus)
	}

	// Valid signature succeeds and binds to USB A
	st, _, ok := guard.ActivateLicense(validToken)
	if !ok || st.Tier != "pro" || st.BindingStatus != "verified_usb" || !st.SignatureVerified {
		t.Fatalf("expected valid signed token to activate verified_usb pro, got ok=%v tier=%s status=%s", ok, st.Tier, st.BindingStatus)
	}
}

func TestUSBCloneDetectionAndGenuinePortability(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	now := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	usbA := StorageBindingInfo{
		MediaType:         "removable_usb",
		DeviceLabel:       "SanDisk Ultra (E:)",
		BusType:           "USB",
		HasHardwareSerial: true,
		FingerprintHash:   "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
		FingerprintShort:  "111122223333",
	}
	usbB := StorageBindingInfo{
		MediaType:         "removable_usb",
		DeviceLabel:       "Clone Generic USB (F:)",
		BusType:           "USB",
		HasHardwareSerial: true,
		FingerprintHash:   "9999888877776666555544443333222211110000ffffeeeeddddccccbbbbaaaa",
		FingerprintShort:  "999988887777",
	}

	activeHW := usbA
	guard := newTestGuard(t, pub, &activeHW, &now)

	token := makeTestSignedToken(t, priv, SignedLicensePayload{
		LicenseID:   "LIC-USB-PORTABLE",
		Tier:        "pro",
		LicenseType: "lifetime",
		LicensedTo:  "Kim Engineer",
	}, "GSCAN")

	st, _, ok := guard.ActivateLicense(token)
	if !ok || st.Tier != "pro" {
		t.Fatalf("activation on USB A failed: ok=%v tier=%s", ok, st.Tier)
	}

	// Simulate plugging SAME USB A into a different PC (only USB label drive letter changed, hardware serial hash identical)
	activeHW.DeviceLabel = "SanDisk Ultra (G:)"
	stOtherPC := guard.EvaluateStatus()
	if stOtherPC.Tier != "pro" || stOtherPC.BindingStatus != "verified_usb" {
		t.Fatalf("expected same genuine USB A on another PC to remain Pro, got tier=%s status=%s", stOtherPC.Tier, stOtherPC.BindingStatus)
	}

	// Simulate copying USB A folder (binary + license.sealed.json) onto USB B
	activeHW = usbB
	stClone := guard.EvaluateStatus()
	if stClone.Tier != "free" || stClone.BindingStatus != "clone_mismatch" {
		t.Fatalf("expected cloned USB B to downgrade to free (clone_mismatch), got tier=%s status=%s", stClone.Tier, stClone.BindingStatus)
	}
}

func TestClockRollbackAndSingleUseTrial(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	now := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	usb := StorageBindingInfo{
		MediaType:         "removable_usb",
		DeviceLabel:       "Trial USB",
		HasHardwareSerial: true,
		FingerprintHash:   "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		FingerprintShort:  "abcdefabcdef",
	}
	guard := newTestGuard(t, pub, &usb, &now)

	// Activate 1-time trial
	st, msg, ok := guard.ActivateLicense("GRID-PRO-TRIAL-2026")
	if !ok || st.Tier != "pro" || st.LicenseType != "trial" {
		t.Fatalf("expected first trial activation to succeed, got ok=%v msg=%s", ok, msg)
	}

	// Advance clock by 2 days, evaluate (updates LastVerifiedMonoUtc)
	now = now.Add(48 * time.Hour)
	st = guard.EvaluateStatus()
	if st.Tier != "pro" {
		t.Fatalf("expected trial still active at +48h, got %s", st.Tier)
	}

	// Roll back PC clock by 10 days -> MUST trigger clock_tamper!
	now = now.Add(-10 * 24 * time.Hour)
	st = guard.EvaluateStatus()
	if st.Tier != "free" || st.BindingStatus != "clock_tamper" {
		t.Fatalf("expected clock_tamper after clock rollback, got tier=%s status=%s", st.Tier, st.BindingStatus)
	}

	// Restore clock & deactivate -> re-activating trial MUST be blocked
	now = now.Add(10 * 24 * time.Hour)
	guard.DeactivateLicense()
	stRetry, _, okRetry := guard.ActivateLicense("GRID-PRO-TRIAL-2026")
	if okRetry || stRetry.Tier != "free" || !stRetry.TrialUsed {
		t.Fatalf("expected duplicate trial activation after reset to be blocked, got ok=%v trialUsed=%v", okRetry, stRetry.TrialUsed)
	}
}

func TestHybridOnlineLeaseAndLANDuplicateDetection(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	now := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	usb := StorageBindingInfo{
		MediaType:         "removable_usb",
		DeviceLabel:       "Hybrid Lease USB",
		HasHardwareSerial: true,
		FingerprintHash:   "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
		FingerprintShort:  "deadbeefdead",
	}

	var mu sync.Mutex
	allowSeat := true
	token := makeTestSignedToken(t, priv, SignedLicensePayload{
		LicenseID:   "LIC-HYBRID-99",
		Tier:        "pro",
		LicenseType: "annual",
		LicensedTo:  "Enterprise Field Team",
	}, "GSCAN")

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		allowed := allowSeat
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if !allowed {
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(leaseServerResponse{
				OK:           false,
				SeatExceeded: true,
				Message:      "최대 USB 시트(1개)를 초과했습니다. 기존 USB를 먼저 해제하세요.",
			})
			return
		}
		_ = json.NewEncoder(w).Encode(leaseServerResponse{
			OK:             true,
			SignedToken:    token,
			LeaseExpiresAt: now.Add(14 * 24 * time.Hour).Format(time.RFC3339),
			SeatToken:      "seat-abc-123",
		})
	}))
	defer srv.Close()

	guard := newTestGuard(t, pub, &usb, &now)
	guard.leaseServerURL = srv.URL

	// 1. Online activate succeeds with exact 14-day offline grace window (no +1 off-by-one)
	st, _, ok := guard.ActivateLicense("GSCAN-SHORT-CODE-01")
	if !ok || st.Tier != "pro" || st.HybridMode != "online_verified" {
		t.Fatalf("expected online_verified Pro activation, got ok=%v mode=%s", ok, st.HybridMode)
	}
	if st.OfflineGraceDaysLeft != 14 {
		t.Fatalf("expected exact 14 offline grace days, got %d", st.OfflineGraceDaysLeft)
	}

	// 2. Simulate LAN UDP collision packet from another machine using same license digest
	digest, active := guard.computeActiveSeatDigest()
	if !active || digest == "" {
		t.Fatalf("expected active LAN seat digest")
	}
	guard.handleIncomingBeacon(lanSeatBeaconPacket{
		App:      "gridscan2",
		Digest:   digest,
		Instance: "other-cloned-pc-999",
		Host:     "ROGUE-PC",
	}, "192.168.1.99")

	stDup := guard.EvaluateStatus()
	if stDup.Tier != "free" || stDup.BindingStatus != "duplicate_seat" {
		t.Fatalf("expected duplicate_seat downgrade when LAN collision occurs, got tier=%s status=%s", stDup.Tier, stDup.BindingStatus)
	}

	// 3. Test seat rejection when server denies second USB activation
	mu.Lock()
	allowSeat = false
	mu.Unlock()
	guard2 := newTestGuard(t, pub, &usb, &now)
	guard2.leaseServerURL = srv.URL
	stDenied, _, okDenied := guard2.ActivateLicense(token)
	if okDenied || stDenied.Tier != "free" {
		t.Fatalf("expected server seat limit rejection to block activation")
	}
}
