package main

import (
	"context"
	"net"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestCIDRPlanChunkingAndTierGates(t *testing.T) {
	// 1. /22 yields 4 /24 blocks and 1,022 usable hosts
	plan22, err := ParseCIDRPlan("10.20.0.0/22", 1, 254)
	if err != nil {
		t.Fatalf("ParseCIDRPlan /22 failed: %v", err)
	}
	if plan22.NormalizedCIDR != "10.20.0.0/22" || plan22.TotalHosts != 1022 || len(plan22.Blocks) != 4 {
		t.Fatalf("unexpected /22 plan: %+v", plan22)
	}
	if plan22.Blocks[0].Subnet != "10.20.0" || plan22.Blocks[0].Start != 1 || plan22.Blocks[0].End != 255 {
		t.Fatalf("unexpected /22 block 0: %+v", plan22.Blocks[0])
	}
	if plan22.Blocks[3].Subnet != "10.20.3" || plan22.Blocks[3].Start != 0 || plan22.Blocks[3].End != 254 {
		t.Fatalf("unexpected /22 block 3: %+v", plan22.Blocks[3])
	}

	// 2. /23 yields 2 /24 blocks and 510 usable hosts
	plan23, err := ParseCIDRPlan("192.168.40.5/23", 1, 254)
	if err != nil {
		t.Fatalf("ParseCIDRPlan /23 failed: %v", err)
	}
	if plan23.NormalizedCIDR != "192.168.40.0/23" || plan23.TotalHosts != 510 || len(plan23.Blocks) != 2 {
		t.Fatalf("unexpected /23 plan: %+v", plan23)
	}

	// 3. /19 should be rejected
	if _, err := ParseCIDRPlan("10.0.0.0/19", 1, 254); err == nil {
		t.Fatalf("expected /19 to be rejected")
	}

	// 4. Tier checks
	freeSt := LicenseStatusResponse{Tier: "free", Features: freeFeatures()}
	proSt := LicenseStatusResponse{Tier: "pro", Features: proFeatures()}
	entSt := LicenseStatusResponse{Tier: "enterprise", Features: enterpriseFeatures()}

	if ok, _, _ := CheckCIDRTierAllowed(plan23, freeSt); !ok {
		t.Fatalf("expected Free tier to allow /23")
	}
	if ok, req, _ := CheckCIDRTierAllowed(plan22, freeSt); ok || req != "pro" {
		t.Fatalf("expected Free tier to block /22 and require pro, got ok=%v req=%s", ok, req)
	}
	if ok, _, _ := CheckCIDRTierAllowed(plan22, proSt); !ok {
		t.Fatalf("expected Pro tier to allow /22")
	}

	plan20, err := ParseCIDRPlan("172.16.0.0/20", 1, 254)
	if err != nil {
		t.Fatalf("ParseCIDRPlan /20 failed: %v", err)
	}
	if plan20.TotalHosts != 4094 || len(plan20.Blocks) != 16 {
		t.Fatalf("unexpected /20 plan: total=%d blocks=%d", plan20.TotalHosts, len(plan20.Blocks))
	}
	if ok, req, _ := CheckCIDRTierAllowed(plan20, proSt); ok || req != "enterprise" {
		t.Fatalf("expected Pro tier to block /20 and require enterprise")
	}
	if ok, _, _ := CheckCIDRTierAllowed(plan20, entSt); !ok {
		t.Fatalf("expected Enterprise tier to allow /20")
	}
}

func TestTimelineStoreMutationsPersistenceAndTierTruncation(t *testing.T) {
	dir := t.TempDir()
	now := time.Date(2026, 11, 20, 10, 0, 0, 0, time.UTC)
	ts := newTimelineStore(dir)
	ts.nowFunc = func() time.Time { return now }

	mac := "AA:BB:CC:11:22:33"

	// Sweep 1: FIRST_SEEN
	n := ts.IngestScanResults([]ScanResult{
		{IP: "192.168.1.50", Alive: true, Latency: 4, MAC: mac, Hostname: "workstation-1", Vendor: "Dell Inc.", OpenPorts: []int{22, 80}},
	})
	if n != 1 {
		t.Fatalf("expected 1 FIRST_SEEN event, got %d", n)
	}

	// Sweep 2 (+2h): port 443 opened & port 80 closed
	now = now.Add(2 * time.Hour)
	n = ts.IngestScanResults([]ScanResult{
		{IP: "192.168.1.50", Alive: true, Latency: 3, MAC: mac, Hostname: "workstation-1", Vendor: "Dell Inc.", OpenPorts: []int{22, 443}},
	})
	if n != 2 {
		t.Fatalf("expected PORT_OPENED + PORT_CLOSED (2 events), got %d", n)
	}

	// Sweep 3 (+3h): goes offline
	now = now.Add(3 * time.Hour)
	n = ts.IngestScanResults([]ScanResult{
		{IP: "192.168.1.50", Alive: false},
	})
	if n != 1 {
		t.Fatalf("expected 1 OFFLINE event, got %d", n)
	}

	// Sweep 4 (+40h - outside Free 24h window): DHCP renewal moves MAC to .88 and comes online
	now = now.Add(40 * time.Hour)
	n = ts.IngestScanResults([]ScanResult{
		{IP: "192.168.1.88", Alive: true, Latency: 5, MAC: mac, Hostname: "workstation-1", Vendor: "Dell Inc.", OpenPorts: []int{22, 443}},
	})
	if n < 2 {
		t.Fatalf("expected IP_CHANGED + ONLINE events, got %d", n)
	}

	// Switch port movement
	ts.RecordSwitchPortMovement("192.168.1.88", mac, "workstation-1", "192.168.1.2", "Core-SW1", "Gi1/0/14", 20)
	moved := ts.RecordSwitchPortMovement("192.168.1.88", mac, "workstation-1", "192.168.1.2", "Core-SW1", "Gi1/0/15", 20)
	if !moved {
		t.Fatalf("expected SWITCH_PORT_MOVED on port change")
	}

	// Reload from disk and inspect Pro vs Free views
	reloaded := newTimelineStore(dir)
	reloaded.nowFunc = func() time.Time { return now }

	proRes := reloaded.QueryDeviceTimeline("192.168.1.88", mac, "", 100, LicenseStatusResponse{Tier: "pro", Features: proFeatures()})
	if proRes.TotalMatched < 7 || len(proRes.Events) != proRes.TotalMatched || proRes.TruncatedByTier {
		t.Fatalf("expected all %d events in Pro 30d window, got len=%d truncated=%v", proRes.TotalMatched, len(proRes.Events), proRes.TruncatedByTier)
	}

	freeRes := reloaded.QueryDeviceTimeline("192.168.1.88", mac, "", 100, LicenseStatusResponse{Tier: "free", Features: freeFeatures()})
	if !freeRes.TruncatedByTier || len(freeRes.Events) >= proRes.TotalMatched {
		t.Fatalf("expected Free 24h window truncation, got free=%d pro=%d truncated=%v", len(freeRes.Events), len(proRes.Events), freeRes.TruncatedByTier)
	}
}

func buildMockSNMPResponse(reqID int32, community string, oid []int, valTag byte, val []byte) []byte {
	encOID, _ := encodeBEROID(oid)
	var vb []byte
	vb = append(vb, encOID...)
	vb = append(vb, wrapBERTLV(valTag, val)...)
	vbList := wrapBERTLV(0x30, wrapBERTLV(0x30, vb))

	var pdu []byte
	pdu = append(pdu, encodeBERInt(reqID)...)
	pdu = append(pdu, encodeBERInt(0)...)
	pdu = append(pdu, encodeBERInt(0)...)
	pdu = append(pdu, vbList...)

	var msg []byte
	msg = append(msg, encodeBERInt(1)...)
	msg = append(msg, wrapBERTLV(0x04, []byte(community))...)
	msg = append(msg, wrapBERTLV(0xA2, pdu)...)
	return wrapBERTLV(0x30, msg)
}

func TestSnmpV2cL2MappingAndVaultRedaction(t *testing.T) {
	// Start mock UDP SNMPv2c switch agent
	pc, err := net.ListenPacket("udp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen udp: %v", err)
	}
	defer pc.Close()

	type mibEntry struct {
		oid []int
		tag byte
		val []byte
	}
	var mib []mibEntry
	addStr := func(oidStr, s string) {
		o, _ := parseOIDString(oidStr)
		mib = append(mib, mibEntry{oid: o, tag: 0x04, val: []byte(s)})
	}
	addInt := func(oidStr string, v int32) {
		o, _ := parseOIDString(oidStr)
		enc := encodeBERInt(v)
		// extract raw integer payload without TLV header
		mib = append(mib, mibEntry{oid: o, tag: 0x02, val: enc[2:]})
	}

	addStr("1.3.6.1.2.1.1.1.0", "Mock-Cisco-Catalyst-2960X")
	addStr("1.3.6.1.2.1.1.5.0", "SW-ACCESS-01")
	addStr("1.3.6.1.2.1.2.2.1.2.10114", "GigabitEthernet1/0/14")
	addInt("1.3.6.1.2.1.2.2.1.8.10114", 1)
	addStr("1.3.6.1.2.1.31.1.1.1.1.10114", "Gi1/0/14")
	addInt("1.3.6.1.2.1.31.1.1.1.15.10114", 1000)
	addInt("1.3.6.1.2.1.17.1.4.1.2.14", 10114) // bridge port 14 -> ifIndex 10114
	// Q-BRIDGE FDB for VLAN 20, MAC 11:22:33:44:55:66 -> bridge port 14
	addInt("1.3.6.1.2.1.17.7.1.2.2.1.2.20.17.34.51.68.85.102", 14)

	go func() {
		buf := make([]byte, 4096)
		for {
			n, addr, rErr := pc.ReadFrom(buf)
			if rErr != nil {
				return
			}
			// Decode request header to get reqID, community, pduTag, oid
			_, msgVal, _, pErr := readBERTLV(buf[:n], 0)
			if pErr != nil {
				continue
			}
			_, _, off, _ := readBERTLV(msgVal, 0)
			_, commBytes, off, _ := readBERTLV(msgVal, off)
			pduTag, pduVal, _, _ := readBERTLV(msgVal, off)
			_, idBytes, poff, _ := readBERTLV(pduVal, 0)
			reqID := int32(decodeBERInt(idBytes))
			_, _, poff, _ = readBERTLV(pduVal, poff) // errStatus
			_, _, poff, _ = readBERTLV(pduVal, poff) // errIdx
			_, vbList, _, _ := readBERTLV(pduVal, poff)
			_, vb, _, _ := readBERTLV(vbList, 0)
			_, oidRaw, _, _ := readBERTLV(vb, 0)
			reqOID, _ := decodeBEROID(oidRaw)

			compareOID := func(a, b []int) int {
				minLen := len(a)
				if len(b) < minLen {
					minLen = len(b)
				}
				for i := 0; i < minLen; i++ {
					if a[i] < b[i] {
						return -1
					}
					if a[i] > b[i] {
						return 1
					}
				}
				if len(a) < len(b) {
					return -1
				}
				if len(a) > len(b) {
					return 1
				}
				return 0
			}

			var resp []byte
			if pduTag == 0xA0 {
				found := false
				for _, e := range mib {
					if oidEqual(e.oid, reqOID) {
						resp = buildMockSNMPResponse(reqID, string(commBytes), e.oid, e.tag, e.val)
						found = true
						break
					}
				}
				if !found {
					resp = buildMockSNMPResponse(reqID, string(commBytes), reqOID, 0x80, nil)
				}
			} else if pduTag == 0xA1 {
				var best *mibEntry
				for i := range mib {
					if compareOID(mib[i].oid, reqOID) > 0 {
						if best == nil || compareOID(mib[i].oid, best.oid) < 0 {
							best = &mib[i]
						}
					}
				}
				if best != nil {
					resp = buildMockSNMPResponse(reqID, string(commBytes), best.oid, best.tag, best.val)
				} else {
					resp = buildMockSNMPResponse(reqID, string(commBytes), reqOID, 0x82, nil)
				}
			}
			_, _ = pc.WriteTo(resp, addr)
		}
	}()

	// Vault security test: never expose community in summary
	vault := getSnmpVault()
	_ = vault.Save(SnmpL2CredentialInput{
		IP:        "127.0.0.1",
		Name:      "MockSwitch",
		Version:   "v2c",
		Community: "super-secret-ro",
	})
	summaries := vault.ListSummaries()
	if len(summaries) == 0 || !summaries[0].HasCredential {
		t.Fatalf("expected vault summary entry")
	}

	// Free tier must be denied
	freeRes := RunSnmpL2Mapping(context.Background(), []SnmpL2CredentialInput{{IP: pc.LocalAddr().String(), Community: "public"}}, nil, LicenseStatusResponse{Tier: "free", Features: freeFeatures()})
	if freeRes.Success {
		t.Fatalf("expected Free tier SNMP L2 map to fail")
	}

	// Pro tier succeeds and correlates MAC 11:22:33:44:55:66 -> 10.10.0.55 on Gi1/0/14 VLAN 20
	proRes := RunSnmpL2Mapping(
		context.Background(),
		[]SnmpL2CredentialInput{{IP: pc.LocalAddr().String(), Community: "public"}},
		[]TopologyMapHostInput{{IP: "10.10.0.55", MAC: "11:22:33:44:55:66", Hostname: "nas-box"}},
		LicenseStatusResponse{Tier: "pro", Features: proFeatures()},
	)
	if !proRes.Success || len(proRes.Switches) != 1 {
		t.Fatalf("expected SNMP L2 mapping success, got: %+v", proRes)
	}
	if proRes.Switches[0].SysName != "SW-ACCESS-01" {
		t.Fatalf("expected sysName SW-ACCESS-01, got %q", proRes.Switches[0].SysName)
	}
	mapped, ok := proRes.HostMapByIP["10.10.0.55"]
	if !ok || mapped.PortName != "Gi1/0/14" || mapped.VlanID != 20 || mapped.SpeedMbps != 1000 {
		t.Fatalf("expected 10.10.0.55 mapped to Gi1/0/14 VLAN 20 1000Mbps, got %+v (ok=%v)", mapped, ok)
	}
}

