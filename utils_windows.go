//go:build windows
// +build windows

package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
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

func isRunningAsAdmin() bool {
	f, err := os.Open("\\\\.\\PHYSICALDRIVE0")
	if err != nil {
		return false
	}
	_ = f.Close()
	return true
}

var (
	modkernel32             = syscall.NewLazyDLL(resolveSystemDllPath("kernel32.dll"))
	procMultiByteToWideChar = modkernel32.NewProc("MultiByteToWideChar")
	procGetDriveTypeW       = modkernel32.NewProc("GetDriveTypeW")
	procGetVolumeInfoW      = modkernel32.NewProc("GetVolumeInformationW")

	moduser32      = syscall.NewLazyDLL(resolveSystemDllPath("user32.dll"))
	procMessageBox = moduser32.NewProc("MessageBoxW")

	modshell32        = syscall.NewLazyDLL(resolveSystemDllPath("shell32.dll"))
	procShellExecuteW = modshell32.NewProc("ShellExecuteW")

	// Custom Pure Creative Native Network Acceleration DLL
	modGridNetDriver            = syscall.NewLazyDLL(resolveNativeDllPath("grid_net_driver.dll"))
	procGridNetFastPing         = modGridNetDriver.NewProc("GridNet_FastPing")
	procGridNetGetMac           = modGridNetDriver.NewProc("GridNet_GetMacAddress")
	procGridNetScanPort         = modGridNetDriver.NewProc("GridNet_ScanPort")
	procGridNetGetNetBIOS       = modGridNetDriver.NewProc("GridNet_GetNetBIOSName")
	procGridNetGetServiceBanner = modGridNetDriver.NewProc("GridNet_GetServiceBanner")
	procGridNetBatchScanPorts   = modGridNetDriver.NewProc("GridNet_BatchScanPorts")
	procGridNetValidateOUI      = modGridNetDriver.NewProc("GridNet_ValidateAndSanitizeOUI")
	procGridNetGetVersion       = modGridNetDriver.NewProc("GridNet_GetDriverVersion")

	// Direct Win32 Iphlpapi Fallback
	modiphlpapi = syscall.NewLazyDLL(resolveSystemDllPath("iphlpapi.dll"))
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
	SW_SHOWNORMAL      = 1
	MB_OK              = 0x00000000
	MB_OKCANCEL        = 0x00000001
	MB_YESNOCANCEL     = 0x00000003
	MB_YESNO           = 0x00000004
	MB_ICONINFORMATION = 0x00000040
	MB_ICONQUESTION    = 0x00000020
	MB_ICONEXCLAMATION = 0x00000030
	MB_TOPMOST         = 0x00040000
	MB_SETFOREGROUND   = 0x00010000

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

// copyToClipboard copies plain text into Windows clipboard via Stdin without shell interpolation
func copyToClipboard(text string) {
	cmd := exec.Command("clip")
	cmd.Stdin = strings.NewReader(text)
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
		name           string
		exeName        string
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
// Win32 Native System Tray (NotifyIcon) & SCM Service Engine
// Integrates dynamic state-badged Shell_NotifyIconW & Windows Service SCM
// =====================================================================

const (
	NIM_ADD     = 0x00000000
	NIM_MODIFY  = 0x00000001
	NIM_DELETE  = 0x00000002
	NIF_MESSAGE = 0x00000001
	NIF_ICON    = 0x00000002
	NIF_TIP     = 0x00000004
	NIF_INFO    = 0x00000010

	WM_TRAY_CALLBACK = 0x8000 + 101 // WM_APP + 101
	WM_LBUTTONUP     = 0x0202
	WM_LBUTTONDBLCLK = 0x0203
	WM_RBUTTONUP     = 0x0205

	IMAGE_ICON      = 1
	LR_LOADFROMFILE = 0x00000010
	LR_DEFAULTSIZE  = 0x00000040
	DI_NORMAL       = 0x0003

	MF_STRING    = 0x00000000
	MF_GRAYED    = 0x00000001
	MF_DISABLED  = 0x00000002
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

	IDM_TRAY_OPEN             = 2001
	IDM_TRAY_STATUS           = 2002
	IDM_TRAY_TOGGLE_WATCH     = 2003
	IDM_TRAY_QUICK_SCAN       = 2004
	IDM_TRAY_EXIT             = 2005
	IDM_TRAY_TOGGLE_SCHEDULER = 2006
	IDM_TRAY_RUN_SCHED_NOW    = 2007
	IDM_TRAY_TOGGLE_DND       = 2008
	IDM_TRAY_DND_30M          = 2009
	IDM_TRAY_EMERGENCY_SCAN   = 2010
	IDM_TRAY_FLUSH_DNS        = 2011
	IDM_TRAY_NCPA             = 2012
	IDM_TRAY_FIREWALL         = 2013
	IDM_TRAY_OPEN_LOG         = 2014
	IDM_TRAY_OPEN_SCHEDULER   = 2015
	IDM_TRAY_SERVICE_STATUS   = 2016
	IDM_TRAY_TOGGLE_AUTOSTART = 2017

	// Windows SCM Constants
	SERVICE_WIN32_OWN_PROCESS = 0x00000010
	SERVICE_STOPPED           = 0x00000001
	SERVICE_START_PENDING     = 0x00000002
	SERVICE_STOP_PENDING      = 0x00000003
	SERVICE_RUNNING           = 0x00000004
	SERVICE_ACCEPT_STOP       = 0x00000001
	SERVICE_ACCEPT_SHUTDOWN   = 0x00000004
	SERVICE_CONTROL_STOP      = 0x00000001
	SERVICE_CONTROL_SHUTDOWN  = 0x00000005
)

type NOTIFYICONDATAW struct {
	CbSize            uint32
	HWnd              uintptr
	UID               uint32
	UFlags            uint32
	UCallbackMessage  uint32
	HIcon             uintptr
	SzTip             [128]uint16
	DwState           uint32
	DwStateMask       uint32
	SzInfo            [256]uint16
	UTimeoutOrVersion uint32
	SzInfoTitle       [64]uint16
	DwInfoFlags       uint32
	GuidItem          [16]byte
	HBalloonIcon      uintptr
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

type BITMAPINFOHEADER struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

type ICONINFO struct {
	FIcon    uint32
	XHotspot uint32
	YHotspot uint32
	HbmMask  uintptr
	HbmColor uintptr
}

type SERVICE_TABLE_ENTRYW struct {
	LpServiceName *uint16
	LpServiceProc uintptr
}

type SERVICE_STATUS struct {
	DwServiceType             uint32
	DwCurrentState            uint32
	DwControlsAccepted        uint32
	DwWin32ExitCode           uint32
	DwServiceSpecificExitCode uint32
	DwCheckPoint              uint32
	DwWaitHint                uint32
}

var (
	procShellNotifyIconW    = modshell32.NewProc("Shell_NotifyIconW")
	procRegisterClassExW    = moduser32.NewProc("RegisterClassExW")
	procCreateWindowExW     = moduser32.NewProc("CreateWindowExW")
	procDefWindowProcW      = moduser32.NewProc("DefWindowProcW")
	procDestroyWindow       = moduser32.NewProc("DestroyWindow")
	procGetMessageW         = moduser32.NewProc("GetMessageW")
	procTranslateMessage    = moduser32.NewProc("TranslateMessage")
	procDispatchMessageW    = moduser32.NewProc("DispatchMessageW")
	procPostQuitMessage     = moduser32.NewProc("PostQuitMessage")
	procGetCursorPos        = moduser32.NewProc("GetCursorPos")
	procSetForegroundWindow = moduser32.NewProc("SetForegroundWindow")
	procCreatePopupMenu     = moduser32.NewProc("CreatePopupMenu")
	procAppendMenuW         = moduser32.NewProc("AppendMenuW")
	procTrackPopupMenu      = moduser32.NewProc("TrackPopupMenu")
	procDestroyMenu         = moduser32.NewProc("DestroyMenu")
	procLoadImageW          = moduser32.NewProc("LoadImageW")
	procDrawIconEx          = moduser32.NewProc("DrawIconEx")
	procCreateIconIndirect  = moduser32.NewProc("CreateIconIndirect")
	procDestroyIcon         = moduser32.NewProc("DestroyIcon")
	procGetModuleHandleW    = modkernel32.NewProc("GetModuleHandleW")

	modgdi32               = syscall.NewLazyDLL(resolveSystemDllPath("gdi32.dll"))
	procCreateCompatibleDC = modgdi32.NewProc("CreateCompatibleDC")
	procDeleteDC           = modgdi32.NewProc("DeleteDC")
	procSelectObject       = modgdi32.NewProc("SelectObject")
	procDeleteObject       = modgdi32.NewProc("DeleteObject")
	procCreateDIBSection   = modgdi32.NewProc("CreateDIBSection")
	procCreateBitmap       = modgdi32.NewProc("CreateBitmap")

	modadvapi32                    = syscall.NewLazyDLL(resolveSystemDllPath("advapi32.dll"))
	procStartServiceCtrlDispatcher = modadvapi32.NewProc("StartServiceCtrlDispatcherW")
	procRegisterServiceCtrlHandler = modadvapi32.NewProc("RegisterServiceCtrlHandlerW")
	procSetServiceStatus           = modadvapi32.NewProc("SetServiceStatus")

	procFindWindowW          = moduser32.NewProc("FindWindowW")
	procShowWindow           = moduser32.NewProc("ShowWindow")
	procIsWindowVisible      = moduser32.NewProc("IsWindowVisible")
	procIsIconic             = moduser32.NewProc("IsIconic")
	procEnumWindows          = moduser32.NewProc("EnumWindows")
	procGetWindowTextW       = moduser32.NewProc("GetWindowTextW")
	procGetWindowTextLengthW = moduser32.NewProc("GetWindowTextLengthW")

	nativeTrayMu     sync.RWMutex
	nativeTrayHWnd   uintptr
	nativeTrayIcon   uintptr
	nativeTrayPort   string
	nativeTrayActive bool
	trayBadgeIcons   = make(map[string]uintptr)

	trayOpenMutex    sync.Mutex
	lastTrayOpenTime time.Time

	enumWinMutex    sync.Mutex
	enumWinOnce     sync.Once
	enumWinCallback uintptr
	enumMatchedHWnd uintptr
)

const (
	SW_RESTORE = 9
	SW_SHOW    = 5
)

func enumAppWindowProc(hwnd uintptr, lparam uintptr) uintptr {
	visible, _, _ := procIsWindowVisible.Call(hwnd)
	if visible == 0 {
		return 1
	}
	length, _, _ := procGetWindowTextLengthW.Call(hwnd)
	if length == 0 {
		return 1
	}
	buf := make([]uint16, length+1)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	title := syscall.UTF16ToString(buf)
	if strings.Contains(title, "Grid IP Scanner2") || strings.Contains(title, "GRID IP 스캐너2") {
		enumMatchedHWnd = hwnd
		return 0 // stop enumeration
	}
	return 1
}

func focusExistingAppWindow() bool {
	enumWinOnce.Do(func() {
		enumWinCallback = syscall.NewCallback(enumAppWindowProc)
	})

	enumWinMutex.Lock()
	enumMatchedHWnd = 0
	procEnumWindows.Call(enumWinCallback, 0)
	matchedHWnd := enumMatchedHWnd
	enumWinMutex.Unlock()

	if matchedHWnd == 0 {
		titles := []string{"Grid IP Scanner2", "GRID IP 스캐너2", "Grid IP Scanner"}
		for _, t := range titles {
			tPtr, _ := syscall.UTF16PtrFromString(t)
			hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(tPtr)))
			if hwnd != 0 {
				matchedHWnd = hwnd
				break
			}
		}
	}

	if matchedHWnd != 0 {
		iconic, _, _ := procIsIconic.Call(matchedHWnd)
		if iconic != 0 {
			procShowWindow.Call(matchedHWnd, SW_RESTORE)
		} else {
			procShowWindow.Call(matchedHWnd, SW_SHOW)
		}
		procSetForegroundWindow.Call(matchedHWnd)
		return true
	}
	return false
}

func openOrFocusTrayWindow() {
	trayOpenMutex.Lock()
	if time.Since(lastTrayOpenTime) <= 1500*time.Millisecond {
		trayOpenMutex.Unlock()
		return
	}
	lastTrayOpenTime = time.Now()
	trayOpenMutex.Unlock()

	nativeTrayMu.RLock()
	port := nativeTrayPort
	nativeTrayMu.RUnlock()

	go func() {
		if !focusExistingAppWindow() {
			if port != "" {
				openAppWindow("http://127.0.0.1:" + port)
			}
		}
	}()
}

// buildBadgedTrayIcon creates a 32x32 ARGB HICON compositing a crisp status dot badge over the base icon.
func buildBadgedTrayIcon(baseIcon uintptr, mode string) uintptr {
	const size = 32
	if procCreateDIBSection.Find() != nil || procCreateIconIndirect.Find() != nil {
		return baseIcon
	}

	hdc, _, _ := procCreateCompatibleDC.Call(0)
	if hdc == 0 {
		return baseIcon
	}
	defer procDeleteDC.Call(hdc)

	var bmi BITMAPINFOHEADER
	bmi.BiSize = uint32(unsafe.Sizeof(bmi))
	bmi.BiWidth = size
	bmi.BiHeight = -size // top-down DIB
	bmi.BiPlanes = 1
	bmi.BiBitCount = 32
	bmi.BiCompression = 0

	var bitsPtr uintptr
	colorBmp, _, _ := procCreateDIBSection.Call(hdc, uintptr(unsafe.Pointer(&bmi)), 0, uintptr(unsafe.Pointer(&bitsPtr)), 0, 0)
	if colorBmp == 0 || bitsPtr == 0 {
		return baseIcon
	}
	defer procDeleteObject.Call(colorBmp)

	oldObj, _, _ := procSelectObject.Call(hdc, colorBmp)

	// Zero-fill transparent canvas before drawing base icon
	pixels := unsafe.Slice((*uint32)(unsafe.Pointer(bitsPtr)), size*size)
	for i := range pixels {
		pixels[i] = 0
	}

	if baseIcon != 0 && procDrawIconEx.Find() == nil {
		procDrawIconEx.Call(hdc, 0, 0, baseIcon, size, size, 0, 0, DI_NORMAL)
	} else {
		// Draw clean fallback radar square if base icon wasn't loaded from disk
		for y := 4; y < 28; y++ {
			for x := 4; x < 28; x++ {
				if x == 4 || x == 27 || y == 4 || y == 27 {
					pixels[y*size+x] = 0xFF38BDF8
				} else {
					pixels[y*size+x] = 0xFF0F172A
				}
			}
		}
	}

	// Select semantic badge color (BGRA in little-endian uint32: 0xAARRGGBB)
	var badgeColor uint32 = 0xFF64748B // standby slate
	switch mode {
	case "alert":
		badgeColor = 0xFFEF4444 // crimson alert
	case "scanning":
		badgeColor = 0xFFF59E0B // amber scanning
	case "watching":
		badgeColor = 0xFF10B981 // emerald active watch
	}

	// Paint 12px circular status badge at bottom-right corner (center 24.5, 24.5) with dark outline
	const cx = 24.5
	const cy = 24.5
	const rOuter = 6.8
	const rInner = 4.9
	for y := 16; y < size; y++ {
		for x := 16; x < size; x++ {
			dx := float64(x) - cx
			dy := float64(y) - cy
			dist2 := dx*dx + dy*dy
			if dist2 <= rInner*rInner {
				pixels[y*size+x] = badgeColor
			} else if dist2 <= rOuter*rOuter {
				pixels[y*size+x] = 0xFF09090B
			}
		}
	}

	procSelectObject.Call(hdc, oldObj)

	maskBmp, _, _ := procCreateBitmap.Call(size, size, 1, 1, 0)
	if maskBmp == 0 {
		return baseIcon
	}
	defer procDeleteObject.Call(maskBmp)

	var ii ICONINFO
	ii.FIcon = 1
	ii.HbmMask = maskBmp
	ii.HbmColor = colorBmp
	newIcon, _, _ := procCreateIconIndirect.Call(uintptr(unsafe.Pointer(&ii)))
	if newIcon == 0 {
		return baseIcon
	}
	return newIcon
}

func getTrayIconForMode(mode string) uintptr {
	nativeTrayMu.Lock()
	defer nativeTrayMu.Unlock()

	if cached, ok := trayBadgeIcons[mode]; ok && cached != 0 {
		return cached
	}
	badged := buildBadgedTrayIcon(nativeTrayIcon, mode)
	if badged != 0 {
		trayBadgeIcons[mode] = badged
		return badged
	}
	return nativeTrayIcon
}

func setUTF16FixedTip(dst []uint16, text string) {
	runes := []rune(text)
	maxChars := len(dst) - 1
	if len(runes) > maxChars {
		runes = append(runes[:maxChars-3], '.', '.', '.')
	}
	u16, _ := syscall.UTF16FromString(string(runes))
	for i := range dst {
		dst[i] = 0
	}
	copy(dst[:maxChars], u16)
}

func buildDynamicTrayTooltip(snap TrayRuntimeSnapshot) string {
	dndTag := ""
	if snap.DndActive {
		dndTag = " [방해금지]"
	}
	switch snap.Mode {
	case "alert":
		return fmt.Sprintf("Grid IP Scanner2 · 경고(침입 %d / 충돌 %d)%s", snap.IntruderCount, snap.ConflictCount, dndTag)
	case "scanning":
		return fmt.Sprintf("Grid IP Scanner2 · 스캔 %d%% 진행 중%s", snap.ScanProgressPercent, dndTag)
	case "watching":
		return fmt.Sprintf("Grid IP Scanner2 · 24/7 감시(활성 %d대)%s", snap.ActiveDeviceCount, dndTag)
	default:
		return fmt.Sprintf("Grid IP Scanner2 · 트레이 대기 중%s", dndTag)
	}
}

// syncNativeTrayVisuals updates the Windows taskbar tray icon badge and dynamic tooltip immediately.
func syncNativeTrayVisuals() {
	nativeTrayMu.RLock()
	trayHWnd := nativeTrayHWnd
	active := nativeTrayActive
	nativeTrayMu.RUnlock()
	if !active || trayHWnd == 0 {
		return
	}

	snap := globalTrayMgr.getSnapshot(false)
	hIcon := getTrayIconForMode(snap.Mode)
	tipText := buildDynamicTrayTooltip(snap)

	var nid NOTIFYICONDATAW
	nid.CbSize = uint32(unsafe.Sizeof(nid))
	nid.HWnd = trayHWnd
	nid.UID = 1001
	nid.UFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
	nid.UCallbackMessage = WM_TRAY_CALLBACK
	nid.HIcon = hIcon
	setUTF16FixedTip(nid.SzTip[:], tipText)

	procShellNotifyIconW.Call(NIM_MODIFY, uintptr(unsafe.Pointer(&nid)))
}

// showTrayBalloonNotification displays a standard INFO tray balloon tooltip.
func showTrayBalloonNotification(title, message string) {
	showTrayBalloonNotificationWithSeverity(title, message, "info")
}

// showTrayBalloonNotificationWithSeverity displays a Windows Tray Balloon Tooltip with severity icon (NIIF_ERROR/WARNING/INFO).
func showTrayBalloonNotificationWithSeverity(title, message, severity string) {
	nativeTrayMu.RLock()
	trayHWnd := nativeTrayHWnd
	nativeTrayMu.RUnlock()
	if trayHWnd == 0 {
		return
	}

	snap := globalTrayMgr.getSnapshot(false)
	hIcon := getTrayIconForMode(snap.Mode)

	var nid NOTIFYICONDATAW
	nid.CbSize = uint32(unsafe.Sizeof(nid))
	nid.HWnd = trayHWnd
	nid.UID = 1001
	nid.UFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP | NIF_INFO
	nid.UCallbackMessage = WM_TRAY_CALLBACK
	nid.HIcon = hIcon
	switch severity {
	case "critical":
		nid.DwInfoFlags = NIIF_ERROR
	case "warning":
		nid.DwInfoFlags = NIIF_WARNING
	default:
		nid.DwInfoFlags = NIIF_INFO
	}

	setUTF16FixedTip(nid.SzTip[:], buildDynamicTrayTooltip(snap))

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

func appendWinMenuString(hMenu uintptr, flags uintptr, id uintptr, label string) {
	ptr, _ := syscall.UTF16PtrFromString(label)
	procAppendMenuW.Call(hMenu, flags, id, uintptr(unsafe.Pointer(ptr)))
}

func trayWndProc(hwnd uintptr, msg uint32, wparam uintptr, lparam uintptr) uintptr {
	switch msg {
	case WM_TRAY_CALLBACK:
		switch lparam {
		case WM_LBUTTONUP, WM_LBUTTONDBLCLK:
			openOrFocusTrayWindow()
			return 0

		case WM_RBUTTONUP:
			var pt POINT
			procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
			procSetForegroundWindow.Call(hwnd)

			snap := globalTrayMgr.getSnapshot(false)
			hMenu, _, _ := procCreatePopupMenu.Call()
			if hMenu != 0 {
				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_OPEN, "🌐 Grid IP Scanner2 메인 창 열기")

				// Live summary status rows
				statusLine := "⚪ 상태: 대기 중 (Standby)"
				switch snap.Mode {
				case "alert":
					statusLine = fmt.Sprintf("🚨 경고: 미확인 %d대 · 충돌 %d건 · 활성 %d대", snap.IntruderCount, snap.ConflictCount, snap.ActiveDeviceCount)
				case "scanning":
					statusLine = fmt.Sprintf("⚡ 스캔 중 (%d%%) · 활성 %d대", snap.ScanProgressPercent, snap.ActiveDeviceCount)
				case "watching":
					statusLine = fmt.Sprintf("🟢 24/7 감시 중 · 활성 %d대 · 이상 없음", snap.ActiveDeviceCount)
				}
				appendWinMenuString(hMenu, MF_STRING|MF_GRAYED, IDM_TRAY_STATUS, statusLine)

				schedInfo := "⏱️ 예약 스케줄: 등록 없음"
				if snap.SchedulerPaused {
					schedInfo = fmt.Sprintf("⏸️ 스케줄러 일시정지 (%d개 대기)", snap.ActiveScheduleCount)
				} else if snap.ActiveScheduleCount > 0 {
					nextStr := ""
					if snap.NextScheduleAtMs > 0 {
						nextStr = " · 다음 " + time.UnixMilli(snap.NextScheduleAtMs).Format("15:04")
					}
					schedInfo = fmt.Sprintf("⏱️ 스케줄 가동 (%d개%s)", snap.ActiveScheduleCount, nextStr)
				}
				appendWinMenuString(hMenu, MF_STRING|MF_GRAYED, 0, schedInfo)

				procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)

				// Primary tray quick actions
				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_QUICK_SCAN, "⚡ 백그라운드 즉시 스캔 실행")

				watchFlag := uintptr(MF_STRING | MF_UNCHECKED)
				if snap.WatchEnabled {
					watchFlag = MF_STRING | MF_CHECKED
				}
				appendWinMenuString(hMenu, watchFlag, IDM_TRAY_TOGGLE_WATCH, "🚨 24/7 백그라운드 침입 감시")

				if snap.SchedulerPaused {
					appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_TOGGLE_SCHEDULER, "▶️ 활성 스케줄러 재개")
				} else {
					appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_TOGGLE_SCHEDULER, "⏸️ 활성 스케줄러 일시정지")
				}
				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_RUN_SCHED_NOW, "⏭️ 예약 스케줄 즉시 실행")

				// DND Submenu
				hDndMenu, _, _ := procCreatePopupMenu.Call()
				if hDndMenu != 0 {
					dndCheck := uintptr(MF_STRING | MF_UNCHECKED)
					if snap.DndActive {
						dndCheck = MF_STRING | MF_CHECKED
					}
					appendWinMenuString(hDndMenu, dndCheck, IDM_TRAY_TOGGLE_DND, "🔕 방해금지 모드 켜기/해제")
					appendWinMenuString(hDndMenu, MF_STRING, IDM_TRAY_DND_30M, "⏳ 30분 동안 알림 무음 (DND)")
					dndLabel := "🔕 방해금지 알림 제어"
					if snap.DndActive {
						dndLabel = "🔕 방해금지 적용 중 (DND ON)"
					}
					dndTitlePtr, _ := syscall.UTF16PtrFromString(dndLabel)
					procAppendMenuW.Call(hMenu, MF_POPUP, hDndMenu, uintptr(unsafe.Pointer(dndTitlePtr)))
				}

				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_OPEN_LOG, fmt.Sprintf("📋 최근 감시 이벤트 보기 (%d건)", len(snap.RecentEvents)))
				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_OPEN_SCHEDULER, "📅 정기 자동 스케줄러 열기")

				procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)

				// Windows OS & Service Submenu
				hSubMenu, _, _ := procCreatePopupMenu.Call()
				if hSubMenu != 0 {
					appendWinMenuString(hSubMenu, MF_STRING, IDM_TRAY_EMERGENCY_SCAN, "📄 구형 OS 긴급 IP 스캔 & 메모장 보고서")
					procAppendMenuW.Call(hSubMenu, MF_SEPARATOR, 0, 0)
					appendWinMenuString(hSubMenu, MF_STRING, IDM_TRAY_FLUSH_DNS, "⚡ DNS 캐시 즉시 초기화 (flushdns)")
					appendWinMenuString(hSubMenu, MF_STRING, IDM_TRAY_NCPA, "🌐 네트워크 어댑터 제어판 (ncpa.cpl)")
					appendWinMenuString(hSubMenu, MF_STRING, IDM_TRAY_FIREWALL, "🛡️ Windows 방화벽 기본 복원 (reset)")
					procAppendMenuW.Call(hSubMenu, MF_SEPARATOR, 0, 0)

					svcLabel := "🔄 Windows 서비스 상태: 미설치 (확인)"
					if snap.ServiceState == "running" {
						svcLabel = "🟢 Windows 24/7 서비스: 실행 중 (확인)"
					} else if snap.ServiceState == "stopped" {
						svcLabel = "🟡 Windows 24/7 서비스: 중지됨 (확인)"
					}
					appendWinMenuString(hSubMenu, MF_STRING, IDM_TRAY_SERVICE_STATUS, svcLabel)

					autoFlag := uintptr(MF_STRING | MF_UNCHECKED)
					if snap.AutoStartEnabled {
						autoFlag = MF_STRING | MF_CHECKED
					}
					appendWinMenuString(hSubMenu, autoFlag, IDM_TRAY_TOGGLE_AUTOSTART, "🚀 부팅 시 창 없이 트레이로 조용히 시작 (--tray)")

					subTitlePtr, _ := syscall.UTF16PtrFromString("🛠️ Windows OS 및 서비스 관리")
					procAppendMenuW.Call(hMenu, MF_POPUP, hSubMenu, uintptr(unsafe.Pointer(subTitlePtr)))
				}

				procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)
				appendWinMenuString(hMenu, MF_STRING, IDM_TRAY_EXIT, "🛑 프로그램 완전 종료")

				cmd, _, _ := procTrackPopupMenu.Call(
					hMenu,
					TPM_RIGHTALIGN|TPM_BOTTOMALIGN|TPM_RETURNCMD,
					uintptr(pt.X),
					uintptr(pt.Y),
					0,
					hwnd,
					0,
				)
				procDestroyMenu.Call(hMenu)

				switch cmd {
				case IDM_TRAY_OPEN:
					openOrFocusTrayWindow()
				case IDM_TRAY_QUICK_SCAN:
					go globalTrayMgr.executeTrayCommand("quick_scan", "", true)
				case IDM_TRAY_TOGGLE_WATCH:
					go globalTrayMgr.executeTrayCommand("toggle_watch", "", true)
				case IDM_TRAY_TOGGLE_SCHEDULER:
					go globalTrayMgr.executeTrayCommand("toggle_scheduler_pause", "", true)
				case IDM_TRAY_RUN_SCHED_NOW:
					go globalTrayMgr.executeTrayCommand("run_schedule_now", "", true)
				case IDM_TRAY_TOGGLE_DND:
					go globalTrayMgr.executeTrayCommand("toggle_dnd", "", true)
				case IDM_TRAY_DND_30M:
					go globalTrayMgr.executeTrayCommand("dnd_30m", "", true)
				case IDM_TRAY_OPEN_LOG:
					go globalTrayMgr.executeTrayCommand("open_intruder_log", "", true)
				case IDM_TRAY_OPEN_SCHEDULER:
					go globalTrayMgr.executeTrayCommand("open_scheduler", "", true)
				case IDM_TRAY_SERVICE_STATUS:
					go func() {
						globalTrayMgr.refreshWindowsSystemState(true)
						st := globalTrayMgr.getSnapshot(false).ServiceState
						desc := "미설치 상태입니다. 환경설정 > 24/7 서비스 등록으로 설치할 수 있습니다."
						if st == "running" {
							desc = "GridIPScannerService가 Session 0에서 정상 실행 중입니다."
						} else if st == "stopped" {
							desc = "GridIPScannerService가 설치되어 있으나 현재 정지 상태입니다."
						}
						showTrayBalloonNotificationWithSeverity("Windows 24/7 서비스 상태", desc, "info")
					}()
				case IDM_TRAY_TOGGLE_AUTOSTART:
					go func() {
						exePath, err := os.Executable()
						if err != nil {
							return
						}
						curSnap := globalTrayMgr.getSnapshot(false)
						if curSnap.AutoStartEnabled {
							c := exec.Command("reg", "delete", `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, "/v", "Grid IP Scanner2", "/f")
							hideWindow(c)
							_ = c.Run()
							showTrayBalloonNotificationWithSeverity("자동 시작 해제", "Windows 부팅 시 트레이 조용한 시작(--tray)이 해제되었습니다.", "info")
						} else {
							c := exec.Command("reg", "add", `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, "/v", "Grid IP Scanner2", "/t", "REG_SZ", "/d", fmt.Sprintf("\"%s\" --tray", exePath), "/f")
							hideWindow(c)
							_ = c.Run()
							showTrayBalloonNotificationWithSeverity("자동 시작 등록 완료", "다음 부팅부터 창 없이 트레이로 조용히 시작(--tray)됩니다.", "info")
						}
						globalTrayMgr.refreshWindowsSystemState(true)
						syncNativeTrayVisuals()
					}()
				case IDM_TRAY_EMERGENCY_SCAN:
					go func() {
						showTrayBalloonNotification("긴급 IP 스캔 시작", "브라우저 없이 고속 백그라운드 IP 스캔 및 보고서 작성을 진행합니다...")
						runEmergencyScanAndReport(nativeTrayPort)
					}()
				case IDM_TRAY_FLUSH_DNS:
					go func() {
						c := exec.Command("ipconfig", "/flushdns")
						hideWindow(c)
						_ = c.Run()
						showTrayBalloonNotification("DNS 캐시 초기화 완료", "Windows DNS 리졸버 캐시가 성공적으로 초기화되었습니다.")
					}()
				case IDM_TRAY_NCPA:
					go func() {
						shellExecute("open", "ncpa.cpl", "", "", SW_SHOWNORMAL)
						showTrayBalloonNotification("네트워크 제어판 실행", "Windows 네트워크 어댑터 제어판(ncpa.cpl)을 열었습니다.")
					}()
				case IDM_TRAY_FIREWALL:
					go func() {
						c := exec.Command("netsh", "advfirewall", "reset")
						hideWindow(c)
						_ = c.Run()
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
	nativeTrayMu.Lock()
	if nativeTrayActive {
		nativeTrayMu.Unlock()
		return
	}
	nativeTrayPort = port
	nativeTrayActive = true
	nativeTrayMu.Unlock()

	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()

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

		var trayIcon uintptr
		if iconPath != "" {
			iconPathPtr, _ := syscall.UTF16PtrFromString(iconPath)
			hIcon, _, _ := procLoadImageW.Call(
				0,
				uintptr(unsafe.Pointer(iconPathPtr)),
				IMAGE_ICON,
				0, 0,
				LR_LOADFROMFILE|LR_DEFAULTSIZE,
			)
			trayIcon = hIcon
		}

		nativeTrayMu.Lock()
		nativeTrayHWnd = hwnd
		nativeTrayIcon = trayIcon
		nativeTrayMu.Unlock()

		snap := globalTrayMgr.getSnapshot(false)
		activeIcon := getTrayIconForMode(snap.Mode)

		// Register Tray Icon to Windows Taskbar System Tray
		var nid NOTIFYICONDATAW
		nid.CbSize = uint32(unsafe.Sizeof(nid))
		nid.HWnd = hwnd
		nid.UID = 1001
		nid.UFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
		nid.UCallbackMessage = WM_TRAY_CALLBACK
		nid.HIcon = activeIcon
		setUTF16FixedTip(nid.SzTip[:], buildDynamicTrayTooltip(snap))

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

		// Cleanup icons and tray on exit
		procShellNotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&nid)))
		nativeTrayMu.Lock()
		for _, ic := range trayBadgeIcons {
			if ic != 0 && ic != nativeTrayIcon {
				procDestroyIcon.Call(ic)
			}
		}
		trayBadgeIcons = make(map[string]uintptr)
		nativeTrayMu.Unlock()
	}()
}

