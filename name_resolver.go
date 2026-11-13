package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf16"
	"unicode/utf8"
)

// NameSourceType represents the protocol or method used to resolve a device's name
type NameSourceType string

const (
	NameSourceCustom  = "CUSTOM"
	NameSourceSMB     = "SMB"
	NameSourceNetBIOS = "NETBIOS"
	NameSourceMDNS    = "MDNS"
	NameSourceWSD     = "WSD"
	NameSourceUPnP    = "UPNP"
	NameSourceSNMP    = "SNMP"
	NameSourceDNS     = "DNS"
	NameSourceWeb     = "WEB"
	NameSourceUnknown = "UNKNOWN"
)

// NameResolutionResult contains the consolidated resolution output
type NameResolutionResult struct {
	BestName        string            `json:"bestName"`
	PrimarySource   string            `json:"primarySource"`
	HostnameSources map[string]string `json:"hostnameSources"`
	RealVendor      string            `json:"realVendor,omitempty"`
	DeviceModel     string            `json:"deviceModel,omitempty"`
	VendorSource    string            `json:"vendorSource,omitempty"`
}

// decodeNetworkBytes converts raw network bytes into valid UTF-8, handling both UTF-8 and ANSI multi-byte Korean characters
func decodeNetworkBytes(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	// Check if already valid UTF-8
	if utf8.Valid(b) {
		return string(b)
	}
	return byteSliceToString(b)
}

// sanitizeDeviceName removes control characters, nulls, and trailing dots
func sanitizeDeviceName(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimSuffix(s, ".")
	s = strings.ReplaceAll(s, "\x00", "")
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.Join(strings.Fields(s), " ")
	return s
}

// decodeUTF16LE converts little-endian UTF-16 bytes to Go string
func decodeUTF16LE(b []byte) string {
	if len(b)%2 != 0 {
		b = b[:len(b)-1]
	}
	u16s := make([]uint16, len(b)/2)
	for i := 0; i < len(u16s); i++ {
		u16s[i] = binary.LittleEndian.Uint16(b[i*2 : i*2+2])
	}
	return string(utf16.Decode(u16s))
}

// ============================================================================
// 1. SMB NTLMSSP Negotiate / Challenge Probe (Port 445)
// Resolves Windows 10/11 & Server NetBIOS computer names and DNS hostnames
// ============================================================================

