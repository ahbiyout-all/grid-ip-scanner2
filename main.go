
package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed all:dist
var content embed.FS

var defaultPort = "3031"

//go:embed master_oui.txt
var ouiData string

type ScanResult struct {
	IP        string `json:"ip"`
	Alive     bool   `json:"alive"`
	Latency   int    `json:"latency"`
	MAC       string `json:"mac"`
	Vendor    string `json:"vendor"`
	Hostname  string `json:"hostname"`
	WebTitle  string `json:"webTitle"`
	OpenPorts []int  `json:"openPorts"`
	MDNS      string `json:"mdns"`
	UPnP      string `json:"upnp"`
	SNMP      string `json:"snmp"`
}

type InterfaceInfo struct {
	Name      string   `json:"name"`
	IP        string   `json:"ip"`
	IPv6      string   `json:"ipv6,omitempty"`
	Subnet    string   `json:"subnet"`
	CIDR      string   `json:"cidr,omitempty"`
	MAC       string   `json:"mac,omitempty"`
	Status    string   `json:"status"` // "up", "down"
	Type      string   `json:"type"`   // "physical", "virtual", "loopback", "vpn", "other"
	MTU       int      `json:"mtu"`
	Flags     []string `json:"flags,omitempty"`
	IsDefault bool     `json:"isDefault"`
}

type LocalInfo struct {
	IP                 string          `json:"ip"`
	Subnet             string          `json:"subnet"`
	Interfaces         []InterfaceInfo `json:"interfaces"`
	IsAdmin            bool            `json:"isAdmin"`
	OUICount           int             `json:"ouiCount"`
	OUISource          string          `json:"ouiSource"`
	OUICachePath       string          `json:"ouiCachePath"`
	OUIDatabaseLocation string         `json:"ouiDatabaseLocation"`
	ComputerName       string          `json:"computerName"`
}

// OUIProvider defines the interface for manufacturer lookup
type OUIProvider interface {
	Lookup(mac string) string
	EntryCount() int
}

// MapOUIProvider implements OUIProvider using an in-memory map
type MapOUIProvider struct {
	data map[string]string
}

func (p *MapOUIProvider) Lookup(mac string) string {
	if mac == "" || mac == "Unknown" {
		return "Unknown"
	}
	cleanMac := strings.ToUpper(strings.ReplaceAll(strings.ReplaceAll(mac, ":", ""), "-", ""))
	
	// Support IEEE standard assignment lengths:
	// MA-S: 36 bits (9 hex digits)
	// MA-M: 28 bits (7 hex digits)
	// MA-L: 24 bits (6 hex digits)
	
	lengths := []int{12, 9, 8, 7, 6}
	for _, l := range lengths {
		if len(cleanMac) >= l {
			prefix := cleanMac[:l]
			if vendor, ok := p.data[prefix]; ok {
				return vendor
			}
		}
	}
	
	return "Unknown Vendor"
}

func (p *MapOUIProvider) EntryCount() int {
	return len(p.data)
}

var (
	currentOUIProvider OUIProvider
	currentOUISource   string
	ouiMutex           sync.RWMutex
	lastHeartbeat      = time.Now()
	heartbeatMutex     sync.Mutex
	tempDir            string
	emergencyMode      bool
	emergencyModeMutex sync.Mutex
)

func getOUICachePath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "master_oui.txt"
	}
	configDir := filepath.Join(homeDir, ".cisnet_grid")
	os.MkdirAll(configDir, 0755)
	return filepath.Join(configDir, "master_oui.txt")
}

func parseOUIData(data string, m map[string]string) {
	// Normalize line endings to handle \r\n (Windows) and \r (Mac)
	data = strings.ReplaceAll(data, "\r\n", "\n")
	data = strings.ReplaceAll(data, "\r", "\n")
	lines := strings.Split(data, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}
		
		// 1. Try IEEE standard format: "00-22-72   (hex)		American Micro-Fuel Device Corp."
		if strings.Contains(line, "(hex)") {
			parts := strings.SplitN(line, "(hex)", 2)
			if len(parts) == 2 {
				macPrefix := strings.ToUpper(strings.TrimSpace(parts[0]))
				macPrefix = strings.ReplaceAll(strings.ReplaceAll(macPrefix, "-", ""), ":", "")
				if len(macPrefix) >= 6 {
					m[macPrefix] = strings.TrimSpace(parts[1])
				}
			}
			continue
		}

		// 2. Try tab-separated format (Wireshark manuf: MAC\tShortName\tFullName or standard: MAC\tFullName)
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			rawPrefix := strings.ToUpper(strings.TrimSpace(parts[0]))
			rawPrefix = strings.Trim(rawPrefix, "\"")
			vendor := strings.TrimSpace(parts[len(parts)-1])
			if len(parts) >= 3 && vendor == "" {
				vendor = strings.TrimSpace(parts[1])
			}
			vendor = strings.Trim(vendor, "\"")
			
			maskLen := 0
			if strings.Contains(rawPrefix, "/") {
				subParts := strings.SplitN(rawPrefix, "/", 2)
				rawPrefix = subParts[0]
				if len(subParts) == 2 {
					if bits, err := strconv.Atoi(subParts[1]); err == nil && bits > 0 {
						maskLen = bits / 4 // 28 bits -> 7 hex chars, 36 bits -> 9 hex chars
					}
				}
			}
			
			cleanPrefix := strings.ReplaceAll(strings.ReplaceAll(rawPrefix, "-", ""), ":", "")
			
			validHex := true
			for _, c := range cleanPrefix {
				if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')) {
					validHex = false
					break
				}
			}
			
			if validHex && vendor != "" {
				if maskLen > 0 && len(cleanPrefix) >= maskLen {
					m[cleanPrefix[:maskLen]] = vendor
				} else if len(cleanPrefix) >= 6 {
					m[cleanPrefix[:6]] = vendor
				}
				continue
			}
		}

		// 3. Fallback: try splitting by comma (CSV)
		csvParts := strings.SplitN(line, ",", 2)
		if len(csvParts) == 2 {
			rawPrefix := strings.ToUpper(strings.TrimSpace(csvParts[0]))
			rawPrefix = strings.Trim(rawPrefix, "\"")
			vendor := strings.TrimSpace(csvParts[1])
			vendor = strings.Trim(vendor, "\"")
			cleanPrefix := strings.ReplaceAll(strings.ReplaceAll(rawPrefix, "-", ""), ":", "")
			if len(cleanPrefix) >= 6 && vendor != "" {
				m[cleanPrefix[:6]] = vendor
				continue
			}
		}
	}
}