// =====================================================================
// Windows Service Control Manager (SCM) Native Dispatcher
// Eliminates Error 1053 when launched as GridIPScannerService (--service)
// =====================================================================

var (
	winSvcStatusHandle uintptr
	winSvcStopChan     chan struct{}
	winSvcOnStart      func()
	winSvcOnStop       func()
)

func setWinServiceState(state uint32, win32Exit uint32, checkPoint uint32, waitHint uint32) {
	if winSvcStatusHandle == 0 || procSetServiceStatus.Find() != nil {
		return
	}
	var st SERVICE_STATUS
	st.DwServiceType = SERVICE_WIN32_OWN_PROCESS
	st.DwCurrentState = state
	if state == SERVICE_RUNNING {
		st.DwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN
	}
	st.DwWin32ExitCode = win32Exit
	st.DwCheckPoint = checkPoint
	st.DwWaitHint = waitHint
	procSetServiceStatus.Call(winSvcStatusHandle, uintptr(unsafe.Pointer(&st)))
}

func winServiceCtrlHandler(ctrlCode uint32) uintptr {
	switch ctrlCode {
	case SERVICE_CONTROL_STOP, SERVICE_CONTROL_SHUTDOWN:
		setWinServiceState(SERVICE_STOP_PENDING, 0, 1, 3000)
		if winSvcStopChan != nil {
			select {
			case <-winSvcStopChan:
			default:
				close(winSvcStopChan)
			}
		}
		if winSvcOnStop != nil {
			go winSvcOnStop()
		}
	}
	return 0
}

