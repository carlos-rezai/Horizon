import { StyledMoney } from "./Money.styles";

interface MoneyProps {
  /** Amount in cents (integer). */
  cents: number;
  /** When set, positive values get an explicit "+" and the value is tinted by direction. */
  sign?: boolean;
}

const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default function Money({ cents, sign = false }: MoneyProps) {
  const formatted = formatter.format(cents / 100);
  const showPlus = sign && cents > 0;
  const label = showPlus ? `+${formatted}` : formatted;

  const tone = sign
    ? cents > 0
      ? "gain"
      : cents < 0
        ? "loss"
        : "neutral"
    : "neutral";

  return (
    <StyledMoney data-testid="money" $tone={tone}>
      {label}
    </StyledMoney>
  );
}
