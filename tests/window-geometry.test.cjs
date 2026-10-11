'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeRegions, isCursorOverRegion } = require('../app/window-geometry.cjs');

test('passagem de cliques: apenas elementos interativos recebem cliques', () => {
  const screenBounds = { x: 0, y: 0 };
  const regions = sanitizeRegions([{ x: 25, y: 100, width: 96, height: 106 }]);
  assert.equal(isCursorOverRegion({x:30,y:120}, screenBounds, regions), true);
  assert.equal(isCursorOverRegion({x:260,y:120}, screenBounds, regions), false);
  assert.equal(isCursorOverRegion({x:121,y:120}, screenBounds, regions), false);
  assert.equal(isCursorOverRegion({x:25,y:206}, screenBounds, regions), false);
});

test('posição em monitor secundário com coordenadas negativas', () => {
  const bounds = { x: -1920, y: -1080 };
  const regions = sanitizeRegions([{x:100,y:200,width:200,height:300}]);
  assert.equal(isCursorOverRegion({x:-1800,y:-850},bounds,regions),true);
  assert.equal(isCursorOverRegion({x:150,y:250},bounds,regions),false);
  assert.equal(isCursorOverRegion({x:-1900,y:-850},bounds,regions),false);
});

test('regiões inválidas, zero, exageradas e não numéricas são recusadas', () => {
  const raw = [
    {x:10,y:5,width:96,height:106},
    {x:0,y:0,width:0,height:50},
    {x:0,y:0,width:Infinity,height:20},
    {x:0,y:0,width:Infinity,height:20},
    {x:0,y:0,width:10001,height:2},
    {x:0,y:0,width:4,height:-1},
    {x:NaN,y:0,width:10,height:10},
    {x:10,y:0,width:2,height:2010}
  ];
  const safe = sanitizeRegions(raw);
  assert.equal(safe.length,2,'4K panel regions remain valid; malicious ones do not');
  assert.equal(isCursorOverRegion(null,{x:0,y:0},safe),false);
  assert.equal(isCursorOverRegion({x:1,y:1},{x:NaN,y:0},safe),false);
  assert.equal(sanitizeRegions(null).length,0);
  assert.equal(sanitizeRegions(Array.from({length:90},()=>raw[0])).length,40);
});

test('Windows tray can recreate a closed window instead of leaving a dead tray icon', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const main = fs.readFileSync(path.resolve(__dirname, '../app/main.cjs'), 'utf8');
  assert.match(main, /function showOrCreateWindow\(\)/);
  assert.match(main, /label: 'Mostrar bebê', click: showOrCreateWindow/);
  assert.match(main, /tray\.on\('double-click', showOrCreateWindow\)/);
  assert.match(main, /if \(cursorTimer\) \{ clearInterval\(cursorTimer\); cursorTimer = null; \}/);
});

test('virtual desktop covers multiple monitors, including negative x and y', () => {
  const { virtualDesktopBounds, displayList } = require('../app/window-geometry.cjs');
  const displays = [
    {id:1,bounds:{x:0,y:0,width:1920,height:1080}},
    {id:2,bounds:{x:-1280,y:-400,width:1280,height:1024}},
    {id:3,bounds:{x:1920,y:350,width:2560,height:1440}}
  ];
  assert.deepEqual(virtualDesktopBounds(displays),{x:-1280,y:-400,width:5760,height:2190});
  const list = displayList(displays,virtualDesktopBounds(displays));
  assert.equal(list.length,3);
  assert.deepEqual([list[0].x,list[0].y],[1280,400]);
  assert.deepEqual([list[1].x,list[1].y],[0,0]);
  assert.deepEqual([list[2].x,list[2].y],[3200,750]);
  assert.equal(list[0].primary,true);
  assert.equal(virtualDesktopBounds([]),null);
});
test('overlay window stays on the active display and keeps secure IPC', () => {
  const fs=require('node:fs'),path=require('node:path');
  const main=fs.readFileSync(path.resolve(__dirname,'../app/main.cjs'),'utf8');
  const preload=fs.readFileSync(path.resolve(__dirname,'../app/preload.cjs'),'utf8');
  assert.match(main,/return screen\.getPrimaryDisplay\(\)\.workArea/);
  assert.match(main,/win\.setBounds\(desired, false\)/);
  assert.match(main,/ipcMain\.handle\('baby:desktop:layout'/);
  assert.match(main,/screen\.on\('display-added', updateDesktopBounds\)/);
  assert.match(main,/screen\.on\('display-removed', updateDesktopBounds\)/);
  assert.match(preload,/desktopLayout: \(\) => ipcRenderer\.invoke\('baby:desktop:layout'\)/);
  assert.match(main,/setIgnoreMouseEvents\(ignore, \{ forward: true \}\)/);
});

test('available monitor work areas exclude taskbar and match the overlay region', () => {
  const { virtualDesktopBounds, displayList } = require('../app/window-geometry.cjs');
  const devices = [
    {id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1030}},
    {id:2,bounds:{x:1920,y:0,width:2560,height:1440},workArea:{x:1920,y:42,width:2560,height:1398}}
  ];
  const union=virtualDesktopBounds(devices);
  assert.deepEqual(union,{x:0,y:0,width:4480,height:1440});
  const monitors=displayList(devices,union);
  assert.equal(monitors[0].height,1030);
  assert.equal(monitors[1].y,42);
  assert.equal(monitors[1].height,1398);
  assert.ok(monitors.every(d=>d.x>=0&&d.y>=0&&d.x+d.width<=union.width&&d.y+d.height<=union.height));
  assert.deepEqual(virtualDesktopBounds([{id:1,bounds:{x:0,y:0,width:1024,height:768},
    workArea:{x:0,y:0,width:1024,height:720}}]),{x:0,y:0,width:1024,height:720});
});

