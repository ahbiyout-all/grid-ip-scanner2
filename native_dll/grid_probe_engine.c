/**
 * Grid IP Scanner2 - Module 1: grid_probe_engine.c
 * Sub-millisecond Asynchronous ICMP & L2 ARP Kernel Probing Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PROBE_ENGINE
#define BUILDING_GRID_PROBE_ENGINE
#endif
#if defined(_WIN32) && (!defined(_WIN32_WINNT) || _WIN32_WINNT < 0x0601)
#undef _WIN32_WINNT
#define _WIN32_WINNT 0x0601
#endif
#include "grid_probe_engine.h"

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

static LARGE_INTEGER qpcFreq;
static LONG volatile qpcState = 0; /* 0=uninit, 1=init-in-progress, 2=ready */

static void EnsureQpcInit(void) {
    if (InterlockedCompareExchange(&qpcState, 0, 0) == 2) return;
    if (InterlockedCompareExchange(&qpcState, 1, 0) == 0) {
        QueryPerformanceFrequency(&qpcFreq);
        InterlockedExchange(&qpcState, 2);
    } else {
        while (InterlockedCompareExchange(&qpcState, 0, 0) != 2) {
            Sleep(0);
        }
    }
}

int Probe_GetDriverVersion(void) {
    return 20600; // v2.6.0
}

int Probe_FastPing(const char* ip, int timeoutMs, double* outRttMs) {
    if (!ip || !outRttMs) return -1;
    *outRttMs = -1.0;

    EnsureQpcInit();

    unsigned long ipAddr = inet_addr(ip);
    if (ipAddr == INADDR_NONE) return -1;

    HANDLE hIcmp = IcmpCreateFile();
    if (hIcmp == INVALID_HANDLE_VALUE) return -1;

    char sendData[32] = "GridIPScannerProbeEngineV2";
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 64;
    void* replyBuffer = malloc(replySize);
    if (!replyBuffer) {
        IcmpCloseHandle(hIcmp);
        return -1;
    }

    LARGE_INTEGER tStart, tEnd;
    QueryPerformanceCounter(&tStart);

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

    QueryPerformanceCounter(&tEnd);
    IcmpCloseHandle(hIcmp);

    if (replies > 0) {
        PICMP_ECHO_REPLY pEcho = (PICMP_ECHO_REPLY)replyBuffer;
        if (pEcho->Status == IP_SUCCESS && pEcho->DataSize <= sizeof(sendData) + 32) {
            double elapsed = ((double)(tEnd.QuadPart - tStart.QuadPart) * 1000.0) / (double)qpcFreq.QuadPart;
            if (elapsed < 0.1) elapsed = 0.1;
            *outRttMs = elapsed;
            free(replyBuffer);
            return 0; // Success
        }
    }

    free(replyBuffer);
    return -1; // Failed or timeout
}

int Probe_ResolveMac(const char* ip, char* outMacBuffer, int bufferLen) {
    if (!ip || !outMacBuffer || bufferLen < 18) return 0;
    outMacBuffer[0] = '\0';

    unsigned long destIp = inet_addr(ip);
    if (destIp == INADDR_NONE) return 0;

    BYTE macAddr[8] = {0};
    ULONG macLen = 6;

    DWORD ret = SendARP(destIp, 0, (PULONG)macAddr, &macLen);
    if (ret == NO_ERROR && macLen == 6) {
        snprintf(outMacBuffer, bufferLen, "%02X:%02X:%02X:%02X:%02X:%02X",
                 macAddr[0], macAddr[1], macAddr[2],
                 macAddr[3], macAddr[4], macAddr[5]);
        return 1;
    }
    return 0;
}

typedef struct {
    unsigned long ipLong;
    char ipStr[32];
    int timeoutMs;
    ProbeHostCallback callback;
    ProbeHostResult* resultTarget;
} WorkerTask;

