// ─── Top-down Hockey Rink Diagram (SVG) ───────────────────────────────────────
// Looks like a broadcast overhead rink diagram.
// Background is transparent — parent provides dark background.

interface RinkDiagramProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function RinkDiagram({ className = '', width = 480, height = 300 }: RinkDiagramProps) {
  // Rink proportions: NHL rink is 200ft x 85ft → aspect ~2.35:1
  // We'll use a coordinate system of 0,0 to width,height
  const W = width;
  const H = height;
  const pad = 12; // padding from svg edge to rink boards

  // Rink bounds
  const rx = pad;
  const ry = pad;
  const rw = W - pad * 2;
  const rh = H - pad * 2;

  // Corner radius (NHL corners are ~28ft radius on 200ft rink → ~14% of width)
  const cornerR = rh * 0.42;

  // Center x
  const cx = W / 2;
  const cy = H / 2;

  // Blue lines (28ft from center on 200ft rink → 14% from center)
  const blueLineOffset = rw * 0.14;
  const blueLeft = cx - blueLineOffset;
  const blueRight = cx + blueLineOffset;

  // Goal lines (~11ft from each end on 200ft → ~5.5%)
  const goalLineOffset = rw * 0.055;
  const goalLeft = rx + goalLineOffset * 2.5;
  const goalRight = rx + rw - goalLineOffset * 2.5;

  // Center circle radius (~30ft on 200ft → 15% of width)
  const centerCircleR = rw * 0.115;

  // Face-off circle radius (~15ft on 200ft → 7.5% of width)
  const faceoffR = rw * 0.075;

  // Face-off dot positions (4 corner dots: x offset ~76ft from center, y offset ~20.5ft)
  const foXOffset = rw * 0.24;
  const foYOffset = rh * 0.3;

  // Crease dimensions
  const creaseW = rw * 0.045;
  const creaseH = rh * 0.35;

  return (
    <svg
      className={className}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block' }}
    >
      {/* ── Rink Outline (rounded rectangle) ── */}
      <rect
        x={rx}
        y={ry}
        width={rw}
        height={rh}
        rx={cornerR}
        ry={cornerR}
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="1.5"
      />

      {/* ── Red Center Line ── */}
      <line
        x1={cx} y1={ry}
        x2={cx} y2={ry + rh}
        stroke="#E8303A"
        strokeWidth="2"
      />

      {/* ── Blue Lines ── */}
      <line
        x1={blueLeft} y1={ry}
        x2={blueLeft} y2={ry + rh}
        stroke="#4A90D9"
        strokeWidth="2"
      />
      <line
        x1={blueRight} y1={ry}
        x2={blueRight} y2={ry + rh}
        stroke="#4A90D9"
        strokeWidth="2"
      />

      {/* ── Goal Lines ── */}
      <line
        x1={goalLeft} y1={ry + rh * 0.1}
        x2={goalLeft} y2={ry + rh * 0.9}
        stroke="#E8303A"
        strokeWidth="1.5"
      />
      <line
        x1={goalRight} y1={ry + rh * 0.1}
        x2={goalRight} y2={ry + rh * 0.9}
        stroke="#E8303A"
        strokeWidth="1.5"
      />

      {/* ── Center Circle ── */}
      <circle
        cx={cx}
        cy={cy}
        r={centerCircleR}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
      />

      {/* ── Center Face-off Dot ── */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#E8303A"
      />

      {/* ── Corner Face-off Circles (4) ── */}
      {[
        [cx - foXOffset, cy - foYOffset],
        [cx + foXOffset, cy - foYOffset],
        [cx - foXOffset, cy + foYOffset],
        [cx + foXOffset, cy + foYOffset],
      ].map(([fx, fy], i) => (
        <g key={i}>
          <circle
            cx={fx}
            cy={fy}
            r={faceoffR}
            fill="none"
            stroke="rgba(232,48,58,0.7)"
            strokeWidth="1.5"
          />
          <circle
            cx={fx}
            cy={fy}
            r={3}
            fill="#E8303A"
          />
        </g>
      ))}

      {/* ── Left Goal Crease (D-shape) ── */}
      <path
        d={`
          M ${goalLeft} ${cy - creaseH / 2}
          Q ${goalLeft - creaseW * 3} ${cy} ${goalLeft} ${cy + creaseH / 2}
          Z
        `}
        fill="rgba(173,216,230,0.18)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1"
      />

      {/* ── Right Goal Crease (D-shape) ── */}
      <path
        d={`
          M ${goalRight} ${cy - creaseH / 2}
          Q ${goalRight + creaseW * 3} ${cy} ${goalRight} ${cy + creaseH / 2}
          Z
        `}
        fill="rgba(173,216,230,0.18)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1"
      />

      {/* ── Left Goal Net indicator ── */}
      <rect
        x={rx + 2}
        y={cy - creaseH / 4}
        width={goalLineOffset * 0.8}
        height={creaseH / 2}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
      />

      {/* ── Right Goal Net indicator ── */}
      <rect
        x={goalRight + creaseW * 0.3}
        y={cy - creaseH / 4}
        width={goalLineOffset * 0.8}
        height={creaseH / 2}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}
