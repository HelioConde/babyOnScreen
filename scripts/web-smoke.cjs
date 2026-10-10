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
    const crawling = await page.evaluate(() => window.BabySpriteManifest?.newborn?.walk?.left?.files);
    assert.ok(Array.isArray(crawling) && crawling.length >= 3, 'newborn should crawl while moving');
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
