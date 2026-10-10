'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function context() {
  const ctx = {};
  ctx.window = ctx;
  for (const filename of ['app/sprite-manifest.js','app/sprite-admin-catalog.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, filename), 'utf8'), ctx, { filename });
  }
  return ctx;
}
test('the sprite laboratory lists every existing imported PNG and sheet', () => {
  const C = context().BabySpriteAdminCatalog;
  assert.equal(C.categories.length, 10);
  assert.equal(C.assets.length, 566);
  assert.equal(C.assets.filter(x => x.filename.endsWith('.png')).length, 565);
  assert.equal(C.assets.filter(x => x.filename === 'crawl_sheet.webp').length, 1);
  for (const asset of C.assets) {
    assert.equal(asset.kind, 'asset');
    assert.ok(fs.existsSync(path.join(root, asset.path.replace(/^\.\.\//, ''))),
      'missing catalog item: ' + asset.path);
  }
  assert.equal(new Set(C.assets.map(x => x.path)).size, C.assets.length);
});
test('every registered stage animation is visible with the correct crop data and images', () => {
  const ctx = context();
  const animations = ctx.BabySpriteAdminCatalog.animationsFromManifest(ctx.BabySpriteManifest);
  assert.ok(animations.length > 30);
  const crawl = animations.find(x => x.stage === 'newborn' && x.action === 'walk' && x.direction === 'left');
  assert.ok(crawl);
  assert.equal(crawl.files[0], 'crawl_sheet.webp');
  assert.equal(crawl.frames.length, 8);
  const right = animations.find(x => x.stage === 'newborn' && x.action === 'walk' && x.direction === 'right');
  assert.equal(right.flipX, true);
  const toddler = animations.find(x => x.stage === 'toddler' && x.action === 'walk' && x.direction === 'right');
  assert.ok(toddler.files.length >= 3);
  for (const animation of animations) {
    assert.ok(animation.files.length);
    for (const file of animation.files) {
      assert.ok(fs.existsSync(path.join(root, ctx.BabySpriteAdminCatalog.pathFor(animation.category, file).slice(3))),
        animation.id + ' missing ' + file);
    }
  }
});
test('panel is read-only and validates its DOM and JavaScript files', () => {
  const html = fs.readFileSync(path.join(root, 'web/admin-sprites.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'web/admin-sprites.js'), 'utf8');
  for (const id of ['sprite-grid','preview','frames','search','phase','action','direction',
    'fps','frame-scrub','show-checker','show-cleaned','flip-horizontal','view-animations',
    'view-assets','page-next','page-prev','load-status']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /sprite-admin-catalog\.js/);
  assert.match(html, /admin-sprites\.js/);
  assert.doesNotMatch(js, /fetch\s*\(\s*['"]https:\/\//);
  assert.doesNotThrow(() => new vm.Script(js));
});
