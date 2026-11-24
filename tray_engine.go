package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TrayAlertPolicy configures event-driven OS notifications, cooldown deduplication, and Do-Not-Disturb rules.
type TrayAlertPolicy struct {
	NotifyOnIntruder       bool   `json:"notifyOnIntruder"`
	NotifyOnIpConflict     bool   `json:"notifyOnIpConflict"`
	NotifyOnMassOffline    bool   `json:"notifyOnMassOffline"`
	MassOfflineMinCount    int    `json:"massOfflineMinCount"`
	MassOfflineDropPercent int    `json:"massOfflineDropPercent"`
	DedupCooldownMinutes   int    `json:"dedupCooldownMinutes"`
	DndEnabled             bool   `json:"dndEnabled"`
	DndUntilMs             int64  `json:"dndUntilMs"`
	QuietHoursEnabled      bool   `json:"quietHoursEnabled"`
	QuietStart             string `json:"quietStart"`
	QuietEnd               string `json:"quietEnd"`
	SilentBoot             bool   `json:"silentBoot"`
}

// TrayScheduleSummary mirrors active UI schedules so Go can show next schedule info and run due schedules headlessly.
type TrayScheduleSummary struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Enabled          bool   `json:"enabled"`
	Subnet           string `json:"subnet"`
	Start            int    `json:"start"`
	End              int    `json:"end"`
	IntervalMinutes  int    `json:"intervalMinutes"`
	NextRunMs        int64  `json:"nextRunMs"`
	LastRunMs        int64  `json:"lastRunMs"`
	AutoSaveSnapshot bool   `json:"autoSaveSnapshot"`
}

// TrayEventRecord captures a single security, connectivity, or scheduler event handled by the tray engine.
type TrayEventRecord struct {
	ID           string `json:"id"`
	TimestampMs  int64  `json:"timestampMs"`
	Type         string `json:"type"`     // intruder | ip_conflict | mass_offline | scheduler | system
	Severity     string `json:"severity"` // critical | warning | info
	Title        string `json:"title"`
	Message      string `json:"message"`
	IP           string `json:"ip,omitempty"`
	MAC          string `json:"mac,omitempty"`
	Notified     bool   `json:"notified"`
	SuppressedBy string `json:"suppressedBy,omitempty"` // "" | cooldown | dnd | rule_off
	Source       string `json:"source"`                 // go_daemon | ui_sync | tray_action
}

// TrayPendingAction queues a user click from the OS native tray menu for UI synchronization.
type TrayPendingAction struct {
	ID          string `json:"id"`
	Action      string `json:"action"` // quick_scan | toggle_watch | toggle_scheduler_pause | run_schedule_now | toggle_dnd | open_intruder_log | open_scheduler
	Payload     string `json:"payload,omitempty"`
	TimestampMs int64  `json:"timestampMs"`
}

// TrayRuntimeSnapshot represents the full synchronized state between Go tray/service, UI, and Electron.
type TrayRuntimeSnapshot struct {
	Mode                  string                `json:"mode"` // standby | watching | scanning | alert
	WatchEnabled          bool                  `json:"watchEnabled"`
	WatchIntervalSeconds  int                   `json:"watchIntervalSeconds"`
	SchedulerPaused       bool                  `json:"schedulerPaused"`
	ActiveScheduleCount   int                   `json:"activeScheduleCount"`
	NextScheduleName      string                `json:"nextScheduleName,omitempty"`
	NextScheduleAtMs      int64                 `json:"nextScheduleAtMs,omitempty"`
	IsScanning            bool                  `json:"isScanning"`
	ScanProgressPercent   int                   `json:"scanProgressPercent"`
	ActiveDeviceCount     int                   `json:"activeDeviceCount"`
	IntruderCount         int                   `json:"intruderCount"`
	ConflictCount         int                   `json:"conflictCount"`
	LastScanAtMs          int64                 `json:"lastScanAtMs,omitempty"`
	StatusMessage         string                `json:"statusMessage"`
	Subnet                string                `json:"subnet"`
	StartIP               int                   `json:"startIp"`
	EndIP                 int                   `json:"endIp"`
	WindowConnected       bool                  `json:"windowConnected"`
	RunningInTrayMode     bool                  `json:"runningInTrayMode"`
	RunningAsService      bool                  `json:"runningAsService"`
	ServiceState          string                `json:"serviceState"` // running | stopped | not_installed | unknown
	AutoStartEnabled      bool                  `json:"autoStartEnabled"`
	DndActive             bool                  `json:"dndActive"`
	Policy                TrayAlertPolicy       `json:"policy"`
	Schedules             []TrayScheduleSummary `json:"schedules,omitempty"`
	RecentEvents          []TrayEventRecord     `json:"recentEvents"`
	PendingActions        []TrayPendingAction   `json:"pendingActions,omitempty"`
	TrustedKeysCount      int                   `json:"trustedKeysCount"`
	LastAutonomousSweepMs int64                 `json:"lastAutonomousSweepMs,omitempty"`
}

type persistedTrayConfig struct {
	WatchEnabled         bool                  `json:"watchEnabled"`
	WatchIntervalSeconds int                   `json:"watchIntervalSeconds"`
	SchedulerPaused      bool                  `json:"schedulerPaused"`
	Subnet               string                `json:"subnet"`
	StartIP              int                   `json:"startIp"`
	EndIP                int                   `json:"endIp"`
	TrustedKeys          []string              `json:"trustedKeys"`
	Policy               TrayAlertPolicy       `json:"policy"`
	Schedules            []TrayScheduleSummary `json:"schedules"`
}

type observedHostSnapshot struct {
	IP       string
	MAC      string
	Vendor   string
	Hostname string
}

type trayManager struct {
	mu                    sync.RWMutex
	watchEnabled          bool
	watchIntervalSeconds  int
	schedulerPaused       bool
	activeScheduleCount   int
	nextScheduleName      string
	nextScheduleAtMs      int64
	isScanning            bool
	scanProgressPercent   int
	activeDeviceCount     int
	intruderCount         int
	conflictCount         int
	lastScanAtMs          int64
	statusMessage         string
	subnet                string
	startIP               int
	endIP                 int
	runningInTrayMode     bool
	runningAsService      bool
	serviceState          string
	autoStartEnabled      bool
	policy                TrayAlertPolicy
	trustedKeys           map[string]bool
	schedules             []TrayScheduleSummary
	events                []TrayEventRecord
	pendingActions        []TrayPendingAction
	dedupCache            map[string]int64 // eventKey -> last notified timestampMs
	lastObservedOnline    map[string]observedHostSnapshot
	lastAutonomousSweepMs int64
	sweepInProgress       bool
	lastServiceCheckAt    time.Time
}

