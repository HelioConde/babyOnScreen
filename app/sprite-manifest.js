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
  const diaper = sequence("fralda", [9, 10, 11, 12], 3.5);
  const playing = sequence("crescimento", [39, 40], 3);
  const petting = sequence("crescimento", [11, 28], 3);
  // The generated frames include stray pixels from neighboring poses.
  // Crop those edges so the baby stays visually centered when crawling.
  const crawlingFrames = [
    { imageIndex: 0, x: 0, y: 0, w: 198, h: 171 },
    { imageIndex: 1, x: 19, y: 0, w: 198, h: 171 },
    { imageIndex: 2, x: 0, y: 0, w: 200, h: 171 }
  ];
  const crawlFrontFrames = [
    { imageIndex: 0, x: 22, y: 0, w: 164, h: 171 },
    { imageIndex: 1, x: 16, y: 0, w: 144, h: 171 },
    { imageIndex: 2, x: 14, y: 0, w: 138, h: 169 }
  ];
  const crawlingLeft = Object.freeze({ ...sequence("crescimento", [15, 16, 17], 5), frames: crawlingFrames });
  const crawlingRight = Object.freeze({ ...sequence("crescimento", [15, 16, 17], 5, true), frames: crawlingFrames });
  const crawlingFront = Object.freeze({ ...sequence("crescimento", [18, 19, 21], 5), frames: crawlFrontFrames });
  // Calm, stationary pose during reading, drawing and medical care.
  // Without an explicit entry, the newborn would abruptly revert to its swaddle.
  const calmCrawl = Object.freeze({
    ...sequence("crescimento", [19], 1),
    frames: [{ imageIndex: 0, x: 16, y: 0, w: 144, h: 171 }]
  });
  const calmToddler = sequence("crescimento", [11], 1);
  const walkingRight = sequence("crescimento", [30, 31, 30, 32], 5);
  const walkingLeft = sequence("crescimento", [30, 31, 30, 32], 5, true);

  global.BabySpriteManifest = Object.freeze({
    newborn: {
      idle: { down: sequence("crescimento", [1, 2, 1], 2) },
      walk: {
        left: crawlingLeft,
        right: crawlingRight,
        down: crawlingFront,
        up: crawlingFront
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: { down: calmCrawl },
      drawing: { down: calmCrawl },
      medicine: { down: calmCrawl },
      pet: { down: petting }
    },
    baby: {
      idle: { down: sequence("crescimento", [5, 6, 5], 2.5) },
      walk: {
        left: crawlingLeft,
        right: crawlingRight,
        down: crawlingFront,
        up: crawlingFront
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: { down: calmCrawl },
      drawing: { down: calmCrawl },
      medicine: { down: calmCrawl },
      pet: { down: petting }
    },
    toddler: {
      idle: { down: sequence("crescimento", [9, 10, 11, 10], 2.5) },
      walk: {
        left: walkingLeft,
        right: walkingRight,
        down: sequence("crescimento", [29, 32, 33], 5)
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: { down: calmToddler },
      drawing: { down: calmToddler },
      medicine: { down: calmToddler },
      pet: { down: petting }
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
