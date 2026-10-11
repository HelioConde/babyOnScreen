'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('Windows installer and portable have separate artifact filenames', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).build;
  assert.ok(config.win.target.some(x => x.target === 'nsis'));
  assert.ok(config.win.target.some(x => x.target === 'portable'));
  assert.ok(config.nsis.artifactName.includes('Setup'));
  assert.ok(config.portable.artifactName.includes('Portable'));
  assert.notEqual(config.nsis.artifactName, config.portable.artifactName);
  assert.equal(Object.hasOwn(config.win,'artifactName'),false,'No shared filename can override target names');
  const workflow = fs.readFileSync(path.join(root,'.github','workflows','windows-beta.yml'),'utf8');
  assert.match(workflow, /verify-windows-artifacts\.ps1/);
  assert.ok(fs.existsSync(path.join(root,'scripts','verify-windows-artifacts.ps1')));
});

test('release 0.0.2 is documented and publishes Setup + Portable after tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/publish-release-0.0.2.yml'),'utf8');
  assert.match(workflow,/permissions:\s*\n\s*contents: write/);
  assert.match(workflow,/npm run check/);
  assert.match(workflow,/npm test/);
  assert.match(workflow,/verify-windows-artifacts\.ps1/);
  assert.match(workflow,/windows-app-smoke\.cjs/);
  assert.match(workflow,/gh release create v0\.0\.2/);
  for (const file of ['Baby-On-Screen-Setup-0.0.2-x64.exe','Baby-On-Screen-Portable-0.0.2-x64.exe'])
    assert.ok(workflow.includes(file),file);
  assert.ok(fs.existsSync(path.join(root,'docs/RELEASE_0.0.2.md')));
});

test('new updater exposes only safe IPC actions through the sandboxed preload', () => {
  const main = fs.readFileSync(path.join(root, 'app/main.cjs'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'app/preload.cjs'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'app/renderer.js'), 'utf8');
  for (const id of ['desktop-updates','update-check','update-install','update-progress','update-release'])
    assert.ok(ui.includes('id="' + id + '"'));
  assert.match(main, /createUpdateService/);
  assert.match(main, /validSender\(event\)/);
  assert.match(preload, /baby:update:install/);
  assert.match(preload, /baby:update:status/);
  assert.match(renderer, /desktop\.installUpdate\(\)/);
  assert.match(renderer, /save\(\); \/\/ Save baby data/);
});

test('future Windows releases embed GitHub update feed with strong checksums', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Future version bumps must be supported');
  assert.equal(pkg.dependencies['electron-updater'],'6.8.9');
  assert.equal(pkg.build.publish[0].provider,'github');
  assert.equal(pkg.build.publish[0].owner,'HelioConde');
  assert.equal(pkg.build.publish[0].repo,'babyOnScreen');
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/release-windows.yml'),'utf8');
  assert.match(workflow,/latest\.yml/);
  assert.match(workflow,/gh release create/);
  assert.match(workflow,/npm run check/);
  assert.match(workflow,/npm test/);
  assert.match(workflow,/verify-update-feed\.ps1/);
  assert.match(workflow,/windows-app-smoke\.cjs/);
  assert.ok(fs.existsSync(path.join(root,'docs/RELEASE_0.0.3.md')));
});

test('every new release publishes fixed-name direct downloads alongside versioned EXEs', () => {
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/release-windows.yml'),'utf8');
  const readme = fs.readFileSync(path.join(root,'README.md'),'utf8');
  const aliasWorkflow = fs.readFileSync(path.join(root,'.github/workflows/attach-stable-downloads.yml'),'utf8');
  for (const name of ['Baby-On-Screen-Setup-x64.exe','Baby-On-Screen-Portable-x64.exe']) {
    assert.ok(workflow.includes(name), 'future release should contain '+name);
    assert.ok(aliasWorkflow.includes(name), 'current release should contain '+name);
    assert.ok(readme.includes('releases/latest/download/'+name), 'README link to latest '+name);
  }
  assert.match(workflow,/Get-FileHash -Algorithm SHA256/);
  assert.match(workflow,/gh release create/);
  assert.match(aliasWorkflow,/gh release upload/);
  assert.ok(readme.includes('releases/latest'), 'central download hub exists');
});
