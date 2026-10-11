'use strict';
/* Browser-powered public demo acceptance tests and visual snapshots. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.WEB_SMOKE_URL || 'http://127.0.0.1:4173/web/';
const OUT = path.resolve('artifacts/screenshots');
fs.mkdirSync(OUT, { recursive: true });

async function drag(page, source, target) {
  const a = await page.locator(source).boundingBox();
  const b = await page.locator(target).boundingBox();
  assert.ok(a && b, 'missing draggable item/baby');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await page.mouse.up();
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('#baby').waitFor();
    assert.match(await page.title(), /Baby On Screen/);
    assert.match(await page.locator('#phase-name').textContent(), /Recém-nascida/);
    await page.locator('.tools-settings summary').click();
    await page.locator('#baby-name-input').fill('Luna');
    assert.match(await page.locator('#baby-name-label').textContent(), /Luna/);
    assert.match(await page.locator('#baby-hero-caption').textContent(), /Luna/);
    assert.equal(await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('baby-on-screen-web-v1'));
      return window.BabyEngine.importSave(window.BabyEngine.exportSave(stored)).babyName;
    }), 'Luna', 'nickname must survive export/import');
    await page.locator('.tools-settings summary').click();
    // The imported PNG animation must actually load, not just leave the CSS fallback.
    await page.waitForFunction(() => {
      const baby = document.getElementById('baby');
      const canvas = document.getElementById('baby-sprite');
      if (!baby?.classList.contains('sprite-ready') || !canvas || canvas.hidden) return false;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) return true;
      return false;
    }, null, { timeout: 10000 });
    assert.match(await page.locator('#hero-character').getAttribute('class'), /sprite-preview/);
    const crawling = await page.evaluate(() => window.BabySpriteManifest?.newborn?.walk?.left);
    assert.equal(crawling?.filename, 'crawl_sheet.webp', 'newborn must use the current crawl atlas');
    assert.equal(crawling?.frames?.length, 8, 'newborn crawl must have eight animation frames');
    assert.equal(await page.evaluate(() => window.BabySpriteManifest.newborn.idle.down.filename),
      'crawl_sheet.webp', 'idle pose must not revert to swaddled art');
    const atlasSize = await page.evaluate(async () => {
      const img = new Image();
      img.src = '../assets/sprites/generated/crescimento/crawl_sheet.webp';
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight };
    });
    assert.deepEqual(atlasSize, { width: 256, height: 128 }, 'crawl atlas must load from the web server');
    const babyBounds = await page.locator('#baby').boundingBox();
    const stageBounds = await page.locator('#stage').boundingBox();
    assert.ok(babyBounds && stageBounds && babyBounds.y - stageBounds.y >= 110,
      'baby should stay clear of the stage title and crying indicator');
    assert.ok(babyBounds.width >= 120 && babyBounds.height >= 120,
      'the baby must have a comfortable visual and pointer target');
    await page.locator('.game-shell').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'desktop-before-interaction.png'), fullPage: true, animations: 'disabled' });
    const foodBefore = Number(await page.locator('#food').getAttribute('value'));
    assert.ok(foodBefore <= 74, 'first feed should be ready to play');
    await drag(page, '[data-item="feed"]', '#baby');
    assert.match(await page.locator('#care-count').textContent(), /1 cuidado/);
    await drag(page, '[data-item="toy"]', '#baby');
    assert.match(await page.locator('#feedback').textContent(), /brincou|brincar/i);
    assert.equal(await page.locator('#happiness-bar').count(), 1);
    assert.ok(await page.locator('#care-suggestion').textContent());
    const dailyReward = page.locator('[data-claim-daily="play"]');
    assert.equal(await dailyReward.count(), 1, 'daily play reward should unlock after playing');
    await dailyReward.click();
    assert.match(await page.locator('#daily-count').textContent(), /1\/3 resgatados/);
    assert.ok(await page.evaluate(() =>
      JSON.parse(localStorage.getItem('baby-on-screen-web-v1')).daily.claimed.includes('play')),
      'daily goal reward saved to localStorage');
    await page.waitForFunction(() => {
      const sprite = document.getElementById('baby-sprite');
      const pixels = sprite.getContext('2d').getImageData(0, 0, sprite.width, sprite.height).data;
      return !sprite.hidden && pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
    // Regression: the parent button's transform must never be animated.
    // Previously .stage-reaction animated transform, teleporting the baby
    // to the top-left when interacting with letters, drawings and toys.
    for (const [item, feedback] of [
      ['letter', /cartinha/i],
      ['drawing', /desenho/i]
    ]) {
      await drag(page, '[data-item="' + item + '"]', '#baby');
      assert.match(await page.locator('#feedback').textContent(), feedback);
      assert.equal(await page.locator('#baby').evaluate(el => getComputedStyle(el).animationName),
        'none', item + ': baby container must not animate transform');
      const first = await page.locator('#baby').boundingBox();
      const stageRect = await page.locator('#stage').boundingBox();
      assert.ok(first && stageRect && first.x >= stageRect.x + 10 &&
        first.y >= stageRect.y + 100, item + ': baby must remain in the play area');
      await page.waitForTimeout(350);
      const second = await page.locator('#baby').boundingBox();
      assert.ok(second && Math.abs(second.x - first.x) < 3 &&
        Math.abs(second.y - first.y) < 3, item + ': baby must stay in place during care');
    }
    const legacy = await page.evaluate(async () => {
      const cleaner = window.BabySpriteCleaner;
      const files = ['alimentacao/element_002.png', 'fralda/element_010.png',
        'sono/element_007.png', 'crescimento/element_031.png', 'crescimento/element_039.png'];
      const checked = [];
      for (const file of files) {
        const canvas = await cleaner.load('../assets/sprites/generated/' + file);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0, red = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 20) continue;
          opaque++;
          if (cleaner.isRedMatte(pixels[i], pixels[i + 1], pixels[i + 2])) red++;
        }
        checked.push({ file, w: canvas.width, h: canvas.height, opaque, red });
      }
      return checked;
    });
    for (const result of legacy) {
      assert.equal(result.w, 224, result.file + ': correct width');
      assert.equal(result.h, 224, result.file + ': correct height');
      assert.ok(result.opaque > 1200, result.file + ': baby should remain visible');
      assert.equal(result.red, 0, result.file + ': red background artifacts removed');
    }
    // Real assets regression: previously the broad red mask erased auburn hair.
    // Compare the alpha channel before/after cleanup using the SAME coordinates.
    const hair = await page.evaluate(async () => {
      const files = [
        'crescimento/element_001.png',
        'crescimento/element_009.png',
        'crescimento/element_030.png',
        'alimentacao/element_002.png',
        'sono/element_007.png'
      ];
      const results = [];
      for (const filename of files) {
        const image = new Image();
        image.src = '../assets/sprites/generated/' + filename;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const raw = new Uint8ClampedArray(pixels.data);
        window.BabySpriteCleaner.cleanPixels(canvas.width, canvas.height, pixels.data);
        let brown = 0, preserved = 0;
        for (let i = 0; i < raw.length; i += 4) {
          const r = raw[i], g = raw[i + 1], b = raw[i + 2];
          if (raw[i + 3] > 150 && r >= 105 && r <= 235 &&
            g >= 57 && g <= 135 && b <= 105 &&
            r > g * 1.18 && r > b * 1.24) {
            brown++;
            if (pixels.data[i + 3] > 150) preserved++;
          }
        }
        results.push({ filename, brown, preserved });
      }
      return results;
    });
    for (const result of hair) {
      assert.ok(result.brown > 120, result.filename + ': brown hair reference pixels found');
      assert.ok(result.preserved / result.brown >= 0.96,
        result.filename + ': brown hair must stay opaque after cleanup ' +
        JSON.stringify(result));
    }
    const manifest = await page.evaluate(() => window.BabySpriteManifest.newborn);
    for (const item of ['letter', 'drawing', 'medicine']) {
      assert.equal(manifest[item]?.down?.filename, 'crawl_sheet.webp',
        item + ': care must use a clean atlas frame');
    }
    assert.deepEqual(manifest.toy.down.files, ['element_039.png'], 'toy avoids contaminated duplicate frame');
    assert.deepEqual(manifest.sleep.down.files, ['element_007.png'], 'sleep avoids adjacent sprite fragments');
    assert.equal(manifest.idle.right.flipX, true, 'idle must face in travel direction');
    assert.equal(manifest.walk.right.flipX, true, 'crawling right must mirror the original left atlas');
    const sceneSound = page.locator('#scene-sound');
    assert.equal(await sceneSound.getAttribute('aria-pressed'), 'false');
    await sceneSound.click();
    assert.equal(await sceneSound.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
    await page.locator('.tools-settings summary').click();
    await page.locator('#sound').click();
    assert.equal(await sceneSound.getAttribute('aria-pressed'), 'false');
    await page.locator('.tools-settings summary').click();
    // A real player must be able to switch the nursery light and collect a milestone.
    await page.locator('#scene-light').click();
    assert.equal(await page.locator('#scene-light').getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('#stage').evaluate(el => el.classList.contains('night-mode')));
    await page.screenshot({ path: path.join(OUT, 'desktop-night-room.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#scene-light').click();
    assert.equal(await page.locator('#scene-light').getAttribute('aria-pressed'), 'false');
    assert.ok(await page.locator('[data-claim-milestone]').count() > 0, 'playing earns a collectable quest reward');
    await page.locator('[data-claim-milestone]').first().click();
    assert.match(await page.locator('#feedback').textContent(), /Missão concluída/);
    assert.ok(await page.locator('#missions-count').textContent().then(x => x.startsWith('1/')),
      'claimed goals are counted exactly once');
    const earned = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('baby-on-screen-web-v1'));
      return save.claimedMilestones;
    });
    assert.equal(earned.length, 1, 'the claimed milestone is persisted in browser storage');
    await page.screenshot({ path: path.join(OUT, 'desktop-missions.png'), fullPage: true, animations: 'disabled' });
    const unloaded = await page.locator('.inventory img').evaluateAll(imgs => imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src));
    assert.equal(unloaded.length, 0, 'missing icon images: ' + unloaded.join(', '));
    await page.screenshot({ path: path.join(OUT, 'desktop-newborn.png'), fullPage: true, animations: 'disabled' });

    // Inject before app.js hydrates. A normal localStorage edit followed by
    // reload is overwritten by the previous page's pagehide auto-save.
    await page.addInitScript(() => {
      window.localStorage.setItem('baby-on-screen-web-v1', JSON.stringify({
        activeSeconds: 5400, careCount: 65,
        memories: ['Criamos um desenho juntas!', 'Ganhei uma cartinha carinhosa!',
          'Criamos um desenho juntas!', 'Primeiros passos!'],
        memoryCounts: { 'Criamos um desenho juntas!': 18,
          'Ganhei uma cartinha carinhosa!': 7, 'Primeiros passos!': 1 }
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('phase-name')?.textContent.includes('Criança'));
    assert.match(await page.locator('#phase-name').textContent(), /Criança/);
    const displayedCount = await page.locator('#memory-count').textContent();
    assert.ok(Number.parseInt(displayedCount, 10) >= 26,
      'existing counts must survive migration and new milestones: ' + displayedCount);
    await page.locator('.memory-row details summary').click();
    const chips = await page.locator('.memory-chip').allTextContents();
    assert.equal(chips.filter(x => x.includes('Criamos um desenho juntas!')).length, 1,
      'all repeated drawings should share one badge');
    assert.ok(chips.some(x => x.includes('Criamos um desenho juntas!') && x.includes('×18')),
      'accumulated count must appear in the album');
    await page.screenshot({ path: path.join(OUT, 'desktop-child.png'), fullPage: true, animations: 'disabled' });
    // School is available in the Web child stage as well as Windows.
    assert.equal(await page.locator('#school-web').isVisible(), true);
    await page.locator('#school-web-open').click();
    await page.locator('#school-web-subject').selectOption('numbers');
    const quiz = await page.locator('#school-web-question').textContent();
    const answer = /6 - 2/.test(quiz) ? '4' : '5';
    await page.locator('#school-web-answers button').filter({ hasText: answer }).click();
    assert.match(await page.locator('#school-web-stats').textContent(), /1 aula concluída/);
    assert.match(await page.locator('#feedback').textContent(), /Aula concluída/);
    await page.screenshot({ path: path.join(OUT, 'desktop-school.png'), fullPage: true, animations: 'disabled' });
    const childEntry = await page.evaluate(() => window.BabySpriteManifest.child.walk.right);
    assert.ok(childEntry.files.includes('element_030.png'), 'child phase uses the pink-bow sprite pack');
    await page.locator('#baby-sprite').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const sprite = document.getElementById('baby-sprite');
      const pixels = sprite.getContext('2d').getImageData(0, 0, sprite.width, sprite.height).data;
      return pixels.some((n, i) => i % 4 === 3 && n > 80);
    }, null, { timeout: 15000 });
    const childArt = await page.locator('#baby').evaluate(baby => getComputedStyle(baby, '::after').backgroundImage);
    assert.match(childArt, /element_033\.png/, 'child CSS fallback should use the same baby, not SVG');
    assert.match(await page.locator('#hero-character').getAttribute('class'), /sprite-preview/);
    for (const card of await page.locator('.phases img.stage-image').all()) {
      assert.ok(await card.evaluate(img => img.complete && img.naturalWidth > 0),
        'all evolution stages must have an available high-resolution sprite');
      assert.equal(await card.evaluate(img => img.src.includes('growth/')), false,
        'growth cards must not use old blocky SVGs');
    }
    assert.equal(await page.locator('.desktop-illustration img').getAttribute('src').then(src => src.includes('growth/')), false);


    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
      isMobile: true, hasTouch: true
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(BASE, { waitUntil: 'domcontentloaded' });
    await mobile.locator('#baby').waitFor();
    await mobile.screenshot({ path: path.join(OUT, 'mobile-newborn.png'), fullPage: true, animations: 'disabled' });
    const dimensions = await mobile.evaluate(() => ({ body: document.documentElement.scrollWidth, screen: window.innerWidth }));
    assert.ok(dimensions.body <= dimensions.screen + 3, 'mobile horizontal overflow: ' + JSON.stringify(dimensions));
    await mobile.locator('[data-item="letter"]').tap();
    await mobile.locator('#baby').tap();
    assert.match(await mobile.locator('#feedback').textContent(), /cartinha/i);
    await mobileContext.close();

    // A reopened tab must credit wall time, even with no animation frames rendered.
    const clockContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const background = await clockContext.newPage();
    background.on('pageerror', error => errors.push(error.message));
    await background.addInitScript(() => {
      localStorage.setItem('baby-on-screen-web-v1', JSON.stringify({
        activeSeconds: 60, savedAt: Date.now() - 120000
      }));
    });
    await background.goto(BASE, { waitUntil: 'domcontentloaded' });
    await background.waitForFunction(() => {
      const label = document.getElementById('game-time')?.textContent || '';
      return Number.parseInt(label, 10) >= 7;
    }, null, { timeout: 10000 });
    const advancing = await background.locator('#game-time').textContent();
    assert.ok(Number.parseInt(advancing, 10) >= 7, 'two real minutes must count as six game minutes');
    await clockContext.close();

    const pausedContext = await browser.newContext();
    const paused = await pausedContext.newPage();
    paused.on('pageerror', error => errors.push(error.message));
    await paused.addInitScript(() => {
      localStorage.setItem('baby-on-screen-web-v1', JSON.stringify({
        activeSeconds: 60, savedAt: Date.now() - 120000
      }));
      localStorage.setItem('baby-on-screen-web-preferences-v1', JSON.stringify({ paused: true }));
    });
    await paused.goto(BASE, { waitUntil: 'domcontentloaded' });
    assert.equal(Number.parseInt(await paused.locator('#game-time').textContent(), 10), 1,
      'paused games must not advance on resume');
    await pausedContext.close();
    // QA lab: verify real static inventory, manifest animations and a working player.
    const admin = await context.newPage();
    admin.on('pageerror', error => errors.push('admin: ' + error.message));
    await admin.goto(new URL('admin-sprites.html', BASE).href, { waitUntil: 'domcontentloaded' });
    await admin.locator('#sprite-grid .sprite-card').first().waitFor();
    assert.equal(await admin.locator('#asset-total').textContent(), '566');
    assert.equal(await admin.locator('#category-total').textContent(), '10');
    assert.equal(await admin.locator('#sprite-grid .sprite-card').count(), 30,
      'inventory must page the hundreds of PNGs');
    await admin.locator('#load-status.ready').waitFor({ timeout: 15000 });
    await admin.screenshot({ path: path.join(OUT, 'admin-sprites-library.png'), fullPage: true, animations: 'disabled' });
    await admin.locator('#view-animations').click();
    assert.equal(await admin.locator('#view-animations').getAttribute('aria-pressed'), 'true');
    await admin.locator('#phase').selectOption('toddler');
    await admin.locator('#action').selectOption('walk');
    await admin.locator('#direction').selectOption('right');
    assert.equal(await admin.locator('#sprite-grid .sprite-card').count(), 1);
    await admin.locator('#sprite-grid .sprite-card').click();
    await admin.locator('#load-status.ready').waitFor({ timeout: 15000 });
    assert.match(await admin.locator('#viewer-title').textContent(), /Primeiros passos/);
    assert.equal(await admin.locator('#frames .frame-button').count(), 4);
    const beforeFrame = await admin.locator('#frame-label').textContent();
    await admin.locator('#next-frame').click();
    assert.notEqual(await admin.locator('#frame-label').textContent(), beforeFrame);
    await admin.locator('#fps').evaluate(el => {
      el.value = '12';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await admin.locator('#fps-value').textContent(), '12');
    await admin.screenshot({ path: path.join(OUT, 'admin-sprites-first-steps.png'), fullPage: true, animations: 'disabled' });

    // Editor must erase opaque pixels, undo/redo, restore draft after reopen and export PNG.
    await admin.locator('#view-assets').click();
    await admin.locator('#sprite-grid .sprite-card').first().click();
    await admin.locator('#load-status.ready').waitFor({ timeout: 15000 });
    await admin.locator('#open-editor').click();
    await admin.locator('#sprite-editor').waitFor({ state: 'visible' });
    await admin.waitForFunction(() => document.getElementById('editor-save-status')?.textContent.includes('Pronto'));
    const sample = await admin.locator('#editor-canvas').evaluate(canvas => {
      const { width, height } = canvas;
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      for (let y = Math.floor(height * .3); y < Math.floor(height * .7); y++) {
        for (let x = Math.floor(width * .3); x < Math.floor(width * .7); x++) {
          if (pixels[(y * width + x) * 4 + 3] >= 230)
            return { x, y, width, height };
        }
      }
      return null;
    });
    assert.ok(sample, 'sprite editor must display actual source pixels');
    const canvasBounds = await admin.locator('#editor-canvas').boundingBox();
    assert.ok(canvasBounds);
    await admin.locator('#editor-brush').evaluate(el => {
      el.value = '12'; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await admin.mouse.click(canvasBounds.x + (sample.x + .5) * canvasBounds.width / sample.width,
      canvasBounds.y + (sample.y + .5) * canvasBounds.height / sample.height);
    await admin.waitForFunction(({x,y,width}) => {
      const c = document.getElementById('editor-canvas');
      return c.getContext('2d').getImageData(x,y,1,1).data[3] === 0;
    }, { x: sample.x, y: sample.y, width: sample.width });
    await admin.locator('#editor-undo').click();
    assert.ok(await admin.locator('#editor-canvas').evaluate((c,{x,y}) =>
      c.getContext('2d').getImageData(x,y,1,1).data[3] > 0, sample));
    await admin.locator('#editor-redo').click();
    assert.equal(await admin.locator('#editor-canvas').evaluate((c,{x,y}) =>
      c.getContext('2d').getImageData(x,y,1,1).data[3], sample), 0);
    await admin.locator('#editor-save').click();
    await admin.waitForFunction(() =>
      document.getElementById('editor-save-status')?.textContent.includes('salvas'));
    const draftExists = await admin.evaluate(async () => {
      const row = await window.BabySpriteEditor.getDraft('../assets/sprites/generated/crescimento/element_001.png');
      return !!row?.blob && row?.width > 0;
    });
    assert.ok(draftExists, 'manual edits should persist in browser storage');
    await admin.waitForFunction(() => document.getElementById('edited-count')?.textContent === '1');
    assert.equal(await admin.locator('#export-edits').isEnabled(), true);
    const download = admin.waitForEvent('download');
    await admin.locator('#editor-download').click();
    const file = await download;
    assert.equal(file.suggestedFilename(), 'element_001.png');
    await admin.locator('#editor-close').click();
    const bulkDownload = admin.waitForEvent('download');
    await admin.locator('#export-edits').click();
    const downloadedZip = await bulkDownload;
    assert.match(downloadedZip.suggestedFilename(), /^babyonscreen-sprites-editados-\d{4}-\d{2}-\d{2}\.zip$/);
    const zipBytes = fs.readFileSync(await downloadedZip.path());
    assert.equal(zipBytes.toString('ascii', 0, 4), 'PK\x03\x04', 'ZIP must have a valid file header');
    assert.ok(zipBytes.includes(Buffer.from('assets/sprites/generated/crescimento/element_001.png')),
      'ZIP must preserve the original repository path');
    assert.ok(zipBytes.includes(Buffer.from('sprite-edits-manifest.json')),
      'ZIP must include the change manifest');
    assert.match(await admin.locator('#export-status').textContent(), /1 PNG/);
    await admin.locator('#open-editor').click();
    await admin.waitForFunction(() =>
      document.getElementById('editor-save-status')?.textContent.includes('restaurado'));
    assert.equal(await admin.locator('#editor-canvas').evaluate((c,{x,y}) =>
      c.getContext('2d').getImageData(x,y,1,1).data[3], sample), 0,
      'saved edits must survive reopening editor');
    admin.once('dialog', dialog => dialog.accept());
    await admin.locator('#editor-reset').click();
    await admin.waitForFunction(() =>
      document.getElementById('editor-save-status')?.textContent.includes('original restaurada'));
    await admin.waitForFunction(() => document.getElementById('edited-count')?.textContent === '0');
    assert.equal(await admin.locator('#export-edits').isDisabled(), true,
      'export button should disable after all edited sprites are reset');
    assert.equal(await admin.locator('#editor-canvas').evaluate((c,{x,y}) =>
      c.getContext('2d').getImageData(x,y,1,1).data[3] > 0, sample), true);
    await admin.locator('#editor-close').click();
    await admin.close();

    const adminMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
      isMobile: true, hasTouch: true
    });
    const adminMobile = await adminMobileContext.newPage();
    adminMobile.on('pageerror', error => errors.push('admin-mobile: ' + error.message));
    await adminMobile.goto(new URL('admin-sprites.html', BASE).href, { waitUntil: 'domcontentloaded' });
    await adminMobile.locator('.sprite-card').first().waitFor();
    const adminWidth = await adminMobile.evaluate(() =>
      ({ document: document.documentElement.scrollWidth, window: window.innerWidth }));
    assert.ok(adminWidth.document <= adminWidth.window + 3,
      'sprite admin mobile horizontal overflow: ' + JSON.stringify(adminWidth));
    await adminMobile.screenshot({ path: path.join(OUT, 'admin-sprites-mobile.png'), fullPage: true, animations: 'disabled' });
    await adminMobileContext.close();
    assert.deepEqual(errors, [], 'browser JS errors');
    await context.close();
    console.log('Web smoke passed. Screenshots at ' + OUT);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
