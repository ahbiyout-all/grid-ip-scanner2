//go:build windows
// +build windows

package main

import (
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"
)

// ============================================================================
// Grid IP Scanner2 - Native Multi-Module DLL Bridge (Windows x64)
// Implements Go FFI bindings for the 8 specialized native modules:
//   1. grid_probe_engine.dll
//   2. grid_port_iocp.dll
//   3. grid_discovery.dll
//   4. grid_oui_trie.dll
//   5. grid_banner_grabber.dll
//   6. grid_pcap_analyzer.dll
//   7. grid_fingerprint_engine.dll
//   8. grid_topology_guard.dll (Pure Custom Subnet Topology Diff & LAA Guard)
// ============================================================================

var dllDirHardenOnce sync.Once

func resolveSystemDllPath(dllName string) string {
	sysRoot := os.Getenv("SystemRoot")
	if sysRoot == "" {
		sysRoot = `C:\Windows`
	}
	return filepath.Join(sysRoot, "System32", dllName)
}

func hardenWindowsDllSearchOrder() {
	dllDirHardenOnce.Do(func() {
		k32 := syscall.NewLazyDLL(resolveSystemDllPath("kernel32.dll"))
		procSetDef := k32.NewProc("SetDefaultDllDirectories")
		// LOAD_LIBRARY_SEARCH_DEFAULT_DIRS = 0x00001000 (excludes CWD)
		if procSetDef.Find() == nil {
			procSetDef.Call(uintptr(0x00001000))
		}
		if exe, err := os.Executable(); err == nil {
			exeDir := filepath.Dir(exe)
			procAddDir := k32.NewProc("AddDllDirectory")
			if procAddDir.Find() == nil {
				if p1, err1 := syscall.UTF16PtrFromString(exeDir); err1 == nil {
					procAddDir.Call(uintptr(unsafe.Pointer(p1)))
				}
				nativeSub := filepath.Join(exeDir, "native_dll")
				if _, statErr := os.Stat(nativeSub); statErr == nil {
					if p2, err2 := syscall.UTF16PtrFromString(nativeSub); err2 == nil {
						procAddDir.Call(uintptr(unsafe.Pointer(p2)))
					}
				}
			}
		}
	})
}

func resolveNativeDllPath(dllName string) string {
	hardenWindowsDllSearchOrder()
	exe, err := os.Executable()
	if err != nil {
		return dllName
	}
	exeDir := filepath.Dir(exe)
	direct := filepath.Join(exeDir, dllName)
	if _, statErr := os.Stat(direct); statErr == nil {
		return direct
	}
	sub := filepath.Join(exeDir, "native_dll", dllName)
	if _, statErr := os.Stat(sub); statErr == nil {
		return sub
	}
	// Keep pinned to exeDir so Load() will not fall back to searching CWD
	return direct
}

// Native C structs mapping
type NativeProbeHostResult struct {
	IP         [32]byte
	MAC        [24]byte
	RttMs      float64
	IsAlive    int32
	IsArpAlive int32
}

type NativeDeviceDiscoveryInfo struct {
	Hostname            [128]byte
	ModelName           [128]byte
	Manufacturer        [128]byte
	Workgroup           [64]byte
	ServiceType         [64]byte
	ProtocolsDiscovered int32
}

type NativeDeepBannerResult struct {
	ServerHeader     [128]byte
	HtmlTitle        [128]byte
	SshBanner        [128]byte
	RtspServer       [128]byte
	TlsSubject       [128]byte
	DetectedProtocol int32
}