func winServiceMain(argc uint32, argv uintptr) uintptr {
	svcNamePtr, _ := syscall.UTF16PtrFromString("GridIPScannerService")
	ctrlCb := syscall.NewCallback(winServiceCtrlHandler)
	handle, _, _ := procRegisterServiceCtrlHandler.Call(uintptr(unsafe.Pointer(svcNamePtr)), ctrlCb)
	if handle == 0 {
		return 0
	}
	winSvcStatusHandle = handle
	winSvcStopChan = make(chan struct{})

	setWinServiceState(SERVICE_START_PENDING, 0, 1, 3000)
	if winSvcOnStart != nil {
		go winSvcOnStart()
	}
	setWinServiceState(SERVICE_RUNNING, 0, 0, 0)

	<-winSvcStopChan
	setWinServiceState(SERVICE_STOPPED, 0, 0, 0)
	return 0
}

// runAsWindowsService hands execution to Windows SCM when started with --service. Returns false if not invoked by SCM.
func runAsWindowsService(serviceName string, onStart func(), onStop func()) bool {
	if procStartServiceCtrlDispatcher.Find() != nil {
		return false
	}
	winSvcOnStart = onStart
	winSvcOnStop = onStop

	svcNamePtr, _ := syscall.UTF16PtrFromString(serviceName)
	svcMainCb := syscall.NewCallback(winServiceMain)
	table := [2]SERVICE_TABLE_ENTRYW{
		{LpServiceName: svcNamePtr, LpServiceProc: svcMainCb},
		{LpServiceName: nil, LpServiceProc: 0},
	}

	ret, _, _ := procStartServiceCtrlDispatcher.Call(uintptr(unsafe.Pointer(&table[0])))
	return ret != 0
}

