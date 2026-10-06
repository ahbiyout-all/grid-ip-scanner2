//go:build windows
// +build windows

package main

/*
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"net"
	"strconv"
	"syscall"
	"time"
	"unsafe"
)

var (
	modiphlpapi = syscall.NewLazyDLL("iphlpapi.dll")
	procSendARP = modiphlpapi.NewProc("SendARP")
)

//export GridNet_GetDriverVersion
func GridNet_GetDriverVersion() C.int {
	return C.int(20303) // v2.3.3
}

//export GridNet_FastPing
func GridNet_FastPing(ip *C.char, timeoutMs C.int) C.int {
	if ip == nil {
		return C.int(-1)
	}
	goIp := C.GoString(ip)
	start := time.Now()

	conn, err := net.DialTimeout("tcp", net.JoinHostPort(goIp, "80"), time.Duration(timeoutMs)*time.Millisecond)
	if err == nil {
		conn.Close()
		latency := int(time.Since(start).Milliseconds())
		if latency == 0 {
			latency = 1
		}
		return C.int(latency)
	}

	return C.int(-1)
}

//export GridNet_GetMacAddress
func GridNet_GetMacAddress(ip *C.char, outMac *C.char, maxLen C.int) C.int {
	if ip == nil || outMac == nil || maxLen < 18 {
		return C.int(0)
	}
	goIp := C.GoString(ip)
	parsedIp := net.ParseIP(goIp)
	if parsedIp == nil || parsedIp.To4() == nil {
		return C.int(0)
	}

	ip4 := parsedIp.To4()
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
		formatted := C.CString(net.HardwareAddr(macAddr[:6]).String())
		defer C.free(unsafe.Pointer(formatted))

		// Copy string to output C buffer
		C.strncpy(outMac, formatted, C.size_t(maxLen-1))
		return C.int(1)
	}

	return C.int(0)
}

//export GridNet_ScanPort
func GridNet_ScanPort(ip *C.char, port C.int, timeoutMs C.int) C.int {
	if ip == nil || port <= 0 || port > 65535 {
		return C.int(0)
	}
	goIp := C.GoString(ip)
	portStr := strconv.Itoa(int(port))
	addr := net.JoinHostPort(goIp, portStr)

	conn, err := net.DialTimeout("tcp", addr, time.Duration(timeoutMs)*time.Millisecond)
	if err == nil {
		conn.Close()
		return C.int(1)
	}

	return C.int(0)
}

//export GridNet_GetNetBIOSName
func GridNet_GetNetBIOSName(ip *C.char, outName *C.char, nameMaxLen C.int, outWorkgroup *C.char, wgMaxLen C.int) C.int {
	if ip == nil || outName == nil || nameMaxLen < 2 {
		return C.int(0)
	}
	goIp := C.GoString(ip)
	names, err := net.LookupAddr(goIp)
	if err == nil && len(names) > 0 {
		hostName := names[0]
		if len(hostName) > 0 {
			formatted := C.CString(hostName)
			defer C.free(unsafe.Pointer(formatted))
			C.strncpy(outName, formatted, C.size_t(nameMaxLen-1))
			return C.int(1)
		}
	}
	return C.int(0)
}

//export GridNet_GetServiceBanner
func GridNet_GetServiceBanner(ip *C.char, port C.int, timeoutMs C.int, outBanner *C.char, maxLen C.int) C.int {
	if ip == nil || port <= 0 || outBanner == nil || maxLen < 4 {
		return C.int(0)
	}
	goIp := C.GoString(ip)
	addr := fmt.Sprintf("%s:%d", goIp, int(port))
	conn, err := net.DialTimeout("tcp", addr, time.Duration(timeoutMs)*time.Millisecond)
	if err != nil {
		return C.int(0)
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))
	fmt.Fprintf(conn, "HEAD / HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n", goIp)

	buf := make([]byte, 512)
	n, err := conn.Read(buf)
	if err == nil && n > 0 {
		str := string(buf[:n])
		for _, line := range net.LookupIP(goIp) {
			_ = line
		}
		if idx := strconv.IntSize; idx > 0 {
			// Basic parse
			_ = str
		}
	}
	return C.int(0)
}

//export GridNet_BatchScanPorts
func GridNet_BatchScanPorts(ip *C.char, ports *C.int, portCount C.int, timeoutMs C.int, outOpenPorts *C.int, maxOpenCount C.int) C.int {
	if ip == nil || ports == nil || portCount <= 0 || outOpenPorts == nil || maxOpenCount <= 0 {
		return C.int(0)
	}
	return C.int(0)
}

//export GridNet_ValidateAndSanitizeOUI
func GridNet_ValidateAndSanitizeOUI(raw *C.char, rawLen C.int, outBuf *C.char, cap C.int, total *C.int, valid *C.int, dup *C.int, malformed *C.int) C.int {
	if raw == nil || rawLen <= 0 || outBuf == nil || cap <= 0 {
		return C.int(0)
	}
	return C.int(0)
}

func main() {
	// Required for C-Shared DLL compilation
}
