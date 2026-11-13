/**
 * Grid IP Scanner2 - Module 5: grid_banner_grabber.c
 * Deep Protocol Banner Grabber & Metadata Extractor (HTTP, SSH, RTSP, TLS)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_BANNER_GRABBER
#define BUILDING_GRID_BANNER_GRABBER
#endif
#include "grid_banner_grabber.h"

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

static LONG volatile winsockState = 0;
static void EnsureWinsock(void) {
    if (InterlockedCompareExchange(&winsockState, 0, 0) == 2) return;
    if (InterlockedCompareExchange(&winsockState, 1, 0) == 0) {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
        InterlockedExchange(&winsockState, 2);
    } else {
        while (InterlockedCompareExchange(&winsockState, 0, 0) != 2) {
            Sleep(0);
        }
    }
}

static char* banner_stristr(const char* haystack, const char* needle) {
    if (!haystack || !needle || !*needle) return (char*)haystack;
    size_t nlen = strlen(needle);
    for (const char* p = haystack; *p; p++) {
        if (_strnicmp(p, needle, nlen) == 0) return (char*)p;
    }
    return NULL;
}

int Banner_GetVersion(void) {
    return 20501;
}

static SOCKET ConnectSocket(const char* ip, int port, int timeoutMs) {
    unsigned long ipAddr = inet_addr(ip);
    if (ipAddr == INADDR_NONE) return INVALID_SOCKET;

    EnsureWinsock();
    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return INVALID_SOCKET;

    u_long mode = 1;
    ioctlsocket(s, FIONBIO, &mode);

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons((u_short)port);
    dest.sin_addr.s_addr = ipAddr;

    connect(s, (struct sockaddr*)&dest, sizeof(dest));

    fd_set writeSet, errSet;
    FD_ZERO(&writeSet);
    FD_ZERO(&errSet);
    FD_SET(s, &writeSet);
    FD_SET(s, &errSet);

    int effTimeout = timeoutMs > 0 ? timeoutMs : 1000;
    struct timeval tv;
    tv.tv_sec = effTimeout / 1000;
    tv.tv_usec = (effTimeout % 1000) * 1000;

    int sel = select(0, NULL, &writeSet, &errSet, &tv);
    if (sel <= 0 || !FD_ISSET(s, &writeSet) || FD_ISSET(s, &errSet)) {
        closesocket(s);
        return INVALID_SOCKET;
    }

    // Switch back to blocking with socket timeouts for easy read/write
    mode = 0;
    ioctlsocket(s, FIONBIO, &mode);

    DWORD sockTimeout = (DWORD)effTimeout;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&sockTimeout, sizeof(sockTimeout));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&sockTimeout, sizeof(sockTimeout));

    return s;
}

int Banner_GrabHttp(
    const char* ip,
    int port,
    int timeoutMs,
    char* outServerHeader,
    char* outHtmlTitle,
    int maxLen
) {
    if (!ip || port <= 0 || maxLen < 1) return 0;
    if (outServerHeader) outServerHeader[0] = '\0';
    if (outHtmlTitle) outHtmlTitle[0] = '\0';

    SOCKET s = ConnectSocket(ip, port, timeoutMs);
    if (s == INVALID_SOCKET) return 0;

    char request[256];
    snprintf(request, sizeof(request),
             "GET / HTTP/1.1\r\nHost: %s:%d\r\nUser-Agent: GridIPScanner/2.5\r\nAccept: */*\r\nConnection: close\r\n\r\n",
             ip, port);

    send(s, request, (int)strlen(request), 0);

    char response[8192];
    int totalRecv = 0;
    while (totalRecv < (int)sizeof(response) - 1) {
        int chunk = recv(s, response + totalRecv, (int)sizeof(response) - 1 - totalRecv, 0);
        if (chunk <= 0) break;
        totalRecv += chunk;
        // Stop early once we have both headers and closing title tag
        response[totalRecv] = '\0';
        if (banner_stristr(response, "</title>") != NULL) break;
    }
    closesocket(s);

    if (totalRecv <= 0) return 0;
    response[totalRecv] = '\0';

    int found = 0;

    // 1. Extract Server header without mutating response buffer
    if (outServerHeader) {
        char* serverPtr = banner_stristr(response, "\nServer:");
        if (!serverPtr) {
            if (_strnicmp(response, "Server:", 7) == 0) serverPtr = response;
        } else {
            serverPtr += 1; /* skip '\n' */
        }
        if (serverPtr) {
            serverPtr += 7;
            while (*serverPtr == ' ' || *serverPtr == '\t') serverPtr++;
            char* lineEnd = strpbrk(serverPtr, "\r\n");
            size_t len = lineEnd ? (size_t)(lineEnd - serverPtr) : strlen(serverPtr);
            if (len >= (size_t)maxLen) len = (size_t)(maxLen - 1);
            memcpy(outServerHeader, serverPtr, len);
            outServerHeader[len] = '\0';
            found = 1;
        }
    }

    // 2. Extract HTML <title>
    if (outHtmlTitle) {
        char* titleTag = banner_stristr(response, "<title");
        if (titleTag) {
            char* gt = strchr(titleTag, '>');
            if (gt) {
                char* titleStart = gt + 1;
                char* titleEnd = banner_stristr(titleStart, "</title>");
                if (titleEnd) {
                    while (titleStart < titleEnd &&
                           (*titleStart == ' ' || *titleStart == '\n' || *titleStart == '\r' || *titleStart == '\t')) {
                        titleStart++;
                    }
                    while (titleEnd > titleStart &&
                           (titleEnd[-1] == ' ' || titleEnd[-1] == '\n' || titleEnd[-1] == '\r' || titleEnd[-1] == '\t')) {
                        titleEnd--;
                    }
                    size_t tlen = (size_t)(titleEnd - titleStart);
                    if (tlen >= (size_t)maxLen) tlen = (size_t)(maxLen - 1);
                    memcpy(outHtmlTitle, titleStart, tlen);
                    outHtmlTitle[tlen] = '\0';
                    found = 1;
                }
            }
        }
    }

    return found;
}

