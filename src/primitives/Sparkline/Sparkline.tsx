import { StyledSparkline } from "./Sparkline.styles";

export interface SparklineProps {
  /** The numeric series to plot. Needs at least two points to render. */
  data: number[];
  /** Resolved stroke colour (a theme role value or account colour hex). */
  color: string;
  /** Intrinsic viewBox width. */
  width?: number;
  /** Intrinsic viewBox height. */
  height?: number;
  /** When set, paints a faint area fill beneath the line. */
  fill?: boolean;
  /** When set, the SVG stretches to fill its container width. */
  stretch?: boolean;
}

/**
 * A small, axis-free line/area trend indicator. Dumb and reusable: it takes a
 * numeric series and a colour and draws a monotone-smoothed path — no labels,
 * no ticks, no domain knowledge. Renders nothing for a series shorter than two
 * points (a single point has no trend to draw).
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const slopes: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    slopes.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x || 1));
  }
  const m: number[] = [];
  m[0] = slopes[0];
  for (let i = 1; i < pts.length - 1; i++) {
    m[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  }
  m[pts.length - 1] = slopes[pts.length - 2];
  let p = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) / 3;
    p += ` C${pts[i].x + dx},${pts[i].y + m[i] * dx} ${pts[i + 1].x - dx},${
      pts[i + 1].y - m[i + 1] * dx
    } ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return p;
}

export default function Sparkline({
  data,
  color,
  width = 120,
  height = 34,
  fill = false,
  stretch = false,
}: SparklineProps): React.ReactElement | null {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 3 - ((v - min) / rng) * (height - 6),
  }));
  const p = smoothPath(pts);
  const last = pts[pts.length - 1];

  return (
    <StyledSparkline
      data-testid="sparkline"
      width={stretch ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      $stretch={stretch}
    >
      {fill && (
        <path
          d={`${p} L${width},${height} L0,${height} Z`}
          fill={color}
          opacity="0.1"
        />
      )}
      <path
        d={p}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect={stretch ? "non-scaling-stroke" : undefined}
      />
      {!stretch && <circle cx={last.x} cy={last.y} r="2.5" fill={color} />}
    </StyledSparkline>
  );
}