var (
	// Module 1: grid_probe_engine.dll
	modGridProbe              = syscall.NewLazyDLL(resolveNativeDllPath("grid_probe_engine.dll"))
	procProbeGetVersion       = modGridProbe.NewProc("Probe_GetDriverVersion")
	procProbeFastPing         = modGridProbe.NewProc("Probe_FastPing")
	procProbeResolveMac       = modGridProbe.NewProc("Probe_ResolveMac")
	procProbeSweepSubnet      = modGridProbe.NewProc("Probe_SweepSubnetAsync")
	procProbeBatchSweep       = modGridProbe.NewProc("Probe_BatchSweep")
	procProbeSweepCidrAsync   = modGridProbe.NewProc("Probe_SweepCidrAsyncBatch")

	// Module 2: grid_port_iocp.dll
	modGridPortIOCP             = syscall.NewLazyDLL(resolveNativeDllPath("grid_port_iocp.dll"))
	procPortScanGetVersion      = modGridPortIOCP.NewProc("PortScan_GetVersion")
	procPortScanRunBatch        = modGridPortIOCP.NewProc("PortScan_RunBatch")
	procPortScanProbeSingle     = modGridPortIOCP.NewProc("PortScan_ProbeSingle")
	procPortScanIocpMultiHost   = modGridPortIOCP.NewProc("PortScan_IocpMultiHostSweep")

	// Module 3: grid_discovery.dll
	modGridDiscovery           = syscall.NewLazyDLL(resolveNativeDllPath("grid_discovery.dll"))
	procDiscoveryGetVersion    = modGridDiscovery.NewProc("Discovery_GetVersion")
	procDiscoveryProbeHost     = modGridDiscovery.NewProc("Discovery_ProbeHost")
	procDiscoveryQueryNetBIOS  = modGridDiscovery.NewProc("Discovery_QueryNetBIOS")
	procDiscoveryQueryMDNS     = modGridDiscovery.NewProc("Discovery_QueryMDNS")
	procDiscoveryQuerySSDP     = modGridDiscovery.NewProc("Discovery_QuerySSDP")

	// Module 4: grid_oui_trie.dll
	modGridOuiTrie          = syscall.NewLazyDLL(resolveNativeDllPath("grid_oui_trie.dll"))
	procOuiGetVersion       = modGridOuiTrie.NewProc("Oui_GetVersion")
	procOuiInitialize       = modGridOuiTrie.NewProc("Oui_Initialize")
	procOuiLookupVendor     = modGridOuiTrie.NewProc("Oui_LookupVendor")
	procOuiGetEntryCount    = modGridOuiTrie.NewProc("Oui_GetEntryCount")
	procOuiRelease          = modGridOuiTrie.NewProc("Oui_Release")

	// Module 5: grid_banner_grabber.dll
	modGridBanner          = syscall.NewLazyDLL(resolveNativeDllPath("grid_banner_grabber.dll"))
	procBannerGetVersion   = modGridBanner.NewProc("Banner_GetVersion")
	procBannerGrabHttp     = modGridBanner.NewProc("Banner_GrabHttp")
	procBannerGrabSsh      = modGridBanner.NewProc("Banner_GrabSsh")
	procBannerGrabRtsp     = modGridBanner.NewProc("Banner_GrabRtsp")
	procBannerGrabTlsSni   = modGridBanner.NewProc("Banner_GrabTlsSni")
	procBannerGrabDeepAll  = modGridBanner.NewProc("Banner_GrabDeepAll")

	// Module 6: grid_pcap_analyzer.dll
	modGridPcap             = syscall.NewLazyDLL(resolveNativeDllPath("grid_pcap_analyzer.dll"))
	procPcapGetVersion      = modGridPcap.NewProc("Pcap_GetVersion")
	procPcapIsAvailable     = modGridPcap.NewProc("Pcap_IsNpcapAvailable")
	procPcapDetectOS        = modGridPcap.NewProc("Pcap_DetectOSFromSynAck")
	procPcapDetectArpSpoof  = modGridPcap.NewProc("Pcap_DetectArpSpoofing")

	// Module 7: grid_fingerprint_engine.dll (Pure Creative Native Heuristic & Security Engine)
	modGridFingerprint         = syscall.NewLazyDLL(resolveNativeDllPath("grid_fingerprint_engine.dll"))
	procFingerprintGetVersion  = modGridFingerprint.NewProc("Fingerprint_GetDriverVersion")
	procFingerprintAnalyzeJson = modGridFingerprint.NewProc("Fingerprint_AnalyzeJson")

	// Module 8: grid_topology_guard.dll (Pure Custom Native Topology Diff & LAA Guard)
	modGridTopologyGuard         = syscall.NewLazyDLL(resolveNativeDllPath("grid_topology_guard.dll"))
	procTopologyGuardGetVersion  = modGridTopologyGuard.NewProc("Guard_GetDriverVersion")
	procTopologyGuardAnalyzeJson = modGridTopologyGuard.NewProc("Guard_AnalyzeTopologyJson")
)

