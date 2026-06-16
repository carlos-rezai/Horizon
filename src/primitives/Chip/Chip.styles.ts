import styled, { css } from "styled-components";

// Color-identity dot: a circle (equal width/height) with a soft glow ring in
// the same colour. Matches the canonical prototype Chip.
const sizeMap = {
  sm: css`
    width: 8px;
    height: 8px;
  `,
  md: css`
    width: 10px;
    height: 10px;
  `,
};

export const StyledChip = styled.span<{ $color: string; $size: "sm" | "md" }>`
  display: inline-block;
  flex-shrink: 0;
  border-radius: 9999px;
  background-color: ${({ $color }) => $color};
  box-shadow: 0 0 0 3px ${({ $color }) => $color}1f;
  ${({ $size }) => sizeMap[$size]}
`;
