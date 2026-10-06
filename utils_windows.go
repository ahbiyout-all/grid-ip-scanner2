//go:build windows
// +build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"unsafe"
)

const CREATE_NO_WINDOW = 0x08000000

func hideWindow(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	cmd.SysProcAttr.CreationFlags |= CREATE_NO_WINDOW
}

var (
	modkernel32             = syscall.NewLazyDLL("kernel32.dll")
	procMultiByteToWideChar = modkernel32.NewProc("MultiByteToWideChar")

	moduser32      = syscall.NewLazyDLL("user32.dll")
	procMessageBox = moduser32.NewProc("MessageBoxW")

	modshell32        = syscall.NewLazyDLL("shell32.dll")
	procShellExecuteW = modshell32.NewProc("ShellExecuteW")

	// Custom Pure Creative Native Network Acceleration DLL
	modGridNetDriver          = syscall.NewLazyDLL("grid_net_driver.dll")
	procGridNetFastPing       = modGridNetDriver.NewProc("GridNet_FastPing")
	procGridNetGetMac         = modGridNetDriver.NewProc("GridNet_GetMacAddress")
	procGridNetScanPort       = modGridNetDriver.NewProc("GridNet_ScanPort")
	procGridNetGetNetBIOS     = modGridNetDriver.NewProc("GridNet_GetNetBIOSName")
	procGridNetGetServiceBanner = modGridNetDriver.NewProc("GridNet_GetServiceBanner")
	procGridNetBatchScanPorts = modGridNetDriver.NewProc("GridNet_BatchScanPorts")
	procGridNetValidateOUI    = modGridNetDriver.NewProc("GridNet_ValidateAndSanitizeOUI")
	procGridNetGetVersion     = modGridNetDriver.NewProc("GridNet_GetDriverVersion")

	// Direct Win32 Iphlpapi Fallback
	modiphlpapi = syscall.NewLazyDLL("iphlpapi.dll")
	procSendARP = modiphlpapi.NewProc("SendARP")
)

// isGridNetDriverLoaded checks if the proprietary grid_net_driver.dll is loaded
func isGridNetDriverLoaded() bool {
	return modGridNetDriver.Load() == nil
}

// tryNativeFastPing executes zero-overhead ICMP Ping via custom DLL
func tryNativeFastPing(ip string, timeoutMs int) (int, bool) {
	if procGridNetFastPing.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			ret, _, _ := procGridNetFastPing.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(timeoutMs),
			)
			lat := int(int32(ret))
			if lat >= 0 {
				return lat, true
			}
		}
	}
	return -1, false
}

// tryNativeGetMacAddress resolves MAC address via custom DLL or direct Win32 SendARP API (0.1ms latency)
func tryNativeGetMacAddress(ip string) (string, bool) {
	// 1. Try Custom Proprietary DLL
	if procGridNetGetMac.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			buf := make([]byte, 32)
			ret, _, _ := procGridNetGetMac.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(unsafe.Pointer(&buf[0])),
				uintptr(len(buf)),
			)
			if ret != 0 {
				macStr := syscall.ByteSliceToString(buf)
				if macStr != "" {
					return macStr, true
				}
			}
		}
	}

	// 2. Direct Win32 iphlpapi.dll SendARP Fallback
	if procSendARP.Find() == nil {
		parsed := net.ParseIP(ip)
		if parsed != nil && parsed.To4() != nil {
			ip4 := parsed.To4()
			destIp := uint32(ip4[0]) | uint32(ip4[1])<<8 | uint32(ip4[2])<<16 | uint32(ip4[3])<<24
			var macAddr [8]byte
			macAddrLen := uint32(6)

			ret, _, _ := procSendARP.Call(
				uintptr(destIp),
				0,
				uintptr(unsafe.Pointer(&macAddr[0])),
				uintptr(unsafe.Pointer(&macAddrLen)),
			)
			if ret == 0 && macAddrLen == 6 {
				return fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X",
					macAddr[0], macAddr[1], macAddr[2], macAddr[3], macAddr[4], macAddr[5]), true
			}
		}
	}

	return "", false
}

