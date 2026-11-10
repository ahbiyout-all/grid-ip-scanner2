//go:build windows
// +build windows

package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf8"
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
				macStr := byteSliceToString(buf)
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
				hostName := byteSliceToString(nameBuf)
				workgroup := byteSliceToString(wgBuf)
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
				banner := byteSliceToString(bannerBuf)
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

		appArgs := []string{
			"--app=" + url,
			"--disable-features=Translate",
			"--disable-translate",
			"--lang=ko",
		}
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
		paramStr := fmt.Sprintf("--app=%s --disable-features=Translate --disable-translate --lang=ko", url)
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

// byteSliceToString converts a null-terminated byte slice to a Go string with Korean character preservation
func byteSliceToString(b []byte) string {
	for i, c := range b {
		if c == 0 {
			b = b[:i]
			break
		}
	}
	if len(b) == 0 {
		return ""
	}
	if utf8.Valid(b) {
		return string(b)
	}
	return decodeANSI(b)
}

func decodeANSI(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	// If input is already valid UTF-8, return string directly
	if utf8.Valid(b) {
		str := string(b)
		if !strings.ContainsRune(str, utf8.RuneError) {
			return str
		}
	}
	// CP_ACP = 0 (Windows System ANSI Code Page, e.g., CP949 / EUC-KR in Korean Windows)
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

// =====================================================================
// Win32 Native System Tray (NotifyIcon) Engine
// Integrates standard Shell_NotifyIconW into standalone Grid_IP_Scanner2.exe
// =====================================================================

const (
	NIM_ADD        = 0x00000000
	NIM_MODIFY     = 0x00000001
	NIM_DELETE     = 0x00000002
	NIF_MESSAGE    = 0x00000001
	NIF_ICON       = 0x00000002
	NIF_TIP        = 0x00000004
	NIF_INFO       = 0x00000010

	WM_TRAY_CALLBACK = 0x8000 + 101 // WM_APP + 101
	WM_LBUTTONUP     = 0x0202
	WM_LBUTTONDBLCLK = 0x0203
	WM_RBUTTONUP     = 0x0205

	IMAGE_ICON     = 1
	LR_LOADFROMFILE = 0x00000010
	LR_DEFAULTSIZE  = 0x00000040

	MF_STRING    = 0x00000000
	MF_POPUP     = 0x00000010
	MF_SEPARATOR = 0x00000800
	MF_CHECKED   = 0x00000008
	MF_UNCHECKED = 0x00000000

	TPM_RIGHTALIGN  = 0x0008
	TPM_BOTTOMALIGN = 0x0020
	TPM_RETURNCMD   = 0x0100

	NIIF_NONE    = 0x00000000
	NIIF_INFO    = 0x00000001
	NIIF_WARNING = 0x00000002
	NIIF_ERROR   = 0x00000003

	IDM_TRAY_OPEN           = 2001
	IDM_TRAY_STATUS         = 2002
	IDM_TRAY_INTRUDER       = 2003
	IDM_TRAY_SCAN           = 2004
	IDM_TRAY_EXIT           = 2005
	IDM_TRAY_EMERGENCY_SCAN = 2010
	IDM_TRAY_FLUSH_DNS      = 2011
	IDM_TRAY_NCPA           = 2012
	IDM_TRAY_FIREWALL       = 2013
)

type NOTIFYICONDATAW struct {
	CbSize           uint32
	HWnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UTimeoutOrVersion uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
	GuidItem         [16]byte
	HBalloonIcon     uintptr
}

type WNDCLASSEXW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}

type POINT struct {
	X int32
	Y int32
}

type MSG struct {
	HWnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      POINT
}

var (
	procShellNotifyIconW = modshell32.NewProc("Shell_NotifyIconW")
	procRegisterClassExW = moduser32.NewProc("RegisterClassExW")
	procCreateWindowExW  = moduser32.NewProc("CreateWindowExW")
	procDefWindowProcW   = moduser32.NewProc("DefWindowProcW")
	procDestroyWindow    = moduser32.NewProc("DestroyWindow")
	procGetMessageW      = moduser32.NewProc("GetMessageW")
	procTranslateMessage = moduser32.NewProc("TranslateMessage")
	procDispatchMessageW = moduser32.NewProc("DispatchMessageW")
	procPostQuitMessage  = moduser32.NewProc("PostQuitMessage")
	procGetCursorPos     = moduser32.NewProc("GetCursorPos")
	procSetForegroundWindow = moduser32.NewProc("SetForegroundWindow")
	procCreatePopupMenu  = moduser32.NewProc("CreatePopupMenu")
	procAppendMenuW      = moduser32.NewProc("AppendMenuW")
	procTrackPopupMenu   = moduser32.NewProc("TrackPopupMenu")
	procDestroyMenu      = moduser32.NewProc("DestroyMenu")
	procLoadImageW       = moduser32.NewProc("LoadImageW")
	procGetModuleHandleW = modkernel32.NewProc("GetModuleHandleW")

	nativeTrayHWnd   uintptr
	nativeTrayIcon   uintptr
	nativeTrayPort   string
	nativeTrayActive bool
)