static DWORD WINAPI ProbeWorkerThread(LPVOID param) {
    WorkerTask* task = (WorkerTask*)param;
    if (!task) return 0;

    char mac[24] = {0};
    int arpSuccess = Probe_ResolveMac(task->ipStr, mac, sizeof(mac));
    double rtt = -1.0;
    int pingSuccess = (Probe_FastPing(task->ipStr, task->timeoutMs, &rtt) == 0);

    int isAlive = (pingSuccess || arpSuccess) ? 1 : 0;

    if (task->resultTarget) {
        snprintf(task->resultTarget->ip, sizeof(task->resultTarget->ip), "%s", task->ipStr);
        snprintf(task->resultTarget->mac, sizeof(task->resultTarget->mac), "%s", mac);
        task->resultTarget->rttMs = (pingSuccess ? rtt : (arpSuccess ? 0.5 : -1.0));
        task->resultTarget->isAlive = isAlive;
        task->resultTarget->isArpAlive = arpSuccess;
    }

    if (task->callback && isAlive) {
        task->callback(task->ipStr, mac, (pingSuccess ? rtt : 0.5), isAlive, arpSuccess);
    }

    free(task);
    return 0;
}

int Probe_SweepSubnetAsync(
    const char* startIp,
    int count,
    int timeoutMs,
    ProbeHostCallback callback
) {
    if (!startIp || count <= 0 || count > 1024) return 0;

    unsigned long parsedAddr = inet_addr(startIp);
    if (parsedAddr == INADDR_NONE) return 0;
    unsigned long baseIp = ntohl(parsedAddr);

    HANDLE threads[128];
    int activeThreads = 0;

    for (int i = 0; i < count; i++) {
        unsigned long curIp = baseIp + (unsigned long)i;

        WorkerTask* task = (WorkerTask*)calloc(1, sizeof(WorkerTask));
        if (!task) continue;

        task->ipLong = curIp;
        snprintf(task->ipStr, sizeof(task->ipStr), "%lu.%lu.%lu.%lu",
                 (curIp >> 24) & 0xFF, (curIp >> 16) & 0xFF,
                 (curIp >> 8) & 0xFF, curIp & 0xFF);
        task->timeoutMs = timeoutMs;
        task->callback = callback;
        task->resultTarget = NULL;

        HANDLE hThread = CreateThread(NULL, 0, ProbeWorkerThread, task, 0, NULL);
        if (hThread) {
            threads[activeThreads++] = hThread;
            if (activeThreads >= 64) {
                WaitForMultipleObjects((DWORD)activeThreads, threads, TRUE, INFINITE);
                for (int t = 0; t < activeThreads; t++) CloseHandle(threads[t]);
                activeThreads = 0;
            }
        } else {
            free(task);
        }
    }

    if (activeThreads > 0) {
        WaitForMultipleObjects((DWORD)activeThreads, threads, TRUE, INFINITE);
        for (int t = 0; t < activeThreads; t++) CloseHandle(threads[t]);
    }

    return 1;
}

int Probe_BatchSweep(
    const char* startIp,
    int count,
    int timeoutMs,
    ProbeHostResult* outResults,
    int maxResults
) {
    if (!startIp || count <= 0 || !outResults || maxResults < count) return 0;

    unsigned long parsedAddr = inet_addr(startIp);
    if (parsedAddr == INADDR_NONE) return 0;
    unsigned long baseIp = ntohl(parsedAddr);

    unsigned int ipList[1024];
    int n = count > 1024 ? 1024 : count;
    for (int i = 0; i < n; i++) {
        ipList[i] = htonl(baseIp + (unsigned long)i);
    }
    return Probe_SweepCidrAsyncBatch(ipList, n, timeoutMs, outResults, maxResults);
}

/* ============================================================================
 * Vectorized Shared-Handle IcmpSendEcho2 + Parallel SendARP Batch Engine
 * Eliminates per-IP handle churn and thread storms by reusing 1 ICMP handle.
 * ============================================================================ */
typedef struct {
    const unsigned int* ipListNetOrder;
    int hostCount;
    ProbeHostResult* outResults;
    LONG nextArpIdx;
} ArpBatchCtx;