// Check native modules status
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
	st := NativeModulesStatus{
		ProbeEngine:       modGridProbe.Load() == nil,
		PortIOCP:          modGridPortIOCP.Load() == nil,
		Discovery:         modGridDiscovery.Load() == nil,
		OuiTrie:           modGridOuiTrie.Load() == nil,
		BannerGrabber:     modGridBanner.Load() == nil,
		PcapAnalyzer:      modGridPcap.Load() == nil,
		FingerprintEngine: modGridFingerprint.Load() == nil,
		TopologyGuard:     modGridTopologyGuard.Load() == nil,
		NpcapLoaded:       false,
	}

	if st.PcapAnalyzer && procPcapIsAvailable.Find() == nil {
		ret, _, _ := procPcapIsAvailable.Call()
		st.NpcapLoaded = (ret != 0)
	}

	return st
}

// ----------------------------------------------------------------------------
// 1. Probe Engine API
// ----------------------------------------------------------------------------
type NativeProbeBatchHint struct {
	IP         string
	MAC        string
	RttMs      float64
	IsAlive    bool
	IsArpAlive bool
}

func ipv4ToNetUint32(ipStr string) (uint32, bool) {
	parsed := net.ParseIP(ipStr)
	if parsed == nil {
		return 0, false
	}
	ip4 := parsed.To4()
	if ip4 == nil {
		return 0, false
	}
	// Little-endian uint32 representing network byte order in memory [b0, b1, b2, b3]
	return uint32(ip4[0]) | uint32(ip4[1])<<8 | uint32(ip4[2])<<16 | uint32(ip4[3])<<24, true
}

func hasNativeProbeEngine() bool {
	return procProbeFastPing.Find() == nil
}

func tryNativeProbeFastPing(ip string, timeoutMs int) (float64, bool) {
	if procProbeFastPing.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			var rtt float64
			ret, _, _ := procProbeFastPing.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&rtt)),
			)
			if int32(ret) == 0 {
				return rtt, true
			}
		}
	}
	return -1.0, false
}

func tryNativeProbeResolveMac(ip string) (string, bool) {
	if procProbeResolveMac.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			buf := make([]byte, 32)
			ret, _, _ := procProbeResolveMac.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(unsafe.Pointer(&buf[0])),
				uintptr(len(buf)),
			)
			if ret != 0 {
				mac := byteSliceToString(buf)
				if mac != "" {
					return mac, true
				}
			}
		}
	}
	return "", false
}

