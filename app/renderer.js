'use strict';
/* Baby On Screen: Windows desktop companion and classroom preview. */
(() => {
  const E = window.BabyEngine, desktop = window.babyDesktop;
  if (!E || !desktop) return;
  const $ = id => document.getElementById(id);
  const baby = $('baby'), thought = $('thought'), panel = $('panel');
  const spriteLayer = window.BabySpriteIntegration?.attachBabySprites({
    baby, canvas: $('baby-sprite'), manifest: window.BabySpriteManifest, base: '..'
  }) || null;

  const gameKey = 'baby-on-screen-v1', optionsKey = 'baby-on-screen-options-v1';
  const positionKey = 'baby-on-screen-desktop-position-v1';
  const panelPositionKey = 'baby-on-screen-panel-position-v1';
  const tourKey = 'baby-on-screen-guide-v1';
  const welcome = $('welcome-tour');
  const preview = $('welcome-preview'), previewContext = preview.getContext('2d');
  let lastWelcomeDraw = 0;
  const welcomeSteps = Object.freeze([
    {title:'Sua amiguinha chegou! 💕',icon:'👶',
      description:'Ela mora na sua área de trabalho, como um mascote virtual. Anda, reage e faz companhia enquanto você usa o computador.',
      hint:'O guia pausa as necessidades para você aprender com calma.'},
    {title:'Pegue, mova e faça carinho',icon:'🖱️',
      description:'Segure o botão esquerdo sobre a bebê e arraste para outro lugar. Um clique rápido faz carinho e abre o painel.',
      hint:'Experimente levá-la até outro monitor. O painel também pode ser arrastado pelo topo.'},
    {title:'Cuide quando ela precisar',icon:'🍼',
      description:'Acompanhe alimentação, energia, higiene e saúde. Arraste mamadeira, berço, fralda ou remédio até a bebê, ou selecione o item e clique nela.',
      hint:'Brinquedos, cartinhas e desenhos também criam lembranças.'},
    {title:'Ela não atrapalha seu PC',icon:'🖥️',
      description:'A janela é transparente: você ainda pode clicar nos programas por trás. Use “Minha amiguinha” para abrir ou fechar o painel.',
      hint:'Para ocultar, use o painel. Para retornar ou sair, use o ícone na bandeja do Windows.'},
    {title:'Cresçam juntas!',icon:'🌟',
      description:'Cuidados e brincadeiras rendem experiência, missões e novas fases. O progresso é salvo automaticamente e pode ser exportado nas preferências.',
      hint:'Você pode pausar ou reduzir a velocidade a qualquer momento. Bom jogo!'}
  ]);
  let welcomeIndex = 0;
  const names = { food: 'alimentação', energy: 'energia', hygiene: 'higiene', health: 'saúde' };
  const source = document.currentScript ? document.currentScript.src : window.location.href;
  const lessons = E.schoolQuestions;
  const success = {
    feed: 'Mamadeira entregue! Ela ficou satisfeita. 🍼',
    sleep: 'Uma soneca gostosa! 🌙',
    diaper: 'Fraldinha trocada. Tudo limpinho! 💕',
    medicine: 'O cuidado ajudou a saúde dela! 💗',
    toy: 'Ela brincou bastante e está feliz! 🧸',
    letter: 'Sua cartinha virou uma lembrança. 💌',
    drawing: 'Vocês fizeram um desenho juntas! 🎨'
  };
  function read(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch { return fallback; }
  }
  const stored = read(optionsKey, {});
  const options = {
    sound: stored.sound !== false, paused: stored.paused === true,
    speed: E.clamp(Number(stored.speed) || 1, .5, 2)
  };
  let game = E.sanitize(read(gameKey, E.initial()));
  // A closed/paused app does not burn through needs; resume at the chosen speed.
  if (!options.paused) {
    const offlineSeconds = Math.min(180, Math.max(0, (Date.now() - game.savedAt) / 1000));
    game = E.tick(game, offlineSeconds * options.speed, { active: false });
  }
  let milestoneSignature = '', dailySignature = '';
  const BABY_WIDTH = window.BabySpritePresentation.size;
  const BABY_HEIGHT = window.BabySpritePresentation.size;
  let x = innerWidth * .3, y = innerHeight * .44, dx = .8, dy = .6, dir = 'front';
  let frame = 1, lastTime = performance.now(), lastFrame = 0, lastDraw = 0, nextTurn = 0;
  let nextSpeech = 8000, lastCry = 0, busyUntil = 0, draggingBaby = false;
  let pressX = 0, pressY = 0, offsetX = 0, offsetY = 0;
  let desktopLayout = null, movingPanel = null;
  let savedBabyPosition = null, savedPanelPosition = null;
  try {
    savedBabyPosition = JSON.parse(localStorage.getItem(positionKey) || 'null');
    savedPanelPosition = JSON.parse(localStorage.getItem(panelPositionKey) || 'null');
  } catch { /* Ignore corrupt layout preferences. */ }
  let draggingItem = null, selectedItem = null, lastStage = '', lastUrgency = 'calm';
  let careAction = 'idle';
  let schoolQuestion = null, schoolVisible = false, lastMemoryCount = -1;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sounds = new Map();
  let spriteState = '';
  let spriteRefreshAt = 0;
  let lastHorizontalDirection = dx >= 0 ? 'right' : 'left';
  function syncSprite(now = performance.now()) {
    if (!spriteLayer || now < spriteRefreshAt) return;
    spriteRefreshAt = now + 180;
    const stage = E.ageStage(game).id;
    const moving = welcome.hidden && !draggingBaby && !draggingItem && !options.paused && !reduced.matches && now >= busyUntil;
    if (moving && Math.abs(dx) > .08) lastHorizontalDirection = dx > 0 ? 'right' : 'left';
    const direction = stage === 'child'
      ? (({front:'down',back:'up',left:'left',right:'right'})[dir] || 'down')
      : lastHorizontalDirection;
    const action = now < busyUntil ? careAction : (moving ? 'walk' : 'idle');
    const key = [stage,direction,action].join(':');
    if (key !== spriteState) {
      spriteState = key;
      void spriteLayer.show({stage,direction,action});
    }
  }


  function save() {
    game.savedAt = Date.now();
    try {
      localStorage.setItem(gameKey, JSON.stringify(game));
      localStorage.setItem(optionsKey, JSON.stringify(options));
    } catch { feedback('Não foi possível salvar automaticamente. Exporte o progresso.'); }
  }
  function feedback(value) { $('feedback').textContent = value; }
  function voice(name) {
    if (!options.sound) return;
    try {
      if (!sounds.has(name)) {
        const audio = new Audio(new URL('../som/' + name + '.mp3', source).href);
        audio.volume = .22; sounds.set(name, audio);
      }
      const audio = sounds.get(name);
      audio.pause(); audio.currentTime = 0; audio.play().catch(() => {});
    } catch { /* Sounds are optional. */ }
  }
  function speak(context) {
    const text = E.speak(game, context, Math.random());
    thought.textContent = text; game.lastSpoken = text;
    nextSpeech = performance.now() + (E.urgency(game).level === 'crying' ? 8000 : 13000 + Math.random() * 9000);
  }
  function updateWelcome() {
    const step = welcomeSteps[welcomeIndex];
    $('welcome-title').textContent = step.title;
    $('welcome-description').textContent = step.description;
    $('welcome-hint').textContent = step.hint;
    $('welcome-scene-icon').textContent = step.icon;
    $('welcome-count').textContent = 'Passo ' + (welcomeIndex + 1) + ' de ' + welcomeSteps.length;
    $('welcome-progress').setAttribute('aria-valuenow', String(welcomeIndex + 1));
    $('welcome-progress').firstElementChild.style.width =
      ((welcomeIndex + 1) / welcomeSteps.length * 100) + '%';
    $('welcome-prev').disabled = welcomeIndex === 0;
    $('welcome-next').textContent = welcomeIndex === welcomeSteps.length - 1
      ? 'Começar a cuidar 💕' : 'Próximo →';
  }
  function closeWelcome() {
    if (welcome.hidden) return;
    welcome.hidden = true;
    try { localStorage.setItem(tourKey, 'completed'); }
    catch { /* A presentation preference must not block playing. */ }
    publishRegions();
  }
  function openWelcome() {
    welcomeIndex = 0;
    updateWelcome();
    welcome.hidden = false;
    panelVisible(true);
    panel.scrollTop = 0;
    $('welcome-next').focus({ preventScroll: true });
  }
  function panelVisible(on) {
    if (!on && !welcome.hidden) closeWelcome();
    panel.hidden = !on;
    publishRegions();
  }
  $('welcome-next').addEventListener('click', () => {
    if (welcomeIndex === welcomeSteps.length - 1) {
      closeWelcome(); $('welcome-reopen').focus(); return;
    }
    welcomeIndex++;
    updateWelcome();
    panel.scrollTop = 0;
  });
  $('welcome-prev').addEventListener('click', () => {
    welcomeIndex = Math.max(0, welcomeIndex - 1);
    updateWelcome();
    panel.scrollTop = 0;
  });
  $('welcome-skip').addEventListener('click', () => {
    closeWelcome(); $('welcome-reopen').focus();
  });
  $('welcome-reopen').addEventListener('click', openWelcome);
  welcome.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeWelcome(); $('welcome-reopen').focus(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); $('welcome-next').click(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); $('welcome-prev').click(); }
  });
  function displayedMonitors() {
    return Array.isArray(desktopLayout?.displays) ? desktopLayout.displays : [];
  }
  function nearestMonitor(px, py) {
    const displays = displayedMonitors();
    if (!displays.length) return null;
    return displays.reduce((best, d) => {
      const distance = Math.pow(Math.max(d.x-px,0,px-(d.x+d.width)),2) +
        Math.pow(Math.max(d.y-py,0,py-(d.y+d.height)),2);
      return !best || distance < best.distance ? { display:d, distance } : best;
    },null).display;
  }
  function setPanelPosition(left, top, persist = false) {
    // A hidden panel has a 0x0 rect; measure it without making it visible.
    const wasHidden = panel.hidden;
    if (wasHidden) { panel.hidden = false; panel.style.visibility = 'hidden'; }
    const r = panel.getBoundingClientRect();
    let px = E.clamp(left, 8, Math.max(8, innerWidth-r.width-8));
    let py = E.clamp(top, 8, Math.max(8, innerHeight-r.height-8));
    // On drop/restoration, don't leave the panel in an unreachable gap
    // between displays or off-screen after a monitor is disconnected.
    if (persist) {
      const target = nearestMonitor(px+r.width/2,py+Math.min(r.height,200)/2);
      if (target) {
        px = E.clamp(px,target.x+8,Math.max(target.x+8,target.x+target.width-r.width-8));
        py = E.clamp(py,target.y+8,Math.max(target.y+8,target.y+target.height-r.height-8));
      }
    }
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    panel.style.left = Math.round(px) + 'px';
    panel.style.top = Math.round(py) + 'px';
    if (wasHidden) { panel.hidden = true; panel.style.visibility = ''; }
    publishRegions();
    if (persist && desktopLayout?.bounds) {
      try { localStorage.setItem(panelPositionKey, JSON.stringify({
        x:desktopLayout.bounds.x+px, y:desktopLayout.bounds.y+py
      })); } catch {}
    }
  }
  function saveBabyPosition() {
    if (!desktopLayout?.bounds) return;
    try { localStorage.setItem(positionKey,JSON.stringify({
      x:desktopLayout.bounds.x+x,y:desktopLayout.bounds.y+y
    })); } catch {}
  }
  function positionLauncher(monitor) {
    if (!monitor) return;
    const launcher = $('launcher');
    const r = launcher.getBoundingClientRect();
    launcher.style.right = 'auto';
    launcher.style.bottom = 'auto';
    launcher.style.left = Math.round(monitor.x+Math.max(8,monitor.width-r.width-19))+'px';
    launcher.style.top = Math.round(monitor.y+Math.max(8,monitor.height-r.height-19))+'px';
  }
  function refreshMonitorPicker() {
    const select = $('monitor-select');
    const selected = nearestMonitor(x+BABY_WIDTH/2,y+BABY_HEIGHT/2);
    select.replaceChildren();
    for (const d of displayedMonitors()) {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = d.label;
      select.append(option);
    }
    if (selected) { select.value = selected.id; positionLauncher(selected); }
  }
  function applyDesktopLayout(layout) {
    if (!layout?.bounds || !Array.isArray(layout.displays)) return;
    const previous = desktopLayout?.bounds;
    const panelRect = panel.getBoundingClientRect();
    const hadPanelMoved = panel.style.left !== '';
    const globalPanel = hadPanelMoved && previous
      ? {x:previous.x+panelRect.left,y:previous.y+panelRect.top} : null;
    if (previous) {
      x += previous.x-layout.bounds.x;
      y += previous.y-layout.bounds.y;
    }
    desktopLayout = layout;
    if (savedBabyPosition && Number.isFinite(savedBabyPosition.x) &&
        Number.isFinite(savedBabyPosition.y)) {
      x = savedBabyPosition.x-layout.bounds.x;
      y = savedBabyPosition.y-layout.bounds.y;
      savedBabyPosition = null;
    }
    const monitor = nearestMonitor(x+BABY_WIDTH/2,y+BABY_HEIGHT/2);
    if (monitor) {
      x = E.clamp(x, monitor.x+3, Math.max(monitor.x+3,monitor.x+monitor.width-BABY_WIDTH-4));
      y = E.clamp(y, monitor.y+8, Math.max(monitor.y+8,monitor.y+monitor.height-BABY_HEIGHT-8));
    }
    bounds(); place();
    const saved = savedPanelPosition && Number.isFinite(savedPanelPosition.x) &&
        Number.isFinite(savedPanelPosition.y) ? savedPanelPosition : globalPanel;
    if (saved) setPanelPosition(saved.x-layout.bounds.x,saved.y-layout.bounds.y,true);
    else if (monitor && !hadPanelMoved) {
      // The default right/bottom of the combined virtual rectangle might
      // be physically empty when monitors have different heights.
      const hidden = panel.hidden;
      if (hidden) { panel.hidden=false; panel.style.visibility='hidden'; }
      const r=panel.getBoundingClientRect();
      if (hidden) { panel.hidden=true; panel.style.visibility=''; }
      setPanelPosition(monitor.x+monitor.width-r.width-19,
        monitor.y+monitor.height-r.height-76);
    }
    savedPanelPosition = null;
    refreshMonitorPicker();
    publishRegions();
  }
  desktop.onDesktopLayout(applyDesktopLayout);
  void desktop.desktopLayout().then(applyDesktopLayout).catch(() => {});
  $('monitor-select').addEventListener('change', event => {
    const target = displayedMonitors().find(d => d.id === event.target.value);
    if (!target) return;
    x = target.x+(target.width-BABY_WIDTH)/2;
    y = target.y+(target.height-BABY_HEIGHT)/2;
    bounds(); place(); saveBabyPosition();
    refreshMonitorPicker();
    const r = panel.getBoundingClientRect();
    setPanelPosition(target.x+(target.width-r.width)/2,
      target.y+Math.max(10,(target.height-r.height)/2),true);
    publishRegions();
    feedback('Bebê e painel movidos para '+target.label+'.');
  });
  const panelHeader = $('panel-move-header');
  panelHeader.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button:not(#panel-move-handle)')) return;
    const r = panel.getBoundingClientRect();
    movingPanel = {startX:event.clientX,startY:event.clientY,left:r.left,top:r.top,id:event.pointerId};
    panelHeader.setPointerCapture(event.pointerId);
    desktop.setDragging(true);
    event.preventDefault();
  });
  panelHeader.addEventListener('pointermove', event => {
    if (!movingPanel || movingPanel.id !== event.pointerId) return;
    setPanelPosition(movingPanel.left+event.clientX-movingPanel.startX,
      movingPanel.top+event.clientY-movingPanel.startY);
  });
  function stopMovingPanel(event) {
    if (!movingPanel || movingPanel.id !== event.pointerId) return;
    movingPanel = null;
    desktop.setDragging(false);
    try { panelHeader.releasePointerCapture(event.pointerId); } catch {}
    const r = panel.getBoundingClientRect();
    setPanelPosition(r.left,r.top,true);
  }
  panelHeader.addEventListener('pointerup',stopMovingPanel);
  panelHeader.addEventListener('pointercancel',stopMovingPanel);
  $('panel-move-handle').addEventListener('keydown', event => {
    const delta = {ArrowLeft:[-24,0],ArrowRight:[24,0],
      ArrowUp:[0,-24],ArrowDown:[0,24]}[event.key];
    if (!delta) return;
    event.preventDefault();
    const r = panel.getBoundingClientRect();
    setPanelPosition(r.left+delta[0],r.top+delta[1],true);
  });
  $('launcher').addEventListener('click', () => panelVisible(panel.hidden));
  $('close-panel').addEventListener('click', () => panelVisible(false));
  $('hide').addEventListener('click', () => { save(); desktop.hide(); });
  const bounds = () => {
    x = E.clamp(x, 3, Math.max(3, innerWidth - BABY_WIDTH - 4));
    y = E.clamp(y, 15, Math.max(15, innerHeight - BABY_HEIGHT - 8));
  };
  function place() {
    baby.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    thought.style.transform = 'translate3d(' + Math.round(E.clamp(x + BABY_WIDTH - 12, 4, Math.max(4, innerWidth - 200))) + 'px,' + Math.round(Math.max(4, y - 45)) + 'px,0)';
  }
  function region(element, margin) {
    const r = element.getBoundingClientRect();
    return { x: r.left - margin, y: r.top - margin, width: r.width + margin * 2, height: r.height + margin * 2 };
  }
  function publishRegions() {
    desktop.setHitRegions([region(baby, 13), region($('launcher'), 5), ...(!panel.hidden ? [region(panel, 3)] : [])]);
  }
  function hitBaby(clientX, clientY) {
    const r = baby.getBoundingClientRect();
    return clientX >= r.left - 28 && clientX <= r.right + 28 &&
      clientY >= r.top - 28 && clientY <= r.bottom + 28;
  }
  function selectItem(key) {
    selectedItem = key;
    document.querySelectorAll('[data-item]').forEach(item => item.classList.toggle('selected', item.dataset.item === key));
    feedback('Item selecionado. Clique na personagem ou arraste o objeto até ela!');
  }
  function unselect() {
    selectedItem = null;
    document.querySelectorAll('[data-item]').forEach(item => item.classList.remove('selected'));
  }
  function interact(name) {
    const result = E.actions[name] ? E.care(game, name) : E.interact(game, name);
    unselect();
    if (!result.applied) {
      if (result.reason === 'cooldown') feedback('Espere um pouco antes de usar esse item novamente. ⏳');
      else if (result.reason === 'not-needed') feedback('Ainda não é hora de cuidar dessa necessidade. Espere ela pedir.');
      else feedback('Essa ação não está disponível.');
      render();
      return;
    }
    const previous = E.ageStage(game).id;
    game = result.state; busyUntil = performance.now() + (name === 'sleep' ? 3200 : 1600);
    careAction = name;
    baby.classList.remove('sleeping', 'eating');
    if (name === 'sleep') baby.classList.add('sleeping');
    if (name === 'feed') baby.classList.add('eating');
    voice('rindo'); speak(name === 'toy' ? 'play' : 'care');
    feedback(success[name]);
    if (previous !== E.ageStage(game).id) {
      voice('feliz'); feedback('🌟 Nova fase: ' + E.ageStage(game).title + '! ' + success[name]);
    }
    if (result.achievements?.length) feedback('🌟 ' + result.achievements.join(' · ') + ' — ' + success[name]);
    spriteRefreshAt = 0; syncSprite();
    render(); save();
  }
  function pet() {
    if (selectedItem) { interact(selectedItem); return; }
    game.happiness = E.clamp(game.happiness + 2, 0, 100);
    speak('happy'); voice('feliz'); busyUntil = performance.now() + 800;
    careAction = 'pet'; spriteRefreshAt = 0; syncSprite();
    feedback(E.ageStage(game).id === 'newborn' ? 'Ela adora seu carinho. Gugu! 💕' : 'Carinho recebido, amiga feliz!');
    save();
  }
  baby.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    draggingBaby = true; pressX = e.clientX; pressY = e.clientY;
    offsetX = e.clientX - x; offsetY = e.clientY - y;
    baby.setPointerCapture(e.pointerId);
    desktop.setDragging(true);
    e.preventDefault();
  });
  baby.addEventListener('pointermove', e => {
    if (!draggingBaby) return;
    x = e.clientX - offsetX; y = e.clientY - offsetY;
    bounds(); place(); publishRegions();
  });
  function releaseBaby(e, cancel) {
    if (!draggingBaby) return;
    draggingBaby = false; desktop.setDragging(false);
    try { baby.releasePointerCapture(e.pointerId); } catch { /* pointer already released */ }
    if (!cancel && Math.hypot(e.clientX - pressX, e.clientY - pressY) < 8) {
      panelVisible(true);
      pet();
    }
  }
  baby.addEventListener('pointerup', e => {
    releaseBaby(e, false);
    const target = nearestMonitor(x+BABY_WIDTH/2,y+BABY_HEIGHT/2);
    if (target) {
      x = E.clamp(x,target.x+3,Math.max(target.x+3,target.x+target.width-BABY_WIDTH-4));
      y = E.clamp(y,target.y+8,Math.max(target.y+8,target.y+target.height-BABY_HEIGHT-8));
    }
    bounds(); place(); saveBabyPosition(); refreshMonitorPicker(); publishRegions();
  });
  baby.addEventListener('pointercancel', e => releaseBaby(e, true));
  baby.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panelVisible(true); pet(); }
  });
  const ghost = $('drag-ghost');
  document.querySelectorAll('[data-item]').forEach(item => {
    item.addEventListener('pointerdown', e => {
      if (e.button !== 0 || draggingItem) return;
      draggingItem = { key: item.dataset.item, item, x: e.clientX, y: e.clientY };
      item.setPointerCapture(e.pointerId);
      desktop.setDragging(true);
      $('drag-icon').src = '../assets/icons/' + item.dataset.item.replace('feed', 'bottle')
        .replace('sleep', 'crib').replace('diaper', 'diaper').replace('medicine', 'medicine')
        .replace('letter', 'letter').replace('drawing', 'drawing') + '.svg';
      ghost.hidden = false;
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      item.classList.add('dragging'); e.preventDefault();
    });
    item.addEventListener('pointermove', e => {
      if (!draggingItem || draggingItem.item !== item) return;
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      baby.classList.toggle('drop-target', hitBaby(e.clientX, e.clientY));
    });
    function finish(e, cancelled) {
      if (!draggingItem || draggingItem.item !== item) return;
      const d = draggingItem; draggingItem = null;
      desktop.setDragging(false);
      try { item.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      ghost.hidden = true; item.classList.remove('dragging');
      baby.classList.remove('drop-target');
      if (cancelled) return;
      if (hitBaby(e.clientX, e.clientY)) interact(d.key);
      else if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 9) selectItem(d.key);
      else feedback('Quase! Solte o objeto em cima da personagem.');
    }
    item.addEventListener('pointerup', e => finish(e, false));
    item.addEventListener('pointercancel', e => finish(e, true));
    item.addEventListener('click', e => { if (e.detail === 0) selectItem(item.dataset.item); });
  });
  window.addEventListener('blur', () => {
    if (movingPanel) {
      movingPanel = null; desktop.setDragging(false);
      const r = panel.getBoundingClientRect(); setPanelPosition(r.left,r.top,true);
    }
    if (draggingBaby || draggingItem) {
      draggingBaby = false; draggingItem = null; ghost.hidden = true;
      desktop.setDragging(false);
      baby.classList.remove('drop-target');
      document.querySelectorAll('.item.dragging').forEach(i => i.classList.remove('dragging'));
    }
  });

  function lessonQuestion() {
    const subject = $('school-subject').value;
    const list = lessons[subject];
    schoolQuestion = list[Math.floor(Math.random() * list.length)];
    $('school-question').textContent = schoolQuestion.question;
    const answers = $('school-answers'); answers.replaceChildren();
    for (let i = 0; i < schoolQuestion.answers.length; i++) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = schoolQuestion.answers[i];
      btn.addEventListener('click', () => answer(i)); answers.append(btn);
    }
  }
  function answer(index) {
    if (!schoolQuestion) return;
    if (index !== schoolQuestion.correct) {
      $('school-question').textContent = 'Quase! Tente de novo. ' + schoolQuestion.question;
      voice('rindo2');
      return;
    }
    const result = E.school(game, $('school-subject').value);
    if (!result.applied) {
      feedback(result.reason === 'cooldown' ? 'Hora de descansar depois da aula! Volte daqui a alguns minutos.' :
        result.reason === 'needs-care' ? 'Antes da escola, ela precisa comer e descansar.' :
          'Ela ainda está muito pequena para a escola.');
      return;
    }
    game = result.state;
    feedback('🏫 Aula concluída! +30 XP e uma nova lembrança no álbum.');
    speak('happy'); voice('feliz');
    $('school-dialog').hidden = true; schoolVisible = false;
    schoolQuestion = null;
    render(); save();
  }
  $('school-open').addEventListener('click', () => {
    schoolVisible = !schoolVisible;
    $('school-dialog').hidden = !schoolVisible;
    if (schoolVisible) lessonQuestion();
    publishRegions();
  });
  $('school-subject').addEventListener('change', lessonQuestion);
  $('school-close').addEventListener('click', () => {
    schoolVisible = false; $('school-dialog').hidden = true;
    publishRegions();
  });
  $('sound').checked = options.sound;
  $('pause').checked = options.paused;
  $('speed').value = String(options.speed);
  $('desktop-name-input').value = game.babyName;
  $('desktop-name-input').addEventListener('input', event => {
    game = E.renameBaby(game, event.target.value);
    $('desktop-name-label').textContent = game.babyName || 'MINHA AMIGUINHA';
    save();
  });
  $('speed-value').textContent = options.speed.toLocaleString('pt-BR') + '×';
  $('sound').addEventListener('change', e => { options.sound = e.target.checked; save(); });
  $('pause').addEventListener('change', e => { options.paused = e.target.checked; save(); });
  $('speed').addEventListener('input', e => {
    options.speed = E.clamp(Number(e.target.value), .5, 2);
    $('speed-value').textContent = options.speed.toLocaleString('pt-BR') + '×';
    save();
  });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Apagar o progresso e iniciar outra história?')) return;
    game = E.initial(); lastStage = ''; lastMemoryCount = -1;
    $('desktop-name-input').value = game.babyName;
    unselect(); render(); speak('return'); save();
    feedback('Sua nova história começou! Gugu! 💕');
  });
  $('export').addEventListener('click', () => {
    save();
    const blob = new Blob([E.exportSave(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'baby-on-screen-progresso.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    feedback('Arquivo de progresso exportado. Ele também pode ser importado na Web.');
  });
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 100000) { feedback('Arquivo muito grande.'); return; }
    try {
      const incoming = E.importSave(await file.text());
      if (!window.confirm('Substituir seu progresso atual por este arquivo?')) return;
      game = incoming; lastStage = ''; lastMemoryCount = -1;
      $('desktop-name-input').value = game.babyName;
      render(); speak('return'); save();
      feedback('Progresso importado! Bem-vinda de volta, amiguinha.');
    } catch (error) { feedback('Erro ao importar: ' + error.message); }
  });
  function renderMissions() {
    const goals = E.milestoneStatus(game);
    const signature = goals.map(m => [m.id, m.progress, m.claimed].join(':')).join('|');
    if (milestoneSignature === signature) return;
    milestoneSignature = signature;
    $('desktop-missions-count').textContent = goals.filter(m => m.claimed).length + '/' + goals.length;
    const list = $('desktop-missions-list');
    list.replaceChildren();
    const available = goals.filter(m => !m.claimed).sort((a, b) => Number(b.complete) - Number(a.complete));
    if (!available.length) {
      const done = document.createElement('p');
      done.textContent = '🎉 Todas as missões foram resgatadas! Continue cuidando dela.';
      list.append(done);
      return;
    }
    for (const goal of available) {
      const item = document.createElement('div');
      item.className = 'desktop-mission' + (goal.complete ? ' mission-done' : '');
      const title = document.createElement('strong');
      title.textContent = goal.title;
      const detail = document.createElement('small');
      detail.textContent = goal.detail + ' · ' + goal.progress + '/' + goal.target;
      item.append(title, detail);
      if (goal.complete) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.claimMilestone = goal.id;
        button.textContent = 'Resgatar +' + goal.xp + ' XP';
        item.append(button);
      }
      list.append(item);
    }
  }
  $('desktop-missions-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-claim-milestone]');
    if (!button) return;
    const result = E.claimMilestone(game, button.dataset.claimMilestone);
    if (!result.claimed) return;
    game = result.state;
    milestoneSignature = '';
    lastMemoryCount = -1;
    feedback('✦ ' + result.title + ': +' + result.xp + ' XP e felicidade!');
    voice('feliz');
    render();
    save();
  });
  function renderDaily() {
    const today = E.dailyStatus(game);
    const signature = today.date + ':' + today.goals.map(g => [g.id, g.progress, g.claimed].join(':')).join('|');
    if (signature === dailySignature) return;
    dailySignature = signature;
    $('desktop-daily-count').textContent = today.goals.filter(g => g.claimed).length + '/' + today.goals.length;
    const list = $('desktop-daily-list');
    list.replaceChildren();
    for (const goal of today.goals) {
      const row = document.createElement('article');
      row.className = 'desktop-daily-item' + (goal.complete ? ' daily-ready' : '');
      const title = document.createElement('strong');
      title.textContent = (goal.claimed ? '✓ ' : '') + goal.title;
      const detail = document.createElement('small');
      detail.textContent = goal.detail + ' · ' + goal.progress + '/' + goal.target + ' · +' + goal.xp + ' XP';
      row.append(title, detail);
      if (goal.complete && !goal.claimed) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.claimDaily = goal.id;
        button.textContent = 'Resgatar recompensa';
        row.append(button);
      }
      if (goal.claimed) {
        const done = document.createElement('small');
        done.className = 'desktop-daily-claimed';
        done.textContent = 'Recompensa recebida';
        row.append(done);
      }
      list.append(row);
    }
  }
  $('desktop-daily-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-claim-daily]');
    if (!button) return;
    const result = E.claimDaily(game, button.dataset.claimDaily);
    if (!result.claimed) return;
    game = result.state;
    dailySignature = ''; lastMemoryCount = -1;
    feedback('🌷 Rotina: ' + result.title + ' · +' + result.xp + ' XP!');
    render();
    save();
  });
  function render() {
    const age = E.ageStage(game);
    if (age.id !== lastStage) {
      lastStage = age.id;
      baby.classList.remove('newborn', 'baby-stage', 'toddler', 'child');
      baby.classList.add(age.id === 'baby' ? 'baby-stage' : age.id);
    }
    $('desktop-name-label').textContent = game.babyName || 'MINHA AMIGUINHA';
    baby.setAttribute('aria-label', (game.babyName || 'Bebê') + '. Arraste para mover ou toque para carinho.');
    $('phase-name').textContent = age.title;
    $('life-day').textContent = 'Dia ' + E.ageDays(game);
    $('level').textContent = 'Nível ' + E.level(game);
    $('care-count').textContent = game.careCount + ' cuidados';
    for (const key of Object.keys(E.defaults)) {
      const amount = Math.round(game.needs[key]);
      $(key).value = amount;
      $(key + '-val').textContent = amount + '%';
      $(key).setAttribute('aria-valuetext', amount + '%');
    }
    const moodValue = Math.round(game.happiness);
    $('desktop-happiness').value = moodValue;
    $('desktop-happiness-value').textContent = moodValue + '%';
    $('desktop-happiness').setAttribute('aria-valuetext', moodValue + '% de felicidade');
    const urge = E.urgency(game);
    if (urge.level !== lastUrgency) {
      lastUrgency = urge.level;
      if (urge.level === 'crying') { speak('cry'); voice('chorando'); lastCry = performance.now(); }
      else if (urge.level === 'asking') speak(urge.need);
      else speak('idle');
    }
    baby.classList.toggle('crying', urge.level === 'crying');
    $('mood-icon').textContent = urge.level === 'crying' ? '😢' : urge.level === 'asking' ? '🥺' : moodValue < 45 ? '😔' : '😊';
    $('mood-title').textContent = urge.level === 'crying' ? 'Preciso de ajuda!' : urge.level === 'asking' ? 'Quero sua atenção' : moodValue < 45 ? 'Vamos brincar?' : 'Estou feliz!';
    $('mood-description').textContent = urge.level === 'calm' ? (moodValue < 45 ? 'Um brinquedo ou desenho vai me animar!' : age.description) :
      'Preciso de ' + names[urge.need] + '.';
    for (const el of document.querySelectorAll('[data-wait]')) {
      const name = el.dataset.wait;
      const delay = Math.max(0, (game.cooldowns[name] || 0) - Date.now());
      const action = E.actions[name];
      const state = delay ? Math.ceil(delay / 1000) + 's' : (action && game.needs[action.need] > 74) ? 'Quando pedir' : 'Pronto!';
      el.textContent = state;
      el.closest('button').classList.toggle('ready', state === 'Pronto!');
      el.closest('button').classList.toggle('cooling', delay > 0);
    }
    const next = E.stages[E.stages.findIndex(s => s.id === age.id) + 1];
    if (next) {
      const mins = Math.max(0, Math.ceil(next.minutes - game.activeSeconds / 60));
      const cares = Math.max(0, next.cares - game.careCount);
      $('growth-next').textContent = 'Próxima fase: ' + next.title;
      $('growth-detail').textContent = mins + ' minutos e ' + cares + ' cuidados restantes';
      $('growth-progress').value = Math.min(100, 100 * Math.min(game.activeSeconds / 60 / next.minutes, game.careCount / next.cares));
    } else {
      $('growth-next').textContent = 'A infância começou! 🌟';
      $('growth-detail').textContent = 'Escola, aprendizado e novas lembranças estão disponíveis.';
      $('growth-progress').value = 100;
    }
    $('school-section').hidden = age.id !== 'child';
    $('school-stats').textContent = game.schoolVisits + ' aulas · leitura ' + game.skills.reading +
      ' · números ' + game.skills.numbers + ' · artes ' + game.skills.arts;
    renderMissions();
    renderDaily();
    $('skills').textContent = 'Brincadeiras ' + game.skills.play + ' · Vínculo ' + game.skills.bond +
      ' · Criatividade ' + game.skills.creativity + ' · Escola ' + game.schoolVisits + ' aulas';
    const album = E.memorySummary(game);
    if (lastMemoryCount !== album.total) {
      lastMemoryCount = album.total;
      $('memories').replaceChildren();
      if (!album.total) {
        const span = document.createElement('span');
        span.textContent = 'As primeiras lembranças aparecerão aqui.';
        $('memories').append(span);
      }
      album.groups.forEach(entry => {
        const span = document.createElement('span');
        span.textContent = '✦ ' + entry.label + (entry.count > 1 ? ' ×' + entry.count : '');
        $('memories').append(span);
      });
    }
  }
  const updatesPanel = $('desktop-updates');
  const updateStates = Object.freeze({
    idle: ['Em dia', 'O jogo verifica novas versões automaticamente.'],
    checking: ['Verificando', 'Procurando novas versões no GitHub…'],
    available: ['Nova versão', 'Atualização encontrada. Preparando o download…'],
    downloading: ['Baixando', 'Baixando a atualização em segundo plano…'],
    ready: ['Pronta!', 'A atualização já está baixada. Reinicie para instalar.'],
    current: ['Atualizado', 'Esta é a versão mais recente.'],
    error: ['Sem conexão', 'Não foi possível verificar agora. Tente novamente.'],
    portable: ['Portable', 'A versão portátil pode ser atualizada manualmente pela página de downloads.'],
    'portable-new': ['Nova versão', 'Nova versão Portable disponível para download no GitHub.'],
    development: ['Desenvolvimento', 'As atualizações automáticas funcionam no Setup instalado do Windows.'],
    unavailable: ['Indisponível', 'O serviço de atualizações não está disponível.']
  });
  function renderUpdateStatus(state) {
    if (!state || typeof state !== 'object') return;
    const phase = String(state.phase || 'unavailable');
    const [heading, explanation] = updateStates[phase] || updateStates.unavailable;
    $('update-chip').textContent = heading;
    $('update-message').textContent = explanation +
      (typeof state.version === 'string' ? ' Versão: ' + state.version + '.' : '');
    $('update-progress').hidden = phase !== 'downloading';
    if (phase === 'downloading')
      $('update-progress').value = E.clamp(Number(state.percent) || 0, 0, 100);
    $('update-install').hidden = phase !== 'ready';
    $('update-release').hidden = !['portable', 'portable-new'].includes(phase);
    $('update-check').disabled = ['checking', 'downloading'].includes(phase);
    if (phase === 'ready' || phase === 'portable-new') {
      updatesPanel.open = true;
      panelVisible(true);
      feedback('✨ Uma nova versão do Baby On Screen está disponível!');
    }
  }
  desktop.onUpdateStatus(renderUpdateStatus);
  desktop.onUpdateShow(() => { panelVisible(true); updatesPanel.open = true; });
  desktop.updateStatus().then(renderUpdateStatus).catch(() => {});
  $('update-check').addEventListener('click', () => {
    void desktop.checkUpdate().then(renderUpdateStatus).catch(() => renderUpdateStatus({ phase: 'error' }));
  });
  $('update-install').addEventListener('click', () => {
    save(); // Save baby data before restarting to install the downloaded update.
    $('update-install').disabled = true;
    void desktop.installUpdate().then(started => {
      if (!started) { $('update-install').disabled = false; renderUpdateStatus({ phase: 'error' }); }
    }).catch(() => {
      $('update-install').disabled = false;
      renderUpdateStatus({ phase: 'error' });
    });
  });
  $('update-release').addEventListener('click', () => { void desktop.openLatestRelease(); });
  desktop.version().then(version => {
    if (version) $('version').textContent = 'Versão ' + version;
  }).catch(() => {});
  window.addEventListener('resize', () => {
    bounds(); place();
    if (panel.style.left !== '') {
      const r=panel.getBoundingClientRect();
      setPanelPosition(r.left,r.top);
    }
    publishRegions();
  });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); if (document.hidden) save(); });
  window.addEventListener('beforeunload', save);
  setInterval(save, 15000);
  setInterval(publishRegions, 120);
  function animate(now) {
    const dt = Math.min(.12, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!options.paused && welcome.hidden) {
      game = E.tick(game, dt * options.speed);
      if (!draggingBaby && !draggingItem && now > busyUntil && !reduced.matches) {
        if (now > nextTurn) {
          const direction = Math.random() * Math.PI * 2;
          dx = Math.cos(direction); dy = Math.sin(direction);
          nextTurn = now + 3000 + Math.random() * 2000;
        }
        const area = nearestMonitor(x+BABY_WIDTH/2,y+BABY_HEIGHT/2) ||
          {x:0,y:0,width:innerWidth,height:innerHeight};
        x += dx * dt * 30 * options.speed;
        y += dy * dt * 30 * options.speed;
        if (x <= area.x+3 || x >= area.x+area.width-BABY_WIDTH-4) dx *= -1;
        if (y <= area.y+8 || y >= area.y+area.height-BABY_HEIGHT-8) dy *= -1;
        x = E.clamp(x,area.x+3,Math.max(area.x+3,area.x+area.width-BABY_WIDTH-4));
        y = E.clamp(y,area.y+8,Math.max(area.y+8,area.y+area.height-BABY_HEIGHT-8));
        bounds();
      }
    }
    if (now - lastFrame > 190) { frame = (frame + 1) % 3; lastFrame = now; }
    if (now > busyUntil) {
      baby.classList.remove('sleeping', 'eating');
      const next = Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'front' : 'back');
      if (next !== dir) {
        baby.classList.remove('front', 'left', 'right', 'back');
        dir = next; baby.classList.add(dir);
      }
      baby.style.setProperty('--frame-x', '-' + frame * 54 + 'px');
    }
    if (!options.paused && now > nextSpeech) speak('idle');
    if (!options.paused && E.urgency(game).level === 'crying' && now - lastCry > 23000) {
      voice('chorando'); lastCry = now;
    }
    place();
    syncSprite(now);
    // Display the very same cleaned game animation in the first-run guide.
    if (!welcome.hidden && previewContext && now - lastWelcomeDraw > 150) {
      const live = $('baby-sprite');
      if (!live.hidden) {
        previewContext.clearRect(0, 0, preview.width, preview.height);
        previewContext.drawImage(live, 0, 0, preview.width, preview.height);
        welcome.classList.add('welcome-sprite-ready');
      }
      lastWelcomeDraw = now;
    }
    if (now - lastDraw > 750) { render(); lastDraw = now; }
    requestAnimationFrame(animate);
  }
  render(); bounds(); place(); panelVisible(false); speak('return');
  try { if (localStorage.getItem(tourKey) !== 'completed') openWelcome(); }
  catch { openWelcome(); }
  requestAnimationFrame(animate);
})();
