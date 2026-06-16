import { ArrowUpRight, ArrowDown } from "lucide-react";
import { StyledDelta } from "./Delta.styles";

interface DeltaProps {
  /** Signed percentage change. The sign drives the direction (colour + arrow). */
  value: number;
  /** Unit suffix appended to the magnitude. Defaults to "%". */
  suffix?: string;
}

const formatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function Delta({ value, suffix = "%" }: DeltaProps) {
  const down = value < 0;
  const magnitude = formatter.format(Math.abs(value));
  const Arrow = down ? ArrowDown : ArrowUpRight;

  return (
    <StyledDelta data-testid="delta" $down={down}>
      <Arrow size={11} strokeWidth={2.5} aria-hidden="true" />
      {magnitude}
      {suffix}
    </StyledDelta>
  );
}
