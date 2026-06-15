import { StyledMoney } from "./Money.styles";

interface MoneyProps {
  /** Amount in cents (integer). */
  cents: number;
  /** When set, positive values get an explicit "+" and the value is tinted by direction. */
  sign?: boolean;
  /** When set, the amount is rounded to whole euros with no cents shown. */
  whole?: boolean;
}

const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const wholeFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function Money({
  cents,
  sign = false,
  whole = false,
}: MoneyProps) {
  const formatted = (whole ? wholeFormatter : formatter).format(cents / 100);
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
