'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'web', 'app.js'), 'utf8');
test('web demo has game canvas, care actions, settings and PT-BR language', () => {
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /id="stage"/);
  assert.match(html, /id="baby"/);
  for (const action of ['feed', 'sleep', 'diaper', 'medicine'])
    assert.ok(html.includes('data-care="' + action + '"'));
  for (const key of ['food', 'energy', 'hygiene', 'health'])
    assert.ok(html.includes('id="' + key + '"'));
  for (const id of ['reset', 'pause', 'sound', 'speed'])
    assert.ok(html.includes('id="' + id + '"'));
});
test('web demo assets are local, present and shared with the Windows engine', () => {
  for (const file of ['engine.js', 'sprits/char1.png', 'som/rindo.mp3', 'som/feliz.mp3', 'web/style.css', 'web/app.js'])
    assert.ok(fs.existsSync(path.join(root, file)), 'missing ' + file);
  assert.match(html, /src="\.\.\/engine\.js"/);
  assert.match(script, /window\.BabyEngine/);
  assert.match(script, /E\.care\(/);
  assert.match(script, /E\.advanceClock\(/);
});
test('web demo script can be parsed by Node', () => {
  const vm = require('node:vm');
  assert.doesNotThrow(() => new vm.Script(script, { filename: 'web/app.js' }));
});