func initOUIProvider() {
	m := make(map[string]string)
	
	data := ouiData
	cachePath := getOUICachePath()
	
	var newSource string
	if cachedData, err := os.ReadFile(cachePath); err == nil && len(cachedData) > 0 {
		data = string(cachedData)
		newSource = "Local Cache (" + cachePath + ")"
		fmt.Println("Loaded OUI data from local cache")
	} else {
		newSource = "Master OUI Database (master_oui.txt)"
		fmt.Println("Loaded OUI data from master OUI database")
	}

	if data != "" {
		parseOUIData(data, m)
	} else {
		fmt.Println("DEBUG: data is empty!")
	}
	
	// If we loaded from cache but got very few records (e.g., invalid file/HTML error page), fallback to embedded
	if len(m) < 1000 && newSource != "Master OUI Database (master_oui.txt)" {
		fmt.Printf("Warning: Local cache yielded only %d records. Falling back to embedded master data.\n", len(m))
		data = ouiData
		newSource = "Master OUI Database (master_oui.txt)"
		
		// Clear the invalid map
		m = make(map[string]string)
		if data != "" {
			parseOUIData(data, m)
		}
	}
	
	ouiMutex.Lock()
	currentOUIProvider = &MapOUIProvider{data: m}
	currentOUISource = newSource
	ouiMutex.Unlock()
	
	fmt.Printf("Initialized OUI Provider with %d entries\n", len(m))
}

func openAppWindow(url string) {
	// For Windows, use a persistent profile in AppData so that Edge/Chrome can cache and display the custom taskbar icon.
	// For other OS, use temporary directories.
	var profileDir string
	if runtime.GOOS == "windows" {
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData != "" {
			profileDir = filepath.Join(localAppData, "CisnetGridScan", "EdgeProfile")
			_ = os.MkdirAll(profileDir, 0755)
		}
	}

	if profileDir == "" {
		var err error
		tempDir, err = os.MkdirTemp("", "cisnet_grid_scan_*")
		if err != nil {
			fmt.Printf("Failed to create temp dir: %v\n", err)
			tempDir = ""
		}
		profileDir = tempDir
	}

	// 1~4단계: 스마트 적응형 브라우저 파이프라인 (Edge -> Chrome -> Whale/Brave -> System Default)
	if launchBrowserWithFallback(url, profileDir) {
		fmt.Println("UI window successfully launched via adaptive pipeline.")
		return
	}

	// 5단계: 브라우저 실행이 모두 차단되었거나 실패한 경우, Windows 네이티브 안내창 및 긴급 스캔 모드 가동
	fmt.Println("All automated browser launches failed. Activating native emergency dialog...")
	emergencyModeMutex.Lock()
	emergencyMode = true
	emergencyModeMutex.Unlock()

	// 로컬 IP 계산
	localIP := "localhost"
	interfaces := getAllInterfaces()
	if len(interfaces) > 0 {
		localIP = interfaces[0].IP
	}

	port := defaultPort
	if strings.Contains(url, ":") {
		parts := strings.Split(url, ":")
		port = parts[len(parts)-1]
	}

	dialogMsg := fmt.Sprintf(
		"웹 브라우저 자동 실행이 차단되었거나 호환 브라우저가 없는 환경입니다.\n\n"+
			"• 로컬 접속 주소: http://localhost:%s\n"+
			"• 원격/모바일 접속: http://%s:%s\n\n"+
			"[예(Y)]   : 지금 즉시 '네트워크 긴급 스캔'을 실행하고 메모장 보고서를 생성합니다.\n"+
			"[아니오(N)]: 웹 접속 주소를 클립보드에 복사하고 브라우저 접속을 대기합니다.\n"+
			"[취소]    : 프로그램을 종료합니다.",
		port, localIP, port,
	)

	choice := showNativeMessageBox("Grid IP Scanner2 - 실행 안내", dialogMsg, MB_YESNOCANCEL|MB_ICONINFORMATION)

	switch choice {
	case IDYES:
		// 즉시 긴급 스캔 실행
		showNativeMessageBox("Grid IP Scanner2", "네트워크 긴급 스캔을 시작합니다.\n잠시만 기다려주세요 (약 2~3초 소요)...", MB_OK|MB_ICONINFORMATION)
		runEmergencyScanAndReport(port)
	case IDNO:
		// 클립보드에 주소 복사 및 대기
		copyToClipboard(fmt.Sprintf("http://localhost:%s", port))
		showNativeMessageBox("주소 복사 완료", fmt.Sprintf("접속 주소(http://localhost:%s)가 클립보드에 복사되었습니다.\n\n원하시는 웹 브라우저를 열고 주소창에 붙여넣기(Ctrl+V)하여 접속해 주세요.", port), MB_OK|MB_ICONINFORMATION)
	case IDCANCEL:
		cleanupAndExit()
	default:
		cleanupAndExit()
	}
}

// runEmergencyScanAndReport runs a zero-browser fast network scan and generates a text report for Notepad
func runEmergencyScanAndReport(port string) {
	interfaces := getAllInterfaces()
	var targetSubnet string
	var myIP string
	if len(interfaces) > 0 {
		targetSubnet = interfaces[0].Subnet
		myIP = interfaces[0].IP
	} else {
		targetSubnet = "192.168.0"
		myIP = "192.168.0.1"
	}

	fmt.Printf("Starting Emergency Scan on subnet: %s.0/24...\n", targetSubnet)

	type HostItem struct {
		IP       string
		Alive    bool
		MAC      string
		Vendor   string
		Hostname string
		IsGW     bool
		IsSelf   bool
	}

	var results []HostItem
	var mu sync.Mutex
	var wg sync.WaitGroup

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1~254 병렬 고속 스캔 (64개 워커 풀)
	jobs := make(chan int, 254)
	for w := 0; w < 64; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				ip := fmt.Sprintf("%s.%d", targetSubnet, i)
				alive := isAlivePing(ctx, ip)
				mac := ""
				vendor := ""
				hostname := ""

				if alive {
					mac = getMacFromArp(ctx, ip)
					if mac != "" && mac != "Unknown" {
						ouiMutex.RLock()
						if currentOUIProvider != nil {
							vendor = currentOUIProvider.Lookup(mac)
						}
						ouiMutex.RUnlock()
					}
					hostname = getHostname(ctx, ip)

					mu.Lock()
					results = append(results, HostItem{
						IP:       ip,
						Alive:    alive,
						MAC:      mac,
						Vendor:   vendor,
						Hostname: hostname,
						IsGW:     i == 1 || i == 254,
						IsSelf:   ip == myIP,
					})
					mu.Unlock()
				}
			}
		}()
	}

	for i := 1; i <= 254; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	// IP 번호순 정렬
	sort.Slice(results, func(i, j int) bool {
		var octA, octB int
		partsA := strings.Split(results[i].IP, ".")
		partsB := strings.Split(results[j].IP, ".")
		if len(partsA) == 4 {
			octA, _ = strconv.Atoi(partsA[3])
		}
		if len(partsB) == 4 {
			octB, _ = strconv.Atoi(partsB[3])
		}
		return octA < octB
	})

	// 텍스트 보고서 작성
	var report strings.Builder
	scanTime := time.Now().Format("2006-01-02 15:04:05")
	report.WriteString("================================================================================\n")
	report.WriteString("            Grid IP Scanner2 - 네트워크 긴급 분석 보고서 (Emergency Scan)        \n")
	report.WriteString("================================================================================\n")
	report.WriteString(fmt.Sprintf(" 스캔 일시   : %s\n", scanTime))
	report.WriteString(fmt.Sprintf(" 분석 서브넷 : %s.0/24\n", targetSubnet))
	report.WriteString(fmt.Sprintf(" 로컬 PC IP  : %s\n", myIP))
	report.WriteString(fmt.Sprintf(" 감지된 기기 : 총 %d대 온라인 활성\n", len(results)))
	report.WriteString("================================================================================\n\n")

	report.WriteString(fmt.Sprintf("%-17s %-19s %-25s %-30s\n", "[IP 주소]", "[MAC 주소]", "[호스트명]", "[하드웨어 제조사 / 구분]"))
	report.WriteString(strings.Repeat("-", 95) + "\n")

	var summaryLines []string
	count := 0

	for _, item := range results {
		tag := ""
		if item.IsSelf {
			tag = "[본 컴퓨터] "
		} else if item.IsGW {
			tag = "[게이트웨이/공유기] "
		}

		macStr := item.MAC
		if macStr == "" || macStr == "Unknown" {
			macStr = "-"
		}
		hostStr := item.Hostname
		if hostStr == "" {
			hostStr = "-"
		}
		vendorStr := tag + item.Vendor
		if vendorStr == "" || vendorStr == tag {
			vendorStr = tag + "알 수 없음"
		}

		report.WriteString(fmt.Sprintf("%-17s %-19s %-25s %-30s\n", item.IP, macStr, hostStr, vendorStr))

		if count < 8 {
			summaryLines = append(summaryLines, fmt.Sprintf("• %s : %s (%s)", item.IP, vendorStr, hostStr))
			count++
		}
	}

	report.WriteString("\n" + strings.Repeat("=", 95) + "\n")
	report.WriteString(" * Grid IP Scanner2 (v2.2) Powered by Cisnet & AhBiYout (www.cisnet.co.kr)\n")
	report.WriteString("================================================================================\n")

	// 바탕화면 또는 작업 디렉토리에 파일 저장
	desktop := getDesktopPath()
	reportPath := filepath.Join(desktop, "Grid_IP_Scan_Result.txt")
	err := os.WriteFile(reportPath, []byte(report.String()), 0644)
	if err != nil {
		reportPath = "Grid_IP_Scan_Result.txt"
		_ = os.WriteFile(reportPath, []byte(report.String()), 0644)
	}

	summaryText := strings.Join(summaryLines, "\n")
	if len(results) > 8 {
		summaryText += fmt.Sprintf("\n... 외 %d대 추가 감지됨", len(results)-8)
	}

	resultDialogMsg := fmt.Sprintf(
		"네트워크 긴급 스캔이 완료되었습니다!\n\n"+
			"• 대상 서브넷: %s.0/24\n"+
			"• 감지된 온라인 장비: 총 %d대\n\n"+
			"[주요 감지 기기 목록]\n%s\n\n"+
			"상세 전체 분석 보고서가 생성되었습니다:\n📁 %s\n\n"+
			"메모장으로 지금 열어 확인하시겠습니까?",
		targetSubnet, len(results), summaryText, reportPath,
	)

	userChoice := showNativeMessageBox("스캔 완료 - Grid IP Scanner2", resultDialogMsg, MB_YESNO|MB_ICONINFORMATION)
	if userChoice == IDYES {
		openWithNotepad(reportPath)
	}
}

