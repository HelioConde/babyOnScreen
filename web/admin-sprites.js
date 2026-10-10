/* Read-only QA viewer for all imported assets and the live game manifest.
   No network API, admin token, or write access is required. */
(() => {
  'use strict';
  const catalog = window.BabySpriteAdminCatalog;
  const manifest = window.BabySpriteManifest || {};
  const cleaner = window.BabySpriteCleaner;
  const runtime = window.BabySpriteRuntime;
  if (!catalog || !runtime) return;
  const $ = id => document.getElementById(id);
  const els = {
    grid: $('sprite-grid'), empty: $('grid-empty'), search: $('search'), category: $('category'),
    phase: $('phase'), action: $('action'), direction: $('direction'),
    pager: $('page-info'), previousPage: $('page-prev'), nextPage: $('page-next'),
    result: $('result-count'), resultHint: $('result-hint'), viewAssets: $('view-assets'),
    viewAnimations: $('view-animations'), title: $('viewer-title'),
    subtitle: $('viewer-subtitle'), status: $('load-status'), preview: $('preview'),
    previewStage: $('preview-stage'), frameLabel: $('frame-label'), frames: $('frames'),
    framesCount: $('frames-count'), metadata: $('viewer-meta'),
    previousFrame: $('prev-frame'), nextFrame: $('next-frame'),
    playPause: $('play-pause'), fps: $('fps'), fpsValue: $('fps-value'),
    scrub: $('frame-scrub'), checker: $('show-checker'), cleaned: $('show-cleaned'),
    flipped: $('flip-horizontal'), originalLink: $('open-file'), copy: $('copy-path')
  };
  const animations = catalog.animationsFromManifest(manifest);
  const PAGE_SIZE = 30;
  const cache = new Map();
  let mode = 'asset', page = 0, selected = null, selectedImages = null;
  let selectionId = 0, currentFrame = 0, isPlaying = true, lastAdvance = 0;
  let visibleAnimations = [], pageIndex = 0;

  $('asset-total').textContent = String(catalog.assets.length);
  $('animation-total').textContent = String(animations.length);
  $('category-total').textContent = String(catalog.categories.length);

  function addOptions(select, values) {
    for (const [value, label] of values) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
  }
  addOptions(els.category, catalog.categories.map(x => [x.id, x.title]));
  addOptions(els.phase, Object.entries(catalog.stages));
  addOptions(els.action, Object.entries(catalog.titles));
  addOptions(els.direction, Object.entries(catalog.directions));

  function assetList() { return mode === 'asset' ? catalog.assets : animations; }
  function frameCount(item) { return Math.max(1, item?.frames?.length || item?.files?.length || 1); }
  function entryPath(item, index = 0) {
    const frame = item?.frames?.[index] || null;
    const fileIndex = frame ? frame.imageIndex ?? 0 : index % item.files.length;
    const file = item.files[fileIndex] || item.files[0];
    return catalog.pathFor(item.category, file);
  }

  function loadOne(path, shouldClean) {
    const key = (shouldClean ? 'clean:' : 'raw:') + path;
    if (!cache.has(key)) {
      const promise = (async () => {
        if (shouldClean && cleaner) return cleaner.load(path);
        const img = new Image();
        img.src = path;
        await img.decode();
        return img;
      })();
      cache.set(key, promise);
      // A failed asset may become available after a future deployment; allow retry.
      promise.catch(() => { if (cache.get(key) === promise) cache.delete(key); });
    }
    return cache.get(key);
  }
  function loadFrames(item) {
    return Promise.all(item.files.map(file =>
      loadOne(catalog.pathFor(item.category, file), els.cleaned.checked)));
  }

  function draw(canvas, item, images, requestedFrame, mirror = false) {
    if (!canvas || !item || !images?.length) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const index = ((requestedFrame % frameCount(item)) + frameCount(item)) % frameCount(item);
    const frame = item.frames?.[index] || null;
    const sourceIndex = frame ? (frame.imageIndex ?? 0) : (index % images.length);
    const image = images[sourceIndex];
    if (!image) return false;
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    const sx = frame?.x ?? 0, sy = frame?.y ?? 0;
    const sw = frame?.w ?? w, sh = frame?.h ?? h;
    if (!(sw > 0 && sh > 0 && sx >= 0 && sy >= 0 && sx + sw <= w && sy + sh <= h)) return false;
    const scale = Math.min((canvas.width - 18) / sw, (canvas.height - 18) / sh);
    const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(Math.round(canvas.width / 2), Math.round(canvas.height / 2));
    ctx.scale(mirror ? -1 : 1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, -Math.round(dw / 2), -Math.round(dh / 2), dw, dh);
    ctx.restore();
    return true;
  }

  function filteredItems() {
    const q = els.search.value.toLocaleLowerCase('pt-BR').trim();
    return assetList().filter(item => {
      if (els.category.value && item.category !== els.category.value) return false;
      if (mode === 'animation') {
        if (els.phase.value && item.stage !== els.phase.value) return false;
        if (els.action.value && item.action !== els.action.value) return false;
        if (els.direction.value && item.direction !== els.direction.value) return false;
      }
      if (!q) return true;
      return [item.title, item.category, item.filename || '', ...item.files,
        item.stage || '', item.action || '', item.direction || '']
        .join(' ').toLocaleLowerCase('pt-BR').includes(q);
    });
  }

  function status(text, kind = '') {
    els.status.textContent = text;
    els.status.className = 'load-status' + (kind ? ' ' + kind : '');
  }
  function setPlaybackState() {
    els.playPause.textContent = isPlaying ? '⏸ Pausar' : '▶ Reproduzir';
    els.playPause.setAttribute('aria-label', isPlaying ? 'Pausar animação' : 'Reproduzir animação');
  }
  function setFrame(index) {
    if (!selected) return;
    currentFrame = ((index % frameCount(selected)) + frameCount(selected)) % frameCount(selected);
    els.frameLabel.textContent = 'Quadro ' + (currentFrame + 1) + ' / ' + frameCount(selected);
    els.scrub.value = String(currentFrame);
    for (const [n, child] of [...els.frames.children].entries())
      child.classList.toggle('active', n === currentFrame);
    if (selectedImages) {
      const ok = draw(els.preview, selected, selectedImages, currentFrame,
        !!selected.flipX !== !!els.flipped.checked);
      if (!ok) status('Recorte inválido', 'error');
    }
  }
  function metadata(key, value) {
    const box = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = key; dd.textContent = String(value);
    box.append(dt, dd);
    els.metadata.append(box);
  }

  async function inspect(item) {
    if (!item) {
      selected = null; selectedImages = null;
      els.title.textContent = 'Nenhum sprite selecionado';
      els.subtitle.textContent = 'Ajuste os filtros para escolher um arquivo.';
      els.preview.getContext('2d').clearRect(0, 0, 320, 320);
      els.frames.replaceChildren(); els.metadata.replaceChildren();
      els.frameLabel.textContent = 'Quadro 0 / 0'; status('Sem seleção'); return;
    }
    selected = item;
    selectedImages = null;
    const request = ++selectionId;
    currentFrame = 0; lastAdvance = 0;
    els.title.textContent = item.title;
    els.subtitle.textContent = item.kind === 'animation'
      ? 'Sequência real configurada no jogo'
      : 'Arquivo individual do pacote importado';
    els.preview.getContext('2d').clearRect(0, 0, 320, 320);
    els.frames.replaceChildren(); els.metadata.replaceChildren();
    els.framesCount.textContent = frameCount(item) + (frameCount(item) === 1 ? ' quadro' : ' quadros');
    els.scrub.max = String(frameCount(item) - 1);
    els.scrub.value = '0';
    els.fps.value = String(Math.min(24, Math.max(1, Math.round(item.fps || 1))));
    els.fpsValue.textContent = els.fps.value;
    els.flipped.checked = false;
    els.originalLink.href = entryPath(item);
    metadata('Categoria', catalog.categories.find(x => x.id === item.category)?.title || item.category);
    metadata('Tipo', item.kind === 'animation' ? 'Animação' : 'Arquivo');
    if (item.stage) metadata('Fase', catalog.stages[item.stage] || item.stage);
    if (item.action) metadata('Ação', catalog.titles[item.action] || item.action);
    if (item.direction) metadata('Direção', catalog.directions[item.direction] || item.direction);
    metadata('FPS original', item.fps || '—');
    metadata('Arquivos', item.files.length);
    metadata('Quadros', frameCount(item));
    metadata('Caminho', entryPath(item));
    status('Carregando...');
    setFrame(0);
    try {
      const images = await loadFrames(item);
      if (request !== selectionId) return;
      selectedImages = images;
      metadata('Resolução', images.map(i => (i.naturalWidth || i.width) + '×' + (i.naturalHeight || i.height)).join(' · '));
      if (!draw(els.preview, item, images, 0, !!item.flipX)) {
        status('Recorte inválido', 'error'); return;
      }
      status('Carregado', 'ready');
      els.frames.replaceChildren();
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < frameCount(item); i++) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'frame-button';
        button.setAttribute('aria-label', 'Ver quadro ' + (i + 1));
        const canvas = document.createElement('canvas');
        canvas.width = 76; canvas.height = 76;
        canvas.className = els.checker.checked ? 'frame-thumb checker' : 'frame-thumb';
        draw(canvas, item, images, i, !!item.flipX);
        const number = document.createElement('small');
        number.textContent = String(i + 1);
        button.append(canvas, number);
        button.addEventListener('click', () => { isPlaying = false; setPlaybackState(); setFrame(i); });
        if (i === 0) button.classList.add('active');
        fragment.append(button);
      }
      els.frames.append(fragment);
    } catch {
      if (request !== selectionId) return;
      status('Arquivo ausente ou inválido', 'error');
      els.frames.replaceChildren();
    }
  }

  function makeCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sprite-card' + (selected?.id === item.id ? ' active' : '');
    card.dataset.spriteId = item.id;
    const canvas = document.createElement('canvas');
    canvas.className = 'sprite-art' + (els.checker.checked ? ' checker' : '');
    canvas.width = 152; canvas.height = 152;
    const title = document.createElement('strong');
    title.className = 'card-name';
    title.textContent = item.kind === 'asset' ? item.filename : item.title;
    const info = document.createElement('small');
    info.textContent = item.kind === 'asset'
      ? (catalog.categories.find(x => x.id === item.category)?.title || item.category)
      : item.category + ' · ' + frameCount(item) + ' quadros · ' + item.fps + ' FPS';
    const tag = document.createElement('span');
    tag.className = 'card-kind';
    tag.textContent = item.files[0]?.endsWith('.webp') ? 'WEBP'
      : item.kind === 'animation' ? 'LOOP' : 'PNG';
    card.append(canvas, title, info, tag);
    card.addEventListener('click', () => {
      for (const el of els.grid.querySelectorAll('.sprite-card.active')) el.classList.remove('active');
      card.classList.add('active');
      inspect(item);
    });
    const currentPage = pageIndex;
    loadFrames(item).then(images => {
      if (pageIndex !== currentPage || !card.isConnected) return;
      if (!draw(canvas, item, images, 0, !!item.flipX)) {
        card.classList.add('card-error');
        info.textContent = 'Recorte inválido';
      } else if (item.kind === 'animation' && frameCount(item) > 1) {
        visibleAnimations.push({ card, canvas, item, images, lastFrame: -1 });
      }
    }).catch(() => {
      if (pageIndex !== currentPage || !card.isConnected) return;
      card.classList.add('card-error');
      info.textContent = 'Arquivo ausente / erro de leitura';
    });
    return card;
  }

  function renderGallery(keep = false) {
    pageIndex++;
    const items = filteredItems();
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, pages - 1);
    visibleAnimations = [];
    els.grid.replaceChildren();
    els.empty.hidden = !!items.length;
    els.result.textContent = items.length + (items.length === 1 ? ' resultado' : ' resultados');
    els.resultHint.textContent = mode === 'asset'
      ? 'Arquivos reais de todas as categorias'
      : 'Sequências registradas no manifesto do jogo';
    els.pager.textContent = (page + 1) + ' / ' + pages;
    els.previousPage.disabled = page === 0;
    els.nextPage.disabled = page >= pages - 1;
    const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    for (const item of visible) fragment.append(makeCard(item));
    els.grid.append(fragment);
    if (!keep || !selected || !items.some(x => x.id === selected.id)) {
      inspect(visible[0] || items[0] || null);
    } else {
      const active = [...els.grid.querySelectorAll('.sprite-card')].find(x => x.dataset.spriteId === selected.id);
      if (active) active.classList.add('active');
    }
  }

  function setMode(value) {
    if (!['asset', 'animation'].includes(value)) return;
    mode = value; page = 0;
    els.viewAssets.classList.toggle('active', value === 'asset');
    els.viewAnimations.classList.toggle('active', value === 'animation');
    els.viewAssets.setAttribute('aria-pressed', String(value === 'asset'));
    els.viewAnimations.setAttribute('aria-pressed', String(value === 'animation'));
    for (const el of [els.phase, els.action, els.direction]) {
      el.disabled = value === 'asset';
      if (value === 'asset') el.value = '';
    }
    renderGallery();
  }

  els.viewAssets.addEventListener('click', () => setMode('asset'));
  els.viewAnimations.addEventListener('click', () => setMode('animation'));
  for (const el of [els.search, els.category, els.phase, els.action, els.direction]) {
    el.addEventListener(el === els.search ? 'input' : 'change', () => { page = 0; renderGallery(); });
  }
  $('reset-filters').addEventListener('click', () => {
    els.search.value = '';
    for (const el of [els.category, els.phase, els.action, els.direction]) el.value = '';
    page = 0; renderGallery();
  });
  els.previousPage.addEventListener('click', () => {
    if (!page) return; page--; renderGallery(true);
  });
  els.nextPage.addEventListener('click', () => { page++; renderGallery(true); });
  els.playPause.addEventListener('click', () => {
    isPlaying = !isPlaying; lastAdvance = 0; setPlaybackState();
  });
  els.previousFrame.addEventListener('click', () => {
    isPlaying = false; setPlaybackState(); setFrame(currentFrame - 1);
  });
  els.nextFrame.addEventListener('click', () => {
    isPlaying = false; setPlaybackState(); setFrame(currentFrame + 1);
  });
  els.scrub.addEventListener('input', () => {
    isPlaying = false; setPlaybackState(); setFrame(Number(els.scrub.value));
  });
  els.fps.addEventListener('input', () => {
    els.fpsValue.textContent = els.fps.value; lastAdvance = 0;
  });
  els.checker.addEventListener('change', () => {
    els.previewStage.classList.toggle('checker', els.checker.checked);
    for (const canvas of els.grid.querySelectorAll('.sprite-art'))
      canvas.classList.toggle('checker', els.checker.checked);
    for (const canvas of els.frames.querySelectorAll('.frame-thumb'))
      canvas.classList.toggle('checker', els.checker.checked);
  });
  els.cleaned.addEventListener('change', () => {
    // Force load from the alternate clean/raw cache for previews and thumbnails.
    renderGallery(false);
  });
  els.flipped.addEventListener('change', () => setFrame(currentFrame));
  els.copy.addEventListener('click', async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(entryPath(selected));
      els.copy.textContent = '✓ Caminho copiado';
      els.copy.blur();
    } catch {
      els.copy.textContent = 'Abra o arquivo pelo link';
    }
  });

  function loop(now) {
    if (selected && selectedImages && isPlaying && frameCount(selected) > 1) {
      const interval = 1000 / Math.max(1, Number(els.fps.value));
      if (lastAdvance === 0) lastAdvance = now;
      if (now - lastAdvance >= interval) {
        const steps = Math.max(1, Math.floor((now - lastAdvance) / interval));
        lastAdvance = now;
        setFrame(currentFrame + steps);
      }
    } else {
      lastAdvance = now;
    }
    // Animate each visible manifest animation in the gallery at its own FPS.
    for (const card of visibleAnimations) {
      if (!card.card.isConnected) continue;
      const idx = Math.floor(now * Math.max(1, card.item.fps) / 1000) % frameCount(card.item);
      if (idx !== card.lastFrame) {
        draw(card.canvas, card.item, card.images, idx, !!card.item.flipX);
        card.lastFrame = idx;
      }
    }
    requestAnimationFrame(loop);
  }

  setPlaybackState();
  setMode('asset');
  requestAnimationFrame(loop);
})();