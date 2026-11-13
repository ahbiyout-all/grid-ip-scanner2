/**
 * Grid IP Scanner2 - Module 8: grid_topology_guard.c
 * Pure Custom Native Subnet Topology Diff, IP/MAC Conflict & LAA Random MAC Guard DLL
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_TOPOLOGY_GUARD
#define BUILDING_GRID_TOPOLOGY_GUARD
#endif
#include "grid_topology_guard.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <time.h>
#endif

/* ============================================================================
 * Internal Timing & String Utilities
 * ============================================================================ */
static uint64_t get_microseconds(void) {
#ifdef _WIN32
    LARGE_INTEGER freq, now;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&now);
    if (freq.QuadPart == 0) return 0;
    return (uint64_t)((now.QuadPart * 1000000ULL) / freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000ULL + (uint64_t)(ts.tv_nsec / 1000ULL);
#endif
}

static void safe_copy(char* dst, const char* src, size_t cap) {
    if (!dst || cap == 0) return;
    if (!src) {
        dst[0] = '\0';
        return;
    }
    snprintf(dst, cap, "%s", src);
}

static int ci_equals(const char* a, const char* b) {
    if (!a || !b) return 0;
    while (*a && *b) {
        if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) return 0;
        a++;
        b++;
    }
    return (*a == '\0' && *b == '\0');
}

static void normalize_hostname(const char* in, char* out, size_t cap) {
    if (!out || cap == 0) return;
    out[0] = '\0';
    if (!in) return;

    while (*in && isspace((unsigned char)*in)) in++;
    size_t len = 0;
    while (in[len] && len < cap - 1) {
        out[len] = (char)tolower((unsigned char)in[len]);
        len++;
    }
    while (len > 0 && isspace((unsigned char)out[len - 1])) len--;
    out[len] = '\0';

    /* Strip trailing ".local" suffix for cross-protocol identity normalization */
    if (len > 6 && strcmp(out + len - 6, ".local") == 0) {
        out[len - 6] = '\0';
    }
    if (strcmp(out, "unknown") == 0 || strcmp(out, "unknown device") == 0 || strcmp(out, "-") == 0) {
        out[0] = '\0';
    }
}

static int is_high_risk_port(int port) {
    switch (port) {
        case 21: case 22: case 23: case 80: case 445:
        case 1433: case 3306: case 3389: case 5900: case 6379: case 8080:
            return 1;
        default:
            return 0;
    }
}

static uint32_t fnv1a_hash(const char* s) {
    uint32_t h = 2166136261u;
    if (!s) return h;
    while (*s) {
        h ^= (unsigned char)*s++;
        h *= 16777619u;
    }
    return h;
}

static void json_escape(const char* in, char* out, size_t cap) {
    if (!out || cap == 0) return;
    size_t j = 0;
    if (!in) {
        out[0] = '\0';
        return;
    }
    for (size_t i = 0; in[i] != '\0' && j + 2 < cap; i++) {
        unsigned char c = (unsigned char)in[i];
        if (c == '"' || c == '\\') {
            if (j + 3 >= cap) break;
            out[j++] = '\\';
            out[j++] = (char)c;
        } else if (c == '\n') {
            if (j + 3 >= cap) break;
            out[j++] = '\\';
            out[j++] = 'n';
        } else if (c == '\r') {
            if (j + 3 >= cap) break;
            out[j++] = '\\';
            out[j++] = 'r';
        } else if (c == '\t') {
            if (j + 3 >= cap) break;
            out[j++] = '\\';
            out[j++] = 't';
        } else if (c >= 0x20) {
            out[j++] = (char)c;
        }
    }
    out[j] = '\0';
}

/* ============================================================================
 * Public API 1: Driver Version
 * ============================================================================ */
int Guard_GetDriverVersion(void) {
    return GUARD_DRIVER_VERSION;
}

/* ============================================================================
 * Public API 2: Bit-Level MAC & LAA Analyzer
 * ============================================================================ */
