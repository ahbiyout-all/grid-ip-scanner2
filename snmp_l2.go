package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type SnmpL2CredentialInput struct {
	IP                string `json:"ip"`
	Name              string `json:"name,omitempty"`
	Version           string `json:"version"` // "v2c" | "v3"
	Community         string `json:"community,omitempty"`
	V3Username        string `json:"v3Username,omitempty"`
	V3AuthProto       string `json:"v3AuthProto,omitempty"`
	V3AuthPass        string `json:"v3AuthPass,omitempty"`
	V3PrivProto       string `json:"v3PrivProto,omitempty"`
	V3PrivPass        string `json:"v3PrivPass,omitempty"`
	SaveInMemoryVault bool   `json:"saveInMemoryVault,omitempty"`
}

// SnmpVaultEntrySummary never returns plaintext SNMP secrets/passphrases in JSON.
type SnmpVaultEntrySummary struct {
	IP            string `json:"ip"`
	Name          string `json:"name,omitempty"`
	Version       string `json:"version"`
	HasCredential bool   `json:"hasCredential"`
	UpdatedAtMs   int64  `json:"updatedAtMs"`
}

type SnmpL2PortMapping struct {
	MAC            string `json:"mac"`
	IP             string `json:"ip,omitempty"`
	Hostname       string `json:"hostname,omitempty"`
	SwitchIP       string `json:"switchIp"`
	SwitchName     string `json:"switchName"`
	IfIndex        int    `json:"ifIndex"`
	PortName       string `json:"portName"`
	VlanID         int    `json:"vlanId,omitempty"`
	OperStatus     string `json:"operStatus,omitempty"`
	SpeedMbps      int    `json:"speedMbps,omitempty"`
	MacCountOnPort int    `json:"macCountOnPort"`
	IsUplink       bool   `json:"isUplink"`
}

type SnmpL2LldpNeighbor struct {
	LocalPort     string `json:"localPort"`
	RemoteSysName string `json:"remoteSysName"`
	RemotePort    string `json:"remotePort"`
}

type SnmpL2SwitchSummary struct {
	SwitchIP       string               `json:"switchIp"`
	SysName        string               `json:"sysName"`
	SysDescr       string               `json:"sysDescr,omitempty"`
	TotalPorts     int                  `json:"totalPorts"`
	MappedMacCount int                  `json:"mappedMacCount"`
	UplinkPorts    []string             `json:"uplinkPorts"`
	LldpNeighbors  []SnmpL2LldpNeighbor `json:"lldpNeighbors"`
	Error          string               `json:"error,omitempty"`
	DurationMs     int64                `json:"durationMs"`
}

type SnmpL2MappingResult struct {
	Success     bool                         `json:"success"`
	MappedAtMs  int64                        `json:"mappedAtMs"`
	Switches    []SnmpL2SwitchSummary        `json:"switches"`
	Mappings    []SnmpL2PortMapping          `json:"mappings"`
	HostMapByIP map[string]SnmpL2PortMapping `json:"hostMapByIp"`
	Error       string                       `json:"error,omitempty"`
}

type SnmpCredentialVault struct {
	mu      sync.RWMutex
	entries map[string]SnmpL2CredentialInput
	updated map[string]int64
}

var (
	defaultSnmpVault     *SnmpCredentialVault
	defaultSnmpVaultOnce sync.Once
	snmpRequestCounter   int32 = 100
)

func getSnmpVault() *SnmpCredentialVault {
	defaultSnmpVaultOnce.Do(func() {
		defaultSnmpVault = &SnmpCredentialVault{
			entries: make(map[string]SnmpL2CredentialInput),
			updated: make(map[string]int64),
		}
	})
	return defaultSnmpVault
}

func (v *SnmpCredentialVault) Save(cred SnmpL2CredentialInput) error {
	parsed := net.ParseIP(strings.TrimSpace(cred.IP))
	if parsed == nil || parsed.To4() == nil {
		return errors.New("invalid switch IPv4 address")
	}
	cred.IP = parsed.String()
	v.mu.Lock()
	defer v.mu.Unlock()
	v.entries[cred.IP] = cred
	v.updated[cred.IP] = time.Now().UTC().UnixMilli()
	return nil
}

func (v *SnmpCredentialVault) Get(ip string) (SnmpL2CredentialInput, bool) {
	v.mu.RLock()
	defer v.mu.RUnlock()
	c, ok := v.entries[strings.TrimSpace(ip)]
	return c, ok
}

