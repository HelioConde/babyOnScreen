'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../engine.js');
const root = path.resolve(__dirname, '..');

test('crescimento requer tempo ativo E cuidados', () => {
  const s = E.initial(1000000);
  assert.equal(E.ageStage(s).id, 'newborn');
  s.activeSeconds = 5400;
  assert.equal(E.ageStage(s).id, 'newborn');
  s.careCount = 8;
  assert.equal(E.ageStage(s).id, 'baby');
  s.careCount = 26;
  assert.equal(E.ageStage(s).id, 'toddler');
  s.careCount = 65;
  assert.equal(E.ageStage(s).id, 'child');
  assert.equal(E.ageDays(s), 7);
});
test('tempo offline nao aumenta idade mas desgasta necessidades', () => {
  const s = E.initial(1000000);
  const away = E.tick(s, 150, { active: false });
  assert.equal(away.activeSeconds, 0);
  assert.ok(away.needs.food < s.needs.food);
  assert.equal(E.tick(s, 30).activeSeconds, 30);
});
test('linguagem comeca em balbucio e nao diz humano', () => {
  const s = E.initial(1000000);
  assert.match(E.speak(s, 'idle', .05), /gugu|da|agu|baba/i);
  assert.doesNotMatch(E.speak(s, 'return', .5), /humano/i);
  s.activeSeconds = 5400; s.careCount = 65;
  assert.match(E.speak(s, 'return', .75), /amigo|voltou|saudades/i);
});
test('cuidados somente quando necessarios e com intervalo', () => {
  const now = 1000000;
  const s = E.initial(now);
  assert.equal(E.care(s, 'feed', now).reason, 'not-needed');
  s.needs.food = 20;
  const first = E.care(s, 'feed', now);
  assert.equal(first.applied, true);
  assert.equal(first.state.careCount, 1);
  assert.equal(E.care(first.state, 'feed', now + 1000).reason, 'cooldown');
  assert.equal(E.care(first.state, 'feed', now + 49000).applied, true);
});
test('brinquedo, cartinha e desenho geram habilidade e memoria', () => {
  const now = 1000000;
  let s = E.initial(now);
  for (const [name, skill] of [['toy', 'play'], ['letter', 'bond'], ['drawing', 'creativity']]) {
    const result = E.interact(s, name, now);
    assert.equal(result.applied, true);
    assert.ok(result.state.skills[skill] >= 1);
    assert.equal(E.interact(result.state, name, now + 1000).reason, 'cooldown');
    s = result.state;
  }
  assert.equal(s.interactions, 3);
  assert.equal(s.memories.length, 3);
});
test('escola so funciona na fase crianca', () => {
  const now = 1000000;
  assert.equal(E.school(E.initial(now), 'reading', now).reason, 'too-young');
  const child = E.initial(now);
  child.activeSeconds = 5400; child.careCount = 65;
  const lesson = E.school(child, 'numbers', now);
  assert.equal(lesson.applied, true);
  assert.equal(lesson.state.schoolVisits, 1);
  assert.equal(lesson.state.skills.numbers, 1);
  assert.ok(lesson.state.achievements.includes('first-class'));
  assert.equal(E.school(lesson.state, 'arts', now + 1000).reason, 'cooldown');
});
test('salvamento web/pc preserva fases e habilidades', () => {
  const s = E.initial(1000000);
  s.activeSeconds = 5400; s.careCount = 65; s.skills.creativity = 10;
  const copy = E.importSave(E.exportSave(s));
  assert.equal(E.ageStage(copy).id, 'child');
  assert.equal(copy.skills.creativity, 10);
  assert.throws(() => E.importSave('{"hello":"world"}'), /não é um salvamento/);
  assert.throws(() => E.importSave('bad-json'), /inválido/);
});
test('icones e novos sprites existem', () => {
  for (const file of ['baby.svg', 'toddler.svg', 'child.svg'])
    assert.ok(fs.existsSync(path.join(root, 'assets', 'growth', file)));
  for (const file of ['bottle','crib','diaper','medicine','toy','letter','drawing','moon','heart'])
    assert.ok(fs.existsSync(path.join(root,'assets','icons',file+'.svg')));
});
test('interfaces possuem jogabilidade e aprendizado', () => {
  const web = fs.readFileSync(path.join(root, 'web', 'app.js'), 'utf8');
  const pc = fs.readFileSync(path.join(root, 'app', 'renderer.js'), 'utf8');
  const site = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
  const overlay = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  for (const script of [web,pc]) {
    assert.match(script, /setPointerCapture/);
    assert.match(script, /E\.speak\(/);
    assert.match(script, /E\.care\(/);
    assert.match(script, /E\.interact\(/);
    assert.match(script, /E\.exportSave\(/);
    assert.match(script, /E\.importSave\(/);
  }
  assert.match(site, /class="game-shell"/);
  assert.match(site, /id="inventory"/);
  assert.match(site, /id="cry-indicator"/);
  assert.match(overlay, /id="school-section"/);
  assert.match(pc, /E\.school\(/);
  assert.doesNotMatch(site, /Oi, humano/i);
});
