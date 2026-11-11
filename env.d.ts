declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.ico" {
  const value: string;
  export default value;
}

interface ElectronAPI {
  isElectron?: boolean;
  minimizeToTray?: () => void;
  showTrayNotification?: (msg: string) => void;
  updateTrayStatus?: (status: {
    intruderWatch?: boolean;
    isScanning?: boolean;
    intruderCount?: number;
    statusMessage?: string;
  }) => void;
  onToggleIntruder?: (callback: (val: boolean) => void) => (() => void) | void;
  onOpenIntruderLog?: (callback: () => void) => (() => void) | void;
  onToggleScan?: (callback: () => void) => (() => void) | void;
  onWindowHiddenToTray?: (callback: () => void) => (() => void) | void;
  setCloseToTray?: (enabled: boolean) => void;
  getCloseToTray?: () => Promise<boolean>;
  exitApplication?: () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
