/**
 * Grid IP Scanner2 - Module 6: grid_pcap_analyzer.h
 * Npcap/WinPcap Kernel Packet Capture, OS Fingerprinting & ARP Anomaly Detector
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_PCAP_ANALYZER_H
#define GRID_PCAP_ANALYZER_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_PCAP_ANALYZER
    #define PCAP_API __declspec(dllexport)
  #else
    #define PCAP_API __declspec(dllimport)
  #endif
#else
  #define PCAP_API
#endif

PCAP_API int Pcap_GetVersion(void);

PCAP_API int Pcap_IsNpcapAvailable(void);

PCAP_API int Pcap_DetectOSFromSynAck(
    const char* targetIp,
    int port,
    int timeoutMs,
    char* outOsName,
    int maxLen,
    int* outTtl
);

PCAP_API int Pcap_DetectArpSpoofing(
    const char* targetIp,
    const char* expectedMac,
    char* outAlertMessage,
    int maxLen
);

#ifdef __cplusplus
}
#endif

#endif // GRID_PCAP_ANALYZER_H
