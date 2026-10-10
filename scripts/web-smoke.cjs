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
    await page.locator('.game-shell').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'desktop-before-interaction.png'), fullPage: true, animations: 'disabled' });
    const foodBefore = Number(await page.locator('#food').getAttribute('value'));
    assert.ok(foodBefore <= 74, 'first feed should be ready to play');
    await drag(page, '[data-item="feed"]', '#baby');
    assert.match(await page.locator('#care-count').textContent(), /1 cuidado/);
    await drag(page, '[data-item="toy"]', '#baby');
    assert.match(await page.locator('#feedback').textContent(), /brincou|brincar/i);
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
    const unloaded = await page.locator('.inventory img').evaluateAll(imgs => imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src));
    assert.equal(unloaded.length, 0, 'missing icon images: ' + unloaded.join(', '));
    await page.screenshot({ path: path.join(OUT, 'desktop-newborn.png'), fullPage: true, animations: 'disabled' });

    // Inject before app.js hydrates. A normal localStorage edit followed by
    // reload is overwritten by the previous page's pagehide auto-save.
    await page.addInitScript(() => {
      window.localStorage.setItem('baby-on-screen-web-v1', JSON.stringify({
        activeSeconds: 5400, careCount: 65, memories: ['Primeiros passos!']
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('phase-name')?.textContent.includes('Criança'));
    assert.match(await page.locator('#phase-name').textContent(), /Criança/);
    await page.screenshot({ path: path.join(OUT, 'desktop-child.png'), fullPage: true, animations: 'disabled' });
    const childArt = await page.locator('#baby').evaluate(baby => getComputedStyle(baby, '::after').backgroundImage);
    assert.match(childArt, /child\.svg/);
    assert.equal(await page.locator('#baby-sprite').isHidden(), true,
      'child stage must preserve the original CSS art until mapped');

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
    assert.deepEqual(errors, [], 'browser JS errors');
    await context.close();
    console.log('Web smoke passed. Screenshots at ' + OUT);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
