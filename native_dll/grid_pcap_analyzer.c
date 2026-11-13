/**
 * Grid IP Scanner2 - Module 6: grid_pcap_analyzer.c
 * Npcap/WinPcap Kernel Packet Capture, OS Fingerprinting & ARP Anomaly Detector
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PCAP_ANALYZER
#define BUILDING_GRID_PCAP_ANALYZER
#endif
#include "grid_pcap_analyzer.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <icmpapi.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")
#endif

static HMODULE hWpcap = NULL;
static LONG volatile npcapState = 0; /* 0=uninit, 1=probing, 2=done */
static LONG volatile npcapAvailable = 0;

int Pcap_GetVersion(void) {
    return 20501;
}

int Pcap_IsNpcapAvailable(void) {
    if (InterlockedCompareExchange(&npcapState, 0, 0) == 2) {
        return (int)InterlockedCompareExchange(&npcapAvailable, 0, 0);
    }
    if (InterlockedCompareExchange(&npcapState, 1, 0) == 0) {
        HMODULE mod = LoadLibraryA("wpcap.dll");
        if (!mod) {
            // Check Npcap custom system32 folder if installed
            mod = LoadLibraryA("C:\\Windows\\System32\\Npcap\\wpcap.dll");
        }
        hWpcap = mod;
        InterlockedExchange(&npcapAvailable, mod ? 1 : 0);
        InterlockedExchange(&npcapState, 2);
    } else {
        while (InterlockedCompareExchange(&npcapState, 0, 0) != 2) {
            Sleep(0);
        }
    }
    return (int)InterlockedCompareExchange(&npcapAvailable, 0, 0);
}

int Pcap_DetectOSFromSynAck(
    const char* targetIp,
    int port,
    int timeoutMs,
    char* outOsName,
    int maxLen,
    int* outTtl
) {
    (void)port;
    if (!targetIp || !outOsName || maxLen < 1) return 0;
    outOsName[0] = '\0';
    if (outTtl) *outTtl = 0;

    // Direct ICMP ping TTL inspection
    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    HANDLE hIcmp = IcmpCreateFile();
    if (hIcmp == INVALID_HANDLE_VALUE) return 0;

    char sendData[16] = "GridOsDetect";
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 16;
    void* replyBuffer = malloc(replySize);
    if (!replyBuffer) {
        IcmpCloseHandle(hIcmp);
        return 0;
    }

    DWORD replies = IcmpSendEcho(
        hIcmp,
        ipAddr,
        sendData,
        (WORD)sizeof(sendData),
        NULL,
        replyBuffer,
        replySize,
        timeoutMs > 0 ? (DWORD)timeoutMs : 500
    );

    int ttl = 0;
    if (replies > 0) {
        PICMP_ECHO_REPLY pEcho = (PICMP_ECHO_REPLY)replyBuffer;
        if (pEcho->Status == IP_SUCCESS) {
            ttl = (int)pEcho->Options.Ttl;
        }
    }

    IcmpCloseHandle(hIcmp);
    free(replyBuffer);

    if (ttl > 0) {
        if (outTtl) *outTtl = ttl;
        if (ttl <= 64) {
            snprintf(outOsName, (size_t)maxLen, "%s", "Linux / Android / macOS / iOS (TTL 64)");
        } else if (ttl <= 128) {
            snprintf(outOsName, (size_t)maxLen, "%s", "Windows PC / Server (TTL 128)");
        } else {
            snprintf(outOsName, (size_t)maxLen, "%s", "Cisco IOS / Network Switch / Gateway (TTL 255)");
        }
        return 1;
    }

    return 0;
}

int Pcap_DetectArpSpoofing(
    const char* targetIp,
    const char* expectedMac,
    char* outAlertMessage,
    int maxLen
) {
    if (!targetIp || !expectedMac || !outAlertMessage || maxLen < 1) return 0;
    outAlertMessage[0] = '\0';

    unsigned long destIp = inet_addr(targetIp);
    if (destIp == INADDR_NONE) return 0;

    BYTE macAddr[8] = {0};
    ULONG macLen = 6;

    DWORD ret = SendARP(destIp, 0, (PULONG)macAddr, &macLen);
    if (ret == NO_ERROR && macLen == 6) {
        char liveMac[24];
        snprintf(liveMac, sizeof(liveMac), "%02X:%02X:%02X:%02X:%02X:%02X",
                 macAddr[0], macAddr[1], macAddr[2],
                 macAddr[3], macAddr[4], macAddr[5]);

        if (strlen(expectedMac) >= 17 && _stricmp(liveMac, expectedMac) != 0) {
            snprintf(outAlertMessage, (size_t)maxLen,
                     "WARNING: Potential ARP Spoofing Detected! Expected [%s] but live is [%s]",
                     expectedMac, liveMac);
            return 1; // Anomaly detected!
        }
    }

    return 0; // Normal
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    (void)lpvReserved;
    if (fdwReason == DLL_PROCESS_DETACH) {
        if (hWpcap) {
            FreeLibrary(hWpcap);
            hWpcap = NULL;
        }
        InterlockedExchange(&npcapAvailable, 0);
        InterlockedExchange(&npcapState, 0);
    }
    return TRUE;
}

#else
int Pcap_GetVersion(void) { return 20501; }
int Pcap_IsNpcapAvailable(void) { return 0; }
int Pcap_DetectOSFromSynAck(const char* targetIp, int port, int timeoutMs, char* outOsName, int maxLen, int* outTtl) {
    (void)targetIp; (void)port; (void)timeoutMs; (void)outOsName; (void)maxLen;
    if (outTtl) *outTtl = 0;
    return 0;
}
int Pcap_DetectArpSpoofing(const char* targetIp, const char* expectedMac, char* outAlertMessage, int maxLen) {
    (void)targetIp; (void)expectedMac; (void)outAlertMessage; (void)maxLen;
    return 0;
}
#endif
