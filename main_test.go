package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestBuildTopologyGraphResponse(t *testing.T) {
	if _, ok := buildTopologyGraphResponse("{invalid"); ok {
		t.Fatalf("expected invalid JSON to return ok=false")
	}

	payload := `{
		"subnet": "10.20.30",
		"vlanTag": "VLAN 30",
		"current": [
			{"ip": "10.20.30.251", "mac": "00:11:22:33:44:01", "hostname": "switch-vip", "vendor": "Cisco", "isProxyArp": true},
			{"ip": "10.20.30.50", "mac": "52:54:00:11:22:33", "hostname": "kvm-node", "vendor": "QEMU"},
			{"ip": "10.20.30.88", "mac": "AA:BB:CC:DD:EE:FF", "hostname": "rogue-pc", "isConflict": true}
		],
		"baseline": [
			{"ip": "10.20.30.50", "mac": "52:54:00:11:22:33", "hostname": "kvm-node", "vendor": "QEMU"}
		]
	}`
	resp, ok := buildTopologyGraphResponse(payload)
	if !ok {
		t.Fatalf("expected valid topology payload to succeed")
	}
	if resp["gatewayIp"] != "10.20.30.1" {
		t.Fatalf("expected inferred gateway 10.20.30.1, got %v", resp["gatewayIp"])
	}
	nodes, ok := resp["nodes"].([]TopologyNodeDTO)
	if !ok || len(nodes) != 4 {
		t.Fatalf("expected 4 nodes (1 inferred gateway + 3 hosts), got %d", len(nodes))
	}
	tierByIP := map[string]string{}
	for _, n := range nodes {
		tierByIP[n.IP] = n.Tier
	}
	if tierByIP["10.20.30.1"] != "gateway" || tierByIP["10.20.30.251"] != "infra" || tierByIP["10.20.30.50"] != "vm" || tierByIP["10.20.30.88"] != "endpoint" {
		t.Fatalf("unexpected tier assignments: %+v", tierByIP)
	}
	edges, ok := resp["edges"].([]TopologyEdgeDTO)
	if !ok || len(edges) != 3 {
		t.Fatalf("expected 3 edges, got %d", len(edges))
	}
	relByIP := map[string]string{}
	for _, e := range edges {
		relByIP[e.ToIP] = e.Relation
	}
	if relByIP["10.20.30.251"] != "proxy_arp_alias" || relByIP["10.20.30.88"] != "conflict_alert" || relByIP["10.20.30.50"] != "uplink" {
		t.Fatalf("unexpected edge relations: %+v", relByIP)
	}
}

func TestDiscoverLocalSubnetCandidates(t *testing.T) {
	cands := discoverLocalSubnetCandidates()
	if cands == nil {
		t.Fatalf("expected non-nil candidate slice")
	}
	for _, c := range cands {
		if c.Subnet == "" || c.Start < 0 || c.End > 255 || c.Start > c.End {
			t.Fatalf("invalid discovered subnet candidate: %+v", c)
		}
	}
}

func TestCloseToTrayAPIHardening(t *testing.T) {
	closeToTrayMutex.Lock()
	orig := closeToTrayEnabled
	closeToTrayEnabled = false
	closeToTrayMutex.Unlock()
	defer func() {
		closeToTrayMutex.Lock()
		closeToTrayEnabled = orig
		closeToTrayMutex.Unlock()
	}()

	// Reject unsupported methods
	reqDel := httptest.NewRequest(http.MethodDelete, "/api/close-to-tray", nil)
	recDel := httptest.NewRecorder()
	handleCloseToTrayAPI(recDel, reqDel)
	if recDel.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for DELETE /api/close-to-tray, got %d", recDel.Code)
	}

	// Reject malformed JSON without silently flipping closeToTrayEnabled to true
	reqBad := httptest.NewRequest(http.MethodPost, "/api/close-to-tray", strings.NewReader(`{"enabled":`))
	recBad := httptest.NewRecorder()
	handleCloseToTrayAPI(recBad, reqBad)
	if recBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for malformed JSON, got %d", recBad.Code)
	}
	closeToTrayMutex.RLock()
	stillFalse := closeToTrayEnabled
	closeToTrayMutex.RUnlock()
	if stillFalse {
		t.Fatalf("malformed POST silently enabled closeToTrayEnabled")
	}

	// Reject invalid query value
	reqInvalidQ := httptest.NewRequest(http.MethodPost, "/api/close-to-tray?enabled=maybe", nil)
	recInvalidQ := httptest.NewRecorder()
	handleCloseToTrayAPI(recInvalidQ, reqInvalidQ)
	if recInvalidQ.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid query param, got %d", recInvalidQ.Code)
	}

	// Accept valid JSON boolean
	reqOk := httptest.NewRequest(http.MethodPost, "/api/close-to-tray", strings.NewReader(`{"enabled":true}`))
	recOk := httptest.NewRecorder()
	handleCloseToTrayAPI(recOk, reqOk)
	if recOk.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid JSON, got %d", recOk.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(recOk.Body.Bytes(), &body); err != nil || body["enabled"] != true {
		t.Fatalf("unexpected response body: %s (err=%v)", recOk.Body.String(), err)
	}
}

func TestValidateOUIAPIHardening(t *testing.T) {
	reqGetSave := httptest.NewRequest(http.MethodGet, "/api/oui/validate-dll?save=true", nil)
	recGetSave := httptest.NewRecorder()
	handleValidateOUIAPI(recGetSave, reqGetSave)
	if recGetSave.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET ?save=true even in fallback mode, got %d", recGetSave.Code)
	}

	reqPut := httptest.NewRequest(http.MethodPut, "/api/oui/validate-dll", nil)
	recPut := httptest.NewRecorder()
	handleValidateOUIAPI(recPut, reqPut)
	if recPut.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for PUT /api/oui/validate-dll, got %d", recPut.Code)
	}
}

func TestWolAPIHardening(t *testing.T) {
	reqGet := httptest.NewRequest(http.MethodGet, "/api/wol?mac=AA:BB:CC:DD:EE:FF", nil)
	recGet := httptest.NewRecorder()
	handleWolAPI(recGet, reqGet)
	if recGet.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET /api/wol, got %d", recGet.Code)
	}

	reqBadJson := httptest.NewRequest(http.MethodPost, "/api/wol", strings.NewReader(`{"mac":`))
	recBadJson := httptest.NewRecorder()
	handleWolAPI(recBadJson, reqBadJson)
	if recBadJson.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for malformed JSON on POST /api/wol, got %d", recBadJson.Code)
	}
}

func TestInfoAndNativeModulesMethodGuards(t *testing.T) {
	reqInfoPost := httptest.NewRequest(http.MethodPost, "/api/info", nil)
	recInfoPost := httptest.NewRecorder()
	handleInfoAPI(recInfoPost, reqInfoPost)
	if recInfoPost.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for POST /api/info, got %d", recInfoPost.Code)
	}

	reqNativePost := httptest.NewRequest(http.MethodPost, "/api/native-modules", nil)
	recNativePost := httptest.NewRecorder()
	handleNativeModulesAPI(recNativePost, reqNativePost)
	if recNativePost.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for POST /api/native-modules, got %d", recNativePost.Code)
	}
}


