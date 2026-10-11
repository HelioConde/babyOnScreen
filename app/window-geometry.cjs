'use strict';
/* All screen and window positions are in Electron's logical DIP coordinates.
   This remains valid for monitors to the left/above the primary monitor. */
function sanitizeRegions(raw, limit = 40) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).filter(r =>
    r && ['x', 'y', 'width', 'height'].every(k => Number.isFinite(r[k])) &&
    r.width > 0 && r.height > 0 && r.width <= 10000 && r.height <= 10000 &&
    Math.abs(r.x) <= 100000 && Math.abs(r.y) <= 100000
  ).map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
}
function isCursorOverRegion(cursor, bounds, regions) {
  if (!cursor || !bounds || !Array.isArray(regions) ||
      !['x', 'y'].every(k => Number.isFinite(cursor[k]) && Number.isFinite(bounds[k]))) return false;
  const x = cursor.x - bounds.x, y = cursor.y - bounds.y;
  return regions.some(r => x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height);
}
module.exports = Object.freeze({ sanitizeRegions, isCursorOverRegion });
