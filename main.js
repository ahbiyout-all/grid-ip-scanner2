const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🌐 Grid IP Scanner2 메인 화면 열기',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🚨 24/7 백그라운드 침입 감시 (Intruder Watch)',
      type: 'checkbox',
      checked: true,
      click: (item) => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('tray-toggle-intruder', item.checked);
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
      label: '❌ 프로그램 완전히 종료 (Exit)',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

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

  // Clear all storage data on startup
  session.defaultSession.clearStorageData();

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error("Failed to load index.html:", err);
  });

  // Close to Tray behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && tray.displayBalloon) {
        tray.displayBalloon({
          title: 'Grid IP Scanner2',
          content: '앱이 시스템 트레이로 최소화되었습니다. 24/7 침입 감시 및 무인 스케줄러가 계속 가동됩니다.'
        });
      }
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
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

app.whenReady().then(() => {
  // CRITICAL: Activate System Tray FROM THE BEGINNING (처음부터 시스템 트레이 활성화)
  createTray();

  // Create Main Window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
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
