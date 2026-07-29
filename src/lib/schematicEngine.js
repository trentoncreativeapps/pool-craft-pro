// ─── ENGINEERING SCHEMATIC ENGINE ──────────────────────────────────────────────
// Pure functions: pool geometry in, rebar/skimmer/return/drain/plumbing layout
// out. No UI, no rendering, no app-state coupling - the caller is responsible
// for converting whatever the app's pool representation is (today: just
// shape/len/wid, see App.jsx) into the Point[] polygon this module expects.
//
// Types (plain JS - no TypeScript in this project):
//   Point      = { x: number, y: number }               feet, local plan coords
//   Polygon    = Point[]                                 implicitly closed ring
//   DepthZone  = { id: string, polygon?: Point[], depthFt: number }
//   RebarLine  = { a: Point, b: Point, type: "grid-h"|"grid-v"|"bond-beam", count: number }
//   PlumbingRun = { to: "skimmer"|"return"|"drain", index: number, path: Point[] }

export const DEFAULT_CONFIG = {
  skimmerAreaSqFt: 500, // one skimmer per this many sq ft of surface area
  minSkimmers: 1,
  rebarSpacingFt: 1, // 12" x 12" grid
  returnSpacing: { min: 8, max: 10 }, // ft between returns along the wall
  returnOffsetFt: 3, // min clearance a return keeps from a skimmer
};

// ─── Polygon geometry utilities ────────────────────────────────────────────────

export function polygonArea(polygon) {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const { x: x1, y: y1 } = polygon[i];
    const { x: x2, y: y2 } = polygon[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(polygon) {
  let cx = 0, cy = 0, signedArea = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const { x: x1, y: y1 } = polygon[i];
    const { x: x2, y: y2 } = polygon[(i + 1) % n];
    const cross = x1 * y2 - x2 * y1;
    signedArea += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  signedArea /= 2;
  if (Math.abs(signedArea) < 1e-9) {
    // degenerate (zero-area) polygon - fall back to a plain vertex average
    const n2 = polygon.length || 1;
    return {
      x: polygon.reduce((s, p) => s + p.x, 0) / n2,
      y: polygon.reduce((s, p) => s + p.y, 0) / n2,
    };
  }
  return { x: cx / (6 * signedArea), y: cy / (6 * signedArea) };
}

export function polygonBounds(polygon) {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Even-odd ray-casting point-in-polygon test.
export function pointInPolygon(point, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

// The longest edge of the polygon - used as "one long wall" for skimmer/return
// placement. For a rectangle this is trivially one of the two long sides.
export function findLongestEdge(polygon) {
  const n = polygon.length;
  let best = null;
  for (let i = 0; i < n; i++) {
    const a = polygon[i], b = polygon[(i + 1) % n];
    const length = dist(a, b);
    if (!best || length > best.length) best = { a, b, length, index: i };
  }
  return best;
}

export function polygonPerimeter(polygon) {
  const n = polygon.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += dist(polygon[i], polygon[(i + 1) % n]);
  return total;
}

// A path to distribute fixtures along: the single longest edge when it's a
// substantial share of the perimeter (a real straight wall, as in a
// rectangle/L-shape/octagon), or the pool's entire perimeter loop when no
// single edge dominates - e.g. an oval or figure-8 approximated by many short
// curve segments, where there is no one "long wall" to begin with. The 25%
// threshold cleanly separates polygons built from a handful of real straight
// edges from ones built by sampling a curve into many small segments.
export function findFixtureWallPath(polygon) {
  const wall = findLongestEdge(polygon);
  const perimeter = polygonPerimeter(polygon);
  if (perimeter > 0 && wall.length >= perimeter * 0.25) {
    return { points: [wall.a, wall.b], length: wall.length };
  }
  return { points: [...polygon, polygon[0]], length: perimeter };
}

// Walks a multi-segment path (as returned by findFixtureWallPath) and returns
// the point at distance d along it, clamped to the path's end.
export function pointAlongPath(pathPoints, d) {
  let remaining = d;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i], b = pathPoints[i + 1];
    const segLen = dist(a, b);
    if (remaining <= segLen || i === pathPoints.length - 2) {
      const t = segLen > 0 ? Math.min(1, Math.max(0, remaining / segLen)) : 0;
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }
    remaining -= segLen;
  }
  return pathPoints[pathPoints.length - 1];
}

function segmentIntersection(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null; // parallel or collinear
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const s = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < -1e-9 || t > 1 + 1e-9 || s < -1e-9 || s > 1 + 1e-9) return null;
  return Math.min(1, Math.max(0, t));
}

// Clips segment a->b to the portion(s) that lie inside polygon. Handles
// concave polygons (L-shape, figure-8, etc.) correctly by walking every
// boundary crossing in order rather than assuming a single entry/exit pair -
// a straight sweep line can cross a concave outline more than twice.
export function clipLineToPolygon(a, b, polygon) {
  const n = polygon.length;
  const crossings = [];
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i], p2 = polygon[(i + 1) % n];
    const t = segmentIntersection(a, b, p1, p2);
    if (t !== null) crossings.push(t);
  }
  crossings.sort((x, y) => x - y);
  const dedup = [];
  for (const t of crossings) {
    if (dedup.length === 0 || Math.abs(t - dedup[dedup.length - 1]) > 1e-9) dedup.push(t);
  }
  const lerp = (t) => ({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });

  let inside = pointInPolygon(a, polygon);
  let prevT = 0;
  const segments = [];
  for (const t of dedup) {
    if (inside) segments.push({ a: lerp(prevT), b: lerp(t) });
    inside = !inside;
    prevT = t;
  }
  if (inside) segments.push({ a: lerp(prevT), b: lerp(1) });
  return segments.filter((seg) => dist(seg.a, seg.b) > 1e-6);
}

