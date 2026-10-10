/* Loads real PNG sequences while retaining the original CSS fallback. */
(function (global) {
  "use strict";
  const Runtime = global.BabySpriteRuntime;
  if (!Runtime) return;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Sprite unavailable: " + src));
      image.src = src;
    });
  }

  class BabySpriteController {
    constructor(canvas, { base = "..", fps = 6 } = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas required");
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      if (!this.ctx) throw new Error("2D canvas unavailable");
      this.base = base;
      this.fps = fps;
      this.cache = new Map();
      this.animator = null;
      this.flipX = false;
      this.active = false;
      this.last = 0;
      this.raf = 0;
      this.generation = 0;
      this.tick = this.tick.bind(this);
    }

    load(category, filenames) {
      const urls = filenames.map(filename => Runtime.spriteUrl(category, filename, this.base));
      const key = urls.join("|");
      if (!this.cache.has(key)) {
        const loading = Promise.all(urls.map(loadImage)).catch(error => {
          this.cache.delete(key);
          throw error;
        });
        this.cache.set(key, loading);
      }
      return this.cache.get(key);
    }

    async play(category, filenames, frames, options = {}) {
      const generation = ++this.generation;
      const files = Array.isArray(filenames) ? filenames : [filenames];
      if (!files.length || files.length > 24) { this.stop(); return false; }
      let images;
      try {
        images = await this.load(category, files);
      } catch {
        if (generation === this.generation) this.stop();
        return false;
      }
      if (generation !== this.generation) return false;

      const sequence = frames ?? images.map((image, index) => ({
        imageIndex: index,
        x: 0, y: 0,
        w: image.naturalWidth || image.width,
        h: image.naturalHeight || image.height
      }));
      if (!Array.isArray(sequence) || !sequence.length ||
        sequence.some(f => !f || !Number.isInteger(f.imageIndex ?? 0) ||
          (f.imageIndex ?? 0) < 0 || (f.imageIndex ?? 0) >= images.length ||
          !(f.w > 0 && f.h > 0))) {
        this.stop();
        return false;
      }

      this.animator = new Runtime.SpriteAnimator(images, sequence, {
        fps: options.fps ?? this.fps,
        loop: options.loop !== false,
        onFinish: options.onFinish
      });
      this.flipX = options.flipX === true;
      this.active = true;
      this.last = 0;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.tick);
      return true;
    }

    tick(now) {
      if (!this.active || !this.animator) return;
      const dt = this.last ? (now - this.last) / 1000 : 0;
      this.last = now;
      this.animator.update(dt);
      const { width, height } = this.animator.frameInfo();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (width > 0 && height > 0) {
        const scale = Math.min((this.canvas.width - 4) / width, (this.canvas.height - 4) / height);
        this.ctx.imageSmoothingEnabled = true;
        this.animator.draw(this.ctx, this.canvas.width / 2, this.canvas.height - 2, {
          scale, flipX: this.flipX
        });
      }
      this.raf = requestAnimationFrame(this.tick);
    }

    stop() {
      this.generation++;
      this.active = false;
      cancelAnimationFrame(this.raf);
      this.animator = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() { this.stop(); this.cache.clear(); }
  }

  global.BabySpriteController = BabySpriteController;
})(typeof window !== "undefined" ? window : globalThis);
