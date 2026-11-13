/**
 * Grid IP Scanner2 - Module 8: grid_topology_guard.h
 * Pure Custom Native Subnet Topology Diff, IP/MAC Conflict & LAA Random MAC Guard DLL
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 *
 * Pure C / C-ABI Engine Features:
 *   1. IEEE 802.3 LAA (Locally Administered Address) bitmask & Virtual NIC isolation
 *   2. O(N) FNV-1a Open-Addressing Subnet Conflict & Proxy-ARP Detector
 *   3. Latency-Decoupled Baseline vs Current Snapshot Delta Analyzer (NEW/OFF/CHG/SAME)
 *   4. Soft-Trust Fingerprint Similarity Scorer for DHCP IP Shift & Random MAC Migration
 */

#ifndef GRID_TOPOLOGY_GUARD_H
#define GRID_TOPOLOGY_GUARD_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32) && defined(BUILDING_GRID_TOPOLOGY_GUARD)
    #define GRID_GUARD_API __declspec(dllexport)
#elif defined(_WIN32)
    #define GRID_GUARD_API __declspec(dllimport)
#else
    #define GRID_GUARD_API __attribute__((visibility("default")))
#endif

#define GUARD_DRIVER_VERSION 20601 /* v2.6.1 */
#define GUARD_MAX_SUBNET_HOSTS 512
#define GUARD_MAX_PORTS_PER_HOST 32

/* MAC Classification Flags (Bitmask) */
#define GUARD_MAC_FLAG_VALID       (1 << 0)
#define GUARD_MAC_FLAG_MULTICAST   (1 << 1)
#define GUARD_MAC_FLAG_LAA_RANDOM  (1 << 2)
#define GUARD_MAC_FLAG_LAA_VM      (1 << 3)
#define GUARD_MAC_FLAG_BROADCAST   (1 << 4)
#define GUARD_MAC_FLAG_ZERO        (1 << 5)

/* Host Delta Status Codes */
typedef enum {
    GUARD_DELTA_EMPTY    = 0,
    GUARD_DELTA_SAME     = 1,
    GUARD_DELTA_NEW      = 2,
    GUARD_DELTA_OFFLINE  = 3,
    GUARD_DELTA_CHANGED  = 4
} GuardDeltaStatus;

/* Anomaly / Security Event Bitmask */
#define GUARD_ANOMALY_NONE             0
#define GUARD_ANOMALY_IP_TAKEOVER      (1 << 0) /* Same IP occupied by different MAC */
#define GUARD_ANOMALY_MULTI_IP_MAC     (1 << 1) /* Same MAC claiming multiple IPs (Rogue Clone / Static Conflict) */
#define GUARD_ANOMALY_RISKY_PORT_OPEN  (1 << 2) /* Newly exposed dangerous port (21,23,445,3389,5900,6379) */
#define GUARD_ANOMALY_LAA_CHURN        (1 << 3) /* Randomized MAC arrival correlating with trusted host */
#define GUARD_ANOMALY_HARD_INTRUDER    (1 << 4) /* Unrecognized node without soft-trust correlation */
#define GUARD_ANOMALY_INFRA_PROXY_ARP  (1 << 5) /* Benign Gateway / L3 Infra Proxy-ARP multi-IP MAC (Info) */

typedef struct {
    char cleanMac[16];     /* 12 uppercase hex chars + NUL */
    char ouiPrefix[8];     /* Top 6 hex chars + NUL */
    uint32_t macFlags;     /* Bitmask of GUARD_MAC_FLAG_* */
    char vmVendor[32];     /* Known Virtual NIC vendor if GUARD_MAC_FLAG_LAA_VM */
} GuardMacProfile;

typedef struct {
    char ip[32];
    char mac[24];
    char hostname[64];
    char vendor[64];
    int openPorts[GUARD_MAX_PORTS_PER_HOST];
    int openPortCount;
    int isTrusted;
    int64_t lastSeenEpoch;
} GuardHostRecord;

