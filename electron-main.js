import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Start server in background immediately
  import('./server.js').catch(err => console.error('[SERVER]', err));

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 600,
      title: 'Pandofy',
      frame: false,
      show: false, // hidden until ready-to-show
      backgroundColor: '#070707', // no white flash
      icon: path.join(__dirname, 'public', 'favicon.svg'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        backgroundThrottling: false, // smooth animations
        preload: path.join(__dirname, 'electron-preload.cjs')
      }
    });

    win.setMenuBarVisibility(false);

    // Allow YouTube and external resources
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http://localhost:* data: blob: ws:"
          ]
        }
      });
    });

    // Show window instantly when DOM is ready — no waiting for server
    win.once('ready-to-show', () => {
      win.show();
    });

    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {
      win.loadURL('http://localhost:5173');
    });

    return win;
  }

  // ─── AUTO-UPDATER ─────────────────────────────────────────────────
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => console.log('[UPDATER]', err.message));

  ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true));
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch(e => console.log('[UPDATER]', e.message));
  });
  // ──────────────────────────────────────────────────────────────────

  ipcMain.on('window-minimize', () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.minimize(); });
  ipcMain.on('window-toggle-fullscreen', () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.setFullScreen(!w.isFullScreen()); });
  ipcMain.on('window-close', () => { const w = BrowserWindow.getFocusedWindow(); if (w) w.close(); });
  ipcMain.on('open-website', (e, url) => {
    shell.openExternal(url?.startsWith('https://') ? url : 'https://pandofyy.netlify.app');
  });

  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Check updates after 8s (don't slow down launch)
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 8000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
