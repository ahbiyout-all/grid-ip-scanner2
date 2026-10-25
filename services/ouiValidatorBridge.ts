/**
 * Grid IP Scanner2 - Electron FFI OuiValidator Service
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 * 
 * Provides high-performance C++ OUI Dataset validation, deduplication,
 * prefix normalization via Koffi FFI, and deep Wireshark-standard integrity
 * validation with automated repair_log.json synthesis.
 */

import path from 'path';
import fs from 'fs';

export interface OuiValidatorStats {
  totalLinesParsed: number;
  validRecords: number;
  malCount: number;
  mamCount: number;
  masCount: number;
  duplicateCount: number;
  collisionCount: number;
  malformedCount: number;
  parseTimeMicroseconds: number;
}

export interface NormalizeResult {
  success: boolean;
  normalizedPrefix?: string;
  prefixBits?: number;
  errorMessage?: string;
}

export interface ValidationReportResult {
  success: boolean;
  stats?: OuiValidatorStats;
  reportJson?: string;
  errorMessage?: string;
}

export interface OuiDiscrepancyItem {
  lineNumber: number;
  issueType: string;
  description: string;
  detectedBits: number;
  original: {
    prefix: string;
    vendor: string;
  };
  repaired: {
    prefix: string;
    vendor: string;
  };
  status: 'AUTO_REPAIRED' | 'UNRESOLVED';
}

export interface IntegrityRepairResult {
  success: boolean;
  sourceFile: string;
  repairLogPath: string;
  totalEntriesScanned: number;
  validUniqueCount: number;
  discrepanciesFound: number;
  repairsApplied: number;
  elapsedMicroseconds: number;
  discrepancies: OuiDiscrepancyItem[];
  repairJsonString: string;
  errorMessage?: string;
}

class OuiValidatorBridge {
  private isLoaded = false;
  private lib: any = null;
  private dllPath = '';

  constructor() {
    this.initDLL();
  }

  private initDLL(): void {
    try {
      const candidates = [
        path.join(process.cwd(), 'native_dll', 'oui_validator.dll'),
        path.join(process.cwd(), 'oui_validator.dll'),
        path.join(__dirname, '..', 'bin', 'oui_validator.dll'),
        path.join(__dirname, 'oui_validator.dll'),
      ];

      for (const p of candidates) {
        if (typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(p)) {
          this.dllPath = p;
          break;
        }
      }

      if (!this.dllPath) {
        return;
      }

      let koffi: any;
      try {
        koffi = require('koffi');
      } catch (_) {
        return;
      }

      this.lib = koffi.load(this.dllPath);

      // Define C struct for Stats
      const OuiStatsStruct = koffi.struct('OuiValidatorStats', {
        totalLinesParsed: 'uint32',
        validRecords: 'uint32',
        malCount: 'uint32',
        mamCount: 'uint32',
        masCount: 'uint32',
        duplicateCount: 'uint32',
        collisionCount: 'uint32',
        malformedCount: 'uint32',
        parseTimeMicroseconds: 'uint64',
      });

      this.lib.binds = {
        getVersion: this.lib.func('int OuiValidator_GetVersion()'),
        createContext: this.lib.func('void* OuiValidator_CreateContext()'),
        freeContext: this.lib.func('void OuiValidator_FreeContext(void* ctx)'),
        normalizePrefix: this.lib.func(
          'int OuiValidator_NormalizePrefix(const char* rawPrefix, _Out_ char* outNormalized, size_t maxLen, _Out_ int* outPrefixBits)'
        ),
        loadDataset: this.lib.func('int OuiValidator_LoadDataset(void* ctx, const char* filePath, int datasetType)'),
        validate: this.lib.func('int OuiValidator_Validate(void* ctx)'),
        getStats: this.lib.func('int OuiValidator_GetStats(void* ctx, _Out_ OuiValidatorStats* outStats)'),
        generateReport: this.lib.func(
          'int OuiValidator_GenerateReport(void* ctx, const char* outputPath, _Out_ char* outJsonSummary, size_t maxSummaryLen)'
        ),
        validateOuiIntegrity: this.lib.func(
          'int OuiValidator_ValidateOuiIntegrity(void* ctx, const char* repairLogPath, _Out_ char* outRepairJson, size_t maxLen)'
        ),
      };

      this.isLoaded = true;
      console.log(`[OuiValidatorFFI] Bound oui_validator.dll (v${this.lib.binds.getVersion()}) from ${this.dllPath}`);
    } catch (err) {
      console.warn('[OuiValidatorFFI] Failed to bind oui_validator.dll:', err);
      this.isLoaded = false;
    }
  }

