/**
 * Grid IP Scanner2 - Electron Preload Script for Secure Vault Bridge
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DeviceAlias, ScanSnapshot } from '../types';

export interface SecureVaultAPI {
  encrypt: (text: string, passphrase?: string) => Promise<{ success: boolean; data?: string; errorMessage?: string }>;
  decrypt: (ciphertext: string, passphrase?: string) => Promise<{ success: boolean; data?: string; errorMessage?: string }>;
  writeEncryptedFile: (filePath: string, content: string, passphrase?: string) => Promise<{ success: boolean; errorMessage?: string }>;
  readEncryptedFile: (filePath: string, passphrase?: string) => Promise<{ success: boolean; data?: string; errorMessage?: string }>;
  encryptDeviceAliases: (aliases: DeviceAlias[], filePath?: string, passphrase?: string) => Promise<{ success: boolean; errorMessage?: string }>;
  decryptDeviceAliases: (filePath?: string, passphrase?: string) => Promise<{ success: boolean; aliases: DeviceAlias[]; errorMessage?: string }>;
  encryptSnapshot: (snapshot: ScanSnapshot, filePath?: string, passphrase?: string) => Promise<{ success: boolean; errorMessage?: string }>;
  decryptSnapshot: (filePath: string, passphrase?: string) => Promise<{ success: boolean; snapshot?: ScanSnapshot; errorMessage?: string }>;
  status: () => Promise<{ available: boolean; driver: string }>;
}

export const secureVaultAPI: SecureVaultAPI = {
  encrypt: (text: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:encrypt', { text, passphrase }),
  decrypt: (ciphertext: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:decrypt', { ciphertext, passphrase }),
  writeEncryptedFile: (filePath: string, content: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:writeEncryptedFile', { filePath, content, passphrase }),
  readEncryptedFile: (filePath: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:readEncryptedFile', { filePath, passphrase }),
  encryptDeviceAliases: (aliases: DeviceAlias[], filePath?: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:encryptDeviceAliases', { aliases, filePath, passphrase }),
  decryptDeviceAliases: (filePath?: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:decryptDeviceAliases', { filePath, passphrase }),
  encryptSnapshot: (snapshot: ScanSnapshot, filePath?: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:encryptSnapshot', { snapshot, filePath, passphrase }),
  decryptSnapshot: (filePath: string, passphrase?: string) =>
    ipcRenderer.invoke('vault:decryptSnapshot', { filePath, passphrase }),
  status: () =>
    ipcRenderer.invoke('vault:status'),
};

// Expose secureVault to the renderer window object safely
contextBridge.exposeInMainWorld('secureVault', secureVaultAPI);
