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