func resolveSMBName(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "tcp", fmt.Sprintf("%s:445", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	deadline := time.Now().Add(time.Duration(timeoutMs) * time.Millisecond)
	_ = conn.SetDeadline(deadline)

	// SMB2 Negotiate Protocol Request (Dialects: 0x0202, 0x0210, 0x0300, 0x0302)
	// NetBIOS Session header (4 bytes) + SMB2 Header (64 bytes) + Negotiate Context (36 bytes + 8 bytes dialects)
	smb2Negotiate := []byte{
		// NetBIOS Session Header (length = 108 bytes -> 0x00006c)
		0x00, 0x00, 0x00, 0x6c,
		// SMB2 Header
		0xfe, 'S', 'M', 'B', // ProtocolId (\xfeSMB)
		0x40, 0x00, // StructureSize (64)
		0x00, 0x00, // CreditCharge
		0x00, 0x00, // ChannelSequence / Reserved
		0x00, 0x00, 0x00, 0x00, // Status
		0x00, 0x00, // Command (0x0000 = NEGOTIATE)
		0x1f, 0x00, // CreditsRequested (31)
		0x00, 0x00, 0x00, 0x00, // Flags
		0x00, 0x00, 0x00, 0x00, // NextCommand
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // MessageId (0)
		0xfe, 0xff, 0x00, 0x00, // ProcessId (0xfffe)
		0x00, 0x00, 0x00, 0x00, // TreeId
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // SessionId
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Signature
		// Negotiate Request
		0x24, 0x00, // StructureSize (36)
		0x04, 0x00, // DialectCount (4)
		0x01, 0x00, // SecurityMode (Signing Enabled)
		0x00, 0x00, // Reserved
		0x40, 0x00, 0x00, 0x00, // Capabilities
		0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
		0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, // ClientGuid
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ClientStartTime
		// Dialects: SMB 2.0.2, SMB 2.1, SMB 3.0, SMB 3.0.2
		0x02, 0x02, 0x10, 0x02, 0x00, 0x03, 0x02, 0x03,
	}

	if _, err := conn.Write(smb2Negotiate); err != nil {
		return ""
	}

	respBuf := make([]byte, 4096)
	n, err := conn.Read(respBuf)
	if err != nil || n < 68 {
		return ""
	}

	// Verify SMB2 Header in response
	if !bytes.Equal(respBuf[4:8], []byte{0xfe, 'S', 'M', 'B'}) {
		return ""
	}

	// Now send SMB2 Session Setup Request containing NTLMSSP NEGOTIATE
	// NTLMSSP Negotiate Message (32 bytes)
	ntlmsspNeg := []byte{
		'N', 'T', 'L', 'M', 'S', 'S', 'P', 0x00, // Identifier
		0x01, 0x00, 0x00, 0x00, // Message Type 1 (Negotiate)
		0x05, 0xb2, 0x08, 0xa2, // Negotiate Flags (Unicode, OEM, Request Target, NTLM, etc.)
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Domain info
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Workstation info
	}

	secBlobLen := len(ntlmsspNeg)
	secBlobOffset := 64 + 24 // SMB2 header (64) + Session Setup header (24) = 88 bytes from NetBIOS header

	sessSetupReq := make([]byte, 4+64+24+secBlobLen)
	// NetBIOS Session Header
	totalLen := 64 + 24 + secBlobLen
	sessSetupReq[1] = byte((totalLen >> 16) & 0xff)
	sessSetupReq[2] = byte((totalLen >> 8) & 0xff)
	sessSetupReq[3] = byte(totalLen & 0xff)

	// SMB2 Header
	copy(sessSetupReq[4:8], []byte{0xfe, 'S', 'M', 'B'})
	sessSetupReq[8] = 0x40 // StructureSize
	sessSetupReq[16] = 0x01 // Command 0x0001 (SESSION_SETUP)
	sessSetupReq[18] = 0x1f // CreditsRequested
	binary.LittleEndian.PutUint64(sessSetupReq[28:36], 1) // MessageId 1
	sessSetupReq[36] = 0xfe
	sessSetupReq[37] = 0xff // ProcessId

	// Session Setup Request Body
	bodyOffset := 4 + 64
	sessSetupReq[bodyOffset] = 0x19 // StructureSize (25)
	sessSetupReq[bodyOffset+1] = 0x00
	sessSetupReq[bodyOffset+2] = 0x00 // Flags
	sessSetupReq[bodyOffset+3] = 0x01 // SecurityMode
	sessSetupReq[bodyOffset+4] = 0x00 // Capabilities
	// SecurityBufferOffset (relative to start of SMB2 header at index 4)
	binary.LittleEndian.PutUint16(sessSetupReq[bodyOffset+12:bodyOffset+14], uint16(secBlobOffset))
	binary.LittleEndian.PutUint16(sessSetupReq[bodyOffset+14:bodyOffset+16], uint16(secBlobLen))

	// Copy NTLMSSP payload
	copy(sessSetupReq[4+secBlobOffset:], ntlmsspNeg)

	if _, err := conn.Write(sessSetupReq); err != nil {
		return ""
	}

	n, err = conn.Read(respBuf)
	if err != nil || n < 120 {
		return ""
	}

	// Search for NTLMSSP Challenge message signature ("NTLMSSP\x00\x02") in the response
	ntlmIdx := bytes.Index(respBuf[:n], []byte("NTLMSSP\x00\x02\x00\x00\x00"))
	if ntlmIdx == -1 {
		return ""
	}

	challenge := respBuf[ntlmIdx:n]
	if len(challenge) < 48 {
		return ""
	}

	// Parse TargetInfo fields in NTLMSSP Challenge:
	// TargetInfo length is at challenge offset 40 (uint16), offset is at challenge offset 44 (uint32)
	targetInfoLen := int(binary.LittleEndian.Uint16(challenge[40:42]))
	targetInfoOffset := int(binary.LittleEndian.Uint32(challenge[44:48]))

	if targetInfoOffset+targetInfoLen > len(challenge) {
		return ""
	}

	targetInfo := challenge[targetInfoOffset : targetInfoOffset+targetInfoLen]
	idx := 0
	var nbComputerName, dnsComputerName string

	for idx+4 <= len(targetInfo) {
		avId := binary.LittleEndian.Uint16(targetInfo[idx : idx+2])
		avLen := int(binary.LittleEndian.Uint16(targetInfo[idx+2 : idx+4]))
		idx += 4
		if avId == 0x0000 || idx+avLen > len(targetInfo) { // MsvAvEOL
			break
		}
		valBytes := targetInfo[idx : idx+avLen]
		valStr := decodeUTF16LE(valBytes)

		switch avId {
		case 0x0001: // MsvAvNbComputerName
			nbComputerName = sanitizeDeviceName(valStr)
		case 0x0003: // MsvAvDnsComputerName
			dnsComputerName = sanitizeDeviceName(valStr)
		}
		idx += avLen
	}

	if nbComputerName != "" {
		return nbComputerName
	}
	if dnsComputerName != "" {
		return strings.Split(dnsComputerName, ".")[0]
	}

	return ""
}

// ============================================================================
// 2. NetBIOS Node Status Direct Socket Query (UDP 137)
// Fast in-memory parsing without spawning external nbtstat.exe
// ============================================================================

func resolveNetBIOSNameFast(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:137", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))

	// NetBIOS Node Status Request Packet (Wildcard '*')
	packet := []byte{
		0x80, 0x90, // Transaction ID
		0x00, 0x00, // Flags (Query)
		0x00, 0x01, // Questions (1)
		0x00, 0x00, 0x00, 0x00, // Answer RRs, Authority RRs
		0x00, 0x00, // Additional RRs
		// Encoded '*' (0x20 + 'CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' + 0x00)
		0x20, 0x43, 0x4b, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
		0x41, 0x00,
		0x00, 0x21, // Type: NBSTAT (0x0021)
		0x00, 0x01, // Class: IN (0x0001)
	}

	if _, err := conn.Write(packet); err != nil {
		return ""
	}

	buf := make([]byte, 1024)
	n, err := conn.Read(buf)
	if err != nil || n < 57 {
		return ""
	}

	// NetBIOS Node Status response has answer count, name count at offset 56
	numNames := int(buf[56])
	offset := 57

	var bestName string
	var serverName string

	for i := 0; i < numNames && offset+18 <= n; i++ {
		rawName := strings.TrimSpace(decodeNetworkBytes(buf[offset : offset+15]))
		nameType := buf[offset+15]
		flags := binary.BigEndian.Uint16(buf[offset+16 : offset+18])
		isGroup := (flags & 0x8000) != 0

		// Type 0x00 & Unique = Workstation / Machine Name
		if nameType == 0x00 && !isGroup && rawName != "" && !strings.Contains(rawName, "__MSBROWSE__") {
			bestName = sanitizeDeviceName(rawName)
			break
		}
		// Type 0x20 & Unique = File Server Name
		if nameType == 0x20 && !isGroup && serverName == "" {
			serverName = sanitizeDeviceName(rawName)
		}
		offset += 18
	}

	if bestName != "" {
		return bestName
	}
	return serverName
}

// ============================================================================
// 3. mDNS / Bonjour Direct Unicast Query (UDP 5353)
// Resolves Apple Mac, iPhone, iPad, Linux/Avahi, Smart TVs, IoT devices
// ============================================================================

func resolveMDNSNameFast(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:5353", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))

	// Reverse IP in-addr.arpa for unicast PTR lookup
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return ""
	}
	revAddr := fmt.Sprintf("%s.%s.%s.%s.in-addr.arpa", parts[3], parts[2], parts[1], parts[0])

	var query bytes.Buffer
	query.Write([]byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})
	for _, label := range strings.Split(revAddr, ".") {
		query.WriteByte(byte(len(label)))
		query.WriteString(label)
	}
	query.WriteByte(0x00)
	query.Write([]byte{0x00, 0x0c, 0x00, 0x01}) // PTR, Class IN

	if _, err := conn.Write(query.Bytes()); err != nil {
		return ""
	}

	buf := make([]byte, 1024)
	n, err := conn.Read(buf)
	if err != nil || n < 12 {
		return ""
	}

	// Extract candidate printable string from response
	respStr := decodeNetworkBytes(buf[:n])
	re := regexp.MustCompile(`([^\s\x00-\x1f\x7f\.\,]{1,50})\.local`)
	match := re.FindStringSubmatch(respStr)
	if len(match) > 1 {
		found := sanitizeDeviceName(match[1])
		if !strings.EqualFold(found, "_services") && !strings.EqualFold(found, "_dns-sd") {
			return found
		}
	}

	return ""
}

