package main

import (
	"testing"
	"time"
)

func TestSelectDeepBannerStringPriority(t *testing.T) {
	if got := selectDeepBannerString(nil); got != "" {
		t.Fatalf("expected empty string for nil, got %q", got)
	}

	b := &DeepBannerInfo{
		ServerHeader: "nginx/1.24",
		SshBanner:    "SSH-2.0-OpenSSH_9.3",
		RtspServer:   "RTSP/1.0 Cam",
		HtmlTitle:    "Router Admin",
	}
	if got := selectDeepBannerString(b); got != "nginx/1.24" {
		t.Fatalf("expected ServerHeader first, got %q", got)
	}

	b.ServerHeader = ""
	if got := selectDeepBannerString(b); got != "SSH-2.0-OpenSSH_9.3" {
		t.Fatalf("expected SshBanner second, got %q", got)
	}

	b.SshBanner = ""
	if got := selectDeepBannerString(b); got != "RTSP/1.0 Cam" {
		t.Fatalf("expected RtspServer third, got %q", got)
	}

	b.RtspServer = ""
	if got := selectDeepBannerString(b); got != "Router Admin" {
		t.Fatalf("expected HtmlTitle fourth, got %q", got)
	}

	b.HtmlTitle = ""
	if got := selectDeepBannerString(b); got != "" {
		t.Fatalf("expected empty string when all banner fields empty, got %q", got)
	}
}

func TestParseOUIDataAndLookupDetailed(t *testing.T) {
	raw := "" +
		"# comment line\r\n" +
		"00-11-22   (hex)\t\tTest IEEE Vendor\r\n" +
		"AA:BB:CC/28\tShort\tMask28 Vendor\r\n" +
		"DD-EE-FF-11-22-33/36\tShort36\tMask36 Vendor\r\n" +
		"04:25:E8,Comma Vendor\r\n"

	m := make(map[string]string)
	parseOUIData(raw, m)
	provider := &MapOUIProvider{data: m}

	d1 := provider.LookupDetailed("00:11:22:33:44:55")
	if d1.Vendor != "Test IEEE Vendor" || d1.BlockType != "MA-L" || d1.IsRandomized {
		t.Fatalf("unexpected MA-L lookup result: %+v", d1)
	}

	d2 := provider.LookupDetailed("DD:EE:FF:11:29:AA")
	if d2.Vendor != "Mask36 Vendor" || d2.BlockType != "MA-S" {
		t.Fatalf("unexpected MA-S lookup result: %+v", d2)
	}

	d3 := provider.LookupDetailed("04-25-E8-99-AA-BB")
	if d3.Vendor != "Comma Vendor" || d3.BlockType != "MA-L" {
		t.Fatalf("unexpected CSV lookup result: %+v", d3)
	}

	dLAA := provider.LookupDetailed("02:11:22:33:44:55")
	if !dLAA.IsRandomized || dLAA.BlockType != "LAA" {
		t.Fatalf("expected randomized LAA detection, got %+v", dLAA)
	}

	dVM := provider.LookupDetailed("52:54:00:12:34:56")
	if dVM.BlockType != "LAA-VM" || dVM.IsRandomized {
		t.Fatalf("expected LAA-VM detection for QEMU/KVM MAC, got %+v", dVM)
	}
}

func TestSendWakeOnLanRejectsInvalidMac(t *testing.T) {
	if _, err := sendWakeOnLan("INVALID", "192.168.0.10"); err == nil {
		t.Fatalf("expected error for invalid MAC address")
	}
}

func TestEvaluateSweepAnomalies(t *testing.T) {
	trusted := map[string]bool{
		"AA:BB:CC:11:22:33": true,
		"192.168.0.1":       true,
	}
	prevOnline := map[string]observedHostSnapshot{
		"192.168.0.1":  {IP: "192.168.0.1", MAC: "AA:BB:CC:11:22:33"},
		"192.168.0.10": {IP: "192.168.0.10", MAC: "00:11:22:33:44:55"},
		"192.168.0.11": {IP: "192.168.0.11", MAC: "00:11:22:33:44:56"},
		"192.168.0.12": {IP: "192.168.0.12", MAC: "00:11:22:33:44:57"},
	}
	currentOnline := map[string]observedHostSnapshot{
		"192.168.0.1":  {IP: "192.168.0.1", MAC: "AA:BB:CC:11:22:99"}, // IP conflict / MAC swap
		"192.168.0.99": {IP: "192.168.0.99", MAC: "DE:AD:BE:EF:00:01"}, // Untrusted intruder
	}
	policy := defaultTrayAlertPolicy()

	intruders, conflicts, offlineCount, offlinePct := evaluateSweepAnomalies(currentOnline, prevOnline, trusted, policy)
	if len(intruders) != 1 || intruders[0].IP != "192.168.0.99" {
		t.Fatalf("expected 1 intruder 192.168.0.99, got %+v", intruders)
	}
	if len(conflicts) != 1 {
		t.Fatalf("expected 1 IP/MAC conflict, got %+v", conflicts)
	}
	if offlineCount != 3 || offlinePct != 75 {
		t.Fatalf("expected 3 offline (75%%), got %d (%d%%)", offlineCount, offlinePct)
	}
}

func TestTrayDedupCooldownAndQuietHours(t *testing.T) {
	mgr := &trayManager{
		policy:             defaultTrayAlertPolicy(),
		trustedKeys:        make(map[string]bool),
		dedupCache:         make(map[string]int64),
		lastObservedOnline: make(map[string]observedHostSnapshot),
	}
	t0 := time.Date(2026, 11, 18, 14, 0, 0, 0, time.UTC)

	_, notified1 := mgr.recordAndEvaluateEvent("intruder", "critical", "intruder:AA:BB", "Title", "Body", "192.168.0.50", "AA:BB", "go_daemon", t0)
	if !notified1 {
		t.Fatalf("expected first event to notify")
	}

	rec2, notified2 := mgr.recordAndEvaluateEvent("intruder", "critical", "intruder:AA:BB", "Title", "Body", "192.168.0.50", "AA:BB", "go_daemon", t0.Add(2*time.Minute))
	if notified2 || rec2.SuppressedBy != "cooldown" {
		t.Fatalf("expected second event within 5m to be suppressed by cooldown, got notified=%v reason=%q", notified2, rec2.SuppressedBy)
	}

	_, notified3 := mgr.recordAndEvaluateEvent("intruder", "critical", "intruder:AA:BB", "Title", "Body", "192.168.0.50", "AA:BB", "go_daemon", t0.Add(6*time.Minute))
	if !notified3 {
		t.Fatalf("expected third event after cooldown expiry to notify")
	}

	// Overnight quiet hours check (23:00 -> 07:00)
	p := defaultTrayAlertPolicy()
	p.QuietHoursEnabled = true
	p.QuietStart = "23:00"
	p.QuietEnd = "07:00"
	if !isPolicyDndActiveAt(p, time.Date(2026, 11, 18, 23, 30, 0, 0, time.UTC)) {
		t.Fatalf("expected 23:30 to be inside overnight quiet hours")
	}
	if !isPolicyDndActiveAt(p, time.Date(2026, 11, 18, 6, 45, 0, 0, time.UTC)) {
		t.Fatalf("expected 06:45 to be inside overnight quiet hours")
	}
	if isPolicyDndActiveAt(p, time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)) {
		t.Fatalf("expected 12:00 to be outside overnight quiet hours")
	}
}