func tryNativeProbeAsyncBatch(ips []string, timeoutMs int) (map[string]NativeProbeBatchHint, bool) {
	if len(ips) == 0 || procProbeSweepCidrAsync.Find() != nil {
		return nil, false
	}

	netIps := make([]uint32, 0, len(ips))
	validIpStrs := make([]string, 0, len(ips))
	for _, s := range ips {
		if u, ok := ipv4ToNetUint32(s); ok {
			netIps = append(netIps, u)
			validIpStrs = append(validIpStrs, s)
		}
	}
	if len(netIps) == 0 {
		return nil, false
	}

	outResults := make([]NativeProbeHostResult, len(netIps))
	ret, _, _ := procProbeSweepCidrAsync.Call(
		uintptr(unsafe.Pointer(&netIps[0])),
		uintptr(len(netIps)),
		uintptr(timeoutMs),
		uintptr(unsafe.Pointer(&outResults[0])),
		uintptr(len(outResults)),
	)
	if ret == 0 {
		return nil, false
	}

	hints := make(map[string]NativeProbeBatchHint, len(validIpStrs))
	for i, ip := range validIpStrs {
		r := outResults[i]
		hints[ip] = NativeProbeBatchHint{
			IP:         ip,
			MAC:        byteSliceToString(r.MAC[:]),
			RttMs:      r.RttMs,
			IsAlive:    r.IsAlive != 0,
			IsArpAlive: r.IsArpAlive != 0,
		}
	}
	return hints, true
}

// ----------------------------------------------------------------------------
// 2. Port IOCP API
// ----------------------------------------------------------------------------
func tryNativePortIOCPBatch(targetIp string, portList []int, timeoutMs int, maxConcurrency int) ([]int, bool) {
	if len(portList) == 0 || procPortScanRunBatch.Find() != nil {
		return nil, false
	}

	ipPtr, err := syscall.BytePtrFromString(targetIp)
	if err != nil {
		return nil, false
	}

	cPorts := make([]int32, len(portList))
	for i, p := range portList {
		cPorts[i] = int32(p)
	}

	outPorts := make([]int32, len(portList))
	var outCount int32 = 0

	ret, _, _ := procPortScanRunBatch.Call(
		uintptr(unsafe.Pointer(ipPtr)),
		uintptr(unsafe.Pointer(&cPorts[0])),
		uintptr(len(cPorts)),
		uintptr(timeoutMs),
		uintptr(maxConcurrency),
		uintptr(unsafe.Pointer(&outPorts[0])),
		uintptr(unsafe.Pointer(&outCount)),
	)

	if ret != 0 {
		limit := int(outCount)
		if limit < 0 {
			limit = 0
		}
		if limit > len(outPorts) {
			limit = len(outPorts)
		}
		result := make([]int, 0, limit)
		for i := 0; i < limit; i++ {
			result = append(result, int(outPorts[i]))
		}
		return result, true
	}

	return nil, false
}

func tryNativePortIocpMultiHost(ips []string, ports []int, timeoutMs int, maxInFlight int) (map[string][]int, bool) {
	if len(ips) == 0 || len(ports) == 0 || len(ports) > 64 || procPortScanIocpMultiHost.Find() != nil {
		return nil, false
	}

	netIps := make([]uint32, 0, len(ips))
	validIpStrs := make([]string, 0, len(ips))
	for _, s := range ips {
		if u, ok := ipv4ToNetUint32(s); ok {
			netIps = append(netIps, u)
			validIpStrs = append(validIpStrs, s)
		}
	}
	if len(netIps) == 0 {
		return nil, false
	}

	uPorts := make([]uint16, len(ports))
	for i, p := range ports {
		uPorts[i] = uint16(p)
	}

	bitmasks := make([]uint64, len(netIps))
	ret, _, _ := procPortScanIocpMultiHost.Call(
		uintptr(unsafe.Pointer(&netIps[0])),
		uintptr(len(netIps)),
		uintptr(unsafe.Pointer(&uPorts[0])),
		uintptr(len(uPorts)),
		uintptr(timeoutMs),
		uintptr(maxInFlight),
		uintptr(unsafe.Pointer(&bitmasks[0])),
	)
	if ret == 0 {
		return nil, false
	}

	res := make(map[string][]int, len(validIpStrs))
	for hIdx, ip := range validIpStrs {
		mask := bitmasks[hIdx]
		var open []int
		for pIdx, p := range ports {
			if (mask & (uint64(1) << uint(pIdx))) != 0 {
				open = append(open, p)
			}
		}
		res[ip] = open
	}
	return res, true
}