// ============================================================================
// 4. WS-Discovery Direct Probe (UDP 3702)
// Resolves Windows 10/11 Discovery, ONVIF IP Cameras, Network Printers
// ============================================================================

func resolveWSDNameFast(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:3702", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))

	wsdProbe := "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
		"<soap:Envelope xmlns:soap=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:wsa=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\" xmlns:wsd=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\">" +
		"<soap:Header>" +
		"<wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>" +
		"<wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>" +
		"<wsa:MessageID>urn:uuid:68e8e7a0-0000-0000-0000-000000000001</wsa:MessageID>" +
		"</soap:Header>" +
		"<soap:Body><wsd:Probe/></soap:Body>" +
		"</soap:Envelope>"

	if _, err := conn.Write([]byte(wsdProbe)); err != nil {
		return ""
	}

	buf := make([]byte, 2048)
	n, err := conn.Read(buf)
	if err != nil || n == 0 {
		return ""
	}

	xmlStr := decodeNetworkBytes(buf[:n])
	// Parse <wsa:Address> or Scopes containing onvif/hardware/computer name
	if strings.Contains(xmlStr, "onvif://www.onvif.org/name/") {
		parts := strings.Split(xmlStr, "onvif://www.onvif.org/name/")
		if len(parts) > 1 {
			name := strings.Fields(parts[1])[0]
			return sanitizeDeviceName(name)
		}
	}

	reComp := regexp.MustCompile(`(?i)<wsd:Scopes[^>]*>.*?/computer/([^\/\s<]+).*?</wsd:Scopes>`)
	if match := reComp.FindStringSubmatch(xmlStr); len(match) > 1 {
		return sanitizeDeviceName(match[1])
	}

	return ""
}

