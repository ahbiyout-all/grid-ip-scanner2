const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimizeToTray: () => {
    try {
      ipcRenderer.send('minimize-to-tray');
    } catch (e) {
      console.warn('Failed to send minimize-to-tray IPC:', e);
    }
  },
  showTrayNotification: (msg) => {
    try {
      ipcRenderer.send('show-tray-notification', msg);
    } catch (e) {
      console.warn('Failed to send show-tray-notification IPC:', e);
    }
  },
  onToggleIntruder: (callback) => {
    try {
      ipcRenderer.on('tray-toggle-intruder', (_event, val) => callback(val));
    } catch (e) {
      console.warn('Failed to register tray-toggle-intruder listener:', e);
    }
  }
});