func cleanupAndExit() {
	if tempDir != "" {
		fmt.Printf("Cleaning up temp directory: %s\n", tempDir)
		os.RemoveAll(tempDir)
	}
	fmt.Println("Cisnet Grid Engine Exiting...")
	os.Exit(0)
}

func isAlivePing(ctx context.Context, ip string) bool {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "ping", "-n", "1", "-w", "2000", ip)
		hideWindow(cmd)
	} else {
		cmd = exec.CommandContext(ctx, "ping", "-c", "1", "-W", "2", ip)
	}
	err := cmd.Run()
	return err == nil
}

func getMacFromArp(ctx context.Context, ip string) string {
	return GlobalEngine.GetMAC(ip)
}

func getWebTitle(ctx context.Context, ip string) string {
	client := http.Client{
		Timeout: 1200 * time.Millisecond,
	}
	
	req, err := http.NewRequestWithContext(ctx, "GET", "http://"+ip, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 16384))
	if err != nil {
		return ""
	}

	re := regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
	matches := re.FindStringSubmatch(string(body))
	if len(matches) > 1 {
		title := strings.TrimSpace(matches[1])
		title = strings.ReplaceAll(title, "\n", " ")
		title = strings.ReplaceAll(title, "\r", "")
		title = strings.Join(strings.Fields(title), " ")
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		return title
	}
	return ""
}

func getHostname(ctx context.Context, ip string) string {
	// 1. Try standard DNS lookup (Go native)
	resolver := &net.Resolver{}
	names, err := resolver.LookupAddr(ctx, ip)
	if err == nil && len(names) > 0 {
		return strings.TrimSuffix(names[0], ".")
	}

	// 2. Windows-specific nbtstat (much faster than powershell)
	if runtime.GOOS == "windows" {
		cmd := exec.CommandContext(ctx, "nbtstat", "-A", ip)
		hideWindow(cmd)
		out, err := cmd.Output()
		if err == nil {
			decodedOut := decodeANSI(out)
			lines := strings.Split(decodedOut, "\n")
			for _, line := range lines {
				if strings.Contains(line, "<00>") && (strings.Contains(line, "UNIQUE") || strings.Contains(line, "고유") || strings.Contains(strings.ToLower(line), "unique")) {
					parts := strings.Fields(line)
					if len(parts) > 0 {
						name := parts[0]
						if name != "Name" && name != "이름" && !strings.Contains(name, "---") {
							return name
						}
					}
				}
			}
		}
	}

	return ""
}