// ============================================================================
// 5. SSDP / UPnP Direct Probe (UDP 1900)
// Resolves Smart TVs, Media Renderers, Routers, Home Appliances
// ============================================================================

type UPnPProbeDetails struct {
	BestName     string
	Manufacturer string
	ModelName    string
	FriendlyName string
	ServerHeader string
}

func resolveUPnPExtended(ctx context.Context, ip string, timeoutMs int) UPnPProbeDetails {
	var details UPnPProbeDetails
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:1900", ip))
	if err != nil {
		return details
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))

	msg := "M-SEARCH * HTTP/1.1\r\n" +
		"HOST: 239.255.255.250:1900\r\n" +
		"MAN: \"ssdp:discover\"\r\n" +
		"MX: 1\r\n" +
		"ST: ssdp:all\r\n\r\n"

	if _, err := conn.Write([]byte(msg)); err != nil {
		return details
	}

	buf := make([]byte, 2048)
	n, err := conn.Read(buf)
	if err != nil || n == 0 {
		return details
	}

	resp := string(buf[:n])
	lines := strings.Split(resp, "\r\n")
	var locationURL string

	for _, l := range lines {
		lower := strings.ToLower(l)
		if strings.HasPrefix(lower, "location:") {
			locationURL = strings.TrimSpace(l[9:])
		} else if strings.HasPrefix(lower, "server:") {
			details.ServerHeader = strings.TrimSpace(l[7:])
		}
	}

	// If location URL is provided on local subnet, try fast XML description fetch (up to 8KB)
	if locationURL != "" && strings.Contains(locationURL, ip) {
		httpCli := &http.Client{Timeout: 350 * time.Millisecond}
		req, _ := http.NewRequestWithContext(ctx, "GET", locationURL, nil)
		if respXml, err := httpCli.Do(req); err == nil {
			defer respXml.Body.Close()
			body, _ := io.ReadAll(io.LimitReader(respXml.Body, 8192))
			bodyStr := decodeNetworkBytes(body)

			reMfr := regexp.MustCompile(`(?i)<manufacturer[^>]*>(.*?)</manufacturer>`)
			if m := reMfr.FindStringSubmatch(bodyStr); len(m) > 1 {
				details.Manufacturer = sanitizeDeviceName(m[1])
			}
			reModel := regexp.MustCompile(`(?i)<modelName[^>]*>(.*?)</modelName>`)
			if m := reModel.FindStringSubmatch(bodyStr); len(m) > 1 {
				details.ModelName = sanitizeDeviceName(m[1])
			}
			reFn := regexp.MustCompile(`(?i)<friendlyName[^>]*>(.*?)</friendlyName>`)
			if m := reFn.FindStringSubmatch(bodyStr); len(m) > 1 {
				details.FriendlyName = sanitizeDeviceName(m[1])
			}
		}
	}

	// Fallback to Server header vendor extraction if manufacturer is empty
	if details.Manufacturer == "" && details.ServerHeader != "" {
		srvLower := strings.ToLower(details.ServerHeader)
		if strings.Contains(srvLower, "synology") {
			details.Manufacturer = "Synology Inc."
		} else if strings.Contains(srvLower, "iptime") || strings.Contains(srvLower, "efm") {
			details.Manufacturer = "EFM Networks (ipTIME)"
		} else if strings.Contains(srvLower, "samsung") {
			details.Manufacturer = "Samsung Electronics"
		} else if strings.Contains(srvLower, "lg") {
			details.Manufacturer = "LG Electronics"
		} else if strings.Contains(srvLower, "asus") {
			details.Manufacturer = "ASUSTeK Computer Inc."
		} else if strings.Contains(srvLower, "qnap") {
			details.Manufacturer = "QNAP Systems, Inc."
		} else if strings.Contains(srvLower, "canon") {
			details.Manufacturer = "Canon Inc."
		}
	}

	if details.FriendlyName != "" {
		details.BestName = details.FriendlyName
	} else if details.ModelName != "" {
		details.BestName = details.ModelName
	} else if details.ServerHeader != "" && !strings.Contains(strings.ToLower(details.ServerHeader), "upnp/1.0") {
		details.BestName = sanitizeDeviceName(details.ServerHeader)
	}

	return details
}

