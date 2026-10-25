/**
 * Grid IP Scanner2 - Electron Main Process SecureVault C++ FFI IPC Handlers
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import { ipcMain } from 'electron';
import { secureVault } from '../services/secureVaultBridge';
import { DeviceAlias, ScanSnapshot } from '../types';

export function registerSecureVaultIPCHandlers(): void {
  // IPC Handler: Encrypt Raw Buffer / String Data
  ipcMain.handle('secureVault:encryptData', async (_event, { dataBase64, passphrase }: { dataBase64: string; passphrase?: string }) => {
    const inBuf = Buffer.from(dataBase64, 'base64');
    const res = secureVault.encryptData(inBuf, passphrase);
    if (res.success && res.data) {
      return { success: true, cipherBase64: res.data.toString('base64'), byteLength: res.byteLength };
    }
    return { success: false, errorMessage: res.errorMessage, errorCode: res.errorCode };
  });

  // IPC Handler: Decrypt Raw Buffer / String Data
  ipcMain.handle('secureVault:decryptData', async (_event, { cipherBase64, passphrase }: { cipherBase64: string; passphrase?: string }) => {
    const inBuf = Buffer.from(cipherBase64, 'base64');
    const res = secureVault.decryptData(inBuf, passphrase);
    if (res.success && res.data) {
      return { success: true, plainBase64: res.data.toString('base64'), byteLength: res.byteLength };
    }
    return { success: false, errorMessage: res.errorMessage, errorCode: res.errorCode };
  });

  // IPC Handler: Save Encrypted Device Aliases
  ipcMain.handle('secureVault:saveAliases', async (_event, { aliases, filePath, passphrase }: { aliases: DeviceAlias[]; filePath: string; passphrase?: string }) => {
    return secureVault.saveEncryptedAliases(aliases, filePath, passphrase);
  });

  // IPC Handler: Load Encrypted Device Aliases
  ipcMain.handle('secureVault:loadAliases', async (_event, { filePath, passphrase }: { filePath: string; passphrase?: string }) => {
    return secureVault.loadEncryptedAliases(filePath, passphrase);
  });

  // IPC Handler: Save Encrypted Network Snapshot
  ipcMain.handle('secureVault:saveSnapshot', async (_event, { snapshot, filePath, passphrase }: { snapshot: ScanSnapshot; filePath: string; passphrase?: string }) => {
    return secureVault.saveEncryptedSnapshot(snapshot, filePath, passphrase);
  });

  // IPC Handler: Load Encrypted Network Snapshot
  ipcMain.handle('secureVault:loadSnapshot', async (_event, { filePath, passphrase }: { filePath: string; passphrase?: string }) => {
    return secureVault.loadEncryptedSnapshot(filePath, passphrase);
  });

  // IPC Handler: Get Driver & FFI Engine Status
  ipcMain.handle('secureVault:status', async () => {
    return secureVault.getStatus();
  });
}
