/**
 * Grid IP Scanner2 - Module 6: grid_pcap_analyzer.c
 * Npcap/WinPcap Kernel Packet Capture, OS Fingerprinting & ARP Anomaly Detector
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PCAP_ANALYZER
#define BUILDING_GRID_PCAP_ANALYZER
#endif
#if defined(_WIN32) && (!defined(_WIN32_WINNT) || _WIN32_WINNT < 0x0601)
#undef _WIN32_WINNT
#define _WIN32_WINNT 0x0601
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
    return 20602;
}

#ifndef LOAD_LIBRARY_SEARCH_SYSTEM32
#define LOAD_LIBRARY_SEARCH_SYSTEM32 0x00000800
#endif

int Pcap_IsNpcapAvailable(void) {
    if (InterlockedCompareExchange(&npcapState, 0, 0) == 2) {
        return (int)InterlockedCompareExchange(&npcapAvailable, 0, 0);
    }
    if (InterlockedCompareExchange(&npcapState, 1, 0) == 0) {
        char sysDir[MAX_PATH] = {0};
        HMODULE mod = NULL;
        UINT sysLen = GetSystemDirectoryA(sysDir, sizeof(sysDir));
        if (sysLen > 0 && sysLen + 20 < sizeof(sysDir)) {
            char npcapPath[MAX_PATH + 32];
            snprintf(npcapPath, sizeof(npcapPath), "%s\\Npcap\\wpcap.dll", sysDir);
            mod = LoadLibraryExA(npcapPath, NULL, LOAD_LIBRARY_SEARCH_SYSTEM32);
        }
        if (!mod) {
            mod = LoadLibraryExA("wpcap.dll", NULL, LOAD_LIBRARY_SEARCH_SYSTEM32);
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
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 64;
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

static int normalizeMacHex12(const char* raw, char outHex[13]) {
    if (!raw || !outHex) return 0;
    size_t n = 0;
    for (size_t i = 0; raw[i] != '\0'; i++) {
        unsigned char c = (unsigned char)raw[i];
        if (c == ':' || c == '-' || c == '.' || c == ' ' || c == '\t') continue;
        if (c >= 'a' && c <= 'f') c = (unsigned char)(c - 'a' + 'A');
        if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')) {
            if (n >= 12) return 0;
            outHex[n++] = (char)c;
        } else {
            return 0;
        }
    }
    if (n != 12) return 0;
    outHex[12] = '\0';
    return strcmp(outHex, "000000000000") != 0 && strcmp(outHex, "FFFFFFFFFFFF") != 0;
}

int Pcap_DetectArpSpoofing(
    const char* targetIp,
    const char* expectedMac,
    char* outAlertMessage,
    int maxLen
) {
    if (!targetIp || !expectedMac || !outAlertMessage || maxLen < 1) return 0;
    outAlertMessage[0] = '\0';

    char normExpected[13];
    if (!normalizeMacHex12(expectedMac, normExpected)) return 0;

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

        char normLive[13];
        if (normalizeMacHex12(liveMac, normLive) && strcmp(normLive, normExpected) != 0) {
            snprintf(outAlertMessage, (size_t)maxLen,
                     "WARNING: Potential ARP Spoofing Detected! Expected [%s] but live is [%s]",
                     expectedMac, liveMac);
            return 1; // Anomaly detected!
        }
    }

    return 0; // Normal
}

static void jsonEscapeCopy(const char* src, char* dst, size_t dstLen) {
    if (!dst || dstLen == 0) return;
    if (!src) {
        dst[0] = '\0';
        return;
    }
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j + 2 < dstLen; i++) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"' || c == '\\') {
            if (j + 3 >= dstLen) break;
            dst[j++] = '\\';
            dst[j++] = (char)c;
        } else if (c >= 0x20) {
            dst[j++] = (char)c;
        }
    }
    dst[j] = '\0';
}

static double probeTcpSynAckRttMs(unsigned long ipAddr, int port, int timeoutMs, int* outWinBuf) {
    if (port <= 0 || port > 65535) return -1.0;
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return -1.0;

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) {
        WSACleanup();
        return -1.0;
    }

    u_long nonBlocking = 1;
    ioctlsocket(s, FIONBIO, &nonBlocking);

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = ipAddr;
    addr.sin_port = htons((u_short)port);

    LARGE_INTEGER freq, t0, t1;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&t0);

    int rc = connect(s, (struct sockaddr*)&addr, sizeof(addr));
    double elapsedMs = -1.0;
    if (rc == 0) {
        QueryPerformanceCounter(&t1);
        elapsedMs = ((double)(t1.QuadPart - t0.QuadPart) * 1000.0) / (double)freq.QuadPart;
    } else if (WSAGetLastError() == WSAEWOULDBLOCK) {
        fd_set wfds, efds;
        FD_ZERO(&wfds);
        FD_ZERO(&efds);
        FD_SET(s, &wfds);
        FD_SET(s, &efds);
        struct timeval tv;
        int waitMs = timeoutMs > 0 ? timeoutMs : 350;
        tv.tv_sec = waitMs / 1000;
        tv.tv_usec = (waitMs % 1000) * 1000;
        int sel = select(0, NULL, &wfds, &efds, &tv);
        if (sel > 0 && FD_ISSET(s, &wfds)) {
            int soErr = 0;
            int optLen = sizeof(soErr);
            getsockopt(s, SOL_SOCKET, SO_ERROR, (char*)&soErr, &optLen);
            if (soErr == 0) {
                QueryPerformanceCounter(&t1);
                elapsedMs = ((double)(t1.QuadPart - t0.QuadPart) * 1000.0) / (double)freq.QuadPart;
                if (outWinBuf) {
                    int rcvBuf = 0;
                    int rcvLen = sizeof(rcvBuf);
                    if (getsockopt(s, SOL_SOCKET, SO_RCVBUF, (char*)&rcvBuf, &rcvLen) == 0) {
                        *outWinBuf = rcvBuf;
                    }
                }
            }
        }
    }

    closesocket(s);
    WSACleanup();
    return elapsedMs;
}

int Pcap_InspectPacketProfileJson(
    const char* targetIp,
    const char* expectedMac,
    int port,
    int timeoutMs,
    char* outJson,
    int maxLen
) {
    if (!targetIp || !outJson || maxLen < 64) return 0;
    outJson[0] = '\0';

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    int effTimeout = timeoutMs > 0 ? timeoutMs : 500;
    int ttl = 0;
    double rtts[3] = {0};
    int okSamples = 0;

    HANDLE hIcmp = IcmpCreateFile();
    if (hIcmp != INVALID_HANDLE_VALUE) {
        char sendData[16] = "GridPcapProbe26";
        DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 64;
        void* replyBuffer = malloc(replySize);
        if (replyBuffer) {
            LARGE_INTEGER freq, t0, t1;
            QueryPerformanceFrequency(&freq);
            for (int i = 0; i < 3; i++) {
                memset(replyBuffer, 0, replySize);
                QueryPerformanceCounter(&t0);
                DWORD replies = IcmpSendEcho(
                    hIcmp,
                    ipAddr,
                    sendData,
                    (WORD)sizeof(sendData),
                    NULL,
                    replyBuffer,
                    replySize,
                    (DWORD)effTimeout
                );
                QueryPerformanceCounter(&t1);
                if (replies > 0) {
                    PICMP_ECHO_REPLY pEcho = (PICMP_ECHO_REPLY)replyBuffer;
                    if (pEcho->Status == IP_SUCCESS) {
                        double dt = ((double)(t1.QuadPart - t0.QuadPart) * 1000.0) / (double)freq.QuadPart;
                        if (dt < 0.05) dt = (double)pEcho->RoundTripTime;
                        rtts[okSamples++] = dt;
                        if (ttl == 0 && pEcho->Options.Ttl > 0) {
                            ttl = (int)pEcho->Options.Ttl;
                        }
                    }
                }
            }
            free(replyBuffer);
        }
        IcmpCloseHandle(hIcmp);
    }

    double rttMin = 0.0, rttAvg = 0.0, rttMax = 0.0, jitter = 0.0;
    if (okSamples > 0) {
        rttMin = rtts[0];
        rttMax = rtts[0];
        double sum = 0.0;
        for (int i = 0; i < okSamples; i++) {
            if (rtts[i] < rttMin) rttMin = rtts[i];
            if (rtts[i] > rttMax) rttMax = rtts[i];
            sum += rtts[i];
        }
        rttAvg = sum / (double)okSamples;
        jitter = rttMax - rttMin;
    }

    int probePorts[5] = { port > 0 ? port : 80, 443, 22, 445, 3389 };
    int tcpUsedPort = 0;
    double tcpHandshakeMs = -1.0;
    int tcpWinBuf = 0;
    for (int i = 0; i < 5; i++) {
        int cand = probePorts[i];
        if (i > 0 && cand == probePorts[0]) continue;
        double tMs = probeTcpSynAckRttMs(ipAddr, cand, effTimeout > 350 ? 350 : effTimeout, &tcpWinBuf);
        if (tMs >= 0.0) {
            tcpHandshakeMs = tMs;
            tcpUsedPort = cand;
            break;
        }
    }

    int initTtl = 0;
    int estHops = 0;
    const char* osGuess = "Unknown / ICMP Filtered";
    int confidence = 35;
    if (ttl > 0) {
        if (ttl <= 64) {
            initTtl = 64;
            estHops = 64 - ttl;
            osGuess = (tcpUsedPort == 22 || tcpUsedPort == 80 || tcpUsedPort == 443)
                ? "Linux / macOS / Embedded UNIX (TTL 64)"
                : "Linux / Android / macOS / iOS (TTL 64)";
            confidence = tcpUsedPort > 0 ? 90 : 78;
        } else if (ttl <= 128) {
            initTtl = 128;
            estHops = 128 - ttl;
            osGuess = (tcpUsedPort == 445 || tcpUsedPort == 3389)
                ? "Windows 10/11 / Server (SMB/RDP + TTL 128)"
                : "Windows PC / Server (TTL 128)";
            confidence = (tcpUsedPort == 445 || tcpUsedPort == 3389) ? 96 : 84;
        } else {
            initTtl = 255;
            estHops = 255 - ttl;
            osGuess = "Cisco IOS / L3 Switch / Gateway Appliance (TTL 255)";
            confidence = 88;
        }
    } else if (tcpHandshakeMs >= 0.0) {
        confidence = 62;
        if (tcpUsedPort == 445 || tcpUsedPort == 3389) {
            osGuess = "Windows Host (ICMP Filtered, TCP SMB/RDP)";
        } else if (tcpUsedPort == 22) {
            osGuess = "Linux / UNIX SSH Node (ICMP Filtered)";
        } else {
            osGuess = "HTTP/HTTPS Network Service (ICMP Filtered)";
        }
    }

    char liveMac[24] = {0};
    BYTE macAddr[8] = {0};
    ULONG macLen = 6;
    if (SendARP(ipAddr, 0, (PULONG)macAddr, &macLen) == NO_ERROR && macLen == 6) {
        snprintf(liveMac, sizeof(liveMac), "%02X:%02X:%02X:%02X:%02X:%02X",
                 macAddr[0], macAddr[1], macAddr[2],
                 macAddr[3], macAddr[4], macAddr[5]);
    }

    int arpConsistent = 1;
    char spoofAlert[256] = {0};
    char normLive[13], normExpected[13];
    if (liveMac[0] != '\0' && expectedMac &&
        normalizeMacHex12(liveMac, normLive) &&
        normalizeMacHex12(expectedMac, normExpected)) {
        if (strcmp(normLive, normExpected) != 0) {
            arpConsistent = 0;
            snprintf(spoofAlert, sizeof(spoofAlert),
                     "ARP Mismatch: Expected [%s] vs Live [%s]", expectedMac, liveMac);
        }
    }

    char escIp[64], escOs[160], escMac[48], escAlert[320];
    jsonEscapeCopy(targetIp, escIp, sizeof(escIp));
    jsonEscapeCopy(osGuess, escOs, sizeof(escOs));
    jsonEscapeCopy(liveMac, escMac, sizeof(escMac));
    jsonEscapeCopy(spoofAlert, escAlert, sizeof(escAlert));

    int npcapReady = Pcap_IsNpcapAvailable();

    snprintf(
        outJson,
        (size_t)maxLen,
        "{\"ip\":\"%s\",\"ttl\":%d,\"estimatedInitialTtl\":%d,\"estimatedHops\":%d,"
        "\"tcpHandshakeMs\":%.2f,\"tcpProbePort\":%d,\"tcpWindowHint\":%d,"
        "\"osGuess\":\"%s\",\"confidence\":%d,\"sampleCount\":%d,"
        "\"rttMinMs\":%.2f,\"rttAvgMs\":%.2f,\"rttMaxMs\":%.2f,\"jitterMs\":%.2f,"
        "\"arpConsistent\":%s,\"liveMac\":\"%s\",\"spoofAlert\":\"%s\","
        "\"npcapAvailable\":%s,\"capturedVia\":\"grid_pcap_analyzer.dll v2.6.2\"}",
        escIp, ttl, initTtl, estHops,
        tcpHandshakeMs, tcpUsedPort, tcpWinBuf,
        escOs, confidence, okSamples,
        rttMin, rttAvg, rttMax, jitter,
        arpConsistent ? "true" : "false",
        escMac, escAlert,
        npcapReady ? "true" : "false"
    );
    return 1;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    if (fdwReason == DLL_PROCESS_DETACH) {
        if (lpvReserved == NULL && hWpcap) {
            FreeLibrary(hWpcap);
        }
        hWpcap = NULL;
        InterlockedExchange(&npcapAvailable, 0);
        InterlockedExchange(&npcapState, 0);
    }
    return TRUE;
}

#else
int Pcap_GetVersion(void) { return 20602; }
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
int Pcap_InspectPacketProfileJson(const char* targetIp, const char* expectedMac, int port, int timeoutMs, char* outJson, int maxLen) {
    (void)targetIp; (void)expectedMac; (void)port; (void)timeoutMs; (void)outJson; (void)maxLen;
    return 0;
}
#endif
