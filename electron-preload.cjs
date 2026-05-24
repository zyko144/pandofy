const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  close: () => ipcRenderer.send('window-close'),
  openWebsite: () => ipcRenderer.send('open-website', 'https://pandofy.app'),
  openExternalLink: (url) => ipcRenderer.send('open-website', url)
});
