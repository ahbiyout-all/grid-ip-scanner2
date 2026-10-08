/**
 * Grid IP Scanner2 - Electron Main Process OuiValidator IPC Handlers
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import { ipcMain } from 'electron';
import { ouiValidator } from '../services/ouiValidatorBridge';

export function registerOuiValidatorIPCHandlers(): void {
  // IPC Handler: Normalize MAC prefix
  ipcMain.handle('oui:normalizePrefix', async (_event, { prefix }: { prefix: string }) => {
    return ouiValidator.normalizePrefix(prefix);
  });

  // IPC Handler: Validate OUI Dataset & Output integrity_report.json
  ipcMain.handle('oui:validateDataset', async (_event, { filePath, reportOutputPath }: { filePath: string; reportOutputPath?: string }) => {
    return ouiValidator.validateDataset(filePath, reportOutputPath);
  });

  // IPC Handler: Validate OUI Integrity against Wireshark Standards & Output repair_log.json
  ipcMain.handle('oui:validateOuiIntegrity', async (_event, { filePath, repairLogPath }: { filePath?: string; repairLogPath?: string } = {}) => {
    return ouiValidator.validateOuiIntegrity(filePath, repairLogPath);
  });

  // IPC Handler: Check DLL status
  ipcMain.handle('oui:status', async () => {
    return {
      available: ouiValidator.isAvailable(),
      driver: 'oui_validator.dll',
    };
  });
}
