import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) { app.quit(); } else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  import('./server.js').catch(err => console.error('[SERVER]', err));

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280, height: 820, minWidth: 900, minHeight: 600,
      title: 'Pandofy', frame: false, show: false,
      backgroundColor: '#070707',
      icon: path.join(__dirname, 'public', 'favicon.svg'),
      webPreferences: {
        nodeIntegration: false, contextIsolation: true,
        webSecurity: false, backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required', // ← Fix YouTube autoplay
        preload: path.join(__dirname, 'electron-preload.cjs')
      }
    });

    win.setMenuBarVisibility(false);

    // Remove X-Frame-Options to allow YouTube iframes
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['x-frame-options'];
      delete headers['X-Frame-Options'];
      headers['Content-Security-Policy'] = ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http://localhost:* data: blob: ws: wss:"];
      headers['Permissions-Policy'] = ['autoplay=*, camera=(), microphone=()'];
      callback({ responseHeaders: headers });
    });

    win.once('ready-to-show', () => win.show());
    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => win.loadURL('http://localhost:5173'));
    return win;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', info => { const w = BrowserWindow.getAllWindows()[0]; if(w) w.webContents.send('update-available', info); });
  autoUpdater.on('download-progress', p => { const w = BrowserWindow.getAllWindows()[0]; if(w) w.webContents.send('update-progress', p); });
  autoUpdater.on('update-downloaded', info => { const w = BrowserWindow.getAllWindows()[0]; if(w) w.webContents.send('update-downloaded', info); });
  autoUpdater.on('error', err => console.log('[UPDATER]', err.message));

  ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true));
  ipcMain.on('check-for-updates', () => autoUpdater.checkForUpdates().catch(() => {}));
  ipcMain.on('window-minimize', () => { const w = BrowserWindow.getFocusedWindow(); if(w) w.minimize(); });
  ipcMain.on('window-toggle-fullscreen', () => { const w = BrowserWindow.getFocusedWindow(); if(w) w.setFullScreen(!w.isFullScreen()); });
  ipcMain.on('window-close', () => { const w = BrowserWindow.getFocusedWindow(); if(w) w.close(); });
  ipcMain.on('open-website', (e, url) => shell.openExternal(url?.startsWith('https://') ? url : 'https://pandofyy.netlify.app'));

  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if(w) { if(w.isMinimized()) w.restore(); w.focus(); } });

  app.whenReady().then(() => {
    createWindow();
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 8000);
    app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
}