// ─── Rebar grid ─────────────────────────────────────────────────────────────────

// 12" x 12" grid clipped to the pool polygon, plus doubled bars (bond beam)
// running the full perimeter.
export function generateRebarGrid(polygon, config = DEFAULT_CONFIG) {
  const spacing = config.rebarSpacingFt ?? DEFAULT_CONFIG.rebarSpacingFt;
  const bounds = polygonBounds(polygon);
  const lines = [];

  for (let y = bounds.minY; y <= bounds.maxY + 1e-9; y += spacing) {
    const a = { x: bounds.minX - 1, y };
    const b = { x: bounds.maxX + 1, y };
    for (const seg of clipLineToPolygon(a, b, polygon)) {
      lines.push({ a: seg.a, b: seg.b, type: "grid-h", count: 1 });
    }
  }
  for (let x = bounds.minX; x <= bounds.maxX + 1e-9; x += spacing) {
    const a = { x, y: bounds.minY - 1 };
    const b = { x, y: bounds.maxY + 1 };
    for (const seg of clipLineToPolygon(a, b, polygon)) {
      lines.push({ a: seg.a, b: seg.b, type: "grid-v", count: 1 });
    }
  }
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    lines.push({ a: polygon[i], b: polygon[(i + 1) % n], type: "bond-beam", count: 2 });
  }
  return { lines, spacingFt: spacing };
}

// ─── Fixture placement ──────────────────────────────────────────────────────────

// One skimmer per skimmerAreaSqFt of surface area (min 1), evenly spaced along
// the longest wall (segment-midpoint spacing keeps them off the corners). For
// shapes with no dominant straight wall (oval, figure-8, freeform), falls back
// to spacing evenly around the whole perimeter instead - see
// findFixtureWallPath.
export function computeSkimmerPositions(polygon, config = DEFAULT_CONFIG) {
  const area = polygonArea(polygon);
  const perSkimmer = config.skimmerAreaSqFt ?? DEFAULT_CONFIG.skimmerAreaSqFt;
  const minSkimmers = config.minSkimmers ?? DEFAULT_CONFIG.minSkimmers;
  const count = Math.max(minSkimmers, Math.ceil(area / perSkimmer));
  const wallPath = findFixtureWallPath(polygon);

  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    positions.push(pointAlongPath(wallPath.points, t * wallPath.length));
  }
  return positions;
}

