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

  const SERVER_PORT = process.env.PORT || 3001;

  import('./server.js').catch(err => console.error('[SERVER] Erreur démarrage:', err));

  function waitForServer(retries = 30, interval = 400) {
    return new Promise((resolve) => {
      let attempt = 0;
      const tryConnect = () => {
        attempt++;
        const req = http.get(`http://localhost:${SERVER_PORT}/api/version`, (res) => {
          console.log(`[SERVER] Ready after ${attempt} attempt(s)`);
          res.resume();
          resolve(true);
        });
        req.on('error', () => {
          if (attempt < retries) setTimeout(tryConnect, interval);
          else { console.warn('[SERVER] Timeout — opening window anyway'); resolve(false); }
        });
        req.setTimeout(500, () => req.destroy());
      };
      tryConnect();
    });
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 600,
      title: 'Pandofy',
      fullscreen: false,
      frame: false,
      icon: path.join(__dirname, 'public', 'favicon.svg'),
      backgroundColor: '#070707',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Permet YouTube iframe et ressources externes
        preload: path.join(__dirname, 'electron-preload.cjs')
      }
    });

    win.setMenuBarVisibility(false);

    // Autoriser YouTube et ressources externes dans les headers CSP
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

    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {
      win.loadURL('http://localhost:5173');
    });

    return win;
  }

  // ─── AUTO-UPDATER ─────────────────────────────────────────────────
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    console.log('[UPDATER] Vérification des mises à jour...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[UPDATER] Mise à jour disponible:', info.version);
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[UPDATER] Application à jour');
  });

  autoUpdater.on('download-progress', (progress) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[UPDATER] Mise à jour téléchargée:', info.version);
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.log('[UPDATER] Erreur:', err.message);
  });

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch(err => console.log('[UPDATER]', err.message));
  });
  // ──────────────────────────────────────────────────────────────────

  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.on('window-toggle-fullscreen', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });

  ipcMain.on('open-website', (event, url) => {
    const safeUrl = url && url.startsWith('https://') ? url : 'https://pandofyy.netlify.app';
    shell.openExternal(safeUrl);
  });

  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    await waitForServer();
    createWindow();

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.log('[UPDATER]', err.message);
      });
    }, 5000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