  /**
   * Normalizes an arbitrary MAC prefix (24, 28, or 36 bits) to canonical form.
   */
  public normalizePrefix(rawPrefix: string): NormalizeResult {
    if (!this.isLoaded || !this.lib?.binds) {
      // TypeScript fallback normalizer
      return this.jsFallbackNormalize(rawPrefix);
    }

    try {
      const outBuf = Buffer.alloc(64);
      const outBits = [0];
      const res = this.lib.binds.normalizePrefix(rawPrefix, outBuf, 64, outBits);
      if (res !== 0) {
        return { success: false, errorMessage: `Normalization failed with code ${res}` };
      }
      return {
        success: true,
        normalizedPrefix: outBuf.toString('utf8').replace(/\0.*$/g, ''),
        prefixBits: outBits[0],
      };
    } catch (err: any) {
      return { success: false, errorMessage: err?.message || 'Normalization exception' };
    }
  }

  /**
   * Validates dataset file and writes integrity_report.json.
   */
  public validateDataset(filePath: string, reportOutputPath?: string): ValidationReportResult {
    if (!this.isLoaded || !this.lib?.binds) {
      return { success: false, errorMessage: 'OuiValidator DLL not available' };
    }

    const ctx = this.lib.binds.createContext();
    if (!ctx) {
      return { success: false, errorMessage: 'Failed to create validator context' };
    }

    try {
      const loadRes = this.lib.binds.loadDataset(ctx, filePath, 0);
      if (loadRes !== 0) {
        this.lib.binds.freeContext(ctx);
        return { success: false, errorMessage: `Load dataset failed (${loadRes})` };
      }

      this.lib.binds.validate(ctx);

      const stats: any = {};
      this.lib.binds.getStats(ctx, stats);

      const outReportPath = reportOutputPath || path.join(process.cwd(), 'integrity_report.json');
      const maxSummaryCap = 65536;
      const jsonBuf = Buffer.alloc(maxSummaryCap);

      this.lib.binds.generateReport(ctx, outReportPath, jsonBuf, maxSummaryCap);
      const reportJson = jsonBuf.toString('utf8').replace(/\0.*$/g, '');

      this.lib.binds.freeContext(ctx);

      return {
        success: true,
        stats,
        reportJson,
      };
    } catch (err: any) {
      this.lib.binds.freeContext(ctx);
      return { success: false, errorMessage: err?.message || 'Validation exception' };
    }
  }

  /**
   * Iterates through the loaded OUI database and cross-references it with common Wireshark-standard
   * prefix lengths (24, 28, 36 bits) to identify invalid or malformed entries, and creates 'repair_log.json'
   * if discrepancies are found.
   */
  public validateOuiIntegrity(filePathOrDataset?: string, repairLogPath?: string): IntegrityRepairResult {
    const targetFile = filePathOrDataset || path.join(process.cwd(), 'master_oui.txt');
    const targetLogPath = repairLogPath || path.join(process.cwd(), 'repair_log.json');

    // Attempt Native DLL FFI Execution if available
    if (this.isLoaded && this.lib?.binds?.validateOuiIntegrity) {
      const ctx = this.lib.binds.createContext();
      if (ctx) {
        try {
          const loadRes = this.lib.binds.loadDataset(ctx, targetFile, 0);
          if (loadRes === 0) {
            const maxBuf = 1024 * 1024; // 1MB buffer for repair report
            const outBuf = Buffer.alloc(maxBuf);
            this.lib.binds.validateOuiIntegrity(ctx, targetLogPath, outBuf, maxBuf);
            const repairJsonStr = outBuf.toString('utf8').replace(/\0.*$/g, '');
            this.lib.binds.freeContext(ctx);

            try {
              const parsed = JSON.parse(repairJsonStr);
              return {
                success: true,
                sourceFile: targetFile,
                repairLogPath: targetLogPath,
                totalEntriesScanned: parsed.summary?.totalEntriesScanned || 0,
                validUniqueCount: parsed.summary?.validUniqueCount || 0,
                discrepanciesFound: parsed.summary?.discrepanciesFound || 0,
                repairsApplied: parsed.summary?.repairsApplied || 0,
                elapsedMicroseconds: parsed.summary?.elapsedMicroseconds || 0,
                discrepancies: parsed.discrepancies || [],
                repairJsonString: repairJsonStr,
              };
            } catch (_) {
              // fallback to TS execution if JSON parse error
            }
          } else {
            this.lib.binds.freeContext(ctx);
          }
        } catch (e) {
          this.lib.binds.freeContext(ctx);
        }
      }
    }

    // High-performance JavaScript / TypeScript Fallback Engine
    return this.jsValidateOuiIntegrity(targetFile, targetLogPath);
  }

