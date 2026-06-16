import { StyledChoiceChip, StyledDot } from "./ChoiceChip.styles";

interface ChoiceChipProps {
  label: string;
  /** Highlighted (selected) state. */
  active?: boolean;
  /** Optional leading colour dot (e.g. a category swatch). */
  color?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function ChoiceChip({
  label,
  active = false,
  color,
  disabled = false,
  onClick,
}: ChoiceChipProps) {
  return (
    <StyledChoiceChip
      type="button"
      $active={active}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {color && <StyledDot $color={color} />}
      {label}
    </StyledChoiceChip>
  );
}
