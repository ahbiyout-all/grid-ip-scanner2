//go:build !windows
// +build !windows

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Cross-platform stubs and Go fallback implementations for non-Windows environments

type NativeModulesStatus struct {
	ProbeEngine       bool `json:"probeEngine"`
	PortIOCP          bool `json:"portIocp"`
	Discovery         bool `json:"discovery"`
	OuiTrie           bool `json:"ouiTrie"`
	BannerGrabber     bool `json:"bannerGrabber"`
	PcapAnalyzer      bool `json:"pcapAnalyzer"`
	FingerprintEngine bool `json:"fingerprintEngine"`
	TopologyGuard     bool `json:"topologyGuard"`
	NpcapLoaded       bool `json:"npcapLoaded"`
}

func getNativeModulesStatus() NativeModulesStatus {
	return NativeModulesStatus{
		ProbeEngine:       false,
		PortIOCP:          false,
		Discovery:         false,
		OuiTrie:           false,
		BannerGrabber:     false,
		PcapAnalyzer:      false,
		FingerprintEngine: true, // Go runtime pure implementation active
		TopologyGuard:     true, // Go runtime pure implementation active
		NpcapLoaded:       false,
	}
}

func tryNativeProbeFastPing(ip string, timeoutMs int) (float64, bool) {
	return -1.0, false
}

func tryNativeProbeResolveMac(ip string) (string, bool) {
	return "", false
}

func tryNativePortIOCPBatch(targetIp string, portList []int, timeoutMs int, maxConcurrency int) ([]int, bool) {
	return nil, false
}

type DeviceDiscoveryResult struct {
	Hostname            string `json:"hostname"`
	ModelName           string `json:"modelName"`
	Manufacturer        string `json:"manufacturer"`
	Workgroup           string `json:"workgroup"`
	ServiceType         string `json:"serviceType"`
	ProtocolsDiscovered int    `json:"protocolsDiscovered"`
}

func tryNativeDiscoveryProbe(targetIp string, timeoutMs int) (*DeviceDiscoveryResult, bool) {
	return nil, false
}

func tryNativeOuiTrieInit(databasePath string) (int, bool) {
	return 0, false
}

func tryNativeOuiTrieLookup(mac string) (string, bool) {
	return "", false
}

type DeepBannerInfo struct {
	ServerHeader     string `json:"serverHeader,omitempty"`
	HtmlTitle        string `json:"htmlTitle,omitempty"`
	SshBanner        string `json:"sshBanner,omitempty"`
	RtspServer       string `json:"rtspServer,omitempty"`
	TlsSubject       string `json:"tlsSubject,omitempty"`
	DetectedProtocol int    `json:"detectedProtocol"`
}

func tryNativeDeepBannerGrab(targetIp string, port int, timeoutMs int) (*DeepBannerInfo, bool) {
	return nil, false
}

func tryNativePcapDetectOS(targetIp string, port int, timeoutMs int) (string, int, bool) {
	return "", 0, false
}

func tryNativePcapDetectArpSpoof(targetIp string, expectedMac string) (string, bool) {
	return "", false
}

// ----------------------------------------------------------------------------
// 7. Device Fingerprinting & Security Heuristics API
// ----------------------------------------------------------------------------
type FingerprintAnalysisResult struct {
	CategoryCode       int    `json:"categoryCode"`
	CategoryName       string `json:"categoryName"`
	DetectedOS         string `json:"detectedOS"`
	HardwareModel      string `json:"hardwareModel"`
	ConfidencePercent  int    `json:"confidencePercent"`
	RiskLevel          string `json:"riskLevel"`
	RiskScore          int    `json:"riskScore"`
	VulnerabilityCount int    `json:"vulnerabilityCount"`
	Vulnerabilities    string `json:"vulnerabilities"`
	Recommendation     string `json:"recommendation"`
}

type rawFingerprintInput struct {
	IP           string `json:"ip"`
	MAC          string `json:"mac"`
	Vendor       string `json:"vendor"`
	Hostname     string `json:"hostname"`
	Workgroup    string `json:"workgroup"`
	ServerHeader string `json:"serverHeader"`
	SshBanner    string `json:"sshBanner"`
	RtspServer   string `json:"rtspServer"`
	TTL          int    `json:"ttl"`
	OpenPorts    []int  `json:"openPorts"`
}