func getAllInterfaces() []InterfaceInfo {
	var results []InterfaceInfo
	ifaces, err := net.Interfaces()
	if err != nil {
		return results
	}

	defaultIP, _ := getLocalIP()

	for _, iface := range ifaces {
		var flagList []string
		if iface.Flags&net.FlagUp != 0 {
			flagList = append(flagList, "UP")
		} else {
			flagList = append(flagList, "DOWN")
		}
		if iface.Flags&net.FlagBroadcast != 0 {
			flagList = append(flagList, "BROADCAST")
		}
		if iface.Flags&net.FlagLoopback != 0 {
			flagList = append(flagList, "LOOPBACK")
		}
		if iface.Flags&net.FlagPointToPoint != 0 {
			flagList = append(flagList, "POINTTOPOINT")
		}
		if iface.Flags&net.FlagMulticast != 0 {
			flagList = append(flagList, "MULTICAST")
		}

		status := "down"
		if iface.Flags&net.FlagUp != 0 {
			status = "up"
		}

		// Detect interface type
		lowerName := strings.ToLower(iface.Name)
		ifType := "other"
		if iface.Flags&net.FlagLoopback != 0 || strings.Contains(lowerName, "loopback") || strings.Contains(lowerName, "lo") {
			ifType = "loopback"
		} else if strings.Contains(lowerName, "tun") || strings.Contains(lowerName, "tap") || strings.Contains(lowerName, "vpn") || strings.Contains(lowerName, "wireguard") || strings.Contains(lowerName, "tailscale") || strings.Contains(lowerName, "nord") || strings.Contains(lowerName, "zerotier") {
			ifType = "vpn"
		} else if strings.Contains(lowerName, "veth") || strings.Contains(lowerName, "docker") || strings.Contains(lowerName, "br-") || strings.Contains(lowerName, "vmnet") || strings.Contains(lowerName, "virtual") || strings.Contains(lowerName, "hyper-v") || strings.Contains(lowerName, "wsl") || strings.Contains(lowerName, "vbox") || strings.Contains(lowerName, "bridge") {
			ifType = "virtual"
		} else if strings.Contains(lowerName, "eth") || strings.Contains(lowerName, "en") || strings.Contains(lowerName, "wlan") || strings.Contains(lowerName, "wi-fi") || strings.Contains(lowerName, "wifi") || strings.Contains(lowerName, "wl") || strings.Contains(lowerName, "lan") || strings.Contains(lowerName, "이더넷") || strings.Contains(lowerName, "무선") || strings.Contains(lowerName, "local area") {
			ifType = "physical"
		} else {
			if len(iface.HardwareAddr) > 0 {
				ifType = "physical"
			}
		}

		mac := iface.HardwareAddr.String()

		addrs, _ := iface.Addrs()
		var ipv4List []string
		var cidrList []string
		var ipv6List []string

		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok {
				if ipnet.IP.To4() != nil {
					ipv4List = append(ipv4List, ipnet.IP.String())
					cidrList = append(cidrList, ipnet.String())
				} else if ipnet.IP.To16() != nil && !ipnet.IP.IsLoopback() {
					ipv6List = append(ipv6List, ipnet.IP.String())
				}
			}
		}

		primaryIPv6 := ""
		if len(ipv6List) > 0 {
			primaryIPv6 = ipv6List[0]
		}

		if len(ipv4List) > 0 {
			for i, ipv4 := range ipv4List {
				parts := strings.Split(ipv4, ".")
				subnet := ""
				if len(parts) == 4 {
					subnet = strings.Join(parts[:3], ".")
				}
				cidr := ""
				if i < len(cidrList) {
					cidr = cidrList[i]
				}
				isDef := (ipv4 == defaultIP)
				results = append(results, InterfaceInfo{
					Name:      iface.Name,
					IP:        ipv4,
					IPv6:      primaryIPv6,
					Subnet:    subnet,
					CIDR:      cidr,
					MAC:       mac,
					Status:    status,
					Type:      ifType,
					MTU:       iface.MTU,
					Flags:     flagList,
					IsDefault: isDef,
				})
			}
		} else {
			// Interface without IPv4 (e.g. disconnected cable, IPv6 only, or disabled)
			results = append(results, InterfaceInfo{
				Name:      iface.Name,
				IP:        "",
				IPv6:      primaryIPv6,
				Subnet:    "",
				CIDR:      "",
				MAC:       mac,
				Status:    status,
				Type:      ifType,
				MTU:       iface.MTU,
				Flags:     flagList,
				IsDefault: false,
			})
		}
	}
	return results
}

func getLocalIP() (string, string) {
	addrs, _ := net.InterfaceAddrs()
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				fullIP := ipnet.IP.String()
				parts := strings.Split(fullIP, ".")
				if len(parts) == 4 {
					return fullIP, strings.Join(parts[:3], ".")
				}
			}
		}
	}
	return "192.168.0.1", "192.168.0"
}

func isAlivePingWithTimeout(ctx context.Context, ip string, timeoutMs int) bool {
	var cmd *exec.Cmd
	timeoutStr := fmt.Sprintf("%d", timeoutMs)
	
	// Create a context with timeout to ensure ping doesn't hang indefinitely
	pingCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs+500)*time.Millisecond)
	defer cancel()

	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(pingCtx, "ping", "-n", "1", "-w", timeoutStr, ip)
		hideWindow(cmd)
	} else if runtime.GOOS == "darwin" {
		// macOS ping: -W takes milliseconds
		cmd = exec.CommandContext(pingCtx, "ping", "-c", "1", "-W", timeoutStr, ip)
	} else {
		// Linux ping: -W takes seconds
		timeoutSec := fmt.Sprintf("%d", (timeoutMs+999)/1000)
		cmd = exec.CommandContext(pingCtx, "ping", "-c", "1", "-W", timeoutSec, ip)
	}
	
	out, _ := cmd.Output()
	
	// Fast check for TTL in output which confirms a real Echo Reply (bypasses "Destination net unreachable" bug in Ping exit codes)
	outStr := strings.ToLower(string(out))
	if strings.Contains(outStr, "ttl=") {
		return true
	}
	
	// Strictly no fallback to exit code 0 if TTL is missing, 
	// as Windows Ping often returns 0 even for unreachable or timed-out hosts in some environments.
	return false
}

func scanIPQuickWithTimeout(ctx context.Context, ip string, timeoutMs int) ScanResult {
	start := time.Now()
	alive := false

	// 1. ICMP Ping
	if isAlivePingWithTimeout(ctx, ip, timeoutMs) {
		alive = true
	}

	// 2. NetBIOS Check (Fallback)
	if !alive {
		if checkNetBIOSWithTimeout(ctx, ip, timeoutMs) {
			alive = true
		}
	}

	// 3. Quick TCP Check - Now using FastTCPVerify engine
	if !alive {
		aliveFromTCP, _ := GlobalEngine.FastTCPVerify(ctx, ip, timeoutMs/2, []int{445, 135, 80})
		if aliveFromTCP {
			alive = true
		}
	}

	if alive {
		mac := getMacFromArp(ctx, ip)
		hostname := getHostname(ctx, ip)
		localIP, _ := getLocalIP()
		
		// SUSPICIOUS NODE FILTER:
		// If it has NO MAC AND NO Hostname, and it's not the scanning machine, 
		// it's almost certainly a ghost response or a non-LAN node responding via gateway proxy.
		if mac == "" && hostname == "" && ip != localIP {
			return ScanResult{IP: ip, Alive: false}
		}

		ouiMutex.RLock()
		vendor := currentOUIProvider.Lookup(mac)
		ouiMutex.RUnlock()
		
		mdnsName := ""
		upnpName := ""
		snmpName := ""
		
		var extraWg sync.WaitGroup
		extraWg.Add(3)
		go func() {
			defer extraWg.Done()
			mdnsName = checkMDNSWithTimeout(ctx, ip, timeoutMs)
		}()
		go func() {
			defer extraWg.Done()
			upnpName = checkUPnPWithTimeout(ctx, ip, timeoutMs)
		}()
		go func() {
			defer extraWg.Done()
			snmpName = checkSNMPWithTimeout(ctx, ip, timeoutMs)
		}()
		extraWg.Wait()
		
		return ScanResult{
			IP:        ip,
			Alive:     true,
			Latency:   int(time.Since(start).Milliseconds()),
			MAC:       mac,
			Vendor:    vendor,
			Hostname:  hostname,
			OpenPorts: []int{},
			MDNS:      mdnsName,
			UPnP:      upnpName,
			SNMP:      snmpName,
		}
	}
	return ScanResult{IP: ip, Alive: false}
}

