package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type TimelineEventType string

const (
	EventFirstSeen           TimelineEventType = "FIRST_SEEN"
	EventOnline              TimelineEventType = "ONLINE"
	EventOffline             TimelineEventType = "OFFLINE"
	EventIPChanged           TimelineEventType = "IP_CHANGED"
	EventPortOpened          TimelineEventType = "PORT_OPENED"
	EventPortClosed          TimelineEventType = "PORT_CLOSED"
	EventVendorOrHostUpdated TimelineEventType = "VENDOR_OR_HOST_UPDATED"
	EventSwitchPortMoved     TimelineEventType = "SWITCH_PORT_MOVED"
)

type TimelineEvent struct {
	ID          string                 `json:"id"`
	TimestampMs int64                  `json:"timestampMs"`
	DeviceKey   string                 `json:"deviceKey"`
	IP          string                 `json:"ip"`
	PreviousIP  string                 `json:"previousIp,omitempty"`
	MAC         string                 `json:"mac,omitempty"`
	Hostname    string                 `json:"hostname,omitempty"`
	Vendor      string                 `json:"vendor,omitempty"`
	EventType   TimelineEventType      `json:"eventType"`
	Summary     string                 `json:"summary"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

type DeviceTimelineState struct {
	DeviceKey      string `json:"deviceKey"`
	LastIP         string `json:"lastIp"`
	LastMAC        string `json:"lastMac,omitempty"`
	LastHostname   string `json:"lastHostname,omitempty"`
	LastVendor     string `json:"lastVendor,omitempty"`
	LastPorts      []int  `json:"lastPorts,omitempty"`
	LastSwitchIP   string `json:"lastSwitchIp,omitempty"`
	LastSwitchName string `json:"lastSwitchName,omitempty"`
	LastSwitchPort string `json:"lastSwitchPort,omitempty"`
	LastOnline     bool   `json:"lastOnline"`
	FirstSeenMs    int64  `json:"firstSeenMs"`
	LastSeenMs     int64  `json:"lastSeenMs"`
	LastUpdatedMs  int64  `json:"lastUpdatedMs"`
}

type timelineStateSnapshotFile struct {
	Devices     map[string]*DeviceTimelineState `json:"devices"`
	IPToLastKey map[string]string               `json:"ipToLastKey"`
}

type DeviceTimelineResponse struct {
	Success         bool            `json:"success"`
	DeviceKey       string          `json:"deviceKey"`
	IP              string          `json:"ip,omitempty"`
	MAC             string          `json:"mac,omitempty"`
	Tier            string          `json:"tier"`
	RetentionDays   int             `json:"retentionDays"`
	TruncatedByTier bool            `json:"truncatedByTier"`
	TotalMatched    int             `json:"totalMatched"`
	Events          []TimelineEvent `json:"events"`
}

type TimelineStore struct {
	mu          sync.RWMutex
	storageDir  string
	devices     map[string]*DeviceTimelineState
	ipToLastKey map[string]string
	events      []TimelineEvent
	nowFunc     func() time.Time
}

var (
	defaultTimelineStore     *TimelineStore
	defaultTimelineStoreOnce sync.Once
)

func getTimelineStore() *TimelineStore {
	defaultTimelineStoreOnce.Do(func() {
		defaultTimelineStore = newTimelineStore(resolveDefaultLicenseStorageDir())
	})
	return defaultTimelineStore
}

func newTimelineStore(dir string) *TimelineStore {
	ts := &TimelineStore{
		storageDir:  dir,
		devices:     make(map[string]*DeviceTimelineState),
		ipToLastKey: make(map[string]string),
		events:      make([]TimelineEvent, 0, 256),
		nowFunc:     func() time.Time { return time.Now().UTC() },
	}
	ts.loadFromDisk()
	return ts
}

func (ts *TimelineStore) stateFilePath() string {
	return filepath.Join(ts.storageDir, "timeline_state.json")
}

func (ts *TimelineStore) eventsFilePath() string {
	return filepath.Join(ts.storageDir, "timeline_events.jsonl")
}

func normalizeTimelineMac(mac string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(strings.TrimSpace(mac)) {
		if (r >= '0' && r <= '9') || (r >= 'A' && r <= 'F') {
			b.WriteRune(r)
		}
	}
	clean := b.String()
	if len(clean) != 12 || clean == "000000000000" || clean == "FFFFFFFFFFFF" {
		return ""
	}
	return fmt.Sprintf("%s:%s:%s:%s:%s:%s",
		clean[0:2], clean[2:4], clean[4:6], clean[6:8], clean[8:10], clean[10:12])
}

func resolveDeviceIdentityKey(ip string, mac string) string {
	normMac := normalizeTimelineMac(mac)
	if normMac != "" {
		return "MAC:" + normMac
	}
	return "IP:" + strings.TrimSpace(ip)
}

func newTimelineEventID(nowMs int64) string {
	var rnd [4]byte
	_, _ = rand.Read(rnd[:])
	return fmt.Sprintf("evt_%d_%s", nowMs, hex.EncodeToString(rnd[:]))
}

func sortedIntCopy(in []int) []int {
	if len(in) == 0 {
		return nil
	}
	seen := make(map[int]bool, len(in))
	out := make([]int, 0, len(in))
	for _, v := range in {
		if v > 0 && v <= 65535 && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	sort.Ints(out)
	return out
}

func diffIntSets(prev []int, cur []int) (added []int, removed []int) {
	pMap := make(map[int]bool, len(prev))
	cMap := make(map[int]bool, len(cur))
	for _, p := range prev {
		pMap[p] = true
	}
	for _, c := range cur {
		cMap[c] = true
		if !pMap[c] {
			added = append(added, c)
		}
	}
	for _, p := range prev {
		if !cMap[p] {
			removed = append(removed, p)
		}
	}
	sort.Ints(added)
	sort.Ints(removed)
	return added, removed
}

func (ts *TimelineStore) loadFromDisk() {
	if b, err := os.ReadFile(ts.stateFilePath()); err == nil && len(b) > 0 {
		var snap timelineStateSnapshotFile
		if json.Unmarshal(b, &snap) == nil {
			if snap.Devices != nil {
				ts.devices = snap.Devices
			}
			if snap.IPToLastKey != nil {
				ts.ipToLastKey = snap.IPToLastKey
			}
		}
	}
	f, err := os.Open(ts.eventsFilePath())
	if err != nil {
		return
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var ev TimelineEvent
		if json.Unmarshal([]byte(line), &ev) == nil && ev.EventType != "" {
			ts.events = append(ts.events, ev)
		}
	}
}

func (ts *TimelineStore) persistLocked(newEvents []TimelineEvent) {
	if ts.storageDir == "" {
		return
	}
	_ = os.MkdirAll(ts.storageDir, 0755)
	if len(newEvents) > 0 {
		if f, err := os.OpenFile(ts.eventsFilePath(), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600); err == nil {
			for _, ev := range newEvents {
				if line, mErr := json.Marshal(ev); mErr == nil {
					_, _ = f.Write(append(line, '\n'))
				}
			}
			_ = f.Close()
		}
	}
	snap := timelineStateSnapshotFile{
		Devices:     ts.devices,
		IPToLastKey: ts.ipToLastKey,
	}
	if out, err := json.Marshal(snap); err == nil {
		_ = os.WriteFile(ts.stateFilePath(), out, 0600)
	}
}

func (ts *TimelineStore) rewriteEventsFileLocked() error {
	if ts.storageDir == "" {
		return nil
	}
	_ = os.MkdirAll(ts.storageDir, 0755)
	tmpPath := ts.eventsFilePath() + ".tmp"
	f, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	for _, ev := range ts.events {
		if line, mErr := json.Marshal(ev); mErr == nil {
			_, _ = f.Write(append(line, '\n'))
		}
	}
	_ = f.Close()
	return os.Rename(tmpPath, ts.eventsFilePath())
}

// IngestScanResults ingests alive and inactive ScanResults, emitting mutation events for state changes.
func (ts *TimelineStore) IngestScanResults(results []ScanResult) int {
	if len(results) == 0 {
		return 0
	}
	ts.mu.Lock()
	defer ts.mu.Unlock()

	nowMs := ts.nowFunc().UnixMilli()
	var emitted []TimelineEvent

	for _, r := range results {
		ip := strings.TrimSpace(r.IP)
		if ip == "" {
			continue
		}
		normMac := normalizeTimelineMac(r.MAC)

		if !r.Alive {
			// Check if we knew an online device at this IP
			if key, ok := ts.ipToLastKey[ip]; ok {
				if st, exists := ts.devices[key]; exists && st.LastOnline && st.LastIP == ip {
					st.LastOnline = false
					st.LastUpdatedMs = nowMs
					ev := TimelineEvent{
						ID:          newTimelineEventID(nowMs),
						TimestampMs: nowMs,
						DeviceKey:   key,
						IP:          ip,
						MAC:         st.LastMAC,
						Hostname:    st.LastHostname,
						Vendor:      st.LastVendor,
						EventType:   EventOffline,
						Summary:     fmt.Sprintf("%s 응답 없음 (Offline 전환)", ip),
					}
					emitted = append(emitted, ev)
				}
			}
			continue
		}

		// Host is alive
		key := resolveDeviceIdentityKey(ip, normMac)
		// If device previously tracked under IP-only key and now we got its MAC, migrate state smoothly
		if normMac != "" {
			if _, hasMacKey := ts.devices[key]; !hasMacKey {
				if prevIPState, hasLegacyIP := ts.devices["IP:"+ip]; hasLegacyIP {
					prevIPState.DeviceKey = key
					prevIPState.LastMAC = normMac
					ts.devices[key] = prevIPState
					delete(ts.devices, "IP:"+ip)
				}
			}
		}

		bestVendor := strings.TrimSpace(r.RealVendor)
		if bestVendor == "" {
			bestVendor = strings.TrimSpace(r.Vendor)
		}
		curHostname := strings.TrimSpace(r.Hostname)
		curPorts := sortedIntCopy(r.OpenPorts)

		st, exists := ts.devices[key]
		if !exists {
			st = &DeviceTimelineState{
				DeviceKey:     key,
				LastIP:        ip,
				LastMAC:       normMac,
				LastHostname:  curHostname,
				LastVendor:    bestVendor,
				LastPorts:     curPorts,
				LastOnline:    true,
				FirstSeenMs:   nowMs,
				LastSeenMs:    nowMs,
				LastUpdatedMs: nowMs,
			}
			ts.devices[key] = st
			ts.ipToLastKey[ip] = key
			ev := TimelineEvent{
				ID:          newTimelineEventID(nowMs),
				TimestampMs: nowMs,
				DeviceKey:   key,
				IP:          ip,
				MAC:         normMac,
				Hostname:    curHostname,
				Vendor:      bestVendor,
				EventType:   EventFirstSeen,
				Summary:     fmt.Sprintf("최초 발견 (%s · 포트 %d개)", ip, len(curPorts)),
				Details: map[string]interface{}{
					"openPorts": curPorts,
					"latencyMs": r.Latency,
				},
			}
			emitted = append(emitted, ev)
			continue
		}

		// Existing known device: detect mutations
		if st.LastIP != "" && st.LastIP != ip {
			prevIP := st.LastIP
			st.LastIP = ip
			emitted = append(emitted, TimelineEvent{
				ID:          newTimelineEventID(nowMs),
				TimestampMs: nowMs,
				DeviceKey:   key,
				IP:          ip,
				PreviousIP:  prevIP,
				MAC:         normMac,
				Hostname:    curHostname,
				Vendor:      bestVendor,
				EventType:   EventIPChanged,
				Summary:     fmt.Sprintf("IP 주소 변경 감지: %s → %s", prevIP, ip),
				Details: map[string]interface{}{
					"previousIp": prevIP,
					"newIp":      ip,
				},
			})
		}
		ts.ipToLastKey[ip] = key

		if !st.LastOnline {
			st.LastOnline = true
			emitted = append(emitted, TimelineEvent{
				ID:          newTimelineEventID(nowMs),
				TimestampMs: nowMs,
				DeviceKey:   key,
				IP:          ip,
				MAC:         normMac,
				Hostname:    curHostname,
				Vendor:      bestVendor,
				EventType:   EventOnline,
				Summary:     fmt.Sprintf("%s 온라인 복귀 (RTT %dms)", ip, r.Latency),
				Details: map[string]interface{}{
					"latencyMs": r.Latency,
				},
			})
		}

		// Compare ports only if we actually scanned ports (>0) or had previous ports and scanned deeply
		if len(curPorts) > 0 || len(st.LastPorts) > 0 {
			// Guard against quick scans wiping deep-scan port history unless deep ports were found or non-empty
			if len(curPorts) > 0 {
				added, removed := diffIntSets(st.LastPorts, curPorts)
				if len(added) > 0 {
					emitted = append(emitted, TimelineEvent{
						ID:          newTimelineEventID(nowMs),
						TimestampMs: nowMs,
						DeviceKey:   key,
						IP:          ip,
						MAC:         normMac,
						Hostname:    curHostname,
						Vendor:      bestVendor,
						EventType:   EventPortOpened,
						Summary:     fmt.Sprintf("신규 개방 포트 감지: %v", added),
						Details: map[string]interface{}{
							"portsAdded": added,
							"allPorts":   curPorts,
						},
					})
				}
				if len(removed) > 0 {
					emitted = append(emitted, TimelineEvent{
						ID:          newTimelineEventID(nowMs),
						TimestampMs: nowMs,
						DeviceKey:   key,
						IP:          ip,
						MAC:         normMac,
						Hostname:    curHostname,
						Vendor:      bestVendor,
						EventType:   EventPortClosed,
						Summary:     fmt.Sprintf("기존 포트 닫힘 감지: %v", removed),
						Details: map[string]interface{}{
							"portsRemoved": removed,
							"allPorts":     curPorts,
						},
					})
				}
				st.LastPorts = curPorts
			}
		}

		hostChanged := curHostname != "" && curHostname != "Unknown" && st.LastHostname != "" && curHostname != st.LastHostname
		vendorChanged := bestVendor != "" && bestVendor != "Unknown" && bestVendor != "Unknown Vendor" && st.LastVendor != "" && bestVendor != st.LastVendor
		if hostChanged || vendorChanged {
			prevHost := st.LastHostname
			prevVendor := st.LastVendor
			if curHostname != "" && curHostname != "Unknown" {
				st.LastHostname = curHostname
			}
			if bestVendor != "" && bestVendor != "Unknown" && bestVendor != "Unknown Vendor" {
				st.LastVendor = bestVendor
			}
			emitted = append(emitted, TimelineEvent{
				ID:          newTimelineEventID(nowMs),
				TimestampMs: nowMs,
				DeviceKey:   key,
				IP:          ip,
				MAC:         normMac,
				Hostname:    st.LastHostname,
				Vendor:      st.LastVendor,
				EventType:   EventVendorOrHostUpdated,
				Summary:     fmt.Sprintf("식별 정보 변경 (%s → %s)", prevHost, st.LastHostname),
				Details: map[string]interface{}{
					"previousHostname": prevHost,
					"newHostname":      st.LastHostname,
					"previousVendor":   prevVendor,
					"newVendor":        st.LastVendor,
				},
			})
		} else {
			if curHostname != "" && curHostname != "Unknown" && st.LastHostname == "" {
				st.LastHostname = curHostname
			}
			if bestVendor != "" && bestVendor != "Unknown" && bestVendor != "Unknown Vendor" && st.LastVendor == "" {
				st.LastVendor = bestVendor
			}
		}

		if normMac != "" {
			st.LastMAC = normMac
		}
		st.LastSeenMs = nowMs
		st.LastUpdatedMs = nowMs
	}

	if len(emitted) > 0 {
		ts.events = append(ts.events, emitted...)
		ts.persistLocked(emitted)
	} else {
		ts.persistLocked(nil)
	}
	return len(emitted)
}

func (ts *TimelineStore) RecordSwitchPortMovement(ip, mac, hostname, switchIP, switchName, switchPort string, vlanID int) bool {
	if switchIP == "" || switchPort == "" {
		return false
	}
	ts.mu.Lock()
	defer ts.mu.Unlock()

	nowMs := ts.nowFunc().UnixMilli()
	normMac := normalizeTimelineMac(mac)
	key := resolveDeviceIdentityKey(ip, normMac)
	if key == "IP:" && ip == "" {
		return false
	}

	st, exists := ts.devices[key]
	if !exists {
		st = &DeviceTimelineState{
			DeviceKey:      key,
			LastIP:         ip,
			LastMAC:        normMac,
			LastHostname:   hostname,
			LastSwitchIP:   switchIP,
			LastSwitchName: switchName,
			LastSwitchPort: switchPort,
			LastOnline:     true,
			FirstSeenMs:    nowMs,
			LastSeenMs:     nowMs,
			LastUpdatedMs:  nowMs,
		}
		ts.devices[key] = st
		if ip != "" {
			ts.ipToLastKey[ip] = key
		}
		ts.persistLocked(nil)
		return false
	}

	moved := st.LastSwitchPort != "" && (st.LastSwitchIP != switchIP || st.LastSwitchPort != switchPort)
	prevSwitch := st.LastSwitchName
	if prevSwitch == "" {
		prevSwitch = st.LastSwitchIP
	}
	prevPort := st.LastSwitchPort
	st.LastSwitchIP = switchIP
	st.LastSwitchName = switchName
	st.LastSwitchPort = switchPort
	st.LastUpdatedMs = nowMs

	if moved {
		ev := TimelineEvent{
			ID:          newTimelineEventID(nowMs),
			TimestampMs: nowMs,
			DeviceKey:   key,
			IP:          ip,
			MAC:         normMac,
			Hostname:    hostname,
			Vendor:      st.LastVendor,
			EventType:   EventSwitchPortMoved,
			Summary:     fmt.Sprintf("스위치 포트 이동: %s (%s) → %s (%s)", prevSwitch, prevPort, switchName, switchPort),
			Details: map[string]interface{}{
				"previousSwitch": prevSwitch,
				"previousPort":   prevPort,
				"switchIp":       switchIP,
				"switchName":     switchName,
				"switchPort":     switchPort,
				"vlanId":         vlanID,
			},
		}
		ts.events = append(ts.events, ev)
		ts.persistLocked([]TimelineEvent{ev})
		return true
	}
	ts.persistLocked(nil)
	return false
}

func resolveRetentionParams(status LicenseStatusResponse) (retentionDays int, maxFreeEvents int) {
	if status.Tier == "enterprise" {
		return 0, 0
	}
	if status.Tier == "pro" {
		if status.Features.TimelineRetentionDays > 0 {
			return status.Features.TimelineRetentionDays, 0
		}
		return 30, 0
	}
	return 1, 50
}

func (ts *TimelineStore) QueryDeviceTimeline(ip, mac, eventType string, limit int, status LicenseStatusResponse) DeviceTimelineResponse {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	normMac := normalizeTimelineMac(mac)
	trimmedIP := strings.TrimSpace(ip)
	resolvedKey := resolveDeviceIdentityKey(trimmedIP, normMac)
	if normMac == "" && trimmedIP != "" {
		if k, ok := ts.ipToLastKey[trimmedIP]; ok && k != "" {
			resolvedKey = k
		}
	}

	retentionDays, maxFreeEvents := resolveRetentionParams(status)
	nowMs := ts.nowFunc().UnixMilli()
	var cutoffMs int64
	if retentionDays > 0 {
		cutoffMs = nowMs - int64(retentionDays)*24*int64(time.Hour/time.Millisecond)
	}

	typeFilter := strings.ToUpper(strings.TrimSpace(eventType))
	matchedAll := make([]TimelineEvent, 0, 32)
	withinRetention := make([]TimelineEvent, 0, 32)

	for i := len(ts.events) - 1; i >= 0; i-- {
		ev := ts.events[i]
		matches := false
		if normMac != "" && normalizeTimelineMac(ev.MAC) == normMac {
			matches = true
		} else if resolvedKey != "" && ev.DeviceKey == resolvedKey {
			matches = true
		} else if trimmedIP != "" && (ev.IP == trimmedIP || ev.PreviousIP == trimmedIP) {
			matches = true
		}
		if !matches {
			continue
		}
		if typeFilter != "" && typeFilter != "ALL" && string(ev.EventType) != typeFilter {
			continue
		}
		matchedAll = append(matchedAll, ev)
		if cutoffMs == 0 || ev.TimestampMs >= cutoffMs {
			withinRetention = append(withinRetention, ev)
		}
	}

	truncated := len(withinRetention) < len(matchedAll)
	out := withinRetention
	if maxFreeEvents > 0 && len(out) > maxFreeEvents {
		out = out[:maxFreeEvents]
		truncated = true
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}

	return DeviceTimelineResponse{
		Success:         true,
		DeviceKey:       resolvedKey,
		IP:              trimmedIP,
		MAC:             normMac,
		Tier:            status.Tier,
		RetentionDays:   retentionDays,
		TruncatedByTier: truncated,
		TotalMatched:    len(matchedAll),
		Events:          out,
	}
}

func (ts *TimelineStore) QueryRecentEvents(eventType string, limit int, status LicenseStatusResponse) (events []TimelineEvent, totalMatched int, truncated bool) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	retentionDays, maxFreeEvents := resolveRetentionParams(status)
	nowMs := ts.nowFunc().UnixMilli()
	var cutoffMs int64
	if retentionDays > 0 {
		cutoffMs = nowMs - int64(retentionDays)*24*int64(time.Hour/time.Millisecond)
	}

	typeFilter := strings.ToUpper(strings.TrimSpace(eventType))
	var within []TimelineEvent
	for i := len(ts.events) - 1; i >= 0; i-- {
		ev := ts.events[i]
		if typeFilter != "" && typeFilter != "ALL" && string(ev.EventType) != typeFilter {
			continue
		}
		totalMatched++
		if cutoffMs == 0 || ev.TimestampMs >= cutoffMs {
			within = append(within, ev)
		}
	}

	truncated = len(within) < totalMatched
	if maxFreeEvents > 0 && len(within) > maxFreeEvents {
		within = within[:maxFreeEvents]
		truncated = true
	}
	if limit > 0 && len(within) > limit {
		within = within[:limit]
	}
	if within == nil {
		within = []TimelineEvent{}
	}
	return within, totalMatched, truncated
}

func (ts *TimelineStore) PruneEvents(olderThanDays int) (removed int, remaining int, err error) {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	if olderThanDays <= 0 {
		removed = len(ts.events)
		ts.events = []TimelineEvent{}
		ts.devices = make(map[string]*DeviceTimelineState)
		ts.ipToLastKey = make(map[string]string)
		err = ts.rewriteEventsFileLocked()
		ts.persistLocked(nil)
		return removed, 0, err
	}

	cutoffMs := ts.nowFunc().UnixMilli() - int64(olderThanDays)*24*int64(time.Hour/time.Millisecond)
	kept := make([]TimelineEvent, 0, len(ts.events))
	for _, ev := range ts.events {
		if ev.TimestampMs >= cutoffMs {
			kept = append(kept, ev)
		} else {
			removed++
		}
	}
	ts.events = kept
	err = ts.rewriteEventsFileLocked()
	return removed, len(ts.events), err
}
