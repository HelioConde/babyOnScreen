'use strict';

/* Public web playground. Shares the same rules as the Windows companion. */
(() => {
  const E = window.BabyEngine;
  const stage = document.getElementById('stage');
  if (!E || !stage) return;

  const $ = id => document.getElementById(id);
  const baby = $('baby');
  const thought = $('thought');
  const profileKey = 'baby-on-screen-web-v1';
  const preferencesKey = 'baby-on-screen-web-preferences-v1';
  const scriptUrl = document.currentScript && document.currentScript.src;
  const needsLabels = {
    food: 'fome',
    energy: 'sono',
    hygiene: 'fralda',
    health: 'saúde'
  };
  const careNotes = {
    feed: 'Oba! A mamadeira estava deliciosa! 🍼',
    sleep: 'Que soneca gostosa! Zzz... 🌙',
    diaper: 'Fraldinha trocada. Agora estou limpinho! 🫧',
    medicine: 'Obrigadinho pelos cuidados! 💗'
  };
  const messages = {
    food: 'Quero uma mamadeira! 🍼',
    energy: 'Estou com soninho... 🌙',
    hygiene: 'Preciso de fralda limpa! 🧷',
    health: 'Preciso de carinho e cuidados! 💗'
  };

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === 'object' ? value : fallback;
    } catch {
      return fallback;
    }
  }

  let game = E.sanitize(read(profileKey, E.initial()));
  game = E.tick(game, Math.min(600, Math.max(0, (Date.now() - game.savedAt) / 1000)));
  const stored = read(preferencesKey, {});
  const preferences = {
    sound: stored.sound === true,
    paused: stored.paused === true,
    speed: E.clamp(Number(stored.speed) || 1, 0.5, 2)
  };
  $('sound').checked = preferences.sound;
  $('pause').checked = preferences.paused;
  $('speed').value = String(preferences.speed);

  let x = 120;
  let y = 165;
  let vx = 0.9;
  let vy = 0.45;
  let dragging = false;
  let pressX = 0;
  let pressY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let hovered = false;
  let moodKey = '';
  let busyUntil = 0;
  let direction = 'front';
  let animationIndex = 1;
  let lastFrameAt = 0;
  let lastTurnAt = 0;
  let lastUIAt = 0;
  let lastTime = performance.now();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function save() {
    game.savedAt = Date.now();
    try {
      localStorage.setItem(profileKey, JSON.stringify(game));
      localStorage.setItem(preferencesKey, JSON.stringify(preferences));
    } catch {
      // Storage may be disabled; the demo remains playable in memory.
    }
  }

  function sound(filename) {
    if (!preferences.sound || !scriptUrl) return;
    try {
      const audio = new Audio(new URL('../som/' + filename + '.mp3', scriptUrl).href);
      audio.volume = 0.24;
      audio.play().catch(() => {});
    } catch {
      // No audio support or asset was unavailable.
    }
  }

  function message(value) { $('feedback').textContent = value; }
  function bubble(value) { thought.textContent = value; }

  function updateUI() {
    for (const key of Object.keys(E.defaults)) {
      const number = Math.round(game.needs[key]);
      $(key).value = number;
      $(key + '-value').textContent = number + '%';
      $(key).setAttribute('aria-valuetext', number + '%');
    }
    $('level').textContent = 'NV. ' + String(E.level(game)).padStart(2, '0');
    $('care-count').textContent = game.careCount + (game.careCount === 1 ? ' cuidado' : ' cuidados');

    const key = E.concern(game);
    const veryLow = game.needs[key] < 35;
    const low = game.needs[key] < 55;
    $('mood-icon').textContent = veryLow ? '🥺' : low ? '😕' : '😊';
    $('mood-title').textContent = veryLow ? 'Preciso da sua ajuda!' : low ? 'Quero atenção!' : 'Está tudo ótimo!';
    $('mood-description').textContent = low ? 'Minha ' + needsLabels[key] + ' precisa de atenção.' : 'Obrigado por cuidar de mim 💕';
    if (!hovered && performance.now() > busyUntil && moodKey !== key) {
      bubble(low ? messages[key] : 'Oi! Vamos brincar? 💕');
      moodKey = key;
    }
  }

  function clampPosition() {
    x = E.clamp(x, 4, Math.max(4, stage.clientWidth - 58));
    y = E.clamp(y, 14, Math.max(14, stage.clientHeight - 65));
  }

  function draw() {
    baby.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    const bubbleX = E.clamp(x + 34, 8, Math.max(8, stage.clientWidth - 195));
    thought.style.transform = 'translate3d(' + Math.round(bubbleX) + 'px,' + Math.round(Math.max(10, y - 43)) + 'px,0)';
  }

  function care(action) {
    const result = E.care(game, action);
    if (!result.applied) {
      message('Essa necessidade já está satisfeita. Tente outro cuidado! ✨');
      return;
    }
    game = result.state;
    const sleeping = action === 'sleep';
    const feeding = action === 'feed';
    baby.classList.toggle('sleeping', sleeping);
    baby.classList.toggle('eating', feeding);
    busyUntil = performance.now() + (sleeping ? 2800 : 1700);
    bubble(sleeping ? 'Zzz... 😴' : feeding ? 'Nhac nhac! 🍼' : 'Obrigado! 💗');
    message(careNotes[action]);
    sound('rindo');
    updateUI();
    save();
  }

  document.querySelectorAll('[data-care]').forEach(button => {
    button.addEventListener('click', () => care(button.dataset.care));
  });

  function pet() {
    game.happiness = E.clamp(game.happiness + 4, 0, 100);
    bubble('Hehe! Mais carinho! 💕');
    message('Carinho recebido! Seu bebê adorou a atenção.');
    busyUntil = performance.now() + 1100;
    sound('feliz');
    save();
  }

  function pointWithinStage(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  baby.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const point = pointWithinStage(event);
    dragging = true;
    hovered = true;
    pressX = event.clientX;
    pressY = event.clientY;
    offsetX = point.x - x;
    offsetY = point.y - y;
    baby.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  baby.addEventListener('pointermove', event => {
    if (!dragging) return;
    const point = pointWithinStage(event);
    x = point.x - offsetX;
    y = point.y - offsetY;
    clampPosition();
    draw();
  });

  function releasePointer(event) {
    if (!dragging) return;
    dragging = false;
    hovered = false;
    try { baby.releasePointerCapture(event.pointerId); } catch { /* Already released. */ }
  }

  baby.addEventListener('pointerup', event => {
    if (!dragging) return;
    const distance = Math.hypot(event.clientX - pressX, event.clientY - pressY);
    releasePointer(event);
    if (distance < 8) pet();
  });
  baby.addEventListener('pointercancel', releasePointer);
  baby.addEventListener('pointerenter', () => {
    hovered = true;
    if (!dragging) bubble('Oiii! 👋');
  });
  baby.addEventListener('pointerleave', () => {
    if (!dragging) { hovered = false; moodKey = ''; }
  });

  stage.addEventListener('keydown', event => {
    const step = 12;
    switch (event.key) {
      case 'ArrowUp': y -= step; break;
      case 'ArrowDown': y += step; break;
      case 'ArrowLeft': x -= step; break;
      case 'ArrowRight': x += step; break;
      default: return;
    }
    event.preventDefault();
    clampPosition();
    draw();
  });
  baby.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pet();
    }
  });

  $('sound').addEventListener('change', event => { preferences.sound = event.target.checked; save(); });
  $('pause').addEventListener('change', event => {
    preferences.paused = event.target.checked;
    message(preferences.paused ? 'Movimentos pausados. Desmarque para continuar. ⏸' : 'Voltamos a brincar! 🎉');
    save();
  });
  $('speed').addEventListener('input', event => { preferences.speed = Number(event.target.value); save(); });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Quer apagar seu progresso e começar novamente?')) return;
    game = E.initial();
    save();
    moodKey = '';
    updateUI();
    message('Uma nova aventura começou! 🌈');
    bubble('Oi, humano! 👶');
  });

  window.addEventListener('resize', () => { clampPosition(); draw(); });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  setInterval(save, 15000);
  setInterval(() => {
    const date = new Date();
    $('clock').textContent = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, 30000);
  $('clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  function animate(now) {
    const dt = Math.max(0, Math.min(0.1, (now - lastTime) / 1000));
    lastTime = now;
    // Faster than the desktop companion so needs visibly evolve in a short web visit.
    if (!preferences.paused) {
      game = E.tick(game, dt * 6);
      if (!dragging && !hovered && !reduceMotion.matches && now >= busyUntil) {
        if (now - lastTurnAt > 2700) {
          const angle = Math.random() * 2 * Math.PI;
          vx = Math.cos(angle);
          vy = Math.sin(angle);
          lastTurnAt = now;
        }
        x += vx * 36 * preferences.speed * dt;
        y += vy * 36 * preferences.speed * dt;
        const right = stage.clientWidth - 58;
        const bottom = stage.clientHeight - 65;
        if (x < 4 || x > right) vx = -vx;
        if (y < 14 || y > bottom) vy = -vy;
        clampPosition();
      }
    }

    if (now - lastFrameAt >= 170) {
      animationIndex = (animationIndex + 1) % 3;
      lastFrameAt = now;
    }
    if (now > busyUntil) {
      baby.classList.remove('sleeping', 'eating');
      const next = Math.abs(vx) > Math.abs(vy)
        ? (vx >= 0 ? 'right' : 'left')
        : (vy >= 0 ? 'front' : 'back');
      if (next !== direction) {
        baby.classList.remove('front', 'left', 'right', 'back');
        baby.classList.add(next);
        direction = next;
      }
      baby.style.setProperty('--frame-x', '-' + (animationIndex * 54) + 'px');
    }
    draw();
    if (now - lastUIAt > 400) { updateUI(); lastUIAt = now; }
    requestAnimationFrame(animate);
  }
  clampPosition();
  draw();
  updateUI();
  requestAnimationFrame(animate);
})();