// Returns spaced 8-10ft apart along the same wall path as the skimmers,
// nudged away from any skimmer that falls within returnOffsetFt.
export function computeReturnPositions(polygon, skimmerPositions = [], config = DEFAULT_CONFIG) {
  const wallPath = findFixtureWallPath(polygon);
  const wallLen = wallPath.length;
  const { min: sMin, max: sMax } = config.returnSpacing ?? DEFAULT_CONFIG.returnSpacing;
  const offset = config.returnOffsetFt ?? DEFAULT_CONFIG.returnOffsetFt;
  const target = (sMin + sMax) / 2;
  const pointAt = (d) => pointAlongPath(wallPath.points, d);

  if (wallLen <= sMin) return [pointAt(wallLen / 2)];

  const count = Math.max(2, Math.round(wallLen / target) + 1);
  const spacing = wallLen / (count - 1);

  const positions = [];
  for (let i = 0; i < count; i++) {
    const baseD = i * spacing;
    let point = pointAt(baseD);
    const tooClose = skimmerPositions.some((s) => dist(point, s) < offset);
    if (tooClose) point = pointAt(Math.min(wallLen, baseD + offset));
    positions.push(point);
  }
  return positions;
}

// Placed at the deepest point in the deep-end zone - i.e. the centroid of
// whichever DepthZone has the greatest depthFt (falls back to the whole pool's
// centroid if no zones are given). If that centroid doesn't actually land
// inside the pool's own outline - e.g. a naive rectangular depth-zone slice
// against a curved or concave shape like an oval or L-shape - falls back to
// the middle of whatever the polygon actually contains at that same x, so the
// drain never ends up floating outside the pool.
export function computeMainDrainPosition(polygon, depthZones = []) {
  let candidate;
  if (depthZones && depthZones.length > 0) {
    const deepest = depthZones.reduce((best, z) => (z.depthFt > best.depthFt ? z : best), depthZones[0]);
    const zonePolygon = deepest.polygon && deepest.polygon.length >= 3 ? deepest.polygon : polygon;
    candidate = polygonCentroid(zonePolygon);
  } else {
    candidate = polygonCentroid(polygon);
  }
  if (pointInPolygon(candidate, polygon)) return candidate;

  const bounds = polygonBounds(polygon);
  const sweep = clipLineToPolygon({ x: candidate.x, y: bounds.minY - 1 }, { x: candidate.x, y: bounds.maxY + 1 }, polygon);
  if (sweep.length > 0) {
    const mid = (seg) => ({ x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 });
    const best = sweep.reduce((b, seg) => (dist(mid(seg), candidate) < dist(mid(b), candidate) ? seg : b));
    return mid(best);
  }
  return polygonCentroid(polygon);
}

// ─── Plumbing ───────────────────────────────────────────────────────────────────

// Straight-line polyline from the equipment pad to each fixture. No obstacle
// avoidance yet - just a direct two-point path per run.
export function computePlumbingRuns(equipmentPad, { skimmers = [], returns = [], mainDrain } = {}) {
  const runs = [];
  skimmers.forEach((p, index) => runs.push({ to: "skimmer", index, path: [equipmentPad, p] }));
  returns.forEach((p, index) => runs.push({ to: "return", index, path: [equipmentPad, p] }));
  if (mainDrain) runs.push({ to: "drain", index: 0, path: [equipmentPad, mainDrain] });
  return runs;
}

// ─── Top-level composition ──────────────────────────────────────────────────────

/**
 * @param {{ polygon: Point[], depthZones?: DepthZone[], equipmentPad?: Point }} input
 * @param {Partial<typeof DEFAULT_CONFIG>} config
 */
export function generateSchematic(input, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { polygon, depthZones = [], equipmentPad } = input || {};
  if (!polygon || polygon.length < 3) {
    throw new Error("generateSchematic: polygon must have at least 3 points");
  }

  const rebarGrid = generateRebarGrid(polygon, cfg);
  const skimmers = computeSkimmerPositions(polygon, cfg);
  const returns = computeReturnPositions(polygon, skimmers, cfg);
  const mainDrain = computeMainDrainPosition(polygon, depthZones);
  const plumbingRuns = equipmentPad
    ? computePlumbingRuns(equipmentPad, { skimmers, returns, mainDrain })
    : [];

  return { rebarGrid, skimmers, returns, mainDrain, plumbingRuns };
}
