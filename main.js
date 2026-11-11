const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let currentContextMenu = null;
let isQuitting = false;
let isExplicitExit = false;
let closeToTrayEnabled = true;

function showTrayBalloon(title, content) {
  try {
    if (tray && tray.displayBalloon) {
      tray.displayBalloon({
        title: title || 'Grid IP Scanner2',
        content: content || '24/7 백그라운드 침입 감시 가동 중'
      });
    }
  } catch (e) {
    console.warn('Failed to display tray balloon:', e);
  }
}

// Set userData to a temporary directory to leave no traces
const tempUserData = path.join(app.getPath('temp'), `grid_ip_scanner_electron_${Date.now()}`);
app.setPath('userData', tempUserData);

// Disable Chromium translation prompts and force Korean locale
app.commandLine.appendSwitch('disable-features', 'Translate');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('lang', 'ko');

function getIconPath() {
  const candidates = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, 'icon_256.png'),
    path.join(__dirname, 'Grid IP Scanner2.png'),
    path.join(__dirname, 'icon.ico')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'icon.ico');
}

function sendToMainWindow(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send(channel, ...args);
    }
  } catch (err) {
    console.warn(`Failed to send IPC message [${channel}] to mainWindow:`, err);
  }
}

function createTray() {
  if (tray) return;

  const iconPath = getIconPath();
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? iconPath : icon);
  tray.setToolTip('Grid IP Scanner2 - 24/7 백그라운드 침입 감시 & 스케줄러 가동 중');

  currentContextMenu = Menu.buildFromTemplate([
    {
      label: '🌐 Grid IP Scanner2 메인 화면 열기',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      id: 'tray-status-tooltip-item',
      label: '💬 상태: 📌 대기 중 (Ready)',
      enabled: false
    },
    { type: 'separator' },
    {
      id: 'intruder-watch-item',
      label: '🚨 24/7 백그라운드 침입 감시 (Enable Intruder Watch)',
      type: 'checkbox',
      checked: true,
      click: (item) => {
        sendToMainWindow('tray-toggle-intruder', item.checked);
      }
    },
    {
      id: 'toggle-scan-item',
      label: '⚡ 그리드 네트워크 스캔 시작 (Toggle Scan Mode)',
      click: () => {
        sendToMainWindow('tray-toggle-scan');
      }
    },
    {
      id: 'show-intruder-log-item',
      label: '📜 낯선 기기 감시 로그 열기 (Show Intruder Log)',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          sendToMainWindow('tray-open-intruder-log');
        } else {
          createWindow();
          mainWindow.once('ready-to-show', () => {
            sendToMainWindow('tray-open-intruder-log');
          });
        }
      }
    },
    {
      label: '🧹 DNS 캐시 플러시 (ipconfig /flushdns)',
      click: () => {
        require('child_process').exec('ipconfig /flushdns', { windowsHide: true });
        if (tray && tray.displayBalloon) {
          tray.displayBalloon({
            title: 'Grid IP Scanner2',
            content: 'DNS 캐시가 성공적으로 초기화되었습니다.'
          });
        }
      }
    },
    {
      label: '⚙️ Windows 네트워크 어댑터 제어판 (ncpa.cpl)',
      click: () => {
        require('child_process').exec('control.exe ncpa.cpl', { windowsHide: true });
      }
    },
    { type: 'separator' },
    {
      id: 'exit-application-item',
      label: '🛑 애플리케이션 완전 종료 (Exit Application)',
      click: () => {
        terminateApplicationCleanly();
      }
    }
  ]);

  tray.setContextMenu(currentContextMenu);

  const restoreWindow = () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  };

  tray.on('double-click', restoreWindow);
  tray.on('click', restoreWindow);

  // Initial tray balloon notification
  if (tray.displayBalloon) {
    tray.displayBalloon({
      title: 'Grid IP Scanner2 백그라운드 트레이 가동',
      content: '24/7 낯선 기기 침입 감지 및 정기 스캔 스케줄러가 트레이에서 지속 가동됩니다.'
    });
  }
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 950,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "Grid IP Scanner2",
    icon: iconPath,
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error("Failed to load index.html:", err);
  });

  // Close to Tray behavior
  mainWindow.on('close', (event) => {
    if (!isExplicitExit) {
      if (closeToTrayEnabled) {
        event.preventDefault();
        sendToMainWindow('window-hidden-to-tray');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
        showTrayBalloon(
          'Grid IP Scanner2',
          '앱이 시스템 트레이로 최소화되었습니다. 24/7 침입 감시 및 무인 스케줄러가 계속 가동됩니다.'
        );
        return false;
      } else {
        terminateApplicationCleanly();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('set-close-to-tray', (event, val) => {
  closeToTrayEnabled = Boolean(val);
});

ipcMain.handle('get-close-to-tray', () => {
  return closeToTrayEnabled;
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    sendToMainWindow('window-hidden-to-tray');
    mainWindow.hide();
    if (tray && tray.displayBalloon) {
      tray.displayBalloon({
        title: 'Grid IP Scanner2',
        content: '시스템 트레이 영역으로 최소화되었습니다.'
      });
    }
  }
});

ipcMain.on('show-tray-notification', (event, msg) => {
  if (tray && tray.displayBalloon) {
    tray.displayBalloon({
      title: 'Grid IP Scanner2',
      content: msg || '24/7 백그라운드 스캔 상태 업데이트'
    });
  }
});

ipcMain.on('update-tray-status', (event, status) => {
  if (!tray) return;
  const { intruderWatch, isScanning, intruderCount, statusMessage } = status || {};
  let toolTipText = 'Grid IP Scanner2';
  if (statusMessage) {
    toolTipText += ` - ${statusMessage}`;
  } else if (intruderCount && intruderCount > 0) {
    toolTipText += ` - 🚨 미확인 낯선 기기 ${intruderCount}대 감지!`;
  } else if (isScanning) {
    toolTipText += ' - ⚡ 그리드 네트워크 스캔 진행 중...';
  } else if (intruderWatch) {
    toolTipText += ' - 🚨 24/7 백그라운드 침입 감시 가동 중';
  } else {
    toolTipText += ' - 📌 시스템 트레이 대기 중';
  }
  tray.setToolTip(toolTipText);

  if (currentContextMenu) {
    const tooltipItem = currentContextMenu.items.find(i => i.id === 'tray-status-tooltip-item');
    if (tooltipItem) {
      tooltipItem.label = statusMessage ? `💬 툴팁: ${statusMessage}` : '💬 상태: 📌 대기 중 (Ready)';
    }

    if (typeof intruderWatch === 'boolean') {
      const item = currentContextMenu.items.find(i => i.id === 'intruder-watch-item');
      if (item && item.checked !== intruderWatch) {
        item.checked = intruderWatch;
      }
    }

    if (typeof isScanning === 'boolean') {
      const scanItem = currentContextMenu.items.find(i => i.id === 'toggle-scan-item');
      if (scanItem) {
        scanItem.label = isScanning
          ? '⏹️ 그리드 네트워크 스캔 중지 (Stop Scan)'
          : '⚡ 그리드 네트워크 스캔 시작 (Toggle Scan Mode)';
      }
    }

    try {
      tray.setContextMenu(currentContextMenu);
    } catch (_) {}
  }
});

function terminateApplicationCleanly() {
  if (isExplicitExit) return;
  isExplicitExit = true;
  isQuitting = true;

  // 1. Terminate Windows Background Service cleanly if running
  try {
    const cp = require('child_process');
    if (process.platform === 'win32') {
      cp.exec('sc.exe stop GridIPScannerService', { windowsHide: true }, () => {});
    }
  } catch (e) {
    console.warn('Failed to stop GridIPScannerService:', e);
  }

  // 2. Destroy System Tray cleanly
  if (tray) {
    try {
      tray.destroy();
      tray = null;
    } catch (e) {}
  }

  // 3. Cleanly close and destroy main window
  if (mainWindow) {
    try {
      mainWindow.removeAllListeners('close');
      mainWindow.close();
      mainWindow = null;
    } catch (e) {}
  }

  // 4. Clear storage data and temp directory
  if (session.defaultSession) {
    session.defaultSession.clearStorageData().catch(() => {});
    session.defaultSession.clearCache().catch(() => {});
  }

  try {
    if (fs.existsSync(tempUserData)) {
      fs.rmSync(tempUserData, { recursive: true, force: true });
    }
  } catch (e) {}

  setTimeout(() => {
    app.quit();
    process.exit(0);
  }, 200);
}

ipcMain.on('exit-application', () => {
  terminateApplicationCleanly();
});

app.whenReady().then(() => {
  // CRITICAL: Activate System Tray FROM THE BEGINNING (처음부터 시스템 트레이 활성화)
  createTray();

  // Create Main Window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (event) => {
  if (!isExplicitExit && closeToTrayEnabled) {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    showTrayBalloon(
      'Grid IP Scanner2',
      '앱이 시스템 트레이로 최소화되었습니다. 24/7 침입 감시 및 무인 스케줄러가 계속 가동됩니다.'
    );
    return;
  }
  isQuitting = true;
});

app.on('window-all-closed', async () => {
  if (isQuitting || process.platform === 'darwin') {
    if (session.defaultSession) {
      await session.defaultSession.clearStorageData();
      await session.defaultSession.clearCache();
    }
    try {
      if (fs.existsSync(tempUserData)) {
        fs.rmSync(tempUserData, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to cleanup temp userData:", e);
    }
    if (process.platform !== 'darwin') app.quit();
  }
});
