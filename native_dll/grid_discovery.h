/**
 * Grid IP Scanner2 - Module 3: grid_discovery.h
 * Local Multicast & Broadcast Service Discovery Engine (mDNS, SSDP, LLMNR, NetBIOS)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_DISCOVERY_H
#define GRID_DISCOVERY_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_DISCOVERY
    #define DISCOVERY_API __declspec(dllexport)
  #else
    #define DISCOVERY_API __declspec(dllimport)
  #endif
#else
  #define DISCOVERY_API
#endif

typedef struct {
    char hostname[128];
    char modelName[128];
    char manufacturer[128];
    char workgroup[64];
    char serviceType[64];
    int protocolsDiscovered; // Bitfield: 1=NetBIOS, 2=mDNS, 4=SSDP, 8=LLMNR
} DeviceDiscoveryInfo;

DISCOVERY_API int Discovery_GetVersion(void);

DISCOVERY_API int Discovery_ProbeHost(
    const char* targetIp,
    int timeoutMs,
    DeviceDiscoveryInfo* outInfo
);

DISCOVERY_API int Discovery_QueryNetBIOS(
    const char* targetIp,
    int timeoutMs,
    char* outHost,
    int hostLen,
    char* outWorkgroup,
    int wgLen
);

DISCOVERY_API int Discovery_QueryMDNS(
    const char* targetIp,
    int timeoutMs,
    char* outName,
    int maxLen
);

DISCOVERY_API int Discovery_QuerySSDP(
    const char* targetIp,
    int timeoutMs,
    char* outDevice,
    int maxLen
);

#ifdef __cplusplus
}
#endif

#endif // GRID_DISCOVERY_H