func resolveUPnPNameFast(ctx context.Context, ip string, timeoutMs int) string {
	d := resolveUPnPExtended(ctx, ip, timeoutMs)
	return d.BestName
}

// ============================================================================
// 6. SNMP sysName Query (UDP 161)
// Resolves Switches, Routers, NAS, and Enterprise Network Infrastructure
// ============================================================================

func resolveSNMPNameFast(ctx context.Context, ip string, timeoutMs int) string {
	dialer := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	conn, err := dialer.DialContext(ctx, "udp", fmt.Sprintf("%s:161", ip))
	if err != nil {
		return ""
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))

	// SNMP v2c GET Request for sysName.0 (OID: 1.3.6.1.2.1.1.5.0) with community "public"
	snmpGetSysName := []byte{
		0x30, 0x29, // SEQUENCE
		0x02, 0x01, 0x01, // Version: 1 (SNMP v2c)
		0x04, 0x06, 'p', 'u', 'b', 'l', 'i', 'c', // Community: "public"
		0xa0, 0x1c, // GetRequest-PDU
		0x02, 0x04, 0x13, 0x37, 0x00, 0x01, // Request-ID
		0x02, 0x01, 0x00, // Error status: 0
		0x02, 0x01, 0x00, // Error index: 0
		0x30, 0x0e, // Variable bindings
		0x30, 0x0c,
		0x06, 0x08, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x05, 0x00, // OID: 1.3.6.1.2.1.1.5.0
		0x05, 0x00, // Value: NULL
	}

	if _, err := conn.Write(snmpGetSysName); err != nil {
		return ""
	}

	buf := make([]byte, 512)
	n, err := conn.Read(buf)
	if err != nil || n < 30 {
		return ""
	}

	// Locate OID response: 0x2b 0x06 0x01 0x02 0x01 0x01 0x05 0x00
	oidSig := []byte{0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x05, 0x00}
	oidIdx := bytes.Index(buf[:n], oidSig)
	if oidIdx != -1 && oidIdx+10 < n {
		valType := buf[oidIdx+8]
		valLen := int(buf[oidIdx+9])
		if valType == 0x04 && oidIdx+10+valLen <= n { // ASN.1 OCTET STRING
			sysName := decodeNetworkBytes(buf[oidIdx+10 : oidIdx+10+valLen])
			return sanitizeDeviceName(sysName)
		}
	}

	return ""
}

