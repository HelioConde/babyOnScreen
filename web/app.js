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
  // The landing page and the playable scene must show the same baby character.
  // Clean the old import artifacts, without changing the original PNG files.
  if (window.BabySpriteCleaner) {
    const hero = $('hero-character');
    const poses = [
      ['newborn', '001'], ['baby', '005'], ['toddler', '029'], ['child', '033']
    ];
    const cleanedUrl = new Map();
    function spritePreview(url) {
      if (!cleanedUrl.has(url)) {
        cleanedUrl.set(url, window.BabySpriteCleaner.load(url).then(canvas =>
          typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : url
        ));
      }
      return cleanedUrl.get(url);
    }
    for (const [stage, id] of poses) {
      const url = '../assets/sprites/generated/crescimento/element_' + id + '.png';
      spritePreview(url).then(cleanUrl => {
        if (hero) hero.style.setProperty('--hero-clean-' + stage,
          'url("' + cleanUrl + '")');
      }).catch(() => {});
    }
    for (const img of document.querySelectorAll('img[data-clean-sprite]')) {
      const url = img.getAttribute('src');
      spritePreview(url).then(cleanUrl => { img.src = cleanUrl; }).catch(() => {});
    }
  }
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
  const oldOptions = read(optionsKey, {});
  let options = {
    sound: oldOptions.sound === true,
    paused: oldOptions.paused === true,
    speed: E.clamp(Number(oldOptions.speed) || 1, .5, 2),
    night: oldOptions.night === true
  };
  const startedAt = Date.now();
  const storedGame = E.sanitize(read(stateKey, newWebGame()));
  // Restore at most 2 real hours after a closed tab. Longer gaps are bounded
  // to avoid abrupt growth or depleted needs when returning much later.
  let game = E.advanceClock(storedGame, (startedAt - storedGame.savedAt) / 1000,
    { paused: options.paused, speed: options.speed });
  game.savedAt = startedAt;
  let lastClockAt = startedAt;
  const BABY_SIZE = window.BabySpritePresentation.size;
  let x = Math.round(stage.clientWidth / 2 - BABY_SIZE / 2), y = Math.round(stage.clientHeight - BABY_SIZE - 16);
  let vx = 0.88, vy = .48, facing = 'front';
  let draggingBaby = false, itemDrag = null, selectedItem = null;
  let babyPressX = 0, babyPressY = 0, babyOffsetX = 0, babyOffsetY = 0;
  let lastFrameAt = 0, lastTime = performance.now(), lastUIAt = 0;
  let nextTurn = 0, nextSpeech = 10000, lastCry = 0, busyUntil = 0, crySince = 0;
  let frameIndex = 1, animationStage = E.ageStage(game).id, memoryCount = -1;
  let lastUrgency = 'calm', toastTimer = null, lastMilestoneSignature = '', lastDailySignature = '', activeSchoolQuestion = null;
  let careAction = 'idle', spriteState = '', spriteRefreshAt = 0;
  let lastHorizontalDirection = vx >= 0 ? 'right' : 'left';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const audioCache = new Map();

  function syncSprite(now = performance.now()) {
    if (!spriteLayer || now < spriteRefreshAt) return;
    spriteRefreshAt = now + 180;
    const age = E.ageStage(game).id;
    const moving = !options.paused && !draggingBaby && !itemDrag && !reducedMotion.matches && now >= busyUntil;
    // A diagonal path still moves horizontally. Using the old facing=front/back
    // chose the LEFT sprite even when the baby was traveling right.
    if (moving && Math.abs(vx) > 0.08) lastHorizontalDirection = vx > 0 ? 'right' : 'left';
    const direction = age === 'child'
      ? (({ front: 'down', back: 'up', left: 'left', right: 'right' })[facing] || 'down')
      : lastHorizontalDirection;
    const action = now < busyUntil ? careAction : (moving ? 'walk' : 'idle');
    const key = [age, direction, action].join(':');
    if (key !== spriteState) {
      spriteState = key;
      void spriteLayer.show({ stage: age, direction, action });
    }
  }

  function syncClock(now = Date.now()) {
    const elapsed = Math.max(0, (now - lastClockAt) / 1000);
    lastClockAt = Math.max(lastClockAt, now);
    if (!options.paused && elapsed > 0) game = E.advanceClock(game, elapsed, { speed: options.speed });
    return elapsed;
  }

  function save() {
    syncClock();
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
    // Keep the character on the main rug, in front of the furniture, at all screen sizes.
    const size = BABY_SIZE;
    const left = Math.min(Math.round(stage.clientWidth * .22), Math.max(8, stage.clientWidth - size - 8));
    const right = Math.max(left, stage.clientWidth - size - left);
    const top = Math.min(145, Math.max(110, stage.clientHeight - size - 6));
    const bottom = Math.max(top, stage.clientHeight - size - 6);
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
    const bx = E.clamp(x + 103, 7, Math.max(7, stage.clientWidth - bubbleWidth));
    const by = E.clamp(y - 62, 8, Math.max(8, stage.clientHeight - 75));
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
      $('hero-character').className = 'hero-character ' + stageInfo.id + ' sprite-preview';
      $('stage').classList.toggle('child-stage', stageInfo.id === 'child');
      $('stage').classList.toggle('toddler-stage', stageInfo.id === 'toddler');
      $('scene-name').textContent = stageInfo.id === 'child' ? 'Meu cantinho criativo' :
        stageInfo.id === 'toddler' ? 'Sala das descobertas' : 'Quarto da bebê';
      animationStage = stageInfo.id;
      $('hero-quote').textContent = E.speak(game, 'return', .5);
    }
    $('school-web').hidden = stageInfo.id !== 'child';
    $('school-web-stats').textContent = game.schoolVisits +
      (game.schoolVisits === 1 ? ' aula concluída' : ' aulas concluídas');
    $('baby-name-label').textContent = game.babyName || 'MINHA AMIGUINHA';
    $('baby-hero-caption').textContent = game.babyName ? game.babyName + ' ✨' : 'sua nova amiguinha ✨';
    baby.setAttribute('aria-label', (game.babyName || 'Bebê') + '. Arraste para mover, toque para carinho ou solte nela um item.');
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
  let showAllMemories = false;
  function renderMemories() {
    const summary = E.memorySummary(game);
    if (summary.total === memoryCount) return;
    memoryCount = summary.total;
    const parent = $('memories');
    parent.replaceChildren();
    $('memory-count').textContent = summary.total +
      (summary.total === 1 ? ' lembrança' : ' lembranças') +
      (summary.groups.length ? ' · ' + summary.groups.length + (summary.groups.length === 1 ? ' tipo' : ' tipos') : '');
    if (!summary.total) {
      const p = document.createElement('p');
      p.textContent = 'As suas primeiras conquistas e desenhos aparecerão aqui.';
      parent.append(p);
      return;
    }
    const shown = showAllMemories ? summary.groups : summary.groups.slice(0, 6);
    for (const item of shown) {
      const chip = document.createElement('span');
      chip.className = 'memory-chip';
      const text = document.createElement('span');
      text.textContent = '✦ ' + item.label;
      chip.append(text);
      if (item.count > 1) {
        const tally = document.createElement('strong');
        tally.className = 'memory-tally';
        tally.textContent = '×' + item.count;
        tally.setAttribute('aria-label', item.count + ' vezes');
        chip.append(tally);
      }
      parent.append(chip);
    }
    if (summary.groups.length > 6) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'memory-more';
      more.textContent = showAllMemories
        ? 'Mostrar menos'
        : 'Ver mais ' + (summary.groups.length - 6) + ' tipos';
      more.addEventListener('click', () => {
        showAllMemories = !showAllMemories;
        memoryCount = -1;
        renderMemories();
      });
      parent.append(more);
    }
  }
  function schoolQuestion() {
    const subject = $('school-web-subject').value;
    const questions = E.schoolQuestions[subject] || E.schoolQuestions.reading;
    activeSchoolQuestion = questions[Math.floor(Math.random() * questions.length)];
    $('school-web-question').textContent = activeSchoolQuestion.question;
    const answers = $('school-web-answers');
    answers.replaceChildren();
    activeSchoolQuestion.answers.forEach((answer, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = answer;
      button.addEventListener('click', () => {
        if (!activeSchoolQuestion) return;
        if (index !== activeSchoolQuestion.correct) {
          $('school-web-question').textContent = 'Quase! Tente de novo: ' + activeSchoolQuestion.question;
          return;
        }
        const result = E.school(game, subject);
        if (!result.applied) {
          const message = result.reason === 'cooldown' ? 'Ela precisa descansar um pouco antes da próxima aula.' :
            result.reason === 'needs-care' ? 'Antes de estudar, ela precisa comer e descansar.' :
              'Essa aula ainda não está disponível.';
          $('school-web-question').textContent = message;
          setFeedback(message);
          return;
        }
        game = result.state;
        activeSchoolQuestion = null;
        $('school-web-lesson').hidden = true;
        $('school-web-open').setAttribute('aria-expanded', 'false');
        $('school-web-open').textContent = 'Fazer outra atividade →';
        setFeedback('🏫 Aula concluída! +30 XP, uma habilidade e uma lembrança especial.');
        toast('Sua pequena aprendeu algo novo!');
        speak('happy');
        updateUI();
        save();
      });
      answers.append(button);
    });
  }
  $('school-web-open').addEventListener('click', () => {
    const lesson = $('school-web-lesson');
    lesson.hidden = !lesson.hidden;
    $('school-web-open').setAttribute('aria-expanded', String(!lesson.hidden));
    if (!lesson.hidden) schoolQuestion();
  });
  $('school-web-close').addEventListener('click', () => {
    $('school-web-lesson').hidden = true;
    $('school-web-open').setAttribute('aria-expanded', 'false');
    activeSchoolQuestion = null;
  });
  $('school-web-subject').addEventListener('change', schoolQuestion);
  function renderMissions() {
    const goals = E.milestoneStatus(game);
    const signature = goals.map(m => [m.id, m.progress, m.claimed].join(':')).join('|');
    if (signature === lastMilestoneSignature) return;
    lastMilestoneSignature = signature;
    const list = $('missions-list');
    const finished = goals.filter(m => m.claimed).length;
    const claimed = new Set(goals.filter(m => m.claimed).map(m => m.id));
    stage.classList.toggle('room-unlocked-drawing', claimed.has('first-drawing'));
    stage.classList.toggle('room-unlocked-toy', claimed.has('first-toy'));
    const drawingFrame = stage.querySelector('.room-frame');
    const plush = stage.querySelector('.room-shelf span');
    if (drawingFrame?.firstChild) drawingFrame.firstChild.nodeValue = claimed.has('first-drawing') ? '🎨' : '♥';
    if (plush) plush.textContent = claimed.has('first-toy') ? '🧸' : '★';
    $('missions-count').textContent = finished + '/' + goals.length + ' resgatadas';
    list.replaceChildren();
    // Prioritize rewards that can already be claimed; then show upcoming objectives.
    const pending = goals.filter(m => !m.claimed)
      .sort((a, b) => Number(b.complete) - Number(a.complete));
    const visible = pending.slice(0, 3);
    if (!visible.length) {
      const msg = document.createElement('p');
      msg.className = 'missions-finished';
      msg.textContent = '🎉 Você conquistou todas as missões! Continue criando memórias.';
      list.append(msg);
      return;
    }
    for (const mission of visible) {
      const card = document.createElement('article');
      card.className = 'mission-card' + (mission.complete ? ' mission-ready' : '');
      const top = document.createElement('div');
      top.className = 'mission-card-top';
      const name = document.createElement('strong');
      name.textContent = mission.title;
      const counter = document.createElement('span');
      counter.textContent = mission.progress + '/' + mission.target;
      top.append(name, counter);
      const detail = document.createElement('p');
      detail.textContent = mission.detail;
      const bottom = document.createElement('div');
      bottom.className = 'mission-card-bottom';
      const bar = document.createElement('progress');
      bar.max = mission.target;
      bar.value = mission.progress;
      bar.setAttribute('aria-label', mission.title + ': ' + mission.progress + ' de ' + mission.target);
      const reward = document.createElement('span');
      reward.textContent = '+' + mission.xp + ' XP';
      bottom.append(bar, reward);
      card.append(top, detail, bottom);
      if (mission.complete) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mission-claim';
        button.dataset.claimMilestone = mission.id;
        button.textContent = 'Resgatar recompensa';
        card.append(button);
      }
      list.append(card);
    }
  }
  $('missions-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-claim-milestone]');
    if (!button) return;
    const result = E.claimMilestone(game, button.dataset.claimMilestone);
    if (!result.claimed) return;
    game = result.state;
    lastMilestoneSignature = '';
    toast(result.title + ' · +' + result.xp + ' XP');
    setFeedback('Missão concluída! ' + result.title + ': +' + result.xp + ' XP e alegria extra. 💕');
    speak('happy');
    updateUI();
    save();
  });
  function renderDaily() {
    const today = E.dailyStatus(game);
    const signature = today.date + ':' + today.goals.map(g => [g.id, g.progress, g.claimed].join(':')).join('|');
    if (signature === lastDailySignature) return;
    lastDailySignature = signature;
    const count = today.goals.filter(g => g.claimed).length;
    $('daily-count').textContent = count + '/' + today.goals.length + ' resgatados';
    const list = $('daily-list');
    list.replaceChildren();
    for (const goal of today.goals) {
      const row = document.createElement('article');
      row.className = 'daily-task' + (goal.complete ? ' daily-complete' : '');
      const title = document.createElement('strong');
      title.textContent = (goal.claimed ? '✓ ' : '') + goal.title;
      const description = document.createElement('span');
      description.textContent = goal.detail;
      const progress = document.createElement('div');
      progress.className = 'daily-task-progress';
      const counter = document.createElement('small');
      counter.textContent = goal.progress + '/' + goal.target;
      const reward = document.createElement('small');
      reward.textContent = '+' + goal.xp + ' XP';
      progress.append(counter, reward);
      row.append(title, description, progress);
      if (goal.complete && !goal.claimed) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.claimDaily = goal.id;
        button.textContent = 'Resgatar';
        row.append(button);
      }
      if (goal.claimed) {
        const done = document.createElement('small');
        done.className = 'daily-claimed';
        done.textContent = 'Recompensa recebida';
        row.append(done);
      }
      list.append(row);
    }
  }
  $('daily-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-claim-daily]');
    if (!button) return;
    const result = E.claimDaily(game, button.dataset.claimDaily);
    if (!result.claimed) return;
    game = result.state;
    lastDailySignature = '';
    toast('Rotina: ' + result.title + ' · +' + result.xp + ' XP');
    setFeedback('Rotina concluída! ' + result.title + ': +' + result.xp + ' XP e alegria extra.');
    renderDaily();
    updateUI();
    save();
  });
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
    const mood = Math.round(game.happiness);
    $('happiness-bar').value = mood;
    $('happiness-value').textContent = mood + '%';
    $('happiness-bar').setAttribute('aria-valuetext', mood + '% de felicidade');
    const careMap = { food: 'feed', energy: 'sleep', hygiene: 'diaper', health: 'medicine' };
    const itemName = careMap[urgent.need];
    const remaining = Math.ceil(Math.max(0, (game.cooldowns[itemName] || 0) - Date.now()) / 1000);
    $('care-suggestion').textContent = urgent.level === 'calm'
      ? (mood < 55 ? 'Ela precisa de carinho. Brinque, desenhe ou envie uma cartinha!' : 'Tudo tranquilo! Brinque, faça um desenho ou descubra novas conquistas.')
      : remaining > 0
        ? 'Ela precisa de ' + names[urgent.need] + '. O próximo cuidado estará pronto em ' + remaining + 's.'
        : 'Ela precisa de ' + names[urgent.need] + ': use ' + E.actions[itemName].label.toLowerCase() + '.';
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
    renderMissions();
    renderDaily();
  }

  function syncSoundControls() {
    const enabled = options.sound;
    $('sound').textContent = enabled ? '🔊 Som ligado' : '🔇 Som desligado';
    $('sound').setAttribute('aria-pressed', String(enabled));
    const button = $('scene-sound');
    button.textContent = enabled ? '🔊' : '🔇';
    button.title = enabled ? 'Som ligado' : 'Som desligado';
    button.setAttribute('aria-label', enabled ? 'Desligar som' : 'Ligar som');
    button.setAttribute('aria-pressed', String(enabled));
  }
  function toggleSound() {
    options.sound = !options.sound;
    if (!options.sound) {
      for (const audio of audioCache.values()) audio.pause();
    }
    syncSoundControls();
    if (options.sound) play('rindo');
    save();
  }
  function syncLight() {
    $('stage').classList.toggle('night-mode', options.night);
    $('scene-light').textContent = options.night ? '☀' : '☾';
    $('scene-light').setAttribute('aria-pressed', String(options.night));
    $('scene-light').setAttribute('aria-label', options.night ? 'Alternar para modo dia' : 'Alternar para modo noite');
  }
  $('scene-light').addEventListener('click', () => {
    options.night = !options.night;
    syncLight();
    setFeedback(options.night ? 'A noite chegou ao quartinho. Bons sonhos! 🌙' : 'O sol voltou ao quartinho! ☀️');
    save();
  });
  syncLight();
  $('sound').addEventListener('click', toggleSound);
  $('scene-sound').addEventListener('click', toggleSound);
  syncSoundControls();
  $('pause').addEventListener('click', () => {
    syncClock(); // Credit the elapsed time before changing pause mode.
    options.paused = !options.paused;
    $('pause').textContent = options.paused ? '▶ Continuar' : '⏸ Pausar';
    $('pause').setAttribute('aria-pressed', String(options.paused));
    setFeedback(options.paused ? 'O tempo e os movimentos estão pausados.' : 'Sua amiguinha voltou a brincar!');
    save();
  });
  $('baby-name-input').value = game.babyName;
  $('baby-name-input').addEventListener('input', e => {
    game = E.renameBaby(game, e.target.value);
    $('baby-name-label').textContent = game.babyName || 'MINHA AMIGUINHA';
    $('baby-hero-caption').textContent = game.babyName ? game.babyName + ' ✨' : 'sua nova amiguinha ✨';
    save();
  });
  $('speed').addEventListener('input', e => {
    syncClock(); // Settle the previous elapsed time at the previous speed.
    options.speed = E.clamp(Number(e.target.value), .5, 2);
    $('speed-value').textContent = options.speed.toLocaleString('pt-BR') + '×';
    save();
  });
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
      game = loaded; lastClockAt = Date.now(); game.savedAt = lastClockAt;
      $('baby-name-input').value = game.babyName;
      animationStage = ''; memoryCount = -1; lastUrgency = 'calm';
      speak('return'); updateUI(); save();
      setFeedback('Progresso importado! Bem-vinda de volta, amiguinha! 💕');
    } catch (err) { setFeedback('Não foi possível importar: ' + err.message); }
  });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Apagar o progresso desta bebê e começar uma nova história?')) return;
    game = newWebGame(); lastClockAt = Date.now(); game.savedAt = lastClockAt;
    $('baby-name-input').value = game.babyName;
    animationStage = ''; memoryCount = -1; lastUrgency = 'calm';
    clearSelected(); updateUI(); speak('return'); save();
    setFeedback('Uma nova vida começou! Gugu dada! 💕');
  });

  window.addEventListener('resize', () => { bounds(); place(); });
  document.addEventListener('visibilitychange', () => {
    syncClock(); // Background tabs stop rendering, but their clock keeps running.
    lastTime = performance.now();
    if (document.hidden) save();
    else { updateUI(); save(); speak('return'); }
  });
  window.addEventListener('focus', () => {
    syncClock();
    if (!document.hidden) { updateUI(); save(); }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    syncClock(); // bfcache restores without running the normal startup path.
    updateUI(); save();
  });
  window.addEventListener('pagehide', save);
  setInterval(() => {
    save(); // Timers may throttle; syncClock settles any missed wall time.
    if (!document.hidden) updateUI();
  }, 15000);

  function loop(now) {
    const dt = Math.min(.11, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    syncClock(); // Real timestamps, independent of throttled requestAnimationFrame.
    if (!options.paused) {
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
  $('speed-value').textContent = options.speed.toLocaleString('pt-BR') + '×';
  animationStage = '';
  bounds(); place(); updateUI(); speak('return');
  requestAnimationFrame(loop);
})();
