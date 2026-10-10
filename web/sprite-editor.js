/* Manual sprite retouching in the public QA laboratory.
   Edits remain in this browser's IndexedDB until the user exports and uploads a PNG.
   No GitHub credentials or background publishing are used. */
(function(global) {
  "use strict";
  const $ = id => document.getElementById(id);
  const modal = $("sprite-editor");
  const canvas = $("editor-canvas");
  if (!modal || !canvas) return;

  const controls = {
    title: $("editor-title"), subtitle: $("editor-subtitle"), close: $("editor-close"),
    status: $("editor-save-status"), viewport: $("editor-viewport"),
    zoom: $("editor-zoom"), zoomDisplay: $("editor-zoom-label"),
    brush: $("editor-brush"), brushDisplay: $("editor-brush-size"),
    original: $("editor-before"), checker: $("editor-checker"),
    undo: $("editor-undo"), redo: $("editor-redo"),
    save: $("editor-save"), download: $("editor-download"),
    reset: $("editor-reset"), info: $("editor-info"),
    zoomIn: $("editor-zoom-in"), zoomOut: $("editor-zoom-out")
  };
  const display = canvas.getContext("2d");
  const source = document.createElement("canvas");
  const target = document.createElement("canvas");
  let path = "", filename = "", token = 0, ready = false, tool = "erase", zoom = 2;
  let region = null, drawing = false, previous = null, rectangleStart = null;
  let panStart = null, history = [], future = [], pendingChange = false, lastMessage = "";
  const LIMIT = 24;
  const storeName = "baby-on-screen-sprite-edits-v1";
  let database;

  function openDatabase() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error("IndexedDB não disponível")); return; }
      const request = indexedDB.open(storeName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("sprites"))
          request.result.createObjectStore("sprites", { keyPath: "path" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o armazenamento"));
      request.onblocked = () => reject(new Error("Armazenamento bloqueado"));
    });
    return database;
  }
  async function listDrafts() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sprites", "readonly");
      const req = tx.objectStore("sprites").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error("Falha ao listar edições"));
    });
  }

  async function getDraft(key) {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("sprites", "readonly");
        const req = tx.objectStore("sprites").get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  }
  async function putDraft(key, blob, width, height) {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("sprites", "readwrite");
      tx.objectStore("sprites").put({ path: key, blob, width, height, updatedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Falha ao salvar rascunho"));
      tx.onabort = () => reject(tx.error || new Error("Salvamento interrompido"));
    });
  }
  async function deleteDraft(key) {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("sprites", "readwrite");
      tx.objectStore("sprites").delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Falha ao remover rascunho"));
    });
  }
  function canvasBlob(c) {
    return new Promise((resolve, reject) => c.toBlob(blob =>
      blob ? resolve(blob) : reject(new Error("Não foi possível criar o PNG")), "image/png"));
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Imagem indisponível"));
      image.src = url;
    });
  }
  function message(text) {
    lastMessage = text;
    controls.status.textContent = text;
  }
  function isOpen() { return !modal.hidden; }
  function setTool(next) {
    if (!["erase", "restore", "rect", "move"].includes(next)) return;
    tool = next;
    canvas.dataset.tool = next;
    for (const button of modal.querySelectorAll("[data-edit-tool]")) {
      button.classList.toggle("active", button.dataset.editTool === tool);
      button.setAttribute("aria-pressed", String(button.dataset.editTool === tool));
    }
  }
  function updateHistory() {
    controls.undo.disabled = !history.length;
    controls.redo.disabled = !future.length;
  }
  function recordHistory() {
    if (!ready) return;
    history.push(target.getContext("2d").getImageData(0, 0, target.width, target.height));
    if (history.length > LIMIT) history.shift();
    future.length = 0;
    updateHistory();
  }
  function originalPixels() {
    return source.getContext("2d", { willReadFrequently: true });
  }
  function workPixels() {
    return target.getContext("2d", { willReadFrequently: true });
  }
  function limitToRegion(x, y) {
    if (!region) return { x, y };
    return {
      x: Math.max(region.x, Math.min(region.x + region.w - 1, x)),
      y: Math.max(region.y, Math.min(region.y + region.h - 1, y))
    };
  }
  function setZoom(value) {
    zoom = Math.max(1, Math.min(6, Number(value) || 1));
    controls.zoom.value = String(zoom);
    controls.zoomDisplay.textContent = zoom + "×";
    canvas.style.width = Math.max(1, target.width * zoom) + "px";
    canvas.style.height = Math.max(1, target.height * zoom) + "px";
  }
  function show() {
    if (!ready) return;
    const w = target.width, h = target.height;
    display.clearRect(0, 0, w, h);
    display.imageSmoothingEnabled = false;
    display.drawImage(controls.original.checked ? source : target, 0, 0);
    if (region) {
      display.save();
      display.lineWidth = Math.max(1, Math.min(w, h) / 225);
      display.strokeStyle = "#a855e2";
      display.setLineDash([4, 3]);
      display.strokeRect(region.x + .5, region.y + .5, region.w - 1, region.h - 1);
      display.restore();
    }
    if (rectangleStart && previous && drawing && tool === "rect") {
      display.save();
      display.lineWidth = Math.max(1, Math.min(w, h) / 225);
      display.strokeStyle = "#fb4170";
      display.fillStyle = "#fb41703d";
      const x = Math.min(rectangleStart.x, previous.x), y = Math.min(rectangleStart.y, previous.y);
      const rw = Math.abs(previous.x - rectangleStart.x) + 1;
      const rh = Math.abs(previous.y - rectangleStart.y) + 1;
      display.fillRect(x, y, rw, rh);
      display.strokeRect(x + .5, y + .5, Math.max(1, rw - 1), Math.max(1, rh - 1));
      display.restore();
    }
  }
  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * canvas.width / rect.width);
    const y = Math.floor((event.clientY - rect.top) * canvas.height / rect.height);
    return limitToRegion(
      Math.max(0, Math.min(canvas.width - 1, x)),
      Math.max(0, Math.min(canvas.height - 1, y))
    );
  }
  function applyAt(x, y) {
    const brush = Math.max(1, Number(controls.brush.value) || 1);
    const left = Math.floor(x - brush / 2), top = Math.floor(y - brush / 2);
    const ctx = workPixels();
    ctx.save();
    if (region) {
      ctx.beginPath();
      ctx.rect(region.x, region.y, region.w, region.h);
      ctx.clip();
    }
    if (tool === "erase") ctx.clearRect(left, top, brush, brush);
    if (tool === "restore") {
      ctx.beginPath();
      ctx.rect(left, top, brush, brush);
      ctx.clip();
      // Restore only the original pixels in this brush area; hair is never inferred.
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(source, 0, 0);
    }
    ctx.restore();
    pendingChange = true;
  }
  function lineTo(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, Number(controls.brush.value) * .32)));
    for (let k = 0; k <= steps; k++) applyAt(
      Math.round(a.x + dx * k / steps), Math.round(a.y + dy * k / steps));
    show();
  }
  function begin(event) {
    if (!ready || controls.original.checked || event.button !== 0) return;
    const pos = pointerPosition(event);
    drawing = true;
    previous = pos;
    pendingChange = false;
    if (tool === "move") {
      panStart = {
        x: event.clientX, y: event.clientY,
        left: controls.viewport.scrollLeft, top: controls.viewport.scrollTop
      };
    } else {
      recordHistory();
      if (tool === "rect") rectangleStart = pos;
      else lineTo(pos, pos);
    }
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function move(event) {
    if (!drawing) return;
    const pos = pointerPosition(event);
    if (tool === "move" && panStart) {
      controls.viewport.scrollLeft = panStart.left + panStart.x - event.clientX;
      controls.viewport.scrollTop = panStart.top + panStart.y - event.clientY;
    } else if (tool === "rect") {
      previous = pos; show();
    } else if (previous) {
      lineTo(previous, pos);
      previous = pos;
    }
    event.preventDefault();
  }
  async function end(event) {
    if (!drawing) return;
    const pos = pointerPosition(event);
    if (tool === "rect" && rectangleStart) {
      const x = Math.min(rectangleStart.x, pos.x);
      const y = Math.min(rectangleStart.y, pos.y);
      const w = Math.abs(rectangleStart.x - pos.x) + 1;
      const h = Math.abs(rectangleStart.y - pos.y) + 1;
      const ctx = workPixels();
      ctx.save();
      if (region) { ctx.beginPath(); ctx.rect(region.x, region.y, region.w, region.h); ctx.clip(); }
      ctx.clearRect(x, y, w, h);
      ctx.restore();
      pendingChange = true;
    }
    if (tool === "move") {
      // Panning does not generate an undo step.
    } else if (!pendingChange && history.length) {
      history.pop();
      updateHistory();
    }
    drawing = false; rectangleStart = null; previous = null; panStart = null;
    show();
    if (pendingChange) void saveDraft();
    pendingChange = false;
  }
  async function saveDraft() {
    if (!ready || !path) return;
    const key = path, w = target.width, h = target.height;
    try {
      const blob = await canvasBlob(target);
      await putDraft(key, blob, w, h);
      if (key === path) message("✓ Alterações salvas neste navegador");
      global.dispatchEvent(new CustomEvent("baby:sprite-edited", {
        detail: { path: key, blob }
      }));
    } catch {
      if (key === path) message("⚠ Salvar localmente falhou. Use “Baixar PNG”.");
    }
  }
  async function edit(targetInfo) {
    const request = ++token;
    ready = false;
    drawing = false;
    history = []; future = [];
    updateHistory();
    if (!targetInfo?.path || !/^..\/assets\/sprites\/generated\/[a-z]+\/(?:element_\d{3}\.png|sheet\.png|crawl_sheet\.webp)$/.test(targetInfo.path)) return;
    path = targetInfo.path;
    filename = path.split("/").pop();
    region = targetInfo.frame && Number.isFinite(targetInfo.frame.x) &&
      Number.isFinite(targetInfo.frame.y) ? targetInfo.frame : null;
    controls.title.textContent = "Editar sprite";
    controls.subtitle.textContent = path.replace("../", "");
    controls.original.checked = false;
    controls.checker.checked = true;
    controls.viewport.classList.add("checker");
    controls.brush.value = "5";
    controls.brushDisplay.textContent = "5 px";
    controls.info.textContent = filename.endsWith(".webp")
      ? "O atlas está em WebP. A exportação será PNG; para substituí-lo no jogo, adapte o nome do arquivo no manifesto."
      : "O PNG exportado mantém as dimensões originais. Substitua o arquivo com o mesmo nome no GitHub para publicar.";
    setTool("erase");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    controls.close.focus();
    message("Carregando PNG original...");
    try {
      const image = await loadImage(path);
      const w = image.naturalWidth, h = image.naturalHeight;
      if (!(w > 0 && h > 0) || w * h > 4000000) throw new Error("Arquivo muito grande");
      if (request !== token) return;
      source.width = target.width = canvas.width = w;
      source.height = target.height = canvas.height = h;
      originalPixels().clearRect(0, 0, w, h);
      originalPixels().drawImage(image, 0, 0);
      workPixels().clearRect(0, 0, w, h);
      workPixels().drawImage(source, 0, 0);
      if (region && (region.x < 0 || region.y < 0 || region.x + region.w > w || region.y + region.h > h)) region = null;
      const draft = await getDraft(path);
      if (request !== token) return;
      if (draft?.blob && draft.width === w && draft.height === h) {
        const fileUrl = URL.createObjectURL(draft.blob);
        try {
          const previousDraft = await loadImage(fileUrl);
          if (request !== token) return;
          workPixels().clearRect(0, 0, w, h);
          workPixels().drawImage(previousDraft, 0, 0);
        } finally { URL.revokeObjectURL(fileUrl); }
        message("✓ Rascunho restaurado deste navegador");
      } else {
        message("Pronto. Apague resíduos sem afetar o arquivo original.");
      }
      ready = true;
      setZoom(Math.max(1, Math.min(3, w <= 256 && h <= 256 ? 2 : 1)));
      show();
    } catch {
      if (request === token) message("Não foi possível abrir esse sprite. Confira o arquivo.");
    }
  }
  async function undo() {
    if (!ready || !history.length) return;
    future.push(workPixels().getImageData(0, 0, target.width, target.height));
    workPixels().putImageData(history.pop(), 0, 0);
    updateHistory(); show(); await saveDraft();
  }
  async function redo() {
    if (!ready || !future.length) return;
    history.push(workPixels().getImageData(0, 0, target.width, target.height));
    workPixels().putImageData(future.pop(), 0, 0);
    updateHistory(); show(); await saveDraft();
  }
  async function download() {
    if (!ready) return;
    try {
      const blob = await canvasBlob(target);
      const name = filename.endsWith(".png") ? filename : filename.replace(/\.[^.]+$/, "") + "_editado.png";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      message("✓ PNG exportado. Envie-o ao mesmo caminho no GitHub para aplicar no jogo.");
    } catch { message("Não foi possível exportar o PNG."); }
  }
  async function reset() {
    if (!ready || !global.confirm("Descartar as edições deste sprite e voltar ao original?")) return;
    const current = path;
    workPixels().clearRect(0, 0, target.width, target.height);
    workPixels().drawImage(source, 0, 0);
    history = []; future = [];
    updateHistory(); show();
    try {
      await deleteDraft(current);
      message("Imagem original restaurada; rascunho local apagado.");
      global.dispatchEvent(new CustomEvent("baby:sprite-edited", {
        detail: { path: current, reset: true }
      }));
    } catch { message("Imagem original restaurada; não foi possível apagar o rascunho armazenado."); }
  }
  async function close() {
    ++token; ready = false; drawing = false;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  async function exportAll() {
    const status = $("export-status");
    const button = $("export-edits");
    if (!global.BabySpriteZip) throw new Error("Exportador ZIP não carregado");
    button.disabled = true;
    try {
      status.textContent = "Lendo todas as edições salvas…";
      const drafts = await listDrafts();
      if (!drafts.length) {
        status.textContent = "Ainda não há sprites editados salvos neste navegador.";
        return;
      }
      const files = [], changes = [];
      const ordered = drafts.slice().sort((a, b) => String(a.path).localeCompare(String(b.path)));
      for (const draft of ordered) {
        if (!draft?.blob || typeof draft.path !== "string")
          throw new Error("Rascunho incompleto: confira o armazenamento");
        const { sourcePath, exportPath, requiresManifestUpdate } = global.BabySpriteZip.entryInfo(draft.path);
        if (draft.blob.type !== "image/png")
          throw new Error("A edição precisa estar salva como PNG: " + sourcePath);
        const pngHead = new Uint8Array(await draft.blob.slice(0, 8).arrayBuffer());
        if (pngHead.length < 8 || pngHead.some((b, i) => b !== [137,80,78,71,13,10,26,10][i]))
          throw new Error("PNG inválido no rascunho: " + sourcePath);
        files.push({ name: exportPath, blob: draft.blob });
        changes.push({
          original: sourcePath, file: exportPath, width: draft.width, height: draft.height,
          savedAt: new Date(draft.updatedAt || Date.now()).toISOString(),
          needsManifestChange: requiresManifestUpdate
        });
      }
      const manifest = {
        format: "baby-on-screen-sprite-edits-v1",
        exportedAt: new Date().toISOString(),
        total: changes.length,
        note: "Edições locais do navegador. PNGs preservam os caminhos do GitHub; arquivos WebP editados precisam de ajuste no manifesto.",
        changes
      };
      files.push({ name: "sprite-edits-manifest.json", text: JSON.stringify(manifest, null, 2) + "\n" });
      status.textContent = "Montando " + drafts.length + " PNGs em um único ZIP…";
      const archive = await global.BabySpriteZip.createZip(files);
      const filename = "babyonscreen-sprites-editados-" + new Date().toISOString().slice(0, 10) + ".zip";
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = "✓ " + drafts.length + " PNGs reunidos em " + filename +
        " (" + (archive.size / 1024 / 1024).toFixed(1) + " MB). Envie este único ZIP aqui no ChatGPT.";
    } catch (error) {
      status.textContent = "⚠ Não foi possível exportar: " + (error?.message || "erro inesperado");
    } finally {
      button.disabled = false;
    }
  }
  async function refreshDraftCount() {
    const status = $("export-status"), button = $("export-edits");
    try {
      const drafts = await listDrafts();
      $("edited-count").textContent = String(drafts.length);
      button.disabled = drafts.length === 0;
      if (!status.textContent.startsWith("✓") && !status.textContent.startsWith("⚠"))
        status.textContent = drafts.length
          ? "Pronto: suas edições estão salvas no navegador."
          : "Nenhuma edição salva ainda. Use ✎ Editar sprite.";
      return drafts.length;
    } catch {
      $("edited-count").textContent = "—";
      button.disabled = true;
      status.textContent = "Armazenamento indisponível neste navegador.";
      return 0;
    }
  }

  for (const btn of modal.querySelectorAll("[data-edit-tool]")) {
    btn.addEventListener("click", () => setTool(btn.dataset.editTool));
  }
  canvas.addEventListener("pointerdown", begin);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  controls.brush.addEventListener("input", () =>
    controls.brushDisplay.textContent = controls.brush.value + " px");
  controls.zoom.addEventListener("input", () => { setZoom(controls.zoom.value); show(); });
  controls.zoomIn.addEventListener("click", () => { setZoom(zoom + 1); show(); });
  controls.zoomOut.addEventListener("click", () => { setZoom(zoom - 1); show(); });
  controls.original.addEventListener("change", show);
  controls.checker.addEventListener("change", () =>
    controls.viewport.classList.toggle("checker", controls.checker.checked));
  controls.undo.addEventListener("click", undo);
  controls.redo.addEventListener("click", redo);
  controls.save.addEventListener("click", saveDraft);
  controls.download.addEventListener("click", download);
  controls.reset.addEventListener("click", reset);
  controls.close.addEventListener("click", close);
  $("export-edits").addEventListener("click", exportAll);
  global.addEventListener("baby:sprite-edited", () => { void refreshDraftCount(); });
  global.addEventListener("focus", () => { void refreshDraftCount(); });
  modal.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); void close(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) void redo(); else void undo();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault(); void saveDraft();
    }
  });
  setTool("erase");
  updateHistory();
  global.BabySpriteEditor = Object.freeze({
    open: edit, getDraft, listDrafts, exportAll, refreshDraftCount, isOpen,
    // Exposed for automated tests; no mutations on GitHub.
    currentPath: () => path
  });
  void refreshDraftCount();
})(window);
