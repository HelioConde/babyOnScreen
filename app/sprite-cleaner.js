/* Removes red extraction matte and stray neighboring fragments from old sprite PNGs.
   The separately authored crawl_sheet.webp stays untouched. */
(function (global) {
  "use strict";
  const LEGACY = /\/assets\/sprites\/generated\/(alimentacao|fralda|sono|crescimento)\/(element_\d{3}\.png)(?:[?#]|$)/;
  const CUSTOM_FRAMES = /^crescimento\/element_0(?:15|16|17|18|19|21)\.png$/;
  const SIZE = 224;

  function isRedMatte(r, g, b) {
    // Old test r>=155/g<=108 also matched auburn hair (e.g. 184,78,45)
    // and punched transparent holes through the head. Only near-pure red
    // extraction marks qualify. Brown hair, warm shadows and pink bows do not.
    return r >= 190 && g <= 54 && b <= 58 &&
      r - g >= 145 && r - b >= 145;
  }

  function cleanPixels(w, h, data, { isolate = true } = {}) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 ||
        !data || data.length !== w * h * 4) throw new Error("Invalid sprite pixels");
    const size = w * h, labels = new Int32Array(size), queue = new Int32Array(size);
    let removedMatte = 0, removedLoose = 0, best = 0, bestSize = 0, components = 0;
    const regions = [null];
    for (let i = 0; i < size; i++) {
      const p = i * 4;
      if (data[p + 3] && isRedMatte(data[p], data[p + 1], data[p + 2])) {
        data[p + 3] = 0; removedMatte++;
      }
    }
    if (isolate) {
      for (let i = 0; i < size; i++) {
        if (labels[i] || data[i * 4 + 3] < 20) continue;
        const id = ++components;
        let head = 0, tail = 1;
        let xMin = w, yMin = h, xMax = 0, yMax = 0;
        queue[0] = i; labels[i] = id;
        while (head < tail) {
          const pos = queue[head++], x = pos % w, y = Math.floor(pos / w);
          xMin = Math.min(xMin, x); yMin = Math.min(yMin, y);
          xMax = Math.max(xMax, x); yMax = Math.max(yMax, y);
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy; if (yy < 0 || yy >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= w || (!dx && !dy)) continue;
              const n = yy * w + xx;
              if (!labels[n] && data[n * 4 + 3] >= 20) {
                labels[n] = id; queue[tail++] = n;
              }
            }
          }
        }
        regions[id] = { xMin, yMin, xMax, yMax, count: tail };
        if (tail > bestSize) { bestSize = tail; best = id; }
      }
      if (bestSize > 30) {
        const body = regions[best];
        // Nearby detached details may be hair strands, bow highlights, fingers
        // or toes. Keep those instead of blindly deleting every smaller island.
        // Remote disconnected scraps from neighboring sprites are removed.
        const margin = Math.max(1, Math.round(Math.min(w, h) * 0.045));
        const keep = new Uint8Array(components + 1);
        keep[best] = 1;
        for (let id = 1; id <= components; id++) {
          if (id === best) continue;
          const region = regions[id];
          if (region.xMin <= body.xMax + margin &&
              region.xMax >= body.xMin - margin &&
              region.yMin <= body.yMax + margin &&
              region.yMax >= body.yMin - margin) keep[id] = 1;
        }
        for (let i = 0; i < size; i++) {
          const label = labels[i];
          if (label && !keep[label] && data[i * 4 + 3]) {
            data[i * 4 + 3] = 0; removedLoose++;
          }
        }
      }
    }
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < size; i++) {
      if (data[i * 4 + 3] < 20) continue;
      const x = i % w, y = Math.floor(i / w);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return {
      bounds: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
      removedMatte, removedLoose, components
    };
  }

  function cleanImage(image, url) {
    const match = LEGACY.exec(url);
    if (!match || typeof document === "undefined") return image;
    const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
    if (!(w > 0 && h > 0) || w * h > 1048576) return image;
    const source = document.createElement("canvas");
    source.width = w; source.height = h;
    const ctx = source.getContext("2d", { willReadFrequently: true });
    if (!ctx) return image;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, w, h);
    const preserveGrid = CUSTOM_FRAMES.test(match[1] + "/" + match[2]);
    const result = cleanPixels(w, h, pixels.data, { isolate: !preserveGrid });
    if (!result.bounds) return image;
    ctx.putImageData(pixels, 0, 0);
    if (preserveGrid) return source;
    // Normalize the body (not its surrounding debris) to the same 224px cell.
    const output = document.createElement("canvas");
    output.width = SIZE; output.height = SIZE;
    const dest = output.getContext("2d");
    if (!dest) return source;
    const b = result.bounds;
    const scale = Math.min(1, (SIZE - 12) / b.w, (SIZE - 12) / b.h);
    const dw = Math.round(b.w * scale), dh = Math.round(b.h * scale);
    dest.imageSmoothingEnabled = false;
    dest.drawImage(source, b.x, b.y, b.w, b.h,
      Math.round((SIZE - dw) / 2), SIZE - 6 - dh, dw, dh);
    return output;
  }

  function load(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try { resolve(cleanImage(image, url)); }
        catch { resolve(image); }
      };
      image.onerror = () => reject(new Error("Sprite unavailable: " + url));
      image.src = url;
    });
  }

  global.BabySpriteCleaner = Object.freeze({ cleanPixels, cleanImage, load, isRedMatte });
})(typeof window !== "undefined" ? window : globalThis);