func (v *SnmpCredentialVault) Delete(ip string) bool {
	v.mu.Lock()
	defer v.mu.Unlock()
	trimmed := strings.TrimSpace(ip)
	if trimmed == "" {
		v.entries = make(map[string]SnmpL2CredentialInput)
		v.updated = make(map[string]int64)
		return true
	}
	_, ok := v.entries[trimmed]
	delete(v.entries, trimmed)
	delete(v.updated, trimmed)
	return ok
}

func (v *SnmpCredentialVault) ListSummaries() []SnmpVaultEntrySummary {
	v.mu.RLock()
	defer v.mu.RUnlock()
	out := make([]SnmpVaultEntrySummary, 0, len(v.entries))
	for ip, c := range v.entries {
		ver := c.Version
		if ver == "" {
			ver = "v2c"
		}
		hasCred := c.Community != "" || c.V3Username != ""
		out = append(out, SnmpVaultEntrySummary{
			IP:            ip,
			Name:          c.Name,
			Version:       ver,
			HasCredential: hasCred,
			UpdatedAtMs:   v.updated[ip],
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].IP < out[j].IP })
	return out
}

// ============================================================================
// Pure-Go ASN.1/BER SNMPv2c Codec & MIB Walker
// ============================================================================

type snmpVarBind struct {
	OID      []int
	Tag      byte
	RawValue []byte
	IntValue int64
	StrValue string
}

func encodeBERLength(l int) []byte {
	if l < 128 {
		return []byte{byte(l)}
	}
	var buf []byte
	for l > 0 {
		buf = append([]byte{byte(l & 0xff)}, buf...)
		l >>= 8
	}
	return append([]byte{byte(0x80 | len(buf))}, buf...)
}

func wrapBERTLV(tag byte, val []byte) []byte {
	out := make([]byte, 0, 2+len(val)+4)
	out = append(out, tag)
	out = append(out, encodeBERLength(len(val))...)
	out = append(out, val...)
	return out
}

func encodeBERInt(v int32) []byte {
	if v == 0 {
		return wrapBERTLV(0x02, []byte{0x00})
	}
	var buf [4]byte
	binary.BigEndian.PutUint32(buf[:], uint32(v))
	start := 0
	for start < 3 && buf[start] == 0 && (buf[start+1]&0x80) == 0 {
		start++
	}
	return wrapBERTLV(0x02, buf[start:])
}

func encodeBEROID(oid []int) ([]byte, error) {
	if len(oid) < 2 {
		return nil, errors.New("OID too short")
	}
	var body bytes.Buffer
	body.WriteByte(byte(oid[0]*40 + oid[1]))
	for i := 2; i < len(oid); i++ {
		sub := oid[i]
		if sub == 0 {
			body.WriteByte(0)
			continue
		}
		var enc []byte
		for sub > 0 {
			enc = append([]byte{byte(sub & 0x7f)}, enc...)
			sub >>= 7
		}
		for j := 0; j < len(enc)-1; j++ {
			enc[j] |= 0x80
		}
		body.Write(enc)
	}
	return wrapBERTLV(0x06, body.Bytes()), nil
}

func parseOIDString(s string) ([]int, error) {
	parts := strings.Split(strings.Trim(strings.TrimSpace(s), "."), ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid OID: %s", s)
	}
	out := make([]int, len(parts))
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 {
			return nil, fmt.Errorf("invalid OID component %q", p)
		}
		out[i] = n
	}
	return out, nil
}

func oidHasPrefix(oid []int, prefix []int) bool {
	if len(oid) < len(prefix) {
		return false
	}
	for i := range prefix {
		if oid[i] != prefix[i] {
			return false
		}
	}
	return true
}

