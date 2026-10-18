/**
 * OuiValidator - High-Performance C++ OUI Dataset Validator & Deduplicator DLL Implementation
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#define BUILDING_OUI_VALIDATOR
#include "oui_validator.h"

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <chrono>
#include <cstring>
#include <cctype>
#include <iomanip>

namespace {

// Helper: Trim string in-place
static inline void trim(std::string& s) {
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) {
        return !std::isspace(ch);
    }));
    s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) {
        return !std::isspace(ch);
    }).base(), s.end());
}

// Canonicalize hex char
static inline char toHexUpper(char c) {
    if (c >= 'a' && c <= 'f') return (char)(c - 'a' + 'A');
    return c;
}

// Checks if char is valid hex
static inline bool isHex(char c) {
    return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
}

// Safe JSON string escaper
static std::string escapeJson(const std::string& input) {
    std::ostringstream ss;
    for (char c : input) {
        switch (c) {
            case '\\': ss << "\\\\"; break;
            case '"': ss << "\\\""; break;
            case '\b': ss << "\\b"; break;
            case '\f': ss << "\\f"; break;
            case '\n': ss << "\\n"; break;
            case '\r': ss << "\\r"; break;
            case '\t': ss << "\\t"; break;
            default:
                if ((unsigned char)c < 0x20) {
                    ss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << (int)(unsigned char)c;
                } else {
                    ss << c;
                }
                break;
        }
    }
    return ss.str();
}

} // namespace

struct OuiRecord {
    std::string canonicalPrefix;
    std::string originalPrefix;
    std::string vendorName;
    int prefixBits; // 24, 28, or 36
    uint32_t lineNumber;
};

struct CollisionEntry {
    std::string prefix;
    std::string primaryVendor;
    std::string conflictingVendor;
    uint32_t primaryLine;
    uint32_t conflictLine;
};

struct DiscrepancyRecord {
    uint32_t lineNumber;
    std::string originalLine;
    std::string originalPrefix;
    std::string originalVendor;
    std::string issueType;
    std::string description;
    std::string suggestedPrefix;
    std::string suggestedVendor;
    int detectedBits;
    bool isRepaired;
};

class OuiValidatorEngine {
public:
    OuiValidatorStats stats;
    std::vector<OuiRecord> rawRecords;
    std::unordered_map<std::string, OuiRecord> uniqueMap;
    std::vector<CollisionEntry> collisions;
    std::vector<std::string> malformedLines;
    std::vector<DiscrepancyRecord> discrepancies;
    std::string sourceFile;

    OuiValidatorEngine() {
        std::memset(&stats, 0, sizeof(stats));
        uniqueMap.reserve(131072); // Pre-allocate 128K buckets for zero re-hashing
        rawRecords.reserve(100000);
        collisions.reserve(500);
        discrepancies.reserve(1000);
    }

    int normalize(const std::string& raw, std::string& outNorm, int& outBits) {
        std::string cleaned;
        std::string bitSuffix;

        size_t slashPos = raw.find('/');
        if (slashPos != std::string::npos) {
            bitSuffix = raw.substr(slashPos + 1);
            cleaned = raw.substr(0, slashPos);
        } else {
            cleaned = raw;
        }

        // Collect all hex digits
        std::string hexOnly;
        for (char c : cleaned) {
            if (isHex(c)) {
                hexOnly.push_back(toHexUpper(c));
            }
        }

        if (bitSuffix == "28" || hexOnly.length() == 7) {
            outBits = 28;
            if (hexOnly.length() < 7) return OUI_VALIDATOR_ERR_PARSE_FAILED;
            // Format: XX:XX:XX:X0/28 (Wireshark standard 28-bit MA-M)
            std::ostringstream oss;
            oss << hexOnly.substr(0, 2) << ":" << hexOnly.substr(2, 2) << ":" 
                << hexOnly.substr(4, 2) << ":" << hexOnly.substr(6, 1) << "0/28";
            outNorm = oss.str();
            return OUI_VALIDATOR_OK;
        } else if (bitSuffix == "36" || hexOnly.length() == 9) {
            outBits = 36;
            if (hexOnly.length() < 9) return OUI_VALIDATOR_ERR_PARSE_FAILED;
            // Format: XX:XX:XX:XX:X0/36 (Wireshark standard 36-bit MA-S)
            std::ostringstream oss;
            oss << hexOnly.substr(0, 2) << ":" << hexOnly.substr(2, 2) << ":" 
                << hexOnly.substr(4, 2) << ":" << hexOnly.substr(6, 2) << ":"
                << hexOnly.substr(8, 1) << "0/36";
            outNorm = oss.str();
            return OUI_VALIDATOR_OK;
        } else if (hexOnly.length() >= 6) {
            // Standard 24-bit MA-L
            outBits = 24;
            std::ostringstream oss;
            oss << hexOnly.substr(0, 2) << ":" << hexOnly.substr(2, 2) << ":" << hexOnly.substr(4, 2);
            outNorm = oss.str();
            return OUI_VALIDATOR_OK;
        }

        return OUI_VALIDATOR_ERR_PARSE_FAILED;
    }

    int loadFile(const std::string& path, int datasetType) {
        (void)datasetType;
        sourceFile = path;
        std::ifstream file(path);
        if (!file.is_open()) {
            return OUI_VALIDATOR_ERR_FILE_NOT_FOUND;
        }

        rawRecords.clear();
        malformedLines.clear();
        discrepancies.clear();
        std::string line;
        uint32_t lineNo = 0;

        while (std::getline(file, line)) {
            lineNo++;
            std::string origLine = line;
            trim(line);
            if (line.empty() || line[0] == '#') continue;

            // Handle TSV / CSV / Space-delimited formats
            std::string prefixPart;
            std::string vendorPart;

            size_t tabPos = line.find('\t');
            if (tabPos != std::string::npos) {
                prefixPart = line.substr(0, tabPos);
                vendorPart = line.substr(tabPos + 1);
            } else {
                size_t commaPos = line.find(',');
                if (commaPos != std::string::npos) {
                    prefixPart = line.substr(0, commaPos);
                    vendorPart = line.substr(commaPos + 1);
                } else {
                    size_t spacePos = line.find(' ');
                    if (spacePos != std::string::npos) {
                        prefixPart = line.substr(0, spacePos);
                        vendorPart = line.substr(spacePos + 1);
                    } else {
                        malformedLines.push_back("Line " + std::to_string(lineNo) + ": " + line);
                        continue;
                    }
                }
            }

            trim(prefixPart);
            trim(vendorPart);

            std::string normPrefix;
            int bits = 24;
            int normStatus = normalize(prefixPart, normPrefix, bits);

            if (normStatus == OUI_VALIDATOR_OK && !vendorPart.empty()) {
                OuiRecord rec;
                rec.canonicalPrefix = normPrefix;
                rec.originalPrefix = prefixPart;
                rec.vendorName = vendorPart;
                rec.prefixBits = bits;
                rec.lineNumber = lineNo;
                rawRecords.push_back(std::move(rec));
            } else {
                malformedLines.push_back("Line " + std::to_string(lineNo) + ": " + line);
            }
        }

        stats.totalLinesParsed = lineNo;
        stats.malformedCount = (uint32_t)malformedLines.size();
        return OUI_VALIDATOR_OK;
    }

    int validateAndDeduplicate() {
        auto startClock = std::chrono::high_resolution_clock::now();

        uniqueMap.clear();
        collisions.clear();
        stats.duplicateCount = 0;
        stats.collisionCount = 0;
        stats.malCount = 0;
        stats.mamCount = 0;
        stats.masCount = 0;

        for (const auto& rec : rawRecords) {
            auto it = uniqueMap.find(rec.canonicalPrefix);
            if (it == uniqueMap.end()) {
                uniqueMap[rec.canonicalPrefix] = rec;
                if (rec.prefixBits == 24) stats.malCount++;
                else if (rec.prefixBits == 28) stats.mamCount++;
                else if (rec.prefixBits == 36) stats.masCount++;
            } else {
                // Existing entry with same prefix
                if (it->second.vendorName == rec.vendorName) {
                    stats.duplicateCount++;
                } else {
                    stats.collisionCount++;
                    CollisionEntry col;
                    col.prefix = rec.canonicalPrefix;
                    col.primaryVendor = it->second.vendorName;
                    col.conflictingVendor = rec.vendorName;
                    col.primaryLine = it->second.lineNumber;
                    col.conflictLine = rec.lineNumber;
                    collisions.push_back(std::move(col));
                }
            }
        }

        stats.validRecords = (uint32_t)uniqueMap.size();

        auto endClock = std::chrono::high_resolution_clock::now();
        stats.parseTimeMicroseconds = std::chrono::duration_cast<std::chrono::microseconds>(endClock - startClock).count();

        return (int)stats.validRecords;
    }

    /**
     * Cross-references loaded entries against Wireshark standard prefix lengths (24, 28, 36 bits),
     * identifies formatting/syntactic discrepancies, builds canonical repairs, and generates 'repair_log.json'.
     */
    int validateOuiIntegrity(const std::string& repairLogPath, std::string& outRepairJson) {
        validateAndDeduplicate();
        discrepancies.clear();

        for (const auto& rec : rawRecords) {
            bool hasIssue = false;
            std::string issueType;
            std::string desc;

            // 1. Check Non-Canonical Delimiters (hyphens, dots, or unseparated hex)
            if (rec.originalPrefix.find('-') != std::string::npos || rec.originalPrefix.find('.') != std::string::npos) {
                hasIssue = true;
                issueType = "NON_CANONICAL_DELIMITER";
                desc = "Prefix uses non-standard delimiter (hyphen '-' or dot '.') instead of colon ':'.";
            }

            // 2. Check Missing Mask Notation for 28-bit / 36-bit prefixes
            if (rec.prefixBits == 28 && rec.originalPrefix.find("/28") == std::string::npos) {
                hasIssue = true;
                issueType = "MISSING_CIDR_MASK_28";
                desc = "28-bit (MA-M) prefix is missing explicit '/28' Wireshark-standard CIDR mask.";
            } else if (rec.prefixBits == 36 && rec.originalPrefix.find("/36") == std::string::npos) {
                hasIssue = true;
                issueType = "MISSING_CIDR_MASK_36";
                desc = "36-bit (MA-S) prefix is missing explicit '/36' Wireshark-standard CIDR mask.";
            }

            // 3. Check Case Discrepancy
            bool hasLower = false;
            for (char c : rec.originalPrefix) {
                if (c >= 'a' && c <= 'f') { hasLower = true; break; }
            }
            if (hasLower && !hasIssue) {
                hasIssue = true;
                issueType = "LOWERCASE_HEX";
                desc = "Prefix contains lowercase hexadecimal characters.";
            }

            // 4. Check Irregular Nibble Count (Neither 24, 28, nor 36 bits)
            std::string hexOnly;
            for (char c : rec.originalPrefix) {
                if (isHex(c)) hexOnly.push_back(toHexUpper(c));
            }
            if (rec.prefixBits != 24 && rec.prefixBits != 28 && rec.prefixBits != 36) {
                hasIssue = true;
                issueType = "INVALID_PREFIX_LENGTH";
                desc = "Prefix bit length (" + std::to_string(rec.prefixBits) + " bits) does not match Wireshark standard 24/28/36-bit specifications.";
            }

            // 5. Check Vendor String Hygiene
            std::string cleanedVendor = rec.vendorName;
            trim(cleanedVendor);
            if (cleanedVendor != rec.vendorName) {
                hasIssue = true;
                issueType = "DIRTY_VENDOR_NAME";
                desc = "Vendor name contains leading/trailing unescaped whitespace.";
            }

            if (hasIssue) {
                DiscrepancyRecord dr;
                dr.lineNumber = rec.lineNumber;
                dr.originalLine = rec.originalPrefix + "\t" + rec.vendorName;
                dr.originalPrefix = rec.originalPrefix;
                dr.originalVendor = rec.vendorName;
                dr.issueType = issueType;
                dr.description = desc;
                dr.suggestedPrefix = rec.canonicalPrefix;
                dr.suggestedVendor = cleanedVendor;
                dr.detectedBits = rec.prefixBits;
                dr.isRepaired = true;
                discrepancies.push_back(std::move(dr));
            }
        }

        // Add collisions as discrepancies
        for (const auto& col : collisions) {
            DiscrepancyRecord dr;
            dr.lineNumber = col.conflictLine;
            dr.originalLine = col.prefix + "\t" + col.conflictingVendor;
            dr.originalPrefix = col.prefix;
            dr.originalVendor = col.conflictingVendor;
            dr.issueType = "DUPLICATE_VENDOR_COLLISION";
            dr.description = "Collision with primary vendor '" + col.primaryVendor + "' registered on line " + std::to_string(col.primaryLine);
            dr.suggestedPrefix = col.prefix;
            dr.suggestedVendor = col.primaryVendor; // Standardize to primary entry
            dr.detectedBits = 24;
            dr.isRepaired = true;
            discrepancies.push_back(std::move(dr));
        }

        // Serialize repair_log.json
        std::ostringstream json;
        json << "{\n";
        json << "  \"tool\": \"OuiValidator\",\n";
        json << "  \"action\": \"validateOuiIntegrity\",\n";
        json << "  \"engineVersion\": \"2.4.0\",\n";
        json << "  \"timestamp\": " << std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()) << ",\n";
        json << "  \"sourceFile\": \"" << escapeJson(sourceFile) << "\",\n";
        json << "  \"wiresharkStandards\": {\n";
        json << "    \"maL24Bit\": \"XX:XX:XX\",\n";
        json << "    \"maM28Bit\": \"XX:XX:XX:X0/28\",\n";
        json << "    \"maS36Bit\": \"XX:XX:XX:XX:X0/36\"\n";
        json << "  },\n";
        json << "  \"summary\": {\n";
        json << "    \"totalEntriesScanned\": " << stats.totalLinesParsed << ",\n";
        json << "    \"validUniqueCount\": " << stats.validRecords << ",\n";
        json << "    \"discrepanciesFound\": " << discrepancies.size() << ",\n";
        json << "    \"repairsApplied\": " << discrepancies.size() << ",\n";
        json << "    \"elapsedMicroseconds\": " << stats.parseTimeMicroseconds << "\n";
        json << "  },\n";
        json << "  \"discrepancies\": [\n";

        for (size_t i = 0; i < discrepancies.size(); i++) {
            const auto& d = discrepancies[i];
            json << "    {\n";
            json << "      \"lineNumber\": " << d.lineNumber << ",\n";
            json << "      \"issueType\": \"" << escapeJson(d.issueType) << "\",\n";
            json << "      \"description\": \"" << escapeJson(d.description) << "\",\n";
            json << "      \"detectedBits\": " << d.detectedBits << ",\n";
            json << "      \"original\": {\n";
            json << "        \"prefix\": \"" << escapeJson(d.originalPrefix) << "\",\n";
            json << "        \"vendor\": \"" << escapeJson(d.originalVendor) << "\"\n";
            json << "      },\n";
            json << "      \"repaired\": {\n";
            json << "        \"prefix\": \"" << escapeJson(d.suggestedPrefix) << "\",\n";
            json << "        \"vendor\": \"" << escapeJson(d.suggestedVendor) << "\"\n";
            json << "      },\n";
            json << "      \"status\": \"" << (d.isRepaired ? "AUTO_REPAIRED" : "UNRESOLVED") << "\"\n";
            json << "    }" << (i + 1 < discrepancies.size() ? "," : "") << "\n";
        }

        json << "  ]\n";
        json << "}\n";

        outRepairJson = json.str();

        // Write repair_log.json to file if path provided
        if (!repairLogPath.empty()) {
            std::ofstream out(repairLogPath);
            if (out.is_open()) {
                out << outRepairJson;
                out.close();
            }
        }

        return (int)discrepancies.size();
    }

    std::string serializeReportJson() const {
        std::ostringstream json;
        json << "{\n";
        json << "  \"validatorVersion\": \"2.4.0\",\n";
        json << "  \"sourceFile\": \"" << escapeJson(sourceFile) << "\",\n";
        json << "  \"timestamp\": " << std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()) << ",\n";
        json << "  \"metrics\": {\n";
        json << "    \"totalLines\": " << stats.totalLinesParsed << ",\n";
        json << "    \"validUniqueRecords\": " << stats.validRecords << ",\n";
        json << "    \"maL24Bit\": " << stats.malCount << ",\n";
        json << "    \"maM28Bit\": " << stats.mamCount << ",\n";
        json << "    \"maS36Bit\": " << stats.masCount << ",\n";
        json << "    \"duplicateCount\": " << stats.duplicateCount << ",\n";
        json << "    \"collisionCount\": " << stats.collisionCount << ",\n";
        json << "    \"malformedLines\": " << stats.malformedCount << ",\n";
        json << "    \"elapsedMicroseconds\": " << stats.parseTimeMicroseconds << "\n";
        json << "  },\n";
        
        // Collisions list (top 20)
        json << "  \"sampleCollisions\": [\n";
        size_t limit = std::min((size_t)20, collisions.size());
        for (size_t i = 0; i < limit; i++) {
            const auto& c = collisions[i];
            json << "    {\n";
            json << "      \"prefix\": \"" << escapeJson(c.prefix) << "\",\n";
            json << "      \"primary\": \"" << escapeJson(c.primaryVendor) << "\" (Line " << c.primaryLine << "),\n";
            json << "      \"conflict\": \"" << escapeJson(c.conflictingVendor) << "\" (Line " << c.conflictLine << ")\n";
            json << "    }" << (i + 1 < limit ? "," : "") << "\n";
        }
        json << "  ]\n";
        json << "}\n";

        return json.str();
    }
};