// tryNativeFingerprintAnalyzeJson pure-Go high-speed fallback for non-Windows environments
func tryNativeFingerprintAnalyzeJson(inJson string) (*FingerprintAnalysisResult, bool) {
	var in rawFingerprintInput
	if err := json.Unmarshal([]byte(inJson), &in); err != nil {
		return nil, false
	}

	portsMap := make(map[int]bool)
	for _, p := range in.OpenPorts {
		portsMap[p] = true
	}

	res := FingerprintAnalysisResult{
		CategoryCode:      0,
		CategoryName:      "일반 네트워크 장비 (Generic Node)",
		DetectedOS:        "Unknown OS",
		HardwareModel:     "Network Node",
		ConfidencePercent: 50,
		RiskLevel:         "CLEAN",
		RiskScore:         0,
	}

	vLower := strings.ToLower(in.Vendor)
	hLower := strings.ToLower(in.Hostname)

	// Category Heuristics (aligned with grid_fingerprint_engine.c v2.5.1)
	if portsMap[9100] || portsMap[631] || portsMap[515] || strings.Contains(vLower, "canon") || strings.Contains(vLower, "epson") || strings.Contains(vLower, "hp") {
		res.CategoryCode = 5
		res.CategoryName = "네트워크 프린터 / 복합기 (Printer/MFP)"
		res.DetectedOS = "Embedded Printer RTOS"
		res.HardwareModel = in.Vendor + " Printer"
		res.ConfidencePercent = 95
	} else if portsMap[554] || portsMap[8000] || portsMap[8899] || portsMap[37777] || strings.Contains(vLower, "hikvision") || strings.Contains(vLower, "dahua") {
		res.CategoryCode = 4
		res.CategoryName = "CCTV / IP 카메라 / NVR (Surveillance)"
		res.DetectedOS = "Embedded Linux (IP Camera / ONVIF)"
		res.HardwareModel = in.Vendor + " Camera"
		res.ConfidencePercent = 95
	} else if portsMap[5000] || portsMap[5001] || strings.Contains(vLower, "synology") || strings.Contains(vLower, "qnap") {
		res.CategoryCode = 3
		res.CategoryName = "NAS / 네트워크 스토리지 (Storage)"
		res.DetectedOS = "Embedded Linux (NAS OS)"
		res.HardwareModel = in.Vendor + " NAS"
		res.ConfidencePercent = 95
	} else if portsMap[8008] || portsMap[8009] || portsMap[9080] || strings.Contains(vLower, "roku") || strings.Contains(vLower, "sonos") || strings.Contains(hLower, "chromecast") || strings.Contains(hLower, "bravia") {
		res.CategoryCode = 13
		res.CategoryName = "스마트 TV / 스트리밍 미디어 (Smart TV / Media)"
		res.DetectedOS = "Smart TV / Cast Embedded OS"
		res.HardwareModel = "Smart TV / Media Streamer"
		res.ConfidencePercent = 90
	} else if strings.Contains(vLower, "nintendo") || strings.Contains(hLower, "playstation") || strings.Contains(hLower, "xbox") || strings.Contains(hLower, "ps5") {
		res.CategoryCode = 14
		res.CategoryName = "게임 콘솔 (Game Console)"
		res.DetectedOS = "Console Embedded OS"
		res.HardwareModel = "Home Game Console"
		res.ConfidencePercent = 90
	} else if portsMap[1883] || portsMap[8883] || strings.Contains(vLower, "espressif") || strings.Contains(vLower, "tuya") {
		res.CategoryCode = 10
		res.CategoryName = "IoT / 스마트 홈 디바이스 (IoT Node)"
		res.DetectedOS = "IoT Firmware / MQTT RTOS"
		res.HardwareModel = "IoT Smart Sensor / Bridge"
		res.ConfidencePercent = 88
	} else if portsMap[135] || portsMap[445] || (in.TTL > 64 && in.TTL <= 128) {
		if portsMap[88] || portsMap[389] || strings.Contains(hLower, "dc") || strings.Contains(hLower, "server") {
			res.CategoryCode = 7
			res.CategoryName = "Windows 서버 / 도메인 컨트롤러 (Server)"
			res.DetectedOS = "Windows Server"
			res.HardwareModel = "Windows Server Host"
			res.ConfidencePercent = 92
		} else {
			res.CategoryCode = 6
			res.CategoryName = "Windows 데스크톱 / 노트북 (PC)"
			res.DetectedOS = "Windows 10 / 11"
			res.HardwareModel = "PC Workstation"
			res.ConfidencePercent = 90
		}
	} else if portsMap[22] || (in.TTL > 0 && in.TTL <= 64) {
		res.CategoryCode = 8
		res.CategoryName = "Linux 서버 / 어플라이언스 (Linux Node)"
		res.DetectedOS = "Linux (TTL 64)"
		res.HardwareModel = "Linux System"
		res.ConfidencePercent = 85
	}

	// Security Risk Assessment
	score := 0
	vulns := []string{}
	rec := "기본 보안 정책 및 방화벽 규칙을 유지하십시오."

	if portsMap[23] {
		score += 35
		vulns = append(vulns, "[CRITICAL] Telnet(23) 비암호화 터미널 노출 (패킷 가로채기 취약)")
		rec = "Telnet 서비스를 중지하고 SSH(22) 암호화 연결로 전환하십시오."
	}
	if portsMap[6379] {
		score += 35
		vulns = append(vulns, "[CRITICAL] Redis(6379) 비인증 외부 노출 위험")
		rec = "Redis 인증 비밀번호를 설정하고 127.0.0.1로 바인딩을 제한하십시오."
	}
	if portsMap[21] {
		score += 25
		vulns = append(vulns, "[HIGH] FTP(21) 평문 파일 전송 포트 개방")
	}
	if portsMap[5900] {
		score += 25
		vulns = append(vulns, "[HIGH] VNC(5900) 비암호화 원격 제어 포트 개방")
	}
	if portsMap[445] {
		score += 20
		vulns = append(vulns, "[HIGH] SMB(445) 윈도우 파일 공유 개방")
	}
	if portsMap[3389] {
		score += 15
		vulns = append(vulns, "[MEDIUM] RDP(3389) 원격 데스크톱 포트 개방")
	}

	if score > 100 {
		score = 100
	}
	res.RiskScore = score
	res.VulnerabilityCount = len(vulns)
	res.Vulnerabilities = strings.Join(vulns, "; ")
	res.Recommendation = rec

	if score == 0 {
		res.RiskLevel = "CLEAN"
	} else if score <= 20 {
		res.RiskLevel = "LOW"
	} else if score <= 50 {
		res.RiskLevel = "MEDIUM"
	} else if score <= 80 {
		res.RiskLevel = "HIGH"
	} else {
		res.RiskLevel = "CRITICAL"
	}

	return &res, true
}

