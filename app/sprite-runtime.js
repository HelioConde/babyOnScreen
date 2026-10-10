/* Sprite loading and frame animation for the desktop companion. */
(function (global) {
  "use strict";
  const CATEGORIES = new Set(["banho", "fralda", "alimentacao", "sono", "crescimento", "quarto", "casa", "quintal", "escola", "npcs"]);
  const ROOT = "assets/sprites/generated";

  function spriteUrl(category, filename, base = "") {
    if (!CATEGORIES.has(category)) throw new Error("Unknown sprite category");
    if (typeof filename !== "string" || !/^element_\d{3}\.png$|^sheet\.png$/.test(filename)) {
      throw new Error("Invalid sprite filename");
    }
    return [String(base).replace(/\/$/, ""), ROOT, category, filename].filter(Boolean).join("/");
  }

  class SpriteAnimator {
    constructor(image, frames, { fps = 6, loop = true, onFinish = null } = {}) {
      this.images = Array.isArray(image) ? image : [image];
      if (!this.images.length || this.images.some(img => !img) || !Array.isArray(frames) || !frames.length) {
        throw new Error("Images and frames required");
      }
      this.image = this.images[0];
      this.frames = frames;
      this.fps = Math.max(1, Math.min(60, Number(fps) || 6));
      this.loop = loop;
      this.onFinish = onFinish;
      this.elapsed = 0;
      this.index = 0;
      this.finished = false;
    }

    reset() { this.elapsed = 0; this.index = 0; this.finished = false; }

    update(dt) {
      if (this.finished) return;
      this.elapsed += Math.max(0, Math.min(Number(dt) || 0, 0.25));
      const frameTime = 1 / this.fps;
      while (this.elapsed >= frameTime) {
        this.elapsed -= frameTime;
        if (this.index + 1 < this.frames.length) this.index++;
        else if (this.loop) this.index = 0;
        else {
          this.finished = true;
          this.elapsed = 0;
          if (this.onFinish) this.onFinish();
          break;
        }
      }
    }

    frameInfo() {
      const frame = this.frames[this.index];
      const image = this.images[frame.imageIndex ?? 0];
      if (!image) throw new Error("Invalid image index");
      return {
        image, frame,
        width: frame.w ?? image.naturalWidth ?? image.width,
        height: frame.h ?? image.naturalHeight ?? image.height
      };
    }

    draw(ctx, x, y, { scale = 1, flipX = false } = {}) {
      const { image, frame, width, height } = this.frameInfo();
      if (!(width > 0 && height > 0)) return;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(flipX ? -scale : scale, scale);
      ctx.drawImage(
        image, frame.x ?? 0, frame.y ?? 0, width, height,
        -(frame.pivotX ?? width / 2), -(frame.pivotY ?? height), width, height
      );
      ctx.restore();
    }
  }

  global.BabySpriteRuntime = Object.freeze({
    spriteUrl, SpriteAnimator, categories: [...CATEGORIES]
  });
})(typeof window !== "undefined" ? window : globalThis);
