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
// Clip the *native Windows surface*, not just the DOM hit target. A desktop-
 // sized translucent HWND can occlude Chromium's GPU video even if its pixels
 // are transparent (Electron issue #49024). Small rectangles around visible
 // elements keep the rest of the desktop genuinely uncovered.
function nativeVisualShape(raw, bounds) {
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) ||
      bounds.width <= 0 || bounds.height <= 0) return [];
  return sanitizeRegions(raw, 16).map(r=>{
    const x=Math.max(0,Math.floor(r.x)), y=Math.max(0,Math.floor(r.y));
    const right=Math.min(bounds.width,Math.ceil(r.x+r.width));
    const bottom=Math.min(bounds.height,Math.ceil(r.y+r.height));
    return {x,y,width:Math.ceil(right-x),height:Math.ceil(bottom-y)};
  }).filter(r=>r.width>0&&r.height>0);
}
function isCursorOverRegion(cursor, bounds, regions) {
  if (!cursor || !bounds || !Array.isArray(regions) ||
      !['x', 'y'].every(k => Number.isFinite(cursor[k]) && Number.isFinite(bounds[k]))) return false;
  const x = cursor.x - bounds.x, y = cursor.y - bounds.y;
  return regions.some(r => x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height);
}
function virtualDesktopBounds(displays) {
  if (!Array.isArray(displays) || !displays.length) return null;
  const rectangles = displays.map(d => d?.workArea || d?.bounds || d).filter(r =>
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
  return list.filter(d=>{
      const r=d?.workArea || d?.bounds;
      return r && Number.isFinite(r.x) && Number.isFinite(r.y) &&
        Number.isFinite(r.width) && Number.isFinite(r.height) && r.width>0 && r.height>0;
    }).map((d,index)=>{
      const r=d.workArea || d.bounds;
      return {
        id:String(d.id),
        label:'Monitor '+(index+1)+(index===0 ? ' (principal)' : ''),
        x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height,
        primary:index===0
      };
    });
}
module.exports = Object.freeze({ sanitizeRegions, nativeVisualShape, isCursorOverRegion, virtualDesktopBounds, displayList });
