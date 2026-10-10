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
  const names = { food: 'alimentação', energy: 'energia', hygiene: 'higiene', health: 'saúde' };
  const source = document.currentScript ? document.currentScript.src : window.location.href;
  const lessons = {
    reading: [
      { question: 'Com qual letra começa BOLA?', answers: ['B', 'D', 'P'], correct: 0 },
      { question: 'Com qual letra começa CASA?', answers: ['C', 'S', 'A'], correct: 0 },
      { question: 'Qual palavra combina com 📚?', answers: ['Livro', 'Bola', 'Água'], correct: 0 }
    ],
    numbers: [
      { question: 'Quanto é 2 + 3?', answers: ['4', '5', '6'], correct: 1 },
      { question: 'Quanto é 1 + 4?', answers: ['3', '5', '7'], correct: 1 },
      { question: 'Quanto é 6 - 2?', answers: ['4', '6', '3'], correct: 0 }
    ],
    arts: [
      { question: 'Qual cor aparece quando misturamos azul e amarelo?', answers: ['Verde', 'Vermelho', 'Rosa'], correct: 0 },
      { question: 'Qual material usamos para pintar?', answers: ['Pincel', 'Garfo', 'Copo'], correct: 0 },
      { question: 'Que forma tem três lados?', answers: ['Círculo', 'Triângulo', 'Quadrado'], correct: 1 }
    ]
  };
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
  let game = E.sanitize(read(gameKey, E.initial()));
  // Resume existing save without granting free progress while the application is closed.
  game = E.tick(game, Math.min(180, Math.max(0, (Date.now() - game.savedAt) / 1000)), { active: false });
  const stored = read(optionsKey, {});
  const options = {
    sound: stored.sound !== false, paused: stored.paused === true,
    speed: E.clamp(Number(stored.speed) || 1, .5, 2)
  };
  let x = innerWidth * .3, y = innerHeight * .44, dx = .8, dy = .6, dir = 'front';
  let frame = 1, lastTime = performance.now(), lastFrame = 0, lastDraw = 0, nextTurn = 0;
  let nextSpeech = 8000, lastCry = 0, busyUntil = 0, draggingBaby = false;
  let pressX = 0, pressY = 0, offsetX = 0, offsetY = 0;
  let draggingItem = null, selectedItem = null, lastStage = '', lastUrgency = 'calm';
  let schoolQuestion = null, schoolVisible = false, lastMemoryCount = -1;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sounds = new Map();

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
  function panelVisible(on) {
    panel.hidden = !on; publishRegions();
  }
  $('launcher').addEventListener('click', () => panelVisible(panel.hidden));
  $('close-panel').addEventListener('click', () => panelVisible(false));
  $('hide').addEventListener('click', () => { save(); desktop.hide(); });
  const bounds = () => {
    x = E.clamp(x, 3, Math.max(3, innerWidth - 68));
    y = E.clamp(y, 15, Math.max(15, innerHeight - 80));
  };
  function place() {
    baby.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    thought.style.transform = 'translate3d(' + Math.round(E.clamp(x + 51, 4, Math.max(4, innerWidth - 200))) + 'px,' + Math.round(Math.max(4, y - 45)) + 'px,0)';
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
    baby.classList.remove('sleeping', 'eating');
    if (name === 'sleep') baby.classList.add('sleeping');
    if (name === 'feed') baby.classList.add('eating');
    voice('rindo'); speak(name === 'toy' ? 'play' : 'care');
    feedback(success[name]);
    if (previous !== E.ageStage(game).id) {
      voice('feliz'); feedback('🌟 Nova fase: ' + E.ageStage(game).title + '! ' + success[name]);
    }
    if (result.achievements?.length) feedback('🌟 ' + result.achievements.join(' · ') + ' — ' + success[name]);
    render(); save();
  }
  function pet() {
    if (selectedItem) { interact(selectedItem); return; }
    game.happiness = E.clamp(game.happiness + 2, 0, 100);
    speak('happy'); voice('feliz'); busyUntil = performance.now() + 800;
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
  baby.addEventListener('pointerup', e => releaseBaby(e, false));
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
  $('sound').addEventListener('change', e => { options.sound = e.target.checked; save(); });
  $('pause').addEventListener('change', e => { options.paused = e.target.checked; save(); });
  $('speed').addEventListener('input', e => { options.speed = Number(e.target.value); save(); });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Apagar o progresso e iniciar outra história?')) return;
    game = E.initial(); lastStage = ''; lastMemoryCount = -1;
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
      render(); speak('return'); save();
      feedback('Progresso importado! Bem-vinda de volta, amiguinha.');
    } catch (error) { feedback('Erro ao importar: ' + error.message); }
  });
  function render() {
    const age = E.ageStage(game);
    if (age.id !== lastStage) {
      lastStage = age.id;
      baby.classList.remove('newborn', 'baby-stage', 'toddler', 'child');
      baby.classList.add(age.id === 'baby' ? 'baby-stage' : age.id);
    }
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
    const urge = E.urgency(game);
    if (urge.level !== lastUrgency) {
      lastUrgency = urge.level;
      if (urge.level === 'crying') { speak('cry'); voice('chorando'); lastCry = performance.now(); }
      else if (urge.level === 'asking') speak(urge.need);
      else speak('idle');
    }
    baby.classList.toggle('crying', urge.level === 'crying');
    $('mood-icon').textContent = urge.level === 'crying' ? '😢' : urge.level === 'asking' ? '🥺' : '😊';
    $('mood-title').textContent = urge.level === 'crying' ? 'Preciso de ajuda!' : urge.level === 'asking' ? 'Quero sua atenção' : 'Estou feliz!';
    $('mood-description').textContent = urge.level === 'calm' ? age.description :
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
    $('skills').textContent = 'Brincadeiras ' + game.skills.play + ' · Vínculo ' + game.skills.bond +
      ' · Criatividade ' + game.skills.creativity + ' · Escola ' + game.schoolVisits + ' aulas';
    if (lastMemoryCount !== game.memories.length) {
      lastMemoryCount = game.memories.length;
      $('memories').replaceChildren();
      game.memories.slice().reverse().forEach(entry => {
        const span = document.createElement('span');
        span.textContent = '✦ ' + entry; $('memories').append(span);
      });
    }
  }
  desktop.version().then(version => {
    if (version) $('version').textContent = 'Versão ' + version;
  }).catch(() => {});
  window.addEventListener('resize', () => { bounds(); place(); publishRegions(); });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); if (document.hidden) save(); });
  window.addEventListener('beforeunload', save);
  setInterval(save, 15000);
  setInterval(publishRegions, 120);
  function animate(now) {
    const dt = Math.min(.12, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!options.paused) {
      game = E.tick(game, dt);
      if (!draggingBaby && !draggingItem && now > busyUntil && !reduced.matches) {
        if (now > nextTurn) {
          const direction = Math.random() * Math.PI * 2;
          dx = Math.cos(direction); dy = Math.sin(direction);
          nextTurn = now + 3000 + Math.random() * 2000;
        }
        x += dx * dt * 30 * options.speed; y += dy * dt * 30 * options.speed;
        if (x <= 3 || x >= innerWidth - 68) dx *= -1;
        if (y <= 15 || y >= innerHeight - 80) dy *= -1;
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
    if (now - lastDraw > 750) { render(); lastDraw = now; }
    requestAnimationFrame(animate);
  }
  render(); bounds(); place(); panelVisible(false); speak('return');
  requestAnimationFrame(animate);
})();