// ----------------------------------------------------------------------------
// 3. Discovery API (mDNS, SSDP, LLMNR, NetBIOS)
// ----------------------------------------------------------------------------
type DeviceDiscoveryResult struct {
	Hostname            string `json:"hostname"`
	ModelName           string `json:"modelName"`
	Manufacturer        string `json:"manufacturer"`
	Workgroup           string `json:"workgroup"`
	ServiceType         string `json:"serviceType"`
	ProtocolsDiscovered int    `json:"protocolsDiscovered"`
}

func tryNativeDiscoveryProbe(targetIp string, timeoutMs int) (*DeviceDiscoveryResult, bool) {
	if procDiscoveryProbeHost.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(targetIp)
		if err == nil {
			var info NativeDeviceDiscoveryInfo
			ret, _, _ := procDiscoveryProbeHost.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&info)),
			)
			if ret != 0 {
				return &DeviceDiscoveryResult{
					Hostname:            byteSliceToString(info.Hostname[:]),
					ModelName:           byteSliceToString(info.ModelName[:]),
					Manufacturer:        byteSliceToString(info.Manufacturer[:]),
					Workgroup:           byteSliceToString(info.Workgroup[:]),
					ServiceType:         byteSliceToString(info.ServiceType[:]),
					ProtocolsDiscovered: int(info.ProtocolsDiscovered),
				}, true
			}
		}
	}
	return nil, false
}

// ----------------------------------------------------------------------------
// 4. OUI Radix-Trie API
// ----------------------------------------------------------------------------
func tryNativeOuiTrieInit(databasePath string) (int, bool) {
	if procOuiInitialize.Find() == nil {
		pathPtr, _ := syscall.BytePtrFromString(databasePath)
		ret, _, _ := procOuiInitialize.Call(uintptr(unsafe.Pointer(pathPtr)))
		return int(ret), true
	}
	return 0, false
}

func tryNativeOuiTrieLookup(mac string) (string, bool) {
	if procOuiLookupVendor.Find() == nil {
		macPtr, err := syscall.BytePtrFromString(mac)
		if err == nil {
			buf := make([]byte, 128)
			ret, _, _ := procOuiLookupVendor.Call(
				uintptr(unsafe.Pointer(macPtr)),
				uintptr(unsafe.Pointer(&buf[0])),
				uintptr(len(buf)),
			)
			if ret != 0 {
				vendor := byteSliceToString(buf)
				if vendor != "" {
					return vendor, true
				}
			}
		}
	}
	return "", false
}

// ----------------------------------------------------------------------------
// 5. Deep Banner Grabber API
// ----------------------------------------------------------------------------
type DeepBannerInfo struct {
	ServerHeader     string `json:"serverHeader,omitempty"`
	HtmlTitle        string `json:"htmlTitle,omitempty"`
	SshBanner        string `json:"sshBanner,omitempty"`
	RtspServer       string `json:"rtspServer,omitempty"`
	TlsSubject       string `json:"tlsSubject,omitempty"`
	DetectedProtocol int    `json:"detectedProtocol"`
}

func tryNativeDeepBannerGrab(targetIp string, port int, timeoutMs int) (*DeepBannerInfo, bool) {
	if procBannerGrabDeepAll.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(targetIp)
		if err == nil {
			var res NativeDeepBannerResult
			ret, _, _ := procBannerGrabDeepAll.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(port),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&res)),
			)
			if ret != 0 {
				return &DeepBannerInfo{
					ServerHeader:     byteSliceToString(res.ServerHeader[:]),
					HtmlTitle:        byteSliceToString(res.HtmlTitle[:]),
					SshBanner:        byteSliceToString(res.SshBanner[:]),
					RtspServer:       byteSliceToString(res.RtspServer[:]),
					TlsSubject:       byteSliceToString(res.TlsSubject[:]),
					DetectedProtocol: int(res.DetectedProtocol),
				}, true
			}
		}
	}
	return nil, false
}