int Guard_AnalyzeMacProfile(const char* rawMac, GuardMacProfile* outProfile) {
    if (!outProfile) return 0;
    memset(outProfile, 0, sizeof(GuardMacProfile));
    if (!rawMac) return 0;

    char hex[16] = {0};
    int hLen = 0;
    for (int i = 0; rawMac[i] != '\0' && hLen < 12; i++) {
        char c = rawMac[i];
        if (isxdigit((unsigned char)c)) {
            hex[hLen++] = (char)toupper((unsigned char)c);
        }
    }

    if (hLen != 12) return 0;
    memcpy(outProfile->cleanMac, hex, 13);
    memcpy(outProfile->ouiPrefix, hex, 6);
    outProfile->ouiPrefix[6] = '\0';

    if (strcmp(hex, "000000000000") == 0) {
        outProfile->macFlags |= GUARD_MAC_FLAG_ZERO;
        return 0;
    }
    if (strcmp(hex, "FFFFFFFFFFFF") == 0) {
        outProfile->macFlags |= GUARD_MAC_FLAG_BROADCAST;
        return 0;
    }

    unsigned int firstByte = 0;
    sscanf(hex, "%2x", &firstByte);

    if ((firstByte & 0x01u) != 0) {
        outProfile->macFlags |= GUARD_MAC_FLAG_MULTICAST;
        return 0;
    }

    outProfile->macFlags |= GUARD_MAC_FLAG_VALID;

    /* Check IEEE 802.3 LAA Bit (bit 1 of MSB octet) */
    if ((firstByte & 0x02u) != 0) {
        if (strncmp(hex, "525400", 6) == 0) {
            outProfile->macFlags |= GUARD_MAC_FLAG_LAA_VM;
            safe_copy(outProfile->vmVendor, "QEMU / KVM Virtual NIC", sizeof(outProfile->vmVendor));
        } else if (strncmp(hex, "0242", 4) == 0) {
            outProfile->macFlags |= GUARD_MAC_FLAG_LAA_VM;
            safe_copy(outProfile->vmVendor, "Docker Container Bridge", sizeof(outProfile->vmVendor));
        } else if (strncmp(hex, "0A0027", 6) == 0) {
            outProfile->macFlags |= GUARD_MAC_FLAG_LAA_VM;
            safe_copy(outProfile->vmVendor, "Oracle VirtualBox NIC", sizeof(outProfile->vmVendor));
        } else if (strncmp(hex, "00155D", 6) == 0) {
            outProfile->macFlags |= GUARD_MAC_FLAG_LAA_VM;
            safe_copy(outProfile->vmVendor, "Microsoft Hyper-V NIC", sizeof(outProfile->vmVendor));
        } else {
            outProfile->macFlags |= GUARD_MAC_FLAG_LAA_RANDOM;
        }
    }

    return 1;
}

/* ============================================================================
 * Public API 3: Multi-Signal Identity Similarity Scorer (0..100)
 * ============================================================================ */
int Guard_ComputeSimilarity(
    const GuardHostRecord* currentHost,
    const GuardHostRecord* refHost,
    char* outReason,
    int maxReasonLen
) {
    if (!currentHost || !refHost) {
        if (outReason && maxReasonLen > 0) outReason[0] = '\0';
        return 0;
    }

    GuardMacProfile curMac, refMac;
    int curValid = Guard_AnalyzeMacProfile(currentHost->mac, &curMac);
    int refValid = Guard_AnalyzeMacProfile(refHost->mac, &refMac);

    if (curValid && refValid && strcmp(curMac.cleanMac, refMac.cleanMac) == 0) {
        if (outReason && maxReasonLen > 0) {
            safe_copy(outReason, "MAC 주소 완전 일치 (100%)", (size_t)maxReasonLen);
        }
        return 100;
    }

    int score = 0;
    char reasons[160] = {0};

    char curNormHost[64], refNormHost[64];
    normalize_hostname(currentHost->hostname, curNormHost, sizeof(curNormHost));
    normalize_hostname(refHost->hostname, refNormHost, sizeof(refNormHost));

    if (curNormHost[0] != '\0' && refNormHost[0] != '\0' && strcmp(curNormHost, refNormHost) == 0) {
        score += 50;
        strncat(reasons, "호스트명 일치", sizeof(reasons) - strlen(reasons) - 1);
    }

    if (currentHost->vendor[0] != '\0' && refHost->vendor[0] != '\0' &&
        !ci_equals(currentHost->vendor, "Unknown Vendor") &&
        !ci_equals(currentHost->vendor, "Randomized MAC (LAA)") &&
        ci_equals(currentHost->vendor, refHost->vendor)) {
        score += 35;
        if (reasons[0]) strncat(reasons, " + ", sizeof(reasons) - strlen(reasons) - 1);
        strncat(reasons, "제조사 동일", sizeof(reasons) - strlen(reasons) - 1);
    } else if (curValid && refValid && strcmp(curMac.ouiPrefix, refMac.ouiPrefix) == 0) {
        score += 30;
        if (reasons[0]) strncat(reasons, " + ", sizeof(reasons) - strlen(reasons) - 1);
        strncat(reasons, "OUI 옥텟 일치", sizeof(reasons) - strlen(reasons) - 1);
    }

    /* Port fingerprint Jaccard-like overlap */
    if (currentHost->openPortCount > 0 && refHost->openPortCount > 0) {
        int overlap = 0;
        for (int i = 0; i < currentHost->openPortCount && i < GUARD_MAX_PORTS_PER_HOST; i++) {
            for (int j = 0; j < refHost->openPortCount && j < GUARD_MAX_PORTS_PER_HOST; j++) {
                if (currentHost->openPorts[i] == refHost->openPorts[j]) {
                    overlap++;
                    break;
                }
            }
        }
        if (overlap > 0) {
            int maxP = currentHost->openPortCount > refHost->openPortCount
                ? currentHost->openPortCount : refHost->openPortCount;
            int portBonus = (overlap * 25) / (maxP > 0 ? maxP : 1);
            if (portBonus < 10) portBonus = 10;
            score += portBonus;
            if (reasons[0]) strncat(reasons, " + ", sizeof(reasons) - strlen(reasons) - 1);
            strncat(reasons, "개방 포트 프로파일 유사", sizeof(reasons) - strlen(reasons) - 1);
        }
    }

    int anyRandom = ((curMac.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) != 0) ||
                    ((refMac.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) != 0);
    if (anyRandom && score > 0) {
        score += 15;
        if (reasons[0]) strncat(reasons, " + ", sizeof(reasons) - strlen(reasons) - 1);
        strncat(reasons, "LAA 랜덤 MAC 전환 보정", sizeof(reasons) - strlen(reasons) - 1);
    }

    if (score > 95) score = 95;
    if (outReason && maxReasonLen > 0) {
        safe_copy(outReason, reasons[0] ? reasons : "유사 패턴 없음", (size_t)maxReasonLen);
    }
    return score;
}

