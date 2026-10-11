'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function run(context, file) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
function runtimeContext(extra = {}) {
  const context = { ...extra };
  context.window = context;
  run(context, 'app/sprite-runtime.js');
  return context;
}

test('every configured sprite is present in the imported pack', () => {
  const context = runtimeContext();
  run(context, 'app/sprite-manifest.js');
  const manifest = context.BabySpriteManifest;
  assert.ok(manifest.newborn && manifest.baby && manifest.toddler);
  for (const [stage, actions] of Object.entries(manifest)) {
    for (const [action, directions] of Object.entries(actions)) {
      for (const [direction, entry] of Object.entries(directions)) {
        const files = entry.files ?? (entry.filename ? [entry.filename] : []);
        assert.ok(files.length, stage + '/' + action + '/' + direction);
        for (const file of files) {
          const relative = context.BabySpriteRuntime.spriteUrl(entry.category, file);
          assert.ok(fs.existsSync(path.join(root, relative)), relative);
          if (file === 'crawl_sheet.webp') {
            const bytes = fs.readFileSync(path.join(root, relative));
            assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'valid WebP container');
            assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'valid WebP signature');
            assert.ok(bytes.length > 1000, 'crawl atlas should not be empty');
          }
          if (entry.fallback) {
            for (const fallbackFile of entry.fallback.files) {
              const fallbackPath = context.BabySpriteRuntime.spriteUrl(entry.fallback.category, fallbackFile);
              assert.ok(fs.existsSync(path.join(root, fallbackPath)), fallbackPath);
            }
          }
        }
      }
    }
  }
});

test('sprite paths reject unknown categories and unsafe names', () => {
  const { BabySpriteRuntime: runtime } = runtimeContext();
  assert.equal(runtime.spriteUrl('crescimento', 'element_001.png', '..'),
    '../assets/sprites/generated/crescimento/element_001.png');
  assert.throws(() => runtime.spriteUrl('../', 'element_001.png'));
  assert.throws(() => runtime.spriteUrl('crescimento', '../../secrets.txt'));
  assert.equal(runtime.spriteUrl('crescimento', 'crawl_sheet.webp', '..'),
    '../assets/sprites/generated/crescimento/crawl_sheet.webp');
});

test('animation advances through independent images and can mirror', () => {
  const { BabySpriteRuntime: runtime } = runtimeContext();
  const images = [{ width: 12, height: 20 }, { width: 14, height: 22 }];
  const frames = [{ imageIndex: 0, w: 12, h: 20 }, { imageIndex: 1, w: 14, h: 22 }];
  const animator = new runtime.SpriteAnimator(images, frames, { fps: 5 });
  animator.update(0.21);
  assert.equal(animator.index, 1);
  assert.equal(animator.frameInfo().image, images[1]);
  const calls = [];
  const ctx = {
    save() {}, translate() {}, scale(...args) { calls.push(['scale', ...args]); },
    drawImage(...args) { calls.push(['image', ...args]); }, restore() {}
  };
  animator.draw(ctx, 32, 70, { scale: 0.5, flipX: true });
  assert.deepEqual(calls.find(x => x[0] === 'scale'), ['scale', -0.5, 0.5]);
  assert.equal(calls.find(x => x[0] === 'image')[1], images[1]);
  animator.update(0.21);
  assert.equal(animator.index, 0);
});

test('controller draws available frames and falls back when image loading fails', async () => {
  class FakeCanvas {
    constructor() {
      this.width = 64; this.height = 72; this.drawn = 0;
      this.ctx = {
        clearRect() {}, save() {}, translate() {}, scale() {}, restore() {},
        drawImage: () => { this.drawn++; }
      };
    }
    getContext() { return this.ctx; }
  }
  class FakeImage {
    constructor() { this.width = 150; this.height = 190; this.naturalWidth = 150; this.naturalHeight = 190; }
    set src(url) {
      if (url.includes('element_999.png')) this.onerror?.();
      else this.onload?.();
    }
  }
  const context = runtimeContext({
    Image: FakeImage, HTMLCanvasElement: FakeCanvas,
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}
  });
  run(context, 'app/sprite-controller.js');
  const canvas = new FakeCanvas();
  const controller = new context.BabySpriteController(canvas);
  assert.equal(await controller.play('crescimento', ['element_001.png', 'element_002.png']), true);
  controller.tick(100);
  controller.tick(310);
  assert.ok(canvas.drawn >= 2);
  assert.equal(await controller.play('crescimento', 'element_999.png'), false);
  assert.equal(controller.active, false);
  controller.destroy();
});

test('Web and Windows use one approved sprite presentation for every phase', () => {
  const context = runtimeContext();
  run(context,'app/sprite-manifest.js');
  assert.equal(context.BabySpritePresentation.size,128);
  assert.equal(context.BabySpritePresentation.zoom,1.06);
  assert.ok(Object.isFrozen(context.BabySpritePresentation));
  for (const stage of ['newborn','baby','toddler','child']) {
    assert.ok(context.BabySpriteManifest[stage].idle);
    assert.ok(context.BabySpriteManifest[stage].walk);
  }
  assert.equal(context.BabySpriteManifest.newborn.walk.left.filename,'crawl_sheet.webp');
  assert.equal(context.BabySpriteManifest.newborn.walk.right.flipX,true);
});
