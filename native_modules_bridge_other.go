//go:build !windows
// +build !windows

package main

import (
	"encoding/json"
	"strings"
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

	// Category Heuristics
	if portsMap[9100] || portsMap[631] || portsMap[515] || strings.Contains(vLower, "canon") || strings.Contains(vLower, "epson") || strings.Contains(vLower, "hp") {
		res.CategoryCode = 5
		res.CategoryName = "네트워크 프린터 / 복합기 (Printer/MFP)"
		res.DetectedOS = "Embedded Printer RTOS"
		res.HardwareModel = in.Vendor + " Printer"
		res.ConfidencePercent = 95
	} else if portsMap[554] || portsMap[8000] || strings.Contains(vLower, "hikvision") || strings.Contains(vLower, "dahua") {
		res.CategoryCode = 4
		res.CategoryName = "CCTV / IP 카메라 / NVR (Surveillance)"
		res.DetectedOS = "Embedded Linux (IP Camera)"
		res.HardwareModel = in.Vendor + " Camera"
		res.ConfidencePercent = 95
	} else if portsMap[5000] || portsMap[5001] || strings.Contains(vLower, "synology") || strings.Contains(vLower, "qnap") {
		res.CategoryCode = 3
		res.CategoryName = "NAS / 네트워크 스토리지 (Storage)"
		res.DetectedOS = "Embedded Linux (NAS OS)"
		res.HardwareModel = in.Vendor + " NAS"
		res.ConfidencePercent = 95
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
