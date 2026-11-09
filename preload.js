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
  updateTrayStatus: (status) => {
    try {
      ipcRenderer.send('update-tray-status', status);
    } catch (e) {
      console.warn('Failed to send update-tray-status IPC:', e);
    }
  },
  onToggleIntruder: (callback) => {
    try {
      const listener = (_event, val) => callback(val);
      ipcRenderer.on('tray-toggle-intruder', listener);
      return () => {
        try {
          ipcRenderer.removeListener('tray-toggle-intruder', listener);
        } catch (_) {}
      };
    } catch (e) {
      console.warn('Failed to register tray-toggle-intruder listener:', e);
      return () => {};
    }
  },
  onOpenIntruderLog: (callback) => {
    try {
      const listener = () => callback();
      ipcRenderer.on('tray-open-intruder-log', listener);
      return () => {
        try {
          ipcRenderer.removeListener('tray-open-intruder-log', listener);
        } catch (_) {}
      };
    } catch (e) {
      console.warn('Failed to register tray-open-intruder-log listener:', e);
      return () => {};
    }
  },
  onToggleScan: (callback) => {
    try {
      const listener = () => callback();
      ipcRenderer.on('tray-toggle-scan', listener);
      return () => {
        try {
          ipcRenderer.removeListener('tray-toggle-scan', listener);
        } catch (_) {}
      };
    } catch (e) {
      console.warn('Failed to register tray-toggle-scan listener:', e);
      return () => {};
    }
  },
  onWindowHiddenToTray: (callback) => {
    try {
      const listener = () => callback();
      ipcRenderer.on('window-hidden-to-tray', listener);
      return () => {
        try {
          ipcRenderer.removeListener('window-hidden-to-tray', listener);
        } catch (_) {}
      };
    } catch (e) {
      console.warn('Failed to register window-hidden-to-tray listener:', e);
      return () => {};
    }
  },
  setCloseToTray: (enabled) => {
    try {
      ipcRenderer.send('set-close-to-tray', Boolean(enabled));
    } catch (e) {
      console.warn('Failed to send set-close-to-tray IPC:', e);
    }
  },
  exitApplication: () => {
    try {
      ipcRenderer.send('exit-application');
    } catch (e) {
      console.warn('Failed to send exit-application IPC:', e);
    }
  }
});
