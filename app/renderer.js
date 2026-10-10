'use strict';
(() => {
  const E = window.BabyEngine;
  const api = window.babyDesktop;
  if (!E || !api) return;
  const $ = id => document.getElementById(id);
  const baby = $('baby'), bubble = $('thought'), panel = $('panel');
  const storageKey = 'baby-on-screen-v1';
  const settingsKey = 'baby-on-screen-options-v1';
  const labels = { food: 'fome', energy: 'sono', hygiene: 'fralda limpa', health: 'cuidados' };
  const messages = { food: 'Estou com fome! 🍼', energy: 'Quero dormir! 🌙', hygiene: 'Preciso trocar a fralda! 🧷', health: 'Preciso de cuidados! 💗' };
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  let game = E.sanitize(read(storageKey, E.initial()));
  const offlineSeconds = Math.max(0, Math.min(600, (Date.now() - game.savedAt) / 1000));
  game = E.tick(game, offlineSeconds);
  let options = Object.assign({ sound: true, paused: false, speed: 1 }, read(settingsKey, {}));
  options.sound = options.sound !== false;
  options.paused = options.paused === true;
  options.speed = E.clamp(Number(options.speed) || 1, 0.5, 2);
  $('sound').checked = options.sound;
  $('pause').checked = options.paused;
  $('speed').value = String(options.speed);
  let x = Math.max(28, Math.min(window.innerWidth - 90, window.innerWidth * .24));
  let y = Math.max(80, Math.min(window.innerHeight - 105, window.innerHeight * .5));
  let dx = 1, dy = .65, direction = 'front';
  let frame = 1, lastFrame = 0, lastTurn = 0, lastDraw = 0, lastTime = performance.now();
  let busyUntil = 0, dragging = false, hovered = false, dragOffsetX = 0, dragOffsetY = 0;
  let lastBubble = '';
  function save() {
    game.savedAt = Date.now();
    try {
      localStorage.setItem(storageKey, JSON.stringify(game));
      localStorage.setItem(settingsKey, JSON.stringify(options));
    } catch { /* The companion still works if storage is restricted. */ }
  }
  function playSound(file) {
    if (!options.sound) return;
    const audio = new Audio('../som/' + file + '.mp3');
    audio.volume = .23;
    audio.play().catch(() => {});
  }
  function feedback(text) { $('feedback').textContent = text; }
  function setPanel(open) { panel.hidden = !open; publishRegions(); }
  $('launcher').addEventListener('click', () => setPanel(panel.hidden));
  $('close-panel').addEventListener('click', () => setPanel(false));
  $('hide').addEventListener('click', () => { save(); api.hide(); });
  $('reset').addEventListener('click', () => {
    if (!window.confirm('Recomeçar e apagar todo o progresso do bebê?')) return;
    game = E.initial();
    feedback('Seu bebê começou uma nova aventura!');
    refresh();
    save();
  });
  $('sound').addEventListener('change', e => { options.sound = e.target.checked; save(); });
  $('pause').addEventListener('change', e => { options.paused = e.target.checked; save(); });
  $('speed').addEventListener('input', e => { options.speed = Number(e.target.value); save(); });
  const careMessages = {
    feed: 'Mamadeira entregue! O bebê está alimentado. 🍼',
    sleep: 'Uma boa soneca! Energia recuperada. 🌙',
    diaper: 'Fralda trocada! Tudo limpinho. 🫧',
    medicine: 'Cuidados concluídos! Saúde melhorando. 💗'
  };
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const result = E.care(game, action);
      game = result.state;
      if (!result.applied) { feedback('Essa necessidade já está satisfeita. Tente outra!'); return; }
      busyUntil = performance.now() + (action === 'sleep' ? 3500 : 1200);
      baby.classList.toggle('sleeping', action === 'sleep');
      baby.classList.toggle('eating', action === 'feed');
      playSound('rindo');
      feedback(careMessages[action]);
      refresh();
      save();
    });
  });
  function mood() {
    const key = E.concern(game);
    const low = game.needs[key] < 45;
    $('mood-icon').textContent = low ? '🥺' : '😊';
    $('mood-label').textContent = low ? 'Preciso de atenção!' : 'Estou feliz!';
    $('mood-detail').textContent = low ? messages[key] : 'Vamos brincar e crescer juntos!';
    bubble.textContent = low ? messages[key] : (hovered ? 'Olá! Vamos brincar? ✨' : '♪');
    if (low && lastBubble !== key) lastBubble = key;
    if (!low) lastBubble = '';
  }
  function refresh() {
    for (const key of Object.keys(E.defaults)) {
      const value = Math.round(game.needs[key]);
      $(key).value = value;
      $(key + '-val').textContent = value + '%';
    }
    $('level').textContent = 'Nível ' + E.level(game) + ' · ' + game.careCount + ' cuidados';
    mood();
  }
  function bounds() {
    x = Math.max(3, Math.min(window.innerWidth - 50, x));
    y = Math.max(24, Math.min(window.innerHeight - 54, y));
  }
  function position() {
    baby.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    bubble.style.transform = 'translate3d(' + Math.round(Math.min(window.innerWidth - 170, x + 33)) + 'px,' + Math.round(Math.max(8, y - 52)) + 'px,0)';
  }
  function region(element, margin) {
    const r = element.getBoundingClientRect();
    return { x: r.left - margin, y: r.top - margin, width: r.width + margin * 2, height: r.height + margin * 2 };
  }
  function publishRegions() {
    api.setHitRegions([region(baby, 8), region($('launcher'), 3)].concat(panel.hidden ? [] : [region(panel, 2)]));
  }
  baby.addEventListener('pointerenter', () => { hovered = true; mood(); });
  baby.addEventListener('pointerleave', () => { hovered = false; mood(); });
  baby.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    dragging = true;
    dragOffsetX = event.clientX - x;
    dragOffsetY = event.clientY - y;
    baby.setPointerCapture(event.pointerId);
    api.setDragging(true);
    event.preventDefault();
  });
  baby.addEventListener('pointermove', event => {
    if (!dragging) return;
    x = event.clientX - dragOffsetX;
    y = event.clientY - dragOffsetY;
    bounds(); position(); publishRegions();
  });
  function releasePointer(event) {
    if (!dragging) return;
    dragging = false;
    api.setDragging(false);
    try { baby.releasePointerCapture(event.pointerId); } catch { /* Already released */ }
  }
  baby.addEventListener('pointerup', event => {
    if (!dragging) return;
    const moved = Math.hypot(event.clientX - (x + dragOffsetX), event.clientY - (y + dragOffsetY));
    releasePointer(event);
    if (moved < 6) setPanel(true);
  });
  baby.addEventListener('pointercancel', releasePointer);
  window.addEventListener('blur', () => { if (dragging) { dragging = false; api.setDragging(false); } });
  window.addEventListener('resize', () => { bounds(); position(); publishRegions(); });
  function animate(time) {
    const dt = Math.max(0, Math.min(.2, (time - lastTime) / 1000));
    lastTime = time;
    if (!options.paused) {
      game = E.tick(game, dt);
      if (!dragging && !hovered && time > busyUntil) {
        if (time - lastTurn > 2600 + Math.random() * 1200) {
          const heading = Math.random() * Math.PI * 2;
          dx = Math.cos(heading); dy = Math.sin(heading);
          lastTurn = time;
        }
        x += dx * dt * 27 * options.speed;
        y += dy * dt * 27 * options.speed;
        if (x < 4 || x > innerWidth - 52) dx *= -1;
        if (y < 26 || y > innerHeight - 56) dy *= -1;
        bounds();
      }
    }
    if (time - lastFrame > 190) {
      frame = (frame + 1) % 3;
      lastFrame = time;
    }
    if (time >= busyUntil) {
      baby.classList.remove('sleeping', 'eating');
      const next = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'front' : 'back');
      if (direction !== next) { baby.classList.remove('front','left','right','back'); direction = next; baby.classList.add(direction); }
      baby.style.setProperty('--frame-x', '-' + frame * 54 + 'px');
    }
    position();
    if (time - lastDraw > 500) { refresh(); lastDraw = time; }
    requestAnimationFrame(animate);
  }
  api.version().then(version => { if (version) $('version').textContent = 'Versão ' + version; }).catch(() => {});
  refresh(); bounds(); position(); setPanel(true);
  setInterval(publishRegions, 95);
  setInterval(save, 15000);
  window.addEventListener('beforeunload', save);
  requestAnimationFrame(animate);
})();
