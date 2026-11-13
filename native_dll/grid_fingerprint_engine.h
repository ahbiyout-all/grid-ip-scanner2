/**
 * Grid IP Scanner2 - Module 7: grid_fingerprint_engine.h
 * High-Performance Native Device Fingerprinting & Security Risk Assessment Engine (C ABI)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_FINGERPRINT_ENGINE_H
#define GRID_FINGERPRINT_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32) && defined(BUILDING_GRID_FINGERPRINT_ENGINE)
    #define GRID_FP_API __declspec(dllexport)
#elif defined(_WIN32)
    #define GRID_FP_API __declspec(dllimport)
#else
    #define GRID_FP_API
#endif

// ============================================================================
// Constants and Device Category Enums
// ============================================================================
#define FP_DRIVER_VERSION 20500 // v2.5.0

typedef enum {
    DEVICE_CAT_UNKNOWN = 0,
    DEVICE_CAT_ROUTER_GATEWAY = 1,
    DEVICE_CAT_SWITCH_INFRA = 2,
    DEVICE_CAT_NAS_STORAGE = 3,
    DEVICE_CAT_IP_CAMERA = 4,
    DEVICE_CAT_PRINTER_MFP = 5,
    DEVICE_CAT_WINDOWS_PC = 6,
    DEVICE_CAT_WINDOWS_SERVER = 7,
    DEVICE_CAT_LINUX_SERVER = 8,
    DEVICE_CAT_APPLE_DEVICE = 9,
    DEVICE_CAT_VIRTUAL_MACHINE = 10,
    DEVICE_CAT_IOT_SMART_DEVICE = 11,
    DEVICE_CAT_DATABASE_SERVER = 12,
    DEVICE_CAT_MEDIA_TV = 13,
    DEVICE_CAT_GAME_CONSOLE = 14
} DeviceCategoryCode;

typedef enum {
    RISK_LEVEL_CLEAN = 0,
    RISK_LEVEL_LOW = 1,
    RISK_LEVEL_MEDIUM = 2,
    RISK_LEVEL_HIGH = 3,
    RISK_LEVEL_CRITICAL = 4
} SecurityRiskLevel;

// ============================================================================
// Input Host Profile Structure
// ============================================================================
typedef struct {
    char ip[32];
    char mac[24];
    char vendor[64];
    char hostname[64];
    char workgroup[64];
    char serverHeader[64];
    char sshBanner[64];
    char rtspServer[64];
    int ttl;
    int openPorts[64];
    int openPortCount;
} HostFingerprintProfile;

// ============================================================================
// Output Classification and Security Diagnosis Structures
// ============================================================================
typedef struct {
    int categoryCode;               // DeviceCategoryCode
    char categoryName[128];         // e.g. "NAS / Storage Server"
    char detectedOS[128];           // e.g. "Synology DSM (Linux)"
    char hardwareModel[128];        // e.g. "Synology DiskStation"
    int confidencePercent;          // 0 ~ 100%
} DeviceClassificationResult;

typedef struct {
    int riskLevel;                  // SecurityRiskLevel (0~4)
    char riskLevelName[16];         // "CLEAN", "LOW", "MEDIUM", "HIGH", "CRITICAL"
    int riskScore;                  // 0 ~ 100
    int vulnerabilityCount;         // Number of detected security issues
    char vulnerabilityList[512];    // Semicolon-delimited list of detected vulnerabilities
    char recommendation[256];       // Primary mitigation advice
} SecurityRiskResult;

// ============================================================================
// Native Exported Functions
// ============================================================================
GRID_FP_API int Fingerprint_GetDriverVersion(void);

GRID_FP_API int Fingerprint_ClassifyDevice(
    const HostFingerprintProfile* profile,
    DeviceClassificationResult* outResult
);

GRID_FP_API int Fingerprint_AssessSecurityRisk(
    const HostFingerprintProfile* profile,
    SecurityRiskResult* outRisk
);

GRID_FP_API int Fingerprint_AnalyzeFullHost(
    const HostFingerprintProfile* profile,
    DeviceClassificationResult* outClass,
    SecurityRiskResult* outRisk
);

GRID_FP_API int Fingerprint_AnalyzeJson(
    const char* inJson,
    char* outJson,
    int maxOutLen
);

#ifdef __cplusplus
}
#endif

#endif // GRID_FINGERPRINT_ENGINE_H