// C ABI Interface Implementations

OUI_VALIDATOR_API int OuiValidator_GetVersion(void) {
    return 20400; // v2.4.0
}

OUI_VALIDATOR_API HOuiValidator OuiValidator_CreateContext(void) {
    try {
        return new OuiValidatorEngine();
    } catch (...) {
        return nullptr;
    }
}

OUI_VALIDATOR_API void OuiValidator_FreeContext(HOuiValidator ctx) {
    if (ctx) {
        delete static_cast<OuiValidatorEngine*>(ctx);
    }
}

OUI_VALIDATOR_API int OuiValidator_NormalizePrefix(
    const char* rawPrefix,
    char* outNormalized,
    size_t maxLen,
    int* outPrefixBits
) {
    if (!rawPrefix || !outNormalized || maxLen < 20 || !outPrefixBits) {
        return OUI_VALIDATOR_ERR_INVALID_PARAM;
    }

    OuiValidatorEngine dummy;
    std::string norm;
    int bits = 24;
    int res = dummy.normalize(rawPrefix, norm, bits);
    if (res != OUI_VALIDATOR_OK) return res;

    if (norm.length() + 1 > maxLen) return OUI_VALIDATOR_ERR_BUFFER_TOO_SMALL;

    std::strncpy(outNormalized, norm.c_str(), maxLen - 1);
    outNormalized[maxLen - 1] = '\0';
    *outPrefixBits = bits;
    return OUI_VALIDATOR_OK;
}

