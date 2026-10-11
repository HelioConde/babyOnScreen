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

test('album acumula atividades iguais mesmo depois do limite de 24 eventos', () => {
  let state = E.initial(1000000);
  const start = 1000000;
  for (let i = 0; i < 35; i++) {
    const result = E.interact(state, 'toy', start + i * 80000);
    assert.equal(result.applied, true);
    state = result.state;
  }
  const summary = E.memorySummary(state);
  assert.equal(summary.groups.find(x => x.label === 'Brincamos com um brinquedo!')?.count, 35);
  assert.ok(state.memories.length <= 24);
  assert.ok(summary.total >= 35);
  assert.equal(E.memorySummary(E.importSave(E.exportSave(state))).total, summary.total);
  const after = E.interact(state, 'drawing', start + 35 * 80000);
  assert.equal(after.applied, true);
  assert.equal(E.memorySummary(after.state).groups.find(x => x.label === 'Criamos um desenho juntas!')?.count, 1);
});
test('album migra lembranças antigas e ignora contadores inválidos', () => {
  const old = E.sanitize({ memories: ['Cartinha', 'Desenho', 'Cartinha'] });
  assert.equal(E.memorySummary(old).total, 3);
  assert.equal(E.memorySummary(old).groups.find(x => x.label === 'Cartinha')?.count, 2);
  const sanitized = E.sanitize({ memories: ['Cartinha'], memoryCounts: { Cartinha: 6, Invalido: -2 } });
  assert.equal(E.memorySummary(sanitized).total, 6);
  assert.equal(E.memorySummary(sanitized).groups.length, 1);
});

test('o relógio real avança a idade mesmo quando a aba não renderiza quadros', () => {
  const initial = E.initial(1000);
  const progressed = E.advanceClock(initial, 120);
  assert.equal(progressed.activeSeconds, 360); // Same 3× speed as normal gameplay
  assert.equal(progressed.lifeSeconds, 360);
  assert.equal(initial.activeSeconds, 0, 'original state is immutable');
  assert.ok(progressed.needs.food < initial.needs.food);
});
test('o relógio limita ausência longa, não conta tempo negativo e respeita pausa', () => {
  const state = E.initial(1000);
  const gap = E.advanceClock(state, 7200);
  assert.equal(gap.activeSeconds, 21600);
  assert.ok(gap.needs.food > 60, 'needs decay capped to three game minutes on one long gap');
  assert.equal(E.advanceClock(state, 86400).activeSeconds, gap.activeSeconds);
  assert.equal(E.advanceClock(state, -100).activeSeconds, 0);
  assert.equal(E.advanceClock(state, 120, { paused: true }).activeSeconds, 0);
});
test('relógio offline preserva progresso no arquivo exportado e novas conquistas', () => {
  const state = E.initial(1000);
  state.careCount = 65;
  const next = E.advanceClock(state, 800);
  assert.equal(E.ageStage(next).id, 'toddler');
  const copy = E.importSave(E.exportSave(next));
  assert.equal(copy.activeSeconds, next.activeSeconds);
  assert.ok(copy.achievements.includes('first-steps'));
});

test('ritmo do jogo altera proporcionalmente consumo e avanço do relógio', () => {
  const state = E.initial(1000);
  const slow = E.advanceClock(state, 60, { speed: .5 });
  const normal = E.advanceClock(state, 60, { speed: 1 });
  const fast = E.advanceClock(state, 60, { speed: 2 });
  assert.equal(slow.activeSeconds, 90);
  assert.equal(normal.activeSeconds, 180);
  assert.equal(fast.activeSeconds, 360);
  assert.ok(slow.needs.food > normal.needs.food && normal.needs.food > fast.needs.food);
  const drop = s => state.needs.food - s.needs.food;
  assert.ok(Math.abs(drop(slow) * 2 - drop(normal)) < 1e-8);
  assert.ok(Math.abs(drop(normal) * 2 - drop(fast)) < 1e-8);
  assert.equal(E.advanceClock(state, 60, { paused: true, speed: 2 }).needs.food, state.needs.food);
  assert.equal(state.activeSeconds, 0, 'o estado inicial continua imutável');
});
test('retorno de uma ausência longa respeita a velocidade mesmo com limite de desgaste', () => {
  const state = E.initial(1000);
  const slow = E.advanceClock(state, 7200, { speed: .5 });
  const fast = E.advanceClock(state, 7200, { speed: 2 });
  assert.ok(slow.needs.food > fast.needs.food);
  assert.equal(slow.activeSeconds, 10800);
  assert.equal(fast.activeSeconds, 43200);
});

test('missões podem ser resgatadas uma vez e persistem em saves antigos', () => {
  let game = E.initial(1000);
  assert.equal(E.milestoneStatus(game).length, 6);
  assert.deepEqual(game.claimedMilestones, []);
  assert.equal(E.claimMilestone(game, 'first-care').reason, 'incomplete');
  assert.equal(E.claimMilestone(game, 'does-not-exist').reason, 'unknown');
  game.needs.food = 30;
  game = E.care(game, 'feed', 1000000).state;
  const claimed = E.claimMilestone(game, 'first-care');
  assert.equal(claimed.claimed, true);
  assert.equal(claimed.state.xp, game.xp + 20);
  assert.equal(claimed.state.happiness, Math.min(100, game.happiness + 8));
  assert.equal(E.claimMilestone(claimed.state, 'first-care').reason, 'already-claimed');
  assert.equal(E.claimMilestone(claimed.state, 'first-care').state.xp, claimed.state.xp);
  const restored = E.importSave(E.exportSave(claimed.state));
  assert.equal(E.milestoneStatus(restored).find(m => m.id === 'first-care').claimed, true);
  assert.deepEqual(E.sanitize({ claimedMilestones: ['invalid','first-care'] }).claimedMilestones, ['first-care']);
});
test('missões de brincar, cartinha e desenho usam ações reais do jogo', () => {
  let s = E.initial(1000);
  s = E.interact(s, 'toy', 1000000).state;
  s = E.interact(s, 'letter', 1000000).state;
  s = E.interact(s, 'drawing', 1000000).state;
  const status = E.milestoneStatus(s);
  for (const id of ['first-toy', 'first-letter', 'first-drawing']) {
    assert.equal(status.find(m => m.id === id).complete, true, id);
  }
  assert.equal(status.find(m => m.id === 'baby-stage').complete, false);
});
