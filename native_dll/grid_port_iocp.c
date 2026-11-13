/**
 * Grid IP Scanner2 - Module 2: grid_port_iocp.c
 * Windows I/O Completion Port High-Concurrency Port Scanning Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PORT_IOCP
#define BUILDING_GRID_PORT_IOCP
#endif
#if defined(_WIN32) && (!defined(_WIN32_WINNT) || _WIN32_WINNT < 0x0601)
#undef _WIN32_WINNT
#define _WIN32_WINNT 0x0601
#endif
#include "grid_port_iocp.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <mswsock.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "mswsock.lib")
#endif

#ifndef WSAID_CONNECTEX
static const GUID GRID_WSAID_CONNECTEX = {0x25a207b9, 0xddf3, 0x4660, {0x8e, 0xe9, 0x76, 0xe5, 0x8c, 0x74, 0x06, 0x3e}};
#else
static const GUID GRID_WSAID_CONNECTEX = WSAID_CONNECTEX;
#endif

#ifndef SO_UPDATE_CONNECT_CONTEXT
#define SO_UPDATE_CONNECT_CONTEXT 0x7010
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
    return 20600;
}

int PortScan_ProbeSingle(const char* targetIp, int port, int timeoutMs) {
    if (!targetIp || port <= 0 || port > 65535) return 0;
    EnsureWinsock();

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return 0;

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

/* ============================================================================
 * Genuine Win32 CreateIoCompletionPort + ConnectEx Multi-Host State Machine
 * ============================================================================ */
#define IOCP_SHUTDOWN_KEY ((ULONG_PTR)0xFFFFFFFFUL)

typedef struct {
    OVERLAPPED ov;
    SOCKET sock;
    int hostIdx;
    int portIdx;
    ULONGLONG deadlineMs;
    volatile LONG done;
    volatile LONG cancelled;
} IocpConnCtx;

typedef struct {
    HANDLE hIocp;
    unsigned long long* outMasks;
    volatile LONG activeInFlight;
    volatile LONG completedCount;
} IocpWorkerState;

static DWORD WINAPI IocpPortWorker(LPVOID param) {
    IocpWorkerState* st = (IocpWorkerState*)param;
    for (;;) {
        DWORD bytes = 0;
        ULONG_PTR compKey = 0;
        LPOVERLAPPED pOv = NULL;

        BOOL ok = GetQueuedCompletionStatus(st->hIocp, &bytes, &compKey, &pOv, 100);
        if (!pOv) {
            if (compKey == IOCP_SHUTDOWN_KEY) break;
            continue;
        }

        IocpConnCtx* ctx = CONTAINING_RECORD(pOv, IocpConnCtx, ov);
        if (ok && setsockopt(ctx->sock, SOL_SOCKET, SO_UPDATE_CONNECT_CONTEXT, NULL, 0) == 0) {
            EnterCriticalSection(&lockPort);
            st->outMasks[ctx->hostIdx] |= (1ULL << ctx->portIdx);
            LeaveCriticalSection(&lockPort);
        }

        if (InterlockedCompareExchange(&ctx->done, 1, 0) == 0) {
            if (ctx->sock != INVALID_SOCKET) {
                closesocket(ctx->sock);
                ctx->sock = INVALID_SOCKET;
            }
            InterlockedDecrement(&st->activeInFlight);
            InterlockedIncrement(&st->completedCount);
        }
    }
    return 0;
}

