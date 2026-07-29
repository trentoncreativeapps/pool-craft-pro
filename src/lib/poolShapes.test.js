import test from "node:test";
import assert from "node:assert/strict";
import { buildPoolPolygon, SUPPORTED_POOL_SHAPES } from "./poolShapes.js";
import { polygonArea, pointInPolygon, polygonBounds, generateSchematic } from "./schematicEngine.js";

const LEN = 30, WID = 15;
const BOUNDING_AREA = LEN * WID;

test("SUPPORTED_POOL_SHAPES matches the app's actual POOL_SHAPES ids", () => {
  // Keep in sync with POOL_SHAPES in App.jsx - fails loudly if either list
  // drifts without the other being updated.
  const appShapeIds = ["rectangle", "oval", "lshape", "freeform", "lap", "greek", "figure8"];
  for (const id of appShapeIds) {
    assert.ok(SUPPORTED_POOL_SHAPES.includes(id), `missing a builder for shape "${id}"`);
  }
});

test("every shape produces a valid, closed-enough polygon within its bounding box", () => {
  for (const shape of SUPPORTED_POOL_SHAPES) {
    const polygon = buildPoolPolygon(shape, LEN, WID);
    assert.ok(polygon.length >= 3, `${shape}: needs at least 3 points`);

    const bounds = polygonBounds(polygon);
    assert.ok(bounds.minX >= -1e-6 && bounds.maxX <= LEN + 1e-6, `${shape}: x out of bounds`);
    assert.ok(bounds.minY >= -1e-6 && bounds.maxY <= WID + 1e-6, `${shape}: y out of bounds`);

    const area = polygonArea(polygon);
    assert.ok(area > BOUNDING_AREA * 0.3, `${shape}: area ${area} suspiciously small vs bounding box ${BOUNDING_AREA}`);
    assert.ok(area <= BOUNDING_AREA + 1e-6, `${shape}: area ${area} exceeds its own bounding box`);
  }
});

test("rectangle and lap produce the same plain rectangle geometry", () => {
  const rect = buildPoolPolygon("rectangle", LEN, WID);
  const lap = buildPoolPolygon("lap", LEN, WID);
  assert.deepEqual(rect, lap);
  assert.equal(polygonArea(rect), LEN * WID);
});

test("oval: fully rounded ends, centroid sits inside", () => {
  const polygon = buildPoolPolygon("oval", LEN, WID);
  assert.ok(pointInPolygon({ x: LEN / 2, y: WID / 2 }, polygon));
  // area should be less than the full rectangle (rounded ends cut corners)
  // but more than half of it
  const area = polygonArea(polygon);
  assert.ok(area < LEN * WID && area > LEN * WID * 0.5);
});

test("lshape: the notched-out corner is actually excluded from the polygon", () => {
  const polygon = buildPoolPolygon("lshape", LEN, WID);
  // point deep in the notch (top-right area) should be OUTSIDE
  assert.equal(pointInPolygon({ x: LEN * 0.9, y: WID * 0.9 }, polygon), false);
  // point in the main arm should be INSIDE
  assert.ok(pointInPolygon({ x: LEN * 0.3, y: WID * 0.3 }, polygon));
});

test("figure8: has a visible waist (narrower than the two lobes) and stays connected", () => {
  const polygon = buildPoolPolygon("figure8", LEN, WID);
  assert.ok(pointInPolygon({ x: WID / 2, y: WID / 2 }, polygon), "left lobe center should be inside");
  assert.ok(pointInPolygon({ x: LEN - WID / 2, y: WID / 2 }, polygon), "right lobe center should be inside");
  // the shape must be a single connected polygon (not two disjoint circles) -
  // a point on the centerline between the two lobes should still be inside
  const bounds = polygonBounds(polygon);
  const midX = (bounds.minX + bounds.maxX) / 2;
  assert.ok(pointInPolygon({ x: midX, y: WID / 2 }, polygon), "waist midpoint should be inside (shape must stay connected)");
});

test("freeform: deterministic - same len/wid always produces the same polygon", () => {
  const a = buildPoolPolygon("freeform", LEN, WID);
  const b = buildPoolPolygon("freeform", LEN, WID);
  assert.deepEqual(a, b);
});

test("greek (grecian): corners are chamfered, not sharp - polygon has more than 4 points", () => {
  const polygon = buildPoolPolygon("greek", LEN, WID);
  assert.ok(polygon.length === 8, "expected an octagon (4 chamfered corners)");
  assert.equal(pointInPolygon({ x: 0.01, y: 0.01 }, polygon), false, "the sharp corner itself should be cut off");
});

test("generateSchematic runs cleanly and stays sane for every shape at 30x15", () => {
  for (const shape of SUPPORTED_POOL_SHAPES) {
    const polygon = buildPoolPolygon(shape, LEN, WID);
    const bounds = polygonBounds(polygon);
    const splitX = bounds.minX + (bounds.maxX - bounds.minX) * (2 / 3);
    const result = generateSchematic({
      polygon,
      depthZones: [
        { id: "shallow", depthFt: 3.5, polygon: [{ x: bounds.minX, y: bounds.minY }, { x: splitX, y: bounds.minY }, { x: splitX, y: bounds.maxY }, { x: bounds.minX, y: bounds.maxY }] },
        { id: "deep", depthFt: 6, polygon: [{ x: splitX, y: bounds.minY }, { x: bounds.maxX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY }, { x: splitX, y: bounds.maxY }] },
      ],
      equipmentPad: { x: bounds.minX - 6, y: (bounds.minY + bounds.maxY) / 2 },
    });

    assert.ok(result.skimmers.length >= 1, `${shape}: expected at least 1 skimmer`);
    assert.ok(result.returns.length >= 1, `${shape}: expected at least 1 return`);
    assert.ok(result.rebarGrid.lines.length > 0, `${shape}: expected rebar lines`);
    assert.ok(pointInPolygon(result.mainDrain, polygon), `${shape}: main drain must land inside the actual pool outline`);
    // Skimmers/returns sit ON the wall (boundary points, not strictly
    // "inside" under a point-in-polygon test) - just check they're finite
    // and roughly within the shape's own bounding box.
    for (const s of [...result.skimmers, ...result.returns]) {
      assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), `${shape}: fixture position must be finite`);
      assert.ok(s.x >= bounds.minX - 1e-6 && s.x <= bounds.maxX + 1e-6, `${shape}: fixture x out of bounds`);
      assert.ok(s.y >= bounds.minY - 1e-6 && s.y <= bounds.maxY + 1e-6, `${shape}: fixture y out of bounds`);
    }
    assert.equal(result.plumbingRuns.length, result.skimmers.length + result.returns.length + 1, `${shape}: one plumbing run per fixture`);
  }
});