int Banner_GrabSsh(const char* ip, int port, int timeoutMs, char* outSshBanner, int maxLen) {
    if (!ip || port <= 0 || !outSshBanner || maxLen < 1) return 0;
    outSshBanner[0] = '\0';

    SOCKET s = ConnectSocket(ip, port, timeoutMs);
    if (s == INVALID_SOCKET) return 0;

    char buffer[256];
    int bytes = recv(s, buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (bytes > 4) {
        buffer[bytes] = '\0';
        if (strncmp(buffer, "SSH-", 4) == 0) {
            char* end = strpbrk(buffer, "\r\n");
            size_t len = end ? (size_t)(end - buffer) : strlen(buffer);
            if (len >= (size_t)maxLen) len = (size_t)(maxLen - 1);
            memcpy(outSshBanner, buffer, len);
            outSshBanner[len] = '\0';
            return 1;
        }
    }
    return 0;
}

int Banner_GrabRtsp(const char* ip, int port, int timeoutMs, char* outRtspServer, int maxLen) {
    if (!ip || port <= 0 || !outRtspServer || maxLen < 1) return 0;
    outRtspServer[0] = '\0';

    SOCKET s = ConnectSocket(ip, port, timeoutMs);
    if (s == INVALID_SOCKET) return 0;

    const char* req = "OPTIONS * RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: GridIPScanner/2.5\r\n\r\n";
    send(s, req, (int)strlen(req), 0);

    char buffer[1024];
    int bytes = recv(s, buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (bytes > 0) {
        buffer[bytes] = '\0';
        char* serverPtr = banner_stristr(buffer, "Server:");
        if (serverPtr) {
            serverPtr += 7;
            while (*serverPtr == ' ' || *serverPtr == '\t') serverPtr++;
            char* end = strpbrk(serverPtr, "\r\n");
            size_t len = end ? (size_t)(end - serverPtr) : strlen(serverPtr);
            if (len >= (size_t)maxLen) len = (size_t)(maxLen - 1);
            memcpy(outRtspServer, serverPtr, len);
            outRtspServer[len] = '\0';
            return 1;
        }
        if (strstr(buffer, "RTSP/1.0")) {
            snprintf(outRtspServer, (size_t)maxLen, "%s", "RTSP Media Server (Active)");
            return 1;
        }
    }
    return 0;
}

int Banner_GrabTlsSni(const char* ip, int port, int timeoutMs, char* outSubject, int maxLen) {
    if (!ip || port <= 0 || !outSubject || maxLen < 1) return 0;
    outSubject[0] = '\0';

    SOCKET s = ConnectSocket(ip, port, timeoutMs);
    if (s == INVALID_SOCKET) return 0;

    // Minimal TLS 1.2 ClientHello
    unsigned char clientHello[] = {
        0x16, 0x03, 0x01, 0x00, 0x2D, // Record: Handshake, TLS 1.0, Length: 45
        0x01, 0x00, 0x00, 0x29,       // ClientHello, Length: 41
        0x03, 0x03,                   // TLS 1.2
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, // Random 32 bytes
        0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
        0x00,                         // Session ID length: 0
        0x00, 0x02, 0xC0, 0x2F,       // Cipher Suites (TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256)
        0x01, 0x00                    // Compression Methods (0)
    };

    send(s, (const char*)clientHello, sizeof(clientHello), 0);

    unsigned char resp[2048];
    int bytes = recv(s, (char*)resp, sizeof(resp), 0);
    closesocket(s);

    if (bytes > 5 && resp[0] == 0x16) {
        // Valid TLS Handshake response (ServerHello)
        snprintf(outSubject, maxLen, "TLS/SSL Enabled (Version: 0x%02X%02X)", resp[1], resp[2]);
        return 1;
    }

    return 0;
}

int Banner_GrabDeepAll(const char* ip, int port, int timeoutMs, DeepBannerResult* outResult) {
    if (!ip || !outResult) return 0;
    memset(outResult, 0, sizeof(DeepBannerResult));

    if (port == 22) {
        if (Banner_GrabSsh(ip, port, timeoutMs, outResult->sshBanner, sizeof(outResult->sshBanner))) {
            outResult->detectedProtocol = 2; // SSH
            return 1;
        }
    } else if (port == 554 || port == 8554) {
        if (Banner_GrabRtsp(ip, port, timeoutMs, outResult->rtspServer, sizeof(outResult->rtspServer))) {
            outResult->detectedProtocol = 3; // RTSP
            return 1;
        }
    } else if (port == 443 || port == 8443) {
        if (Banner_GrabTlsSni(ip, port, timeoutMs, outResult->tlsSubject, sizeof(outResult->tlsSubject))) {
            outResult->detectedProtocol = 4; // TLS
            return 1;
        }
    } else {
        // Try HTTP by default
        if (Banner_GrabHttp(ip, port, timeoutMs, outResult->serverHeader, outResult->htmlTitle, sizeof(outResult->serverHeader))) {
            outResult->detectedProtocol = 1; // HTTP
            return 1;
        }
    }

    return 0;
}

#else
int Banner_GetVersion(void) { return 20500; }
int Banner_GrabHttp(const char* ip, int port, int timeoutMs, char* outServerHeader, char* outHtmlTitle, int maxLen) { return 0; }
int Banner_GrabSsh(const char* ip, int port, int timeoutMs, char* outSshBanner, int maxLen) { return 0; }
int Banner_GrabRtsp(const char* ip, int port, int timeoutMs, char* outRtspServer, int maxLen) { return 0; }
int Banner_GrabTlsSni(const char* ip, int port, int timeoutMs, char* outSubject, int maxLen) { return 0; }
int Banner_GrabDeepAll(const char* ip, int port, int timeoutMs, DeepBannerResult* outResult) { return 0; }
#endif
