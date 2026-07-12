import type { ReactNode } from "react";
import { StyledTooltipBox, StyledTooltipLabel } from "./ChartTooltip.styles";

interface Props {
  /** The heading of the hover card (typically the month). */
  label: ReactNode;
  /** The tooltip rows — each chart supplies its own. */
  children: ReactNode;
}

/**
 * The shared shell for a chart hover card: an elevated box with a muted label
 * on top. Each chart renders its own rows as children — this component only
 * owns the box and the label so the two charts' tooltips stay visually
 * identical without sharing their differing row content.
 */
export default function ChartTooltip({ label, children }: Props) {
  return (
    <StyledTooltipBox>
      <StyledTooltipLabel>{label}</StyledTooltipLabel>
      {children}
    </StyledTooltipBox>
  );
}