// =====================================================================
// Portable USB Physical Controller Fingerprinter (Windows)
// Extracts Win32 DriveType + PhysicalDisk CIM (USB VID/PID/Serial)
// =====================================================================

const (
	driveUnknown   = 0
	driveNoRootDir = 1
	driveRemovable = 2
	driveFixed     = 3
	driveRemote    = 4
)

type winDiskProbeResult struct {
	InterfaceType string `json:"InterfaceType"`
	MediaType     string `json:"MediaType"`
	Model         string `json:"Model"`
	SerialNumber  string `json:"SerialNumber"`
	PNPDeviceID   string `json:"PNPDeviceID"`
	Size          uint64 `json:"Size"`
	MachineGuid   string `json:"MachineGuid"`
}

func getWinDriveType(rootPath string) uint32 {
	if procGetDriveTypeW.Find() != nil {
		return driveUnknown
	}
	ptr, err := syscall.UTF16PtrFromString(rootPath)
	if err != nil {
		return driveUnknown
	}
	ret, _, _ := procGetDriveTypeW.Call(uintptr(unsafe.Pointer(ptr)))
	return uint32(ret)
}

func getWinVolumeSerial(rootPath string) string {
	if procGetVolumeInfoW.Find() != nil {
		return ""
	}
	ptr, err := syscall.UTF16PtrFromString(rootPath)
	if err != nil {
		return ""
	}
	var serial uint32
	ret, _, _ := procGetVolumeInfoW.Call(
		uintptr(unsafe.Pointer(ptr)),
		0, 0,
		uintptr(unsafe.Pointer(&serial)),
		0, 0, 0, 0,
	)
	if ret == 0 || serial == 0 {
		return ""
	}
	return fmt.Sprintf("%08X", serial)
}