/* ============================================================================
 * Public API 4: O(N) Subnet Topology Diff, Conflict Hash & Anomaly Analyzer
 * ============================================================================ */
typedef struct {
    char key[64];
    int hostIndex;
    int count;
    int isInfraGroup;
    uint8_t used;
} GuardHashSlot;

static int next_pow2(int v) {
    int p = 1024;
    while (p < v && p < (1 << 18)) p <<= 1;
    return p;
}

static int ci_contains(const char* haystack, const char* needle) {
    if (!haystack || !needle || !needle[0]) return 0;
    size_t nLen = strlen(needle);
    for (const char* p = haystack; *p; p++) {
        size_t i = 0;
        while (i < nLen && p[i] &&
               tolower((unsigned char)p[i]) == tolower((unsigned char)needle[i])) {
            i++;
        }
        if (i == nLen) return 1;
    }
    return 0;
}

static int is_gateway_candidate_ip(const char* ip, const char* explicitGatewayIp) {
    if (!ip || !ip[0]) return 0;
    if (explicitGatewayIp && explicitGatewayIp[0] && strcmp(ip, explicitGatewayIp) == 0) {
        return 1;
    }
    const char* lastDot = strrchr(ip, '.');
    if (lastDot) {
        if (strcmp(lastDot, ".1") == 0 ||
            strcmp(lastDot, ".254") == 0 ||
            strcmp(lastDot, ".253") == 0) {
            return 1;
        }
    }
    return 0;
}

static int is_infra_device_signature(const char* vendor, const char* hostname) {
    static const char* kInfraVendors[] = {
        "cisco", "hewlett", "hpe", "aruba", "fortinet", "juniper",
        "palo alto", "ahnlab", "genians", "iptime", "efm", "mikrotik",
        "ubiquiti", "unifi", "dasan", "ubiquoss", "extreme", "brocade",
        "ruckus", "meraki", "arista", "watchguard", "sonicwall",
        "netgear", "tp-link"
    };
    static const char* kInfraNames[] = {
        "gateway", "router", "firewall", "switch", "core-sw", "l3-"
    };

    if (vendor && vendor[0]) {
        for (size_t i = 0; i < sizeof(kInfraVendors) / sizeof(kInfraVendors[0]); i++) {
            if (ci_contains(vendor, kInfraVendors[i])) return 1;
        }
    }
    if (hostname && hostname[0]) {
        for (size_t i = 0; i < sizeof(kInfraNames) / sizeof(kInfraNames[0]); i++) {
            if (ci_contains(hostname, kInfraNames[i])) return 1;
        }
    }
    return 0;
}

static int hash_insert_key(GuardHashSlot* table, int buckets, const char* key, int hostIdx) {
    if (!key || !key[0] || buckets <= 0) return 0;
    uint32_t mask = (uint32_t)(buckets - 1);
    uint32_t h = fnv1a_hash(key) & mask;
    for (int step = 0; step < buckets; step++) {
        uint32_t idx = (h + (uint32_t)step) & mask;
        if (!table[idx].used) {
            table[idx].used = 1;
            safe_copy(table[idx].key, key, sizeof(table[idx].key));
            table[idx].hostIndex = hostIdx;
            table[idx].count = 1;
            table[idx].isInfraGroup = 0;
            return 1;
        }
        if (strcmp(table[idx].key, key) == 0) {
            table[idx].hostIndex = hostIdx;
            table[idx].count++;
            return 0;
        }
    }
    return 0;
}

static int hash_find_key(const GuardHashSlot* table, int buckets, const char* key) {
    if (!key || !key[0] || buckets <= 0) return -1;
    uint32_t mask = (uint32_t)(buckets - 1);
    uint32_t h = fnv1a_hash(key) & mask;
    for (int step = 0; step < buckets; step++) {
        uint32_t idx = (h + (uint32_t)step) & mask;
        if (!table[idx].used) return -1;
        if (strcmp(table[idx].key, key) == 0) return table[idx].hostIndex;
    }
    return -1;
}

