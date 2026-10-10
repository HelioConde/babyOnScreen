/* Maps game state to imported sprites, with graceful CSS fallback. */
(function (global) {
  "use strict";

  function attachBabySprites({ baby, canvas, manifest, base = ".." }) {
    if (!baby || !canvas || !global.BabySpriteController || !global.BabySpriteRuntime) return null;
    const controller = new global.BabySpriteController(canvas, { base });
    const allowed = new Set(["up", "down", "left", "right"]);
    let current = "";
    let ready = false;
    let pending = null;

    async function show({ stage = "newborn", direction = "down", action = "idle" } = {}) {
      if (!allowed.has(direction)) direction = "down";
      const animations = manifest?.[stage];
      const entry = animations?.[action]?.[direction] ||
        animations?.[action]?.down ||
        animations?.idle?.[direction] ||
        animations?.idle?.down;

      if (!entry) { hide(); return false; }
      const files = entry.files ?? entry.filename;
      // Identity follows the actual animation, not a temporary input direction.
      // Otherwise direction jitter repeatedly restarts the cycle at frame zero.
      const key = JSON.stringify([stage, entry.category, files, entry.frames,
        entry.fps, entry.loop, entry.flipX]);
      if (key === current) {
        if (ready) return true;
        if (pending) return pending;
      }
      current = key;
      ready = false;

      const operation = (async () => {
        let success = await controller.play(entry.category, files, entry.frames, {
          fps: entry.fps ?? 6,
          loop: entry.loop !== false,
          flipX: entry.flipX === true
        });
        if (current !== key) return false;
        if (!success && entry.fallback) {
          const old = entry.fallback;
          success = await controller.play(old.category, old.files ?? old.filename, old.frames, {
            fps: old.fps ?? 6,
            loop: old.loop !== false,
            flipX: old.flipX === true
          });
        }
        if (current !== key) return false;
        ready = success;
        canvas.hidden = !success;
        baby.classList.toggle("sprite-ready", success);
        return success;
      })();
      pending = operation;
      try { return await operation; }
      finally { if (pending === operation) pending = null; }
    }

    function hide() {
      current = "";
      ready = false;
      pending = null;
      controller.stop();
      canvas.hidden = true;
      baby.classList.remove("sprite-ready");
    }

    function destroy() { hide(); controller.destroy(); }
    hide();
    return { show, hide, destroy };
  }

  global.BabySpriteIntegration = Object.freeze({ attachBabySprites });
})(typeof window !== "undefined" ? window : globalThis);