func probeWindowsPhysicalDrive(driveLetter string) winDiskProbeResult {
	var res winDiskProbeResult
	psDrive := strings.TrimRight(strings.TrimSpace(driveLetter), `\/`)
	if len(psDrive) == 2 && psDrive[1] == ':' {
		// Safe validated drive letter e.g. "E:"
	} else {
		psDrive = ""
	}

	psScript := fmt.Sprintf(`
$ErrorActionPreference = 'SilentlyContinue'
$mGuid = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid
$disk = $null
if ('%s' -ne '') {
  $ld = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='%s'"
  if ($ld) {
    $part = Get-CimAssociatedInstance -InputObject $ld -ResultClassName Win32_DiskPartition | Select-Object -First 1
    if ($part) {
      $disk = Get-CimAssociatedInstance -InputObject $part -ResultClassName Win32_DiskDrive | Select-Object -First 1
    }
  }
}
[PSCustomObject]@{
  InterfaceType = if ($disk) { [string]$disk.InterfaceType } else { '' }
  MediaType     = if ($disk) { [string]$disk.MediaType } else { '' }
  Model         = if ($disk) { [string]$disk.Model } else { '' }
  SerialNumber  = if ($disk) { [string]$disk.SerialNumber } else { '' }
  PNPDeviceID   = if ($disk) { [string]$disk.PNPDeviceID } else { '' }
  Size          = if ($disk -and $disk.Size) { [uint64]$disk.Size } else { 0 }
  MachineGuid   = [string]$mGuid
} | ConvertTo-Json -Compress
`, psDrive, psDrive)

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript)
	hideWindow(cmd)
	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		_ = json.Unmarshal(out, &res)
	}
	return res
}

