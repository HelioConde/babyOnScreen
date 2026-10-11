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
