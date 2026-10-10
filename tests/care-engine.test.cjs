'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('novo bebê começa com necessidades válidas e nível 1', () => {
  const baby = E.initial();
  for (const key of Object.keys(E.defaults)) assert.ok(baby.needs[key] >= 0 && baby.needs[key] <= 100);
  assert.equal(E.level(baby), 1);
});
test('tempo degrada necessidades sem mutar o estado anterior', () => {
  const before = E.initial();
  const after = E.tick(before, 500);
  assert.ok(after.needs.food < before.needs.food);
  assert.ok(after.needs.energy < before.needs.energy);
  assert.equal(before.needs.food, 85);
  assert.deepEqual(E.tick(before, -5).needs, before.needs);
});
test('todas as quatro ações restauram corretamente os cuidados', () => {
  for (const [name, action] of Object.entries(E.actions)) {
    const baby = E.initial();
    baby.needs[action.need] = 20;
    const result = E.care(baby, name);
    assert.equal(result.applied, true, name);
    assert.ok(result.state.needs[action.need] > 20, name);
    assert.equal(result.state.careCount, 1);
    assert.equal(result.state.xp, 10);
    assert.equal(baby.needs[action.need], 20);
  }
});
test('necessidade completa impede spam de cuidados', () => {
  const baby = E.initial(); baby.needs.food = 100;
  const result = E.care(baby, 'feed');
  assert.equal(result.applied, false);
  assert.equal(result.state.xp, 0);
});
test('dados salvos inválidos não quebram o motor', () => {
  const state = E.sanitize({ needs: { food: -100, energy: 999, hygiene: 'erro' }, xp: -99 });
  assert.equal(state.needs.food, 0);
  assert.equal(state.needs.energy, 100);
  assert.equal(state.needs.hygiene, E.defaults.hygiene);
  assert.equal(state.xp, 0);
  assert.equal(E.concern(state), 'food');
  assert.equal(E.care(state, '__invalid__').applied, false);
});
test('saúde piora mais rapidamente se outras necessidades estiverem críticas', () => {
  const good = E.initial(), bad = E.initial(); bad.needs.food = 5;
  assert.ok(E.tick(bad, 100).needs.health < E.tick(good, 100).needs.health);
});
test('níveis progridem até 20', () => {
  const baby = E.initial(); baby.xp = 230;
  assert.equal(E.level(baby), 3);
  baby.xp = 99999;
  assert.equal(E.level(baby), 20);
});
