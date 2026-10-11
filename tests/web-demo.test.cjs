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

test('o controle de velocidade explica e aplica a redução das necessidades', () => {
  assert.match(html, /id="speed-value"/);
  assert.match(html, /alimentação, energia, higiene e saúde diminuem mais devagar/);
  assert.match(script, /E\.advanceClock\(game, elapsed, \{ speed: options\.speed \}\)/);
  assert.match(script, /syncClock\(\); \/\/ Settle the previous elapsed time at the previous speed/);
});

test('quarto interativo e missões continuam acessíveis sem bloquear os cuidados', () => {
  for (const selector of ['id="scene-light"', 'id="missions-list"', 'id="missions-count"', 'class="room-furniture"']) {
    assert.ok(html.includes(selector), selector);
  }
  assert.match(script, /E\.claimMilestone\(game, button\.dataset\.claimMilestone\)/);
  assert.match(script, /syncLight\(\)/);
});

test('missões também são oferecidas no painel do Windows', () => {
  const windowsHTML = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  const windowsJS = fs.readFileSync(path.join(root, 'app', 'renderer.js'), 'utf8');
  assert.match(windowsHTML, /id="desktop-missions-list"/);
  assert.match(windowsJS, /E\.claimMilestone\(game, button\.dataset\.claimMilestone\)/);
  assert.match(windowsJS, /renderMissions\(\)/);
});

test('a escola da fase criança funciona também na Web', () => {
  for (const id of ['school-web','school-web-open','school-web-subject',
    'school-web-question','school-web-answers','school-web-close']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(script, /E\.schoolQuestions/);
  assert.match(script, /E\.school\(game, subject\)/);
});

test('rotina diária e indicador de felicidade aparecem no jogo Web', () => {
  for (const id of ['daily-panel','daily-list','daily-count','happiness-bar',
    'happiness-value','care-suggestion']) assert.ok(html.includes('id="' + id + '"'));
  assert.match(script, /E\.dailyStatus\(game\)/);
  assert.match(script, /E\.claimDaily\(game, button\.dataset\.claimDaily\)/);
  assert.match(script, /game\.happiness/);
});

test('rotina diária e felicidade também aparecem no painel Windows', () => {
  const htmlPC = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const jsPC = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  for (const id of ['desktop-daily-list','desktop-daily-count','desktop-happiness','desktop-happiness-value'])
    assert.ok(htmlPC.includes('id="' + id + '"'), id);
  assert.match(jsPC, /E\.dailyStatus\(game\)/);
  assert.match(jsPC, /E\.claimDaily\(game, button\.dataset\.claimDaily\)/);
});

test('nome da bebê pode ser alterado em Web e Windows e salvo no motor compartilhado', () => {
  const pc = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const desktop = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  assert.match(html, /id="baby-name-input"/);
  assert.match(html, /id="baby-name-label"/);
  assert.match(pc, /id="desktop-name-input"/);
  assert.match(script, /E\.renameBaby\(game, e\.target\.value\)/);
  assert.match(desktop, /E\.renameBaby\(game, event\.target\.value\)/);
});

test('Windows mantém sprite legível e a área de arrasto acompanha seu tamanho', () => {
  const pcHTML = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const pcCSS = fs.readFileSync(path.join(root,'app','style.css'),'utf8');
  const desktopJS = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  assert.match(pcHTML, /id="baby-sprite" width="96" height="106"/);
  assert.match(pcCSS, /\.baby\{width:96px;height:106px\}/);
  assert.match(desktopJS, /const BABY_WIDTH = 96, BABY_HEIGHT = 106/);
  assert.match(desktopJS, /innerWidth - BABY_WIDTH - 4/);
});
