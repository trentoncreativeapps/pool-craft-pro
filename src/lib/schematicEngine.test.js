import test from "node:test";
import assert from "node:assert/strict";
import {
  polygonArea,
  polygonCentroid,
  pointInPolygon,
  findLongestEdge,
  clipLineToPolygon,
  generateRebarGrid,
  computeSkimmerPositions,
  computeReturnPositions,
  computeMainDrainPosition,
  computePlumbingRuns,
  generateSchematic,
} from "./schematicEngine.js";

// 30ft x 15ft rectangle, corner at the origin - the common case used
// throughout, since Pool3D/SitePlanMap/calcMaterials all treat every pool
// shape as this kind of bounding rectangle today.
const rect30x15 = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 30, y: 15 },
  { x: 0, y: 15 },
];

// A simple L-shape (concave) for exercising the polygon clipper beyond a
// trivial convex rectangle.
const lShape = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 10 },
  { x: 10, y: 10 },
  { x: 10, y: 20 },
  { x: 0, y: 20 },
];

test("polygonArea: rectangle", () => {
  assert.equal(polygonArea(rect30x15), 450);
});

test("polygonCentroid: rectangle is at its geometric center", () => {
  const c = polygonCentroid(rect30x15);
  assert.ok(Math.abs(c.x - 15) < 1e-9);
  assert.ok(Math.abs(c.y - 7.5) < 1e-9);
});

test("pointInPolygon: inside/outside/edge cases", () => {
  assert.equal(pointInPolygon({ x: 15, y: 7.5 }, rect30x15), true);
  assert.equal(pointInPolygon({ x: -5, y: 7.5 }, rect30x15), false);
  assert.equal(pointInPolygon({ x: 40, y: 40 }, rect30x15), false);
});

test("findLongestEdge: picks a 30ft side on the 30x15 rectangle", () => {
  const wall = findLongestEdge(rect30x15);
  assert.equal(wall.length, 30);
});

test("clipLineToPolygon: single crossing pair for a convex rectangle", () => {
  const segs = clipLineToPolygon({ x: -5, y: 7.5 }, { x: 35, y: 7.5 }, rect30x15);
  assert.equal(segs.length, 1);
  assert.ok(Math.abs(segs[0].a.x - 0) < 1e-9);
  assert.ok(Math.abs(segs[0].b.x - 30) < 1e-9);
});

test("clipLineToPolygon: two separate segments through a concave L-shape", () => {
  // y=15 crosses the L-shape's notch: inside from x=0..10, outside 10..20
  // (the L has no material there), so only one segment - the pool only
  // extends to x=10 at y=15. Use y=5 instead, which is fully inside the
  // 20-wide base of the L from x=0..20 - single segment there. Use a line
  // that actually clips into two pieces: a vertical sweep at x=15 crosses
  // the L's lower arm (y 0-10) only, since the upper arm stops at x=10.
  const segs = clipLineToPolygon({ x: 15, y: -5 }, { x: 15, y: 25 }, lShape);
  assert.equal(segs.length, 1);
  assert.ok(Math.abs(segs[0].a.y - 0) < 1e-9);
  assert.ok(Math.abs(segs[0].b.y - 10) < 1e-9);
});

test("generateRebarGrid: 12in spacing produces grid lines plus a doubled bond beam", () => {
  const { lines, spacingFt } = generateRebarGrid(rect30x15);
  assert.equal(spacingFt, 1);
  const bondBeam = lines.filter((l) => l.type === "bond-beam");
  assert.equal(bondBeam.length, 4); // one per rectangle edge
  assert.ok(bondBeam.every((l) => l.count === 2));
  const gridLines = lines.filter((l) => l.type !== "bond-beam");
  assert.ok(gridLines.length > 0);
  assert.ok(gridLines.every((l) => l.count === 1));
});

test("computeSkimmerPositions: minimum 1 for a small pool", () => {
  const positions = computeSkimmerPositions(rect30x15); // 450 sqft -> ceil(450/500)=1
  assert.equal(positions.length, 1);
});

test("computeSkimmerPositions: ceil(area/500) for a larger pool", () => {
  const bigRect = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 }, { x: 0, y: 20 }]; // 1000 sqft
  const positions = computeSkimmerPositions(bigRect);
  assert.equal(positions.length, 2); // ceil(1000/500) = 2
  // evenly spaced along the 50ft wall: expect quarter-points (12.5, 37.5)
  assert.ok(Math.abs(positions[0].x - 12.5) < 1e-9);
  assert.ok(Math.abs(positions[1].x - 37.5) < 1e-9);
});

test("computeReturnPositions: spaced within 8-10ft and clear of skimmers", () => {
  const skimmers = computeSkimmerPositions(rect30x15);
  const returns = computeReturnPositions(rect30x15, skimmers);
  for (let i = 1; i < returns.length; i++) {
    const gap = Math.hypot(returns[i].x - returns[i - 1].x, returns[i].y - returns[i - 1].y);
    assert.ok(gap >= 8 - 1e-6 && gap <= 10 + 1e-6, `gap ${gap} out of 8-10ft range`);
  }
  for (const r of returns) {
    for (const s of skimmers) {
      const clearance = Math.hypot(r.x - s.x, r.y - s.y);
      assert.ok(clearance >= 3 - 1e-6, `return too close to skimmer: ${clearance}ft`);
    }
  }
});

test("computeMainDrainPosition: lands in the deepest zone, not the shallow one", () => {
  const shallowZone = { id: "shallow", depthFt: 3.5, polygon: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 7.5 }, { x: 0, y: 7.5 }] };
  const deepZone = { id: "deep", depthFt: 8, polygon: [{ x: 0, y: 7.5 }, { x: 30, y: 7.5 }, { x: 30, y: 15 }, { x: 0, y: 15 }] };
  const drain = computeMainDrainPosition(rect30x15, [shallowZone, deepZone]);
  assert.ok(drain.y > 7.5, "drain should be in the deep zone (y > 7.5), not the shallow one");
});

test("computeMainDrainPosition: falls back to pool centroid with no zones", () => {
  const drain = computeMainDrainPosition(rect30x15, []);
  assert.ok(Math.abs(drain.x - 15) < 1e-9 && Math.abs(drain.y - 7.5) < 1e-9);
});

test("computePlumbingRuns: one straight run per fixture, all starting at the pad", () => {
  const pad = { x: -5, y: 7.5 };
  const skimmers = [{ x: 0, y: 5 }];
  const returns = [{ x: 0, y: 10 }];
  const mainDrain = { x: 15, y: 7.5 };
  const runs = computePlumbingRuns(pad, { skimmers, returns, mainDrain });
  assert.equal(runs.length, 3);
  for (const run of runs) {
    assert.deepEqual(run.path[0], pad);
    assert.equal(run.path.length, 2);
  }
});

test("generateSchematic: composes all outputs and rejects a degenerate polygon", () => {
  const result = generateSchematic({
    polygon: rect30x15,
    depthZones: [{ id: "deep", depthFt: 6, polygon: rect30x15 }],
    equipmentPad: { x: -5, y: 7.5 },
  });
  assert.ok(result.rebarGrid.lines.length > 0);
  assert.ok(result.skimmers.length >= 1);
  assert.ok(result.returns.length >= 1);
  assert.ok(result.mainDrain);
  assert.equal(result.plumbingRuns.length, result.skimmers.length + result.returns.length + 1);

  assert.throws(() => generateSchematic({ polygon: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }));
});