func oidEqual(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func buildSNMPv2cPDU(pduTag byte, reqID int32, community string, oids [][]int) ([]byte, error) {
	var varBinds bytes.Buffer
	for _, oid := range oids {
		encOID, err := encodeBEROID(oid)
		if err != nil {
			return nil, err
		}
		vb := append(encOID, 0x05, 0x00) // NULL
		varBinds.Write(wrapBERTLV(0x30, vb))
	}

	var pduBody bytes.Buffer
	pduBody.Write(encodeBERInt(reqID))
	pduBody.Write(encodeBERInt(0))
	pduBody.Write(encodeBERInt(0))
	pduBody.Write(wrapBERTLV(0x30, varBinds.Bytes()))

	var msgBody bytes.Buffer
	msgBody.Write(encodeBERInt(1)) // SNMPv2c = 1
	msgBody.Write(wrapBERTLV(0x04, []byte(community)))
	msgBody.Write(wrapBERTLV(pduTag, pduBody.Bytes()))
	return wrapBERTLV(0x30, msgBody.Bytes()), nil
}

func readBERTLV(data []byte, offset int) (tag byte, val []byte, nextOffset int, err error) {
	if offset >= len(data) {
		return 0, nil, offset, errors.New("unexpected end of BER stream")
	}
	tag = data[offset]
	offset++
	if offset >= len(data) {
		return 0, nil, offset, errors.New("truncated BER length")
	}
	lenByte := data[offset]
	offset++
	var length int
	if (lenByte & 0x80) == 0 {
		length = int(lenByte)
	} else {
		numBytes := int(lenByte & 0x7f)
		if numBytes == 0 || numBytes > 4 || offset+numBytes > len(data) {
			return 0, nil, offset, errors.New("invalid BER indefinite or overflow length")
		}
		for i := 0; i < numBytes; i++ {
			length = (length << 8) | int(data[offset+i])
		}
		offset += numBytes
	}
	if length < 0 || offset+length > len(data) {
		return 0, nil, offset, errors.New("BER value exceeds packet bounds")
	}
	return tag, data[offset : offset+length], offset + length, nil
}

func decodeBEROID(raw []byte) ([]int, error) {
	if len(raw) == 0 {
		return nil, errors.New("empty OID")
	}
	first := int(raw[0])
	out := []int{first / 40, first % 40}
	i := 1
	for i < len(raw) {
		var val int
		for {
			if i >= len(raw) {
				return nil, errors.New("truncated OID subidentifier")
			}
			b := raw[i]
			i++
			val = (val << 7) | int(b&0x7f)
			if (b & 0x80) == 0 {
				break
			}
		}
		out = append(out, val)
	}
	return out, nil
}

func decodeBERInt(raw []byte) int64 {
	if len(raw) == 0 {
		return 0
	}
	var val int64
	if (raw[0] & 0x80) != 0 {
		val = -1
	}
	for _, b := range raw {
		val = (val << 8) | int64(b)
	}
	return val
}

func decodeBERUnsigned(raw []byte) int64 {
	var val int64
	for _, b := range raw {
		val = (val << 8) | int64(b)
	}
	return val
}

func parseSNMPv2cResponse(pkt []byte) (reqID int32, errStatus int64, vbs []snmpVarBind, err error) {
	tag, msgVal, _, err := readBERTLV(pkt, 0)
	if err != nil || tag != 0x30 {
		return 0, 0, nil, errors.New("invalid SNMP sequence header")
	}
	off := 0
	// version
	if _, _, off, err = readBERTLV(msgVal, off); err != nil {
		return 0, 0, nil, err
	}
	// community
	if _, _, off, err = readBERTLV(msgVal, off); err != nil {
		return 0, 0, nil, err
	}
	// PDU
	pduTag, pduVal, _, err := readBERTLV(msgVal, off)
	if err != nil || (pduTag != 0xA2 && pduTag != 0xA0) {
		return 0, 0, nil, errors.New("unexpected SNMP PDU tag")
	}
	poff := 0
	_, idBytes, poff, err := readBERTLV(pduVal, poff)
	if err != nil {
		return 0, 0, nil, err
	}
	reqID = int32(decodeBERInt(idBytes))

	_, errBytes, poff, err := readBERTLV(pduVal, poff)
	if err != nil {
		return 0, 0, nil, err
	}
	errStatus = decodeBERInt(errBytes)

	// error index
	if _, _, poff, err = readBERTLV(pduVal, poff); err != nil {
		return 0, 0, nil, err
	}
	_, vbListBytes, _, err := readBERTLV(pduVal, poff)
	if err != nil {
		return 0, 0, nil, err
	}

	voff := 0
	for voff < len(vbListBytes) {
		vbTag, vbBytes, nextVoff, vErr := readBERTLV(vbListBytes, voff)
		if vErr != nil || vbTag != 0x30 {
			break
		}
		voff = nextVoff

		oidTag, oidRaw, innerOff, oErr := readBERTLV(vbBytes, 0)
		if oErr != nil || oidTag != 0x06 {
			continue
		}
		oid, dErr := decodeBEROID(oidRaw)
		if dErr != nil {
			continue
		}
		valTag, valRaw, _, valErr := readBERTLV(vbBytes, innerOff)
		if valErr != nil {
			continue
		}
		vb := snmpVarBind{
			OID:      oid,
			Tag:      valTag,
			RawValue: valRaw,
		}
		switch valTag {
		case 0x02: // INTEGER
			vb.IntValue = decodeBERInt(valRaw)
			vb.StrValue = strconv.FormatInt(vb.IntValue, 10)
		case 0x41, 0x42, 0x43: // Counter32, Gauge32, TimeTicks
			vb.IntValue = decodeBERUnsigned(valRaw)
			vb.StrValue = strconv.FormatInt(vb.IntValue, 10)
		case 0x04: // OCTET STRING
			vb.StrValue = sanitizeDeviceName(decodeNetworkBytes(valRaw))
		case 0x40: // IpAddress
			if len(valRaw) == 4 {
				vb.StrValue = fmt.Sprintf("%d.%d.%d.%d", valRaw[0], valRaw[1], valRaw[2], valRaw[3])
			}
		}
		vbs = append(vbs, vb)
	}
	return reqID, errStatus, vbs, nil
}

func snmpExchange(ctx context.Context, conn net.Conn, pduTag byte, community string, oid []int, timeout time.Duration) (snmpVarBind, error) {
	reqID := atomic.AddInt32(&snmpRequestCounter, 1)
	pkt, err := buildSNMPv2cPDU(pduTag, reqID, community, [][]int{oid})
	if err != nil {
		return snmpVarBind{}, err
	}
	_ = conn.SetDeadline(time.Now().Add(timeout))
	if _, err := conn.Write(pkt); err != nil {
		return snmpVarBind{}, err
	}
	buf := make([]byte, 4096)
	for {
		if ctx.Err() != nil {
			return snmpVarBind{}, ctx.Err()
		}
		n, rErr := conn.Read(buf)
		if rErr != nil {
			return snmpVarBind{}, rErr
		}
		respID, errStatus, vbs, pErr := parseSNMPv2cResponse(buf[:n])
		if pErr != nil {
			continue
		}
		if respID != reqID {
			continue
		}
		if errStatus != 0 || len(vbs) == 0 {
			return snmpVarBind{}, fmt.Errorf("snmp error status %d", errStatus)
		}
		return vbs[0], nil
	}
}

func snmpGet(ctx context.Context, conn net.Conn, community string, oidStr string, timeout time.Duration) (snmpVarBind, error) {
	oid, err := parseOIDString(oidStr)
	if err != nil {
		return snmpVarBind{}, err
	}
	return snmpExchange(ctx, conn, 0xA0, community, oid, timeout)
}

func snmpWalk(ctx context.Context, conn net.Conn, community string, baseOIDStr string, timeout time.Duration, maxEntries int) ([]snmpVarBind, error) {
	baseOID, err := parseOIDString(baseOIDStr)
	if err != nil {
		return nil, err
	}
	curOID := baseOID
	results := make([]snmpVarBind, 0, 32)
	for len(results) < maxEntries {
		if ctx.Err() != nil {
			break
		}
		vb, err := snmpExchange(ctx, conn, 0xA1, community, curOID, timeout)
		if err != nil {
			break
		}
		// EndOfMibView (0x82), NoSuchObject (0x80), NoSuchInstance (0x81)
		if vb.Tag == 0x80 || vb.Tag == 0x81 || vb.Tag == 0x82 {
			break
		}
		if !oidHasPrefix(vb.OID, baseOID) || oidEqual(vb.OID, curOID) {
			break
		}
		results = append(results, vb)
		curOID = vb.OID
	}
	return results, nil
}

func macFromOIDSuffix(oid []int) string {
	if len(oid) < 6 {
		return ""
	}
	tail := oid[len(oid)-6:]
	for _, b := range tail {
		if b < 0 || b > 255 {
			return ""
		}
	}
	return fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X", tail[0], tail[1], tail[2], tail[3], tail[4], tail[5])
}

func querySingleSwitchL2(
	ctx context.Context,
	cred SnmpL2CredentialInput,
	macToHost map[string]TopologyMapHostInput,
	timeout time.Duration,
) (SnmpL2SwitchSummary, []SnmpL2PortMapping) {
	t0 := time.Now()
	summary := SnmpL2SwitchSummary{
		SwitchIP:      cred.IP,
		SysName:       cred.Name,
		UplinkPorts:   []string{},
		LldpNeighbors: []SnmpL2LldpNeighbor{},
	}

	ver := strings.ToLower(strings.TrimSpace(cred.Version))
	if ver == "v3" {
		summary.Error = "SNMPv3 authPriv USM is not enabled in the standalone pure-Go MIB walker; please configure an SNMPv2c read-only community on the switch."
		summary.DurationMs = time.Since(t0).Milliseconds()
		return summary, nil
	}

	community := strings.TrimSpace(cred.Community)
	if community == "" {
		community = "public"
	}

	targetAddr := cred.IP
	if !strings.Contains(targetAddr, ":") {
		targetAddr = net.JoinHostPort(targetAddr, "161")
	}

	dialer := &net.Dialer{Timeout: timeout}
	conn, err := dialer.DialContext(ctx, "udp", targetAddr)
	if err != nil {
		summary.Error = fmt.Sprintf("UDP 161 dial failed: %v", err)
		summary.DurationMs = time.Since(t0).Milliseconds()
		return summary, nil
	}
	defer conn.Close()

	// 1. sysName.0 & sysDescr.0
	sysNameVB, err := snmpGet(ctx, conn, community, "1.3.6.1.2.1.1.5.0", timeout)
	if err != nil {
		summary.Error = fmt.Sprintf("SNMPv2c no response (%v)", err)
		summary.DurationMs = time.Since(t0).Milliseconds()
		return summary, nil
	}
	if sysNameVB.StrValue != "" {
		summary.SysName = sysNameVB.StrValue
	}
	if summary.SysName == "" {
		summary.SysName = cred.IP
	}
	if sysDescrVB, dErr := snmpGet(ctx, conn, community, "1.3.6.1.2.1.1.1.0", timeout); dErr == nil {
		summary.SysDescr = sysDescrVB.StrValue
	}

	// 2. IF-MIB: ifName (1.3.6.1.2.1.31.1.1.1.1) -> fallback ifDescr (1.3.6.1.2.1.2.2.1.2)
	ifNames := make(map[int]string)
	if ifNameVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.31.1.1.1.1", timeout, 512); len(ifNameVBs) > 0 {
		for _, vb := range ifNameVBs {
			idx := vb.OID[len(vb.OID)-1]
			if vb.StrValue != "" {
				ifNames[idx] = vb.StrValue
			}
		}
	}
	if len(ifNames) == 0 {
		if ifDescrVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.2.2.1.2", timeout, 512); len(ifDescrVBs) > 0 {
			for _, vb := range ifDescrVBs {
				idx := vb.OID[len(vb.OID)-1]
				if vb.StrValue != "" {
					ifNames[idx] = vb.StrValue
				}
			}
		}
	}
	summary.TotalPorts = len(ifNames)

	ifOperStatus := make(map[int]string)
	if operVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.2.2.1.8", timeout, 512); len(operVBs) > 0 {
		for _, vb := range operVBs {
			idx := vb.OID[len(vb.OID)-1]
			if vb.IntValue == 1 {
				ifOperStatus[idx] = "up"
			} else if vb.IntValue == 2 {
				ifOperStatus[idx] = "down"
			} else {
				ifOperStatus[idx] = "unknown"
			}
		}
	}

	ifSpeedMbps := make(map[int]int)
	if spdVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.31.1.1.1.15", timeout, 512); len(spdVBs) > 0 {
		for _, vb := range spdVBs {
			idx := vb.OID[len(vb.OID)-1]
			if vb.IntValue > 0 {
				ifSpeedMbps[idx] = int(vb.IntValue)
			}
		}
	}

	// 3. BRIDGE-MIB dot1dBasePortIfIndex (1.3.6.1.2.1.17.1.4.1.2.<bridgePort> -> ifIndex)
	bridgePortToIf := make(map[int]int)
	if bpVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.17.1.4.1.2", timeout, 512); len(bpVBs) > 0 {
		for _, vb := range bpVBs {
			bp := vb.OID[len(vb.OID)-1]
			bridgePortToIf[bp] = int(vb.IntValue)
		}
	}

	// 4. LLDP-MIB neighbors: lldpRemSysName (1.0.8802.1.1.2.1.4.1.1.9)
	lldpUplinkLocalPorts := make(map[string]bool)
	if lldpNames, _ := snmpWalk(ctx, conn, community, "1.0.8802.1.1.2.1.4.1.1.9", timeout, 128); len(lldpNames) > 0 {
		for _, vb := range lldpNames {
			// OID ends with <timeMark>.<localPortNum>.<remIndex>
			localPortNum := 0
			if len(vb.OID) >= 2 {
				localPortNum = vb.OID[len(vb.OID)-2]
			}
			localPortLabel := ifNames[localPortNum]
			if localPortLabel == "" {
				if ifIdx, ok := bridgePortToIf[localPortNum]; ok {
					localPortLabel = ifNames[ifIdx]
				}
			}
			if localPortLabel == "" && localPortNum > 0 {
				localPortLabel = fmt.Sprintf("Port %d", localPortNum)
			}
			if localPortLabel != "" {
				lldpUplinkLocalPorts[localPortLabel] = true
			}
			summary.LldpNeighbors = append(summary.LldpNeighbors, SnmpL2LldpNeighbor{
				LocalPort:     localPortLabel,
				RemoteSysName: vb.StrValue,
				RemotePort:    "",
			})
		}
	}

	// 5. FDB Table: Prefer Q-BRIDGE-MIB dot1qTpFdbPort (1.3.6.1.2.1.17.7.1.2.2.1.2.<fdbId>.<6 mac bytes>),
	// fallback/merge with BRIDGE-MIB dot1dTpFdbPort (1.3.6.1.2.1.17.4.3.1.2.<6 mac bytes>).
	type fdbRec struct {
		mac        string
		bridgePort int
		vlanID     int
	}
	fdbByMac := make(map[string]fdbRec)

	if qVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.17.7.1.2.2.1.2", timeout, 2048); len(qVBs) > 0 {
		prefixLen := len("1.3.6.1.2.1.17.7.1.2.2.1.2") // 13 arcs -> index 13 is fdbId
		_ = prefixLen
		for _, vb := range qVBs {
			mac := macFromOIDSuffix(vb.OID)
			if mac == "" || vb.IntValue <= 0 {
				continue
			}
			vlanID := 0
			if len(vb.OID) >= 20 {
				vlanID = vb.OID[len(vb.OID)-7]
			}
			fdbByMac[mac] = fdbRec{mac: mac, bridgePort: int(vb.IntValue), vlanID: vlanID}
		}
	}

	if dVBs, _ := snmpWalk(ctx, conn, community, "1.3.6.1.2.1.17.4.3.1.2", timeout, 2048); len(dVBs) > 0 {
		for _, vb := range dVBs {
			mac := macFromOIDSuffix(vb.OID)
			if mac == "" || vb.IntValue <= 0 {
				continue
			}
			if _, exists := fdbByMac[mac]; !exists {
				fdbByMac[mac] = fdbRec{mac: mac, bridgePort: int(vb.IntValue), vlanID: 0}
			}
		}
	}

	// Count MACs learned per ifIndex to identify trunk/uplink ports
	macsPerPort := make(map[int]int)
	resolvedIf := make(map[string]int, len(fdbByMac))
	for mac, rec := range fdbByMac {
		ifIdx := bridgePortToIf[rec.bridgePort]
		if ifIdx == 0 {
			ifIdx = rec.bridgePort
		}
		resolvedIf[mac] = ifIdx
		macsPerPort[ifIdx]++
	}

	mappings := make([]SnmpL2PortMapping, 0, len(fdbByMac))
	uplinkSet := make(map[string]bool)
	for lp := range lldpUplinkLocalPorts {
		uplinkSet[lp] = true
	}

	for mac, rec := range fdbByMac {
		ifIdx := resolvedIf[mac]
		portName := ifNames[ifIdx]
		if portName == "" {
			portName = fmt.Sprintf("Port %d", ifIdx)
		}
		macCnt := macsPerPort[ifIdx]
		isUplink := macCnt >= 3 || lldpUplinkLocalPorts[portName]
		if isUplink {
			uplinkSet[portName] = true
		}

		var matchedHost *TopologyMapHostInput
		if h, ok := macToHost[mac]; ok {
			hCopy := h
			matchedHost = &hCopy
		}

		// Record all scanned host mappings (plus access ports)
		m := SnmpL2PortMapping{
			MAC:            mac,
			SwitchIP:       cred.IP,
			SwitchName:     summary.SysName,
			IfIndex:        ifIdx,
			PortName:       portName,
			VlanID:         rec.vlanID,
			OperStatus:     ifOperStatus[ifIdx],
			SpeedMbps:      ifSpeedMbps[ifIdx],
			MacCountOnPort: macCnt,
			IsUplink:       isUplink,
		}
		if matchedHost != nil {
			m.IP = matchedHost.IP
			m.Hostname = matchedHost.Hostname
			summary.MappedMacCount++
		}
		if matchedHost != nil || !isUplink {
			mappings = append(mappings, m)
		}
	}

	for up := range uplinkSet {
		summary.UplinkPorts = append(summary.UplinkPorts, up)
	}
	sort.Strings(summary.UplinkPorts)
	summary.DurationMs = time.Since(t0).Milliseconds()
	return summary, mappings
}

