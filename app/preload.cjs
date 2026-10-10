'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('babyDesktop', Object.freeze({
  setHitRegions: regions => {
    if (Array.isArray(regions)) ipcRenderer.send('baby:regions', regions);
  },
  setDragging: value => { if (typeof value === 'boolean') ipcRenderer.send('baby:dragging', value); },
  version: () => ipcRenderer.invoke('baby:version'),
  hide: () => ipcRenderer.send('baby:hide')
}));
