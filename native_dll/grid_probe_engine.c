/**
 * Grid IP Scanner2 - Module 1: grid_probe_engine.c
 * Sub-millisecond Asynchronous ICMP & L2 ARP Kernel Probing Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_PROBE_ENGINE
#define BUILDING_GRID_PROBE_ENGINE
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
    return 20501; // v2.5.1
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
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 16;
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
        if (pEcho->Status == IP_SUCCESS) {
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

    HANDLE threads[64];
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
        task->callback = NULL;
        task->resultTarget = &outResults[i];

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

    return count;
}

#else
// Non-Windows stub for cross-platform compilation
int Probe_GetDriverVersion(void) { return 20500; }
int Probe_FastPing(const char* ip, int timeoutMs, double* outRttMs) { if (outRttMs) *outRttMs = -1.0; return -1; }
int Probe_ResolveMac(const char* ip, char* outMacBuffer, int bufferLen) { return 0; }
int Probe_SweepSubnetAsync(const char* startIp, int count, int timeoutMs, ProbeHostCallback callback) { return 0; }
int Probe_BatchSweep(const char* startIp, int count, int timeoutMs, ProbeHostResult* outResults, int maxResults) { return 0; }
#endif