// tryNativeScanPort performs non-blocking TCP port scan via custom DLL
func tryNativeScanPort(ip string, port int, timeoutMs int) (bool, bool) {
	if procGridNetScanPort.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			ret, _, _ := procGridNetScanPort.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(port),
				uintptr(timeoutMs),
			)
			if ret != 0 {
				return true, true
			}
			return false, true
		}
	}
	return false, false
}

// tryNativeGetNetBIOSName resolves Windows Hostname / Workgroup via UDP 137 NetBIOS DLL call
func tryNativeGetNetBIOSName(ip string) (string, string, bool) {
	if procGridNetGetNetBIOS.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			nameBuf := make([]byte, 64)
			wgBuf := make([]byte, 64)
			ret, _, _ := procGridNetGetNetBIOS.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(unsafe.Pointer(&nameBuf[0])),
				uintptr(len(nameBuf)),
				uintptr(unsafe.Pointer(&wgBuf[0])),
				uintptr(len(wgBuf)),
			)
			if ret != 0 {
				hostName := syscall.ByteSliceToString(nameBuf)
				workgroup := syscall.ByteSliceToString(wgBuf)
				return hostName, workgroup, true
			}
		}
	}
	return "", "", false
}

// tryNativeGetServiceBanner captures HTTP Server Banner via direct Winsock socket DLL call
func tryNativeGetServiceBanner(ip string, port int, timeoutMs int) (string, bool) {
	if procGridNetGetServiceBanner.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			bannerBuf := make([]byte, 128)
			ret, _, _ := procGridNetGetServiceBanner.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(port),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&bannerBuf[0])),
				uintptr(len(bannerBuf)),
			)
			if ret != 0 {
				banner := syscall.ByteSliceToString(bannerBuf)
				return banner, true
			}
		}
	}
	return "", false
}

// tryNativeBatchScanPorts probes multiple TCP ports in a single DLL invocation
func tryNativeBatchScanPorts(ip string, ports []int, timeoutMs int) ([]int, bool) {
	if len(ports) == 0 {
		return nil, false
	}
	if procGridNetBatchScanPorts.Find() == nil {
		ipPtr, err := syscall.BytePtrFromString(ip)
		if err == nil {
			cPorts := make([]int32, len(ports))
			for i, p := range ports {
				cPorts[i] = int32(p)
			}
			outPorts := make([]int32, len(ports))
			ret, _, _ := procGridNetBatchScanPorts.Call(
				uintptr(unsafe.Pointer(ipPtr)),
				uintptr(unsafe.Pointer(&cPorts[0])),
				uintptr(len(cPorts)),
				uintptr(timeoutMs),
				uintptr(unsafe.Pointer(&outPorts[0])),
				uintptr(len(outPorts)),
			)
			count := int(int32(ret))
			if count >= 0 {
				openPorts := make([]int, count)
				for i := 0; i < count; i++ {
					openPorts[i] = int(outPorts[i])
				}
				return openPorts, true
			}
		}
	}
	return nil, false
}

type OUISanitizerStats struct {
	TotalLines        int
	ValidEntries      int
	DuplicatesRemoved int
	MalformedLines    int
}

// tryNativeValidateAndSanitizeOUI validates, repairs, and de-duplicates OUI text data using native DLL C code
func tryNativeValidateAndSanitizeOUI(rawText string) (string, OUISanitizerStats, bool) {
	if len(rawText) == 0 {
		return "", OUISanitizerStats{}, false
	}
	if procGridNetValidateOUI.Find() == nil {
		rawBytes := []byte(rawText)
		outBuf := make([]byte, len(rawBytes)+1024)
		var total, valid, dup, malformed int32

		ret, _, _ := procGridNetValidateOUI.Call(
			uintptr(unsafe.Pointer(&rawBytes[0])),
			uintptr(len(rawBytes)),
			uintptr(unsafe.Pointer(&outBuf[0])),
			uintptr(len(outBuf)),
			uintptr(unsafe.Pointer(&total)),
			uintptr(unsafe.Pointer(&valid)),
			uintptr(unsafe.Pointer(&dup)),
			uintptr(unsafe.Pointer(&malformed)),
		)

		written := int(int32(ret))
		if written > 0 {
			sanitizedText := string(outBuf[:written])
			stats := OUISanitizerStats{
				TotalLines:        int(total),
				ValidEntries:      int(valid),
				DuplicatesRemoved: int(dup),
				MalformedLines:    int(malformed),
			}
			return sanitizedText, stats, true
		}
	}
	return "", OUISanitizerStats{}, false
}

