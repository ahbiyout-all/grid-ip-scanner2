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

func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

var (
	modkernel32             = syscall.NewLazyDLL("kernel32.dll")
	procMultiByteToWideChar = modkernel32.NewProc("MultiByteToWideChar")

	moduser32      = syscall.NewLazyDLL("user32.dll")
	procMessageBox = moduser32.NewProc("MessageBoxW")
)

const (
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
	_ = cmd.Start()
}

// launchBrowserWithFallback implements the 4-tier adaptive browser launch pipeline
func launchBrowserWithFallback(url string, profileDir string) bool {
	// Candidate browser commands for standalone app mode
	browsers := []struct {
		name string
		exe  string
		app  bool
	}{
		{name: "Microsoft Edge", exe: "msedge", app: true},
		{name: "Google Chrome", exe: "chrome", app: true},
		{name: "Naver Whale", exe: "whale", app: true},
		{name: "Brave Browser", exe: "brave", app: true},
	}

	// 1~3단계: Chromium 계열 브라우저 독립 앱 모드 시도
	for _, b := range browsers {
		var args []string
		if b.app {
			args = []string{"/c", "start", b.exe, "--app=" + url}
			if profileDir != "" {
				args = append(args, "--user-data-dir="+profileDir)
			}
		} else {
			args = []string{"/c", "start", b.exe, url}
		}

		cmd := exec.Command("cmd", args...)
		hideWindow(cmd)
		if err := cmd.Start(); err == nil {
			fmt.Printf("Successfully launched via %s (App Mode)\n", b.name)
			return true
		}
	}

	// 4단계: 시스템 기본 브라우저 열기 (Universal Fallback via start / rundll32)
	cmdStart := exec.Command("cmd", "/c", "start", url)
	hideWindow(cmdStart)
	if err := cmdStart.Start(); err == nil {
		fmt.Printf("Successfully launched via default system browser (cmd /c start)\n")
		return true
	}

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