var globalTrayMgr = newTrayManager()

func defaultTrayAlertPolicy() TrayAlertPolicy {
	return TrayAlertPolicy{
		NotifyOnIntruder:       true,
		NotifyOnIpConflict:     true,
		NotifyOnMassOffline:    true,
		MassOfflineMinCount:    3,
		MassOfflineDropPercent: 30,
		DedupCooldownMinutes:   5,
		DndEnabled:             false,
		DndUntilMs:             0,
		QuietHoursEnabled:      false,
		QuietStart:             "23:00",
		QuietEnd:               "07:00",
		SilentBoot:             false,
	}
}

func newTrayManager() *trayManager {
	mgr := &trayManager{
		watchIntervalSeconds: 60,
		subnet:               "192.168.0",
		startIP:              1,
		endIP:                254,
		serviceState:         "unknown",
		policy:               defaultTrayAlertPolicy(),
		trustedKeys:          make(map[string]bool),
		events:               make([]TrayEventRecord, 0, 100),
		pendingActions:       make([]TrayPendingAction, 0, 16),
		dedupCache:           make(map[string]int64),
		lastObservedOnline:   make(map[string]observedHostSnapshot),
	}
	mgr.loadFromDisk()
	return mgr
}

func getTrayConfigPath() string {
	if runtime.GOOS == "windows" {
		if appData := os.Getenv("LOCALAPPDATA"); appData != "" {
			dir := filepath.Join(appData, "GridIPScanner2")
			_ = os.MkdirAll(dir, 0755)
			return filepath.Join(dir, "tray_config.json")
		}
		if progData := os.Getenv("ProgramData"); progData != "" {
			dir := filepath.Join(progData, "GridIPScanner2")
			_ = os.MkdirAll(dir, 0755)
			return filepath.Join(dir, "tray_config.json")
		}
	}
	homeDir, err := os.UserHomeDir()
	if err != nil || homeDir == "" {
		return "tray_config.json"
	}
	dir := filepath.Join(homeDir, ".grid_ip_scanner")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "tray_config.json")
}

func (m *trayManager) loadFromDisk() {
	cfgPath := getTrayConfigPath()
	raw, err := os.ReadFile(cfgPath)
	if err != nil || len(raw) == 0 {
		return
	}
	var cfg persistedTrayConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return
	}
	m.watchEnabled = cfg.WatchEnabled
	if cfg.WatchIntervalSeconds >= 15 {
		m.watchIntervalSeconds = cfg.WatchIntervalSeconds
	}
	m.schedulerPaused = cfg.SchedulerPaused
	if strings.TrimSpace(cfg.Subnet) != "" {
		m.subnet = strings.TrimSpace(cfg.Subnet)
	}
	if cfg.StartIP >= 1 && cfg.StartIP <= 254 {
		m.startIP = cfg.StartIP
	}
	if cfg.EndIP >= m.startIP && cfg.EndIP <= 254 {
		m.endIP = cfg.EndIP
	}
	if cfg.Policy.DedupCooldownMinutes > 0 || cfg.Policy.QuietStart != "" {
		if cfg.Policy.MassOfflineMinCount <= 0 {
			cfg.Policy.MassOfflineMinCount = 3
		}
		if cfg.Policy.MassOfflineDropPercent <= 0 {
			cfg.Policy.MassOfflineDropPercent = 30
		}
		if cfg.Policy.DedupCooldownMinutes <= 0 {
			cfg.Policy.DedupCooldownMinutes = 5
		}
		if cfg.Policy.QuietStart == "" {
			cfg.Policy.QuietStart = "23:00"
		}
		if cfg.Policy.QuietEnd == "" {
			cfg.Policy.QuietEnd = "07:00"
		}
		m.policy = cfg.Policy
	}
	for _, k := range cfg.TrustedKeys {
		norm := strings.ToUpper(strings.TrimSpace(k))
		if norm != "" {
			m.trustedKeys[norm] = true
			if macKey := normalizeTrayMac(norm); macKey != "" {
				m.trustedKeys[macKey] = true
			}
		}
	}
	if len(cfg.Schedules) > 0 {
		m.schedules = cfg.Schedules
		m.recomputeNextScheduleLocked()
	}
}