typedef struct {
    char ip[32];
    int deltaStatus;        /* GuardDeltaStatus */
    uint32_t anomalyMask;   /* Bitmask of GUARD_ANOMALY_* */
    int similarityScore;    /* 0..100 for LAA/DHCP migration */
    int isSoftTrusted;      /* 1 if random MAC or DHCP shift matched trusted profile */
    char matchedPrevIp[32];
    char reason[192];
} GuardHostVerdict;

typedef struct {
    int totalEvaluated;
    int newCount;
    int offlineCount;
    int changedCount;
    int sameCount;
    int conflictCount;
    int multiIpMacCount;
    int proxyArpInfoCount;
    int laaRandomCount;
    int virtualNicCount;
    int hardIntruderCount;
    int softTrustedCount;
    int highRiskDeltaCount;
    uint64_t elapsedMicroseconds;
} GuardTopologySummary;

/**
 * Returns integer driver version (e.g. 20601 = v2.6.1).
 */
GRID_GUARD_API int Guard_GetDriverVersion(void);

/**
 * Inspects a MAC address at the bit level for IEEE 802.3 LAA bit, Multicast bit,
 * broadcast/zero anomalies, and known Virtual NIC LAA prefixes (QEMU, Docker, VirtualBox).
 *
 * @return 1 if MAC is structurally valid unicast, 0 otherwise
 */
GRID_GUARD_API int Guard_AnalyzeMacProfile(
    const char* rawMac,
    GuardMacProfile* outProfile
);

/**
 * Computes weighted identity similarity (0..100) between a current host and a historical
 * baseline host (handles Randomized MAC rotation and DHCP IP shifts).
 */
GRID_GUARD_API int Guard_ComputeSimilarity(
    const GuardHostRecord* currentHost,
    const GuardHostRecord* refHost,
    char* outReason,
    int maxReasonLen
);

/**
 * Executes a full O(N) C-native subnet topology comparison, IP/MAC conflict hash scan,
 * Proxy-ARP duplicate MAC sweep, and Soft-Trust / Hard-Intruder classification.
 *
 * @return Number of evaluated hosts on success, or negative error code
 */
GRID_GUARD_API int Guard_AnalyzeSubnetTopology(
    const GuardHostRecord* currentHosts,
    int currentCount,
    const GuardHostRecord* baselineHosts,
    int baselineCount,
    GuardHostVerdict* outVerdicts,
    int maxVerdicts,
    GuardTopologySummary* outSummary
);

/**
 * Extended version of Guard_AnalyzeSubnetTopology accepting an explicit gateway IPv4 string
 * to accurately classify gateway Proxy-ARP multi-IP MAC clusters as informational.
 */
GRID_GUARD_API int Guard_AnalyzeSubnetTopologyEx(
    const GuardHostRecord* currentHosts,
    int currentCount,
    const GuardHostRecord* baselineHosts,
    int baselineCount,
    const char* gatewayIp,
    GuardHostVerdict* outVerdicts,
    int maxVerdicts,
    GuardTopologySummary* outSummary
);

/**
 * JSON C-ABI bridge for direct Go/Electron integration (Caller-Allocates Buffer).
 * Input JSON format:
 *   {"gatewayIp":"...",
 *    "current":[{"ip":"...","mac":"...","hostname":"...","vendor":"...","openPorts":[...],"isTrusted":false}],
 *    "baseline":[...]}
 * Output JSON contains summary metrics, detected conflicts, Proxy-ARP info, LAA stats, and alerts.
 *
 * @return 1 on success, 0 on error
 */
GRID_GUARD_API int Guard_AnalyzeTopologyJson(
    const char* inJson,
    char* outJson,
    int maxOutLen
);

#ifdef __cplusplus
}
#endif

#endif /* GRID_TOPOLOGY_GUARD_H */
