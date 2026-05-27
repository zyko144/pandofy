const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  close: () => ipcRenderer.send('window-close'),
  openWebsite: () => ipcRenderer.send('open-website', 'https://pandofyy.netlify.app'),
  openExternalLink: (url) => ipcRenderer.send('open-website', url),

  // Auto-updater
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, info) => cb(info)),
});
