'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, session } = require('electron');
const path = require('node:path');
const geometry = require('./window-geometry.cjs');
const { createUpdateService } = require('./updates.cjs');
const { shell } = require('electron');

const PROJECT_ROOT = path.resolve(__dirname, '..');
let win = null;
let tray = null;
let hitRegions = [];
let visualRegions = [];
let shapeActive = false;
let lastShapeSignature = '';
let dragging = false;
let passthrough = true;
let cursorTimer = null;
let intentionalQuit = false;
let updateService = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) showOrCreateWindow();
    else app.whenReady().then(showOrCreateWindow);
  });
}

function validSender(event) {
  return !!win && !win.isDestroyed() && event.sender === win.webContents;
}
function updatePassThrough(ignore) {
  if (!win || win.isDestroyed() || passthrough === ignore) return;
  passthrough = ignore;
  win.setIgnoreMouseEvents(ignore, { forward: true });
}
function applyNativeShape() {
  if (!win || win.isDestroyed() || process.platform !== 'win32' ||
      typeof win.setShape !== 'function') return;
  // During dragging, allow the pointer to travel across the screen without
  // being clipped by the region. Restore minimal shapes at the end.
  const regions = dragging ? [] : geometry.nativeVisualShape(visualRegions,win.getBounds());
  if (!dragging && !regions.length) return; // Do not use [] on missing data.
  const signature = JSON.stringify(regions);
  if (signature === lastShapeSignature) return;
  try {
    win.setShape(regions);
    lastShapeSignature=signature;
    shapeActive=!dragging;
  } catch(error) {
    shapeActive=false;
    // Shape is an experimental Electron API: retain a usable overlay if
    // a particular Windows version does not support it.
    if (lastShapeSignature !== 'unsupported') console.warn('Overlay shape unavailable:',error.message);
    lastShapeSignature='unsupported';
  }
}
function pollMouse() {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  if (dragging) {
    updatePassThrough(false);
    // Keep mouse drags alive across monitor boundaries even if Chromium
    // momentarily stops delivering pointermove in a transparent window.
    if (!win.webContents.isDestroyed())
      win.webContents.send('baby:cursor', screen.getCursorScreenPoint());
    return;
  }
  const p = screen.getCursorScreenPoint();
  const inside = geometry.isCursorOverRegion(p, win.getBounds(), hitRegions);
  updatePassThrough(!inside);
}
function showOrCreateWindow() {
  if (win && !win.isDestroyed()) {
    win.showInactive();
    return;
  }
  createWindow();
}
function allDesktopBounds() {
  // A single massive transparent BrowserWindow may be clipped or scaled by
  // Windows on heterogeneous monitors. Keep one window on one real display.
  return screen.getPrimaryDisplay().workArea;
}
function currentDisplay() {
  const displays = screen.getAllDisplays();
  if (!win || win.isDestroyed()) return screen.getPrimaryDisplay();
  return displays.find(d => d.id === screen.getDisplayMatching(win.getBounds()).id)
    || screen.getPrimaryDisplay();
}
function desktopLayout() {
  if (!win || win.isDestroyed()) return { bounds: allDesktopBounds(), displays: [] };
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const sorted = [primary, ...displays.filter(d => d.id !== primary.id)];
  return {
    bounds: win.getBounds(),
    activeId: String(currentDisplay().id),
    displays: geometry.displayList(sorted, win.getBounds())
  };
}
function sendDesktopLayout() {
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed())
    win.webContents.send('baby:desktop-layout', desktopLayout());
}
function moveToDisplay(id) {
  if (!win || win.isDestroyed() || typeof id !== 'string') return { ok: false, reason: 'unavailable' };
  const target = screen.getAllDisplays().find(d => String(d.id) === id);
  if (!target) return { ok: false, reason: 'monitor-not-found', layout: desktopLayout() };
  const desired = target.workArea;
  // The native OS owns this move; merely updating CSS inside the first
  // monitor's overlay does not move the actual transparent window.
  win.setBounds(desired, false);
  const landed = String(screen.getDisplayMatching(win.getBounds()).id) === id;
  const layout = desktopLayout();
  if (landed) { lastShapeSignature=''; applyNativeShape(); sendDesktopLayout(); refreshTrayMenu(); }
  return { ok: landed, reason: landed ? '' : 'move-failed', layout };
}
function updateDesktopBounds() {
  if (!win || win.isDestroyed()) return;
  const target = currentDisplay();
  const next = target.workArea;
  const old = win.getBounds();
  if (old.x !== next.x || old.y !== next.y ||
      old.width !== next.width || old.height !== next.height) {
    win.setBounds(next);
  }
  lastShapeSignature='';
  applyNativeShape();
  sendDesktopLayout();
  refreshTrayMenu();
}
function createWindow() {
  const bounds = allDesktopBounds();
  win = new BrowserWindow({
    ...bounds,
    title: 'Baby On Screen',
    transparent: true,
    frame: false,
    show: false,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true });
  passthrough = true;
  visualRegions=[];
  shapeActive=false;
  lastShapeSignature='';
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => { if (win) { win.showInactive(); sendDesktopLayout(); } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.on('closed', () => {
    win = null; hitRegions = []; visualRegions = []; dragging = false;
    passthrough = true; shapeActive = false; lastShapeSignature='';
    if (cursorTimer) { clearInterval(cursorTimer); cursorTimer = null; }
  });
  if (cursorTimer) clearInterval(cursorTimer);
  cursorTimer = setInterval(pollMouse, 65);
}
function refreshTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const displayMenu = screen.getAllDisplays().map((d,index) => ({
    label: 'Monitor ' + (index + 1) + (d.id === screen.getPrimaryDisplay().id ? ' (principal)' : ''),
    type: 'radio',
    checked: !!win && !win.isDestroyed() && currentDisplay().id === d.id,
    click: () => {
      showOrCreateWindow();
      const result = moveToDisplay(String(d.id));
      if (!result.ok) console.warn('Baby On Screen: não foi possível mover a janela para o monitor', d.id);
      refreshTrayMenu();
    }
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar bebê', click: showOrCreateWindow },
    { label: 'Ocultar bebê', click: () => win && win.hide() },
    { label: 'Mover para monitor', submenu: displayMenu },
    { label: 'Verificar atualizações', click: () => {
      showOrCreateWindow();
      if (win && !win.isDestroyed()) win.webContents.send('baby:update:show');
      void updateService?.check();
    } },
    { type: 'separator' },
    { label: 'Sair do jogo', click: () => { intentionalQuit = true; app.quit(); } }
  ]));
}
function createTray() {
  let icon = nativeImage.createFromPath(path.join(PROJECT_ROOT, 'sprits', 'char1.png'));
  if (!icon.isEmpty()) icon = icon.crop({ x: 54, y: 0, width: 45, height: 45 }).resize({ width: 20, height: 20 });
  if (icon.isEmpty()) icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ayfQUQAAAAASUVORK5CYII=');
  tray = new Tray(icon);
  tray.setToolTip('Baby On Screen');
  refreshTrayMenu();
  tray.on('double-click', showOrCreateWindow);
}
ipcMain.handle('baby:desktop:layout', event =>
  validSender(event) ? desktopLayout() : { bounds: allDesktopBounds(), displays: [] });