// ----------------------------------------------------------------------------
// 6. PCAP Analyzer & OS Detection API
// ----------------------------------------------------------------------------
func tryNativePcapDetectOS(targetIp string, port int, timeoutMs int) (string, int, bool) {
	if procPcapDetectOS.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(targetIp)
		if err == nil {
			osBuf := make([]byte, 128)
			var ttl int32 = 0
			ret, _, _ := procPcapDetectOS.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(port),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&osBuf[0])),
				uintptr(len(osBuf)),
				uintptr(unsafe.Pointer(&ttl)),
			)
			if ret != 0 {
				osName := byteSliceToString(osBuf)
				return osName, int(ttl), true
			}
		}
	}
	return "", 0, false
}

func tryNativePcapDetectArpSpoof(targetIp string, expectedMac string) (string, bool) {
	if procPcapDetectArpSpoof.Find() == nil {
		ipPtr, err1 := syscall.BytePtrFromString(targetIp)
		macPtr, err2 := syscall.BytePtrFromString(expectedMac)
		if err1 == nil && err2 == nil {
			alertBuf := make([]byte, 256)
			ret, _, _ := procPcapDetectArpSpoof.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(unsafe.Pointer(macPtr)),
				uintptr(unsafe.Pointer(&alertBuf[0])),
				uintptr(len(alertBuf)),
			)
			if ret != 0 {
				msg := byteSliceToString(alertBuf)
				return msg, true
			}
		}
	}
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

func tryNativeFingerprintAnalyzeJson(inJson string) (*FingerprintAnalysisResult, bool) {
	if procFingerprintAnalyzeJson.Find() == nil {
		inPtr, err := syscall.BytePtrFromString(inJson)
		if err == nil {
			outBuf := make([]byte, 2048)
			ret, _, _ := procFingerprintAnalyzeJson.Call(
				uintptr(unsafe.Pointer(inPtr)),
				uintptr(unsafe.Pointer(&outBuf[0])),
				uintptr(len(outBuf)),
			)
			if ret != 0 {
				jsonStr := byteSliceToString(outBuf)
				if len(jsonStr) > 0 {
					var res FingerprintAnalysisResult
					if json.Unmarshal([]byte(jsonStr), &res) == nil {
						return &res, true
					}
				}
			}
		}
	}
	return nil, false
}

// ----------------------------------------------------------------------------
// 8. Subnet Topology Guard, Conflict Hash & LAA Correlation API
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
	ProxyArpInfoCount   int                  `json:"proxyArpInfoCount"`
	LaaRandomCount      int                  `json:"laaRandomCount"`
	VirtualNicCount     int                  `json:"virtualNicCount"`
	HardIntruderCount   int                  `json:"hardIntruderCount"`
	SoftTrustedCount    int                  `json:"softTrustedCount"`
	HighRiskDeltaCount  int                  `json:"highRiskDeltaCount"`
	ElapsedMicroseconds uint64               `json:"elapsedMicroseconds"`
	Alerts              []TopologyGuardAlert `json:"alerts"`
}

func tryNativeTopologyGuardAnalyzeJson(inJson string) (*TopologyGuardAnalysisResult, bool) {
	if procTopologyGuardAnalyzeJson.Find() == nil {
		inPtr, err := syscall.BytePtrFromString(inJson)
		if err == nil {
			outBuf := make([]byte, 65536)
			ret, _, _ := procTopologyGuardAnalyzeJson.Call(
				uintptr(unsafe.Pointer(inPtr)),
				uintptr(unsafe.Pointer(&outBuf[0])),
				uintptr(len(outBuf)),
			)
			if ret != 0 {
				jsonStr := byteSliceToString(outBuf)
				if len(jsonStr) > 0 {
					var res TopologyGuardAnalysisResult
					if json.Unmarshal([]byte(jsonStr), &res) == nil {
						return &res, true
					}
				}
			}
		}
	}
	return nil, false
}