// showTrayBalloonNotification displays a native Windows Tray Balloon Tooltip (Shell_NotifyIconW with NIF_INFO)
func showTrayBalloonNotification(title, message string) {
	if nativeTrayHWnd == 0 {
		return
	}
	var nid NOTIFYICONDATAW
	nid.CbSize = uint32(unsafe.Sizeof(nid))
	nid.HWnd = nativeTrayHWnd
	nid.UID = 1
	nid.UFlags = NIF_INFO
	nid.DwInfoFlags = NIIF_INFO

	titleUTF16, err := syscall.UTF16FromString(title)
	if err == nil {
		for i := 0; i < len(titleUTF16) && i < len(nid.SzInfoTitle)-1; i++ {
			nid.SzInfoTitle[i] = titleUTF16[i]
		}
	}

	msgUTF16, err := syscall.UTF16FromString(message)
	if err == nil {
		for i := 0; i < len(msgUTF16) && i < len(nid.SzInfo)-1; i++ {
			nid.SzInfo[i] = msgUTF16[i]
		}
	}

	procShellNotifyIconW.Call(NIM_MODIFY, uintptr(unsafe.Pointer(&nid)))
}

func trayWndProc(hwnd uintptr, msg uint32, wparam uintptr, lparam uintptr) uintptr {
	switch msg {
	case WM_TRAY_CALLBACK:
		switch lparam {
		case WM_LBUTTONUP, WM_LBUTTONDBLCLK:
			// Left click or double click: Open UI Window
			if nativeTrayPort != "" {
				go openAppWindow("http://127.0.0.1:" + nativeTrayPort)
			}
			return 0

		case WM_RBUTTONUP:
			// Right click: Display Native Context Menu
			var pt POINT
			procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
			procSetForegroundWindow.Call(hwnd)

			hMenu, _, _ := procCreatePopupMenu.Call()
			if hMenu != 0 {
				titlePtr, _ := syscall.UTF16PtrFromString("🌐 Grid IP Scanner2 열기")
				procAppendMenuW.Call(hMenu, MF_STRING, IDM_TRAY_OPEN, uintptr(unsafe.Pointer(titlePtr)))

				statusPtr, _ := syscall.UTF16PtrFromString("🟢 24/7 백그라운드 침입 감시 가동 중")
				procAppendMenuW.Call(hMenu, MF_STRING, IDM_TRAY_STATUS, uintptr(unsafe.Pointer(statusPtr)))

				procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)

				scanPtr, _ := syscall.UTF16PtrFromString("⚡ 네트워크 스캔 화면 열기")
				procAppendMenuW.Call(hMenu, MF_STRING, IDM_TRAY_SCAN, uintptr(unsafe.Pointer(scanPtr)))

				// Build Submenu: 🛠️ Windows OS 레거시 대응 도구
				hSubMenu, _, _ := procCreatePopupMenu.Call()
				if hSubMenu != 0 {
					emgScanPtr, _ := syscall.UTF16PtrFromString("📄 구형 OS 긴급 IP 스캔 & 보고서 생성")
					procAppendMenuW.Call(hSubMenu, MF_STRING, IDM_TRAY_EMERGENCY_SCAN, uintptr(unsafe.Pointer(emgScanPtr)))

					procAppendMenuW.Call(hSubMenu, MF_SEPARATOR, 0, 0)

					dnsPtr, _ := syscall.UTF16PtrFromString("⚡ DNS 캐시 즉시 초기화 (flushdns)")
					procAppendMenuW.Call(hSubMenu, MF_STRING, IDM_TRAY_FLUSH_DNS, uintptr(unsafe.Pointer(dnsPtr)))

					ncpaPtr, _ := syscall.UTF16PtrFromString("🌐 네트워크 어댑터 제어판 (ncpa.cpl)")
					procAppendMenuW.Call(hSubMenu, MF_STRING, IDM_TRAY_NCPA, uintptr(unsafe.Pointer(ncpaPtr)))

					fwPtr, _ := syscall.UTF16PtrFromString("🛡️ Windows 방화벽 기본 복원 (reset)")
					procAppendMenuW.Call(hSubMenu, MF_STRING, IDM_TRAY_FIREWALL, uintptr(unsafe.Pointer(fwPtr)))

					subTitlePtr, _ := syscall.UTF16PtrFromString("🛠️ Windows OS 레거시 대응 도구")
					procAppendMenuW.Call(hMenu, MF_POPUP, hSubMenu, uintptr(unsafe.Pointer(subTitlePtr)))
				}

				procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)

				exitPtr, _ := syscall.UTF16PtrFromString("🛑 프로그램 완전 종료")
				procAppendMenuW.Call(hMenu, MF_STRING, IDM_TRAY_EXIT, uintptr(unsafe.Pointer(exitPtr)))

				cmd, _, _ := procTrackPopupMenu.Call(
					hMenu,
					TPM_RIGHTALIGN|TPM_BOTTOMALIGN|TPM_RETURNCMD,
					uintptr(pt.X),
					uintptr(pt.Y),
					0,
					hwnd,
					0,
				)

				if hSubMenu != 0 {
					procDestroyMenu.Call(hSubMenu)
				}
				procDestroyMenu.Call(hMenu)

				switch cmd {
				case IDM_TRAY_OPEN, IDM_TRAY_SCAN:
					if nativeTrayPort != "" {
						go openAppWindow("http://127.0.0.1:" + nativeTrayPort)
					}
				case IDM_TRAY_EMERGENCY_SCAN:
					go func() {
						showTrayBalloonNotification("긴급 IP 스캔 시작", "브라우저 없이 고속 백그라운드 IP 스캔 및 보고서 작성을 진행합니다...")
						runEmergencyScanAndReport(nativeTrayPort)
					}()
				case IDM_TRAY_FLUSH_DNS:
					go func() {
						cmd := exec.Command("ipconfig", "/flushdns")
						hideWindow(cmd)
						_ = cmd.Run()
						showTrayBalloonNotification("DNS 캐시 초기화 완료", "Windows DNS 리졸버 캐시가 성공적으로 초기화되었습니다.")
					}()
				case IDM_TRAY_NCPA:
					go func() {
						shellExecute("open", "ncpa.cpl", "", "", SW_SHOWNORMAL)
						showTrayBalloonNotification("네트워크 제어판 실행", "Windows 네트워크 어댑터 제어판(ncpa.cpl)을 열었습니다.")
					}()
				case IDM_TRAY_FIREWALL:
					go func() {
						cmd := exec.Command("netsh", "advfirewall", "reset")
						hideWindow(cmd)
						_ = cmd.Run()
						showTrayBalloonNotification("방화벽 규칙 복원 완료", "Windows 방화벽 기본 규칙이 성공적으로 초기화 및 복원되었습니다.")
					}()
				case IDM_TRAY_EXIT:
					go cleanupAndExit()
				}
			}
			return 0
		}
	}

	ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msg), wparam, lparam)
	return ret
}

