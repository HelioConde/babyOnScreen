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
  assert.equal(pkg.version,'0.0.2');
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
