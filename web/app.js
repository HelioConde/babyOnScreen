'use strict';
/* Baby On Screen Web: one-screen accessible pet simulator. All gameplay uses engine.js. */
(() => {
  const E = window.BabyEngine;
  const stage = document.getElementById('stage');
  if (!E || !stage) return;
  const $ = id => document.getElementById(id);
  const baby = $('baby');
  const spriteLayer = window.BabySpriteIntegration?.attachBabySprites({
    baby, canvas: $('baby-sprite'), manifest: window.BabySpriteManifest, base: '..'
  }) || null;
  const speechBubble = $('speech-bubble');
  const stateKey = 'baby-on-screen-web-v1';
  const optionsKey = 'baby-on-screen-web-preferences-v1';
  const iconsPath = '../assets/icons/';
  const names = { food: 'alimentação', energy: 'energia', hygiene: 'higiene', health: 'saúde' };
  const completed = {
    feed: 'Mamadeira entregue! A bebê ficou feliz. 🍼',
    sleep: 'Boa soneca! A energia melhorou. 🌙',
    diaper: 'Fraldinha trocada! Tudo limpinho. 💗',
    medicine: 'Os cuidados ajudaram muito! 💕',
    toy: 'Ela adorou brincar com o ursinho! 🧸',
    letter: 'Uma cartinha cheia de carinho! 💌',
    drawing: 'Vocês fizeram um desenho especial! 🎨'
  };
  const hint = 'Arraste um objeto até a bebê para interagir.';
  const source = document.currentScript ? document.currentScript.src : window.location.href;

  function read(key, fallback) {
    try {
      const val = JSON.parse(localStorage.getItem(key));
      return val && typeof val === 'object' ? val : fallback;
    } catch { return fallback; }
  }
  const newWebGame = () => { const baby = E.initial(); baby.needs.food = 69; return baby; };
  let game = E.sanitize(read(stateKey, newWebGame()));
  // Offline doesn't grow the baby: the next session resumes from the last saved age.
  const offline = Math.max(0, Math.min(180, (Date.now() - game.savedAt) / 1000));
  game = E.tick(game, offline, { active: false });
  const oldOptions = read(optionsKey, {});
  let options = {
    sound: oldOptions.sound === true,
    paused: oldOptions.paused === true,
    speed: E.clamp(Number(oldOptions.speed) || 1, .5, 2)
  };
  let x = Math.round(stage.clientWidth / 2 - 48), y = Math.round(stage.clientHeight - 120);
  let vx = 0.88, vy = .48, facing = 'front';
  let draggingBaby = false, itemDrag = null, selectedItem = null;
  let babyPressX = 0, babyPressY = 0, babyOffsetX = 0, babyOffsetY = 0;
  let lastFrameAt = 0, lastTime = performance.now(), lastUIAt = 0;
  let nextTurn = 0, nextSpeech = 10000, lastCry = 0, busyUntil = 0, crySince = 0;
  let frameIndex = 1, animationStage = E.ageStage(game).id, memoryCount = -1;
  let lastUrgency = 'calm', toastTimer = null;
  let careAction = 'idle', spriteState = '', spriteRefreshAt = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const audioCache = new Map();

  function syncSprite(now = performance.now()) {
    if (!spriteLayer || now < spriteRefreshAt) return;
    spriteRefreshAt = now + 180;
    const age = E.ageStage(game).id;
    const direction = ({ front: 'down', back: 'up', left: 'left', right: 'right' })[facing] || 'down';
    const moving = !options.paused && !draggingBaby && !itemDrag && !reducedMotion.matches;
    const action = now < busyUntil ? careAction : (moving ? 'walk' : 'idle');
    const key = [age, direction, action].join(':');
    if (key !== spriteState) {
      spriteState = key;
      void spriteLayer.show({ stage: age, direction, action });
    }
  }

  function save() {
    game.savedAt = Date.now();
    try {
      localStorage.setItem(stateKey, JSON.stringify(game));
      localStorage.setItem(optionsKey, JSON.stringify(options));
    } catch { setFeedback('Aviso: o navegador não permitiu salvar. Use "Salvar progresso".'); }
  }
  function play(name) {
    if (!options.sound) return;
    try {
      if (!audioCache.has(name)) {
        const a = new Audio(new URL('../som/' + name + '.mp3', source).href);
        a.volume = .25;
        audioCache.set(name, a);
      }
      const audio = audioCache.get(name);
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch { /* Audio is optional and requires browser permission. */ }
  }
  function setFeedback(text) { $('feedback').textContent = text; }
  function bubble(text) { speechBubble.textContent = text; }
  function toast(text) {
    if (!text) return;
    clearTimeout(toastTimer);
    $('milestone-toast').textContent = '🌟 ' + text;
    $('milestone-toast').hidden = false;
    toastTimer = setTimeout(() => { $('milestone-toast').hidden = true; }, 4000);
  }
  function speak(context) {
    const line = E.speak(game, context, Math.random());
    bubble(line);
    game.lastSpoken = line;
    nextSpeech = performance.now() + (E.urgency(game).level === 'crying' ? 7200 : 12000 + Math.random() * 7500);
  }
  function playArea() {
    const left = Math.min(Math.round(stage.clientWidth * .14), Math.max(8, stage.clientWidth - 104));
    const right = Math.max(left, stage.clientWidth - 104 - left);
    const top = Math.min(145, Math.max(18, stage.clientHeight - 104));
    const bottom = Math.max(top, stage.clientHeight - 100);
    return { left, right, top, bottom };
  }
  function bounds() {
    const area = playArea();
    x = E.clamp(x, area.left, area.right);
    y = E.clamp(y, area.top, area.bottom);
  }
  function place() {
    baby.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    const bubbleWidth = 184;
    const bx = E.clamp(x + 80, 7, Math.max(7, stage.clientWidth - bubbleWidth));
    const by = E.clamp(y - 55, 8, Math.max(8, stage.clientHeight - 75));
    speechBubble.style.transform = 'translate3d(' + Math.round(bx) + 'px,' + Math.round(by) + 'px,0)';
  }
  function hitBaby(clientX, clientY) {
    const r = baby.getBoundingClientRect();
    return clientX >= r.left - 26 && clientX <= r.right + 26 &&
      clientY >= r.top - 29 && clientY <= r.bottom + 29;
  }
  function stagePosition(event) {
    const r = stage.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  function remainingLabel(name) {
    const ms = Math.max(0, (game.cooldowns[name] || 0) - Date.now());
    if (ms > 0) return Math.ceil(ms / 1000) + 's';
    const action = E.actions[name];
    if (action && game.needs[action.need] > 74) return 'Quando pedir';
    return 'Pronto!';
  }
  function clearSelected() {
    selectedItem = null;
    document.querySelectorAll('.item.selected').forEach(el => el.classList.remove('selected'));
  }
  function setSelected(name) {
    clearSelected();
    selectedItem = name;
    const button = document.querySelector('[data-item="' + name + '"]');
    if (button) button.classList.add('selected');
    setFeedback('Item escolhido: ' + (button?.querySelector('strong')?.textContent || name) + '. Agora toque na bebê ou arraste o item até ela.');
  }
  function careWithItem(name) {
    let result;
    if (E.actions[name]) result = E.care(game, name);
    else if (E.activities[name]) result = E.interact(game, name);
    else return;
    clearSelected();
    if (!result.applied) {
      if (result.reason === 'cooldown') {
        setFeedback('Ainda não é hora de usar esse item. Espere o intervalo terminar! ⏳');
      } else if (result.reason === 'not-needed') {
        const need = E.actions[name].need;
        setFeedback('Ela ainda não precisa de ' + names[need] + '. Espere o balão dela pedir! 💕');
      } else setFeedback('Esta interação não está disponível agora.');
      bubble(E.speak(game, 'idle', Math.random()));
      updateUI();
      return;
    }
    const oldStage = E.ageStage(game).id;
    game = result.state;
    const newStage = E.ageStage(game).id;
    busyUntil = performance.now() + (name === 'sleep' ? 3000 : 1800);
    careAction = name;
    spriteRefreshAt = 0; syncSprite();
    baby.classList.remove('sleeping', 'eating', 'stage-reaction');
    if (name === 'sleep') baby.classList.add('sleeping');
    else if (name === 'feed') baby.classList.add('eating');
    else baby.classList.add('stage-reaction');
    if (name === 'toy') speak('play');
    else speak('care');
    setFeedback(completed[name]);
    if (name === 'letter') toast('Uma lembrança carinhosa para o álbum!');
    if (name === 'drawing') toast('Um desenho novo entrou no álbum!');
    play('rindo');
    if (result.achievements && result.achievements.length) toast(result.achievements[result.achievements.length - 1]);
    if (oldStage !== newStage) onGrowth(newStage);
    updateUI();
    save();
  }

  function pet() {
    if (selectedItem) { careWithItem(selectedItem); return; }
    game.happiness = E.clamp(game.happiness + 2, 0, 100);
    speak('happy');
    busyUntil = performance.now() + 1000;
    careAction = 'pet'; spriteRefreshAt = 0; syncSprite();
    setFeedback(E.ageStage(game).id === 'newborn' ? 'Ela adorou seu carinho. Gugu! 💕' : 'Sua amiguinha ficou feliz com o carinho!');
    play('feliz');
    save();
  }

  baby.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    draggingBaby = true;
    babyPressX = e.clientX; babyPressY = e.clientY;
    const pos = stagePosition(e);
    babyOffsetX = pos.x - x; babyOffsetY = pos.y - y;
    baby.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  baby.addEventListener('pointermove', e => {
    if (!draggingBaby) return;
    const p = stagePosition(e);
    x = p.x - babyOffsetX; y = p.y - babyOffsetY;
    bounds(); place();
  });
  function babyRelease(e, cancelled) {
    if (!draggingBaby) return;
    draggingBaby = false;
    try { baby.releasePointerCapture(e.pointerId); } catch { /* Already released */ }
    if (!cancelled && Math.hypot(e.clientX - babyPressX, e.clientY - babyPressY) < 8) pet();
  }
  baby.addEventListener('pointerup', e => babyRelease(e, false));
  baby.addEventListener('pointercancel', e => babyRelease(e, true));
  baby.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pet(); }
  });
  stage.addEventListener('keydown', e => {
    const step = 14;
    if (e.key === 'ArrowUp') y -= step;
    else if (e.key === 'ArrowDown') y += step;
    else if (e.key === 'ArrowLeft') x -= step;
    else if (e.key === 'ArrowRight') x += step;
    else return;
    e.preventDefault();
    bounds(); place();
  });

  function dragGhost(item, clientX, clientY) {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const img = item.querySelector('img');
    if (img) {
      const copy = img.cloneNode();
      ghost.appendChild(copy);
    }
    document.body.appendChild(ghost);
    ghost.style.left = clientX + 'px';
    ghost.style.top = clientY + 'px';
    return ghost;
  }
  document.querySelectorAll('[data-item]').forEach(item => {
    item.addEventListener('pointerdown', e => {
      if (e.button !== 0 || itemDrag) return;
      item.setPointerCapture(e.pointerId);
      item.classList.add('dragging');
      itemDrag = {
        name: item.dataset.item, item, startX: e.clientX, startY: e.clientY,
        ghost: dragGhost(item, e.clientX, e.clientY)
      };
      e.preventDefault();
    });
    item.addEventListener('pointermove', e => {
      if (!itemDrag || itemDrag.item !== item) return;
      itemDrag.ghost.style.left = e.clientX + 'px';
      itemDrag.ghost.style.top = e.clientY + 'px';
      baby.classList.toggle('drop-target', hitBaby(e.clientX, e.clientY));
    });
    function release(e, cancelled) {
      if (!itemDrag || itemDrag.item !== item) return;
      const drag = itemDrag;
      itemDrag = null;
      try { item.releasePointerCapture(e.pointerId); } catch { /* Already released */ }
      item.classList.remove('dragging');
      baby.classList.remove('drop-target');
      drag.ghost.remove();
      if (cancelled) return;
      if (hitBaby(e.clientX, e.clientY)) {
        careWithItem(drag.name);
      } else if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 10) {
        // Accessible touch fallback: select an item, then tap the baby.
        setSelected(drag.name);
      } else {
        setFeedback('Quase! Solte o item sobre a bebê para usar. 💕');
      }
    }
    item.addEventListener('pointerup', e => release(e, false));
    item.addEventListener('pointercancel', e => release(e, true));
    item.addEventListener('click', e => {
      // detail === 0 is keyboard activation; pointer activation is handled by drag.
      if (e.detail === 0) setSelected(item.dataset.item);
    });
  });

  function onGrowth(id) {
    const current = E.stages.find(s => s.id === id);
    if (!current) return;
    toast('Nova fase: ' + current.title + '!');
    speak('happy');
    setFeedback('Sua amiguinha cresceu! Agora está na fase: ' + current.title + '.');
    play('feliz');
  }
  function updateStage() {
    const stageInfo = E.ageStage(game);
    if (animationStage !== stageInfo.id) {
      spriteState = ''; spriteRefreshAt = 0;
      baby.classList.remove('newborn', 'baby-stage', 'toddler', 'child');
      baby.classList.add(stageInfo.id === 'baby' ? 'baby-stage' : stageInfo.id);
      $('hero-character').className = 'hero-character ' + (stageInfo.id === 'newborn' ? '' : stageInfo.id) + (stageInfo.id === 'child' ? '' : ' sprite-preview');
      $('stage').classList.toggle('child-stage', stageInfo.id === 'child');
      $('stage').classList.toggle('toddler-stage', stageInfo.id === 'toddler');
      $('scene-name').textContent = stageInfo.id === 'child' ? 'Meu cantinho criativo' :
        stageInfo.id === 'toddler' ? 'Sala das descobertas' : 'Quarto da bebê';
      animationStage = stageInfo.id;
      $('hero-quote').textContent = E.speak(game, 'return', .5);
    }
    $('phase-name').textContent = stageInfo.title;
    $('phase-desc').textContent = stageInfo.description;
    $('life-day').textContent = 'Dia ' + E.ageDays(game);
    $('game-time').textContent = Math.floor(game.activeSeconds / 60) + ' min de vida';
    $('level').textContent = 'Nível ' + E.level(game);
    $('care-count').textContent = game.careCount + (game.careCount === 1 ? ' cuidado' : ' cuidados');
    const index = E.stages.findIndex(s => s.id === stageInfo.id);
    const next = E.stages[index + 1];
    if (next) {
      const neededMinutes = Math.max(0, Math.ceil(next.minutes - game.activeSeconds / 60));
      const neededCares = Math.max(0, next.cares - game.careCount);
      $('growth-label').textContent = 'Próxima fase: ' + next.title;
      $('growth-detail').textContent = neededMinutes + ' min de jogo e ' + neededCares + ' cuidados restantes';
      const timeProgress = (game.activeSeconds / 60) / next.minutes;
      const careProgress = game.careCount / next.cares;
      $('growth-progress').value = Math.min(100, Math.max(0, Math.min(timeProgress, careProgress) * 100));
    } else {
      $('growth-label').textContent = 'Infância desbloqueada! 🌟';
      $('growth-detail').textContent = 'Continue criando memórias e preparando a próxima aventura.';
      $('growth-progress').value = 100;
    }
  }
  function renderMemories() {
    const all = game.memories;
    if (all.length === memoryCount) return;
    memoryCount = all.length;
    const parent = $('memories');
    parent.replaceChildren();
    $('memory-count').textContent = all.length + (all.length === 1 ? ' lembrança' : ' lembranças');
    if (!all.length) {
      const p = document.createElement('p');
      p.textContent = 'As suas primeiras conquistas e desenhos aparecerão aqui.';
      parent.append(p);
      return;
    }
    all.slice().reverse().forEach(text => {
      const p = document.createElement('span');
      p.textContent = '✦ ' + text;
      parent.append(p);
    });
  }
  function updateUI() {
    updateStage();
    for (const key of Object.keys(E.defaults)) {
      const n = Math.round(game.needs[key]);
      $(key).value = n;
      $(key + '-value').textContent = n + '%';
      $(key).setAttribute('aria-valuetext', n + '%');
    }
    for (const el of document.querySelectorAll('[data-remaining]')) {
      const item = el.dataset.remaining;
      const label = remainingLabel(item);
      el.textContent = label;
      const button = el.closest('.item');
      button.classList.toggle('ready', label === 'Pronto!');
      button.classList.toggle('waiting', label === 'Quando pedir');
      button.classList.toggle('cooling', label.endsWith('s'));
    }
    const urgent = E.urgency(game);
    if (urgent.level !== lastUrgency) {
      lastUrgency = urgent.level;
      if (urgent.level === 'crying') {
        crySince = performance.now();
        speak('cry'); play('chorando'); lastCry = performance.now();
      } else if (urgent.level === 'asking') {
        speak(urgent.need);
      } else {
        speak('idle');
      }
    }
    $('cry-indicator').classList.toggle('crying', urgent.level === 'crying');
    baby.classList.toggle('crying', urgent.level === 'crying');
    $('cry-indicator').textContent = urgent.level === 'crying' ? '😢 Chorando: precisa de ' + names[urgent.need] :
      urgent.level === 'asking' ? '💭 Precisa de ' + names[urgent.need] : '💗 Tudo tranquilo';
    renderMemories();
  }

  $('sound').addEventListener('click', () => {
    options.sound = !options.sound;
    $('sound').textContent = options.sound ? '🔊 Som ligado' : '🔇 Som desligado';
    $('sound').setAttribute('aria-pressed', String(options.sound));
    if (options.sound) play('rindo');
    save();
  });
  $('pause').addEventListener('click', () => {
    options.paused = !options.paused;
    $('pause').textContent = options.paused ? '▶ Continuar' : '⏸ Pausar';
    $('pause').setAttribute('aria-pressed', String(options.paused));
    setFeedback(options.paused ? 'O tempo e os movimentos estão pausados.' : 'Sua amiguinha voltou a brincar!');
    save();
  });
  $('speed').addEventListener('input', e => { options.speed = Number(e.target.value); save(); });
  $('export').addEventListener('click', () => {
    save();
    const blob = new Blob([E.exportSave(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'baby-on-screen-progresso.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setFeedback('Progresso exportado! Guarde o arquivo para importar no PC.');
  });
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 100000) { setFeedback('Arquivo muito grande. Selecione um salvamento válido.'); return; }
    try {
      const loaded = E.importSave(await file.text());
      if (!window.confirm('Substituir o progresso atual pelo progresso deste arquivo?')) return;
      game = loaded; animationStage = ''; memoryCount = -1; lastUrgency = 'calm';
      speak('return'); updateUI(); save();
      setFeedback('Progresso importado! Bem-vinda de volta, amiguinha! 💕');
    } catch (err) { setFeedback('Não foi possível importar: ' + err.message); }
  });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Apagar o progresso desta bebê e começar uma nova história?')) return;
    game = newWebGame();
    animationStage = ''; memoryCount = -1; lastUrgency = 'calm';
    clearSelected(); updateUI(); speak('return'); save();
    setFeedback('Uma nova vida começou! Gugu dada! 💕');
  });

  window.addEventListener('resize', () => { bounds(); place(); });
  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
    if (document.hidden) save();
    else { speak('return'); lastTime = performance.now(); }
  });
  window.addEventListener('pagehide', save);
  setInterval(save, 15000);

  function loop(now) {
    const dt = Math.min(.11, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!options.paused) {
      game = E.tick(game, dt * 3);
      if (!draggingBaby && !itemDrag && now > busyUntil && !reducedMotion.matches) {
        if (now > nextTurn) {
          const heading = Math.random() * Math.PI * 2;
          vx = Math.cos(heading); vy = Math.sin(heading);
          nextTurn = now + 2800 + Math.random() * 1800;
        }
        x += vx * dt * 33 * options.speed;
        y += vy * dt * 33 * options.speed;
        const area = playArea();
        if (x <= area.left || x >= area.right) vx *= -1;
        if (y <= area.top || y >= area.bottom) vy *= -1;
        bounds();
      }
    }
    if (now - lastFrameAt > 180) {
      frameIndex = (frameIndex + 1) % 3; lastFrameAt = now;
    }
    if (now > busyUntil) {
      baby.classList.remove('sleeping', 'eating', 'stage-reaction');
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'front' : 'back');
      if (dir !== facing) {
        facing = dir; baby.classList.remove('front', 'left', 'right', 'back'); baby.classList.add(dir);
      }
      baby.style.setProperty('--frame-x', '-' + (frameIndex * 54) + 'px');
    }
    if (!options.paused && now > nextSpeech) speak('idle');
    if (!options.paused && E.urgency(game).level === 'crying' && now - lastCry > 22000) {
      play('chorando'); lastCry = now;
    }
    place();
    syncSprite(now);
    if (now - lastUIAt > 500) { updateUI(); lastUIAt = now; }
    requestAnimationFrame(loop);
  }
  $('sound').textContent = options.sound ? '🔊 Som ligado' : '🔇 Som desligado';
  $('sound').setAttribute('aria-pressed', String(options.sound));
  $('pause').textContent = options.paused ? '▶ Continuar' : '⏸ Pausar';
  $('pause').setAttribute('aria-pressed', String(options.paused));
  $('speed').value = String(options.speed);
  animationStage = '';
  bounds(); place(); updateUI(); speak('return');
  requestAnimationFrame(loop);
})();
