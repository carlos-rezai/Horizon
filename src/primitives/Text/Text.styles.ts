import styled from "styled-components";

type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export const StyledText = styled.span<{
  $size: TextSize;
  $tabular: boolean;
}>`
  font-size: ${({ $size, theme }) => theme.typography.sizes[$size]}px;
  font-variant-numeric: ${({ $tabular }) =>
    $tabular ? "tabular-nums" : "normal"};
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
  color: ${({ theme }) => theme.colors.onSurface};
`;
