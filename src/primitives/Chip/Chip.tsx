import { StyledChip } from "./Chip.styles";

export interface ChipProps {
  color: string;
  size?: "sm" | "md";
}

export default function Chip({
  color,
  size = "md",
}: ChipProps): React.ReactElement {
  return (
    <StyledChip
      $color={color}
      $size={size}
      data-testid="chip"
      data-color={color}
    />
  );
}