// ============================================================================
// 7. HTTP/HTTPS Web Title & TLS Certificate Common Name (CN)
// Resolves Router Admin Pages, Web Cameras, Synology NAS, Network Devices
// ============================================================================

func resolveWebNameFast(ctx context.Context, ip string, openPorts []int, timeoutMs int) string {
	candidatePorts := []int{80, 443, 8080, 8443, 5000}
	var testPorts []int

	if len(openPorts) > 0 {
		for _, p := range openPorts {
			for _, cp := range candidatePorts {
				if p == cp {
					testPorts = append(testPorts, p)
					break
				}
			}
		}
	}
	if len(testPorts) == 0 {
		testPorts = []int{80}
	}

	customTransport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		DialContext: (&net.Dialer{
			Timeout: time.Duration(timeoutMs) * time.Millisecond,
		}).DialContext,
	}

	client := &http.Client{
		Transport: customTransport,
		Timeout:   time.Duration(timeoutMs+150) * time.Millisecond,
	}

	for _, port := range testPorts {
		scheme := "http"
		if port == 443 || port == 8443 {
			scheme = "https"
		}
		url := fmt.Sprintf("%s://%s:%d", scheme, ip, port)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

		resp, err := client.Do(req)
		if err != nil {
			continue
		}

		// If HTTPS, check TLS Peer Certificate Common Name / DNS Names
		if resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
			cn := resp.TLS.PeerCertificates[0].Subject.CommonName
			if cn != "" && !strings.Contains(cn, "*") && !strings.EqualFold(cn, "localhost") {
				resp.Body.Close()
				return sanitizeDeviceName(cn)
			}
		}

		body, err := io.ReadAll(io.LimitReader(resp.Body, 16384))
		resp.Body.Close()
		if err != nil {
			continue
		}

		re := regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
		if matches := re.FindStringSubmatch(decodeNetworkBytes(body)); len(matches) > 1 {
			title := sanitizeDeviceName(matches[1])
			if title != "" && !strings.EqualFold(title, "404 Not Found") && !strings.EqualFold(title, "403 Forbidden") {
				if len(title) > 40 {
					title = title[:37] + "..."
				}
				return title
			}
		}
	}

	return ""
}

// ============================================================================
// 8. Reverse DNS PTR Query
// Resolves Local Router DHCP Reservations & Domain Names
// ============================================================================

func resolveDNSNameFast(ctx context.Context, ip string) string {
	resolver := &net.Resolver{}
	names, err := resolver.LookupAddr(ctx, ip)
	if err == nil && len(names) > 0 {
		clean := sanitizeDeviceName(names[0])
		if clean != "" {
			return clean
		}
	}
	return ""
}

// ============================================================================
// 9. Master Multi-Protocol Parallel Device Name Resolution Orchestrator
// ============================================================================

