
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Set userData to a temporary directory to leave no traces
const tempUserData = path.join(app.getPath('temp'), `cisnet_grid_scan_electron_${Date.now()}`);
app.setPath('userData', tempUserData);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "Grid IP Scanner2",
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Clear all storage data on startup just in case
  session.defaultSession.clearStorageData();

  // 빌드된 index.html 로드 경로
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error("Failed to load index.html:", err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  // Clear all storage data and cache before quitting
  if (session.defaultSession) {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
  }

  // Clean up the temporary userData directory
  try {
    if (fs.existsSync(tempUserData)) {
      fs.rmSync(tempUserData, { recursive: true, force: true });
    }
  } catch (e) {
    console.error("Failed to cleanup temp userData:", e);
  }

  if (process.platform !== 'darwin') app.quit();
});
