package main

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

// ScanEngine represents a highly optimized network discovery engine
type ScanEngine struct {
	arpCache     map[string]string
	arpCacheMut  sync.RWMutex
	arpCacheTime time.Time
}

var GlobalEngine = &ScanEngine{
	arpCache: make(map[string]string),
}

// Prepare warms up the engine (e.g. loads ARP tables into memory)
func (e *ScanEngine) Prepare() {
	e.arpCacheMut.Lock()
	defer e.arpCacheMut.Unlock()

	// Only refresh once every 5 seconds to prevent network spam
	if time.Since(e.arpCacheTime) < 5*time.Second {
		return
	}

	cmd := exec.Command("arp", "-a")
	hideWindow(cmd)
	out, _ := cmd.Output()
	lines := strings.Split(string(out), "\n")

	newCache := make(map[string]string)
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			// Basic heuristic to find IP and MAC on a line
			var ip, mac string
			for _, f := range fields {
				if net.ParseIP(strings.Trim(f, "()")) != nil {
					ip = strings.Trim(f, "()")
				} else if strings.Contains(f, "-") || strings.Contains(f, ":") {
					mac = f
				}
			}

			if ip != "" && mac != "" {
				mac = strings.ToUpper(mac)
				mac = strings.ReplaceAll(mac, "-", ":")
				parts := strings.Split(mac, ":")
				if len(parts) == 6 {
					for i, p := range parts {
						if len(p) == 1 {
							parts[i] = "0" + p
						}
					}
					newCache[ip] = strings.Join(parts, ":")
				}
			}
		}
	}
	e.arpCache = newCache
	e.arpCacheTime = time.Now()
}

func (e *ScanEngine) GetMAC(ip string) string {
	// 1. Check local interfaces
	ifaces, err := net.Interfaces()
	if err == nil {
		for _, iface := range ifaces {
			addrs, _ := iface.Addrs()
			for _, addr := range addrs {
				var currentIP net.IP
				switch v := addr.(type) {
				case *net.IPNet:
					currentIP = v.IP
				case *net.IPAddr:
					currentIP = v.IP
				}
				if currentIP != nil && currentIP.To4() != nil && currentIP.String() == ip {
					mac := strings.ToUpper(iface.HardwareAddr.String())
					return strings.ReplaceAll(mac, "-", ":")
				}
			}
		}
	}

	// 2. Check engine's high-speed memory cache
	e.arpCacheMut.RLock()
	mac, ok := e.arpCache[ip]
	e.arpCacheMut.RUnlock()
	if ok && mac != "FF:FF:FF:FF:FF:FF" && mac != "00:00:00:00:00:00" {
		return mac
	}

	// 2.5. Try Direct Win32 SendARP API or Proprietary DLL (0.1ms Ultra Fast Resolution)
	if nativeMac, ok := tryNativeGetMacAddress(ip); ok && nativeMac != "" {
		return nativeMac
	}

	// 3. Fallback to direct targeted arp query if cache miss
	if runtime.GOOS != "windows" {
		return ""
	}
	
	cmd := exec.Command("arp", "-a", ip)
	hideWindow(cmd)
	out, _ := cmd.Output()
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.Contains(line, ip) {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				mac := strings.ToUpper(fields[1])
				if strings.Contains(mac, "-") || strings.Contains(mac, ":") {
					mac = strings.ReplaceAll(mac, "-", ":")
					parts := strings.Split(mac, ":")
					if len(parts) == 6 {
						for i, p := range parts {
							if len(p) == 1 {
								parts[i] = "0" + p
							}
						}
						finalMac := strings.Join(parts, ":")
						// Save back to cache
						e.arpCacheMut.Lock()
						e.arpCache[ip] = finalMac
						e.arpCacheMut.Unlock()
						
						return finalMac
					}
				}
			}
		}
	}
	return ""
}

// FastTCPVerify performs an ultra-fast concurrent port sweep in Go to determine device life
func (e *ScanEngine) FastTCPVerify(ctx context.Context, ip string, timeoutMs int, checkPorts []int) (bool, []int) {
	var openPorts []int
	var portMu sync.Mutex
	var portWg sync.WaitGroup
	alive := false

	// Dial efficiently
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	
	for _, port := range checkPorts {
		portWg.Add(1)
		go func(p int) {
			defer portWg.Done()
			conn, err := dialer.DialContext(ctx, "tcp", fmt.Sprintf("%s:%d", ip, p))
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
	
	return alive, openPorts
}
