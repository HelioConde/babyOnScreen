'use strict';
const https = require('node:https');
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;
const FIRST_CHECK_MS = 15000;
const RELEASE_API = 'https://api.github.com/repos/HelioConde/babyOnScreen/releases/latest';
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;
function compareVersions(a, b) {
  const x = VERSION.exec(a || ''), y = VERSION.exec(b || '');
  if (!x || !y) return 0;
  for (let i = 1; i <= 3; i++) {
    if (Number(x[i]) !== Number(y[i])) return Number(x[i]) > Number(y[i]) ? 1 : -1;
  }
  return 0;
}
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.get(RELEASE_API, {
      headers: { 'User-Agent': 'BabyOnScreen-Updater', Accept: 'application/vnd.github+json' },
      timeout: 12000
    }, response => {
      if (response.statusCode !== 200) {
        response.resume(); reject(new Error('GitHub returned ' + response.statusCode)); return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 128000) req.destroy(new Error('Response too large'));
      });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.draft || data.prerelease || !VERSION.test(data.tag_name)) throw new Error('No stable release');
          resolve(data.tag_name.replace(/^v/, ''));
        } catch (e) { reject(e); }
      });
      response.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Network timeout')));
    req.on('error', reject);
  });
}
function createUpdateService({ app, autoUpdater, portable = false, development = false,
  broadcast = () => {}, getLatestVersion = fetchLatestRelease,
  setTimer = setInterval, clearTimer = clearInterval,
  setDelay = setTimeout, clearDelay = clearTimeout }) {
  let status = Object.freeze({ phase: development ? 'development' : portable ? 'portable' : 'idle' });
  let busy = false, timer = null, delay = null, disposed = false, ready = false;
  const listeners = [];
  function publish(phase, extra = {}) {
    status = Object.freeze({ phase, ...extra });
    if (!disposed) broadcast(status);
    return status;
  }
  if (!development && !portable && autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    function listen(type, callback) {
      autoUpdater.on(type, callback); listeners.push([type, callback]);
    }
    listen('checking-for-update', () => publish('checking'));
    listen('update-available', info => publish('available', { version: info?.version || '' }));
    listen('update-not-available', () => { if (!ready) publish('current'); });
    listen('download-progress', info => publish('downloading', {
      percent: Math.max(0, Math.min(100, Number(info?.percent) || 0))
    }));
    listen('update-downloaded', info => {
      ready = true; publish('ready', { version: info?.version || '' });
    });
    listen('error', () => { if (!ready) publish('error'); });
  }
  async function check() {
    if (disposed || development || busy || ready) return status;
    busy = true;
    publish('checking');
    try {
      if (portable) {
        const v = await getLatestVersion();
        publish(compareVersions(v, app.getVersion()) > 0 ? 'portable-new' : 'portable', { version: v });
      } else if (autoUpdater) await autoUpdater.checkForUpdates();
      else publish('unavailable');
    } catch {
      if (!ready) publish('error');
    } finally { busy = false; }
    return status;
  }
  function install() {
    if (disposed || portable || development || !autoUpdater || !ready) return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  }
  function start() {
    if (disposed || development || delay || timer) return;
    delay = setDelay(() => { delay = null; void check(); }, FIRST_CHECK_MS);
    timer = setTimer(() => { void check(); }, CHECK_EVERY_MS);
    delay?.unref?.(); timer?.unref?.();
  }
  function dispose() {
    disposed = true;
    if (delay) clearDelay(delay);
    if (timer) clearTimer(timer);
    for (const [name, callback] of listeners) autoUpdater.removeListener(name, callback);
  }
  return Object.freeze({ getStatus: () => status, check, install, start, dispose });
}
module.exports = { createUpdateService, compareVersions, fetchLatestRelease, CHECK_EVERY_MS, FIRST_CHECK_MS };
