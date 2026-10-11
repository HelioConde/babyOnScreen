/* Static asset inventory verified against the GitHub tree on 2026-10-10.
   Pages cannot browse repository directories at runtime, so list their known ranges.
   The actual in-game animations always come from BabySpriteManifest. */
(function (global) {
  "use strict";
  const categories = Object.freeze([
    { id: "crescimento", title: "Crescimento", count: 44 },
    { id: "alimentacao", title: "Alimentação", count: 45 },
    { id: "sono", title: "Sono", count: 27 },
    { id: "fralda", title: "Fralda", count: 36 },
    { id: "banho", title: "Banho", count: 54 },
    { id: "quarto", title: "Quarto", count: 52 },
    { id: "casa", title: "Casa", count: 80 },
    { id: "quintal", title: "Quintal", count: 72 },
    { id: "escola", title: "Escola", count: 87 },
    { id: "npcs", title: "NPCs", count: 58 }
  ]);
  const titles = Object.freeze({
    idle: "Parada", walk: "Movimento", feed: "Mamadeira", sleep: "Dormir",
    diaper: "Fralda", toy: "Brinquedo", letter: "Cartinha",
    drawing: "Desenho", medicine: "Remédio", pet: "Carinho"
  });
  const stages = Object.freeze({
    newborn: "Recém-nascida", baby: "Bebê", toddler: "Primeiros passos", child: "Criança"
  });
  const directions = Object.freeze({ left: "Esquerda", right: "Direita", down: "Frente", up: "Costas" });
  const pathFor = (category, filename) => "../assets/sprites/generated/" + category + "/" + filename;
  const assets = [];
  for (const category of categories) {
    for (let n = 1; n <= category.count; n++) {
      const filename = "element_" + String(n).padStart(3, "0") + ".png";
      assets.push({
        id: "asset:" + category.id + ":" + filename, kind: "asset",
        category: category.id, filename, title: category.title + " · " + filename,
        files: [filename], fps: 1, frames: null, flipX: false,
        path: pathFor(category.id, filename)
      });
    }
    assets.push({
      id: "asset:" + category.id + ":sheet.png", kind: "asset",
      category: category.id, filename: "sheet.png", title: category.title + " · folha completa",
      files: ["sheet.png"], fps: 1, frames: null, flipX: false,
      path: pathFor(category.id, "sheet.png")
    });
  }
  assets.push({
    id: "asset:crescimento:crawl_sheet.webp", kind: "asset",
    category: "crescimento", filename: "crawl_sheet.webp",
    title: "Crescimento · atlas engatinhando", files: ["crawl_sheet.webp"],
    fps: 1, frames: null, flipX: false, path: pathFor("crescimento", "crawl_sheet.webp")
  });

  function animationsFromManifest(manifest) {
    const animations = [];
    for (const [stage, actions] of Object.entries(manifest || {})) {
      for (const [action, directionsMap] of Object.entries(actions)) {
        for (const [direction, entry] of Object.entries(directionsMap)) {
          const files = Array.isArray(entry.files) ? [...entry.files] :
            (entry.filename ? [entry.filename] : []);
          if (!entry.category || !files.length) continue;
          animations.push({
            id: "animation:" + stage + ":" + action + ":" + direction,
            kind: "animation", stage, action, direction, category: entry.category,
            title: (stages[stage] || stage) + " · " + (titles[action] || action) +
              " · " + (directions[direction] || direction),
            files, frames: entry.frames ? entry.frames.map(frame => ({ ...frame })) : null,
            fps: Number(entry.fps) || 6, flipX: entry.flipX === true,
            path: pathFor(entry.category, files[0])
          });
        }
      }
    }
    return animations;
  }

  global.BabySpriteAdminCatalog = Object.freeze({
    categories, stages, titles, directions, assets: Object.freeze(assets),
    animationsFromManifest, pathFor
  });
})(typeof window !== "undefined" ? window : globalThis);
