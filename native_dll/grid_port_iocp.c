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

static int winsockInitialized = 0;
static CRITICAL_SECTION lockPort;

static void EnsureWinsock(void) {
    if (!winsockInitialized) {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
        InitializeCriticalSection(&lockPort);
        winsockInitialized = 1;
    }
}

int PortScan_GetVersion(void) {
    return 20500;
}

int PortScan_ProbeSingle(const char* targetIp, int port, int timeoutMs) {
    if (!targetIp || port <= 0 || port > 65535) return 0;
    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return 0;

    // Set non-blocking mode
    u_long mode = 1;
    ioctlsocket(s, FIONBIO, &mode);

    struct sockaddr_in target;
    memset(&target, 0, sizeof(target));
    target.sin_family = AF_INET;
    target.sin_port = htons((u_short)port);
    target.sin_addr.s_addr = inet_addr(targetIp);

    connect(s, (struct sockaddr*)&target, sizeof(target));

    fd_set writeSet, errSet;
    FD_ZERO(&writeSet);
    FD_ZERO(&errSet);
    FD_SET(s, &writeSet);
    FD_SET(s, &errSet);

    struct timeval tv;
    tv.tv_sec = timeoutMs / 1000;
    tv.tv_usec = (timeoutMs % 1000) * 1000;

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
    for (int i = 0; i < maxConcurrency; i++) {
        threads[i] = CreateThread(NULL, 0, BatchWorkerThread, &ctx, 0, NULL);
    }

    WaitForMultipleObjects(maxConcurrency, threads, TRUE, INFINITE);
    for (int i = 0; i < maxConcurrency; i++) {
        if (threads[i]) CloseHandle(threads[i]);
    }

    return 1;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    (void)lpvReserved;
    switch (fdwReason) {
        case DLL_PROCESS_ATTACH:
            EnsureWinsock();
            break;
        case DLL_PROCESS_DETACH:
            if (winsockInitialized) {
                DeleteCriticalSection(&lockPort);
                WSACleanup();
                winsockInitialized = 0;
            }
            break;
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