static void hash_increment_mac(
    GuardHashSlot* macTable,
    int buckets,
    const char* cleanMac,
    int isInfraNode
) {
    if (!cleanMac || !cleanMac[0] || buckets <= 0) return;
    uint32_t mask = (uint32_t)(buckets - 1);
    uint32_t h = fnv1a_hash(cleanMac) & mask;
    for (int step = 0; step < buckets; step++) {
        uint32_t idx = (h + (uint32_t)step) & mask;
        if (!macTable[idx].used) {
            macTable[idx].used = 1;
            safe_copy(macTable[idx].key, cleanMac, sizeof(macTable[idx].key));
            macTable[idx].count = 1;
            macTable[idx].isInfraGroup = isInfraNode ? 1 : 0;
            return;
        }
        if (strcmp(macTable[idx].key, cleanMac) == 0) {
            macTable[idx].count++;
            if (isInfraNode) macTable[idx].isInfraGroup = 1;
            return;
        }
    }
}

static int hash_get_mac_info(const GuardHashSlot* macTable, int buckets, const char* cleanMac, int* outIsInfra) {
    if (outIsInfra) *outIsInfra = 0;
    if (!cleanMac || !cleanMac[0] || buckets <= 0) return 0;
    uint32_t mask = (uint32_t)(buckets - 1);
    uint32_t h = fnv1a_hash(cleanMac) & mask;
    for (int step = 0; step < buckets; step++) {
        uint32_t idx = (h + (uint32_t)step) & mask;
        if (!macTable[idx].used) return 0;
        if (strcmp(macTable[idx].key, cleanMac) == 0) {
            if (outIsInfra) *outIsInfra = macTable[idx].isInfraGroup;
            return macTable[idx].count;
        }
    }
    return 0;
}

static int ports_changed(const GuardHostRecord* a, const GuardHostRecord* b, int* outRiskyAdded) {
    *outRiskyAdded = 0;
    int changed = 0;

    for (int i = 0; i < b->openPortCount && i < GUARD_MAX_PORTS_PER_HOST; i++) {
        int p = b->openPorts[i];
        int found = 0;
        for (int j = 0; j < a->openPortCount && j < GUARD_MAX_PORTS_PER_HOST; j++) {
            if (a->openPorts[j] == p) { found = 1; break; }
        }
        if (!found) {
            changed = 1;
            if (is_high_risk_port(p)) *outRiskyAdded = 1;
        }
    }
    if (!changed) {
        for (int i = 0; i < a->openPortCount && i < GUARD_MAX_PORTS_PER_HOST; i++) {
            int p = a->openPorts[i];
            int found = 0;
            for (int j = 0; j < b->openPortCount && j < GUARD_MAX_PORTS_PER_HOST; j++) {
                if (b->openPorts[j] == p) { found = 1; break; }
            }
            if (!found) {
                changed = 1;
                break;
            }
        }
    }
    if (!changed && a->openPortCount != b->openPortCount) changed = 1;
    return changed;
}