// ResolveDeviceNamesParallel concurrently probes all 7 protocols and arbitrates the best name
func ResolveDeviceNamesParallel(ctx context.Context, ip string, openPorts []int, timeoutMs int) NameResolutionResult {
	if timeoutMs < 300 {
		timeoutMs = 300
	}
	if timeoutMs > 750 {
		timeoutMs = 750
	}

	resCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs+100)*time.Millisecond)
	defer cancel()

	var wg sync.WaitGroup
	var mu sync.Mutex
	sources := make(map[string]string)

	recordResult := func(source, name string) {
		name = sanitizeDeviceName(name)
		if name == "" {
			return
		}
		mu.Lock()
		sources[source] = name
		mu.Unlock()
	}

	// 1. SMB NTLM Challenge (Port 445)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveSMBName(resCtx, ip, timeoutMs); name != "" {
			recordResult(NameSourceSMB, name)
		}
	}()

	// 2. NetBIOS Direct UDP 137
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveNetBIOSNameFast(resCtx, ip, timeoutMs); name != "" {
			recordResult(NameSourceNetBIOS, name)
		}
	}()

	// 3. mDNS / Bonjour (UDP 5353)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveMDNSNameFast(resCtx, ip, timeoutMs); name != "" {
			recordResult(NameSourceMDNS, name)
		}
	}()

	// 4. WS-Discovery (UDP 3702)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveWSDNameFast(resCtx, ip, timeoutMs); name != "" {
			recordResult(NameSourceWSD, name)
		}
	}()

	// 5. SSDP / UPnP (UDP 1900)
	var upnpMfr, upnpModel string
	wg.Add(1)
	go func() {
		defer wg.Done()
		upnpDet := resolveUPnPExtended(resCtx, ip, timeoutMs)
		if upnpDet.BestName != "" {
			recordResult(NameSourceUPnP, upnpDet.BestName)
		}
		mu.Lock()
		if upnpDet.Manufacturer != "" {
			upnpMfr = upnpDet.Manufacturer
		}
		if upnpDet.ModelName != "" {
			upnpModel = upnpDet.ModelName
		}
		mu.Unlock()
	}()

	// 6. SNMP sysName (UDP 161)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveSNMPNameFast(resCtx, ip, timeoutMs); name != "" {
			recordResult(NameSourceSNMP, name)
		}
	}()

	// 7. Reverse DNS PTR
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveDNSNameFast(resCtx, ip); name != "" {
			recordResult(NameSourceDNS, name)
		}
	}()

	// 8. Web Title / TLS CN
	wg.Add(1)
	go func() {
		defer wg.Done()
		if name := resolveWebNameFast(resCtx, ip, openPorts, timeoutMs); name != "" {
			recordResult(NameSourceWeb, name)
		}
	}()

	wg.Wait()

	// Priority Arbitration Matrix:
	// SMB > NetBIOS > mDNS > WSD > UPnP > SNMP > DNS > Web
	priorityList := []string{
		NameSourceSMB,
		NameSourceNetBIOS,
		NameSourceMDNS,
		NameSourceWSD,
		NameSourceUPnP,
		NameSourceSNMP,
		NameSourceDNS,
		NameSourceWeb,
	}

	var bestName string
	var primarySource string = NameSourceUnknown

	for _, p := range priorityList {
		if val, exists := sources[p]; exists && val != "" {
			bestName = val
			primarySource = p
			break
		}
	}

	var realVendor, deviceModel, vendorSource string
	if upnpMfr != "" {
		realVendor = upnpMfr
		vendorSource = NameSourceUPnP
		deviceModel = upnpModel
	}

	// mDNS manufacturer heuristic fallback
	if realVendor == "" {
		if mdnsName, exists := sources[NameSourceMDNS]; exists && mdnsName != "" {
			lowerMdns := strings.ToLower(mdnsName)
			if strings.Contains(lowerMdns, "iphone") || strings.Contains(lowerMdns, "ipad") || strings.Contains(lowerMdns, "macbook") || strings.Contains(lowerMdns, "imac") || strings.Contains(lowerMdns, "apple") {
				realVendor = "Apple Inc."
				vendorSource = NameSourceMDNS
			} else if strings.Contains(lowerMdns, "synology") || strings.Contains(lowerMdns, "diskstation") {
				realVendor = "Synology Inc."
				vendorSource = NameSourceMDNS
			} else if strings.Contains(lowerMdns, "canon") {
				realVendor = "Canon Inc."
				vendorSource = NameSourceMDNS
			} else if strings.Contains(lowerMdns, "epson") {
				realVendor = "Seiko Epson Corp."
				vendorSource = NameSourceMDNS
			} else if strings.Contains(lowerMdns, "samsung") {
				realVendor = "Samsung Electronics"
				vendorSource = NameSourceMDNS
			} else if strings.Contains(lowerMdns, "lg-") || strings.Contains(lowerMdns, "lge") || strings.Contains(lowerMdns, "webos") || (strings.Contains(lowerMdns, "lg") && (strings.Contains(lowerMdns, "tv") || strings.Contains(lowerMdns, "electronics"))) {
				realVendor = "LG Electronics"
				vendorSource = NameSourceMDNS
			}
		}
	}

	return NameResolutionResult{
		BestName:        bestName,
		PrimarySource:   primarySource,
		HostnameSources: sources,
		RealVendor:      realVendor,
		DeviceModel:     deviceModel,
		VendorSource:    vendorSource,
	}
}