const (
	SW_SHOWNORMAL       = 1
	MB_OK               = 0x00000000
	MB_OKCANCEL         = 0x00000001
	MB_YESNOCANCEL      = 0x00000003
	MB_YESNO            = 0x00000004
	MB_ICONINFORMATION  = 0x00000040
	MB_ICONQUESTION     = 0x00000020
	MB_ICONEXCLAMATION  = 0x00000030
	MB_TOPMOST          = 0x00040000
	MB_SETFOREGROUND    = 0x00010000

	IDOK     = 1
	IDCANCEL = 2
	IDYES    = 6
	IDNO     = 7
)

// shellExecute calls Windows ShellExecuteW directly without spawning any console window
func shellExecute(verb, file, args, dir string, showCmd int) bool {
	vPtr, _ := syscall.UTF16PtrFromString(verb)
	fPtr, _ := syscall.UTF16PtrFromString(file)
	var aPtr *uint16
	if args != "" {
		aPtr, _ = syscall.UTF16PtrFromString(args)
	}
	var dPtr *uint16
	if dir != "" {
		dPtr, _ = syscall.UTF16PtrFromString(dir)
	}
	ret, _, _ := procShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(vPtr)),
		uintptr(unsafe.Pointer(fPtr)),
		uintptr(unsafe.Pointer(aPtr)),
		uintptr(unsafe.Pointer(dPtr)),
		uintptr(showCmd),
	)
	// ShellExecute returns HINSTANCE > 32 on success
	return ret > 32
}

// showNativeMessageBox displays a pure Win32 MessageBox with topmost priority
func showNativeMessageBox(title, message string, flags uint) int {
	titlePtr, _ := syscall.UTF16PtrFromString(title)
	msgPtr, _ := syscall.UTF16PtrFromString(message)

	ret, _, _ := procMessageBox.Call(
		0,
		uintptr(unsafe.Pointer(msgPtr)),
		uintptr(unsafe.Pointer(titlePtr)),
		uintptr(flags|MB_TOPMOST|MB_SETFOREGROUND),
	)
	return int(ret)
}

// copyToClipboard copies plain text into Windows clipboard using clip.exe or powershell
func copyToClipboard(text string) {
	cmd := exec.Command("cmd", "/c", "echo "+text+"| clip")
	hideWindow(cmd)
	_ = cmd.Run()
}

// openWithNotepad launches Windows Notepad to view the report
func openWithNotepad(filePath string) {
	cmd := exec.Command("notepad.exe", filePath)
	hideWindow(cmd)
	_ = cmd.Start()
}

