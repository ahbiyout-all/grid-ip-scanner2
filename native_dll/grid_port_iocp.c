/**
 * Grid IP Scanner2 - Module 2: grid_port_iocp.c
 * Windows I/O Completion Port High-Concurrency Port Scanning Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PORT_IOCP
#define BUILDING_GRID_PORT_IOCP
#endif
#include "grid_port_iocp.h"

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

static LONG volatile winsockState = 0; /* 0=uninit, 1=init, 2=ready */
static CRITICAL_SECTION lockPort;

static void EnsureWinsock(void) {
    if (InterlockedCompareExchange(&winsockState, 0, 0) == 2) return;
    if (InterlockedCompareExchange(&winsockState, 1, 0) == 0) {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
        InitializeCriticalSection(&lockPort);
        InterlockedExchange(&winsockState, 2);
    } else {
        while (InterlockedCompareExchange(&winsockState, 0, 0) != 2) {
            Sleep(0);
        }
    }
}

int PortScan_GetVersion(void) {
    return 20501;
}

int PortScan_ProbeSingle(const char* targetIp, int port, int timeoutMs) {
    if (!targetIp || port <= 0 || port > 65535) return 0;
    EnsureWinsock();

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return 0;

    // Set non-blocking mode
    u_long mode = 1;
    ioctlsocket(s, FIONBIO, &mode);

    struct sockaddr_in target;
    memset(&target, 0, sizeof(target));
    target.sin_family = AF_INET;
    target.sin_port = htons((u_short)port);
    target.sin_addr.s_addr = ipAddr;

    connect(s, (struct sockaddr*)&target, sizeof(target));

    fd_set writeSet, errSet;
    FD_ZERO(&writeSet);
    FD_ZERO(&errSet);
    FD_SET(s, &writeSet);
    FD_SET(s, &errSet);

    int effTimeout = timeoutMs > 0 ? timeoutMs : 300;
    struct timeval tv;
    tv.tv_sec = effTimeout / 1000;
    tv.tv_usec = (effTimeout % 1000) * 1000;

    int sel = select(0, NULL, &writeSet, &errSet, &tv);
    int isOpen = 0;

    if (sel > 0 && FD_ISSET(s, &writeSet) && !FD_ISSET(s, &errSet)) {
        int so_error = 0;
        int len = sizeof(so_error);
        if (getsockopt(s, SOL_SOCKET, SO_ERROR, (char*)&so_error, &len) == 0 && so_error == 0) {
            isOpen = 1;
        }
    }

    closesocket(s);
    return isOpen;
}

typedef struct {
    const char* ip;
    const int* ports;
    int portCount;
    int timeoutMs;
    int* outOpenPorts;
    int* outOpenCount;
    LONG nextIndex;
} BatchContext;

static DWORD WINAPI BatchWorkerThread(LPVOID param) {
    BatchContext* ctx = (BatchContext*)param;
    if (!ctx) return 0;

    while (1) {
        LONG idx = InterlockedIncrement(&ctx->nextIndex) - 1;
        if (idx >= ctx->portCount) break;

        int port = ctx->ports[idx];
        if (PortScan_ProbeSingle(ctx->ip, port, ctx->timeoutMs)) {
            EnterCriticalSection(&lockPort);
            if (*ctx->outOpenCount < ctx->portCount) {
                ctx->outOpenPorts[*ctx->outOpenCount] = port;
                (*ctx->outOpenCount)++;
            }
            LeaveCriticalSection(&lockPort);
        }
    }

    return 0;
}

int PortScan_RunBatch(
    const char* targetIp,
    const int* portList,
    int portCount,
    int timeoutMs,
    int maxConcurrency,
    int* outOpenPorts,
    int* outOpenCount
) {
    if (!targetIp || !portList || portCount <= 0 || !outOpenPorts || !outOpenCount) return 0;
    if (inet_addr(targetIp) == INADDR_NONE) {
        *outOpenCount = 0;
        return 0;
    }
    EnsureWinsock();

    *outOpenCount = 0;

    if (maxConcurrency <= 0) maxConcurrency = 32;
    if (maxConcurrency > 64) maxConcurrency = 64; // Win32 MAXIMUM_WAIT_OBJECTS limit
    if (maxConcurrency > portCount) maxConcurrency = portCount;

    BatchContext ctx;
    ctx.ip = targetIp;
    ctx.ports = portList;
    ctx.portCount = portCount;
    ctx.timeoutMs = timeoutMs > 0 ? timeoutMs : 300;
    ctx.outOpenPorts = outOpenPorts;
    ctx.outOpenCount = outOpenCount;
    ctx.nextIndex = 0;

    HANDLE threads[64];
    int validCount = 0;
    for (int i = 0; i < maxConcurrency; i++) {
        HANDLE h = CreateThread(NULL, 0, BatchWorkerThread, &ctx, 0, NULL);
        if (h) {
            threads[validCount++] = h;
        }
    }

    if (validCount > 0) {
        WaitForMultipleObjects((DWORD)validCount, threads, TRUE, INFINITE);
        for (int i = 0; i < validCount; i++) {
            CloseHandle(threads[i]);
        }
    } else {
        BatchWorkerThread(&ctx);
    }

    // Sort open ports ascending
    int cnt = *outOpenCount;
    for (int i = 1; i < cnt; i++) {
        int key = outOpenPorts[i];
        int j = i - 1;
        while (j >= 0 && outOpenPorts[j] > key) {
            outOpenPorts[j + 1] = outOpenPorts[j];
            j--;
        }
        outOpenPorts[j + 1] = key;
    }

    return 1;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    (void)lpvReserved;
    if (fdwReason == DLL_PROCESS_DETACH && InterlockedCompareExchange(&winsockState, 0, 0) == 2) {
        DeleteCriticalSection(&lockPort);
        WSACleanup();
        InterlockedExchange(&winsockState, 0);
    }
    return TRUE;
}

#else
int PortScan_GetVersion(void) { return 20500; }
int PortScan_ProbeSingle(const char* targetIp, int port, int timeoutMs) { return 0; }
int PortScan_RunBatch(const char* targetIp, const int* portList, int portCount, int timeoutMs, int maxConcurrency, int* outOpenPorts, int* outOpenCount) {
    if (outOpenCount) *outOpenCount = 0;
    return 0;
}
#endif