int Guard_AnalyzeSubnetTopologyEx(
    const GuardHostRecord* currentHosts,
    int currentCount,
    const GuardHostRecord* baselineHosts,
    int baselineCount,
    const char* gatewayIp,
    GuardHostVerdict* outVerdicts,
    int maxVerdicts,
    GuardTopologySummary* outSummary
) {
    uint64_t tStart = get_microseconds();
    if (!outSummary) return -1;
    memset(outSummary, 0, sizeof(GuardTopologySummary));

    if (currentCount < 0) currentCount = 0;
    if (baselineCount < 0) baselineCount = 0;
    if (currentCount > GUARD_MAX_SUBNET_HOSTS) currentCount = GUARD_MAX_SUBNET_HOSTS;
    if (baselineCount > GUARD_MAX_SUBNET_HOSTS) baselineCount = GUARD_MAX_SUBNET_HOSTS;

    int buckets = next_pow2((currentCount + baselineCount + 64) * 2);
    GuardHashSlot* baseIpTable   = (GuardHashSlot*)calloc((size_t)buckets, sizeof(GuardHashSlot));
    GuardHashSlot* curIpTable    = (GuardHashSlot*)calloc((size_t)buckets, sizeof(GuardHashSlot));
    GuardHashSlot* curMacTable   = (GuardHashSlot*)calloc((size_t)buckets, sizeof(GuardHashSlot));
    GuardHashSlot* baseHostTable = (GuardHashSlot*)calloc((size_t)buckets, sizeof(GuardHashSlot));
    if (!baseIpTable || !curIpTable || !curMacTable || !baseHostTable) {
        free(baseIpTable); free(curIpTable); free(curMacTable); free(baseHostTable);
        return -2;
    }

    for (int i = 0; i < baselineCount; i++) {
        if (baselineHosts[i].ip[0]) {
            hash_insert_key(baseIpTable, buckets, baselineHosts[i].ip, i);
        }
        char normH[64];
        normalize_hostname(baselineHosts[i].hostname, normH, sizeof(normH));
        if (normH[0]) {
            hash_insert_key(baseHostTable, buckets, normH, i);
        }
    }
    for (int i = 0; i < currentCount; i++) {
        if (currentHosts[i].ip[0]) {
            hash_insert_key(curIpTable, buckets, currentHosts[i].ip, i);
        }
        GuardMacProfile mp;
        if (Guard_AnalyzeMacProfile(currentHosts[i].mac, &mp)) {
            int isNonRandom = ((mp.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) == 0);
            int isInfra = isNonRandom && (
                is_gateway_candidate_ip(currentHosts[i].ip, gatewayIp) ||
                is_infra_device_signature(currentHosts[i].vendor, currentHosts[i].hostname)
            );
            hash_increment_mac(curMacTable, buckets, mp.cleanMac, isInfra);
        }
    }

    int written = 0;

    /* Step 1: Evaluate all current active hosts */
    for (int i = 0; i < currentCount; i++) {
        const GuardHostRecord* cur = &currentHosts[i];
        if (!cur->ip[0]) continue;
        GuardMacProfile curMac;
        int macValid = Guard_AnalyzeMacProfile(cur->mac, &curMac);

        if (curMac.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) outSummary->laaRandomCount++;
        if (curMac.macFlags & GUARD_MAC_FLAG_LAA_VM) outSummary->virtualNicCount++;

        GuardHostVerdict v;
        memset(&v, 0, sizeof(v));
        safe_copy(v.ip, cur->ip, sizeof(v.ip));
        v.similarityScore = 0;

        /* Multi-IP duplicate MAC check: separate Gateway/Infra Proxy-ARP Info vs Conflict */
        int isBenignProxyArp = 0;
        if (macValid) {
            int isInfraGroup = 0;
            int macDupCount = hash_get_mac_info(curMacTable, buckets, curMac.cleanMac, &isInfraGroup);
            if (macDupCount > 1) {
                if (isInfraGroup && ((curMac.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) == 0)) {
                    isBenignProxyArp = 1;
                    v.anomalyMask |= GUARD_ANOMALY_INFRA_PROXY_ARP;
                    outSummary->proxyArpInfoCount++;
                    snprintf(v.reason, sizeof(v.reason),
                        "게이트웨이/인프라 Proxy-ARP 다중 IP 응답 (MAC %s, 정상 L3 라우팅 공유)", cur->mac);
                } else {
                    v.anomalyMask |= GUARD_ANOMALY_MULTI_IP_MAC;
                    outSummary->multiIpMacCount++;
                    snprintf(v.reason, sizeof(v.reason),
                        "동일 MAC[%s] 다중 IP 점유 감지 (Proxy-ARP 또는 충돌)", cur->mac);
                }
            }
        }

        int baseIdx = hash_find_key(baseIpTable, buckets, cur->ip);
        if (baseIdx < 0) {
            /* +NEW host not present in baseline IP slot */
            v.deltaStatus = GUARD_DELTA_NEW;
            outSummary->newCount++;

            if (isBenignProxyArp) {
                /* Benign L3 Proxy-ARP response from gateway/infra MAC: preserve Info verdict, do not flag SoftTrust/Intruder */
            } else if (!cur->isTrusted) {
                int bestSim = 0;
                int bestBaseIdx = -1;
                char simReason[128] = {0};

                /* O(1) hostname hash pre-probe first */
                char curNormH[64];
                normalize_hostname(cur->hostname, curNormH, sizeof(curNormH));
                if (curNormH[0]) {
                    int hMatchIdx = hash_find_key(baseHostTable, buckets, curNormH);
                    if (hMatchIdx >= 0 && hMatchIdx < baselineCount) {
                        char tmpReason[128] = {0};
                        int sim = Guard_ComputeSimilarity(cur, &baselineHosts[hMatchIdx], tmpReason, sizeof(tmpReason));
                        if (sim > bestSim) {
                            bestSim = sim;
                            bestBaseIdx = hMatchIdx;
                            safe_copy(simReason, tmpReason, sizeof(simReason));
                        }
                    }
                }

                /* Fall back to O(B) similarity scan only if hostname hash didn't yield strong match */
                if (bestSim < 75) {
                    for (int b = 0; b < baselineCount; b++) {
                        char tmpReason[128] = {0};
                        int sim = Guard_ComputeSimilarity(cur, &baselineHosts[b], tmpReason, sizeof(tmpReason));
                        if (sim > bestSim) {
                            bestSim = sim;
                            bestBaseIdx = b;
                            safe_copy(simReason, tmpReason, sizeof(simReason));
                        }
                    }
                }

                if (bestSim >= 50 && bestBaseIdx >= 0) {
                    v.isSoftTrusted = 1;
                    v.similarityScore = bestSim;
                    safe_copy(v.matchedPrevIp, baselineHosts[bestBaseIdx].ip, sizeof(v.matchedPrevIp));
                    v.anomalyMask |= GUARD_ANOMALY_LAA_CHURN;
                    outSummary->softTrustedCount++;
                    snprintf(v.reason, sizeof(v.reason), "소프트 신뢰 유예 (%d%%): %s (기존 IP %s)", bestSim, simReason, baselineHosts[bestBaseIdx].ip);
                } else if (curMac.macFlags & GUARD_MAC_FLAG_LAA_RANDOM) {
                    v.anomalyMask |= (GUARD_ANOMALY_LAA_CHURN | GUARD_ANOMALY_HARD_INTRUDER);
                    outSummary->hardIntruderCount++;
                    snprintf(v.reason, sizeof(v.reason), "미등록 LAA 랜덤 MAC 신규 접속 탐지 (%s)", cur->mac);
                } else {
                    v.anomalyMask |= GUARD_ANOMALY_HARD_INTRUDER;
                    outSummary->hardIntruderCount++;
                    if (!v.reason[0]) {
                        safe_copy(v.reason, "기준 스냅샷 미등록 신규 단말 접속", sizeof(v.reason));
                    }
                }
            } else if (!v.reason[0]) {
                safe_copy(v.reason, "신뢰 등록 신규 활성 단말", sizeof(v.reason));
            }
        } else {
            /* Existing IP slot -> Compare MAC, Hostname, and Open Ports */
            const GuardHostRecord* base = &baselineHosts[baseIdx];
            GuardMacProfile baseMac;
            int baseMacValid = Guard_AnalyzeMacProfile(base->mac, &baseMac);

            int macDiff = (macValid && baseMacValid && strcmp(curMac.cleanMac, baseMac.cleanMac) != 0);
            int riskyAdded = 0;
            int portDiff = ports_changed(base, cur, &riskyAdded);

            char curH[64], baseH[64];
            normalize_hostname(cur->hostname, curH, sizeof(curH));
            normalize_hostname(base->hostname, baseH, sizeof(baseH));
            int hostDiff = (curH[0] && baseH[0] && strcmp(curH, baseH) != 0);

            if (macDiff || portDiff || hostDiff) {
                v.deltaStatus = GUARD_DELTA_CHANGED;
                outSummary->changedCount++;

                if (macDiff) {
                    v.anomalyMask |= GUARD_ANOMALY_IP_TAKEOVER;
                    outSummary->conflictCount++;
                    outSummary->highRiskDeltaCount++;
                    snprintf(v.reason, sizeof(v.reason), "IP 점유 MAC 변조 감지 (%s -> %s)", base->mac, cur->mac);
                } else if (riskyAdded) {
                    v.anomalyMask |= GUARD_ANOMALY_RISKY_PORT_OPEN;
                    outSummary->highRiskDeltaCount++;
                    safe_copy(v.reason, "고위험 보안 포트 신규 개방 감지", sizeof(v.reason));
                } else if (portDiff) {
                    safe_copy(v.reason, "개방 포트 목록 변동", sizeof(v.reason));
                } else {
                    safe_copy(v.reason, "호스트 식별자(Hostname) 변동", sizeof(v.reason));
                }
            } else {
                v.deltaStatus = GUARD_DELTA_SAME;
                outSummary->sameCount++;
                if (!v.reason[0]) {
                    safe_copy(v.reason, "기준 스냅샷과 상태 일치", sizeof(v.reason));
                }
            }
        }

        if (outVerdicts && written < maxVerdicts) {
            outVerdicts[written++] = v;
        }
        outSummary->totalEvaluated++;
    }

    /* Step 2: Detect offline baseline hosts */
    for (int b = 0; b < baselineCount; b++) {
        const GuardHostRecord* base = &baselineHosts[b];
        if (!base->ip[0]) continue;
        if (hash_find_key(curIpTable, buckets, base->ip) < 0) {
            outSummary->offlineCount++;
            outSummary->totalEvaluated++;
            if (outVerdicts && written < maxVerdicts) {
                GuardHostVerdict v;
                memset(&v, 0, sizeof(v));
                safe_copy(v.ip, base->ip, sizeof(v.ip));
                v.deltaStatus = GUARD_DELTA_OFFLINE;
                safe_copy(v.reason, "기준 대비 오프라인 이탈", sizeof(v.reason));
                outVerdicts[written++] = v;
            }
        }
    }

    free(baseIpTable);
    free(curIpTable);
    free(curMacTable);
    free(baseHostTable);

    uint64_t tEnd = get_microseconds();
    outSummary->elapsedMicroseconds = (tEnd >= tStart) ? (tEnd - tStart) : 0;
    return outSummary->totalEvaluated;
}