test('Windows switches the NATIVE overlay window instead of just changing CSS coordinates',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const main=fs.readFileSync(path.resolve(__dirname,'../app/main.cjs'),'utf8');
  const preload=fs.readFileSync(path.resolve(__dirname,'../app/preload.cjs'),'utf8');
  assert.match(main,/function moveToDisplay\(id\)/);
  assert.match(main,/screen\.getAllDisplays\(\)\.find\(d => String\(d\.id\) === id\)/);
  assert.match(main,/win\.setBounds\(desired, false\)/);
  assert.match(main,/screen\.getDisplayMatching\(win\.getBounds\(\)\)/);
  assert.match(main,/ipcMain\.handle\('baby:desktop:move'/);
  assert.match(preload,/moveToMonitor: id => typeof id === 'string'/);
  assert.match(main,/return screen\.getPrimaryDisplay\(\)\.workArea/);
});

test('menu da bandeja permite recuperar a bebê no monitor 2',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const main=fs.readFileSync(path.resolve(__dirname,'../app/main.cjs'),'utf8');
  assert.match(main,/label: 'Mover para monitor', submenu: displayMenu/);
  assert.match(main,/const result = moveToDisplay\(String\(d\.id\)\)/);
  assert.match(main,/refreshTrayMenu\(\)/);
});

test('a forma nativa limita a janela à bebê, caixa e balões para não ocultar vídeos',()=>{
  const {nativeVisualShape}=require('../app/window-geometry.cjs');
  const bounds={x:0,y:0,width:1920,height:1080};
  const pieces=nativeVisualShape([
    {x:-15,y:-8,width:140,height:150},
    {x:1550,y:100,width:365,height:610},
    {x:1880,y:1040,width:160,height:60},
    {x:2000,y:0,width:50,height:50},
    {x:50,y:10,width:Infinity,height:50}
  ],bounds);
  assert.deepEqual(pieces[0],{x:0,y:0,width:125,height:142});
  assert.equal(pieces.length,3);
  assert.ok(pieces.every(r=>r.x>=0&&r.y>=0&&r.x+r.width<=bounds.width&&r.y+r.height<=bounds.height));
  const coverage=pieces.reduce((sum,p)=>sum+p.width*p.height,0)/(bounds.width*bounds.height);
  assert.ok(coverage<.2,'HUD and baby should occupy a small part of the native screen');
  assert.deepEqual(nativeVisualShape([],bounds),[]);
});
test('a janela mantém passagem de clique mas restringe a superfície visual no Windows',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const main=fs.readFileSync(path.resolve(__dirname,'../app/main.cjs'),'utf8');
  const preload=fs.readFileSync(path.resolve(__dirname,'../app/preload.cjs'),'utf8');
  assert.match(main,/win\.setShape\(regions\)/);
  assert.match(main,/shapeActive=!dragging/);
  assert.match(main,/geometry\.nativeVisualShape\(visualRegions,win\.getBounds\(\)\)/);
  assert.match(main,/ipcMain\.on\('baby:visual-regions'/);
  assert.match(preload,/setVisualRegions: regions =>/);
  assert.match(main,/setIgnoreMouseEvents\(ignore, \{ forward: true \}\)/);
});
