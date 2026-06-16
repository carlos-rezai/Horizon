import { StyledBrandMark } from "./BrandMark.styles";

interface BrandMarkProps {
  /** Rendered width and height in px (the mark is square). */
  size?: number;
  /** When provided, the mark is exposed as an accessible image with this
   *  label; otherwise it is decorative (aria-hidden). */
  label?: string;
}

export default function BrandMark({ size = 30, label }: BrandMarkProps) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true };

  return (
    <StyledBrandMark width={size} height={size} viewBox="0 0 30 30" {...a11y}>
      <circle
        className="ring"
        cx="15"
        cy="15"
        r="13.5"
        fill="none"
        strokeWidth="1.5"
      />
      <path
        className="arc"
        d="M3 18 Q15 9 27 18"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle className="sun" cx="22.5" cy="11" r="2.6" />
    </StyledBrandMark>
  );
}