// ----------------------------------------------------------------------------
// 8. Subnet Topology Guard, Conflict Hash & LAA Correlation API (Go Fallback)
// ----------------------------------------------------------------------------
type TopologyGuardAlert struct {
	IP              string `json:"ip"`
	DeltaStatus     int    `json:"deltaStatus"`
	AnomalyMask     uint32 `json:"anomalyMask"`
	SimilarityScore int    `json:"similarityScore"`
	IsSoftTrusted   bool   `json:"isSoftTrusted"`
	MatchedPrevIp   string `json:"matchedPrevIp"`
	Reason          string `json:"reason"`
}

type TopologyGuardAnalysisResult struct {
	Engine              string               `json:"engine"`
	Version             int                  `json:"version"`
	TotalEvaluated      int                  `json:"totalEvaluated"`
	NewCount            int                  `json:"newCount"`
	OfflineCount        int                  `json:"offlineCount"`
	ChangedCount        int                  `json:"changedCount"`
	SameCount           int                  `json:"sameCount"`
	ConflictCount       int                  `json:"conflictCount"`
	MultiIpMacCount     int                  `json:"multiIpMacCount"`
	LaaRandomCount      int                  `json:"laaRandomCount"`
	VirtualNicCount     int                  `json:"virtualNicCount"`
	HardIntruderCount   int                  `json:"hardIntruderCount"`
	SoftTrustedCount    int                  `json:"softTrustedCount"`
	HighRiskDeltaCount  int                  `json:"highRiskDeltaCount"`
	ElapsedMicroseconds uint64               `json:"elapsedMicroseconds"`
	Alerts              []TopologyGuardAlert `json:"alerts"`
}

type guardHostInput struct {
	IP        string `json:"ip"`
	MAC       string `json:"mac"`
	Hostname  string `json:"hostname"`
	Vendor    string `json:"vendor"`
	OpenPorts []int  `json:"openPorts"`
	IsTrusted bool   `json:"isTrusted"`
}

type guardTopologyInput struct {
	Current  []guardHostInput `json:"current"`
	Baseline []guardHostInput `json:"baseline"`
}

