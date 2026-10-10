'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const scope = {};
scope.window = scope;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/sprite-cleaner.js'), 'utf8'),
  scope, { filename: 'sprite-cleaner.js' });
const { cleanPixels, isRedMatte } = scope.BabySpriteCleaner;

function setPixel(data, width, x, y, [r,g,b,a]) {
  data.set([r,g,b,a], (y * width + x) * 4);
}
function alpha(data, width, x, y) { return data[(y * width + x) * 4 + 3]; }

test('old sprites lose red matte and neighbor fragments without losing baby skin or pink bow', () => {
  const w = 12, h = 12, pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 3; y <= 8; y++)
    for (let x = 3; x <= 8; x++)
      setPixel(pixels, w, x, y, [245,151,100,255]);
  setPixel(pixels, w, 4, 4, [249,64,156,255]); // pink bow
  setPixel(pixels, w, 2, 4, [239,14,20,255]);   // touching extraction matte
  setPixel(pixels, w, 0, 0, [239,14,20,255]);   // detached extraction matte
  setPixel(pixels, w, 11, 11, [40,70,210,255]); // blue stray neighbor
  const result = cleanPixels(w, h, pixels);
  assert.equal(alpha(pixels,w,2,4), 0);
  assert.equal(alpha(pixels,w,0,0), 0);
  assert.equal(alpha(pixels,w,11,11), 0);
  assert.equal(alpha(pixels,w,4,4), 255);
  assert.equal(alpha(pixels,w,5,5), 255);
  assert.equal(result.removedMatte, 2);
  assert.equal(result.removedLoose, 1);
  assert.deepEqual({x:result.bounds.x,y:result.bounds.y,w:result.bounds.w,h:result.bounds.h},
    {x:3,y:3,w:6,h:6});
});
test('legacy fallback with hand-curated frame coordinates retains its original layout', () => {
  const w = 8, h = 8, pixels = new Uint8ClampedArray(w * h * 4);
  setPixel(pixels,w,2,2,[220,140,85,255]);
  setPixel(pixels,w,7,7,[30,110,160,255]);
  const result = cleanPixels(w,h,pixels,{isolate:false});
  assert.equal(alpha(pixels,w,2,2),255);
  assert.equal(alpha(pixels,w,7,7),255);
  assert.equal(result.components,0);
  assert.equal(isRedMatte(250,90,160),false);
});
