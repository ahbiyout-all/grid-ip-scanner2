//go:build !windows
// +build !windows

package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"time"
)

var (
	reNvmePart = regexp.MustCompile(`^(nvme\d+n\d+|mmcblk\d+)p\d+$`)
	reSdPart   = regexp.MustCompile(`^([a-zA-Z]+)\d+$`)
)

const (
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

func hideWindow(cmd *exec.Cmd) {
	// Do nothing on non-Windows
}

func decodeANSI(b []byte) string {
	return string(b)
}

func byteSliceToString(b []byte) string {
	for i, c := range b {
		if c == 0 {
			b = b[:i]
			break
		}
	}
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

func isGridNetDriverLoaded() bool {
	return false
}

func tryNativeFastPing(ip string, timeoutMs int) (int, bool) {
	return -1, false
}

func tryNativeGetMacAddress(ip string) (string, bool) {
	return "", false
}

func tryNativeScanPort(ip string, port int, timeoutMs int) (bool, bool) {
	return false, false
}

func tryNativeGetNetBIOSName(ip string) (string, string, bool) {
	return "", "", false
}

func tryNativeGetServiceBanner(ip string, port int, timeoutMs int) (string, bool) {
	return "", false
}

func tryNativeBatchScanPorts(ip string, ports []int, timeoutMs int) ([]int, bool) {
	return nil, false
}

type OUISanitizerStats struct {
	TotalLines        int
	ValidEntries      int
	DuplicatesRemoved int
	MalformedLines    int
}

func tryNativeValidateAndSanitizeOUI(rawText string) (string, OUISanitizerStats, bool) {
	return "", OUISanitizerStats{}, false
}

func initNativeSystemTray(port string) {
	// Stub for non-Windows platforms
}

func openOrFocusTrayWindow() {
	// Stub for non-Windows platforms
}

func openOrFocusTrayWindowImmediate() {
	// Stub for non-Windows platforms
}

func focusExistingAppWindow() bool {
	return false
}

func syncNativeTrayVisuals() {
	// Stub for non-Windows platforms
}

func shutdownNativeTray() {
	// Stub for non-Windows platforms
}

func showTrayBalloonNotification(title, message string) {
	// Stub for non-Windows platforms
}

func showTrayBalloonNotificationWithSeverity(title, message, severity string) {
	// Stub for non-Windows platforms
}

func runAsWindowsService(serviceName string, onStart func(), onStop func()) bool {
	return false
}

func isRunningAsAdmin() bool {
	return os.Geteuid() == 0
}

// GetStorageBindingContext inspects the target directory mount and underlying block/USB controller
// on Linux/macOS to build a physical hardware fingerprint.
func GetStorageBindingContext(targetDir string) StorageBindingInfo {
	absDir, err := filepath.Abs(targetDir)
	if err != nil || absDir == "" {
		absDir = "."
	}

	info := StorageBindingInfo{
		MediaType: "fixed_disk",
		BusType:   runtime.GOOS,
	}

	// 1. Inspect mount source via findmnt on Linux
	sourceDev := ""
	fsType := ""
	findCtx, findCancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer findCancel()
	if out, err := exec.CommandContext(findCtx, "findmnt", "-n", "-o", "SOURCE,FSTYPE", "--target", absDir).Output(); err == nil {
		fields := strings.Fields(strings.TrimSpace(string(out)))
		if len(fields) >= 1 {
			sourceDev = fields[0]
		}
		if len(fields) >= 2 {
			fsType = fields[1]
		}
	}

	if strings.HasPrefix(fsType, "nfs") || strings.HasPrefix(fsType, "cifs") || strings.HasPrefix(fsType, "smb") {
		info.MediaType = "network_share"
		info.DeviceLabel = fmt.Sprintf("Network Share (%s)", fsType)
		sum := sha256.Sum256([]byte("NETSHARE|" + sourceDev + "|" + fsType))
		info.FingerprintHash = hex.EncodeToString(sum[:])
		info.FingerprintShort = info.FingerprintHash[:12]
		return info
	}

	if strings.HasPrefix(sourceDev, "/dev/") {
		devName := filepath.Base(sourceDev)
		baseBlock := stripLinuxPartitionSuffix(devName)
		sysBlockDir := filepath.Join("/sys/class/block", baseBlock)

		removableBytes, _ := os.ReadFile(filepath.Join(sysBlockDir, "removable"))
		isRemovable := strings.TrimSpace(string(removableBytes)) == "1"

		realDevPath, _ := filepath.EvalSymlinks(filepath.Join(sysBlockDir, "device"))
		isUsbBus := strings.Contains(realDevPath, "/usb")

		modelBytes, _ := os.ReadFile(filepath.Join(sysBlockDir, "device", "model"))
		vendorBytes, _ := os.ReadFile(filepath.Join(sysBlockDir, "device", "vendor"))
		serialBytes, _ := os.ReadFile(filepath.Join(sysBlockDir, "device", "serial"))
		sizeBytes, _ := os.ReadFile(filepath.Join(sysBlockDir, "size"))

		model := strings.TrimSpace(string(modelBytes))
		vendor := strings.TrimSpace(string(vendorBytes))
		serial := normalizeHardwareSerial(string(serialBytes))
		diskSize := strings.TrimSpace(string(sizeBytes))

		vid, pid, usbSerial := extractSysfsUsbMeta(realDevPath)
		if serial == "" && usbSerial != "" {
			serial = normalizeHardwareSerial(usbSerial)
		}

		if isRemovable || isUsbBus {
			info.MediaType = "removable_usb"
			info.BusType = "USB"
			info.VendorID = vid
			info.ProductID = pid
			info.Model = strings.TrimSpace(vendor + " " + model)
			if info.Model == "" {
				info.Model = "USB Storage Device"
			}
			info.SerialNumber = serial
			info.HasHardwareSerial = serial != ""

			if info.HasHardwareSerial {
				info.DeviceLabel = fmt.Sprintf("%s (VID:%s PID:%s)", info.Model, valueOrDash(vid), valueOrDash(pid))
				raw := fmt.Sprintf("USB_HW_V1|VID=%s|PID=%s|SN=%s|MODEL=%s|SIZE=%s", vid, pid, serial, info.Model, diskSize)
				sum := sha256.Sum256([]byte(raw))
				info.FingerprintHash = hex.EncodeToString(sum[:])
			} else {
				info.DeviceLabel = fmt.Sprintf("%s (No HW Serial)", info.Model)
				info.StrictOnlineCapHours = 24
				raw := fmt.Sprintf("USB_MODEL_V1|VID=%s|PID=%s|MODEL=%s|SIZE=%s|DEV=%s", vid, pid, info.Model, diskSize, baseBlock)
				sum := sha256.Sum256([]byte(raw))
				info.FingerprintHash = hex.EncodeToString(sum[:])
			}
			info.FingerprintShort = info.FingerprintHash[:12]
			return info
		}

		if serial != "" || model != "" {
			info.Model = strings.TrimSpace(vendor + " " + model)
			info.SerialNumber = serial
		}
	}

	// Fixed disk / container fallback using machine-id, DMI UUID, or persistent host NICs
	machineID := readFirstNonEmptyTrimmed(
		"/etc/machine-id",
		"/var/lib/dbus/machine-id",
		"/sys/class/dmi/id/product_uuid",
	)
	hostname, _ := os.Hostname()
	macList := collectStableHostMACs()
	info.HasHardwareSerial = machineID != "" || info.SerialNumber != "" || len(macList) > 0
	if info.Model != "" {
		info.DeviceLabel = fmt.Sprintf("Fixed Disk (%s)", info.Model)
	} else if fsType != "" {
		info.DeviceLabel = fmt.Sprintf("Host System (%s/%s)", runtime.GOOS, fsType)
	} else {
		info.DeviceLabel = fmt.Sprintf("Host System (%s)", runtime.GOOS)
	}

	raw := fmt.Sprintf("FIXED_HOST_V1|OS=%s|ARCH=%s|MID=%s|DSN=%s|HOST=%s|MACS=%s",
		runtime.GOOS, runtime.GOARCH, machineID, info.SerialNumber, hostname, strings.Join(macList, ","))
	sum := sha256.Sum256([]byte(raw))
	info.FingerprintHash = hex.EncodeToString(sum[:])
	info.FingerprintShort = info.FingerprintHash[:12]
	return info
}

func stripLinuxPartitionSuffix(dev string) string {
	if m := reNvmePart.FindStringSubmatch(dev); len(m) == 2 {
		return m[1]
	}
	if m := reSdPart.FindStringSubmatch(dev); len(m) == 2 {
		return m[1]
	}
	return dev
}

func extractSysfsUsbMeta(realPath string) (vid, pid, serial string) {
	if realPath == "" {
		return "", "", ""
	}
	cur := realPath
	for i := 0; i < 8; i++ {
		vBytes, errV := os.ReadFile(filepath.Join(cur, "idVendor"))
		pBytes, errP := os.ReadFile(filepath.Join(cur, "idProduct"))
		if errV == nil && errP == nil {
			vid = strings.ToUpper(strings.TrimSpace(string(vBytes)))
			pid = strings.ToUpper(strings.TrimSpace(string(pBytes)))
			if sBytes, errS := os.ReadFile(filepath.Join(cur, "serial")); errS == nil {
				serial = strings.TrimSpace(string(sBytes))
			}
			return vid, pid, serial
		}
		parent := filepath.Dir(cur)
		if parent == cur || parent == "/" || parent == "." {
			break
		}
		cur = parent
	}
	return "", "", ""
}

func readFirstNonEmptyTrimmed(paths ...string) string {
	for _, p := range paths {
		if b, err := os.ReadFile(p); err == nil {
			val := strings.TrimSpace(string(b))
			if val != "" {
				return val
			}
		}
	}
	return ""
}

func collectStableHostMACs() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var macs []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		hw := strings.ToUpper(strings.TrimSpace(iface.HardwareAddr.String()))
		if hw != "" {
			macs = append(macs, hw)
		}
	}
	sort.Strings(macs)
	return macs
}

func valueOrDash(v string) string {
	if strings.TrimSpace(v) == "" {
		return "-"
	}
	return v
}
