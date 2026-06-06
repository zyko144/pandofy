import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import http from 'http';
import net from 'net';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

// Optimize background performance & prevent Chromium low-power CPU throttling
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const gotTheLock = app.requestSingleInstanceLock();

// Helper to find a free port dynamically
function getFreePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getFreePort(startPort + 1));
    });
  });
}

if (!gotTheLock) {
  app.quit();
} else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let PORT = 3001;

  // Wait for local server (serves both API + static files)
  function waitForServer(retries = 40, interval = 300) {
    return new Promise(resolve => {
      let attempts = 0;
      const try_ = () => {
        attempts++;
        const req = http.get(`http://127.0.0.1:${PORT}/api/version`, res => { res.resume(); resolve(true); });
        req.on('error', () => { if (attempts < retries) setTimeout(try_, interval); else resolve(false); });
        req.setTimeout(400, () => req.destroy());
      };
      try_();
    });
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280, height: 820, minWidth: 900, minHeight: 600,
      title: 'Pandofy', frame: false, show: false,
      backgroundColor: '#070707',
      icon: path.join(__dirname, 'public', 'icon.png'),
      webPreferences: {
        nodeIntegration: false, contextIsolation: true,
        webSecurity: false, backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
        preload: path.join(__dirname, 'electron-preload.cjs')
      }
    });

    win.setMenuBarVisibility(false);

    // Allow all origins — fix YouTube iframes
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const h = { ...details.responseHeaders };
      delete h['x-frame-options'];
      delete h['X-Frame-Options'];
      delete h['content-security-policy'];
      delete h['Content-Security-Policy'];
      h['Access-Control-Allow-Origin'] = ['*'];
      h['Permissions-Policy'] = ['autoplay=*, camera=(), microphone=()'];
      callback({ responseHeaders: h });
    });

    win.once('ready-to-show', () => win.show());

    // Load from local HTTP server — YouTube iframes work from http://localhost
    win.loadURL(`http://127.0.0.1:${PORT}`).catch(() => {
      win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    });

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
  ipcMain.on('open-website', (e, url) => {
    if (url?.startsWith('https://') || url?.startsWith('mailto:')) {
      shell.openExternal(url);
    } else {
      shell.openExternal('https://pandofyy.netlify.app');
    }
  });

  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if(w) { if(w.isMinimized()) w.restore(); w.focus(); } });

  app.whenReady().then(async () => {
    try {
      await session.defaultSession.clearCache();
    } catch (err) {
      console.warn('Cache clear error:', err);
    }
    
    // Dynamically find a free port starting from 3001
    PORT = await getFreePort(3001);
    process.env.PORT = PORT;
    console.log(`[PANDOFY] Binding to free port: ${PORT}`);

    // Spawn server.js as a child process (bypasses Node ESM ASAR loader bugs)
    const serverPath = path.join(__dirname, 'server.js');
    console.log(`[PANDOFY] Spawning local server process: ${serverPath}`);
    const serverProcess = fork(serverPath, [], {
      env: { ...process.env, PORT: PORT.toString() },
      stdio: 'inherit'
    });

    app.on('will-quit', () => {
      console.log('[PANDOFY] Killing server process on app quit');
      serverProcess.kill();
    });

    await waitForServer();
    createWindow();
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 8000);
    app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
}
