import { app, session, shell } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import createWindow from './BrowserWindow';
import registerIpcMain from './ipcMain';

let mainWindow: ReturnType<typeof createWindow> | null = null;

function isTrustedApplicationContents(webContents: Electron.WebContents | null): boolean {
  if (!webContents || webContents !== mainWindow?.webContents) return false;
  const url = webContents.getURL();
  return isDev
    ? url.startsWith('http://localhost:3000')
    : url.startsWith('file://');
}

function openApplication() {
  const entry = isDev ? 'http://localhost:3000' : pathToFileURL(join(__dirname, '../dist-vite/index.html')).toString();
  mainWindow = createWindow(entry);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith('http://localhost:3000') : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  registerIpcMain(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((webContents, permission) =>
    permission === 'pointerLock' && isTrustedApplicationContents(webContents)
  );
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) =>
    callback(permission === 'pointerLock' && isTrustedApplicationContents(webContents))
  );
  openApplication();
  app.on('activate', () => {
    if (mainWindow === null) openApplication();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
