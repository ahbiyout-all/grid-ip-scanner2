/**
 * OuiValidator - High-Performance C++ OUI Dataset Validator & Deduplicator DLL Header
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 * 
 * Provides sub-millisecond hash-table parsing, multi-bit prefix normalization (24/28/36 bits),
 * collision detection, automated JSON integrity reporting, and Wireshark standard discrepancy repair logging.
 */

#ifndef OUI_VALIDATOR_H
#define OUI_VALIDATOR_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_OUI_VALIDATOR
    #define OUI_VALIDATOR_API __declspec(dllexport)
  #else
    #define OUI_VALIDATOR_API __declspec(dllimport)
  #endif
#else
  #define OUI_VALIDATOR_API __attribute__((visibility("default")))
#endif

/* Dataset Source Types */
#define OUI_DATASET_AUTO        0
#define OUI_DATASET_IEEE_MAL    1 // 24-bit MA-L
#define OUI_DATASET_IEEE_MAM    2 // 28-bit MA-M
#define OUI_DATASET_IEEE_MAS    3 // 36-bit MA-S
#define OUI_DATASET_WIRESHARK   4 // Wireshark manuf format

/* Status / Return Codes */
#define OUI_VALIDATOR_OK                 0
#define OUI_VALIDATOR_ERR_INVALID_PARAM -1
#define OUI_VALIDATOR_ERR_FILE_NOT_FOUND -2
#define OUI_VALIDATOR_ERR_OUT_OF_MEMORY -3
#define OUI_VALIDATOR_ERR_BUFFER_TOO_SMALL -4
#define OUI_VALIDATOR_ERR_PARSE_FAILED  -5

/**
 * Statistics structure returned by OuiValidator_GetStats.
 */
typedef struct {
    uint32_t totalLinesParsed;
    uint32_t validRecords;
    uint32_t malCount;       // 24-bit MA-L
    uint32_t mamCount;       // 28-bit MA-M
    uint32_t masCount;       // 36-bit MA-S
    uint32_t duplicateCount; // Duplicate prefix with identical vendor
    uint32_t collisionCount; // Same prefix with conflicting vendor names
    uint32_t malformedCount; // Syntax errors / unparseable lines
    uint64_t parseTimeMicroseconds;
} OuiValidatorStats;

/* Opaque Context Handle */
typedef void* HOuiValidator;

/**
 * Returns the version code of OuiValidator.dll (e.g., 20400 for v2.4.0).
 */
OUI_VALIDATOR_API int OuiValidator_GetVersion(void);

/**
 * Creates a new validator context.
 */
OUI_VALIDATOR_API HOuiValidator OuiValidator_CreateContext(void);

/**
 * Frees an existing validator context and its internal memory.
 */
OUI_VALIDATOR_API void OuiValidator_FreeContext(HOuiValidator ctx);

/**
 * Normalizes an arbitrary raw MAC prefix string into canonical uppercase format and extracts bit length.
 * Supported bit lengths: 24 (MA-L), 28 (MA-M), 36 (MA-S).
 * Example: "00-1a-2b" -> "00:1A:2B", outPrefixBits = 24
 * Example: "00:1A:2B:30/28" -> "00:1A:2B:30/28", outPrefixBits = 28
 *
 * @param rawPrefix Input prefix string (e.g. "00-1A-2B", "001A2B", "00:1A:2B:30/28")
 * @param outNormalized Output buffer for canonical format (min 32 bytes)
 * @param maxLen Buffer size of outNormalized
 * @param outPrefixBits Pointer to receive detected prefix bit length (24, 28, or 36)
 * @return OUI_VALIDATOR_OK (0) on success, or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_NormalizePrefix(
    const char* rawPrefix,
    char* outNormalized,
    size_t maxLen,
    int* outPrefixBits
);

/**
 * Loads and parses an OUI dataset file (master_oui.txt, IEEE CSV, or Wireshark manuf).
 *
 * @param ctx Validator handle
 * @param filePath Full file path to dataset
 * @param datasetType One of OUI_DATASET_* constants
 * @return OUI_VALIDATOR_OK or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_LoadDataset(
    HOuiValidator ctx,
    const char* filePath,
    int datasetType
);

/**
 * Runs hash-table validation, deduplication, and anomaly classification.
 *
 * @param ctx Validator handle
 * @return Number of unique valid records, or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_Validate(HOuiValidator ctx);

/**
 * Retrieves aggregate validation statistics.
 *
 * @param ctx Validator handle
 * @param outStats Pointer to receive statistics
 * @return OUI_VALIDATOR_OK or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_GetStats(
    HOuiValidator ctx,
    OuiValidatorStats* outStats
);

/**
 * Generates and saves a detailed JSON integrity report (e.g. 'integrity_report.json').
 *
 * @param ctx Validator handle
 * @param outputPath Destination file path (e.g. "./integrity_report.json")
 * @param outJsonSummary Optional buffer to receive string summary (NULL if not needed)
 * @param maxSummaryLen Capacity of outJsonSummary buffer
 * @return OUI_VALIDATOR_OK or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_GenerateReport(
    HOuiValidator ctx,
    const char* outputPath,
    char* outJsonSummary,
    size_t maxSummaryLen
);

/**
 * Deeply iterates through the loaded OUI database, cross-references with Wireshark standard
 * prefix lengths (24, 28, 36 bits), detects invalid/malformed entries, formulates auto-repairs,
 * and creates 'repair_log.json'.
 *
 * @param ctx Validator handle
 * @param repairLogPath Destination file path for repair_log.json (e.g. "./repair_log.json")
 * @param outRepairJson Optional buffer to receive the serialized repair JSON log
 * @param maxLen Buffer size of outRepairJson
 * @return Number of discrepancies found (>= 0) or negative error code
 */
OUI_VALIDATOR_API int OuiValidator_ValidateOuiIntegrity(
    HOuiValidator ctx,
    const char* repairLogPath,
    char* outRepairJson,
    size_t maxLen
);

#ifdef __cplusplus
}
#endif

#endif /* OUI_VALIDATOR_H */
