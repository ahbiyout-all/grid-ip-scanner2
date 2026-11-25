package main

import (
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"strings"
)

type CIDRBlock struct {
	Index       int    `json:"index"`
	Label       string `json:"label"`
	Subnet      string `json:"subnet"`
	Start       int    `json:"start"`
	End         int    `json:"end"`
	HostCount   int    `json:"hostCount"`
	NetworkIP   string `json:"networkIp"`
	BroadcastIP string `json:"broadcastIp"`
}

type CIDRScanPlan struct {
	NormalizedCIDR string      `json:"normalizedCidr"`
	PrefixLen      int         `json:"prefixLen"`
	NetworkIP      string      `json:"networkIp"`
	BroadcastIP    string      `json:"broadcastIp"`
	TotalHosts     int         `json:"totalHosts"`
	Blocks         []CIDRBlock `json:"blocks"`
}

func uint32ToIPv4(v uint32) string {
	var b [4]byte
	binary.BigEndian.PutUint32(b[:], v)
	return net.IP(b[:]).String()
}

func ipv4ToUint32(ip net.IP) (uint32, bool) {
	ip4 := ip.To4()
	if ip4 == nil {
		return 0, false
	}
	return binary.BigEndian.Uint32(ip4), true
}

// ParseCIDRPlan parses either a CIDR string (e.g. "10.20.0.0/22") or a legacy 3-octet prefix ("192.168.1")
// paired with optional startHint/endHint (default 1..254), returning a chunked list of /24-aligned CIDRBlocks.
func ParseCIDRPlan(rawInput string, startHint int, endHint int) (CIDRScanPlan, error) {
	trimmed := strings.TrimSpace(rawInput)
	if trimmed == "" {
		return CIDRScanPlan{}, errors.New("empty subnet or CIDR input")
	}

	if strings.Contains(trimmed, "/") {
		_, ipnet, err := net.ParseCIDR(trimmed)
		if err != nil || ipnet == nil {
			return CIDRScanPlan{}, fmt.Errorf("invalid CIDR format: %s", trimmed)
		}
		ones, bits := ipnet.Mask.Size()
		if bits != 32 {
			return CIDRScanPlan{}, errors.New("only IPv4 CIDR ranges are supported")
		}
		if ones < 20 || ones > 30 {
			return CIDRScanPlan{}, fmt.Errorf("unsupported CIDR prefix /%d (supported range: /20 to /30)", ones)
		}

		netUint, ok := ipv4ToUint32(ipnet.IP)
		if !ok {
			return CIDRScanPlan{}, errors.New("invalid IPv4 network address")
		}
		hostCount := uint32(1) << uint(32-ones)
		bcastUint := netUint + hostCount - 1
		firstUsable := netUint + 1
		lastUsable := bcastUint - 1
		if lastUsable < firstUsable {
			return CIDRScanPlan{}, errors.New("CIDR range contains no usable hosts")
		}

		var blocks []CIDRBlock
		// Chunk by /24 boundary (upper 24 bits)
		firstC := firstUsable & 0xFFFFFF00
		lastC := lastUsable & 0xFFFFFF00
		blockIdx := 0
		for curBase := firstC; curBase <= lastC; curBase += 256 {
			blockStart := 0
			blockEnd := 255
			if curBase < firstUsable {
				blockStart = int(firstUsable - curBase)
			}
			if curBase+255 > lastUsable {
				blockEnd = int(lastUsable - curBase)
			}
			if blockEnd < blockStart {
				continue
			}
			var oct [4]byte
			binary.BigEndian.PutUint32(oct[:], curBase)
			subnetPrefix := fmt.Sprintf("%d.%d.%d", oct[0], oct[1], oct[2])
			blocks = append(blocks, CIDRBlock{
				Index:       blockIdx,
				Label:       fmt.Sprintf("%s.%d-%d", subnetPrefix, blockStart, blockEnd),
				Subnet:      subnetPrefix,
				Start:       blockStart,
				End:         blockEnd,
				HostCount:   blockEnd - blockStart + 1,
				NetworkIP:   fmt.Sprintf("%s.0", subnetPrefix),
				BroadcastIP: fmt.Sprintf("%s.255", subnetPrefix),
			})
			blockIdx++
		}

		return CIDRScanPlan{
			NormalizedCIDR: fmt.Sprintf("%s/%d", uint32ToIPv4(netUint), ones),
			PrefixLen:      ones,
			NetworkIP:      uint32ToIPv4(netUint),
			BroadcastIP:    uint32ToIPv4(bcastUint),
			TotalHosts:     int(lastUsable-firstUsable) + 1,
			Blocks:         blocks,
		}, nil
	}

	// Legacy 3-octet or 4-octet hostless prefix
	cleaned := strings.TrimRight(trimmed, ".")
	octets := strings.Split(cleaned, ".")
	if len(octets) == 4 {
		cleaned = strings.Join(octets[:3], ".")
		octets = octets[:3]
	}
	if len(octets) != 3 {
		return CIDRScanPlan{}, fmt.Errorf("invalid subnet format: %s", rawInput)
	}
	for _, o := range octets {
		var v int
		if n, err := fmt.Sscanf(o, "%d", &v); err != nil || n != 1 || v < 0 || v > 255 || fmt.Sprintf("%d", v) != o {
			return CIDRScanPlan{}, fmt.Errorf("invalid IPv4 octet in subnet: %s", rawInput)
		}
	}

	s := startHint
	e := endHint
	if s == 0 && e == 0 {
		s = 1
		e = 254
	}
	if s < 0 {
		s = 0
	} else if s > 255 {
		s = 255
	}
	if e < 0 {
		e = 0
	} else if e > 255 {
		e = 255
	}
	if s > e {
		s, e = e, s
	}

	return CIDRScanPlan{
		NormalizedCIDR: fmt.Sprintf("%s.0/24", cleaned),
		PrefixLen:      24,
		NetworkIP:      fmt.Sprintf("%s.0", cleaned),
		BroadcastIP:    fmt.Sprintf("%s.255", cleaned),
		TotalHosts:     e - s + 1,
		Blocks: []CIDRBlock{
			{
				Index:       0,
				Label:       fmt.Sprintf("%s.%d-%d", cleaned, s, e),
				Subnet:      cleaned,
				Start:       s,
				End:         e,
				HostCount:   e - s + 1,
				NetworkIP:   fmt.Sprintf("%s.0", cleaned),
				BroadcastIP: fmt.Sprintf("%s.255", cleaned),
			},
		},
	}, nil
}

// CheckCIDRTierAllowed validates whether the user's current license tier authorizes the CIDR prefix length.
// Free: /23../30 (max 510 hosts), Pro: /22../30 (max 1,022 hosts), Enterprise: /20../30 (max 4,094 hosts).
func CheckCIDRTierAllowed(plan CIDRScanPlan, status LicenseStatusResponse) (bool, string, string) {
	maxPrefix := status.Features.MaxCidrPrefix
	if maxPrefix == 0 {
		switch status.Tier {
		case "enterprise":
			maxPrefix = 20
		case "pro":
			maxPrefix = 22
		default:
			maxPrefix = 23
		}
	}
	if plan.PrefixLen >= maxPrefix {
		return true, "", ""
	}
	reqTier := "pro"
	if plan.PrefixLen <= 21 {
		reqTier = "enterprise"
	}
	msg := fmt.Sprintf("CIDR /%d (%d hosts) requires %s edition (current max prefix: /%d)",
		plan.PrefixLen, plan.TotalHosts, strings.ToUpper(reqTier), maxPrefix)
	return false, reqTier, msg
}
