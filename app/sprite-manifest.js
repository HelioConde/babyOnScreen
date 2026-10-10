/* Verified asset IDs from assets/sprites/generated. Each file is one frame.
   The "child" stage intentionally uses the existing CSS art until a matching
   older-child sprite set has been reviewed. */
(function (global) {
  "use strict";
  const sequence = (category, ids, fps = 5, flipX = false) => Object.freeze({
    category,
    files: ids.map(id => "element_" + String(id).padStart(3, "0") + ".png"),
    fps,
    flipX
  });

  const feeding = sequence("alimentacao", [1, 2, 3, 4, 5], 5);
  const sleeping = sequence("sono", [6, 7, 8], 2.5);
  const crawlingLeft = sequence("crescimento", [15, 16, 17], 5);
  const crawlingRight = sequence("crescimento", [15, 16, 17], 5, true);
  const walkingRight = sequence("crescimento", [30, 31, 30, 32], 5);
  const walkingLeft = sequence("crescimento", [30, 31, 30, 32], 5, true);

  global.BabySpriteManifest = Object.freeze({
    newborn: {
      idle: { down: sequence("crescimento", [1, 2, 1], 2) },
      feed: { down: feeding },
      sleep: { down: sleeping }
    },
    baby: {
      idle: { down: sequence("crescimento", [5, 6, 5], 2.5) },
      walk: {
        left: crawlingLeft,
        right: crawlingRight,
        down: sequence("crescimento", [18, 19, 21], 5)
      },
      feed: { down: feeding },
      sleep: { down: sleeping }
    },
    toddler: {
      idle: { down: sequence("crescimento", [9, 10, 11, 10], 2.5) },
      walk: {
        left: walkingLeft,
        right: walkingRight,
        down: sequence("crescimento", [29, 32, 33], 5)
      },
      feed: { down: feeding },
      sleep: { down: sleeping }
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