int Guard_AnalyzeSubnetTopology(
    const GuardHostRecord* currentHosts,
    int currentCount,
    const GuardHostRecord* baselineHosts,
    int baselineCount,
    GuardHostVerdict* outVerdicts,
    int maxVerdicts,
    GuardTopologySummary* outSummary
) {
    return Guard_AnalyzeSubnetTopologyEx(
        currentHosts,
        currentCount,
        baselineHosts,
        baselineCount,
        NULL,
        outVerdicts,
        maxVerdicts,
        outSummary
    );
}

/* ============================================================================
 * Public API 5: Depth & Quote-Aware JSON Parser & C-ABI Diagnostic Bridge
 * ============================================================================ */
static const char* find_json_value_in_object(const char* objStart, const char* objEnd, const char* key) {
    if (!objStart || !objEnd || objStart >= objEnd || !key || !key[0]) return NULL;
    size_t keyLen = strlen(key);
    const char* p = objStart;
    if (*p == '{') p++;

    int depth = 0;
    int inStr = 0;
    int expectingKey = 1;

    while (p < objEnd && *p != '\0') {
        char c = *p;
        if (inStr) {
            if (c == '\\' && (p + 1) < objEnd) {
                p += 2;
                continue;
            }
            if (c == '"') inStr = 0;
            p++;
            continue;
        }

        if (c == '"') {
            if (depth == 0 && expectingKey) {
                const char* strStart = p + 1;
                const char* q = strStart;
                while (q < objEnd && *q != '\0') {
                    if (*q == '\\' && (q + 1) < objEnd) {
                        q += 2;
                        continue;
                    }
                    if (*q == '"') break;
                    q++;
                }
                if (q < objEnd && *q == '"') {
                    size_t tokLen = (size_t)(q - strStart);
                    const char* after = q + 1;
                    while (after < objEnd && isspace((unsigned char)*after)) after++;
                    if (after < objEnd && *after == ':') {
                        if (tokLen == keyLen && strncmp(strStart, key, keyLen) == 0) {
                            after++;
                            while (after < objEnd && isspace((unsigned char)*after)) after++;
                            return after;
                        }
                    }
                    p = q + 1;
                    expectingKey = 0;
                    continue;
                }
            }
            inStr = 1;
        } else if (c == '{' || c == '[') {
            depth++;
        } else if (c == '}' || c == ']') {
            if (depth == 0) break;
            depth--;
        } else if (depth == 0 && c == ',') {
            expectingKey = 1;
        }
        p++;
    }
    return NULL;
}

