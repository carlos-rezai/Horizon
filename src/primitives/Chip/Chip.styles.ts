import styled, { css } from "styled-components";

const sizeMap = {
  sm: css`
    width: 16px;
    height: 8px;
  `,
  md: css`
    width: 24px;
    height: 12px;
  `,
};

export const StyledChip = styled.span<{ $color: string; $size: "sm" | "md" }>`
  display: inline-block;
  border-radius: 9999px;
  background-color: ${({ $color }) => $color};
  ${({ $size }) => sizeMap[$size]}
`;