func scanIPWithTimeout(ctx context.Context, ip string, timeoutMs int) ScanResult {
	start := time.Now()
	
	var openPorts []int
	
	aliveViaPing := false
	aliveViaNetBIOS := false
	aliveViaPort := false

	// 1. ICMP Ping (Most reliable "Alive" indicator)
	if isAlivePingWithTimeout(ctx, ip, timeoutMs) {
		aliveViaPing = true
	}

	// 2. UDP NetBIOS Check (Port 137)
	if !aliveViaPing {
		if checkNetBIOSWithTimeout(ctx, ip, timeoutMs) {
			aliveViaNetBIOS = true
		}
	}

	// 3. TCP Port Scan - Using concurrent FastTCPVerify engine
	targetPorts := []int{80, 443, 445, 135, 139, 9100, 631, 22, 3389, 53, 5000, 8080, 1900, 5353, 5355, 8000, 8443}
	aliveViaPort, openPorts = GlobalEngine.FastTCPVerify(ctx, ip, timeoutMs, targetPorts)
	
	// Wait logic is handled by the engine

	// Check if context was cancelled
	select {
	case <-ctx.Done():
		return ScanResult{IP: ip, Alive: false}
	default:
	}

	alive := aliveViaPing || aliveViaNetBIOS || aliveViaPort
	
	if alive {
		mac := getMacFromArp(ctx, ip)
		hostname := getHostname(ctx, ip)
		localIP, _ := getLocalIP()
		
		ouiMutex.RLock()
		vendor := currentOUIProvider.Lookup(mac)
		ouiMutex.RUnlock()
		
		webTitle := ""
		mdnsName := ""
		upnpName := ""
		snmpName := ""
		
		var extraWg sync.WaitGroup
		
		hasWebPort := false
		for _, p := range openPorts {
			if p == 80 || p == 443 || p == 8080 || p == 5000 {
				hasWebPort = true
				break
			}
		}

		if hasWebPort {
			extraWg.Add(1)
			go func() {
				defer extraWg.Done()
				webTitle = getWebTitleWithTimeout(ctx, ip, timeoutMs)
			}()
		}

		extraWg.Add(3)
		go func() {
			defer extraWg.Done()
			mdnsName = checkMDNSWithTimeout(ctx, ip, timeoutMs)
		}()
		go func() {
			defer extraWg.Done()
			upnpName = checkUPnPWithTimeout(ctx, ip, timeoutMs)
		}()
		go func() {
			defer extraWg.Done()
			snmpName = checkSNMPWithTimeout(ctx, ip, timeoutMs)
		}()

		extraWg.Wait()

		// SUSPICIOUS NODE FILTER:
		// If it's not the local machine, and we have NO MAC address, NO Hostname, NO Web Title, 
		// NO mDNS, NO UPnP, and NO SNMP... it's a "Zero Data Node". 
		// Most "Hidden Nodes" are these zero-data nodes caused by lying firewalls or network probes.
		if ip != localIP && mac == "" && hostname == "" && webTitle == "" && mdnsName == "" && upnpName == "" && snmpName == "" {
			// Extra check: if it has many ports open but No MAC, it's definitely a Honeypot or Firewall artifact.
			if len(openPorts) > 5 {
				return ScanResult{IP: ip, Alive: false}
			}
			// Otherwise, if it has 0 ports and 0 data, it's definitely a ghost.
			if len(openPorts) == 0 {
				return ScanResult{IP: ip, Alive: false}
			}
		}

		return ScanResult{
			IP:        ip,
			Alive:     true,
			Latency:   int(time.Since(start).Milliseconds()),
			MAC:       mac,
			Vendor:    vendor,
			Hostname:  hostname,
			WebTitle:  webTitle,
			OpenPorts: openPorts,
			MDNS:      mdnsName,
			UPnP:      upnpName,
			SNMP:      snmpName,
		}
	}
	return ScanResult{IP: ip, Alive: false}
}

func getWebTitleWithTimeout(ctx context.Context, ip string, timeoutMs int) string {
	client := http.Client{
		Timeout: time.Duration(timeoutMs+400) * time.Millisecond,
	}
	
	req, err := http.NewRequestWithContext(ctx, "GET", "http://"+ip, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 16384))
	if err != nil {
		return ""
	}

	re := regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
	matches := re.FindStringSubmatch(string(body))
	if len(matches) > 1 {
		title := strings.TrimSpace(matches[1])
		title = strings.ReplaceAll(title, "\n", " ")
		title = strings.ReplaceAll(title, "\r", "")
		title = strings.Join(strings.Fields(title), " ")
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		return title
	}
	return ""
}

// checkNetBIOSWithTimeout sends a NetBIOS node status request to see if a host is alive
func checkNetBIOSWithTimeout(ctx context.Context, ip string, timeoutMs int) bool {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs/2) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:137", ip))
	if err != nil {
		return false
	}
	defer conn.Close()

	// NetBIOS Node Status Request Packet
	packet := []byte{
		0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x20, 0x43, 0x4b, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x00, 0x00, 0x21,
		0x00, 0x01,
	}

	_, err = conn.Write(packet)
	if err != nil {
		return false
	}

	// Wait for response
	buffer := make([]byte, 512)
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutMs/2) * time.Millisecond))
	n, err := conn.Read(buffer)
	
	return err == nil && n > 0
}

func extractPrintableString(data []byte) string {
	var best string
	var current string
	for _, b := range data {
		if b >= 32 && b <= 126 {
			current += string(b)
		} else {
			if len(current) > len(best) {
				best = current
			}
			current = ""
		}
	}
	if len(current) > len(best) {
		best = current
	}
	if len(best) > 5 {
		return strings.TrimSpace(best)
	}
	return ""
}

func checkMDNSWithTimeout(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:5353", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	packet := []byte{
		0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x09, 0x5f, 0x73, 0x65,
		0x72, 0x76, 0x69, 0x63, 0x65, 0x73, 0x07, 0x5f,
		0x64, 0x6e, 0x73, 0x2d, 0x73, 0x64, 0x04, 0x5f,
		0x75, 0x64, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61,
		0x6c, 0x00, 0x00, 0x0c, 0x00, 0x01,
	}

	_, err = conn.Write(packet)
	if err != nil {
		return ""
	}

	buffer := make([]byte, 1024)
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))
	n, err := conn.Read(buffer)
	if err == nil && n > 0 {
		return extractPrintableString(buffer[:n])
	}
	return ""
}

func checkUPnPWithTimeout(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:1900", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	msg := "M-SEARCH * HTTP/1.1\r\n" +
		"Host: 239.255.255.250:1900\r\n" +
		"Man: \"ssdp:discover\"\r\n" +
		"ST: ssdp:all\r\n" +
		"MX: 1\r\n\r\n"

	_, err = conn.Write([]byte(msg))
	if err != nil {
		return ""
	}

	buffer := make([]byte, 1024)
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))
	n, err := conn.Read(buffer)
	if err == nil && n > 0 {
		response := string(buffer[:n])
		lines := strings.Split(response, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(strings.ToUpper(line), "SERVER:") {
				return strings.TrimSpace(line[7:])
			}
		}
		return "UPnP Device"
	}
	return ""
}

func checkSNMPWithTimeout(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:161", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	packet := []byte{
		0x30, 0x29, 0x02, 0x01, 0x00, 0x04, 0x06, 0x70,
		0x75, 0x62, 0x6c, 0x69, 0x63, 0xa0, 0x1c, 0x02,
		0x04, 0x01, 0x02, 0x03, 0x04, 0x02, 0x01, 0x00,
		0x02, 0x01, 0x00, 0x30, 0x0e, 0x30, 0x0c, 0x06,
		0x08, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01,
		0x00, 0x05, 0x00,
	}

	_, err = conn.Write(packet)
	if err != nil {
		return ""
	}

	buffer := make([]byte, 1024)
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))
	n, err := conn.Read(buffer)
	if err == nil && n > 0 {
		return extractPrintableString(buffer[:n])
	}
	return ""
}