static void extract_json_field(const char* objStart, const char* objEnd, const char* key, char* out, size_t cap) {
    if (!out || cap == 0) return;
    out[0] = '\0';
    const char* val = find_json_value_in_object(objStart, objEnd, key);
    if (!val || val >= objEnd || *val != '"') return;

    val++;
    size_t idx = 0;
    while (val < objEnd && *val != '"' && idx < cap - 1) {
        if (*val == '\\' && (val + 1) < objEnd) {
            val++;
            switch (*val) {
                case 'n': out[idx++] = '\n'; break;
                case 'r': out[idx++] = '\r'; break;
                case 't': out[idx++] = '\t'; break;
                default:  out[idx++] = *val; break;
            }
            val++;
        } else {
            out[idx++] = *val++;
        }
    }
    out[idx] = '\0';
}

static int extract_json_bool(const char* objStart, const char* objEnd, const char* key) {
    const char* val = find_json_value_in_object(objStart, objEnd, key);
    if (!val || val >= objEnd) return 0;
    return (val + 4 <= objEnd && strncmp(val, "true", 4) == 0) ? 1 : 0;
}

static void extract_json_ports(const char* objStart, const char* objEnd, int* ports, int* count) {
    *count = 0;
    const char* br = find_json_value_in_object(objStart, objEnd, "openPorts");
    if (!br || br >= objEnd || *br != '[') return;
    br++;
    while (br < objEnd && *br != ']' && *count < GUARD_MAX_PORTS_PER_HOST) {
        if (*br == '-') {
            br++;
            while (br < objEnd && isdigit((unsigned char)*br)) br++;
        } else if (isdigit((unsigned char)*br)) {
            long port = strtol(br, NULL, 10);
            if (port >= 1 && port <= 65535) {
                ports[(*count)++] = (int)port;
            }
            while (br < objEnd && isdigit((unsigned char)*br)) br++;
        } else {
            br++;
        }
    }
}

static int parse_host_array(const char* jsonStart, const char* jsonEnd, const char* arrayKey, GuardHostRecord* outArr, int maxItems) {
    const char* arrStart = find_json_value_in_object(jsonStart, jsonEnd, arrayKey);
    if (!arrStart || arrStart >= jsonEnd || *arrStart != '[') return 0;

    int count = 0;
    const char* p = arrStart + 1;
    int bracketDepth = 1;
    int inOuterStr = 0;
    while (p < jsonEnd && *p && bracketDepth > 0 && count < maxItems) {
        if (inOuterStr) {
            if (*p == '\\' && (p + 1) < jsonEnd) { p += 2; continue; }
            if (*p == '"') inOuterStr = 0;
            p++;
            continue;
        }
        if (*p == '"') { inOuterStr = 1; p++; continue; }
        if (*p == '[') { bracketDepth++; p++; continue; }
        if (*p == ']') { bracketDepth--; break; }
        if (*p == '{') {
            const char* objStart = p;
            int objDepth = 1;
            p++;
            int inStr = 0;
            while (p < jsonEnd && *p && objDepth > 0) {
                if (inStr) {
                    if (*p == '\\' && (p + 1) < jsonEnd) { p += 2; continue; }
                    if (*p == '"') inStr = 0;
                } else {
                    if (*p == '"') inStr = 1;
                    else if (*p == '{') objDepth++;
                    else if (*p == '}') objDepth--;
                }
                p++;
            }
            const char* objEnd = p;
            GuardHostRecord rec;
            memset(&rec, 0, sizeof(rec));
            extract_json_field(objStart, objEnd, "ip", rec.ip, sizeof(rec.ip));
            extract_json_field(objStart, objEnd, "mac", rec.mac, sizeof(rec.mac));
            extract_json_field(objStart, objEnd, "hostname", rec.hostname, sizeof(rec.hostname));
            extract_json_field(objStart, objEnd, "vendor", rec.vendor, sizeof(rec.vendor));
            rec.isTrusted = extract_json_bool(objStart, objEnd, "isTrusted");
            extract_json_ports(objStart, objEnd, rec.openPorts, &rec.openPortCount);
            if (rec.ip[0]) {
                outArr[count++] = rec;
            }
            continue;
        }
        p++;
    }
    return count;
}