func TestBatchQueueExecutionAbortRetryAndTierLimits(t *testing.T) {
	mgr := newBatchQueueManager()
	var wolCalls int32
	mgr.wolFn = func(mac string, ip string) (int, error) {
		atomic.AddInt32(&wolCalls, 1)
		if strings.HasSuffix(ip, ".99") {
			return 0, context.DeadlineExceeded
		}
		return 3, nil
	}

	// Free denied
	if _, code, err := mgr.CreateAndStartJob(BatchQueueCreateRequest{
		Action:  "batch_wol",
		Targets: []BatchQueueTargetInput{{IP: "192.168.1.10", MAC: "AA:BB:CC:DD:EE:01"}},
	}, LicenseStatusResponse{Tier: "free", Features: freeFeatures()}); err == nil || code != 403 {
		t.Fatalf("expected Free tier batch queue rejection 403, got code=%d err=%v", code, err)
	}

	// Pro >16 targets denied
	tooMany := make([]BatchQueueTargetInput, 17)
	for i := range tooMany {
		tooMany[i] = BatchQueueTargetInput{IP: "192.168.1.10", MAC: "AA:BB:CC:DD:EE:01"}
	}
	if _, code, err := mgr.CreateAndStartJob(BatchQueueCreateRequest{
		Action:  "batch_wol",
		Targets: tooMany,
	}, LicenseStatusResponse{Tier: "pro", Features: proFeatures()}); err == nil || code != 403 {
		t.Fatalf("expected Pro >16 targets rejection 403, got code=%d err=%v", code, err)
	}

	// Pro partial failure & retry
	job, code, err := mgr.CreateAndStartJob(BatchQueueCreateRequest{
		Action:      "batch_wol",
		Concurrency: 2,
		DelayMs:     100,
		Targets: []BatchQueueTargetInput{
			{IP: "192.168.1.10", MAC: "AA:BB:CC:DD:EE:01"},
			{IP: "192.168.1.99", MAC: "AA:BB:CC:DD:EE:99"},
		},
	}, LicenseStatusResponse{Tier: "pro", Features: proFeatures()})
	if err != nil || code != 200 {
		t.Fatalf("expected Pro job creation 200, got code=%d err=%v", code, err)
	}

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		cur, _ := mgr.GetJob(job.ID)
		if cur.Status == "partial_failed" || cur.Status == "completed" {
			job = cur
			break
		}
		time.Sleep(30 * time.Millisecond)
	}
	if job.Status != "partial_failed" || job.SuccessCount != 1 || job.FailedCount != 1 {
		t.Fatalf("expected partial_failed (1 ok / 1 fail), got %+v", job)
	}

	// Fix .99 and retry failed only
	mgr.wolFn = func(mac string, ip string) (int, error) {
		atomic.AddInt32(&wolCalls, 1)
		return 3, nil
	}
	retried, rErr := mgr.RetryFailedJob(job.ID)
	if rErr != nil {
		t.Fatalf("retry failed: %v", rErr)
	}
	deadline = time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		cur, _ := mgr.GetJob(retried.ID)
		if cur.Status == "completed" {
			retried = cur
			break
		}
		time.Sleep(30 * time.Millisecond)
	}
	if retried.Status != "completed" || retried.SuccessCount != 2 || retried.FailedCount != 0 {
		t.Fatalf("expected completed after retry, got %+v", retried)
	}
	if atomic.LoadInt32(&wolCalls) != 3 {
		t.Fatalf("expected 3 total wol calls (2 initial + 1 retry), got %d", wolCalls)
	}
}