int PortScan_IocpMultiHostSweep(
    const unsigned int* ipListNetOrder,
    int ipCount,
    const unsigned short* ports,
    int portCount,
    int timeoutMs,
    int maxInFlightSockets,
    unsigned long long* outOpenPortBitmasks
) {
    if (!ipListNetOrder || ipCount <= 0 || !ports || portCount <= 0 || portCount > 64 || !outOpenPortBitmasks) {
        return 0;
    }
    EnsureWinsock();
    memset(outOpenPortBitmasks, 0, sizeof(unsigned long long) * (size_t)ipCount);

    /* Dynamically load ConnectEx extension function pointer */
    SOCKET probeSock = WSASocketW(AF_INET, SOCK_STREAM, IPPROTO_TCP, NULL, 0, WSA_FLAG_OVERLAPPED);
    if (probeSock == INVALID_SOCKET) return 0;

    LPFN_CONNECTEX pConnectEx = NULL;
    DWORD cbRet = 0;
    GUID connectExGuid = GRID_WSAID_CONNECTEX;
    int ioctlRes = WSAIoctl(
        probeSock,
        SIO_GET_EXTENSION_FUNCTION_POINTER,
        &connectExGuid,
        sizeof(connectExGuid),
        &pConnectEx,
        sizeof(pConnectEx),
        &cbRet,
        NULL,
        NULL
    );
    closesocket(probeSock);
    if (ioctlRes != 0 || !pConnectEx) return 0;

    SYSTEM_INFO sysInfo;
    GetSystemInfo(&sysInfo);
    int workerCount = (int)sysInfo.dwNumberOfProcessors * 2;
    if (workerCount < 2) workerCount = 2;
    if (workerCount > 16) workerCount = 16;

    int effTimeout = timeoutMs > 0 ? timeoutMs : 350;
    int inFlightLimit = maxInFlightSockets > 0 ? maxInFlightSockets : 256;
    if (inFlightLimit > 1024) inFlightLimit = 1024;

    int totalTasks = ipCount * portCount;
    IocpConnCtx* arena = (IocpConnCtx*)calloc((size_t)totalTasks, sizeof(IocpConnCtx));
    if (!arena) return 0;

    HANDLE hIocp = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, (DWORD)workerCount);
    if (!hIocp) {
        free(arena);
        return 0;
    }

    IocpWorkerState workerState;
    workerState.hIocp = hIocp;
    workerState.outMasks = outOpenPortBitmasks;
    workerState.activeInFlight = 0;
    workerState.completedCount = 0;

    HANDLE workers[16] = {0};
    int validWorkers = 0;
    for (int w = 0; w < workerCount; w++) {
        HANDLE h = CreateThread(NULL, 0, IocpPortWorker, &workerState, 0, NULL);
        if (h) workers[validWorkers++] = h;
    }
    if (validWorkers == 0) {
        CloseHandle(hIocp);
        free(arena);
        return 0;
    }

    int submitted = 0;
    int scanCursor = 0;
    ULONGLONG startTick = GetTickCount64();
    ULONGLONG maxSweepTick = startTick + ((ULONGLONG)(totalTasks / inFlightLimit + 3) * (ULONGLONG)(effTimeout + 50)) + 2000ULL;

    while (InterlockedCompareExchange(&workerState.completedCount, 0, 0) < totalTasks) {
        ULONGLONG now = GetTickCount64();
        if (now > maxSweepTick) break;

        /* Submit new async ConnectEx probes up to inFlightLimit */
        while (submitted < totalTasks && InterlockedCompareExchange(&workerState.activeInFlight, 0, 0) < inFlightLimit) {
            int taskIdx = submitted++;
            int hIdx = taskIdx / portCount;
            int pIdx = taskIdx % portCount;
            IocpConnCtx* ctx = &arena[taskIdx];
            ctx->hostIdx = hIdx;
            ctx->portIdx = pIdx;
            ctx->sock = INVALID_SOCKET;

            if (ports[pIdx] == 0) {
                ctx->done = 1;
                InterlockedIncrement(&workerState.completedCount);
                continue;
            }

            SOCKET s = WSASocketW(AF_INET, SOCK_STREAM, IPPROTO_TCP, NULL, 0, WSA_FLAG_OVERLAPPED);
            if (s == INVALID_SOCKET) {
                ctx->done = 1;
                InterlockedIncrement(&workerState.completedCount);
                continue;
            }

            struct sockaddr_in localBind;
            memset(&localBind, 0, sizeof(localBind));
            localBind.sin_family = AF_INET;
            localBind.sin_addr.s_addr = INADDR_ANY;
            localBind.sin_port = 0;

            if (bind(s, (struct sockaddr*)&localBind, sizeof(localBind)) != 0 ||
                CreateIoCompletionPort((HANDLE)s, hIocp, (ULONG_PTR)taskIdx, 0) == NULL) {
                closesocket(s);
                ctx->done = 1;
                InterlockedIncrement(&workerState.completedCount);
                continue;
            }

            ctx->sock = s;
            ctx->deadlineMs = GetTickCount64() + (ULONGLONG)effTimeout;

            struct sockaddr_in remote;
            memset(&remote, 0, sizeof(remote));
            remote.sin_family = AF_INET;
            remote.sin_addr.s_addr = ipListNetOrder[hIdx];
            remote.sin_port = htons(ports[pIdx]);

            InterlockedIncrement(&workerState.activeInFlight);
            BOOL connOk = pConnectEx(s, (struct sockaddr*)&remote, sizeof(remote), NULL, 0, NULL, &ctx->ov);
            if (!connOk && WSAGetLastError() != WSA_IO_PENDING) {
                if (InterlockedCompareExchange(&ctx->done, 1, 0) == 0) {
                    closesocket(s);
                    ctx->sock = INVALID_SOCKET;
                    InterlockedDecrement(&workerState.activeInFlight);
                    InterlockedIncrement(&workerState.completedCount);
                }
            }
        }

        /* Sweep expired in-flight sockets via CancelIoEx so IOCP workers clean them up deterministically */
        now = GetTickCount64();
        while (scanCursor < submitted && arena[scanCursor].done) {
            scanCursor++;
        }
        for (int idx = scanCursor; idx < submitted; idx++) {
            IocpConnCtx* ctx = &arena[idx];
            if (!ctx->done && !ctx->cancelled && ctx->sock != INVALID_SOCKET && now >= ctx->deadlineMs) {
                if (InterlockedCompareExchange(&ctx->cancelled, 1, 0) == 0) {
                    CancelIoEx((HANDLE)ctx->sock, &ctx->ov);
                }
            }
        }

        Sleep(5);
    }

    /* Cancel any remaining in-flight ConnectEx IRPs before shutting down workers & freeing arena */
    for (int i = scanCursor; i < submitted; i++) {
        IocpConnCtx* ctx = &arena[i];
        if (!ctx->done && ctx->sock != INVALID_SOCKET) {
            if (InterlockedCompareExchange(&ctx->cancelled, 1, 0) == 0) {
                CancelIoEx((HANDLE)ctx->sock, &ctx->ov);
            }
        }
    }
    for (int waitLoop = 0; waitLoop < 50 && InterlockedCompareExchange(&workerState.activeInFlight, 0, 0) > 0; waitLoop++) {
        Sleep(5);
    }

    for (int w = 0; w < validWorkers; w++) {
        PostQueuedCompletionStatus(hIocp, 0, IOCP_SHUTDOWN_KEY, NULL);
    }
    WaitForMultipleObjects((DWORD)validWorkers, workers, TRUE, 3000);
    for (int w = 0; w < validWorkers; w++) {
        CloseHandle(workers[w]);
    }

    /* Defensive cleanup of any dangling sockets */
    for (int i = 0; i < totalTasks; i++) {
        if (arena[i].sock != INVALID_SOCKET) {
            closesocket(arena[i].sock);
            arena[i].sock = INVALID_SOCKET;
        }
    }

    CloseHandle(hIocp);
    free(arena);
    return 1;
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
    unsigned long ipNet = inet_addr(targetIp);
    if (ipNet == INADDR_NONE) {
        *outOpenCount = 0;
        return 0;
    }
    EnsureWinsock();
    *outOpenCount = 0;

    if (portCount <= 64) {
        unsigned short uPorts[64];
        for (int i = 0; i < portCount; i++) {
            uPorts[i] = (unsigned short)(portList[i] > 0 && portList[i] <= 65535 ? portList[i] : 0);
        }
        unsigned int ipArr[1] = { (unsigned int)ipNet };
        unsigned long long mask = 0;
        int inFlight = maxConcurrency > 0 ? maxConcurrency : 32;
        if (PortScan_IocpMultiHostSweep(ipArr, 1, uPorts, portCount, timeoutMs, inFlight, &mask)) {
            int cnt = 0;
            for (int i = 0; i < portCount; i++) {
                if (uPorts[i] > 0 && (mask & (1ULL << i))) {
                    outOpenPorts[cnt++] = (int)uPorts[i];
                }
            }
            /* Sort ascending */
            for (int i = 1; i < cnt; i++) {
                int key = outOpenPorts[i];
                int j = i - 1;
                while (j >= 0 && outOpenPorts[j] > key) {
                    outOpenPorts[j + 1] = outOpenPorts[j];
                    j--;
                }
                outOpenPorts[j + 1] = key;
            }
            *outOpenCount = cnt;
            return 1;
        }
    }

    /* Fallback for > 64 ports */
    int cnt = 0;
    for (int i = 0; i < portCount; i++) {
        if (PortScan_ProbeSingle(targetIp, portList[i], timeoutMs)) {
            outOpenPorts[cnt++] = portList[i];
        }
    }
    *outOpenCount = cnt;
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
int PortScan_GetVersion(void) { return 20600; }
int PortScan_ProbeSingle(const char* targetIp, int port, int timeoutMs) { return 0; }
int PortScan_RunBatch(const char* targetIp, const int* portList, int portCount, int timeoutMs, int maxConcurrency, int* outOpenPorts, int* outOpenCount) {
    if (outOpenCount) *outOpenCount = 0;
    return 0;
}
int PortScan_IocpMultiHostSweep(const unsigned int* ipListNetOrder, int ipCount, const unsigned short* ports, int portCount, int timeoutMs, int maxInFlightSockets, unsigned long long* outOpenPortBitmasks) {
    (void)ipListNetOrder; (void)ipCount; (void)ports; (void)portCount; (void)timeoutMs; (void)maxInFlightSockets; (void)outOpenPortBitmasks;
    return 0;
}
#endif