func scanIPQuick(ctx context.Context, ip string, wg *sync.WaitGroup, results chan<- ScanResult) {
	defer wg.Done()
	start := time.Now()
	alive := false

	// 1. ICMP Ping
	if isAlivePing(ctx, ip) {
		alive = true
	}

	// 2. NetBIOS Check (Fallback)
	if !alive {
		if checkNetBIOS(ctx, ip) {
			alive = true
		}
	}

	if alive {
		mac := getMacFromArp(ctx, ip)
		
		ouiMutex.RLock()
		vendor := currentOUIProvider.Lookup(mac)
		ouiMutex.RUnlock()
		
		hostname := getHostname(ctx, ip)
		
		results <- ScanResult{
			IP:        ip,
			Alive:     true,
			Latency:   int(time.Since(start).Milliseconds()),
			MAC:       mac,
			Vendor:    vendor,
			Hostname:  hostname,
			OpenPorts: []int{},
		}
	} else {
		results <- ScanResult{IP: ip, Alive: false}
	}
}

func scanIP(ctx context.Context, ip string, wg *sync.WaitGroup, results chan<- ScanResult) {
	defer wg.Done()
	start := time.Now()
	
	targetPorts := []int{80, 443, 445, 135, 139, 9100, 631, 22, 3389, 53, 5000, 8080, 1900, 5353, 5355, 8000, 8443}
	var openPorts []int
	var portMu sync.Mutex
	var portWg sync.WaitGroup
	alive := false

	dialer := &net.Dialer{Timeout: 1500 * time.Millisecond}

	// 1. TCP Port Scan
	for _, port := range targetPorts {
		portWg.Add(1)
		go func(p int) {
			defer portWg.Done()
			address := fmt.Sprintf("%s:%d", ip, p)
			conn, err := dialer.DialContext(ctx, "tcp", address)
			if err == nil {
				conn.Close()
				portMu.Lock()
				openPorts = append(openPorts, p)
				alive = true
				portMu.Unlock()
			}
		}(port)
	}
	portWg.Wait()

	// Check if context was cancelled during port scan
	select {
	case <-ctx.Done():
		return
	default:
	}

	// 2. UDP NetBIOS Check (Port 137) - Very effective for Windows
	if !alive {
		if checkNetBIOS(ctx, ip) {
			alive = true
		}
	}

	// 3. ICMP Ping (Final Fallback)
	if !alive {
		if isAlivePing(ctx, ip) {
			alive = true
		}
	}

	if alive {
		mac := getMacFromArp(ctx, ip)
		
		ouiMutex.RLock()
		vendor := currentOUIProvider.Lookup(mac)
		ouiMutex.RUnlock()
		
		hostname := getHostname(ctx, ip)
		webTitle := ""
		
		hasWebPort := false
		portMu.Lock()
		for _, p := range openPorts {
			if p == 80 || p == 443 || p == 8080 || p == 5000 {
				hasWebPort = true
				break
			}
		}
		portMu.Unlock()

		if hasWebPort {
			webTitle = getWebTitle(ctx, ip)
		}

		results <- ScanResult{
			IP:        ip,
			Alive:     true,
			Latency:   int(time.Since(start).Milliseconds()),
			MAC:       mac,
			Vendor:    vendor,
			Hostname:  hostname,
			WebTitle:  webTitle,
			OpenPorts: openPorts,
		}
	} else {
		results <- ScanResult{IP: ip, Alive: false}
	}
}

