/**
 * Grid IP Scanner2 - Electron Main Process Vault IPC Handlers
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import { ipcMain } from 'electron';
import { electronVault } from '../services/electronVaultBridge';
import { DeviceAlias, ScanSnapshot } from '../types';

export function registerVaultIPCHandlers(): void {
  // IPC Handler: Memory string encryption
  ipcMain.handle('vault:encrypt', async (_event, { text, passphrase }: { text: string; passphrase?: string }) => {
    return electronVault.encrypt(text, passphrase);
  });

  // IPC Handler: Memory string decryption
  ipcMain.handle('vault:decrypt', async (_event, { ciphertext, passphrase }: { ciphertext: string; passphrase?: string }) => {
    return electronVault.decrypt(ciphertext, passphrase);
  });

  // IPC Handler: Write encrypted vault file
  ipcMain.handle('vault:writeEncryptedFile', async (_event, { filePath, content, passphrase }: { filePath: string; content: string; passphrase?: string }) => {
    return electronVault.writeEncryptedFile(filePath, content, passphrase);
  });

  // IPC Handler: Read encrypted vault file
  ipcMain.handle('vault:readEncryptedFile', async (_event, { filePath, passphrase }: { filePath: string; passphrase?: string }) => {
    return electronVault.readEncryptedFile(filePath, passphrase);
  });

  // IPC Handler: Encrypt and persist Device Aliases
  ipcMain.handle('vault:encryptDeviceAliases', async (_event, { aliases, filePath, passphrase }: { aliases: DeviceAlias[]; filePath?: string; passphrase?: string }) => {
    return electronVault.encryptDeviceAliases(aliases, filePath, passphrase);
  });

  // IPC Handler: Decrypt and load Device Aliases
  ipcMain.handle('vault:decryptDeviceAliases', async (_event, { filePath, passphrase }: { filePath?: string; passphrase?: string } = {}) => {
    return electronVault.decryptDeviceAliases(filePath, passphrase);
  });

  // IPC Handler: Encrypt and persist Network Snapshot
  ipcMain.handle('vault:encryptSnapshot', async (_event, { snapshot, filePath, passphrase }: { snapshot: ScanSnapshot; filePath?: string; passphrase?: string }) => {
    return electronVault.encryptSnapshot(snapshot, filePath, passphrase);
  });

  // IPC Handler: Decrypt and load Network Snapshot
  ipcMain.handle('vault:decryptSnapshot', async (_event, { filePath, passphrase }: { filePath: string; passphrase?: string }) => {
    return electronVault.decryptSnapshot(filePath, passphrase);
  });

  // IPC Handler: Check DLL status
  ipcMain.handle('vault:status', async () => {
    return {
      available: electronVault.isAvailable(),
      driver: 'grid_vault_driver.dll',
    };
  });
}
