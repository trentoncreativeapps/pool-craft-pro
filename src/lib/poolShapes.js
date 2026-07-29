// ─── POOL SHAPE GEOMETRY ────────────────────────────────────────────────────────
// Converts the app's pool shape id + bounding length/width (the only geometry
// the rest of the app actually stores - see schematicEngine.js's header) into
// a real Point[] polygon per shape, instead of always falling back to a plain
// bounding rectangle.
//
// These are standardized geometric approximations of each shape family, not a
// trace of any specific real pool - there's no additional shape parameter
// captured anywhere in the app (no corner radius, curve tightness, etc.) to
// draw from, only len/wid. "freeform" in particular is inherently a custom,
// hand-designed outline in real life; what's generated here is a smooth,
// deterministic stand-in so the schematic pipeline has *something* concrete
// to work with, not a claim about what any specific freeform pool looks like.

function circlePoints(cx, cy, r, fromAngle, toAngle, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = fromAngle + ((toAngle - fromAngle) * i) / segments;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function rectanglePolygon(len, wid) {
  return [{ x: 0, y: 0 }, { x: len, y: 0 }, { x: len, y: wid }, { x: 0, y: wid }];
}

// Stadium shape: straight parallel sides with full semicircular ends, radius
// matched to the width - the common real-world meaning of an "oval" pool
// (rounded ends, not a smooth mathematical ellipse throughout).
function ovalPolygon(len, wid, segments = 24) {
  const r = Math.min(len, wid) / 2;
  const straight = Math.max(0, len - 2 * r);
  const cy = wid / 2;
  return [
    ...circlePoints(r + straight, cy, r, -Math.PI / 2, Math.PI / 2, segments),
    ...circlePoints(r, cy, r, Math.PI / 2, (3 * Math.PI) / 2, segments),
  ];
}

// A rectangle with one corner notched out, forming a classic L with a
// separate deep-end arm - matches the "Separate deep & shallow zones"
// description.
function lShapePolygon(len, wid) {
  const notchX = len * 0.55;
  const notchY = wid * 0.55;
  return [
    { x: 0, y: 0 }, { x: len, y: 0 }, { x: len, y: notchY },
    { x: notchX, y: notchY }, { x: notchX, y: wid }, { x: 0, y: wid },
  ];
}

// Grecian pool: a rectangle with the four corners chamfered off (angled cuts,
// not rounded) - an elongated octagon. Geometrically distinct from the oval's
// fully-rounded ends and from the rectangle's sharp corners.
function grecianPolygon(len, wid) {
  const c = Math.min(len, wid) * 0.22;
  return [
    { x: c, y: 0 }, { x: len - c, y: 0 }, { x: len, y: c }, { x: len, y: wid - c },
    { x: len - c, y: wid }, { x: c, y: wid }, { x: 0, y: wid - c }, { x: 0, y: c },
  ];
}

// Two connected circular areas (per the shape's own label) - the outer
// boundary of the union of two equal circles, i.e. a peanut/vesica shape with
// a visible waist, not a self-crossing mathematical figure-eight.
function figure8Polygon(len, wid, segments = 24) {
  const r = wid / 2;
  // Clamp the center distance so the circles always overlap enough to form a
  // real, visible waist regardless of the len/wid ratio the user entered.
  const d = Math.min(Math.max(len - wid, r * 0.5), r * 1.8);
  const x1 = r, x2 = r + d;
  const cy = wid / 2;
  const aHalf = d / 2;
  const h = Math.sqrt(Math.max(0, r * r - aHalf * aHalf));
  const angle1 = Math.atan2(h, aHalf);

  return [
    // Circle 1 (left) major arc: top intersection -> bottom, the long way
    // around through π (away from circle 2).
    ...circlePoints(x1, cy, r, angle1, 2 * Math.PI - angle1, segments),
    // Circle 2 (right) major arc: bottom -> top, the long way around through 0.
    ...circlePoints(x2, cy, r, angle1 - Math.PI, Math.PI - angle1, segments),
  ];
}

// Smooth, mildly irregular closed outline - deterministic (same len/wid
// always produces the same shape; no Math.random jitter across re-renders).
// See the module header: this is an illustrative stand-in only.
function freeformPolygon(len, wid, segments = 32) {
  const cx = len / 2, cy = wid / 2;
  const rx = len / 2, ry = wid / 2;
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * 2 * Math.PI;
    // Clamped to <=1 (never bulges past the nominal ellipse) so the shape
    // stays strictly within the len x wid bounding box, same as every other
    // shape here.
    const wobble = Math.min(1, 1 + 0.12 * Math.sin(3 * t + 0.7) + 0.06 * Math.sin(5 * t + 2.1));
    pts.push({ x: cx + rx * wobble * Math.cos(t), y: cy + ry * wobble * Math.sin(t) });
  }
  return pts;
}

const BUILDERS = {
  rectangle: rectanglePolygon,
  lap: rectanglePolygon, // same geometry - "lap" is just a length:width intent, not a distinct outline
  oval: ovalPolygon,
  lshape: lShapePolygon,
  greek: grecianPolygon,
  figure8: figure8Polygon,
  freeform: freeformPolygon,
};

/**
 * @param {string} shape one of POOL_SHAPES' ids from App.jsx
 * @param {number} lenFt bounding length in feet
 * @param {number} widFt bounding width in feet
 * @returns {{x:number,y:number}[]} a closed polygon ring (first point not repeated at the end)
 */
export function buildPoolPolygon(shape, lenFt, widFt) {
  const len = Number.isFinite(lenFt) && lenFt > 0 ? lenFt : 1;
  const wid = Number.isFinite(widFt) && widFt > 0 ? widFt : 1;
  const builder = BUILDERS[shape] || rectanglePolygon;
  return builder(len, wid);
}

export const SUPPORTED_POOL_SHAPES = Object.keys(BUILDERS);
