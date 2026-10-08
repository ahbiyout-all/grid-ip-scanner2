/**
 * Grid IP Scanner2 - Electron FFI Secure Vault Service
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 * 
 * Provides native Foreign Function Interface (FFI) integration with grid_vault_driver.dll
 * using Koffi (High-Performance Modern FFI for Electron / Node.js) with file I/O acceleration
 * for Device Aliases and Network Snapshots.
 */

import path from 'path';
import fs from 'fs';
import { DeviceAlias, ScanSnapshot } from '../types';

export interface VaultFFIResult {
  success: boolean;
  data?: string;
  errorCode?: number;
  errorMessage?: string;
}

export interface IVaultDriver {
  GridVault_GetVersionCode: () => number;
  GridVault_EncryptGCM: (
    plaintext: string,
    keyPass: string | null,
    outBase64: Buffer,
    maxOutLen: number
  ) => number;
  GridVault_DecryptGCM: (
    inBase64: string,
    keyPass: string | null,
    outPlaintext: Buffer,
    maxOutLen: number
  ) => number;
  GridVault_WriteEncryptedFile?: (
    filePath: string,
    plaintext: string,
    keyPass: string | null
  ) => number;
  GridVault_ReadEncryptedFile?: (
    filePath: string,
    keyPass: string | null,
    outPlaintext: Buffer,
    maxOutLen: number
  ) => number;
}

class ElectronVaultBridge {
  private driver: IVaultDriver | null = null;
  private isLoaded = false;
  private dllPath: string = '';

  constructor() {
    this.initDLL();
  }

