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

test('Web e Windows mostram o MESMO sprite sem escala ou atlas divergente', () => {
  const pcHTML = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const pcCSS = fs.readFileSync(path.join(root,'app','style.css'),'utf8');
  const webCSS = fs.readFileSync(path.join(root,'web','style.css'),'utf8');
  const desktopJS = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  const spriteManifest = fs.readFileSync(path.join(root,'app','sprite-manifest.js'),'utf8');
  const common = /id="baby-sprite" width="128" height="128"/;
  assert.match(html,common); assert.match(pcHTML,common);
  assert.match(pcCSS, /\.baby\{width:128px;height:128px\}/);
  assert.match(pcCSS, /#baby-sprite\{width:128px;height:128px;transform:scale\(1\.06\)/);
  assert.match(webCSS, /\.game-stage \.baby #baby-sprite\{width:128px;height:128px;transform:scale\(1\.06\)/);
  assert.match(spriteManifest, /BabySpritePresentation = Object\.freeze\(\{ size: 128, zoom: 1\.06 \}\)/);
  assert.match(desktopJS, /const BABY_WIDTH = window\.BabySpritePresentation\.size/);
  assert.match(desktopJS, /const BABY_HEIGHT = window\.BabySpritePresentation\.size/);
  assert.match(script, /const BABY_SIZE = window\.BabySpritePresentation\.size/);
  // Both load identical files; the relative URL differs by folder.
  for (const filename of ['sprite-cleaner.js','sprite-manifest.js','sprite-integration.js']) {
    assert.ok(html.includes('../app/' + filename), 'Web loads shared ' + filename);
    assert.ok(pcHTML.includes('./' + filename), 'Windows loads shared ' + filename);
  }
  assert.match(desktopJS, /!draggingBaby && !draggingItem/);
  assert.match(desktopJS, /innerWidth - BABY_WIDTH - 4/);
});

test('tutorial de início aparece dentro do painel overlay sem alterar o progresso', () => {
  const htmlPC = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const desktopJS = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  const css = fs.readFileSync(path.join(root,'app','style.css'),'utf8');
  for (const id of ['welcome-tour','welcome-title','welcome-count','welcome-next',
    'welcome-prev','welcome-skip','welcome-reopen','welcome-progress']) {
    assert.ok(htmlPC.includes('id="' + id + '"'), id);
  }
  assert.match(desktopJS,/baby-on-screen-guide-v1/);
  assert.match(desktopJS,/welcomeSteps = Object\.freeze/);
  assert.match(desktopJS,/openWelcome\(\)/);
  assert.match(desktopJS,/!options\.paused && welcome\.hidden/);
  assert.match(desktopJS,/localStorage\.setItem\(tourKey, 'completed'\)/);
  assert.match(css,/\.welcome-tour\[hidden\]\{display:none\}/);
  assert.ok(!desktopJS.includes('game = E.initial(); welcome'));
});

test('o tutorial inicial reutiliza a animação real da bebê, sem emojis substitutos', () => {
  const htmlPC=fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const jsPC=fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  assert.match(htmlPC,/id="welcome-preview" width="128" height="128"/);
  assert.match(jsPC,/previewContext\.drawImage\(live, 0, 0, preview\.width, preview\.height\)/);
  assert.match(jsPC,/welcome\.classList\.add\('welcome-sprite-ready'\)/);
});

test('Windows overlay lets the player drag the control panel and switch monitors', () => {
  const html = fs.readFileSync(path.join(root,'app','index.html'),'utf8');
  const script = fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  const css = fs.readFileSync(path.join(root,'app','style.css'),'utf8');
  for(const id of ['panel-move-header','panel-move-handle','monitor-select'])
    assert.ok(html.includes('id="' + id + '"'),id);
  assert.match(script,/desktop\.desktopLayout\(\)/);
  assert.match(script,/desktop\.onDesktopLayout\(applyDesktopLayout\)/);
  assert.match(script,/panelHeader\.setPointerCapture/);
  assert.match(script,/panelHeader\.addEventListener\('pointermove'/);
  assert.match(script,/localStorage\.setItem\(panelPositionKey/);
  assert.match(script,/localStorage\.setItem\(positionKey/);
  assert.match(script,/nearestMonitor\(x\+BABY_WIDTH\/2,y\+BABY_HEIGHT\/2\)/);
  assert.match(css,/\.panel-header\{cursor:grab/);
});

test('overlay keeps mouse drag responsive across monitor edges using global DIP cursor', () => {
  const main=fs.readFileSync(path.join(root,'app','main.cjs'),'utf8');
  const preload=fs.readFileSync(path.join(root,'app','preload.cjs'),'utf8');
  const renderer=fs.readFileSync(path.join(root,'app','renderer.js'),'utf8');
  assert.match(main,/webContents\.send\('baby:cursor', screen\.getCursorScreenPoint\(\)\)/);
  assert.match(preload,/onCursorMove: callback =>/);
  assert.match(renderer,/desktop\.onCursorMove\(point =>/);
  assert.match(renderer,/movingPanel\.left\+cx-movingPanel\.startX/);
  assert.match(renderer,/x=cx-offsetX; y=cy-offsetY/);
});

test('relógio diário e painel estável com preferências expansíveis', () => {
  const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  const pc=fs.readFileSync(path.join(root,'app/renderer.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'app/style.css'),'utf8');
  assert.match(html,/id="day-period"/);
  assert.match(pc,/E\.timePeriod\(\)/);
  assert.match(css,/\.panel\{height:min\(610px/);
  assert.match(css,/overflow-anchor:none/);
  assert.match(pc,/if \(on && panel\.style\.left === ''\)/);
});

test('Web mostra os mesmos quatro períodos do relógio compartilhado',()=>{
  const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'web/app.js'),'utf8');
  assert.match(html,/id="web-day-period"/);
  assert.match(js,/E\.timePeriod\(\)/);
  assert.match(js,/syncDayPeriod\(\)/);
  assert.match(js,/E\.waitLabel\(ms\)/);
});

test('nome da bebê faz parte do tutorial e é salvo no progresso compartilhado',()=>{
  const htmlPC=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  const desktop=fs.readFileSync(path.join(root,'app/renderer.js'),'utf8');
  assert.match(htmlPC,/id="welcome-baby-name"/);
  assert.match(htmlPC,/id="welcome-name-field"/);
  assert.match(desktop,/game = E.renameBaby\(game, event.target.value\)/);
  assert.match(desktop,/\$\('desktop-name-input'\)\.value = game\.babyName/);
  assert.match(desktop,/\$\('welcome-name-field'\)\.hidden = welcomeIndex !== 0/);
});
test('o monitor é selecionado por mudança NATIVA de janela, não apenas CSS',()=>{
  const desktop=fs.readFileSync(path.join(root,'app/renderer.js'),'utf8');
  const preload=fs.readFileSync(path.join(root,'app/preload.cjs'),'utf8');
  assert.match(desktop,/await desktop\.moveToMonitor\(id\)/);
  assert.match(desktop,/result\.layout\?\.activeId !== id/);
  assert.match(desktop,/localStorage\.setItem\(monitorKey, layout\.activeId\)/);
  assert.match(preload,/baby:desktop:move/);
});
