//go:build !windows
// +build !windows

package main

import (
	"fmt"
	"os/exec"
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

func hideWindow(cmd *exec.Cmd) {
	// Do nothing on non-Windows
}

func decodeANSI(b []byte) string {
	return string(b)
}

func showNativeMessageBox(title, message string, flags uint) int {
	fmt.Printf("\n=== [%s] ===\n%s\n", title, message)
	return IDOK
}

func copyToClipboard(text string) {
	fmt.Printf("[Clipboard Copied]: %s\n", text)
}

func openWithNotepad(filePath string) {
	fmt.Printf("[Open Report]: %s\n", filePath)
}

func launchBrowserWithFallback(url string, profileDir string) bool {
	// Simple fallback for Linux/macOS
	cmd := exec.Command("xdg-open", url)
	if err := cmd.Start(); err == nil {
		return true
	}
	cmdOpen := exec.Command("open", url)
	if err := cmdOpen.Start(); err == nil {
		return true
	}
	return false
}

func getDesktopPath() string {
	return "."
}