// launchBrowserWithFallback implements the 4-tier adaptive browser launch pipeline without spawning console windows
func launchBrowserWithFallback(url string, profileDir string) bool {
	progFiles := os.Getenv("ProgramFiles")
	progFilesX86 := os.Getenv("ProgramFiles(x86)")
	localAppData := os.Getenv("LOCALAPPDATA")

	// 1. Candidate browser definitions with common install paths
	type browserTarget struct {
		name      string
		exeName   string
		candidatePaths []string
	}

	targets := []browserTarget{
		{
			name:    "Microsoft Edge",
			exeName: "msedge.exe",
			candidatePaths: []string{
				filepath.Join(progFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(progFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
			},
		},
		{
			name:    "Google Chrome",
			exeName: "chrome.exe",
			candidatePaths: []string{
				filepath.Join(progFiles, "Google", "Chrome", "Application", "chrome.exe"),
				filepath.Join(progFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
				filepath.Join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
			},
		},
		{
			name:    "Naver Whale",
			exeName: "whale.exe",
			candidatePaths: []string{
				filepath.Join(progFiles, "Naver", "Naver Whale", "Application", "whale.exe"),
				filepath.Join(progFilesX86, "Naver", "Naver Whale", "Application", "whale.exe"),
				filepath.Join(localAppData, "Naver", "Naver Whale", "Application", "whale.exe"),
			},
		},
		{
			name:    "Brave Browser",
			exeName: "brave.exe",
			candidatePaths: []string{
				filepath.Join(progFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
				filepath.Join(progFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
				filepath.Join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
			},
		},
	}

	// 1~3단계: 직접 실행 파일 경로를 찾아 CUI 래퍼 없이 직접 실행 (가장 깨끗함, 콘솔 창 0% 노출)
	for _, target := range targets {
		var resolvedPath string
		for _, p := range target.candidatePaths {
			if p != "" {
				if _, err := os.Stat(p); err == nil {
					resolvedPath = p
					break
				}
			}
		}

		appArgs := []string{"--app=" + url}
		if profileDir != "" {
			appArgs = append(appArgs, "--user-data-dir="+profileDir)
		}

		if resolvedPath != "" {
			cmd := exec.Command(resolvedPath, appArgs...)
			hideWindow(cmd)
			if err := cmd.Start(); err == nil {
				fmt.Printf("Successfully launched via %s (Direct App Mode)\n", target.name)
				return true
			}
		}

		// 경로를 직접 못 찾았을 경우 Windows ShellExecuteW를 통해 App Paths 레지스트리로 실행 (콘솔 창 없음)
		paramStr := fmt.Sprintf("--app=%s", url)
		if profileDir != "" {
			paramStr += fmt.Sprintf(" --user-data-dir=\"%s\"", profileDir)
		}
		if shellExecute("open", target.exeName, paramStr, "", SW_SHOWNORMAL) {
			fmt.Printf("Successfully launched via %s (ShellExecute App Mode)\n", target.name)
			return true
		}
	}

	// 4단계: 시스템 기본 브라우저 열기 (ShellExecuteW를 통해 직접 URL 오픈 - cmd.exe 호출 없음)
	if shellExecute("open", url, "", "", SW_SHOWNORMAL) {
		fmt.Printf("Successfully launched via default system browser (ShellExecuteW)\n")
		return true
	}

	// 최후의 폴백 (rundll32 with CREATE_NO_WINDOW)
	cmdRundll := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url)
	hideWindow(cmdRundll)
	if err := cmdRundll.Start(); err == nil {
		fmt.Printf("Successfully launched via rundll32 FileProtocolHandler\n")
		return true
	}

	return false
}

func getDesktopPath() string {
	userProfile := os.Getenv("USERPROFILE")
	if userProfile != "" {
		desktop := filepath.Join(userProfile, "Desktop")
		if _, err := os.Stat(desktop); err == nil {
			return desktop
		}
	}
	return "."
}

func decodeANSI(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	// CP_ACP = 0
	ret, _, _ := procMultiByteToWideChar.Call(
		0,
		0,
		uintptr(unsafe.Pointer(&b[0])),
		uintptr(len(b)),
		0,
		0,
	)
	if ret == 0 {
		return string(b)
	}
	utf16Buf := make([]uint16, ret)
	ret, _, _ = procMultiByteToWideChar.Call(
		0,
		0,
		uintptr(unsafe.Pointer(&b[0])),
		uintptr(len(b)),
		uintptr(unsafe.Pointer(&utf16Buf[0])),
		uintptr(len(utf16Buf)),
	)
	if ret == 0 {
		return string(b)
	}
	return syscall.UTF16ToString(utf16Buf)
}