static DWORD WINAPI ArpBatchWorker(LPVOID param) {
    ArpBatchCtx* ctx = (ArpBatchCtx*)param;
    for (;;) {
        LONG idx = InterlockedIncrement(&ctx->nextArpIdx) - 1;
        if (idx >= ctx->hostCount) break;
        BYTE macAddr[8] = {0};
        ULONG macLen = 6;
        if (SendARP((IPAddr)ctx->ipListNetOrder[idx], 0, (PULONG)macAddr, &macLen) == NO_ERROR && macLen == 6) {
            snprintf(ctx->outResults[idx].mac, sizeof(ctx->outResults[idx].mac),
                     "%02X:%02X:%02X:%02X:%02X:%02X",
                     macAddr[0], macAddr[1], macAddr[2],
                     macAddr[3], macAddr[4], macAddr[5]);
            ctx->outResults[idx].isArpAlive = 1;
        }
    }
    return 0;
}

int Probe_SweepCidrAsyncBatch(
    const unsigned int* ipListNetOrder,
    int hostCount,
    int timeoutMs,
    ProbeHostResult* outResults,
    int maxResults
) {
    if (!ipListNetOrder || hostCount <= 0 || !outResults || maxResults < hostCount) return 0;
    if (hostCount > 4096) hostCount = 4096;

    EnsureQpcInit();
    memset(outResults, 0, sizeof(ProbeHostResult) * (size_t)hostCount);

    for (int i = 0; i < hostCount; i++) {
        unsigned long hostOrd = ntohl(ipListNetOrder[i]);
        snprintf(outResults[i].ip, sizeof(outResults[i].ip), "%lu.%lu.%lu.%lu",
                 (hostOrd >> 24) & 0xFF, (hostOrd >> 16) & 0xFF,
                 (hostOrd >> 8) & 0xFF, hostOrd & 0xFF);
        outResults[i].rttMs = -1.0;
    }

    HANDLE hIcmp = IcmpCreateFile();
    if (hIcmp == INVALID_HANDLE_VALUE) return 0;

    char sendData[24] = "GridScannerAsyncV2";
    DWORD replyStride = (DWORD)(sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 64);
    DWORD effTimeout = timeoutMs > 0 ? (DWORD)timeoutMs : 400;

    /* Run batched L2 SendARP concurrently on a small 8-thread pool alongside async ICMP */
    ArpBatchCtx arpCtx;
    arpCtx.ipListNetOrder = ipListNetOrder;
    arpCtx.hostCount = hostCount;
    arpCtx.outResults = outResults;
    arpCtx.nextArpIdx = 0;

    HANDLE arpThreads[8] = {0};
    int arpWorkerCount = hostCount < 8 ? hostCount : 8;
    for (int w = 0; w < arpWorkerCount; w++) {
        arpThreads[w] = CreateThread(NULL, 0, ArpBatchWorker, &arpCtx, 0, NULL);
    }

    /* Process IcmpSendEcho2 in 64-event windows (MAXIMUM_WAIT_OBJECTS) on 1 slab buffer */
    #define ICMP_WIN_SIZE 64
    HANDLE events[ICMP_WIN_SIZE];
    for (int k = 0; k < ICMP_WIN_SIZE; k++) {
        events[k] = CreateEventA(NULL, TRUE, FALSE, NULL);
    }
    unsigned char* slab = (unsigned char*)calloc((size_t)ICMP_WIN_SIZE, (size_t)replyStride);

    if (slab) {
        int offset = 0;
        while (offset < hostCount) {
            int batch = hostCount - offset;
            if (batch > ICMP_WIN_SIZE) batch = ICMP_WIN_SIZE;

            HANDLE waitHandles[ICMP_WIN_SIZE];
            int waitMap[ICMP_WIN_SIZE];
            int waitCount = 0;
            LARGE_INTEGER tStarts[ICMP_WIN_SIZE];

            for (int k = 0; k < batch; k++) {
                int idx = offset + k;
                ResetEvent(events[k]);
                unsigned char* rBuf = slab + ((size_t)k * replyStride);
                memset(rBuf, 0, replyStride);
                QueryPerformanceCounter(&tStarts[k]);

                DWORD syncRet = IcmpSendEcho2(
                    hIcmp,
                    events[k],
                    NULL,
                    NULL,
                    (IPAddr)ipListNetOrder[idx],
                    sendData,
                    (WORD)sizeof(sendData),
                    NULL,
                    rBuf,
                    replyStride,
                    effTimeout
                );

                if (syncRet > 0) {
                    PICMP_ECHO_REPLY pEcho = (PICMP_ECHO_REPLY)rBuf;
                    if (pEcho->Status == IP_SUCCESS) {
                        outResults[idx].isAlive = 1;
                        outResults[idx].rttMs = pEcho->RoundTripTime > 0 ? (double)pEcho->RoundTripTime : 0.4;
                    }
                } else if (GetLastError() == ERROR_IO_PENDING) {
                    waitHandles[waitCount] = events[k];
                    waitMap[waitCount] = k;
                    waitCount++;
                }
            }

            if (waitCount > 0) {
                DWORD waitRes = WaitForMultipleObjects((DWORD)waitCount, waitHandles, TRUE, effTimeout + 100);
                LARGE_INTEGER tNow;
                QueryPerformanceCounter(&tNow);
                for (int w = 0; w < waitCount; w++) {
                    int k = waitMap[w];
                    if (waitRes == WAIT_TIMEOUT && WaitForSingleObject(events[k], 0) != WAIT_OBJECT_0) {
                        continue;
                    }
                    int idx = offset + k;
                    unsigned char* rBuf = slab + ((size_t)k * replyStride);
                    DWORD parsed = IcmpParseReplies(rBuf, replyStride);
                    if (parsed > 0) {
                        PICMP_ECHO_REPLY pEcho = (PICMP_ECHO_REPLY)rBuf;
                        if (pEcho->Status == IP_SUCCESS) {
                            double qpcMs = ((double)(tNow.QuadPart - tStarts[k].QuadPart) * 1000.0) / (double)qpcFreq.QuadPart;
                            double reported = (double)pEcho->RoundTripTime;
                            double bestRtt = reported > 0.0 ? reported : (qpcMs > 0.1 ? qpcMs : 0.2);
                            outResults[idx].isAlive = 1;
                            outResults[idx].rttMs = bestRtt;
                        }
                    }
                }
                if (waitRes == WAIT_TIMEOUT) {
                    /* Cancel any still-pending async ICMP IRPs referencing slab/events before next batch reuse */
                    IcmpCloseHandle(hIcmp);
                    hIcmp = IcmpCreateFile();
                    if (hIcmp == INVALID_HANDLE_VALUE) {
                        break;
                    }
                }
            }
            offset += batch;
        }
        free(slab);
    }

    for (int k = 0; k < ICMP_WIN_SIZE; k++) {
        if (events[k]) CloseHandle(events[k]);
    }
    if (hIcmp != INVALID_HANDLE_VALUE) {
        IcmpCloseHandle(hIcmp);
    }

    for (int w = 0; w < arpWorkerCount; w++) {
        if (arpThreads[w]) {
            WaitForSingleObject(arpThreads[w], INFINITE);
            CloseHandle(arpThreads[w]);
        }
    }

    /* Single-threaded reconciliation of ARP results with ICMP RTT measurements */
    for (int i = 0; i < hostCount; i++) {
        if (outResults[i].isArpAlive && !outResults[i].isAlive) {
            outResults[i].isAlive = 1;
            if (outResults[i].rttMs < 0.0) {
                outResults[i].rttMs = 0.5;
            }
        }
    }

    return hostCount;
}

#else
// Non-Windows stub for cross-platform compilation
int Probe_GetDriverVersion(void) { return 20600; }
int Probe_FastPing(const char* ip, int timeoutMs, double* outRttMs) { if (outRttMs) *outRttMs = -1.0; return -1; }
int Probe_ResolveMac(const char* ip, char* outMacBuffer, int bufferLen) { return 0; }
int Probe_SweepSubnetAsync(const char* startIp, int count, int timeoutMs, ProbeHostCallback callback) { return 0; }
int Probe_BatchSweep(const char* startIp, int count, int timeoutMs, ProbeHostResult* outResults, int maxResults) { return 0; }
int Probe_SweepCidrAsyncBatch(const unsigned int* ipListNetOrder, int hostCount, int timeoutMs, ProbeHostResult* outResults, int maxResults) {
    (void)ipListNetOrder; (void)hostCount; (void)timeoutMs; (void)outResults; (void)maxResults;
    return 0;
}
#endif