func analyzeGuardMac(raw string) (clean string, oui string, valid bool, isLaaRandom bool, isLaaVM bool) {
	var b strings.Builder
	for _, r := range raw {
		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F') {
			b.WriteRune(r)
		}
	}
	clean = strings.ToUpper(b.String())
	if len(clean) != 12 || clean == "000000000000" || clean == "FFFFFFFFFFFF" {
		return clean, "", false, false, false
	}
	oui = clean[:6]
	firstByte, err := strconv.ParseUint(clean[:2], 16, 8)
	if err != nil || (firstByte&0x01) != 0 {
		return clean, oui, false, false, false
	}
	valid = true
	if (firstByte & 0x02) != 0 {
		if strings.HasPrefix(clean, "525400") || strings.HasPrefix(clean, "0242") ||
			strings.HasPrefix(clean, "0A0027") || strings.HasPrefix(clean, "00155D") {
			isLaaVM = true
		} else {
			isLaaRandom = true
		}
	}
	return clean, oui, valid, isLaaRandom, isLaaVM
}

func normGuardHost(s string) string {
	n := strings.ToLower(strings.TrimSpace(s))
	n = strings.TrimSuffix(n, ".local")
	if n == "unknown" || n == "unknown device" || n == "-" {
		return ""
	}
	return n
}

func computeGuardSimilarity(cur, ref guardHostInput) (int, string) {
	curClean, curOui, curValid, curRand, _ := analyzeGuardMac(cur.MAC)
	refClean, refOui, refValid, refRand, _ := analyzeGuardMac(ref.MAC)
	if curValid && refValid && curClean == refClean {
		return 100, "MAC 주소 완전 일치 (100%)"
	}

	score := 0
	var reasons []string
	curH := normGuardHost(cur.Hostname)
	refH := normGuardHost(ref.Hostname)
	if curH != "" && refH != "" && curH == refH {
		score += 50
		reasons = append(reasons, "호스트명 일치")
	}

	if cur.Vendor != "" && ref.Vendor != "" &&
		!strings.EqualFold(cur.Vendor, "Unknown Vendor") &&
		!strings.EqualFold(cur.Vendor, "Randomized MAC (LAA)") &&
		strings.EqualFold(cur.Vendor, ref.Vendor) {
		score += 35
		reasons = append(reasons, "제조사 동일")
	} else if curValid && refValid && curOui == refOui {
		score += 30
		reasons = append(reasons, "OUI 옥텟 일치")
	}

	if len(cur.OpenPorts) > 0 && len(ref.OpenPorts) > 0 {
		refSet := make(map[int]bool, len(ref.OpenPorts))
		for _, p := range ref.OpenPorts {
			refSet[p] = true
		}
		overlap := 0
		for _, p := range cur.OpenPorts {
			if refSet[p] {
				overlap++
			}
		}
		if overlap > 0 {
			maxP := len(cur.OpenPorts)
			if len(ref.OpenPorts) > maxP {
				maxP = len(ref.OpenPorts)
			}
			bonus := (overlap * 25) / maxP
			if bonus < 10 {
				bonus = 10
			}
			score += bonus
			reasons = append(reasons, "개방 포트 프로파일 유사")
		}
	}

	if (curRand || refRand) && score > 0 {
		score += 15
		reasons = append(reasons, "LAA 랜덤 MAC 전환 보정")
	}
	if score > 95 {
		score = 95
	}
	if len(reasons) == 0 {
		return score, "유사 패턴 없음"
	}
	return score, strings.Join(reasons, " + ")
}

func isHighRiskDeltaPort(p int) bool {
	switch p {
	case 21, 22, 23, 80, 445, 1433, 3306, 3389, 5900, 6379, 8080:
		return true
	}
	return false
}

