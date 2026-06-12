import { StyledTrack, StyledFill } from "./ProgressBar.styles";

interface ProgressBarProps {
  /** Progress as a percentage; clamped to the 0–100 range. */
  value: number;
  /** Fill colour. Defaults to the brand accent. */
  color?: string;
  /** Track colour. Defaults to a high-elevation surface. */
  track?: string;
  /** Bar height in pixels. Defaults to 6. */
  height?: number;
}

export default function ProgressBar({
  value,
  color,
  track,
  height = 6,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <StyledTrack
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      $track={track}
      $height={height}
    >
      <StyledFill $pct={pct} $color={color} />
    </StyledTrack>
  );
}