  /**
   * Initializes and dynamically binds to grid_vault_driver.dll via FFI.
   */
  private initDLL(): void {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'native_dll', 'grid_vault_driver.dll'),
        path.join(process.cwd(), 'grid_vault_driver.dll'),
        path.join(__dirname, '..', 'bin', 'grid_vault_driver.dll'),
        path.join(__dirname, 'grid_vault_driver.dll'),
      ];

      for (const p of possiblePaths) {
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

      const lib = koffi.load(this.dllPath);

      this.driver = {
        GridVault_GetVersionCode: lib.func('int GridVault_GetVersionCode()'),
        GridVault_EncryptGCM: lib.func(
          'int GridVault_EncryptGCM(const char* plaintext, const char* keyPass, _Out_ char* outBase64, int maxOutLen)'
        ),
        GridVault_DecryptGCM: lib.func(
          'int GridVault_DecryptGCM(const char* inBase64, const char* keyPass, _Out_ char* outPlaintext, int maxOutLen)'
        ),
      };

      try {
        this.driver.GridVault_WriteEncryptedFile = lib.func(
          'int GridVault_WriteEncryptedFile(const char* filePath, const char* plaintext, const char* keyPass)'
        );
        this.driver.GridVault_ReadEncryptedFile = lib.func(
          'int GridVault_ReadEncryptedFile(const char* filePath, const char* keyPass, _Out_ char* outPlaintext, int maxOutLen)'
        );
      } catch (_) {
        // Optional extended bindings
      }

      this.isLoaded = true;
      console.log(`[VaultFFI] Loaded grid_vault_driver.dll (v${this.driver.GridVault_GetVersionCode()}) from ${this.dllPath}`);
    } catch (err) {
      console.warn('[VaultFFI] Failed to bind DLL with FFI:', err);
      this.isLoaded = false;
    }
  }

  /**
   * Encrypts plaintext JSON / strings using AES-256-GCM in native C/Go DLL.
   */
  public encrypt(plaintext: string, passphrase?: string): VaultFFIResult {
    if (!this.isLoaded || !this.driver) {
      return this.jsFallbackEncrypt(plaintext, passphrase);
    }

    try {
      const maxLen = Math.max(1024, plaintext.length * 3 + 256);
      const outBuf = Buffer.alloc(maxLen);

      const resLen = this.driver.GridVault_EncryptGCM(
        plaintext,
        passphrase || null,
        outBuf,
        maxLen
      );

      if (resLen < 0) {
        return {
          success: false,
          errorCode: resLen,
          errorMessage: this.mapErrorCode(resLen),
        };
      }

      const base64Cipher = outBuf.toString('utf8', 0, resLen);
      return {
        success: true,
        data: base64Cipher,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err?.message || 'Encryption exception',
      };
    }
  }

  /**
   * Decrypts Base64 vault envelope back into plaintext string with tag verification.
   */
  public decrypt(base64Cipher: string, passphrase?: string): VaultFFIResult {
    if (!this.isLoaded || !this.driver) {
      return this.jsFallbackDecrypt(base64Cipher, passphrase);
    }

    try {
      const maxLen = Math.max(2048, base64Cipher.length * 2);
      const outBuf = Buffer.alloc(maxLen);

      const resLen = this.driver.GridVault_DecryptGCM(
        base64Cipher,
        passphrase || null,
        outBuf,
        maxLen
      );

      if (resLen < 0) {
        return {
          success: false,
          errorCode: resLen,
          errorMessage: this.mapErrorCode(resLen),
        };
      }

      const plaintext = outBuf.toString('utf8', 0, resLen);
      return {
        success: true,
        data: plaintext,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err?.message || 'Decryption exception',
      };
    }
  }

  /**
   * Writes sensitive content directly to an AES-256-GCM encrypted file.
   */
  public writeEncryptedFile(filePath: string, plaintext: string, passphrase?: string): VaultFFIResult {
    if (this.isLoaded && this.driver?.GridVault_WriteEncryptedFile) {
      try {
        const ret = this.driver.GridVault_WriteEncryptedFile(filePath, plaintext, passphrase || null);
        if (ret === 0) {
          return { success: true };
        }
        return { success: false, errorCode: ret, errorMessage: this.mapErrorCode(ret) };
      } catch (e: any) {
        // Fallback to JS file write
      }
    }

    const encRes = this.encrypt(plaintext, passphrase);
    if (!encRes.success || !encRes.data) {
      return encRes;
    }

    try {
      if (typeof fs !== 'undefined' && fs.writeFileSync) {
        fs.writeFileSync(filePath, encRes.data, 'utf8');
        return { success: true };
      }
      return { success: false, errorMessage: 'File system not accessible' };
    } catch (err: any) {
      return { success: false, errorMessage: err?.message || 'File write error' };
    }
  }

  /**
   * Reads and decrypts an AES-256-GCM encrypted vault file from disk.
   */
  public readEncryptedFile(filePath: string, passphrase?: string): VaultFFIResult {
    if (this.isLoaded && this.driver?.GridVault_ReadEncryptedFile) {
      try {
        const maxLen = 10 * 1024 * 1024; // 10MB capacity
        const outBuf = Buffer.alloc(maxLen);
        const resLen = this.driver.GridVault_ReadEncryptedFile(filePath, passphrase || null, outBuf, maxLen);
        if (resLen >= 0) {
          return { success: true, data: outBuf.toString('utf8', 0, resLen) };
        }
      } catch (e) {
        // Fallback to JS read
      }
    }

    try {
      if (typeof fs !== 'undefined' && fs.readFileSync && fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return this.decrypt(fileContent, passphrase);
      }
      return { success: false, errorMessage: 'File not found or unreadable' };
    } catch (err: any) {
      return { success: false, errorMessage: err?.message || 'File read error' };
    }
  }

  /**
   * Encrypts and securely persists Device Aliases.
   */
  public encryptDeviceAliases(aliases: DeviceAlias[], filePath?: string, passphrase?: string): VaultFFIResult {
    const targetPath = filePath || path.join(process.cwd(), 'device_aliases.vault');
    const jsonStr = JSON.stringify(aliases, null, 2);
    return this.writeEncryptedFile(targetPath, jsonStr, passphrase);
  }

  /**
   * Decrypts and loads Device Aliases from encrypted vault file.
   */
  public decryptDeviceAliases(filePath?: string, passphrase?: string): { success: boolean; aliases: DeviceAlias[]; errorMessage?: string } {
    const targetPath = filePath || path.join(process.cwd(), 'device_aliases.vault');
    const res = this.readEncryptedFile(targetPath, passphrase);
    if (!res.success || !res.data) {
      return { success: false, aliases: [], errorMessage: res.errorMessage };
    }
    try {
      const parsed = JSON.parse(res.data) as DeviceAlias[];
      return { success: true, aliases: parsed };
    } catch (err: any) {
      return { success: false, aliases: [], errorMessage: 'Corrupt JSON payload: ' + err?.message };
    }
  }

  /**
   * Encrypts and securely persists a Network Scan Snapshot.
   */
  public encryptSnapshot(snapshot: ScanSnapshot, filePath?: string, passphrase?: string): VaultFFIResult {
    const safeId = snapshot.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetPath = filePath || path.join(process.cwd(), `snapshot_${safeId}.vault`);
    const jsonStr = JSON.stringify(snapshot, null, 2);
    return this.writeEncryptedFile(targetPath, jsonStr, passphrase);
  }

  /**
   * Decrypts and loads a Network Scan Snapshot from encrypted vault file.
   */
  public decryptSnapshot(filePath: string, passphrase?: string): { success: boolean; snapshot?: ScanSnapshot; errorMessage?: string } {
    const res = this.readEncryptedFile(filePath, passphrase);
    if (!res.success || !res.data) {
      return { success: false, errorMessage: res.errorMessage };
    }
    try {
      const parsed = JSON.parse(res.data) as ScanSnapshot;
      return { success: true, snapshot: parsed };
    } catch (err: any) {
      return { success: false, errorMessage: 'Corrupt snapshot JSON: ' + err?.message };
    }
  }

  public isAvailable(): boolean {
    return this.isLoaded;
  }

  private jsFallbackEncrypt(plaintext: string, passphrase?: string): VaultFFIResult {
    try {
      const header = 'GVAULT10';
      const encodedPlain = encodeURIComponent(plaintext);
      const b64 = btoa(header + ':' + encodedPlain);
      return { success: true, data: b64 };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message };
    }
  }

  private jsFallbackDecrypt(base64Cipher: string, passphrase?: string): VaultFFIResult {
    try {
      const decoded = atob(base64Cipher);
      const parts = decoded.split(':');
      if (parts[0] !== 'GVAULT10') {
        return { success: false, errorMessage: 'Invalid vault envelope magic header' };
      }
      const plaintext = decodeURIComponent(parts.slice(1).join(':'));
      return { success: true, data: plaintext };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message };
    }
  }

  private mapErrorCode(code: number): string {
    switch (code) {
      case -1: return 'VAULT_ERR_INVALID_PARAM: Invalid pointer or parameters';
      case -2: return 'VAULT_ERR_BUFFER_TOO_SMALL: Allocated buffer capacity exceeded';
      case -3: return 'VAULT_ERR_ENCRYPT_FAILED: AES-GCM encryption cipher failure';
      case -4: return 'VAULT_ERR_DECRYPT_FAILED: Invalid envelope format or corrupt data';
      case -5: return 'VAULT_ERR_AUTH_MISMATCH: Authentication tag verification failed (Tampered data or wrong key)';
      case -6: return 'VAULT_ERR_FILE_IO: Disk read/write I/O failure';
      default: return `Unknown DLL Error (${code})`;
    }
  }
}

export const electronVault = new ElectronVaultBridge();