// checkNetBIOS sends a NetBIOS node status request to see if a host is alive
func checkNetBIOS(ctx context.Context, ip string) bool {
	dialer := &net.Dialer{Timeout: 500 * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:137", ip))
	if err != nil {
		return false
	}
	defer conn.Close()

	// NetBIOS Node Status Request Packet
	packet := []byte{
		0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x20, 0x43, 0x4b, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x00, 0x00, 0x21,
		0x00, 0x01,
	}

	_, err = conn.Write(packet)
	if err != nil {
		return false
	}

	// Wait for response
	buffer := make([]byte, 512)
	conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	n, err := conn.Read(buffer)
	
	return err == nil && n > 0
}

func isRunningAsAdmin() bool {
	_, err := os.Open("\\\\.\\PHYSICALDRIVE0")
	return err == nil
}

func main() {
	initOUIProvider()
	
	// Heartbeat endpoint
	http.HandleFunc("/api/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		heartbeatMutex.Lock()
		lastHeartbeat = time.Now()
		heartbeatMutex.Unlock()
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/oui/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusInternalServerError)
			return
		}
		
		// Save to cache
		cachePath := getOUICachePath()
		os.WriteFile(cachePath, body, 0644)
		
		initOUIProvider()
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/oui/auto-update", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		type UpdateSource struct {
			Name string
			URL  string
		}

		client := &http.Client{Timeout: 40 * time.Second}
		browserUA := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

		downloadWithUA := func(targetUrl string) ([]byte, error) {
			req, err := http.NewRequest(http.MethodGet, targetUrl, nil)
			if err != nil {
				return nil, err
			}
			req.Header.Set("User-Agent", browserUA)
			req.Header.Set("Accept", "text/plain,text/html,*/*")
			resp, err := client.Do(req)
			if err != nil {
				return nil, err
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return nil, err
			}
			return body, nil
		}

		var combinedData strings.Builder
		var sourcesAttempted []string
		var sourcesSucceeded []string
		var lastErr string

		// Tier 1: Try Wireshark Automated Manuf (contains ~58,000+ well-formatted and up-to-date entries with masks)
		wiresharkURL := "https://www.wireshark.org/download/automated/data/manuf"
		sourcesAttempted = append(sourcesAttempted, "Wireshark Automated Manuf")
		if body, err := downloadWithUA(wiresharkURL); err == nil && len(body) > 100000 {
			combinedData.Write(body)
			combinedData.WriteString("\n")
			sourcesSucceeded = append(sourcesSucceeded, "Wireshark Automated Manuf")
		} else if err != nil {
			lastErr = err.Error()
		}

		// Tier 2: Try IEEE official repositories
		ieeeSources := []UpdateSource{
			{Name: "IEEE MA-L (24-bit)", URL: "https://standards-oui.ieee.org/oui/oui.txt"},
			{Name: "IEEE MA-M (28-bit)", URL: "https://standards-oui.ieee.org/oui28/mam.txt"},
			{Name: "IEEE MA-S (36-bit)", URL: "https://standards-oui.ieee.org/oui36/oui36.txt"},
		}

		for _, src := range ieeeSources {
			sourcesAttempted = append(sourcesAttempted, src.Name)
			body, err := downloadWithUA(src.URL)
			if err == nil && len(body) > 1000 {
				combinedData.Write(body)
				combinedData.WriteString("\n")
				sourcesSucceeded = append(sourcesSucceeded, src.Name)
			} else if err != nil && lastErr == "" {
				lastErr = err.Error()
			}
		}

		if len(sourcesSucceeded) == 0 {
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":          false,
				"error":            "Failed to download OUI data from IEEE and mirrors: " + lastErr,
				"sourcesAttempted": sourcesAttempted,
			})
			return
		}

		finalBody := []byte(combinedData.String())
		cachePath := getOUICachePath()
		if err := os.WriteFile(cachePath, finalBody, 0644); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Failed to write OUI database cache: " + err.Error(),
			})
			return
		}

		initOUIProvider()

		ouiMutex.RLock()
		newCount := 0
		if currentOUIProvider != nil {
			newCount = currentOUIProvider.EntryCount()
		}
		newSource := currentOUISource
		ouiMutex.RUnlock()

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":          true,
			"count":            newCount,
			"source":           newSource,
			"cachePath":        cachePath,
			"sourcesSucceeded": sourcesSucceeded,
			"message":          fmt.Sprintf("OUI 데이터베이스 업데이트 성공 (%d개 제조사)", newCount),
		})
	})

	http.HandleFunc("/api/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		ip, subnet := getLocalIP()
		interfaces := getAllInterfaces()
		
		ouiMutex.RLock()
		ouiCount := 0
		if currentOUIProvider != nil {
			ouiCount = currentOUIProvider.EntryCount()
		}
		source := currentOUISource
		ouiMutex.RUnlock()

		compName, _ := os.Hostname()
		if compName == "" {
			compName = "Unknown PC"
		}

		cachePath := getOUICachePath()
		dbLocation := "내장 OUI 데이터베이스 (master_oui.txt)"
		if strings.Contains(source, "Local Cache") {
			dbLocation = cachePath
		}

		json.NewEncoder(w).Encode(LocalInfo{
			IP:                  ip,
			Subnet:              subnet,
			Interfaces:          interfaces,
			IsAdmin:             isRunningAsAdmin(),
			OUICount:            ouiCount,
			OUISource:           source,
			OUICachePath:        cachePath,
			OUIDatabaseLocation: dbLocation,
			ComputerName:        compName,
		})
	})

	http.HandleFunc("/api/scan", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // Disable buffering for Nginx/Proxies
		
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
			return
		}

		query := r.URL.Query()
		subnet := query.Get("subnet")
		if subnet == "" {
			_, subnet = getLocalIP()
		}

		startIP := 1
		endIP := 254

		if s := query.Get("start"); s != "" {
			if val, err := fmt.Sscanf(s, "%d", &startIP); err == nil && val == 1 {
				if startIP < 0 { startIP = 0 }
			}
		}
		if e := query.Get("end"); e != "" {
			if val, err := fmt.Sscanf(e, "%d", &endIP); err == nil && val == 1 {
				if endIP > 255 { endIP = 255 }
			}
		}

		if startIP > endIP {
			startIP, endIP = endIP, startIP
		}

		deepScan := query.Get("deep") == "true"
		delayMs := 0
		timeoutMs := 1000
		if d := query.Get("delay"); d != "" {
			fmt.Sscanf(d, "%d", &delayMs)
		}
		if t := query.Get("timeout"); t != "" {
			fmt.Sscanf(t, "%d", &timeoutMs)
		}

		// Warm up the new Search Engine's ARP Cache
		GlobalEngine.Prepare()

		// Adaptive logic: If delay is high, we can afford more retries and longer timeouts
		retryCount := 1 // Default to 1 retry for fast mode
		if delayMs >= 100 || timeoutMs >= 1500 {
			retryCount = 2 // Double check if delay is high or timeout is generous
		}
		if delayMs >= 300 && timeoutMs >= 2000 {
			retryCount = 3 // Maximum precision
		}

		// Thread-safe SSE message queue
		sseChan := make(chan string, 1024)
		resultsChan := make(chan ScanResult, 512)
		ipChan := make(chan string, 512)
		var wg sync.WaitGroup

		// SSE Writer Goroutine
		writerDone := make(chan struct{})
		go func() {
			defer close(writerDone)
			for {
				select {
				case <-ctx.Done():
					return
				case msg, ok := <-sseChan:
					if !ok {
						return
					}
					fmt.Fprintf(w, "data: %s\n\n", msg)
					flusher.Flush()
				}
			}
		}()

		// Worker pool
		workerCount := 100 // Increased from 30 to 100 for fast mode
		if deepScan {
			workerCount = 30 // Deep scan is heavier, reduce concurrency to prevent network noise
		}
		if delayMs > 0 {
			workerCount = 20 // Reduce workers to maintain order and reduce noise
		}
		if delayMs >= 200 {
			workerCount = 10 // Even fewer workers for high delay to ensure sequential-like behavior
		}

		for worker := 0; worker < workerCount; worker++ {
			go func() {
				for ip := range ipChan {
					select {
					case sseChan <- fmt.Sprintf("{\"type\":\"scanning\",\"ip\":\"%s\"}", ip):
					case <-ctx.Done():
					}
					
					var res ScanResult
					// Adaptive Retry Logic
				retryLoop:
					for r := 0; r < retryCount; r++ {
						if deepScan {
							res = scanIPWithTimeout(ctx, ip, timeoutMs)
						} else {
							res = scanIPQuickWithTimeout(ctx, ip, timeoutMs)
						}
						if res.Alive {
							break retryLoop
						}
						if r < retryCount-1 {
							select {
							case <-ctx.Done():
								break retryLoop
							case <-time.After(time.Duration(10*(r+1)) * time.Millisecond):
							}
						}
					}
					
					select {
					case resultsChan <- res:
					case <-ctx.Done():
					}
					wg.Done()
				}
			}()
		}

		wg.Add(1) // Add 1 for the producer to prevent Waiter from exiting early
		// Producer
		go func() {
			defer wg.Done()
			for i := startIP; i <= endIP; i++ {
				select {
				case <-ctx.Done():
					goto doneProducing
				default:
					wg.Add(1)
					select {
					case ipChan <- fmt.Sprintf("%s.%d", subnet, i):
					case <-ctx.Done():
						wg.Done()
						goto doneProducing
					}
					if delayMs > 0 {
						select {
						case <-time.After(time.Duration(delayMs) * time.Millisecond):
						case <-ctx.Done():
							goto doneProducing
						}
					}
				}
			}
		doneProducing:
			close(ipChan)
		}()

		// Waiter
		go func() {
			wg.Wait()
			close(resultsChan)
		}()

		// Result collector
		for {
			res, ok := <-resultsChan
			if !ok {
				// We only send complete if context is not done, otherwise the client disconnected anyway
				if ctx.Err() == nil {
					sseChan <- "{\"type\":\"complete\"}"
				}
				close(sseChan)
				<-writerDone // Wait for SSE writer to finish its queue
				return
			}
			data, _ := json.Marshal(res)
			
			// Try to send result, but don't block forever if context is done
			select {
			case sseChan <- fmt.Sprintf("{\"type\":\"result\",\"data\":%s}", string(data)):
			case <-ctx.Done():
				// If context is done, we still need to drain resultsChan to prevent workers from blocking
				// so we just continue the loop and ignore the result
			}
		}
	})

	http.HandleFunc("/api/portscan", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		ip := r.URL.Query().Get("ip")
		if ip == "" || net.ParseIP(ip) == nil {
			http.Error(w, `{"error":"Invalid or missing IP"}`, http.StatusBadRequest)
			return
		}

		targetPorts := []int{21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9100, 27017}
		
		type PortAuditResult struct {
			Port        int    `json:"port"`
			Service     string `json:"service"`
			Protocol    string `json:"protocol"`
			Risk        string `json:"risk"`
			Description string `json:"description"`
			Banner      string `json:"banner,omitempty"`
		}

		serviceMap := map[int]struct {
			name string
			risk string
			desc string
		}{
			21:    {"FTP", "high", "평문 파일 전송 프로토콜 (자격증명 노출 취약)"},
			22:    {"SSH", "safe", "보안 암호화 원격 쉘"},
			23:    {"Telnet", "high", "비암호화 구형 터미널 (스니핑 취약점)"},
			25:    {"SMTP", "medium", "메일 발송 서버"},
			53:    {"DNS", "safe", "도메인 이름 해석 서비스"},
			80:    {"HTTP", "safe", "표준 웹 서버 포트"},
			110:   {"POP3", "medium", "메일 수신 프로토콜 (비암호화)"},
			135:   {"MSRPC", "medium", "Windows RPC 엔드포인트 맵퍼"},
			139:   {"NetBIOS-SSN", "medium", "Windows 파일 및 프린터 공유"},
			143:   {"IMAP", "medium", "메일 동기화 프로토콜"},
			443:   {"HTTPS", "safe", "보안 암호화 웹 서버 (TLS/SSL)"},
			445:   {"SMB / MS-DS", "high", "Windows SMB 파일 공유 (WannaCry 공격 타깃)"},
			993:   {"IMAPS", "safe", "보안 IMAP 메일"},
			995:   {"POP3S", "safe", "보안 POP3 메일"},
			1433:  {"MSSQL", "medium", "Microsoft SQL 데이터베이스"},
			1521:  {"Oracle", "medium", "Oracle DB 리스너"},
			3306:  {"MySQL", "medium", "MySQL/MariaDB 데이터베이스"},
			3389:  {"RDP", "high", "Windows 원격 데스크톱 연결"},
			5432:  {"PostgreSQL", "medium", "PostgreSQL 오픈소스 데이터베이스"},
			5900:  {"VNC", "high", "가상 네트워크 원격 화면 공유"},
			6379:  {"Redis", "high", "인메모리 데이터 저장소"},
			8080:  {"HTTP-Alt", "safe", "대체 웹 서비스 / 관리 콘솔"},
			8443:  {"HTTPS-Alt", "safe", "보안 대체 웹 포트"},
			9100:  {"JetDirect RAW", "safe", "네트워크 프린터 RAW 데이터"},
			27017: {"MongoDB", "medium", "MongoDB NoSQL 데이터베이스"},
		}

		var openList []PortAuditResult
		var mu sync.Mutex
		var wg sync.WaitGroup
		start := time.Now()

		for _, p := range targetPorts {
			wg.Add(1)
			go func(port int) {
				defer wg.Done()
				conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", ip, port), 600*time.Millisecond)
				if err == nil {
					conn.Close()
					sInfo, found := serviceMap[port]
					serviceName := fmt.Sprintf("Port %d", port)
					risk := "low"
					desc := "개방된 네트워크 포트"
					if found {
						serviceName = sInfo.name
						risk = sInfo.risk
						desc = sInfo.desc
					}

					mu.Lock()
					openList = append(openList, PortAuditResult{
						Port:        port,
						Service:     serviceName,
						Protocol:    "TCP",
						Risk:        risk,
						Description: desc,
					})
					mu.Unlock()
				}
			}(p)
		}
		wg.Wait()

		sort.Slice(openList, func(i, j int) bool {
			return openList[i].Port < openList[j].Port
		})

		resp := map[string]interface{}{
			"ip":             ip,
			"totalChecked":   len(targetPorts),
			"openPorts":      openList,
			"scanDurationMs": time.Since(start).Milliseconds(),
		}
		json.NewEncoder(w).Encode(resp)
	})

	http.HandleFunc("/api/exit", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		go func() {
			time.Sleep(500 * time.Millisecond)
			cleanupAndExit()
		}()
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/relaunch-admin", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if runtime.GOOS == "windows" {
			exePath, err := os.Executable()
			if err != nil {
				http.Error(w, "Failed to get executable path: "+err.Error(), http.StatusInternalServerError)
				return
			}
			
			exeName := filepath.Base(exePath)
			procName := strings.TrimSuffix(exeName, filepath.Ext(exeName))

			// Send success status first and flush, so client receives the OK response 
			// before the backend gets terminated.
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"success"}`))
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}

			// Run powershell command to:
			// 1. Wait 300ms to allow client to fully consume the HTTP response.
			// 2. Kill the previous Edge browser app window that was opened by the non-admin process (using our unique profile name to avoid killing user's personal browser).
			// 3. Kill all other running instances of this scanner to free up the socket port.
			// 4. Explicitly kill the current process to release the port socket.
			// 5. Relaunch the application with Administrator privileges (RunAs verb).
			cmdStr := fmt.Sprintf("Start-Sleep -Milliseconds 300; Get-WmiObject Win32_Process -Filter \"name='msedge.exe' and commandline like '%%CisnetGridScan%%'\" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Stop-Process -Name '%s' -Force -ErrorAction SilentlyContinue; Stop-Process -Id %d -Force -ErrorAction SilentlyContinue; Start-Process -FilePath '%s' -Verb RunAs", procName, os.Getpid(), exePath)
			cmd := exec.Command("powershell", "-Command", cmdStr)
			hideWindow(cmd)
			
			err = cmd.Start()
			if err != nil {
				fmt.Printf("Failed to elevate and restart process: %v\n", err)
			}

			// Perform immediate cleanup of temp files and exit
			go func() {
				time.Sleep(100 * time.Millisecond)
				cleanupAndExit()
			}()
			return
		} else {
			fmt.Println("Relaunch Admin requested on non-Windows environment. Simulating success.")
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	})

	public, err := fs.Sub(content, "dist")
	if err == nil {
		http.Handle("/", http.FileServer(http.FS(public)))
	}

	isPreview := os.Getenv("GRIDSCAN_MODE") == "preview"
	
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
		if isPreview {
			port = "8080"
		}
	}
	
	listenAddr := "127.0.0.1:" + port
	if isPreview {
		listenAddr = "0.0.0.0:" + port
	}
	
	if !isPreview {
		go func() {
			time.Sleep(500 * time.Millisecond) 
			openAppWindow("http://127.0.0.1:" + port)
		}()

		// Heartbeat checker: Exit if no heartbeat for 10 seconds (unless in emergency dialog/scan mode)
		go func() {
			for {
				time.Sleep(5 * time.Second)
				emergencyModeMutex.Lock()
				isEmerg := emergencyMode
				emergencyModeMutex.Unlock()

				if isEmerg {
					continue
				}

				heartbeatMutex.Lock()
				elapsed := time.Since(lastHeartbeat)
				heartbeatMutex.Unlock()
				
				if elapsed > 10*time.Second {
					fmt.Println("No heartbeat detected for 10s. Auto-exiting...")
					cleanupAndExit()
				}
			}
		}()
	}

	fmt.Printf("Cisnet Grid 2 Engine starting on %s (Preview: %v)\n", listenAddr, isPreview)
	if err := http.ListenAndServe(listenAddr, nil); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}
