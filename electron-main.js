import { app, BrowserWindow, ipcMain, shell } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

// Enforce single instance lock to prevent multiple app instances from running simultaneously
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Automatically starts the Express server inside the Electron process.
  // Dynamically imported to avoid binding port 3001 when a secondary instance attempts to launch.
  import('./server.js').catch(err => console.error('[SERVER] Erreur démarrage:', err));

  // Wait for Express server to be ready before opening the window
  // Uses Node's built-in http module (works in both dev and packaged builds)
  function waitForServer(retries = 25, interval = 400) {
    return new Promise((resolve) => {
      let attempt = 0;

      const tryConnect = () => {
        attempt++;
        const req = http.get('http://localhost:3001/api/version', (res) => {
          console.log(`[SERVER] Ready after ${attempt} attempt(s)`);
          res.resume(); // drain the response
          resolve(true);
        });
        req.on('error', () => {
          if (attempt < retries) {
            setTimeout(tryConnect, interval);
          } else {
            console.warn('[SERVER] Timeout — opening window anyway');
            resolve(false);
          }
        });
        req.setTimeout(500, () => {
          req.destroy();
        });
      };

      tryConnect();
    });
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280,
      height: 820,
      title: 'Pandofy',
      fullscreen: false,
      frame: false,
      icon: path.join(__dirname, 'public', 'favicon.svg'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'electron-preload.cjs')
      }
    });

    win.setMenuBarVisibility(false);

    // Serve Vite compiled index.html (packaged app)
    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((err) => {
      console.log('Dist not built, falling back to Vite Dev Server:', err.message);
      win.loadURL('http://localhost:5173');
    });
  }

  // ─── AUTO-UPDATER ───────────────────────────────────────────────
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('update-downloaded', info);
  });

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });
  // ────────────────────────────────────────────────────────────────

  // Window IPC control handlers
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
    const safeUrl = url && url.startsWith('https://') ? url : 'https://pandofy.app';
    shell.openExternal(safeUrl);
  });

  // Focus the existing window when a second instance is opened
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

    // Vérifie les mises à jour 5 secondes après le démarrage
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.log('[UPDATER] Pas de mise à jour ou erreur:', err.message);
      });
    }, 5000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
