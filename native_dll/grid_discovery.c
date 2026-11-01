/**
 * Grid IP Scanner2 - Module 3: grid_discovery.c
 * Local Multicast & Broadcast Service Discovery Engine (mDNS, SSDP, LLMNR, NetBIOS)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_DISCOVERY
#define BUILDING_GRID_DISCOVERY
#endif
#include "grid_discovery.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#endif

static int winsockInit = 0;
static void EnsureWinsock(void) {
    if (!winsockInit) {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
        winsockInit = 1;
    }
}

int Discovery_GetVersion(void) {
    return 20500;
}

// NetBIOS Node Status Query implementation
int Discovery_QueryNetBIOS(
    const char* targetIp,
    int timeoutMs,
    char* outHost,
    int hostLen,
    char* outWorkgroup,
    int wgLen
) {
    if (!targetIp || !outHost || hostLen < 1) return 0;
    outHost[0] = '\0';
    if (outWorkgroup && wgLen > 0) outWorkgroup[0] = '\0';

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    // Timeout setting
    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(137);
    dest.sin_addr.s_addr = inet_addr(targetIp);

    // Standard RFC 1002 NetBIOS Node Status Request Packet (50 bytes)
    unsigned char nbPacket[50] = {
        0xA2, 0x48,             // Transaction ID
        0x00, 0x00,             // Flags: Query
        0x00, 0x01,             // Questions: 1
        0x00, 0x00,             // Answer RRs: 0
        0x00, 0x00,             // Authority RRs: 0
        0x00, 0x00,             // Additional RRs: 0
        // Encoded query name: CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA (wildcard *)
        0x20,
        0x43, 0x4B, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x00,                   // Terminator
        0x00, 0x21,             // Type: NBSTAT (0x0021)
        0x00, 0x01              // Class: IN (0x0001)
    };

    if (sendto(s, (const char*)nbPacket, sizeof(nbPacket), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    unsigned char resp[1024];
    int recvLen = recv(s, (char*)resp, sizeof(resp), 0);
    closesocket(s);

    if (recvLen < 56) return 0;

    int numNames = resp[56];
    if (numNames <= 0 || recvLen < 57 + numNames * 18) return 0;

    char resolvedHost[64] = {0};
    char resolvedGroup[64] = {0};

    int offset = 57;
    for (int i = 0; i < numNames; i++) {
        if (offset + 18 > recvLen) break;

        char rawName[16];
        memcpy(rawName, &resp[offset], 15);
        rawName[15] = '\0';

        unsigned char type = resp[offset + 15];
        unsigned short flags = (resp[offset + 16] << 8) | resp[offset + 17];
        int isGroup = (flags & 0x8000) != 0;

        // Trim right spaces
        for (int p = 14; p >= 0; p--) {
            if (rawName[p] == ' ' || rawName[p] == '\0') rawName[p] = '\0';
            else break;
        }

        if (strlen(rawName) > 0) {
            if (!isGroup && (type == 0x00 || type == 0x20) && resolvedHost[0] == '\0') {
                strncpy(resolvedHost, rawName, sizeof(resolvedHost) - 1);
            } else if (isGroup && type == 0x00 && resolvedGroup[0] == '\0') {
                strncpy(resolvedGroup, rawName, sizeof(resolvedGroup) - 1);
            }
        }
        offset += 18;
    }

    if (resolvedHost[0] != '\0') {
        strncpy(outHost, resolvedHost, hostLen - 1);
        if (outWorkgroup && wgLen > 0 && resolvedGroup[0] != '\0') {
            strncpy(outWorkgroup, resolvedGroup, wgLen - 1);
        }
        return 1;
    }

    return 0;
}

// mDNS Unicast/Multicast Query implementation
int Discovery_QueryMDNS(
    const char* targetIp,
    int timeoutMs,
    char* outName,
    int maxLen
) {
    if (!targetIp || !outName || maxLen < 1) return 0;
    outName[0] = '\0';

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(5353);
    dest.sin_addr.s_addr = inet_addr(targetIp);

    // Standard mDNS PTR query for "_services._dns-sd._udp.local"
    // Transaction ID: 0x0000, Flags: 0x0000, Questions: 1
    unsigned char mdnsQuery[] = {
        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x09, '_', 's', 'e', 'r', 'v', 'i', 'c', 'e', 's',
        0x07, '_', 'd', 'n', 's', '-', 's', 'd',
        0x04, '_', 'u', 'd', 'p',
        0x05, 'l', 'o', 'c', 'a', 'l',
        0x00,
        0x00, 0x0C, // Type: PTR
        0x00, 0x01  // Class: IN
    };

    if (sendto(s, (const char*)mdnsQuery, sizeof(mdnsQuery), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    char buffer[1500];
    int r = recv(s, buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (r > 12) {
        buffer[r] = '\0';
        // Extract readable strings
        for (int i = 12; i < r - 5; i++) {
            if (buffer[i] >= 32 && buffer[i] <= 126 && buffer[i+1] >= 32 && buffer[i+1] <= 126) {
                int start = i;
                while (i < r && buffer[i] >= 32 && buffer[i] <= 126) i++;
                int segLen = i - start;
                if (segLen >= 4 && segLen < maxLen) {
                    strncpy(outName, &buffer[start], maxLen - 1);
                    return 1;
                }
            }
        }
    }

    return 0;
}

// SSDP M-SEARCH query implementation
int Discovery_QuerySSDP(
    const char* targetIp,
    int timeoutMs,
    char* outDevice,
    int maxLen
) {
    if (!targetIp || !outDevice || maxLen < 1) return 0;
    outDevice[0] = '\0';

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(1900);
    dest.sin_addr.s_addr = inet_addr(targetIp);

    const char* mSearch = 
        "M-SEARCH * HTTP/1.1\r\n"
        "HOST: 239.255.255.250:1900\r\n"
        "MAN: \"ssdp:discover\"\r\n"
        "MX: 1\r\n"
        "ST: ssdp:all\r\n\r\n";

    if (sendto(s, mSearch, (int)strlen(mSearch), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    char buffer[2048];
    int r = recv(s, buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (r > 0) {
        buffer[r] = '\0';
        char* serverLine = strstr(buffer, "SERVER:");
        if (!serverLine) serverLine = strstr(buffer, "server:");
        if (serverLine) {
            serverLine += 7;
            while (*serverLine == ' ' || *serverLine == '\t') serverLine++;
            char* end = strstr(serverLine, "\r\n");
            if (end) *end = '\0';
            strncpy(outDevice, serverLine, maxLen - 1);
            outDevice[maxLen - 1] = '\0';
            return 1;
        }

        char* stLine = strstr(buffer, "ST:");
        if (!stLine) stLine = strstr(buffer, "st:");
        if (stLine) {
            stLine += 3;
            while (*stLine == ' ' || *stLine == '\t') stLine++;
            char* end = strstr(stLine, "\r\n");
            if (end) *end = '\0';
            strncpy(outDevice, stLine, maxLen - 1);
            outDevice[maxLen - 1] = '\0';
            return 1;
        }
    }

    return 0;
}

int Discovery_ProbeHost(
    const char* targetIp,
    int timeoutMs,
    DeviceDiscoveryInfo* outInfo
) {
    if (!targetIp || !outInfo) return 0;
    memset(outInfo, 0, sizeof(DeviceDiscoveryInfo));

    int discoveredBits = 0;

    // 1. Query NetBIOS
    char nbHost[128] = {0};
    char nbWorkgroup[64] = {0};
    if (Discovery_QueryNetBIOS(targetIp, timeoutMs, nbHost, sizeof(nbHost), nbWorkgroup, sizeof(nbWorkgroup))) {
        snprintf(outInfo->hostname, sizeof(outInfo->hostname), "%s", nbHost);
        snprintf(outInfo->workgroup, sizeof(outInfo->workgroup), "%s", nbWorkgroup);
        discoveredBits |= 1; // NetBIOS
    }

    // 2. Query mDNS
    char mdnsDevice[128] = {0};
    if (Discovery_QueryMDNS(targetIp, timeoutMs, mdnsDevice, sizeof(mdnsDevice))) {
        if (outInfo->hostname[0] == '\0') {
            snprintf(outInfo->hostname, sizeof(outInfo->hostname), "%s", mdnsDevice);
        }
        snprintf(outInfo->modelName, sizeof(outInfo->modelName), "%s", mdnsDevice);
        discoveredBits |= 2; // mDNS
    }

    // 3. Query SSDP
    char ssdpDevice[128] = {0};
    if (Discovery_QuerySSDP(targetIp, timeoutMs, ssdpDevice, sizeof(ssdpDevice))) {
        if (outInfo->modelName[0] == '\0') {
            snprintf(outInfo->modelName, sizeof(outInfo->modelName), "%s", ssdpDevice);
        }
        snprintf(outInfo->serviceType, sizeof(outInfo->serviceType), "%s", "UPnP/SSDP");
        discoveredBits |= 4; // SSDP
    }

    outInfo->protocolsDiscovered = discoveredBits;
    return (discoveredBits > 0) ? 1 : 0;
}

#else
int Discovery_GetVersion(void) { return 20500; }
int Discovery_ProbeHost(const char* targetIp, int timeoutMs, DeviceDiscoveryInfo* outInfo) { return 0; }
int Discovery_QueryNetBIOS(const char* targetIp, int timeoutMs, char* outHost, int hostLen, char* outWorkgroup, int wgLen) { return 0; }
int Discovery_QueryMDNS(const char* targetIp, int timeoutMs, char* outName, int maxLen) { return 0; }
int Discovery_QuerySSDP(const char* targetIp, int timeoutMs, char* outDevice, int maxLen) { return 0; }
#endif