ipcMain.handle('baby:desktop:move', (event, id) =>
  validSender(event) ? moveToDisplay(id) : { ok: false, reason: 'invalid-sender' });
ipcMain.on('baby:regions', (event, regions) => {
  if (!validSender(event) || !Array.isArray(regions)) return;
  hitRegions = geometry.sanitizeRegions(regions);
});
ipcMain.on('baby:visual-regions', (event, regions) => {
  if (!validSender(event) || !Array.isArray(regions)) return;
  visualRegions = geometry.sanitizeRegions(regions, 16);
  applyNativeShape();
});
ipcMain.handle('baby:overlay:geometry', event => validSender(event) ? {
  shaped:shapeActive,
  visualCount:visualRegions.length,
  window:win.getBounds(),
  coverage:geometry.nativeVisualShape(visualRegions,win.getBounds())
    .reduce((sum,r)=>sum+r.width*r.height,0)/(Math.max(1,win.getBounds().width*win.getBounds().height))
} : { shaped:false, visualCount:0 });
ipcMain.on('baby:dragging', (event, value) => {
  if (!validSender(event) || typeof value !== 'boolean') return;
  dragging = value;
  applyNativeShape();
  if (dragging) updatePassThrough(false);
});
ipcMain.handle('baby:version', event => validSender(event) ? app.getVersion() : '');
ipcMain.handle('baby:update:get', event => validSender(event) ? updateService?.getStatus() || { phase: 'unavailable' } : { phase: 'unavailable' });
ipcMain.handle('baby:update:check', event => validSender(event) ? updateService?.check() || { phase: 'unavailable' } : { phase: 'unavailable' });
ipcMain.handle('baby:update:install', event => validSender(event) ? updateService?.install() === true : false);
ipcMain.handle('baby:update:release', event => {
  if (!validSender(event)) return false;
  return shell.openExternal('https://github.com/HelioConde/babyOnScreen/releases/latest').then(() => true, () => false);
});
ipcMain.on('baby:hide', event => { if (validSender(event)) win.hide(); });
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  createWindow();
  createTray();
  const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;
  const unpacked = /[\\/]win-unpacked[\\/]/i.test(process.execPath);
  const development = !app.isPackaged || unpacked || process.platform !== 'win32';
  updateService = createUpdateService({
    app, portable: isPortable, development,
    autoUpdater: (development || isPortable) ? null : require('electron-updater').autoUpdater,
    broadcast: status => {
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed())
        win.webContents.send('baby:update:status', status);
    }
  });
  updateService.start();
  screen.on('display-metrics-changed', updateDesktopBounds);
  screen.on('display-added', updateDesktopBounds);
  screen.on('display-removed', updateDesktopBounds);
});
app.on('before-quit', () => { intentionalQuit = true; updateService?.dispose(); if (cursorTimer) clearInterval(cursorTimer); });
app.on('window-all-closed', () => { if (intentionalQuit || process.platform !== 'win32') app.quit(); });
