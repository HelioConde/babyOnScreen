'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('babyDesktop', Object.freeze({
  setHitRegions: regions => {
    if (Array.isArray(regions)) ipcRenderer.send('baby:regions', regions);
  },
  setDragging: value => { if (typeof value === 'boolean') ipcRenderer.send('baby:dragging', value); },
  desktopLayout: () => ipcRenderer.invoke('baby:desktop:layout'),
  onDesktopLayout: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, layout) => callback(layout);
    ipcRenderer.on('baby:desktop-layout', listener);
    return () => ipcRenderer.removeListener('baby:desktop-layout', listener);
  },
  version: () => ipcRenderer.invoke('baby:version'),
  updateStatus: () => ipcRenderer.invoke('baby:update:get'),
  checkUpdate: () => ipcRenderer.invoke('baby:update:check'),
  installUpdate: () => ipcRenderer.invoke('baby:update:install'),
  openLatestRelease: () => ipcRenderer.invoke('baby:update:release'),
  onUpdateStatus: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('baby:update:status', listener);
    return () => ipcRenderer.removeListener('baby:update:status', listener);
  },
  onUpdateShow: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('baby:update:show', listener);
    return () => ipcRenderer.removeListener('baby:update:show', listener);
  },
  hide: () => ipcRenderer.send('baby:hide')
}));