int Guard_AnalyzeTopologyJson(const char* inJson, char* outJson, int maxOutLen) {
    if (!inJson || !outJson || maxOutLen < 256) return 0;

    size_t inLen = strlen(inJson);
    const char* jsonEnd = inJson + inLen;
    char gatewayIp[32] = {0};
    extract_json_field(inJson, jsonEnd, "gatewayIp", gatewayIp, sizeof(gatewayIp));

    GuardHostRecord* curHosts = (GuardHostRecord*)calloc(GUARD_MAX_SUBNET_HOSTS, sizeof(GuardHostRecord));
    GuardHostRecord* baseHosts = (GuardHostRecord*)calloc(GUARD_MAX_SUBNET_HOSTS, sizeof(GuardHostRecord));
    GuardHostVerdict* verdicts = (GuardHostVerdict*)calloc(GUARD_MAX_SUBNET_HOSTS, sizeof(GuardHostVerdict));
    if (!curHosts || !baseHosts || !verdicts) {
        free(curHosts); free(baseHosts); free(verdicts);
        return 0;
    }

    int curCount = parse_host_array(inJson, jsonEnd, "current", curHosts, GUARD_MAX_SUBNET_HOSTS);
    int baseCount = parse_host_array(inJson, jsonEnd, "baseline", baseHosts, GUARD_MAX_SUBNET_HOSTS);

    GuardTopologySummary summary;
    int evalCount = Guard_AnalyzeSubnetTopologyEx(
        curHosts, curCount, baseHosts, baseCount,
        gatewayIp[0] ? gatewayIp : NULL,
        verdicts, GUARD_MAX_SUBNET_HOSTS, &summary
    );

    if (evalCount < 0) {
        free(curHosts); free(baseHosts); free(verdicts);
        return 0;
    }

    int pos = snprintf(outJson, (size_t)maxOutLen,
        "{"
        "\"engine\":\"grid_topology_guard.dll\","
        "\"version\":%d,"
        "\"totalEvaluated\":%d,"
        "\"newCount\":%d,"
        "\"offlineCount\":%d,"
        "\"changedCount\":%d,"
        "\"sameCount\":%d,"
        "\"conflictCount\":%d,"
        "\"multiIpMacCount\":%d,"
        "\"proxyArpInfoCount\":%d,"
        "\"laaRandomCount\":%d,"
        "\"virtualNicCount\":%d,"
        "\"hardIntruderCount\":%d,"
        "\"softTrustedCount\":%d,"
        "\"highRiskDeltaCount\":%d,"
        "\"elapsedMicroseconds\":%llu,"
        "\"alerts\":[",
        GUARD_DRIVER_VERSION,
        summary.totalEvaluated,
        summary.newCount,
        summary.offlineCount,
        summary.changedCount,
        summary.sameCount,
        summary.conflictCount,
        summary.multiIpMacCount,
        summary.proxyArpInfoCount,
        summary.laaRandomCount,
        summary.virtualNicCount,
        summary.hardIntruderCount,
        summary.softTrustedCount,
        summary.highRiskDeltaCount,
        (unsigned long long)summary.elapsedMicroseconds
    );

    int alertEmitted = 0;
    for (int i = 0; i < evalCount && i < GUARD_MAX_SUBNET_HOSTS && pos + 360 < maxOutLen; i++) {
        if (verdicts[i].anomalyMask == 0 && verdicts[i].deltaStatus != GUARD_DELTA_CHANGED) continue;
        char escIp[64], escReason[384], escPrevIp[64];
        json_escape(verdicts[i].ip, escIp, sizeof(escIp));
        json_escape(verdicts[i].reason, escReason, sizeof(escReason));
        json_escape(verdicts[i].matchedPrevIp, escPrevIp, sizeof(escPrevIp));

        int wrote = snprintf(outJson + pos, (size_t)(maxOutLen - pos),
            "%s{\"ip\":\"%s\",\"deltaStatus\":%d,\"anomalyMask\":%u,\"similarityScore\":%d,\"isSoftTrusted\":%s,\"matchedPrevIp\":\"%s\",\"reason\":\"%s\"}",
            alertEmitted > 0 ? "," : "",
            escIp,
            verdicts[i].deltaStatus,
            verdicts[i].anomalyMask,
            verdicts[i].similarityScore,
            verdicts[i].isSoftTrusted ? "true" : "false",
            escPrevIp,
            escReason
        );
        if (wrote < 0 || pos + wrote >= maxOutLen - 4) break;
        pos += wrote;
        alertEmitted++;
        if (alertEmitted >= 128) break;
    }

    if (pos + 4 <= maxOutLen) {
        snprintf(outJson + pos, (size_t)(maxOutLen - pos), "]}");
    }

    free(curHosts);
    free(baseHosts);
    free(verdicts);
    return 1;
}

#ifdef _WIN32
BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    (void)lpvReserved;
    (void)fdwReason;
    return TRUE;
}
#endif