OUI_VALIDATOR_API int OuiValidator_LoadDataset(
    HOuiValidator ctx,
    const char* filePath,
    int datasetType
) {
    if (!ctx || !filePath) return OUI_VALIDATOR_ERR_INVALID_PARAM;
    return static_cast<OuiValidatorEngine*>(ctx)->loadFile(filePath, datasetType);
}

OUI_VALIDATOR_API int OuiValidator_Validate(HOuiValidator ctx) {
    if (!ctx) return OUI_VALIDATOR_ERR_INVALID_PARAM;
    return static_cast<OuiValidatorEngine*>(ctx)->validateAndDeduplicate();
}

OUI_VALIDATOR_API int OuiValidator_GetStats(
    HOuiValidator ctx,
    OuiValidatorStats* outStats
) {
    if (!ctx || !outStats) return OUI_VALIDATOR_ERR_INVALID_PARAM;
    *outStats = static_cast<OuiValidatorEngine*>(ctx)->stats;
    return OUI_VALIDATOR_OK;
}

OUI_VALIDATOR_API int OuiValidator_GenerateReport(
    HOuiValidator ctx,
    const char* outputPath,
    char* outJsonSummary,
    size_t maxSummaryLen
) {
    if (!ctx) return OUI_VALIDATOR_ERR_INVALID_PARAM;
    auto* engine = static_cast<OuiValidatorEngine*>(ctx);
    std::string report = engine->serializeReportJson();

    if (outputPath && std::strlen(outputPath) > 0) {
        std::ofstream out(outputPath);
        if (out.is_open()) {
            out << report;
            out.close();
        }
    }

    if (outJsonSummary && maxSummaryLen > 0) {
        std::strncpy(outJsonSummary, report.c_str(), maxSummaryLen - 1);
        outJsonSummary[maxSummaryLen - 1] = '\0';
    }

    return OUI_VALIDATOR_OK;
}

OUI_VALIDATOR_API int OuiValidator_ValidateOuiIntegrity(
    HOuiValidator ctx,
    const char* repairLogPath,
    char* outRepairJson,
    size_t maxLen
) {
    if (!ctx) return OUI_VALIDATOR_ERR_INVALID_PARAM;
    auto* engine = static_cast<OuiValidatorEngine*>(ctx);
    std::string outStr;
    std::string logPath = repairLogPath ? repairLogPath : "repair_log.json";
    int discCount = engine->validateOuiIntegrity(logPath, outStr);

    if (outRepairJson && maxLen > 0) {
        std::strncpy(outRepairJson, outStr.c_str(), maxLen - 1);
        outRepairJson[maxLen - 1] = '\0';
    }

    return discCount;
}
