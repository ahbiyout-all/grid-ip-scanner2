package main

import "testing"

func TestIsValidLocalSSDPURL(t *testing.T) {
	targetIP := "192.168.1.50"

	validCases := []string{
		"http://192.168.1.50:49152/description.xml",
		"https://192.168.1.50/rootDesc.xml",
		"  http://192.168.1.50:80/upnp  ",
	}
	for _, raw := range validCases {
		if !isValidLocalSSDPURL(raw, targetIP) {
			t.Errorf("expected valid SSDP URL %q for target %q", raw, targetIP)
		}
	}

	invalidCases := []string{
		"",
		"ftp://192.168.1.50/desc.xml",
		"file:///etc/passwd",
		"http://evil.example.com/192.168.1.50/desc.xml",
		"http://192.168.1.50.evil.com/desc.xml",
		"http://192.168.1.51:49152/description.xml",
		"http://127.0.0.1:8080/192.168.1.50",
		"http://user@192.168.1.500/desc.xml",
		"javascript:alert(1)//192.168.1.50",
	}
	for _, raw := range invalidCases {
		if isValidLocalSSDPURL(raw, targetIP) {
			t.Errorf("expected invalid SSDP URL %q to be rejected for target %q", raw, targetIP)
		}
	}
}