func (m *trayManager) saveToDiskLocked() {
	keys := make([]string, 0, len(m.trustedKeys))
	for k := range m.trustedKeys {
		keys = append(keys, k)
	}
	cfg := persistedTrayConfig{
		WatchEnabled:         m.watchEnabled,
		WatchIntervalSeconds: m.watchIntervalSeconds,
		SchedulerPaused:      m.schedulerPaused,
		Subnet:               m.subnet,
		StartIP:              m.startIP,
		EndIP:                m.endIP,
		TrustedKeys:          keys,
		Policy:               m.policy,
		Schedules:            m.schedules,
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(getTrayConfigPath(), data, 0644)
}

func (m *trayManager) recomputeNextScheduleLocked() {
	enabledCount := 0
	var earliestMs int64
	var earliestName string
	for _, sc := range m.schedules {
		if !sc.Enabled {
			continue
		}
		enabledCount++
		if sc.NextRunMs > 0 && (earliestMs == 0 || sc.NextRunMs < earliestMs) {
			earliestMs = sc.NextRunMs
			earliestName = sc.Name
		}
	}
	m.activeScheduleCount = enabledCount
	m.nextScheduleAtMs = earliestMs
	m.nextScheduleName = earliestName
}

func parseClockMinutes(hhmm string) (int, bool) {
	parts := strings.Split(strings.TrimSpace(hhmm), ":")
	if len(parts) != 2 {
		return 0, false
	}
	h, err1 := strconv.Atoi(parts[0])
	min, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || h < 0 || h > 23 || min < 0 || min > 59 {
		return 0, false
	}
	return h*60 + min, true
}

func isPolicyDndActiveAt(p TrayAlertPolicy, now time.Time) bool {
	if p.DndEnabled {
		return true
	}
	if p.DndUntilMs > 0 && now.UnixMilli() < p.DndUntilMs {
		return true
	}
	if p.QuietHoursEnabled {
		startMin, ok1 := parseClockMinutes(p.QuietStart)
		endMin, ok2 := parseClockMinutes(p.QuietEnd)
		if ok1 && ok2 && startMin != endMin {
			curMin := now.Hour()*60 + now.Minute()
			if startMin < endMin {
				if curMin >= startMin && curMin < endMin {
					return true
				}
			} else {
				// Overnight span (e.g., 23:00 -> 07:00)
				if curMin >= startMin || curMin < endMin {
					return true
				}
			}
		}
	}
	return false
}

func (m *trayManager) computeModeLocked() string {
	if m.intruderCount > 0 || m.conflictCount > 0 {
		return "alert"
	}
	if m.isScanning {
		return "scanning"
	}
	if m.watchEnabled {
		return "watching"
	}
	return "standby"
}

func (m *trayManager) buildStatusMessageLocked() string {
	if m.statusMessage != "" {
		return m.statusMessage
	}
	if m.isScanning {
		return fmt.Sprintf("스캔 진행 중 (%d%%)", m.scanProgressPercent)
	}
	if m.intruderCount > 0 || m.conflictCount > 0 {
		return fmt.Sprintf("경고: 미확인 %d대 · 충돌 %d건", m.intruderCount, m.conflictCount)
	}
	if m.watchEnabled {
		if m.activeDeviceCount > 0 {
			return fmt.Sprintf("24/7 감시 중 · 활성 %d대 · 정상", m.activeDeviceCount)
		}
		return "24/7 백그라운드 침입 감시 가동 중"
	}
	return "시스템 트레이 대기 중"
}

func (m *trayManager) snapshotLocked(consumeActions bool) TrayRuntimeSnapshot {
	now := time.Now()
	windowConnectedMutex.Lock()
	winConn := windowConnected
	windowConnectedMutex.Unlock()

	if m.policy.DndUntilMs > 0 && now.UnixMilli() >= m.policy.DndUntilMs {
		m.policy.DndUntilMs = 0
	}

	dndActive := isPolicyDndActiveAt(m.policy, now)
	eventsCopy := make([]TrayEventRecord, len(m.events))
	copy(eventsCopy, m.events)

	schedsCopy := make([]TrayScheduleSummary, len(m.schedules))
	copy(schedsCopy, m.schedules)

	var actionsCopy []TrayPendingAction
	if len(m.pendingActions) > 0 {
		actionsCopy = make([]TrayPendingAction, len(m.pendingActions))
		copy(actionsCopy, m.pendingActions)
		if consumeActions {
			m.pendingActions = m.pendingActions[:0]
		}
	}

	return TrayRuntimeSnapshot{
		Mode:                  m.computeModeLocked(),
		WatchEnabled:          m.watchEnabled,
		WatchIntervalSeconds:  m.watchIntervalSeconds,
		SchedulerPaused:       m.schedulerPaused,
		ActiveScheduleCount:   m.activeScheduleCount,
		NextScheduleName:      m.nextScheduleName,
		NextScheduleAtMs:      m.nextScheduleAtMs,
		IsScanning:            m.isScanning,
		ScanProgressPercent:   m.scanProgressPercent,
		ActiveDeviceCount:     m.activeDeviceCount,
		IntruderCount:         m.intruderCount,
		ConflictCount:         m.conflictCount,
		LastScanAtMs:          m.lastScanAtMs,
		StatusMessage:         m.buildStatusMessageLocked(),
		Subnet:                m.subnet,
		StartIP:               m.startIP,
		EndIP:                 m.endIP,
		WindowConnected:       winConn,
		RunningInTrayMode:     m.runningInTrayMode,
		RunningAsService:      m.runningAsService,
		ServiceState:          m.serviceState,
		AutoStartEnabled:      m.autoStartEnabled,
		DndActive:             dndActive,
		Policy:                m.policy,
		Schedules:             schedsCopy,
		RecentEvents:          eventsCopy,
		PendingActions:        actionsCopy,
		TrustedKeysCount:      len(m.trustedKeys),
		LastAutonomousSweepMs: m.lastAutonomousSweepMs,
	}
}

func (m *trayManager) getSnapshot(consumeActions bool) TrayRuntimeSnapshot {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.snapshotLocked(consumeActions)
}

func (m *trayManager) enqueueAction(action string, payload string) {
	m.mu.Lock()
	act := TrayPendingAction{
		ID:          fmt.Sprintf("act_%d_%d", time.Now().UnixNano(), len(m.pendingActions)),
		Action:      action,
		Payload:     payload,
		TimestampMs: time.Now().UnixMilli(),
	}
	if len(m.pendingActions) >= 32 {
		m.pendingActions = m.pendingActions[1:]
	}
	m.pendingActions = append(m.pendingActions, act)
	m.mu.Unlock()
}

// recordAndEvaluateEvent checks policy rules, DND, and cooldown deduplication, stores into ring buffer, and returns whether an OS notification should fire.
func (m *trayManager) recordAndEvaluateEvent(
	eventType string,
	severity string,
	dedupKey string,
	title string,
	message string,
	ip string,
	mac string,
	source string,
	now time.Time,
) (TrayEventRecord, bool) {
	m.mu.Lock()
	ruleEnabled := true
	switch eventType {
	case "intruder":
		ruleEnabled = m.policy.NotifyOnIntruder
	case "ip_conflict":
		ruleEnabled = m.policy.NotifyOnIpConflict
	case "mass_offline":
		ruleEnabled = m.policy.NotifyOnMassOffline
	}

	nowMs := now.UnixMilli()
	suppressedBy := ""
	shouldNotify := true

	if !ruleEnabled {
		shouldNotify = false
		suppressedBy = "rule_off"
	} else if isPolicyDndActiveAt(m.policy, now) {
		shouldNotify = false
		suppressedBy = "dnd"
	} else if dedupKey != "" && m.policy.DedupCooldownMinutes > 0 {
		cooldownMs := int64(m.policy.DedupCooldownMinutes) * 60 * 1000
		if prevMs, ok := m.dedupCache[dedupKey]; ok && (nowMs-prevMs) < cooldownMs {
			shouldNotify = false
			suppressedBy = "cooldown"
		}
	}

	if shouldNotify && dedupKey != "" {
		m.dedupCache[dedupKey] = nowMs
	}

	rec := TrayEventRecord{
		ID:           fmt.Sprintf("evt_%d_%d", now.UnixNano(), len(m.events)),
		TimestampMs:  nowMs,
		Type:         eventType,
		Severity:     severity,
		Title:        title,
		Message:      message,
		IP:           ip,
		MAC:          mac,
		Notified:     shouldNotify,
		SuppressedBy: suppressedBy,
		Source:       source,
	}

	m.events = append([]TrayEventRecord{rec}, m.events...)
	if len(m.events) > 100 {
		m.events = m.events[:100]
	}
	isService := m.runningAsService
	m.mu.Unlock()

	if shouldNotify && runtime.GOOS == "windows" && !isService {
		showTrayBalloonNotificationWithSeverity(title, message, severity)
	}
	return rec, shouldNotify
}

// queryWindowsServiceAndAutostart refreshes OS service & HKCU\Run autostart states on Windows (non-blocking cache with 15s TTL).
func (m *trayManager) refreshWindowsSystemState(force bool) {
	if runtime.GOOS != "windows" {
		m.mu.Lock()
		m.serviceState = "not_installed"
		m.mu.Unlock()
		return
	}

	m.mu.RLock()
	recent := !force && time.Since(m.lastServiceCheckAt) < 15*time.Second
	m.mu.RUnlock()
	if recent {
		return
	}

	svcState, _, _ := queryWindowsServiceState()
	autostartCmd := exec.Command("reg", "query", `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, "/v", "Grid IP Scanner2")
	hideWindow(autostartCmd)
	autostartEnabled := autostartCmd.Run() == nil

	m.mu.Lock()
	m.serviceState = svcState
	m.autoStartEnabled = autostartEnabled
	m.lastServiceCheckAt = time.Now()
	m.mu.Unlock()
}

func queryWindowsServiceState() (state string, installed bool, running bool) {
	if runtime.GOOS != "windows" {
		return "not_installed", false, false
	}
	cmd := exec.Command("sc.exe", "query", "GridIPScannerService")
	hideWindow(cmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "not_installed", false, false
	}
	upper := strings.ToUpper(string(out))
	if strings.Contains(upper, "RUNNING") {
		return "running", true, true
	}
	if strings.Contains(upper, "START_PENDING") || strings.Contains(upper, "CONTINUE_PENDING") {
		return "running", true, true
	}
	if strings.Contains(upper, "STOPPED") || strings.Contains(upper, "PAUSED") {
		return "stopped", true, false
	}
	return "stopped", true, false
}

// normalizeTrayMac normalizes MAC strings (removing ':', '-', '.') to 12 uppercase hex chars while ignoring IPs and placeholders.
func normalizeTrayMac(raw string) string {
	s := strings.ToUpper(strings.TrimSpace(raw))
	if s == "" || s == "UNKNOWN" {
		return ""
	}
	if strings.Contains(s, ".") && strings.Count(s, ".") == 3 {
		parts := strings.Split(s, ".")
		isCiscoMac := len(parts) == 3 && len(parts[0]) == 4 && len(parts[1]) == 4 && len(parts[2]) == 4
		if !isCiscoMac {
			return ""
		}
	}
	var b strings.Builder
	b.Grow(12)
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') {
			b.WriteByte(c)
		} else if c != ':' && c != '-' && c != '.' && c != ' ' {
			return ""
		}
	}
	hexStr := b.String()
	if len(hexStr) != 12 || hexStr == "000000000000" || hexStr == "FFFFFFFFFFFF" {
		return ""
	}
	return hexStr
}

// evaluateSweepAnomalies detects unknown devices, IP/MAC conflicts, and mass offline drops comparing current online hosts against trusted baseline & previous sweep.
func evaluateSweepAnomalies(
	currentOnline map[string]observedHostSnapshot,
	prevOnline map[string]observedHostSnapshot,
	trustedKeys map[string]bool,
	policy TrayAlertPolicy,
) (intruders []observedHostSnapshot, conflicts []string, offlineCount int, offlinePercent int) {
	// Deterministic IP iteration ensures intruders[0] and conflicts[0] remain stable across sweeps for cooldown deduplication.
	ips := make([]string, 0, len(currentOnline))
	for ip := range currentOnline {
		ips = append(ips, ip)
	}
	sort.Strings(ips)

	// 1. Detect IP->MAC change (conflict) & unknown/untrusted devices
	for _, ip := range ips {
		cur := currentOnline[ip]
		normMac := strings.ToUpper(strings.TrimSpace(cur.MAC))
		curMacKey := normalizeTrayMac(normMac)
		if prev, hadPrev := prevOnline[ip]; hadPrev {
			prevMac := strings.ToUpper(strings.TrimSpace(prev.MAC))
			prevMacKey := normalizeTrayMac(prevMac)
			if prevMacKey != "" && curMacKey != "" && prevMacKey != curMacKey {
				conflicts = append(conflicts, fmt.Sprintf("%s (%s -> %s)", ip, prevMac, normMac))
			}
		}

		isTrusted := trustedKeys[strings.ToUpper(ip)] ||
			(curMacKey != "" && trustedKeys[curMacKey]) ||
			(normMac != "" && trustedKeys[normMac])
		if len(trustedKeys) > 0 && !isTrusted {
			intruders = append(intruders, cur)
		}
	}

	// 2. Detect Mass Offline drop
	prevTotal := len(prevOnline)
	if prevTotal > 0 {
		dropped := 0
		for ip := range prevOnline {
			if _, stillOnline := currentOnline[ip]; !stillOnline {
				dropped++
			}
		}
		offlineCount = dropped
		offlinePercent = (dropped * 100) / prevTotal
		minCnt := policy.MassOfflineMinCount
		if minCnt <= 0 {
			minCnt = 3
		}
		minPct := policy.MassOfflineDropPercent
		if minPct <= 0 {
			minPct = 30
		}
		if dropped < minCnt && offlinePercent < minPct {
			// Below threshold: do not emit mass offline alert
			offlineCount = 0
		}
	}

	return intruders, conflicts, offlineCount, offlinePercent
}

// runAutonomousTraySweep executes a fast headless subnet scan directly inside Go when triggered by tray/service/background loop.
func (m *trayManager) runAutonomousTraySweep(reason string, triggerScheduleName string, subnetOverride string, startOverride int, endOverride int) {
	m.mu.Lock()
	if m.sweepInProgress {
		m.mu.Unlock()
		return
	}
	m.sweepInProgress = true
	m.isScanning = true
	m.scanProgressPercent = 5
	targetSubnet := strings.TrimSpace(subnetOverride)
	if targetSubnet == "" {
		targetSubnet = m.subnet
	}
	startIP := m.startIP
	endIP := m.endIP
	if startOverride >= 1 && startOverride <= 254 {
		startIP = startOverride
	}
	if endOverride >= 1 && endOverride <= 254 {
		endIP = endOverride
	}
	if targetSubnet == "" {
		ifaces := getAllInterfaces()
		if len(ifaces) > 0 && ifaces[0].Subnet != "" {
			targetSubnet = ifaces[0].Subnet
		} else {
			targetSubnet = "192.168.0"
		}
		m.subnet = targetSubnet
	}
	if startIP < 1 || startIP > 254 {
		startIP = 1
	}
	if endIP < startIP || endIP > 254 {
		endIP = 254
	}
	trustedCopy := make(map[string]bool, len(m.trustedKeys))
	for k, v := range m.trustedKeys {
		trustedCopy[k] = v
	}
	prevOnlineCopy := make(map[string]observedHostSnapshot, len(m.lastObservedOnline))
	for k, v := range m.lastObservedOnline {
		prevOnlineCopy[k] = v
	}
	policyCopy := m.policy
	m.mu.Unlock()

	syncNativeTrayVisuals()

	defer func() {
		m.mu.Lock()
		m.sweepInProgress = false
		m.isScanning = false
		m.scanProgressPercent = 100
		m.lastAutonomousSweepMs = time.Now().UnixMilli()
		m.lastScanAtMs = m.lastAutonomousSweepMs
		m.mu.Unlock()
		syncNativeTrayVisuals()
	}()

	GlobalEngine.Prepare()

	total := endIP - startIP + 1
	jobs := make(chan int, total)
	var wg sync.WaitGroup
	var resMu sync.Mutex
	currentOnline := make(map[string]observedHostSnapshot)
	completed := 0

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	workers := 48
	if total < workers {
		workers = total
	}
	if workers < 1 {
		workers = 1
	}

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for hostOctet := range jobs {
				ip := fmt.Sprintf("%s.%d", targetSubnet, hostOctet)
				alive := false
				if lat, ok := tryNativeFastPing(ip, 350); ok && lat >= 0 {
					alive = true
				} else if isAlivePing(ctx, ip) {
					alive = true
				}

				if alive {
					mac := GlobalEngine.GetMAC(ip)
					vendor := ""
					if mac != "" && mac != "Unknown" {
						ouiMutex.RLock()
						if currentOUIProvider != nil {
							vendor = currentOUIProvider.Lookup(mac)
						}
						ouiMutex.RUnlock()
					}
					resMu.Lock()
					currentOnline[ip] = observedHostSnapshot{
						IP:     ip,
						MAC:    mac,
						Vendor: vendor,
					}
					resMu.Unlock()
				}

				resMu.Lock()
				completed++
				pct := 5 + (completed*90)/total
				shouldSyncProgress := completed%20 == 0
				resMu.Unlock()

				if shouldSyncProgress {
					m.mu.Lock()
					m.scanProgressPercent = pct
					m.mu.Unlock()
					syncNativeTrayVisuals()
				}
			}
		}()
	}

	for i := startIP; i <= endIP; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	intruders, conflicts, offlineDropCount, offlineDropPct := evaluateSweepAnomalies(
		currentOnline,
		prevOnlineCopy,
		trustedCopy,
		policyCopy,
	)

	now := time.Now()
	m.mu.Lock()
	m.activeDeviceCount = len(currentOnline)
	m.intruderCount = len(intruders)
	m.conflictCount = len(conflicts)
	m.lastObservedOnline = currentOnline
	m.statusMessage = fmt.Sprintf(
		"%s.0/24 스캔 완료 · 활성 %d대 · 침입 %d · 충돌 %d",
		targetSubnet, len(currentOnline), len(intruders), len(conflicts),
	)
	m.mu.Unlock()

	if len(intruders) > 0 {
		first := intruders[0]
		vendorStr := first.Vendor
		if vendorStr == "" {
			vendorStr = "알 수 없는 제조사"
		}
		msg := fmt.Sprintf("미확인 기기 %d대 감지: %s (%s)", len(intruders), first.IP, vendorStr)
		if len(intruders) > 1 {
			msg += fmt.Sprintf(" 외 %d대", len(intruders)-1)
		}
		macPart := normalizeTrayMac(first.MAC)
		if macPart == "" {
			macPart = strings.ToUpper(strings.TrimSpace(first.MAC))
		}
		dedupKey := "intruder:" + macPart + "|" + strings.ToUpper(first.IP)
		m.recordAndEvaluateEvent(
			"intruder",
			"critical",
			dedupKey,
			"🚨 낯선 기기 침입 감지",
			msg,
			first.IP,
			first.MAC,
			"go_daemon",
			now,
		)
	}

	if len(conflicts) > 0 {
		msg := fmt.Sprintf("IP/MAC 충돌 의심 %d건: %s", len(conflicts), conflicts[0])
		m.recordAndEvaluateEvent(
			"ip_conflict",
			"critical",
			"conflict:"+conflicts[0],
			"⚠️ IP/MAC 주소 충돌 감지",
			msg,
			"",
			"",
			"go_daemon",
			now,
		)
	}

	if offlineDropCount > 0 {
		msg := fmt.Sprintf("직전 감시 대비 기기 %d대(%d%%)가 동시에 오프라인 전환되었습니다.", offlineDropCount, offlineDropPct)
		m.recordAndEvaluateEvent(
			"mass_offline",
			"warning",
			"mass_offline:"+targetSubnet,
			"📉 대량 오프라인 급감 감지",
			msg,
			"",
			"",
			"go_daemon",
			now,
		)
	}

	if reason == "scheduler" && triggerScheduleName != "" {
		m.recordAndEvaluateEvent(
			"scheduler",
			"info",
			"sched_run:"+triggerScheduleName,
			"⏱️ 트레이 스케줄 실행 완료",
			fmt.Sprintf("[%s] 백그라운드 정기 점검 완료 (활성 %d대)", triggerScheduleName, len(currentOnline)),
			"",
			"",
			"go_daemon",
			now,
		)
	} else if reason == "manual_tray" && len(intruders) == 0 && len(conflicts) == 0 && offlineDropCount == 0 {
		m.recordAndEvaluateEvent(
			"system",
			"info",
			"",
			"⚡ 백그라운드 즉시 스캔 완료",
			fmt.Sprintf("서브넷 %s.0/24 점검 결과 이상 없음 (활성 %d대)", targetSubnet, len(currentOnline)),
			"",
			"",
			"tray_action",
			now,
		)
	}
}

// startAutonomousTrayLoop runs Go's independent background watcher & headless scheduler ticker (active when UI is closed or --tray/--service).
func startAutonomousTrayLoop() {
	go func() {
		// Initial Windows service/autostart status hydration
		globalTrayMgr.refreshWindowsSystemState(true)
		syncNativeTrayVisuals()

		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			globalTrayMgr.refreshWindowsSystemState(false)

			snap := globalTrayMgr.getSnapshot(false)
			// When UI window is actively connected, UI drives periodic watch & schedules;
			// Go only autonomously sweeps when window is disconnected (closed to tray / --tray / --service).
			if snap.WindowConnected && !snap.RunningAsService {
				syncNativeTrayVisuals()
				continue
			}

			nowMs := time.Now().UnixMilli()

			// 1. Check due headless schedules if scheduler is not paused
			if !snap.SchedulerPaused {
				var dueSched *TrayScheduleSummary
				globalTrayMgr.mu.Lock()
				for i := range globalTrayMgr.schedules {
					sc := &globalTrayMgr.schedules[i]
					if sc.Enabled && sc.NextRunMs > 0 && sc.NextRunMs <= nowMs {
						intervalMs := int64(sc.IntervalMinutes) * 60 * 1000
						if intervalMs <= 0 {
							intervalMs = 60 * 60 * 1000
						}
						sc.LastRunMs = nowMs
						sc.NextRunMs = nowMs + intervalMs
						copySc := *sc
						dueSched = &copySc
						break
					}
				}
				if dueSched != nil {
					globalTrayMgr.recomputeNextScheduleLocked()
					globalTrayMgr.saveToDiskLocked()
				}
				globalTrayMgr.mu.Unlock()

				if dueSched != nil {
					globalTrayMgr.runAutonomousTraySweep("scheduler", dueSched.Name, dueSched.Subnet, dueSched.Start, dueSched.End)
					continue
				}
			}

			// 2. Check autonomous 24/7 intruder watch sweep interval
			if snap.WatchEnabled {
				intervalMs := int64(snap.WatchIntervalSeconds) * 1000
				if intervalMs < 15000 {
					intervalMs = 60000
				}
				if snap.LastAutonomousSweepMs == 0 || (nowMs-snap.LastAutonomousSweepMs) >= intervalMs {
					globalTrayMgr.runAutonomousTraySweep("watch", "", "", 0, 0)
				}
			}
		}
	}()
}

// executeTrayCommand runs a quick action invoked either from the Win32 native tray menu or HTTP API.
func (m *trayManager) executeTrayCommand(action string, payload string, fromNativeTray bool) (TrayRuntimeSnapshot, string) {
	now := time.Now()
	msg := ""

	switch action {
	case "quick_scan":
		snap := m.getSnapshot(false)
		if snap.WindowConnected && fromNativeTray {
			m.enqueueAction("quick_scan", "")
			msg = "메인 UI에 즉시 스캔 명령을 전달했습니다."
		} else {
			go m.runAutonomousTraySweep("manual_tray", "", "", 0, 0)
			msg = "백그라운드 즉시 네트워크 스캔을 시작했습니다."
		}

	case "toggle_watch":
		m.mu.Lock()
		m.watchEnabled = !m.watchEnabled
		next := m.watchEnabled
		m.saveToDiskLocked()
		m.mu.Unlock()
		m.enqueueAction("toggle_watch", strconv.FormatBool(next))
		if next {
			msg = "24/7 백그라운드 침입 감시가 활성화되었습니다."
		} else {
			msg = "24/7 백그라운드 침입 감시가 일시 중지되었습니다."
		}
		if fromNativeTray && runtime.GOOS == "windows" {
			showTrayBalloonNotificationWithSeverity("Grid IP Scanner2 감시 상태", msg, "info")
		}

	case "toggle_scheduler_pause":
		m.mu.Lock()
		m.schedulerPaused = !m.schedulerPaused
		paused := m.schedulerPaused
		m.saveToDiskLocked()
		m.mu.Unlock()
		m.enqueueAction("toggle_scheduler_pause", strconv.FormatBool(paused))
		if paused {
			msg = "활성 예약 스케줄러가 일시정지되었습니다."
		} else {
			msg = "예약 스케줄러가 재개되었습니다."
		}
		m.recordAndEvaluateEvent("scheduler", "info", "", "⏱️ 스케줄러 상태 변경", msg, "", "", "tray_action", now)

	case "run_schedule_now":
		snap := m.getSnapshot(false)
		if snap.WindowConnected {
			m.enqueueAction("run_schedule_now", payload)
			msg = "예약 스케줄 즉시 실행을 요청했습니다."
		} else {
			nowMs := now.UnixMilli()
			targetName := snap.NextScheduleName
			targetSubnet := ""
			targetStart := 0
			targetEnd := 0

			m.mu.Lock()
			targetIdx := -1
			for i := range m.schedules {
				if payload != "" && m.schedules[i].ID == payload {
					targetIdx = i
					break
				}
				if m.schedules[i].Enabled {
					if targetIdx == -1 || (m.schedules[i].NextRunMs > 0 && (m.schedules[targetIdx].NextRunMs == 0 || m.schedules[i].NextRunMs < m.schedules[targetIdx].NextRunMs)) {
						targetIdx = i
					}
				}
			}
			if targetIdx != -1 {
				sc := &m.schedules[targetIdx]
				intervalMs := int64(sc.IntervalMinutes) * 60 * 1000
				if intervalMs <= 0 {
					intervalMs = 60 * 60 * 1000
				}
				sc.LastRunMs = nowMs
				sc.NextRunMs = nowMs + intervalMs
				targetName = sc.Name
				targetSubnet = sc.Subnet
				targetStart = sc.Start
				targetEnd = sc.End
				m.recomputeNextScheduleLocked()
				m.saveToDiskLocked()
			}
			m.mu.Unlock()

			if targetName == "" {
				targetName = "예약 스케줄"
			}
			go m.runAutonomousTraySweep("scheduler", targetName, targetSubnet, targetStart, targetEnd)
			msg = "트레이 백그라운드에서 예약 스케줄을 즉시 실행합니다."
		}

	case "toggle_dnd":
		m.mu.Lock()
		if isPolicyDndActiveAt(m.policy, now) {
			m.policy.DndEnabled = false
			m.policy.DndUntilMs = 0
			msg = "방해금지(DND) 모드가 해제되었습니다."
		} else {
			m.policy.DndEnabled = true
			m.policy.DndUntilMs = 0
			msg = "방해금지(DND) 모드가 켜졌습니다. 알림은 로그에만 기록됩니다."
		}
		m.saveToDiskLocked()
		m.mu.Unlock()
		m.enqueueAction("toggle_dnd", "")

	case "dnd_30m":
		m.mu.Lock()
		m.policy.DndEnabled = false
		m.policy.DndUntilMs = now.Add(30 * time.Minute).UnixMilli()
		m.saveToDiskLocked()
		m.mu.Unlock()
		msg = "30분 동안 방해금지 모드가 적용되었습니다."
		m.enqueueAction("toggle_dnd", "30m")

	case "open_intruder_log":
		m.enqueueAction("open_intruder_log", "")
		if fromNativeTray {
			openOrFocusTrayWindowImmediate()
		}
		msg = "침입·이상 이벤트 로그 창을 엽니다."

	case "open_scheduler":
		m.enqueueAction("open_scheduler", "")
		if fromNativeTray {
			openOrFocusTrayWindowImmediate()
		}
		msg = "정기 자동 스케줄러 창을 엽니다."
	}

	syncNativeTrayVisuals()
	return m.getSnapshot(false), msg
}

func isValidTraySubnet3(subnet string) bool {
	trimmed := strings.TrimSpace(subnet)
	parts := strings.Split(trimmed, ".")
	if len(parts) != 3 {
		return false
	}
	for _, p := range parts {
		if p == "" || len(p) > 3 {
			return false
		}
		v, err := strconv.Atoi(p)
		if err != nil || v < 0 || v > 255 {
			return false
		}
		if strconv.Itoa(v) != p {
			return false
		}
	}
	return true
}

func isValidTrayAction(action string) bool {
	switch strings.TrimSpace(action) {
	case "quick_scan", "toggle_watch", "toggle_scheduler_pause", "run_schedule_now", "toggle_dnd", "dnd_30m", "open_intruder_log", "open_scheduler":
		return true
	default:
		return false
	}
}

func handleTrayStateAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.Method == http.MethodPost {
		if r.Body == nil {
			http.Error(w, "Missing JSON payload", http.StatusBadRequest)
			return
		}
		var payload struct {
			WatchEnabled        *bool                 `json:"watchEnabled"`
			SchedulerPaused     *bool                 `json:"schedulerPaused"`
			IsScanning          *bool                 `json:"isScanning"`
			ScanProgressPercent *int                  `json:"scanProgressPercent"`
			ActiveDeviceCount   *int                  `json:"activeDeviceCount"`
			IntruderCount       *int                  `json:"intruderCount"`
			ConflictCount       *int                  `json:"conflictCount"`
			StatusMessage       *string               `json:"statusMessage"`
			Subnet              *string               `json:"subnet"`
			StartIP             *int                  `json:"startIp"`
			EndIP               *int                  `json:"endIp"`
			TrustedKeys         []string              `json:"trustedKeys"`
			Schedules           []TrayScheduleSummary `json:"schedules"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 256*1024)).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		var trimmedSubnet string
		if payload.Subnet != nil {
			trimmedSubnet = strings.TrimSpace(*payload.Subnet)
			if trimmedSubnet != "" && !isValidTraySubnet3(trimmedSubnet) {
				http.Error(w, "Invalid 3-octet IPv4 subnet format", http.StatusBadRequest)
				return
			}
		}
		if len(payload.TrustedKeys) > 4096 {
			http.Error(w, "Too many trusted keys", http.StatusBadRequest)
			return
		}
		if len(payload.Schedules) > 128 {
			http.Error(w, "Too many schedules", http.StatusBadRequest)
			return
		}
		if payload.StartIP != nil && (*payload.StartIP < 1 || *payload.StartIP > 254) {
			http.Error(w, "Invalid startIp range (1-254)", http.StatusBadRequest)
			return
		}
		if payload.EndIP != nil && (*payload.EndIP < 1 || *payload.EndIP > 254) {
			http.Error(w, "Invalid endIp range (1-254)", http.StatusBadRequest)
			return
		}

		globalTrayMgr.mu.Lock()
		nextStart := globalTrayMgr.startIP
		nextEnd := globalTrayMgr.endIP
		if payload.StartIP != nil {
			nextStart = *payload.StartIP
		}
		if payload.EndIP != nil {
			nextEnd = *payload.EndIP
		}
		if nextStart > nextEnd {
			globalTrayMgr.mu.Unlock()
			http.Error(w, "Invalid IP range: startIp must be <= endIp", http.StatusBadRequest)
			return
		}

		needSave := false
		if payload.WatchEnabled != nil {
			globalTrayMgr.watchEnabled = *payload.WatchEnabled
			needSave = true
		}
		if payload.SchedulerPaused != nil {
			globalTrayMgr.schedulerPaused = *payload.SchedulerPaused
			needSave = true
		}
		if payload.IsScanning != nil {
			globalTrayMgr.isScanning = *payload.IsScanning
		}
		if payload.ScanProgressPercent != nil {
			pct := *payload.ScanProgressPercent
			if pct < 0 {
				pct = 0
			} else if pct > 100 {
				pct = 100
			}
			globalTrayMgr.scanProgressPercent = pct
		}
		if payload.ActiveDeviceCount != nil && *payload.ActiveDeviceCount >= 0 {
			globalTrayMgr.activeDeviceCount = *payload.ActiveDeviceCount
		}
		if payload.IntruderCount != nil && *payload.IntruderCount >= 0 {
			globalTrayMgr.intruderCount = *payload.IntruderCount
		}
		if payload.ConflictCount != nil && *payload.ConflictCount >= 0 {
			globalTrayMgr.conflictCount = *payload.ConflictCount
		}
		if payload.StatusMessage != nil {
			globalTrayMgr.statusMessage = *payload.StatusMessage
		}
		if trimmedSubnet != "" {
			globalTrayMgr.subnet = trimmedSubnet
			needSave = true
		}
		if payload.StartIP != nil || payload.EndIP != nil {
			globalTrayMgr.startIP = nextStart
			globalTrayMgr.endIP = nextEnd
			needSave = true
		}
		if payload.TrustedKeys != nil {
			nextSet := make(map[string]bool, len(payload.TrustedKeys)*2)
			for _, k := range payload.TrustedKeys {
				norm := strings.ToUpper(strings.TrimSpace(k))
				if norm != "" {
					nextSet[norm] = true
					if macKey := normalizeTrayMac(norm); macKey != "" {
						nextSet[macKey] = true
					}
				}
			}
			globalTrayMgr.trustedKeys = nextSet
			needSave = true
		}
		if payload.Schedules != nil {
			prevById := make(map[string]TrayScheduleSummary, len(globalTrayMgr.schedules))
			for _, prev := range globalTrayMgr.schedules {
				prevById[prev.ID] = prev
			}
			merged := make([]TrayScheduleSummary, len(payload.Schedules))
			for i, sc := range payload.Schedules {
				if prev, ok := prevById[sc.ID]; ok {
					if prev.Enabled == sc.Enabled && prev.IntervalMinutes == sc.IntervalMinutes && prev.LastRunMs > sc.LastRunMs {
						sc.LastRunMs = prev.LastRunMs
						if prev.NextRunMs > sc.NextRunMs {
							sc.NextRunMs = prev.NextRunMs
						}
					}
				}
				merged[i] = sc
			}
			globalTrayMgr.schedules = merged
			globalTrayMgr.recomputeNextScheduleLocked()
			needSave = true
		}
		if needSave {
			globalTrayMgr.saveToDiskLocked()
		}
		globalTrayMgr.mu.Unlock()

		syncNativeTrayVisuals()
		consume := r.URL.Query().Get("consumeActions") == "1"
		snap := globalTrayMgr.getSnapshot(consume)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"state":   snap,
		})
		return
	}

	globalTrayMgr.refreshWindowsSystemState(r.URL.Query().Get("refresh") == "1")
	consume := r.URL.Query().Get("consumeActions") == "1"
	snap := globalTrayMgr.getSnapshot(consume)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"state":   snap,
	})
}

func handleTrayConfigAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.Method == http.MethodPost {
		if r.Body == nil {
			http.Error(w, "Missing JSON payload", http.StatusBadRequest)
			return
		}
		var nextPolicy TrayAlertPolicy
		if err := json.NewDecoder(io.LimitReader(r.Body, 64*1024)).Decode(&nextPolicy); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		if nextPolicy.MassOfflineMinCount <= 0 {
			nextPolicy.MassOfflineMinCount = 3
		} else if nextPolicy.MassOfflineMinCount > 254 {
			nextPolicy.MassOfflineMinCount = 254
		}
		if nextPolicy.MassOfflineDropPercent <= 0 {
			nextPolicy.MassOfflineDropPercent = 30
		} else if nextPolicy.MassOfflineDropPercent > 100 {
			nextPolicy.MassOfflineDropPercent = 100
		}
		if nextPolicy.DedupCooldownMinutes <= 0 {
			nextPolicy.DedupCooldownMinutes = 5
		} else if nextPolicy.DedupCooldownMinutes > 10080 {
			nextPolicy.DedupCooldownMinutes = 10080
		}
		nextPolicy.QuietStart = strings.TrimSpace(nextPolicy.QuietStart)
		nextPolicy.QuietEnd = strings.TrimSpace(nextPolicy.QuietEnd)
		if nextPolicy.QuietStart == "" {
			nextPolicy.QuietStart = "23:00"
		} else if _, ok := parseClockMinutes(nextPolicy.QuietStart); !ok {
			http.Error(w, "Invalid quietStart format (expected HH:MM)", http.StatusBadRequest)
			return
		}
		if nextPolicy.QuietEnd == "" {
			nextPolicy.QuietEnd = "07:00"
		} else if _, ok := parseClockMinutes(nextPolicy.QuietEnd); !ok {
			http.Error(w, "Invalid quietEnd format (expected HH:MM)", http.StatusBadRequest)
			return
		}

		globalTrayMgr.mu.Lock()
		globalTrayMgr.policy = nextPolicy
		globalTrayMgr.saveToDiskLocked()
		globalTrayMgr.mu.Unlock()

		syncNativeTrayVisuals()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"policy":  nextPolicy,
			"state":   globalTrayMgr.getSnapshot(false),
		})
		return
	}

	snap := globalTrayMgr.getSnapshot(false)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"policy":  snap.Policy,
	})
}

func handleTrayActionAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Body == nil {
		http.Error(w, "Missing JSON payload", http.StatusBadRequest)
		return
	}
	var req struct {
		Action  string `json:"action"`
		Payload string `json:"payload"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 32*1024)).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	req.Action = strings.TrimSpace(req.Action)
	if !isValidTrayAction(req.Action) {
		http.Error(w, "Unknown or empty tray action", http.StatusBadRequest)
		return
	}
	snap, msg := globalTrayMgr.executeTrayCommand(req.Action, req.Payload, false)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": msg,
		"state":   snap,
	})
}

func handleTrayReportEventsAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Body == nil {
		http.Error(w, "Missing JSON payload", http.StatusBadRequest)
		return
	}
	var req struct {
		Events []struct {
			Type     string `json:"type"`
			Severity string `json:"severity"`
			DedupKey string `json:"dedupKey"`
			Title    string `json:"title"`
			Message  string `json:"message"`
			IP       string `json:"ip"`
			MAC      string `json:"mac"`
		} `json:"events"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 256*1024)).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if len(req.Events) > 100 {
		http.Error(w, "Too many events in batch (max 100)", http.StatusBadRequest)
		return
	}

	now := time.Now()
	recorded := make([]TrayEventRecord, 0, len(req.Events))
	for _, ev := range req.Events {
		evType := strings.TrimSpace(ev.Type)
		if evType == "" {
			evType = "system"
		}
		sev := strings.ToLower(strings.TrimSpace(ev.Severity))
		switch sev {
		case "critical", "warning", "info":
		default:
			sev = "info"
		}
		rec, _ := globalTrayMgr.recordAndEvaluateEvent(
			evType,
			sev,
			ev.DedupKey,
			ev.Title,
			ev.Message,
			ev.IP,
			ev.MAC,
			"ui_sync",
			now,
		)
		recorded = append(recorded, rec)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"recorded": recorded,
	})
}

func handleTrayEventsAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Method == http.MethodDelete {
		globalTrayMgr.mu.Lock()
		globalTrayMgr.events = globalTrayMgr.events[:0]
		globalTrayMgr.mu.Unlock()
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
		return
	}
	snap := globalTrayMgr.getSnapshot(false)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"events":  snap.RecentEvents,
	})
}

func handleTrayTestNotifyAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Severity string `json:"severity"`
		Title    string `json:"title"`
		Message  string `json:"message"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 16*1024)).Decode(&req)
	}
	if req.Severity == "" {
		req.Severity = "warning"
	}
	if req.Title == "" {
		req.Title = "Grid IP Scanner2 트레이 알림 테스트"
	}
	if req.Message == "" {
		req.Message = "시스템 트레이 OS 알림 및 이벤트 기록 파이프라인이 정상 작동 중입니다."
	}

	// Force record without cooldown, still honoring DND indication in log
	rec, notified := globalTrayMgr.recordAndEvaluateEvent(
		"system",
		req.Severity,
		"",
		req.Title,
		req.Message,
		"",
		"",
		"tray_action",
		time.Now(),
	)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"notified": notified,
		"event":    rec,
	})
}

func registerTrayHTTPHandlers() {
	http.HandleFunc("/api/tray/state", handleTrayStateAPI)
	http.HandleFunc("/api/tray/config", handleTrayConfigAPI)
	http.HandleFunc("/api/tray/action", handleTrayActionAPI)
	http.HandleFunc("/api/tray/report-events", handleTrayReportEventsAPI)
	http.HandleFunc("/api/tray/events", handleTrayEventsAPI)
	http.HandleFunc("/api/tray/test-notify", handleTrayTestNotifyAPI)
}
