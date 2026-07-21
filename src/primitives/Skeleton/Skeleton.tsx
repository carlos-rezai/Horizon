import { StyledSkeleton, type SkeletonShape } from "./Skeleton.styles";

interface SkeletonProps {
  /** Number → px; a string is passed through as a CSS length. */
  width?: number | string;
  height?: number | string;
  shape?: SkeletonShape;
}

function toLength(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * An inert placeholder block used to hold a section's shape while its data
 * loads. Sizing is inline so a caller can match the real content it stands in
 * for; everything else comes from Meridian tokens. It carries no text and no
 * role — assistive tech skips it entirely, and the surrounding view announces
 * its own loading state.
 */
export default function Skeleton({
  width = "100%",
  height = "1em",
  shape = "rect",
}: SkeletonProps) {
  return (
    <StyledSkeleton
      data-testid="skeleton"
      aria-hidden="true"
      $shape={shape}
      style={{ width: toLength(width), height: toLength(height) }}
    />
  );
}
