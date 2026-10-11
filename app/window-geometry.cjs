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
function virtualDesktopBounds(displays) {
  if (!Array.isArray(displays) || !displays.length) return null;
  const rectangles = displays.map(d => d?.bounds || d).filter(r =>
    r && ['x','y','width','height'].every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0
  );
  if (!rectangles.length) return null;
  const x = Math.min(...rectangles.map(d=>d.x));
  const y = Math.min(...rectangles.map(d=>d.y));
  const right = Math.max(...rectangles.map(d=>d.x+d.width));
  const bottom = Math.max(...rectangles.map(d=>d.y+d.height));
  return { x:Math.round(x), y:Math.round(y), width:Math.ceil(right-x), height:Math.ceil(bottom-y) };
}
function displayList(displays, windowBounds) {
  const list = Array.isArray(displays) ? displays : [];
  const origin = windowBounds || virtualDesktopBounds(list) || {x:0,y:0};
  return list.filter(d=>d?.bounds && Number.isFinite(d.bounds.x) &&
      Number.isFinite(d.bounds.y) && d.bounds.width>0 && d.bounds.height>0)
    .map((d,index)=>({
      id:String(d.id),
      label:'Monitor '+(index+1)+(d.id === displays[0]?.id ? ' (principal)' : ''),
      x:d.bounds.x-origin.x, y:d.bounds.y-origin.y,
      width:d.bounds.width, height:d.bounds.height,
      primary:index===0
    }));
}
module.exports = Object.freeze({ sanitizeRegions, isCursorOverRegion, virtualDesktopBounds, displayList });
