/* Sprite atlas inventory verified against assets/sprites/generated.
   All four ages use the consistent brown-haired, pink-bow character art.
   Child currently reuses the tallest standing/walking poses until distinct
   older-child artwork is produced; it must never fall back to the blocky SVG. */
(function (global) {
  "use strict";
  const sequence = (category, ids, fps = 5, flipX = false) => Object.freeze({
    category,
    files: ids.map(id => "element_" + String(id).padStart(3, "0") + ".png"),
    fps,
    flipX
  });

  const feeding = sequence("alimentacao", [1, 2, 3, 4, 5], 5);
  // Use isolated single poses: neighboring frames were contaminated by other sprites.
  const sleeping = sequence("sono", [7], 1);
  const diaper = sequence("fralda", [9, 10, 11, 12], 3.5);
  const playing = sequence("crescimento", [39], 1);
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
  const oldCrawlingLeft = Object.freeze({ ...sequence("crescimento", [15, 16, 17], 5), frames: crawlingFrames });
  const oldCrawlingRight = Object.freeze({ ...sequence("crescimento", [15, 16, 17], 5, true), frames: crawlingFrames });
  // 8 poses cleaned and aligned to a 4x2 atlas of 64x64 cells.
  // The corrected crawl atlas is installed; older extracted frames remain a fallback.
  const crawlAtlasFrames = Array.from({ length: 8 }, (_, i) => ({
    imageIndex: 0, x: (i % 4) * 64, y: Math.floor(i / 4) * 64, w: 64, h: 64
  }));
  const crawlingLeft = Object.freeze({
    category: "crescimento", filename: "crawl_sheet.webp",
    frames: crawlAtlasFrames, fps: 8, fallback: oldCrawlingLeft
  });
  const crawlingRight = Object.freeze({
    category: "crescimento", filename: "crawl_sheet.webp",
    frames: crawlAtlasFrames, fps: 8, flipX: true, fallback: oldCrawlingRight
  });
  // Stationary crawl pose, used while dragging an item or pausing the game.
  // Keep the same appearance instead of abruptly switching to a swaddled baby.
  const crawlIdle = Object.freeze({
    category: "crescimento", filename: "crawl_sheet.webp",
    frames: [crawlAtlasFrames[0]], fps: 1, fallback: oldCrawlingLeft
  });
  const crawlIdleRight = Object.freeze({
    ...crawlIdle, flipX: true, fallback: oldCrawlingRight
  });
  const calmSides = Object.freeze({
    left: crawlIdle, right: crawlIdleRight, down: crawlIdle, up: crawlIdle
  });
  const crawlingFront = Object.freeze({ ...sequence("crescimento", [18, 19, 21], 5), frames: crawlFrontFrames });
  // Care activities keep a clean crawling pose instead of contaminated cuts.
  const calmToddler = sequence("crescimento", [11], 1);
  const walkingRight = sequence("crescimento", [30, 31, 30, 32], 5);
  const walkingLeft = sequence("crescimento", [30, 31, 30, 32], 5, true);
  // Standing poses for the older-child preview share the approved character
  // identity. The art pack does not yet include a distinct school-age sprite.
  const childStanding = sequence("crescimento", [33], 1);
  const childStandingSide = sequence("crescimento", [30], 1);
  const childStandingLeft = sequence("crescimento", [30], 1, true);

  global.BabySpriteManifest = Object.freeze({
    newborn: {
      idle: calmSides,
      walk: {
        left: crawlingLeft,
        right: crawlingRight,
        // Dedicated up/down sprites are still experimental; use the consistent atlas
        // instead of abruptly switching to mixed-quality extracted frames.
        down: crawlingLeft,
        up: crawlingLeft
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: calmSides,
      drawing: calmSides,
      medicine: calmSides,
      pet: { down: petting }
    },
    baby: {
      idle: calmSides,
      walk: {
        left: crawlingLeft,
        right: crawlingRight,
        down: crawlingLeft,
        up: crawlingLeft
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: calmSides,
      drawing: calmSides,
      medicine: calmSides,
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
    },
    child: {
      idle: {
        left: childStandingLeft, right: childStandingSide,
        down: childStanding, up: childStanding
      },
      walk: {
        left: walkingLeft, right: walkingRight,
        down: sequence("crescimento", [29, 32, 33], 5),
        up: sequence("crescimento", [29, 32, 33], 5)
      },
      feed: { down: feeding },
      sleep: { down: sleeping },
      diaper: { down: diaper },
      toy: { down: playing },
      letter: { down: childStanding },
      drawing: { down: childStanding },
      medicine: { down: childStanding },
      pet: { down: petting }
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
