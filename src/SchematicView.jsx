import { useRef, useState } from "react";

// ─── SCHEMATIC VIEW ─────────────────────────────────────────────────────────────
// Pure presentational SVG renderer for schematicEngine.js output. No app-state
// coupling beyond the optional onDragFixture callback - polygon + schematic +
// equipmentPad in, an SVG plan drawing out (plus drag gestures on the fixtures
// if a caller wants them).
//
// The card chrome (background, borders, disclaimer banner) matches the rest of
// the app's light inline-style palette. The drawing surface itself is white
// too, same as a real site plan/blueprint page.
//
// All SVG coordinates/line-widths/font-sizes below are expressed directly in
// feet - the <svg> viewBox does the feet-to-pixel scaling, so nothing needs a
// manual px-per-foot calculation.

function snapToNiceLength(ft) {
  const nice = [1, 2, 5, 10, 20, 25, 50, 100];
  return nice.reduce((best, n) => (Math.abs(n - ft) < Math.abs(best - ft) ? n : best), nice[0]);
}

export default function SchematicView({ polygon, schematic, equipmentPad, width = 640, height = 480, marginFt = 4, onDragFixture }) {
  const svgRef = useRef(null);
  const draggingRef = useRef(null); // { kind: "skimmers"|"returns"|"mainDrain", index }
  const [activeDrag, setActiveDrag] = useState(null); // `${kind}-${index}` for cursor/hover feedback only

  if (!polygon || polygon.length < 3 || !schematic) {
    return (
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
        No schematic data to display yet.
      </div>
    );
  }

  const { rebarGrid, skimmers = [], returns = [], mainDrain, plumbingRuns = [] } = schematic;

  const allPoints = [
    ...polygon,
    ...skimmers,
    ...returns,
    ...(mainDrain ? [mainDrain] : []),
    ...(equipmentPad ? [equipmentPad] : []),
    ...plumbingRuns.flatMap((r) => r.path),
  ];
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));

  const vbX = minX - marginFt;
  const vbY = minY - marginFt;
  const vbW = maxX - minX + marginFt * 2;
  const vbH = maxY - minY + marginFt * 2;

  const gridLines = rebarGrid.lines.filter((l) => l.type !== "bond-beam");
  const bondBeamLines = rebarGrid.lines.filter((l) => l.type === "bond-beam");

  const poolPoints = polygon.map((p) => `${p.x},${p.y}`).join(" ");
  const scaleBarFt = snapToNiceLength(Math.max(vbW, vbH) * 0.18);
  const scaleBarX = vbX + marginFt * 0.5;
  const scaleBarY = vbY + vbH - marginFt * 0.35;

  // Converts a pointer event's screen coordinates into the SVG's own user-space
  // (feet) coordinates via the element's screen CTM - the standard technique
  // that stays correct regardless of viewBox scaling or how the <svg> ends up
  // laid out/letterboxed on the page.
  const clientToSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const startDrag = (kind, index) => (e) => {
    if (!onDragFixture) return;
    e.preventDefault();
    e.stopPropagation();
    // Best-effort - some browsers/input types can reject capture (e.g. no
    // active pointer session yet); the drag still works via the SVG-level
    // pointermove listener either way, capture just makes it more reliable
    // when the pointer slides off the small circle mid-drag.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    draggingRef.current = { kind, index };
    setActiveDrag(`${kind}-${index}`);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const { kind, index } = draggingRef.current;
    onDragFixture(kind, index, clientToSvgPoint(e.clientX, e.clientY));
  };
  const endDrag = () => { draggingRef.current = null; setActiveDrag(null); };

  const draggable = !!onDragFixture;
  const fixtureCursor = (key) => (draggable ? (activeDrag === key ? "grabbing" : "grab") : "default");

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0e7490", textTransform: "uppercase", letterSpacing: "0.07em" }}>📐 Engineering Schematic</div>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #cbd5e1", lineHeight: 0 }}>
        <svg ref={svgRef} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width={width} height={height} preserveAspectRatio="xMidYMid meet" style={{ display: "block", background: "#ffffff", width: "100%", height: "auto", touchAction: draggable ? "none" : "auto" }}
          onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag}>
          {/* Rebar grid - light gray, thin */}
          {gridLines.map((l, i) => (
            <line key={`grid-${i}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="#cbd5e1" strokeWidth={0.03} />
          ))}
          {/* Bond beam - same light gray, slightly bolder to convey the doubled bars */}
          {bondBeamLines.map((l, i) => (
            <line key={`bb-${i}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="#94a3b8" strokeWidth={0.07} />
          ))}

          {/* Pool outline - black */}
          <polygon points={poolPoints} fill="none" stroke="#000000" strokeWidth={0.15} strokeLinejoin="round" />

          {/* Plumbing runs - dashed orange polylines, drawn under the fixtures */}
          {plumbingRuns.map((run, i) => (
            <polyline
              key={`run-${i}`}
              points={run.path.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#f97316"
              strokeWidth={0.08}
              strokeDasharray="0.3,0.2"
            />
          ))}

          {/* Equipment pad */}
          {equipmentPad && (
            <g>
              <rect x={equipmentPad.x - 0.6} y={equipmentPad.y - 0.6} width={1.2} height={1.2} fill="#334155" stroke="#0f172a" strokeWidth={0.05} />
              <text x={equipmentPad.x} y={equipmentPad.y - 0.9} fontSize={0.9} fill="#334155" textAnchor="middle" fontWeight="bold">EQ PAD</text>
            </g>
          )}

          {/* Skimmers - blue circles, labeled S1, S2... */}
          {skimmers.map((p, i) => (
            <g key={`sk-${i}`} onPointerDown={startDrag("skimmers", i)} style={{ cursor: fixtureCursor(`skimmers-${i}`) }}>
              {draggable && <circle cx={p.x} cy={p.y} r={1.1} fill="transparent" />}
              <circle cx={p.x} cy={p.y} r={0.55} fill="#2563eb" stroke="#0f172a" strokeWidth={0.04} />
              <text x={p.x} y={p.y - 0.85} fontSize={0.9} fill="#2563eb" textAnchor="middle" fontWeight="bold" style={{ pointerEvents: "none" }}>S{i + 1}</text>
            </g>
          ))}

          {/* Returns - green circles, labeled R1, R2... */}
          {returns.map((p, i) => (
            <g key={`rt-${i}`} onPointerDown={startDrag("returns", i)} style={{ cursor: fixtureCursor(`returns-${i}`) }}>
              {draggable && <circle cx={p.x} cy={p.y} r={1.1} fill="transparent" />}
              <circle cx={p.x} cy={p.y} r={0.55} fill="#22c55e" stroke="#0f172a" strokeWidth={0.04} />
              <text x={p.x} y={p.y - 0.85} fontSize={0.9} fill="#16a34a" textAnchor="middle" fontWeight="bold" style={{ pointerEvents: "none" }}>R{i + 1}</text>
            </g>
          ))}

          {/* Main drain - red circle */}
          {mainDrain && (
            <g onPointerDown={startDrag("mainDrain", 0)} style={{ cursor: fixtureCursor("mainDrain-0") }}>
              {draggable && <circle cx={mainDrain.x} cy={mainDrain.y} r={1.2} fill="transparent" />}
              <circle cx={mainDrain.x} cy={mainDrain.y} r={0.65} fill="#ef4444" stroke="#0f172a" strokeWidth={0.04} />
              <text x={mainDrain.x} y={mainDrain.y - 0.95} fontSize={0.9} fill="#ef4444" textAnchor="middle" fontWeight="bold" style={{ pointerEvents: "none" }}>MD</text>
            </g>
          )}

          {/* Scale bar */}
          <g>
            <line x1={scaleBarX} y1={scaleBarY} x2={scaleBarX + scaleBarFt} y2={scaleBarY} stroke="#1e293b" strokeWidth={0.06} />
            <line x1={scaleBarX} y1={scaleBarY - 0.2} x2={scaleBarX} y2={scaleBarY + 0.2} stroke="#1e293b" strokeWidth={0.06} />
            <line x1={scaleBarX + scaleBarFt} y1={scaleBarY - 0.2} x2={scaleBarX + scaleBarFt} y2={scaleBarY + 0.2} stroke="#1e293b" strokeWidth={0.06} />
            <text x={scaleBarX} y={scaleBarY - 0.35} fontSize={0.8} fill="#1e293b">{scaleBarFt} ft</text>
          </g>
        </svg>
      </div>

      <div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, fontSize: 11, color: "#f59e0b", fontWeight: 600, lineHeight: 1.5 }}>
        ⚠️ Preliminary layout for planning purposes only. Verify rebar spacing, plumbing design, and equipment placement against local building code and a licensed engineer's stamped drawing before construction.
      </div>
    </div>
  );
}