var (
	reWinUsbVid = regexp.MustCompile(`VID_([0-9A-F]{4})`)
	reWinUsbPid = regexp.MustCompile(`PID_([0-9A-F]{4})`)
)

func parseWinUsbVidPidSerial(pnpID string) (vid, pid, instSerial string) {
	upper := strings.ToUpper(strings.TrimSpace(pnpID))
	if m := reWinUsbVid.FindStringSubmatch(upper); len(m) == 2 {
		vid = m[1]
	}
	if m := reWinUsbPid.FindStringSubmatch(upper); len(m) == 2 {
		pid = m[1]
	}
	parts := strings.Split(upper, `\`)
	if len(parts) >= 3 && strings.Contains(upper, "USB") {
		candidate := parts[len(parts)-1]
		if idx := strings.Index(candidate, "&"); idx > 0 {
			candidate = candidate[:idx]
		}
		instSerial = normalizeHardwareSerial(candidate)
	}
	return vid, pid, instSerial
}

// GetStorageBindingContext inspects Windows drive type and physical disk/USB controller identity.
func GetStorageBindingContext(targetDir string) StorageBindingInfo {
	absDir, err := filepath.Abs(targetDir)
	if err != nil || absDir == "" {
		absDir = "."
	}

	info := StorageBindingInfo{
		MediaType: "fixed_disk",
		BusType:   "WINDOWS",
	}

	vol := filepath.VolumeName(absDir)
	if strings.HasPrefix(vol, `\\`) {
		info.MediaType = "network_share"
		info.DeviceLabel = fmt.Sprintf("Network Share (%s)", vol)
		sum := sha256.Sum256([]byte("NETSHARE_WIN|" + strings.ToUpper(vol)))
		info.FingerprintHash = hex.EncodeToString(sum[:])
		info.FingerprintShort = info.FingerprintHash[:12]
		return info
	}

	rootPath := ""
	if len(vol) == 2 && vol[1] == ':' {
		rootPath = vol + `\`
	}

	drvType := uint32(driveUnknown)
	if rootPath != "" {
		drvType = getWinDriveType(rootPath)
	}
	if drvType == driveRemote {
		info.MediaType = "network_share"
		info.DeviceLabel = fmt.Sprintf("Mapped Network Drive (%s)", vol)
		sum := sha256.Sum256([]byte("NETSHARE_WIN|" + strings.ToUpper(vol)))
		info.FingerprintHash = hex.EncodeToString(sum[:])
		info.FingerprintShort = info.FingerprintHash[:12]
		return info
	}

	probe := probeWindowsPhysicalDrive(vol)
	model := strings.TrimSpace(probe.Model)
	ifaceUpper := strings.ToUpper(strings.TrimSpace(probe.InterfaceType))
	mediaUpper := strings.ToUpper(strings.TrimSpace(probe.MediaType))
	pnpUpper := strings.ToUpper(strings.TrimSpace(probe.PNPDeviceID))

	vid, pid, pnpSerial := parseWinUsbVidPidSerial(probe.PNPDeviceID)
	diskSerial := normalizeHardwareSerial(probe.SerialNumber)
	if diskSerial == "" {
		diskSerial = pnpSerial
	}

	isUSB := drvType == driveRemovable ||
		ifaceUpper == "USB" ||
		strings.Contains(mediaUpper, "REMOVABLE") ||
		strings.Contains(mediaUpper, "EXTERNAL") ||
		strings.HasPrefix(pnpUpper, "USBSTOR")

	if isUSB {
		info.MediaType = "removable_usb"
		info.BusType = "USB"
		info.VendorID = vid
		info.ProductID = pid
		info.Model = model
		if info.Model == "" {
			info.Model = "USB Storage Drive"
		}
		info.SerialNumber = diskSerial
		info.HasHardwareSerial = diskSerial != ""

		if info.HasHardwareSerial {
			if vid != "" || pid != "" {
				info.DeviceLabel = fmt.Sprintf("%s (%s · VID:%s PID:%s)", info.Model, vol, vid, pid)
			} else {
				info.DeviceLabel = fmt.Sprintf("%s (%s · USB Hardware Serial)", info.Model, vol)
			}
			raw := fmt.Sprintf("USB_HW_V1|VID=%s|PID=%s|SN=%s|MODEL=%s|SIZE=%d", vid, pid, diskSerial, info.Model, probe.Size)
			sum := sha256.Sum256([]byte(raw))
			info.FingerprintHash = hex.EncodeToString(sum[:])
		} else {
			volSerial := getWinVolumeSerial(rootPath)
			info.DeviceLabel = fmt.Sprintf("%s (%s · No Controller Serial)", info.Model, vol)
			info.StrictOnlineCapHours = 24
			raw := fmt.Sprintf("USB_MODEL_V1|VID=%s|PID=%s|MODEL=%s|SIZE=%d|VSN=%s", vid, pid, info.Model, probe.Size, volSerial)
			sum := sha256.Sum256([]byte(raw))
			info.FingerprintHash = hex.EncodeToString(sum[:])
		}
		info.FingerprintShort = info.FingerprintHash[:12]
		return info
	}

	// Internal fixed disk install: bind to PC MachineGuid + physical disk serial
	mGuid := strings.TrimSpace(probe.MachineGuid)
	info.Model = model
	info.SerialNumber = diskSerial
	info.HasHardwareSerial = mGuid != "" || diskSerial != ""
	if model != "" {
		info.DeviceLabel = fmt.Sprintf("Fixed PC (%s)", model)
	} else {
		info.DeviceLabel = "Fixed Windows PC"
	}
	raw := fmt.Sprintf("FIXED_PC_V1|MGUID=%s|DSN=%s|MODEL=%s|SIZE=%d", mGuid, diskSerial, model, probe.Size)
	sum := sha256.Sum256([]byte(raw))
	info.FingerprintHash = hex.EncodeToString(sum[:])
	info.FingerprintShort = info.FingerprintHash[:12]
	return info
}