func initNativeSystemTray(port string) {
	if nativeTrayActive {
		return
	}
	nativeTrayPort = port
	nativeTrayActive = true

	go func() {
		hInst, _, _ := procGetModuleHandleW.Call(0)
		className, _ := syscall.UTF16PtrFromString("GridIPScanner2_TrayClass")

		var wcx WNDCLASSEXW
		wcx.CbSize = uint32(unsafe.Sizeof(wcx))
		wcx.LpfnWndProc = syscall.NewCallback(trayWndProc)
		wcx.HInstance = hInst
		wcx.LpszClassName = className

		procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wcx)))

		hwnd, _, _ := procCreateWindowExW.Call(
			0,
			uintptr(unsafe.Pointer(className)),
			0,
			0,
			0, 0, 0, 0,
			0, 0,
			hInst,
			0,
		)
		if hwnd == 0 {
			return
		}
		nativeTrayHWnd = hwnd

		// Resolve Application Icon
		exePath, err := os.Executable()
		var iconPath string
		if err == nil {
			appDir := filepath.Dir(exePath)
			candidates := []string{
				filepath.Join(appDir, "icon.ico"),
				filepath.Join(appDir, "Grid IP Scanner2.ico"),
				filepath.Join(appDir, "public", "logo.png"),
			}
			for _, c := range candidates {
				if _, statErr := os.Stat(c); statErr == nil {
					iconPath = c
					break
				}
			}
		}

		if iconPath != "" {
			iconPathPtr, _ := syscall.UTF16PtrFromString(iconPath)
			hIcon, _, _ := procLoadImageW.Call(
				0,
				uintptr(unsafe.Pointer(iconPathPtr)),
				IMAGE_ICON,
				0, 0,
				LR_LOADFROMFILE|LR_DEFAULTSIZE,
			)
			nativeTrayIcon = hIcon
		}

		// Register Tray Icon to Windows Taskbar System Tray
		var nid NOTIFYICONDATAW
		nid.CbSize = uint32(unsafe.Sizeof(nid))
		nid.HWnd = hwnd
		nid.UID = 1001
		nid.UFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
		nid.UCallbackMessage = WM_TRAY_CALLBACK
		nid.HIcon = nativeTrayIcon

		tipStr := "Grid IP Scanner2 - 24/7 침입 감시 & 스캐너 가동 중"
		tipU16, _ := syscall.UTF16FromString(tipStr)
		copy(nid.SzTip[:], tipU16)

		procShellNotifyIconW.Call(NIM_ADD, uintptr(unsafe.Pointer(&nid)))

		// Keep Native Windows Message Loop Running in Background
		var msg MSG
		for {
			res, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if int32(res) <= 0 {
				break
			}
			procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
			procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
		}

		// Cleanup on exit
		procShellNotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&nid)))
	}()
}