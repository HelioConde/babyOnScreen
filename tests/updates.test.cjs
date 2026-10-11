'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdateService, compareVersions, FIRST_CHECK_MS, CHECK_EVERY_MS } = require('../app/updates.cjs');
test('compare valid stable versions only', () => {
  assert.equal(compareVersions('0.0.4', '0.0.3'), 1);
  assert.equal(compareVersions('v0.0.2', '0.0.3'), -1);
  assert.equal(compareVersions('0.0.3', '0.0.3'), 0);
  assert.equal(compareVersions('2.1.0-beta.1', '2.0.0'), 0);
});
test('installed app downloads update but waits for restart confirmation', async () => {
  const updater = new EventEmitter();
  let checks = 0, restarts = 0;
  updater.checkForUpdates = async () => {
    checks++;
    updater.emit('update-available', { version: '0.0.4' });
    updater.emit('download-progress', { percent: 48 });
    updater.emit('update-downloaded', { version: '0.0.4' });
  };
  updater.quitAndInstall = () => { restarts++; };
  const broadcasts = [];
  const service = createUpdateService({ app: { getVersion: () => '0.0.3' },
    autoUpdater: updater, broadcast: status => broadcasts.push(status) });
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.allowPrerelease, false);
  assert.equal(service.install(), false);
  assert.equal((await service.check()).phase, 'ready');
  assert.equal(restarts, 0);
  assert.ok(broadcasts.some(x => x.phase === 'downloading' && x.percent === 48));
  assert.equal(service.install(), true);
  assert.equal(restarts, 1);
  await service.check();
  assert.equal(checks, 1);
  service.dispose();
  assert.equal(updater.listenerCount('update-available'), 0);
});
test('offline failures do not crash the game or install anything', async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => { throw new Error('offline'); };
  updater.quitAndInstall = () => { throw Error('unexpected install'); };
  const service = createUpdateService({ app: { getVersion: () => '0.0.3' }, autoUpdater: updater });
  assert.equal((await service.check()).phase, 'error');
  assert.equal(service.install(), false);
  service.dispose();
});
test('portable only offers the official download, without installing', async () => {
  const service = createUpdateService({ app: { getVersion: () => '0.0.3' },
    portable: true, getLatestVersion: async () => '0.0.4' });
  assert.equal((await service.check()).phase, 'portable-new');
  assert.equal(service.install(), false);
  service.dispose();
});
test('automatic checks are scheduled at startup and every four hours', async () => {
  let first, periodic, firstMs, periodicMs;
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => updater.emit('update-not-available');
  const service = createUpdateService({
    app: { getVersion: () => '0.0.3' }, autoUpdater: updater,
    setDelay: (f, ms) => { first = f; firstMs = ms; return { unref() {} }; },
    setTimer: (f, ms) => { periodic = f; periodicMs = ms; return { unref() {} }; },
    clearDelay: () => {}, clearTimer: () => {}
  });
  service.start();
  assert.equal(firstMs, FIRST_CHECK_MS);
  assert.equal(periodicMs, CHECK_EVERY_MS);
  first(); await Promise.resolve();
  assert.equal(service.getStatus().phase, 'current');
  periodic(); await Promise.resolve();
  assert.equal(service.getStatus().phase, 'current');
  service.dispose();
});