func RunSnmpL2Mapping(
	ctx context.Context,
	switches []SnmpL2CredentialInput,
	hosts []TopologyMapHostInput,
	status LicenseStatusResponse,
) SnmpL2MappingResult {
	res := SnmpL2MappingResult{
		MappedAtMs:  time.Now().UTC().UnixMilli(),
		Switches:    []SnmpL2SwitchSummary{},
		Mappings:    []SnmpL2PortMapping{},
		HostMapByIP: make(map[string]SnmpL2PortMapping),
	}

	if !status.Features.SnmpL2Mapping || status.Features.SnmpL2MaxSwitches <= 0 {
		res.Success = false
		res.Error = "SNMP L2 physical switch port mapping requires PRO or Enterprise edition."
		return res
	}
	if len(switches) == 0 {
		res.Success = false
		res.Error = "At least one managed switch target IP is required."
		return res
	}
	if len(switches) > status.Features.SnmpL2MaxSwitches {
		res.Success = false
		res.Error = fmt.Sprintf("Switch limit exceeded: your %s license allows up to %d switches per L2 map.",
			strings.ToUpper(status.Tier), status.Features.SnmpL2MaxSwitches)
		return res
	}

	macToHost := make(map[string]TopologyMapHostInput, len(hosts))
	for _, h := range hosts {
		norm := normalizeTimelineMac(h.MAC)
		if norm != "" {
			macToHost[norm] = h
		}
	}

	vault := getSnmpVault()
	type swOut struct {
		summary  SnmpL2SwitchSummary
		mappings []SnmpL2PortMapping
	}
	outCh := make(chan swOut, len(switches))
	var wg sync.WaitGroup
	for _, rawCred := range switches {
		cred := rawCred
		cred.IP = strings.TrimSpace(cred.IP)
		if cred.Community == "" && cred.Version != "v3" {
			if saved, ok := vault.Get(cred.IP); ok {
				if cred.Name == "" {
					cred.Name = saved.Name
				}
				cred.Community = saved.Community
				cred.Version = saved.Version
			}
		}
		if cred.SaveInMemoryVault {
			_ = vault.Save(cred)
		}

		wg.Add(1)
		go func(c SnmpL2CredentialInput) {
			defer wg.Done()
			sum, mps := querySingleSwitchL2(ctx, c, macToHost, 1200*time.Millisecond)
			outCh <- swOut{summary: sum, mappings: mps}
		}(cred)
	}
	wg.Wait()
	close(outCh)

	tl := getTimelineStore()
	for o := range outCh {
		res.Switches = append(res.Switches, o.summary)
		for _, m := range o.mappings {
			res.Mappings = append(res.Mappings, m)
			if m.IP != "" {
				// Prefer non-uplink access port match over trunk port when multiple switches report same MAC
				existing, exists := res.HostMapByIP[m.IP]
				if !exists || (existing.IsUplink && !m.IsUplink) {
					res.HostMapByIP[m.IP] = m
					tl.RecordSwitchPortMovement(m.IP, m.MAC, m.Hostname, m.SwitchIP, m.SwitchName, m.PortName, m.VlanID)
				}
			}
		}
	}

	sort.Slice(res.Switches, func(i, j int) bool { return res.Switches[i].SwitchIP < res.Switches[j].SwitchIP })
	res.Success = true
	return res
}
