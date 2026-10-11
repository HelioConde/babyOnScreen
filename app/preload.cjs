'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('babyDesktop', Object.freeze({
  setHitRegions: regions => {
    if (Array.isArray(regions)) ipcRenderer.send('baby:regions', regions);
  },
  setDragging: value => { if (typeof value === 'boolean') ipcRenderer.send('baby:dragging', value); },
  desktopLayout: () => ipcRenderer.invoke('baby:desktop:layout'),
  moveToMonitor: id => typeof id === 'string'
    ? ipcRenderer.invoke('baby:desktop:move', id)
    : Promise.resolve({ ok: false, reason: 'invalid-monitor' }),
  onDesktopLayout: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, layout) => callback(layout);
    ipcRenderer.on('baby:desktop-layout', listener);
    return () => ipcRenderer.removeListener('baby:desktop-layout', listener);
  },
  onCursorMove: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, point) => callback(point);
    ipcRenderer.on('baby:cursor', listener);
    return () => ipcRenderer.removeListener('baby:cursor', listener);
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
