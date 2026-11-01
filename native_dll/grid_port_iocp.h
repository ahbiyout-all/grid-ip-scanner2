/**
 * Grid IP Scanner2 - Module 2: grid_port_iocp.h
 * Windows I/O Completion Port High-Concurrency Port Scanning Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_PORT_IOCP_H
#define GRID_PORT_IOCP_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_PORT_IOCP
    #define PORT_IOCP_API __declspec(dllexport)
  #else
    #define PORT_IOCP_API __declspec(dllimport)
  #endif
#else
  #define PORT_IOCP_API
#endif

PORT_IOCP_API int PortScan_GetVersion(void);

PORT_IOCP_API int PortScan_RunBatch(
    const char* targetIp,
    const int* portList,
    int portCount,
    int timeoutMs,
    int maxConcurrency,
    int* outOpenPorts,
    int* outOpenCount
);

PORT_IOCP_API int PortScan_ProbeSingle(
    const char* targetIp,
    int port,
    int timeoutMs
);

#ifdef __cplusplus
}
#endif

#endif // GRID_PORT_IOCP_H
