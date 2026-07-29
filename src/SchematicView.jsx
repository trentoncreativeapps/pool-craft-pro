// ─── SCHEMATIC VIEW ─────────────────────────────────────────────────────────────
// Pure presentational SVG renderer for schematicEngine.js output. No app-state
// coupling, no hooks - just polygon + schematic + equipmentPad in, an SVG plan
// drawing out. Not wired into any tab yet (see App.jsx) - this is the first
// component pulled out of the App.jsx monolith into its own file, matching how
// schematicEngine.js already lives in src/lib rather than inline.
//
// The card chrome (background, borders, disclaimer banner) matches the rest of
// the app's dark-navy inline-style palette. The drawing surface itself is white
// on purpose: it's a technical plan, and a black pool outline on a dark card
// background would be unreadable - real site plans/blueprints are white for
// the same reason.
//
// All SVG coordinates/line-widths/font-sizes below are expressed directly in
// feet - the <svg> viewBox does the feet-to-pixel scaling, so nothing needs a
// manual px-per-foot calculation.

function snapToNiceLength(ft) {
  const nice = [1, 2, 5, 10, 20, 25, 50, 100];
  return nice.reduce((best, n) => (Math.abs(n - ft) < Math.abs(best - ft) ? n : best), nice[0]);
}

export default function SchematicView({ polygon, schematic, equipmentPad, width = 640, height = 480, marginFt = 4 }) {
  if (!polygon || polygon.length < 3 || !schematic) {
    return (
      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
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

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.07em" }}>📐 Engineering Schematic</div>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #334155", lineHeight: 0 }}>
        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width={width} height={height} preserveAspectRatio="xMidYMid meet" style={{ display: "block", background: "#ffffff", width: "100%", height: "auto" }}>
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
            <g key={`sk-${i}`}>
              <circle cx={p.x} cy={p.y} r={0.55} fill="#2563eb" stroke="#0f172a" strokeWidth={0.04} />
              <text x={p.x} y={p.y - 0.85} fontSize={0.9} fill="#2563eb" textAnchor="middle" fontWeight="bold">S{i + 1}</text>
            </g>
          ))}

          {/* Returns - green circles, labeled R1, R2... */}
          {returns.map((p, i) => (
            <g key={`rt-${i}`}>
              <circle cx={p.x} cy={p.y} r={0.55} fill="#22c55e" stroke="#0f172a" strokeWidth={0.04} />
              <text x={p.x} y={p.y - 0.85} fontSize={0.9} fill="#16a34a" textAnchor="middle" fontWeight="bold">R{i + 1}</text>
            </g>
          ))}

          {/* Main drain - red circle */}
          {mainDrain && (
            <g>
              <circle cx={mainDrain.x} cy={mainDrain.y} r={0.65} fill="#ef4444" stroke="#0f172a" strokeWidth={0.04} />
              <text x={mainDrain.x} y={mainDrain.y - 0.95} fontSize={0.9} fill="#ef4444" textAnchor="middle" fontWeight="bold">MD</text>
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