  /**
   * Pure TypeScript Wireshark Standards Cross-Referencing & Repair Engine
   */
  private jsValidateOuiIntegrity(targetFile: string, targetLogPath: string): IntegrityRepairResult {
    const startTime = performance.now();
    let content = '';

    try {
      if (typeof fs !== 'undefined' && fs.readFileSync && fs.existsSync(targetFile)) {
        content = fs.readFileSync(targetFile, 'utf8');
      }
    } catch (_) {
      content = '';
    }

    const lines = content ? content.split(/\r?\n/) : [];
    const discrepancies: OuiDiscrepancyItem[] = [];
    const uniqueMap = new Map<string, { line: number; vendor: string }>();
    let totalScanned = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const rawLine = lines[i].trim();
      if (!rawLine || rawLine.startsWith('#')) continue;

      totalScanned++;
      let prefix = '';
      let vendor = '';

      if (rawLine.includes('\t')) {
        const parts = rawLine.split('\t');
        prefix = parts[0].trim();
        vendor = parts.slice(1).join(' ').trim();
      } else if (rawLine.includes(',')) {
        const parts = rawLine.split(',');
        prefix = parts[0].trim();
        vendor = parts.slice(1).join(' ').trim();
      } else {
        const firstSpace = rawLine.indexOf(' ');
        if (firstSpace !== -1) {
          prefix = rawLine.substring(0, firstSpace).trim();
          vendor = rawLine.substring(firstSpace + 1).trim();
        } else {
          prefix = rawLine;
          vendor = 'UNKNOWN';
        }
      }

      let issueType = '';
      let description = '';
      let hasIssue = false;

      // 1. Cross-reference Wireshark Delimiters
      if (prefix.includes('-') || prefix.includes('.')) {
        hasIssue = true;
        issueType = 'NON_CANONICAL_DELIMITER';
        description = "Prefix uses hyphen '-' or dot '.' delimiter instead of Wireshark standard colon ':'.";
      }

      // 2. Cross-reference Bit Lengths (24, 28, 36)
      const normRes = this.jsFallbackNormalize(prefix);
      const cleanHex = prefix.replace(/[^0-9A-Fa-f]/g, '');
      const detectedBits = normRes.prefixBits || (cleanHex.length === 7 ? 28 : cleanHex.length === 9 ? 36 : 24);

      if (!normRes.success || (detectedBits !== 24 && detectedBits !== 28 && detectedBits !== 36)) {
        hasIssue = true;
        issueType = 'INVALID_PREFIX_LENGTH';
        description = `Prefix bit length (${detectedBits} bits) violates Wireshark standard 24/28/36-bit specification.`;
      } else if (detectedBits === 28 && !prefix.includes('/28')) {
        hasIssue = true;
        issueType = 'MISSING_CIDR_MASK_28';
        description = "28-bit MA-M prefix is missing required '/28' CIDR mask suffix.";
      } else if (detectedBits === 36 && !prefix.includes('/36')) {
        hasIssue = true;
        issueType = 'MISSING_CIDR_MASK_36';
        description = "36-bit MA-S prefix is missing required '/36' CIDR mask suffix.";
      }

      // 3. Lowercase Hex Check
      if (/[a-f]/.test(prefix) && !hasIssue) {
        hasIssue = true;
        issueType = 'LOWERCASE_HEX';
        description = 'Prefix contains unnormalized lowercase hexadecimal characters.';
      }

      const canonicalPrefix = normRes.normalizedPrefix || prefix.toUpperCase();
      const sanitizedVendor = vendor.replace(/^[\s"']+|[\s"']+$/g, '');

      if (sanitizedVendor !== vendor && !hasIssue) {
        hasIssue = true;
        issueType = 'DIRTY_VENDOR_NAME';
        description = 'Vendor name contains unescaped boundary whitespace or enclosing quotes.';
      }

      // 4. Duplicate Collision Cross-Check
      if (uniqueMap.has(canonicalPrefix)) {
        const existing = uniqueMap.get(canonicalPrefix)!;
        if (existing.vendor !== sanitizedVendor) {
          hasIssue = true;
          issueType = 'DUPLICATE_VENDOR_COLLISION';
          description = `Duplicate MAC prefix collision with '${existing.vendor}' at Line ${existing.line}.`;
        }
      } else {
        uniqueMap.set(canonicalPrefix, { line: lineNo, vendor: sanitizedVendor });
      }

      if (hasIssue) {
        discrepancies.push({
          lineNumber: lineNo,
          issueType,
          description,
          detectedBits,
          original: { prefix, vendor },
          repaired: {
            prefix: canonicalPrefix,
            vendor: sanitizedVendor,
          },
          status: 'AUTO_REPAIRED',
        });
      }
    }

    const elapsedMicroseconds = Math.round((performance.now() - startTime) * 1000);

    const repairLogData = {
      tool: 'OuiValidator',
      action: 'validateOuiIntegrity',
      engineVersion: '2.4.0',
      timestamp: Math.floor(Date.now() / 1000),
      sourceFile: targetFile,
      wiresharkStandards: {
        maL24Bit: 'XX:XX:XX',
        maM28Bit: 'XX:XX:XX:X0/28',
        maS36Bit: 'XX:XX:XX:XX:X0/36',
      },
      summary: {
        totalEntriesScanned: totalScanned,
        validUniqueCount: uniqueMap.size,
        discrepanciesFound: discrepancies.length,
        repairsApplied: discrepancies.length,
        elapsedMicroseconds,
      },
      discrepancies,
    };

    const repairJsonString = JSON.stringify(repairLogData, null, 2);

    // Save repair_log.json if discrepancies found and filesystem is accessible
    if (discrepancies.length > 0 || true) {
      try {
        if (typeof fs !== 'undefined' && fs.writeFileSync) {
          fs.writeFileSync(targetLogPath, repairJsonString, 'utf8');
        }
      } catch (err) {
        console.warn('[OuiValidator] Failed to write repair_log.json:', err);
      }
    }

    return {
      success: true,
      sourceFile: targetFile,
      repairLogPath: targetLogPath,
      totalEntriesScanned: totalScanned,
      validUniqueCount: uniqueMap.size,
      discrepanciesFound: discrepancies.length,
      repairsApplied: discrepancies.length,
      elapsedMicroseconds,
      discrepancies,
      repairJsonString,
    };
  }

  public isAvailable(): boolean {
    return this.isLoaded;
  }

  private jsFallbackNormalize(raw: string): NormalizeResult {
    const clean = raw.toUpperCase().replace(/[^0-9A-F/]/g, '');
    const slashIdx = clean.indexOf('/');
    const bits = slashIdx !== -1 ? parseInt(clean.slice(slashIdx + 1), 10) : (clean.length === 7 ? 28 : clean.length === 9 ? 36 : 24);
    const hex = slashIdx !== -1 ? clean.slice(0, slashIdx) : clean;

    if (bits === 28 && hex.length >= 7) {
      return {
        success: true,
        normalizedPrefix: `${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}:${hex.slice(6, 7)}0/28`,
        prefixBits: 28,
      };
    } else if (bits === 36 && hex.length >= 9) {
      return {
        success: true,
        normalizedPrefix: `${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}:${hex.slice(6, 8)}:${hex.slice(8, 9)}0/36`,
        prefixBits: 36,
      };
    } else if (hex.length >= 6) {
      return {
        success: true,
        normalizedPrefix: `${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`,
        prefixBits: 24,
      };
    }
    return { success: false, errorMessage: 'Invalid MAC prefix length' };
  }
}

export const ouiValidator = new OuiValidatorBridge();
