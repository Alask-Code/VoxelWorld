import { join } from 'path';
import { BrowserWindow } from 'electron';

export default function createWindow(url: string) {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    icon: join(__dirname, '../', 'resources', 'icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  window.loadURL(url);
  window.removeMenu();
  return window;
}
