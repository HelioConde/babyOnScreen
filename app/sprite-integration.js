/* Maps game state to imported sprites, with graceful CSS fallback. */
(function (global) {
  "use strict";

  function attachBabySprites({ baby, canvas, manifest, base = ".." }) {
    if (!baby || !canvas || !global.BabySpriteController || !global.BabySpriteRuntime) return null;
    const controller = new global.BabySpriteController(canvas, { base });
    const allowed = new Set(["up", "down", "left", "right"]);
    let current = "";
    let ready = false;

    async function show({ stage = "newborn", direction = "down", action = "idle" } = {}) {
      if (!allowed.has(direction)) direction = "down";
      const animations = manifest?.[stage];
      const entry = animations?.[action]?.[direction] ||
        animations?.[action]?.down ||
        animations?.idle?.[direction] ||
        animations?.idle?.down;

      if (!entry) { hide(); return false; }
      const files = entry.files ?? entry.filename;
      const key = JSON.stringify([stage, action, direction, entry.category, files, entry.flipX]);
      if (key === current && ready) return true;
      current = key;
      ready = false;

      const success = await controller.play(entry.category, files, entry.frames, {
        fps: entry.fps ?? 6,
        loop: entry.loop !== false,
        flipX: entry.flipX === true
      });
      if (current !== key) return false;
      ready = success;
      canvas.hidden = !success;
      baby.classList.toggle("sprite-ready", success);
      return success;
    }

    function hide() {
      current = "";
      ready = false;
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
