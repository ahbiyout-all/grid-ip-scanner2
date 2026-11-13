/**
 * Grid IP Scanner2 - Module 1: grid_probe_engine.h
 * Sub-millisecond Asynchronous ICMP & L2 ARP Kernel Probing Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_PROBE_ENGINE_H
#define GRID_PROBE_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_PROBE_ENGINE
    #define PROBE_API __declspec(dllexport)
  #else
    #define PROBE_API __declspec(dllimport)
  #endif
#else
  #define PROBE_API
#endif

typedef struct {
    char ip[32];
    char mac[24];
    double rttMs;
    int isAlive;
    int isArpAlive;
} ProbeHostResult;

typedef void (*ProbeHostCallback)(const char* ip, const char* mac, double rttMs, int isAlive, int isArpAlive);

PROBE_API int Probe_GetDriverVersion(void);

PROBE_API int Probe_FastPing(const char* ip, int timeoutMs, double* outRttMs);

PROBE_API int Probe_ResolveMac(const char* ip, char* outMacBuffer, int bufferLen);

PROBE_API int Probe_SweepSubnetAsync(
    const char* startIp,
    int count,
    int timeoutMs,
    ProbeHostCallback callback
);

PROBE_API int Probe_BatchSweep(
    const char* startIp,
    int count,
    int timeoutMs,
    ProbeHostResult* outResults,
    int maxResults
);

PROBE_API int Probe_SweepCidrAsyncBatch(
    const unsigned int* ipListNetOrder,
    int hostCount,
    int timeoutMs,
    ProbeHostResult* outResults,
    int maxResults
);

#ifdef __cplusplus
}
#endif

#endif // GRID_PROBE_ENGINE_H
