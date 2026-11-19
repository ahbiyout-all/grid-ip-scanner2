const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let currentContextMenu = null;
let isQuitting = false;
let isExplicitExit = false;
let closeToTrayEnabled = true;
let lastTrayRestoreAt = 0;

function restoreMainWindow(onReadyCallback) {
  const now = Date.now();
  if (!onReadyCallback && now - lastTrayRestoreAt < 300) {
    return;
  }
  lastTrayRestoreAt = now;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    if (typeof onReadyCallback === 'function') {
      if (mainWindow.webContents && !mainWindow.webContents.isLoading()) {
        onReadyCallback();
      } else {
        mainWindow.once('ready-to-show', onReadyCallback);
      }
    }
  } else {
    createWindow();
    if (typeof onReadyCallback === 'function' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.once('ready-to-show', onReadyCallback);
    }
  }
}

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

// Use a deterministic temp userData path so Chromium's single-instance lock works reliably across launches
const tempUserData = path.join(app.getPath('temp'), 'grid_ip_scanner_electron');
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
        restoreMainWindow();
      }
    },
    {
      id: 'tray-status-tooltip-item',
      label: '💬 상태: 📌 대기 중 (Ready)',
      enabled: false
    },
    {
      id: 'tray-scheduler-status-item',
      label: '⏱️ 스케줄러: 대기 중',
      enabled: false
    },
    { type: 'separator' },
    {
      id: 'intruder-watch-item',
      label: '🚨 24/7 백그라운드 침입 감시 (Enable Intruder Watch)',
      type: 'checkbox',
      checked: false,
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
      id: 'toggle-scheduler-pause-item',
      label: '⏸️ 활성 스케줄러 일시정지 / 재개',
      type: 'checkbox',
      checked: false,
      click: (item) => {
        sendToMainWindow('tray-toggle-scheduler-pause', item.checked);
      }
    },
    {
      id: 'run-schedule-now-item',
      label: '⏭️ 예약 스케줄 즉시 실행',
      click: () => {
        sendToMainWindow('tray-run-schedule-now');
      }
    },
    {
      id: 'toggle-dnd-item',
      label: '🔕 방해금지 모드 (DND)',
      type: 'checkbox',
      checked: false,
      click: (item) => {
        sendToMainWindow('tray-toggle-dnd', item.checked);
      }
    },
    {
      id: 'show-intruder-log-item',
      label: '📜 낯선 기기 감시 로그 열기 (Show Intruder Log)',
      click: () => {
        restoreMainWindow(() => {
          sendToMainWindow('tray-open-intruder-log');
        });
      }
    },
    {
      label: '🧹 DNS 캐시 플러시 (ipconfig /flushdns)',
      click: () => {
        if (process.platform !== 'win32') return;
        require('child_process').exec('ipconfig /flushdns', { windowsHide: true }, (err) => {
          if (err) {
            console.warn('DNS flush failed:', err);
            return;
          }
          if (tray && tray.displayBalloon) {
            tray.displayBalloon({
              title: 'Grid IP Scanner2',
              content: 'DNS 캐시가 성공적으로 초기화되었습니다.'
            });
          }
        });
      }
    },
    {
      label: '⚙️ Windows 네트워크 어댑터 제어판 (ncpa.cpl)',
      click: () => {
        if (process.platform !== 'win32') return;
        require('child_process').exec('control.exe ncpa.cpl', { windowsHide: true }, (err) => {
          if (err) console.warn('Failed to open ncpa.cpl:', err);
        });
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
    restoreMainWindow();
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

function createWindow(showOnStart = true) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (showOnStart) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
    return mainWindow;
  }

  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 950,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: showOnStart,
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
  const distDirResolved = path.resolve(path.join(__dirname, 'dist'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(parsed.toString()).catch((err) => {
          console.warn('Failed to open external URL:', err);
        });
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'file:') {
        const targetFile = path.resolve(decodeURIComponent(parsed.pathname.replace(/^\/([A-Za-z]:)/, '$1')));
        if (targetFile.startsWith(distDirResolved + path.sep) || targetFile === path.resolve(indexPath)) {
          return;
        }
      }
      event.preventDefault();
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(parsed.toString()).catch(() => {});
      }
    } catch (_) {
      event.preventDefault();
    }
  });

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
        event.preventDefault();
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
  const {
    intruderWatch,
    isScanning,
    intruderCount,
    conflictCount,
    statusMessage,
    schedulerPaused,
    activeScheduleCount,
    dndActive
  } = status || {};
  let toolTipText = 'Grid IP Scanner2';
  if (statusMessage) {
    toolTipText += ` - ${statusMessage}`;
  } else if ((intruderCount && intruderCount > 0) || (conflictCount && conflictCount > 0)) {
    toolTipText += ` - 🚨 침입 ${intruderCount || 0}대 · 충돌 ${conflictCount || 0}건!`;
  } else if (isScanning) {
    toolTipText += ' - ⚡ 그리드 네트워크 스캔 진행 중...';
  } else if (intruderWatch) {
    toolTipText += ' - 🚨 24/7 백그라운드 침입 감시 가동 중';
  } else {
    toolTipText += ' - 📌 시스템 트레이 대기 중';
  }
  if (dndActive) {
    toolTipText += ' [방해금지]';
  }
  tray.setToolTip(toolTipText);

  if (currentContextMenu) {
    const tooltipItem = currentContextMenu.items.find(i => i.id === 'tray-status-tooltip-item');
    if (tooltipItem) {
      tooltipItem.label = statusMessage ? `💬 상태: ${statusMessage}` : '💬 상태: 📌 대기 중 (Ready)';
    }

    const schedStatusItem = currentContextMenu.items.find(i => i.id === 'tray-scheduler-status-item');
    if (schedStatusItem) {
      if (schedulerPaused) {
        schedStatusItem.label = `⏸️ 스케줄러 일시정지 (${activeScheduleCount || 0}개 대기)`;
      } else if (activeScheduleCount && activeScheduleCount > 0) {
        schedStatusItem.label = `⏱️ 스케줄러 가동 중 (${activeScheduleCount}개)`;
      } else {
        schedStatusItem.label = '⏱️ 스케줄러: 등록된 예약 없음';
      }
    }

    if (typeof intruderWatch === 'boolean') {
      const item = currentContextMenu.items.find(i => i.id === 'intruder-watch-item');
      if (item && item.checked !== intruderWatch) {
        item.checked = intruderWatch;
      }
    }

    if (typeof schedulerPaused === 'boolean') {
      const schedPauseItem = currentContextMenu.items.find(i => i.id === 'toggle-scheduler-pause-item');
      if (schedPauseItem && schedPauseItem.checked !== schedulerPaused) {
        schedPauseItem.checked = schedulerPaused;
      }
    }

    if (typeof dndActive === 'boolean') {
      const dndItem = currentContextMenu.items.find(i => i.id === 'toggle-dnd-item');
      if (dndItem && dndItem.checked !== dndActive) {
        dndItem.checked = dndActive;
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

async function terminateApplicationCleanly() {
  if (isExplicitExit) return;
  isExplicitExit = true;
  isQuitting = true;

  const cleanupTasks = [];

  // 1. Terminate Windows Background Service cleanly if running
  try {
    const cp = require('child_process');
    if (process.platform === 'win32') {
      cleanupTasks.push(new Promise((resolve) => {
        cp.exec('sc.exe stop GridIPScannerService', { windowsHide: true, timeout: 1500 }, () => resolve());
      }));
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.removeAllListeners('close');
      mainWindow.destroy();
      mainWindow = null;
    } catch (e) {}
  } else {
    mainWindow = null;
  }

  // 4. Clear storage data and temp directory
  if (session.defaultSession) {
    cleanupTasks.push(session.defaultSession.clearStorageData().catch(() => {}));
    cleanupTasks.push(session.defaultSession.clearCache().catch(() => {}));
  }

  await Promise.race([
    Promise.allSettled(cleanupTasks),
    new Promise((resolve) => setTimeout(resolve, 800))
  ]);

  try {
    if (fs.existsSync(tempUserData)) {
      fs.rmSync(tempUserData, { recursive: true, force: true });
    }
  } catch (e) {}

  app.quit();
  process.exit(0);
}

ipcMain.on('exit-application', () => {
  terminateApplicationCleanly();
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  isExplicitExit = true;
  isQuitting = true;
  app.exit(0);
} else {
  app.on('second-instance', () => {
    restoreMainWindow();
  });

  app.whenReady().then(() => {
    const startInTray = process.argv.some((arg) => arg.toLowerCase() === '--tray');

    try {
      powerMonitor.on('shutdown', () => {
        isExplicitExit = true;
        isQuitting = true;
      });
    } catch (_) {}

    // CRITICAL: Activate System Tray FROM THE BEGINNING (처음부터 시스템 트레이 활성화)
    createTray();

    // Create Main Window (keep hidden without flash when started silently via --tray)
    createWindow(!startInTray);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        restoreMainWindow();
      }
    });
  });
}

app.on('session-end', () => {
  isExplicitExit = true;
  isQuitting = true;
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
  if (isExplicitExit) {
    return;
  }
  if (isQuitting || process.platform === 'darwin') {
    if (session.defaultSession) {
      await session.defaultSession.clearStorageData().catch(() => {});
      await session.defaultSession.clearCache().catch(() => {});
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