func tryNativeTopologyGuardAnalyzeJson(inJson string) (*TopologyGuardAnalysisResult, bool) {
	tStart := time.Now()
	var input guardTopologyInput
	if err := json.Unmarshal([]byte(inJson), &input); err != nil {
		return nil, false
	}

	baseMap := make(map[string]guardHostInput, len(input.Baseline))
	for _, b := range input.Baseline {
		if b.IP != "" {
			baseMap[b.IP] = b
		}
	}
	curIpMap := make(map[string]bool, len(input.Current))
	macCountMap := make(map[string]int, len(input.Current))
	for _, c := range input.Current {
		if c.IP != "" {
			curIpMap[c.IP] = true
		}
		clean, _, valid, _, _ := analyzeGuardMac(c.MAC)
		if valid {
			macCountMap[clean]++
		}
	}

	res := &TopologyGuardAnalysisResult{
		Engine:  "grid_topology_guard.dll (Go Fallback)",
		Version: 20600,
		Alerts:  []TopologyGuardAlert{},
	}

	for _, cur := range input.Current {
		if cur.IP == "" {
			continue
		}
		cleanMac, _, macValid, isLaaRandom, isLaaVM := analyzeGuardMac(cur.MAC)
		if isLaaRandom {
			res.LaaRandomCount++
		}
		if isLaaVM {
			res.VirtualNicCount++
		}

		alert := TopologyGuardAlert{IP: cur.IP}
		if macValid && macCountMap[cleanMac] > 1 {
			alert.AnomalyMask |= 2 // MULTI_IP_MAC
			res.MultiIpMacCount++
			alert.Reason = fmt.Sprintf("동일 MAC[%s] 다중 IP 점유 감지 (Proxy-ARP 또는 충돌)", cur.MAC)
		}

		base, exists := baseMap[cur.IP]
		if !exists {
			alert.DeltaStatus = 2 // NEW
			res.NewCount++
			if !cur.IsTrusted {
				bestSim := 0
				bestPrevIp := ""
				bestReason := ""
				for _, b := range input.Baseline {
					sim, r := computeGuardSimilarity(cur, b)
					if sim > bestSim {
						bestSim = sim
						bestPrevIp = b.IP
						bestReason = r
					}
				}
				if bestSim >= 50 {
					alert.IsSoftTrusted = true
					alert.SimilarityScore = bestSim
					alert.MatchedPrevIp = bestPrevIp
					alert.AnomalyMask |= 8 // LAA_CHURN
					res.SoftTrustedCount++
					alert.Reason = fmt.Sprintf("소프트 신뢰 유예 (%d%%): %s (기존 IP %s)", bestSim, bestReason, bestPrevIp)
				} else if isLaaRandom {
					alert.AnomalyMask |= (8 | 16)
					res.HardIntruderCount++
					alert.Reason = fmt.Sprintf("미등록 LAA 랜덤 MAC 신규 접속 탐지 (%s)", cur.MAC)
				} else {
					alert.AnomalyMask |= 16
					res.HardIntruderCount++
					alert.Reason = "기준 스냅샷 미등록 신규 단말 접속"
				}
			} else {
				alert.Reason = "신뢰 등록 신규 활성 단말"
			}
		} else {
			baseClean, _, baseValid, _, _ := analyzeGuardMac(base.MAC)
			macDiff := macValid && baseValid && cleanMac != baseClean

			basePorts := make(map[int]bool, len(base.OpenPorts))
			for _, p := range base.OpenPorts {
				basePorts[p] = true
			}
			portDiff := len(cur.OpenPorts) != len(base.OpenPorts)
			riskyAdded := false
			for _, p := range cur.OpenPorts {
				if !basePorts[p] {
					portDiff = true
					if isHighRiskDeltaPort(p) {
						riskyAdded = true
					}
				}
			}

			curH := normGuardHost(cur.Hostname)
			baseH := normGuardHost(base.Hostname)
			hostDiff := curH != "" && baseH != "" && curH != baseH

			if macDiff || portDiff || hostDiff {
				alert.DeltaStatus = 4 // CHANGED
				res.ChangedCount++
				if macDiff {
					alert.AnomalyMask |= 1 // IP_TAKEOVER
					res.ConflictCount++
					res.HighRiskDeltaCount++
					alert.Reason = fmt.Sprintf("IP 점유 MAC 변조 감지 (%s -> %s)", base.MAC, cur.MAC)
				} else if riskyAdded {
					alert.AnomalyMask |= 4 // RISKY_PORT_OPEN
					res.HighRiskDeltaCount++
					alert.Reason = "고위험 보안 포트 신규 개방 감지"
				} else if portDiff {
					alert.Reason = "개방 포트 목록 변동"
				} else {
					alert.Reason = "호스트 식별자(Hostname) 변동"
				}
			} else {
				alert.DeltaStatus = 1 // SAME
				res.SameCount++
				alert.Reason = "기준 스냅샷과 상태 일치"
			}
		}

		res.TotalEvaluated++
		if (alert.AnomalyMask != 0 || alert.DeltaStatus == 4) && len(res.Alerts) < 20 {
			res.Alerts = append(res.Alerts, alert)
		}
	}

	for _, b := range input.Baseline {
		if b.IP != "" && !curIpMap[b.IP] {
			res.OfflineCount++
			res.TotalEvaluated++
		}
	}

	res.ElapsedMicroseconds = uint64(time.Since(tStart).Microseconds())
	return res, true
}

